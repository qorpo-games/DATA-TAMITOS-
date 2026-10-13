"""
TAMITOS Health — admin API pre moderátora komunity.

Chránené jednoduchým admin tokenom (hlavička X-Admin-Token == env ADMIN_TOKEN).
- GET  /admin-posts?status=pending   -> zoznam príspevkov v danom stave
- POST /admin-moderate {id, action}  -> approve | reject | delete (mení status)

Env: POSTS_TABLE, ADMIN_TOKEN.
"""
import os, json, hmac, decimal, re
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb")
POSTS = ddb.Table(os.environ["POSTS_TABLE"])
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-admin-token",
}


class _Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", **CORS},
            "body": json.dumps(body, ensure_ascii=False, cls=_Enc)}


def _method(event):
    return (event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("httpMethod") or "GET")


def _authed(event):
    h = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    tok = h.get("x-admin-token", "")
    return bool(ADMIN_TOKEN) and hmac.compare_digest(str(tok), ADMIN_TOKEN)


def handler(event, context):
    method = _method(event)
    if method == "OPTIONS":
        return _resp(200, {})
    if not _authed(event):
        return _resp(401, {"error": "unauthorized"})

    if method == "GET":
        status = (event.get("queryStringParameters") or {}).get("status", "pending")
        try:
            r = POSTS.query(
                IndexName="status-created-index",
                KeyConditionExpression=Key("status").eq(status),
                ScanIndexForward=False, Limit=100,
            )
            items = r.get("Items", [])
        except Exception as e:
            print("query err, fallback scan:", e)
            r = POSTS.scan(Limit=300)
            items = [i for i in r.get("Items", []) if i.get("status") == status]
        return _resp(200, {"items": items, "count": len(items)})

    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return _resp(400, {"error": "bad json"})
        if not isinstance(body, dict):
            return _resp(400, {"error": "bad json"})
        pid = body.get("id")
        action = body.get("action")
        if action == "reply":
            text = body.get("text")
            if (not isinstance(pid, str) or not re.fullmatch(r"[0-9a-f]{16}", pid)
                    or not isinstance(text, str) or not 15 <= len(text.strip()) <= 1200
                    or re.search(r"<[^>]*>", text)
                    or any(ord(ch) < 32 and ch not in "\n\r\t" for ch in text)):
                return _resp(400, {"error": "bad reply"})
            expected = body.get("expected_reply_created")
            if expected is not None and (not isinstance(expected, str) or not 1 <= len(expected) <= 64):
                return _resp(400, {"error": "bad reply version"})
            reply = {"author": "TAMITOS", "is_ai": False, "text": text.strip(),
                     "created": datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")}
            names = {"#s": "status", "#r": "moderator_reply"}
            values = {":approved": "approved", ":reply": reply}
            condition = "attribute_exists(id) AND #s = :approved"
            if expected is None:
                condition += " AND attribute_not_exists(#r)"
            else:
                condition += " AND #r.#c = :expected"
                names["#c"] = "created"
                values[":expected"] = expected
            try:
                POSTS.update_item(
                    Key={"id": pid},
                    ConditionExpression=condition,
                    UpdateExpression="SET #r = :reply",
                    ExpressionAttributeNames=names,
                    ExpressionAttributeValues=values)
            except Exception as exc:
                if getattr(exc, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                    return _resp(409, {"error": "Post or reply changed. Reload before saving."})
                raise
            return _resp(200, {"ok": True, "id": pid, "reply_created": reply["created"]})
        # delete = soft delete (status "deleted") — skryje príspevok všade, ale je vratné
        status_map = {"approve": "approved", "reject": "rejected", "delete": "deleted"}
        actor = body.get("actor", "data-admin")
        if (not isinstance(pid, str) or not re.fullmatch(r"[0-9a-f]{16}", pid)
                or not isinstance(action, str) or action not in status_map or not isinstance(actor, str)
                or not 1 <= len(actor) <= 128):
            return _resp(400, {"error": "bad request"})
        new_status = status_map[action]
        try:
            POSTS.update_item(
                Key={"id": pid},
                ConditionExpression="attribute_exists(id)",
                UpdateExpression="SET #s = :s, moderated_by = :actor, moderated_at = :at",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":s": new_status, ":actor": actor,
                    ":at": datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")},
            )
        except Exception as exc:
            if getattr(exc, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                return _resp(404, {"error": "Post not found."})
            raise
        return _resp(200, {"ok": True, "id": pid, "status": new_status})

    return _resp(405, {"error": "method not allowed"})
