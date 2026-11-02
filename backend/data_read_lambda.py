"""
TAMITOS Health — read API (GET /articles, /providers, /studies) z DynamoDB.
Verejné GET dáta pre web (data.tamitos.com). Bez zápisu.
Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE, CORS_ORIGIN.
"""
import os, json, decimal, base64, binascii
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
    method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', 'GET'))
    if method == 'OPTIONS':
        return _resp(204, {})
    if method != 'GET':
        return _resp(405, {'error': 'method not allowed'})
    path = event.get("rawPath") or event.get("path", "")
    name = path.rstrip("/").split("/")[-1]
    if name not in TABLES:
        return _resp(404, {"error": "not found"})
    q = event.get("queryStringParameters") or {}
    try:
        limit = int(q.get('limit', 200))
        if not 1 <= limit <= 500:
            raise ValueError('limit')
        args = {'Limit': limit}
        if q.get('cursor'):
            cursor = q['cursor']
            if len(cursor) > 2048:
                raise ValueError('cursor')
            raw = json.loads(base64.b64decode(cursor, altchars=b'-_', validate=True))
            key = {'studies': 'nct_id', 'providers': 'ext_id', 'articles': 'id'}[name]
            if raw.get('collection') != name or not isinstance(raw.get('key'), dict):
                raise ValueError('cursor scope')
            if set(raw['key']) != {key} or not isinstance(raw['key'][key], str) or not raw['key'][key] or len(raw['key'][key]) > 512:
                raise ValueError('cursor key')
            args['ExclusiveStartKey'] = raw['key']
    except (ValueError, TypeError, KeyError, AttributeError, binascii.Error, UnicodeError):
        return _resp(400, {'error': 'invalid limit or cursor'})
    page = ddb.Table(TABLES[name]).scan(**args)
    items = page.get('Items', [])
    last = page.get('LastEvaluatedKey')
    next_cursor = base64.urlsafe_b64encode(json.dumps({'collection': name, 'key': last}, cls=_Enc).encode()).decode() if last else None
    # Scan page size is not the collection's total and cannot establish upstream coverage.
    return _resp(200, {'items': items, 'returned_count': len(items),
                      'next_cursor': next_cursor, 'total_matching': None,
                      'coverage': 'page' if last else 'end_of_scan',
                      'upstream_coverage': 'not_verified'})
