"""Publish independently validated sources without retiring data on source failure."""
def clean(row):
    return {k: v for k, v in row.items() if v is not None}


def publish(providers, review_table, result, approved_shrink_scopes=()):
    written = 0
    old_rows = []
    args = {'ProjectionExpression': 'ext_id, source_scope, #active', 'ExpressionAttributeNames': {'#active': 'active'}}
    while True:
        page = providers.scan(**args)
        old_rows.extend(page.get('Items', []))
        if not page.get('LastEvaluatedKey'):
            break
        args['ExclusiveStartKey'] = page['LastEvaluatedKey']
    for source in result['sources']:
        if source['status'] != 'ok':
            continue
        scope = source['id']
        rows = [row for row in result['items'] if row['source_scope'] == scope]
        if not rows:
            source.update(status='publish_failed', error='Empty refresh refused')
            continue
        previous_count = sum(x.get('source_scope') == scope and x.get('active') is not False for x in old_rows)
        if previous_count and len(rows) < previous_count * .9 and scope not in approved_shrink_scopes:
            source.update(status='review_required', error='More than 10 percent fewer active records; previous data retained')
            continue
        try:
            with providers.batch_writer(overwrite_by_pkeys=['ext_id']) as writer:
                for row in rows:
                    writer.put_item(Item=clean(row))
            written += len(rows)
            current = {row['ext_id'] for row in rows}
            for old in old_rows:
                if old.get('source_scope') == scope and old['ext_id'] not in current:
                    providers.update_item(Key={'ext_id': old['ext_id']},
                        UpdateExpression='SET #active = :off', ExpressionAttributeNames={'#active': 'active'},
                        ExpressionAttributeValues={':off': False}, ConditionExpression='attribute_exists(ext_id)')
        except Exception:
            source.update(status='publish_failed', error='Register write or retirement failed')
    complete = all(x['status'] == 'ok' for x in result['sources'])
    if review_table is not None:
        review_table.put_item(Item={'id': 'sources#current', 'sources': [clean(x) for x in result['sources']],
                                    'checked_at': result['captured_at'], 'complete': complete})
    return {'written': written, 'complete': complete, 'sources': result['sources']}
