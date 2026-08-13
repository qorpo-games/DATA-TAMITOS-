"""
TAMITOS Health — read API (GET /articles, /providers, /studies) z DynamoDB.
Verejné GET dáta pre web (data.tamitos.com). Bez zápisu.
Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE, CORS_ORIGIN.
"""
import os, json, decimal
import boto3

ddb = boto3.resource("dynamodb")
TABLES = {
    "articles": os.environ["ARTICLES_TABLE"],
    "providers": os.environ["PROVIDERS_TABLE"],
    "studies": os.environ["STUDIES_TABLE"],
}
CORS = {
    "Access-Control-Allow-Origin": os.environ.get("CORS_ORIGIN", "*"),
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
}


class _Enc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", **CORS},
            "body": json.dumps(body, ensure_ascii=False, cls=_Enc)}


def handler(event, context):
    path = event.get("rawPath") or event.get("path", "")
    name = path.rstrip("/").split("/")[-1]
    if name not in TABLES:
        return _resp(404, {"error": "not found"})
    q = event.get("queryStringParameters") or {}
    limit = min(int(q.get("limit", 200)), 500)
    items = ddb.Table(TABLES[name]).scan(Limit=limit).get("Items", [])
    return _resp(200, {"items": items})
