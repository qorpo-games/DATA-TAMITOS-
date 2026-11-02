"""
TAMITOS Health — read API (GET /articles, /providers, /studies) z DynamoDB.
Verejné GET dáta pre web (data.tamitos.com). Bez zápisu.
Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE, CORS_ORIGIN.
"""
import os, json, decimal, base64, binascii, hashlib, unicodedata
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
PUBLIC_PROVIDER_FIELDS = {
    'ext_id', 'name', 'kind', 'category', 'region', 'district', 'city', 'address',
    'contact', 'phone', 'email', 'website', 'url', 'web', 'source', 'source_name',
    'source_url', 'source_file_url', 'fetched_at', 'source_updated_at',
    'service_form', 'target_group', 'age_group', 'registered_capacity',
    'reported_vacancies', 'reported_waiting', 'availability_note', 'autism_specific',
    'confirmation_status', 'provider_confirmed_at', 'confirmation_due_at', 'provider_confirmed_fields',
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
        filters = {k: str(q.get(k, '')).strip() for k in ('region', 'category', 'kind', 'q')} if name == 'providers' else {}
        if any(len(v) > 160 for v in filters.values()):
            raise ValueError('filter length')
        signature = hashlib.sha256(json.dumps(filters, sort_keys=True).encode()).hexdigest() if any(filters.values()) else None
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
            if raw.get('filter_signature') != signature:
                raise ValueError('cursor filters changed')
            if set(raw['key']) != {key} or not isinstance(raw['key'][key], str) or not raw['key'][key] or len(raw['key'][key]) > 512:
                raise ValueError('cursor key')
            args['ExclusiveStartKey'] = raw['key']
        if name == 'providers' and any(filters.values()):
            expressions, names, values = [], {}, {}
            for field in ('region', 'category', 'kind'):
                if filters[field]:
                    expressions.append('#' + field + ' = :' + field)
                    names['#' + field] = field; values[':' + field] = filters[field]
            if filters['q']:
                query = ''.join(c for c in unicodedata.normalize('NFKD', filters['q'].lower()) if not unicodedata.combining(c))
                expressions.append('contains(#search, :q)'); names['#search'] = 'search_text'; values[':q'] = query
            args.update(FilterExpression=' AND '.join(expressions), ExpressionAttributeNames=names, ExpressionAttributeValues=values)
    except (ValueError, TypeError, KeyError, AttributeError, binascii.Error, UnicodeError):
        return _resp(400, {'error': 'invalid limit or cursor'})
    page = ddb.Table(TABLES[name]).scan(**args)
    items = [x for x in page.get('Items', []) if x.get('active') is not False]
    if name == 'providers' and os.environ.get('PROVIDER_REVIEW_TABLE') and items:
        from provider_review import public_confirmation
        summaries = {}
        for offset in range(0, len(items), 100):
            batch = {'Keys': [{'id': 'confirmed#' + x['ext_id']} for x in items[offset:offset + 100]]}
            result = ddb.batch_get_item(RequestItems={os.environ['PROVIDER_REVIEW_TABLE']: batch})
            # Do not mislabel an unprocessed key as an absent confirmation.
            if result.get('UnprocessedKeys'):
                return _resp(503, {'error': 'Confirmation metadata temporarily unavailable'})
            summaries.update({x['ext_id']: x for x in result.get('Responses', {}).get(os.environ['PROVIDER_REVIEW_TABLE'], [])})
        items = [public_confirmation(x, summaries.get(x['ext_id'])) for x in items]
    if name == 'providers':
        items = [{k: v for k, v in row.items() if k in PUBLIC_PROVIDER_FIELDS} for row in items]
    last = page.get('LastEvaluatedKey')
    next_cursor = base64.urlsafe_b64encode(json.dumps({'collection': name, 'key': last, 'filter_signature': signature}, cls=_Enc).encode()).decode() if last else None
    # Scan page size is not the collection's total and cannot establish upstream coverage.
    return _resp(200, {'items': items, 'returned_count': len(items),
                      'next_cursor': next_cursor, 'total_matching': None,
                      'coverage': 'page' if last else 'end_of_scan',
                      'upstream_coverage': 'not_verified', 'applied_filters': filters})
