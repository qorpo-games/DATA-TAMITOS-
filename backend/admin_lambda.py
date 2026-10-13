"""
TAMITOS Health — admin API pre moderátora komunity.

Chránené jednoduchým admin tokenom (hlavička X-Admin-Token == env ADMIN_TOKEN).
- GET  /admin-posts?status=pending   -> zoznam príspevkov v danom stave
- POST /admin-moderate {id, action}  -> approve | reject | delete (mení status)

Env: POSTS_TABLE, ADMIN_TOKEN.
"""
import os, json, hmac, decimal, re, time
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

ddb = boto3.resource("dynamodb")
POSTS = ddb.Table(os.environ["POSTS_TABLE"])
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,x-admin-token",
}
STATUSES = {"pending", "flagged", "approved", "rejected", "deleted"}


class _Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", "Cache-Control": "no-store", **CORS},
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
        if status not in STATUSES:
            return _resp(400, {"error": "bad status"})
        try:
            r = POSTS.query(
                IndexName="status-created-index",
                KeyConditionExpression=Key("status").eq(status),
                ScanIndexForward=False, Limit=100,
            )
            items = r.get("Items", [])
        except ClientError:
            return _resp(503, {"error": "temporarily unavailable"})
        return _resp(200, {"items": items, "count": len(items)})

    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except Exception:
            return _resp(400, {"error": "bad json"})
        if not isinstance(body, dict):
            return _resp(400, {"error": "bad request"})
        pid = body.get("id")
        action = body.get("action")
        # delete = soft delete (status "deleted") — skryje príspevok všade, ale je vratné
        status_map = {"approve": "approved", "reject": "rejected", "delete": "deleted"}
        if not isinstance(pid, str) or not re.fullmatch(r"[a-f0-9]{16}", pid) or action not in status_map:
            return _resp(400, {"error": "bad request"})
        new_status = status_map[action]
        now = int(time.time())
        update = "SET #s = :s, moderated_at = :now, moderated_by = :actor"
        values = {":s": new_status, ":now": now,
                  ":actor": str(body.get("actor") or "legacy-token-admin")[:128]}
        # Feature is off until an approved provider and minute worker are configured.
        if new_status == "approved" and os.getenv("TAMITOS_AI_ENABLED") == "true":
            update += ", ai_state = if_not_exists(ai_state, :queued), ai_due = if_not_exists(ai_due, :now)"
            values[":queued"] = "queued"
        try:
            POSTS.update_item(Key={"id": pid}, ConditionExpression="attribute_exists(id)",
                UpdateExpression=update, ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues=values)
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                return _resp(404, {"error": "not found"})
            return _resp(503, {"error": "temporarily unavailable"})
        return _resp(200, {"ok": True, "id": pid, "status": new_status})

    return _resp(405, {"error": "method not allowed"})
