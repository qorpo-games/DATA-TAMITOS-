"""Durable SK forum replies. Provider and reviewed sources are injected, never browser supplied.

This module does not call a model, send personal data or enable publication by itself.
The deployment worker must supply the approved provider, source registry and schedule.
"""
import re
import time
import uuid
from urllib.parse import urlsplit

AUTHOR = "TAMITOS AI"
VERSION = "sk-v1"
LEASE_SECONDS = 180
MAX_ATTEMPTS = 3
ID = re.compile(r"^[a-f0-9]{16}$")


def conditional(error):
    return getattr(error, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException"


def validate_sources(sources, now):
    """Only a separately curated, current source pack can enter the prompt."""
    result = {}
    for s in sources:
        url = urlsplit(s.get("url", ""))
        if (not s.get("approved") or s.get("language") != "sk"
                or url.scheme != "https" or not url.hostname or url.username
                or int(s.get("review_until", 0)) < now
                or not s.get("id") or not s.get("excerpt") or not s.get("title")):
            continue
        result[s["id"]] = {k: s[k] for k in ("id", "url", "title", "excerpt")}
    return result


def validate_answer(answer, sources):
    """Citation URLs are resolved from the source registry, never invented by a model."""
    if not isinstance(answer, dict) or answer.get("confidence") != "adequate":
        raise ValueError("needs_review")
    paragraphs = answer.get("paragraphs")
    if not isinstance(paragraphs, list) or not 1 <= len(paragraphs) <= 5:
        raise ValueError("needs_review")
    clean = []
    used = set()
    for p in paragraphs:
        text = p.get("text", "") if isinstance(p, dict) else ""
        ids = p.get("source_ids", []) if isinstance(p, dict) else []
        if (not isinstance(text, str) or not 1 <= len(text) <= 700
                or re.search(r"https?://|<[^>]*>|[\u2013\u2014]", text)
                or not isinstance(ids, list) or not 1 <= len(ids) <= 3
                or any(not isinstance(s, str) or s not in sources for s in ids)):
            raise ValueError("needs_review")
        used.update(ids)
        clean.append({"text": text, "source_ids": ids})
    return {"author": AUTHOR, "is_ai": True, "language": "sk", "version": VERSION,
            "kind": answer.get("kind", "needs_review"),
            "paragraphs": clean,
            "sources": [{k: sources[s][k] for k in ("id", "url", "title")} for s in sorted(used)]}


def process(table, post_id, sources, generate, *, enabled=False, auto_publish=False, now=None):
    """Claim outside model call; commit once only while parent remains approved.

    Three attempts, expired leases recoverable; rejected/deleted parents cannot publish.
    Model/retrieval errors are recorded as safe codes, never prompts or SDK messages.
    auto_publish is a server deployment setting; clinical answers require separate review.
    """
    if not enabled:
        return "disabled"
    if not ID.fullmatch(post_id):
        raise ValueError("invalid_id")
    now = int(time.time() if now is None else now)
    pack = validate_sources(sources, now)
    if not pack:
        return "no_sources"
    lease = uuid.uuid4().hex
    try:
        result = table.update_item(
            Key={"id": post_id},
            ConditionExpression=("attribute_exists(id) AND #s = :approved "
                "AND attribute_not_exists(ai_reply) AND (attribute_not_exists(ai_attempts) OR ai_attempts < :max) "
                "AND ((ai_state IN (:queued, :retry) AND ai_due <= :now) "
                "OR (ai_state = :working AND ai_lease_until < :now))"),
            UpdateExpression=("SET ai_state = :working, ai_lease = :lease, ai_lease_until = :until "
                              "ADD ai_attempts :one"),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":approved": "approved", ":max": MAX_ATTEMPTS,
                ":queued": "queued", ":retry": "retry", ":working": "working", ":now": now,
                ":lease": lease, ":until": now + LEASE_SECONDS, ":one": 1},
            ReturnValues="ALL_NEW")
    except Exception as e:
        if conditional(e):
            return "not_claimed"
        raise
    row = result["Attributes"]
    try:
        # Only approved post text is needed, no email, sub, IP, nick or child metadata.
        answer = validate_answer(generate(str(row.get("text", ""))[:1200], list(pack.values())), pack)
        answer["created"] = now
        # The model explicitly classifies personal health/clinical requests for human review.
        publish = (auto_publish and not answer_requires_review(row, answer)
                   and all(s.get("auto_publish") is True for s in sources if s.get("id") in used_source_ids(answer))
                   and all(any(p["text"] == pack[s]["excerpt"] for s in p["source_ids"])
                           for p in answer["paragraphs"]))
        values = {":approved": "approved", ":lease": lease,
                  ":state": "complete" if publish else "needs_review", ":reply": answer}
        field = "ai_reply" if publish else "ai_draft"
        update = f"SET ai_state = :state, {field} = :reply REMOVE ai_lease, ai_lease_until"
    except Exception:
        attempt = int(row.get("ai_attempts", 1))
        values = {":approved": "approved", ":lease": lease,
                  ":state": "needs_review" if attempt >= MAX_ATTEMPTS else "retry",
                  ":due": now + 60 * (2 ** (attempt - 1)), ":code": "generation_failed"}
        update = "SET ai_state = :state, ai_due = :due, ai_error = :code REMOVE ai_lease, ai_lease_until"
    try:
        table.update_item(Key={"id": post_id},
            ConditionExpression="#s = :approved AND ai_lease = :lease",
            UpdateExpression=update, ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues=values)
    except Exception as e:
        if conditional(e):
            return "cancelled"
        raise
    return values[":state"]


def answer_requires_review(row, answer):
    # Auto-publication starts with administrative/product navigation only.
    # A classifier alone is insufficient for clinical decisions.
    return (answer.get("kind") != "navigation"
            or row.get("topic") not in {"tamitos", "knihy", "move", "komunita"})


def used_source_ids(answer):
    return {s["id"] for s in answer["sources"]}
