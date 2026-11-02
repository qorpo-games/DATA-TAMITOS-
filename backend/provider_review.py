"""Provider confirmation workflow. No outbound messages or automatic identity claims.

Admin first checks an authorised provider representative, then issues a short-lived
one-use link. Responses become proposals; a reviewer approves a particular version.
Provider source rows and confirmation records stay separate, so imports cannot
silently renew verification or overwrite reviewed edits.
"""
import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
import boto3

ddb = boto3.resource('dynamodb')
FIELDS = {'name', 'address', 'city', 'contact', 'phone', 'email', 'website', 'age_group', 'service_form'}
IDENTITY_METHODS = {'official_domain_email', 'published_contact_callback', 'manual_document_check'}


def fingerprint(provider):
    values = {k: provider.get(k, '') for k in sorted(FIELDS)}
    return hashlib.sha256(json.dumps(values, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')


def public_confirmation(provider, review, timestamp=None):
    if not review or review.get('state') != 'approved':
        return provider
    result = dict(provider)
    if review.get('source_record_hash') != fingerprint(provider):
        result['confirmation_status'] = 'source_changed'
        return result
    result.update(review.get('confirmed_fields', {}))
    result['provider_confirmed_at'] = review['confirmed_at']
    result['provider_confirmed_fields'] = sorted(review.get('confirmed_fields', {}))
    result['confirmation_due_at'] = review['review_due_at']
    result['confirmation_status'] = 'due' if review['review_due_at'] <= (timestamp or now()) else 'provider_confirmed'
    return result


def response(code, value):
    return {'statusCode': code, 'headers': {'Content-Type': 'application/json',
            'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
            'Access-Control-Allow-Origin': os.environ.get('CORS_ORIGIN', 'https://tamitos.com'),
            'Access-Control-Allow-Headers': 'content-type,x-admin-token',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'},
            'body': json.dumps(value, ensure_ascii=False, default=str)}


def admin(event):
    headers = {k.lower(): str(v) for k, v in (event.get('headers') or {}).items()}
    expected = os.environ.get('ADMIN_TOKEN', '')
    return bool(expected) and hmac.compare_digest(headers.get('x-admin-token', ''), expected)


def handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', event.get('httpMethod', 'GET'))
    path = event.get('rawPath', event.get('path', ''))
    if method == 'OPTIONS':
        return response(204, {})
    if not os.environ.get('PROVIDER_REVIEW_TABLE'):
        return response(503, {'error': 'Provider review is not configured'})
    table = ddb.Table(os.environ['PROVIDER_REVIEW_TABLE'])
    providers = ddb.Table(os.environ['PROVIDERS_TABLE'])
    if path == '/provider-sources' and method == 'GET':
        state = table.get_item(Key={'id': 'sources#current'}, ConsistentRead=True).get('Item')
        if not state:
            return response(503, {'error': 'Import status has not been published'})
        return response(200, {'checked_at': state['checked_at'], 'complete': state['complete'],
                              'sources': [{k: x[k] for k in ('id', 'status', 'records', 'source_updated_at') if k in x} for x in state['sources']]})
    is_admin = path == '/provider-review'
    if path not in ('/provider-review', '/provider-confirmation') or method not in ('GET', 'POST'):
        return response(404, {'error': 'not found'})
    if is_admin and not admin(event):
        return response(401, {'error': 'unauthorized'})
    try:
        raw = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            raw = base64.b64decode(raw).decode()
        if len(raw.encode()) > 12000:
            raise ValueError('Request too large')
        body = json.loads(raw)
        if not isinstance(body, dict):
            raise ValueError('Expected object')
        if is_admin and method == 'GET':
            query = event.get('queryStringParameters') or {}
            args = {'Limit': 100}
            if query.get('cursor'):
                if not isinstance(query['cursor'], str) or len(query['cursor']) > 2048:
                    raise ValueError('Invalid cursor')
                key = json.loads(base64.urlsafe_b64decode(query['cursor']))
                if not isinstance(key, dict) or set(key) != {'id'} or not isinstance(key['id'], str):
                    raise ValueError('Invalid cursor')
                args['ExclusiveStartKey'] = key
            page = table.scan(**args)
            visible = []
            for item in page.get('Items', []):
                if item.get('state') == 'pending' or (item.get('state') == 'approved' and item.get('review_due_at', '') <= now()):
                    visible.append({k: v for k, v in item.items() if k not in ('token_hash',)})
            cursor = base64.urlsafe_b64encode(json.dumps(page['LastEvaluatedKey']).encode()).decode() if page.get('LastEvaluatedKey') else None
            return response(200, {'items': visible, 'next_cursor': cursor})
        if is_admin and body.get('action') == 'issue':
            ext = body.get('ext_id')
            if not isinstance(ext, str) or len(ext) > 180:
                raise ValueError('Invalid provider ID')
            if body.get('identity_method') not in IDENTITY_METHODS or not text(body.get('evidence_reference')):
                raise ValueError('Provider representative identity must be checked first')
            provider = providers.get_item(Key={'ext_id': ext}, ConsistentRead=True).get('Item')
            if not provider or provider.get('active') is False:
                return response(404, {'error': 'Provider unavailable'})
            token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            item = {'id': 'challenge#' + token_hash, 'ext_id': ext, 'state': 'issued',
                    'expires_at': int(time.time()) + 7 * 86400, 'ttl': int(time.time()) + 30 * 86400,
                    'source_record_hash': fingerprint(provider), 'created_at': now(),
                    'identity_method': body['identity_method'], 'evidence_reference': text(body['evidence_reference'])[:500]}
            table.put_item(Item=item, ConditionExpression='attribute_not_exists(id)')
            # Token in fragment, not query: browser keeps it out of server URL logs.
            return response(201, {'token': token, 'confirmation_path': '/sk/spolu/potvrdenie#token=' + token,
                                  'expires_at': item['expires_at'], 'delivery': 'manual; no email sent'})
        if is_admin and body.get('action') in ('approve', 'reject'):
            rid = body.get('id', '')
            if not isinstance(rid, str) or not re.fullmatch(r'challenge#[0-9a-f]{64}', rid):
                raise ValueError('Invalid review ID')
            proposal = table.get_item(Key={'id': rid}, ConsistentRead=True).get('Item')
            if not proposal or proposal.get('state') != 'pending':
                return response(409, {'error': 'Proposal is no longer pending'})
            provider = providers.get_item(Key={'ext_id': proposal['ext_id']}, ConsistentRead=True).get('Item')
            if not provider or provider.get('active') is False or fingerprint(provider) != proposal['source_record_hash']:
                return response(409, {'error': 'Source record changed; request a new confirmation'})
            action = body['action']
            if action == 'approve':
                prior = table.get_item(Key={'id': 'confirmed#' + proposal['ext_id']}, ConsistentRead=True).get('Item')
                if prior and prior.get('confirmed_at', '') > proposal['submitted_at']:
                    return response(409, {'error': 'A newer provider response is already approved'})
            transition = {'TableName': os.environ['PROVIDER_REVIEW_TABLE'], 'Key': {'id': {'S': rid}},
                          'UpdateExpression': 'SET #s = :done, reviewed_at = :at', 'ConditionExpression': '#s = :pending',
                          'ExpressionAttributeNames': {'#s': 'state'},
                          'ExpressionAttributeValues': {':done': {'S': action}, ':pending': {'S': 'pending'}, ':at': {'S': now()}}}
            writes = [{'Update': transition}]
            if action == 'approve':
                confirmed = {'id': 'confirmed#' + proposal['ext_id'], 'ext_id': proposal['ext_id'],
                             'state': 'approved', 'source_record_hash': proposal['source_record_hash'],
                             'confirmed_fields': proposal['confirmed_fields'], 'confirmed_at': proposal['submitted_at'],
                             'review_due_at': (dt.datetime.fromisoformat(proposal['submitted_at']) + dt.timedelta(days=90)).isoformat(timespec='seconds'),
                             'reviewed_at': now()}
                confirmed['identity_method'] = proposal['identity_method']
                confirmed['evidence_reference'] = proposal['evidence_reference']
                writes.append({'Put': {'TableName': os.environ['PROVIDER_REVIEW_TABLE'],
                    'Item': {k: ({'M': {f: {'S': v} for f, v in value.items()}} if isinstance(value, dict) else {'S': value}) for k, value in confirmed.items()},
                    'ConditionExpression': 'attribute_not_exists(confirmed_at) OR confirmed_at <= :at',
                    'ExpressionAttributeValues': {':at': {'S': proposal['submitted_at']}}}})
            # Use an explicit low-level client for AttributeValue transaction maps.
            boto3.client('dynamodb').transact_write_items(TransactItems=writes)
            return response(200, {'state': action})
        token = body.get('token') if method == 'POST' else (event.get('headers') or {}).get('x-provider-token')
        # GET is deliberately not supported for bearer-token lookup; POST avoids
        # accidental confirmation and token leakage in links/logs.
        if method != 'POST' or not isinstance(token, str) or not re.fullmatch(r'[A-Za-z0-9_-]{40,80}', token):
            raise ValueError('Invalid confirmation request')
        rid = 'challenge#' + hashlib.sha256(token.encode()).hexdigest()
        item = table.get_item(Key={'id': rid}, ConsistentRead=True).get('Item')
        if not item or item.get('state') != 'issued' or item['expires_at'] <= int(time.time()):
            return response(410, {'error': 'Confirmation link expired or already used'})
        provider = providers.get_item(Key={'ext_id': item['ext_id']}, ConsistentRead=True).get('Item')
        if not provider or provider.get('active') is False or fingerprint(provider) != item['source_record_hash']:
            return response(409, {'error': 'Source record changed'})
        if body.get('action') == 'preview':
            return response(200, {'ext_id': item['ext_id'], 'fields': {k: provider.get(k, '') for k in sorted(FIELDS)}, 'source_url': provider.get('source_url', '')})
        fields = body.get('fields')
        if body.get('action') != 'confirm' or body.get('attestation') is not True or not isinstance(fields, dict) or not fields or not set(fields) <= FIELDS:
            raise ValueError('Choose fields and attest to their accuracy')
        if any(not isinstance(v, str) or len(v) > 1000 for v in fields.values()):
            raise ValueError('Invalid field value')
        if 'name' in fields and not fields['name'].strip():
            raise ValueError('Name cannot be empty')
        if 'website' in fields and fields['website']:
            parsed = urllib.parse.urlparse(fields['website'])
            if parsed.scheme not in ('https', 'http') or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError('Invalid provider website')
        table.update_item(Key={'id': rid},
            UpdateExpression='SET #s = :pending, confirmed_fields = :fields, submitted_at = :at',
            ConditionExpression='#s = :issued AND expires_at > :now',
            ExpressionAttributeNames={'#s': 'state'},
            ExpressionAttributeValues={':pending': 'pending', ':issued': 'issued', ':fields': fields,
                                       ':at': now(), ':now': int(time.time())})
        return response(202, {'state': 'pending', 'message': 'Potvrdenie čaká na redakčnú kontrolu.'})
    except (ValueError, TypeError, KeyError, AttributeError, UnicodeError):
        return response(400, {'error': 'Invalid review request'})
    except Exception as exc:
        details = getattr(exc, 'response', {})
        if details.get('Error', {}).get('Code') == 'ConditionalCheckFailedException' or any(x.get('Code') == 'ConditionalCheckFailed' for x in details.get('CancellationReasons', [])):
            return response(409, {'error': 'Review state changed; reload before continuing'})
        return response(503, {'error': 'Review temporarily unavailable'})


def text(value):
    return ' '.join(value.split()) if isinstance(value, str) else ''
