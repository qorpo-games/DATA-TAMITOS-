"""
TAMITOS Health — admin API pre moderátora komunity.

Chránené jednoduchým admin tokenom (hlavička X-Admin-Token == env ADMIN_TOKEN).
- GET  /admin-posts?status=pending   -> zoznam príspevkov v danom stave
- POST /admin-moderate {id, action}  -> approve | reject | delete (mení status)

Env: POSTS_TABLE, ADMIN_TOKEN.
"""
import os, json, hmac, decimal
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
        pid = body.get("id")
        action = body.get("action")
        # delete = soft delete (status "deleted") — skryje príspevok všade, ale je vratné
        status_map = {"approve": "approved", "reject": "rejected", "delete": "deleted"}
        if not pid or action not in status_map:
            return _resp(400, {"error": "bad request"})
        new_status = status_map[action]
        POSTS.update_item(
            Key={"id": pid},
            UpdateExpression="SET #s = :s",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":s": new_status},
        )
        return _resp(200, {"ok": True, "id": pid, "status": new_status})

    return _resp(405, {"error": "method not allowed"})
