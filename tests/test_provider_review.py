import base64
import copy
import datetime as dt
import hashlib
import importlib.util
import json
import os
import pathlib
import sys
import time
import types
import unittest
from unittest.mock import Mock, patch

class Conflict(Exception):
    response={'Error':{'Code':'ConditionalCheckFailedException'}}

class Table:
    def __init__(self):self.rows={}
    def get_item(self,Key,**kwargs):return {'Item':copy.deepcopy(self.rows.get(next(iter(Key.values()))))}
    def put_item(self,Item,**kwargs):
        if kwargs.get('ConditionExpression')=='attribute_not_exists(id)' and Item['id'] in self.rows:raise Conflict()
        self.rows[Item['id']]=copy.deepcopy(Item)
    def update_item(self,Key,ExpressionAttributeValues,**kwargs):
        row=self.rows[Key['id']];v=ExpressionAttributeValues
        if row['state']!=v[':issued'] or row['expires_at']<=v[':now']:raise Conflict()
        row.update(state=v[':pending'],confirmed_fields=v[':fields'],submitted_at=v[':at'])
    def scan(self,**kwargs):return {'Items':copy.deepcopy(list(self.rows.values()))}

class ReviewTests(unittest.TestCase):
    def setUp(self):
        boto=types.ModuleType('boto3');boto.resource=Mock();boto.client=Mock(return_value=boto.resource.return_value.meta.client)
        spec=importlib.util.spec_from_file_location('provider_review_test',pathlib.Path(__file__).parents[1]/'backend/provider_review.py')
        self.api=importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules,{'boto3':boto}):spec.loader.exec_module(self.api)
        self.provider={'ext_id':'issos:123','name':'Test','address':'Ulica 1','city':'Mesto','active':True,'source_url':'https://example.org/source'}
        self.providers=Table();self.providers.rows['issos:123']=self.provider
        self.reviews=Table();self.api.ddb.Table.side_effect=lambda name:self.providers if name=='providers' else self.reviews
        self.api.ddb.meta.client.transact_write_items.side_effect=self.transaction
        self.env=patch.dict(os.environ,{'PROVIDER_REVIEW_TABLE':'reviews','PROVIDERS_TABLE':'providers','ADMIN_TOKEN':'test-only-admin'});self.env.start();self.addCleanup(self.env.stop)
    def transaction(self,TransactItems):
        update=TransactItems[0]['Update'];rid=update['Key']['id']['S'];row=self.reviews.rows[rid]
        if row['state']!='pending':raise Conflict()
        self.reviews.rows[rid]['state']=update['ExpressionAttributeValues'][':done']['S']
        if len(TransactItems)>1:
            values=TransactItems[1]['Put']['Item'];normal={k:({f:v['S'] for f,v in x['M'].items()} if 'M' in x else x['S']) for k,x in values.items()}
            self.reviews.rows[normal['id']]=normal
    def call(self,path='/provider-review',method='POST',body=None,authed=True):
        result=self.api.handler({'rawPath':path,'requestContext':{'http':{'method':method}},'headers':{'X-Admin-Token':'test-only-admin'} if authed else {},'body':json.dumps(body or {})},None)
        return result['statusCode'],json.loads(result['body'])
    def issue(self):
        code,data=self.call(body={'action':'issue','ext_id':'issos:123','identity_method':'published_contact_callback','evidence_reference':'internal-ticket-1'})
        self.assertEqual(code,201);return data['token']
    def submit(self,token):return self.call(path='/provider-confirmation',authed=False,body={'action':'confirm','token':token,'fields':{'city':'Mesto'},'attestation':True})
    def test_admin_auth_and_identity_evidence_required(self):
        self.assertEqual(self.call(authed=False)[0],401)
        self.assertEqual(self.call(body={'action':'issue','ext_id':'issos:123'})[0],400)
        self.assertFalse(self.reviews.rows)

    def test_untrusted_unicode_admin_header_fails_closed_and_is_not_cached(self):
        response = self.api.handler({'rawPath': '/provider-review', 'headers': {'x-admin-token': 'neplatný'},
            'requestContext': {'http': {'method': 'GET'}}}, None)
        self.assertEqual(response['statusCode'], 401)
        self.assertEqual(response['headers']['Cache-Control'], 'no-store')
        self.assertEqual(response['headers']['X-Content-Type-Options'], 'nosniff')
        self.assertFalse(self.reviews.rows)
    def test_token_not_stored_in_cleartext_and_preview_has_no_private_fields(self):
        token=self.issue();self.assertNotIn(token,json.dumps(self.reviews.rows))
        code,data=self.call('/provider-confirmation',body={'action':'preview','token':token},authed=False)
        self.assertEqual(code,200);self.assertNotIn('identity_method',data);self.assertNotIn('evidence_reference',data)
    def test_one_use_confirmation_and_pending_review(self):
        token=self.issue();self.assertEqual(self.submit(token)[0],202);self.assertEqual(self.submit(token)[0],410)
        self.assertNotIn('confirmed#issos:123',self.reviews.rows)
    def test_expired_token_cannot_submit(self):
        token=self.issue();next(iter(self.reviews.rows.values()))['expires_at']=int(time.time())-1
        self.assertEqual(self.submit(token)[0],410)
    def test_unsafe_and_unattested_edits_rejected(self):
        token=self.issue()
        for fields,attestation in [({'website':'javascript:alert(1)'},True),({'adminEmail':'private'},True),({'name':''},True),({'city':'Town'},False)]:
            code,_=self.call('/provider-confirmation',body={'action':'confirm','token':token,'fields':fields,'attestation':attestation},authed=False)
            self.assertEqual(code,400)
    def test_source_change_requires_new_confirmation(self):
        token=self.issue();self.provider['address']='New address';self.assertEqual(self.submit(token)[0],409)
    def test_approval_is_transactional_and_due_in_90_days(self):
        token=self.issue();self.submit(token);rid='challenge#'+hashlib.sha256(token.encode()).hexdigest()
        code,_=self.call(body={'action':'approve','id':rid});self.assertEqual(code,200)
        self.assertEqual(len(self.api.ddb.meta.client.transact_write_items.call_args.kwargs['TransactItems']),2)
        summary=self.reviews.rows['confirmed#issos:123'];delta=dt.datetime.fromisoformat(summary['review_due_at'])-dt.datetime.fromisoformat(summary['confirmed_at'])
        self.assertEqual(delta.days,90);self.assertEqual(self.call(body={'action':'approve','id':rid})[0],409)
        public=self.api.public_confirmation(self.provider,summary);self.assertEqual(public['confirmation_status'],'provider_confirmed')
        self.assertEqual(public['provider_confirmed_fields'],['city'])
        self.assertNotIn('evidence_reference',public);self.assertNotIn('identity_method',public)
        self.assertEqual(self.api.public_confirmation(self.provider,summary,summary['review_due_at'])['confirmation_status'],'due')
    def test_reimport_does_not_renew_confirmation(self):
        token=self.issue();self.submit(token);rid='challenge#'+hashlib.sha256(token.encode()).hexdigest();self.call(body={'action':'approve','id':rid})
        summary=self.reviews.rows['confirmed#issos:123'];self.provider['fetched_at']='2099-01-01';self.provider['source_sha256']='changed-file-hash'
        public=self.api.public_confirmation(self.provider,summary);self.assertEqual(public['provider_confirmed_at'],summary['confirmed_at'])
        self.provider['city']='Changed';self.assertEqual(self.api.public_confirmation(self.provider,summary)['confirmation_status'],'source_changed')
    def test_pending_confirmation_not_public(self):
        self.assertEqual(self.api.public_confirmation(self.provider,{'state':'pending','confirmed_fields':{'name':'unreviewed'}}),self.provider)

if __name__=='__main__':unittest.main()
