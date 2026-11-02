"""
TAMITOS Health — read API (GET /articles, /providers, /studies) z DynamoDB.
Verejné GET dáta pre web (data.tamitos.com). Bez zápisu.
Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE, CORS_ORIGIN.
"""
import os, json, decimal, base64, binascii, hashlib, unicodedata, threading, time
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


def _with_confirmations(items):
    """Attach provider confirmations; None means the metadata could not be read completely."""
    if not (os.environ.get('PROVIDER_REVIEW_TABLE') and items):
        return items
    from provider_review import public_confirmation
    summaries = {}
    for offset in range(0, len(items), 100):
        batch = {'Keys': [{'id': 'confirmed#' + x['ext_id']} for x in items[offset:offset + 100]]}
        result = ddb.batch_get_item(RequestItems={os.environ['PROVIDER_REVIEW_TABLE']: batch})
        # Do not mislabel an unprocessed key as an absent confirmation.
        if result.get('UnprocessedKeys'):
            return None
        summaries.update({x['ext_id']: x for x in result.get('Responses', {}).get(os.environ['PROVIDER_REVIEW_TABLE'], [])})
    return [public_confirmation(x, summaries.get(x['ext_id'])) for x in items]


# ---------------------------------------------------------------- index search
# GET /providers?offset=0 switches to the index mode: the whole public provider
# collection (about 7 000 rows) is read once per warm Lambda with a parallel scan,
# kept in memory for INDEX_SECONDS and filtered here. The browser receives one small
# page plus the EXACT number of matches and per-category counts, so a rare search no
# longer needs dozens of sequential round trips and every number on the page is real.
# The cursor mode above is unchanged for existing clients.
INDEX_SECONDS = 300
INDEX_SEGMENTS = 4
_index = {'rows': None, 'at': 0.0}
_index_lock = threading.Lock()


def fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', str(value or '').lower()) if not unicodedata.combining(c))


def _segment_table():
    # boto3 resources are not thread safe: one session per scan segment.
    return boto3.session.Session().resource('dynamodb').Table(TABLES['providers'])


def _scan_segment(segment, total, out, errors):
    try:
        table, args, rows = _segment_table(), {'Segment': segment, 'TotalSegments': total}, []
        while True:
            page = table.scan(**args)
            rows.extend(page.get('Items', []))
            if not page.get('LastEvaluatedKey'):
                break
            args['ExclusiveStartKey'] = page['LastEvaluatedKey']
        out[segment] = rows
    except Exception as exc:  # reported to the caller, never half-published
        errors.append(type(exc).__name__)


def provider_index(now=time.time):
    with _index_lock:
        if _index['rows'] is not None and now() - _index['at'] < INDEX_SECONDS:
            return _index['rows'], _index['at']
        out, errors = [None] * INDEX_SEGMENTS, []
        threads = [threading.Thread(target=_scan_segment, args=(i, INDEX_SEGMENTS, out, errors)) for i in range(INDEX_SEGMENTS)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(20)
        if errors or any(part is None for part in out):
            if _index['rows'] is not None:  # keep serving the last complete index
                return _index['rows'], _index['at']
            raise RuntimeError('provider index unavailable')
        rows = []
        for part in out:
            for row in part:
                if row.get('active') is False or not isinstance(row.get('ext_id'), str):
                    continue
                row = dict(row)
                row['_s'] = row.get('search_text') or fold(' '.join(str(row.get(k, '')) for k in ('name', 'city', 'address', 'kind')))
                rows.append(row)
        rows.sort(key=lambda r: (fold(r.get('city')) or '~', fold(r.get('name'))))
        _index.update(rows=rows, at=now())
        return rows, _index['at']


def _index_page(q):
    filters = {k: str(q.get(k, '')).strip() for k in ('region', 'category', 'kind', 'q')}
    if any(len(v) > 160 for v in filters.values()):
        raise ValueError('filter length')
    offset, limit = int(q.get('offset', 0)), int(q.get('limit', 30))
    if not (0 <= offset <= 50000 and 1 <= limit <= 100):
        raise ValueError('offset or limit')
    try:
        rows, built = provider_index()
    except RuntimeError:
        return _resp(503, {'error': 'Directory temporarily unavailable'})
    words = fold(filters['q']).split()

    def keep(row, skip=None):
        if filters['region'] and row.get('region') != filters['region']:
            return False
        if skip != 'category' and filters['category'] and row.get('category') != filters['category']:
            return False
        if skip != 'kind' and filters['kind'] and row.get('kind') != filters['kind']:
            return False
        return all(w in row['_s'] for w in words)

    category_counts, kind_counts = {}, {}
    for row in rows:
        if keep(row, 'category'):
            c = row.get('category') or 'other'
            category_counts[c] = category_counts.get(c, 0) + 1
        if keep(row, 'kind') and row.get('kind'):
            kind_counts[row['kind']] = kind_counts.get(row['kind'], 0) + 1
    matched = [row for row in rows if keep(row)]
    page = [{k: v for k, v in row.items() if k in PUBLIC_PROVIDER_FIELDS} for row in matched[offset:offset + limit]]
    page = _with_confirmations(page)
    if page is None:
        return _resp(503, {'error': 'Confirmation metadata temporarily unavailable'})
    page = [{k: v for k, v in row.items() if k in PUBLIC_PROVIDER_FIELDS} for row in page]
    nxt = offset + limit if offset + limit < len(matched) else None
    result = _resp(200, {'items': page, 'returned_count': len(page), 'offset': offset, 'next_offset': nxt,
                         'total_matching': len(matched), 'coverage': 'complete_index',
                         'facets': {'category': category_counts, 'kind': kind_counts, 'all_categories': sum(category_counts.values())},
                         'index_built_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(built)),
                         'applied_filters': filters})
    result['headers']['Cache-Control'] = 'public, max-age=60'
    return result


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
    if name == 'providers' and 'offset' in q:
        try:
            return _index_page(q)
        except (ValueError, TypeError):
            return _resp(400, {'error': 'invalid filter, offset or limit'})
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
    if name == 'providers':
        items = _with_confirmations(items)
        if items is None:
            return _resp(503, {'error': 'Confirmation metadata temporarily unavailable'})
    if name == 'providers':
        items = [{k: v for k, v in row.items() if k in PUBLIC_PROVIDER_FIELDS} for row in items]
    last = page.get('LastEvaluatedKey')
    next_cursor = base64.urlsafe_b64encode(json.dumps({'collection': name, 'key': last, 'filter_signature': signature}, cls=_Enc).encode()).decode() if last else None
    # Scan page size is not the collection's total and cannot establish upstream coverage.
    return _resp(200, {'items': items, 'returned_count': len(items),
                      'next_cursor': next_cursor, 'total_matching': None,
                      'coverage': 'page' if last else 'end_of_scan',
                      'upstream_coverage': 'not_verified', 'applied_filters': filters})
