"""Moderated parent comments, stdlib mocks only, no real AWS/parent writes."""
import json
import time
import unittest
from unittest.mock import Mock
from test_manual_replies import load_module

class ParentCommentsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.api = load_module('community_lambda.py')

    def setUp(self):
        self.db = Mock(); self.api.POSTS = self.db
        self.api.verify_cognito_jwt = Mock(return_value=None)
        self.api._verify_turnstile = Mock(return_value=True)
        self.api._rate_ok = Mock(return_value=(True, ''))
        self.parent = {'id':'0123456789abcdef','status':'approved','nick':'Parent','category':'tip','text':'Root question text','created_iso':'2026-10-13T00:00:00Z'}
        self.child = {**self.parent,'id':'1111111111111111','parent_id':self.parent['id'],'text':'Current public comment','created_iso':'2026-10-13T01:00:00Z','sub':'private','email':'private','flag':'private','childAge':'private','ai_reply':'private'}
        self.db.query.return_value = {'Items': []}
        self.db.get_item.return_value = {'Item':self.parent}

    def event(self, body):
        return {'body':json.dumps(body),'headers':{},'requestContext':{'http':{'method':'POST','sourceIp':'192.0.2.1'}},'rawPath':'/community'}

    def payload(self, **kw):
        return {'nick':'Rodič','text':'Zdieľam svoju osobnú skúsenosť.','loadedAt':(time.time()-10)*1000,'parent_id':self.parent['id'],**kw}

    def test_child_is_pending_and_parent_association_server_validated(self):
        result=self.api.submit(self.event(self.payload(status='approved',verified=True,sub='spoof')))
        self.assertEqual(result['statusCode'],201)
        item=self.db.put_item.call_args.kwargs['Item']
        self.assertEqual(item['status'],'pending');self.assertEqual(item['parent_id'],self.parent['id'])
        self.assertIs(item['verified'],False);self.assertEqual(item['sub'],'')
        self.assertEqual(len(item['id']),16)
        self.assertEqual(self.db.get_item.call_count,2)

    def test_root_submission_preserves_existing_contract(self):
        p=self.payload();p.pop('parent_id');self.assertEqual(self.api.submit(self.event(p))['statusCode'],201)
        self.assertNotIn('parent_id',self.db.put_item.call_args.kwargs['Item'])
        self.db.get_item.assert_not_called()

    def test_non_object_payloads_are_400_before_database_or_antispam(self):
        for p in (None,[],['x'],'string',123,False):
            self.assertEqual(self.api.submit(self.event(p))['statusCode'],400)
        self.db.put_item.assert_not_called();self.db.get_item.assert_not_called();self.api._rate_ok.assert_not_called()

    def test_non_string_fields_are_400(self):
        for field in ('website','text','nick','category','childAge','topic','captcha'):
            for bad in ([],{},123,False):
                self.assertEqual(self.api.submit(self.event(self.payload(**{field:bad})))['statusCode'],400)
        self.db.put_item.assert_not_called();self.db.get_item.assert_not_called()

    def test_invalid_parent_ids_never_read_or_write(self):
        for p in (None,'','../admin','ABCDEF0123456789','a'*17,[],123):
            self.assertEqual(self.api.submit(self.event(self.payload(parent_id=p)))['statusCode'],400)
        self.db.get_item.assert_not_called();self.db.put_item.assert_not_called()

    def test_missing_private_deleted_and_child_parent_are_identical_404(self):
        results=[]
        for row in (None,{**self.parent,'status':'pending'},{**self.parent,'status':'deleted'},self.child):
            self.db.get_item.return_value={} if row is None else {'Item':row}
            results.append(self.api.submit(self.event(self.payload())))
        self.assertTrue(all(r['statusCode']==404 for r in results));self.assertTrue(all(r==results[0] for r in results))
        self.db.put_item.assert_not_called()

    def test_parent_revoked_during_submission_blocks_write(self):
        self.db.get_item.side_effect=[{'Item':self.parent},{'Item':{**self.parent,'status':'rejected'}}]
        self.assertEqual(self.api.submit(self.event(self.payload()))['statusCode'],404)
        self.db.put_item.assert_not_called()

    def test_existing_honeypot_time_and_captcha_guards_apply_to_comments(self):
        self.assertEqual(self.api.submit(self.event(self.payload(website='bot')))['statusCode'],200)
        self.assertEqual(self.api.submit(self.event(self.payload(loadedAt=time.time()*1000)))['statusCode'],429)
        self.api._verify_turnstile.return_value=False
        self.assertEqual(self.api.submit(self.event(self.payload()))['statusCode'],403)
        self.db.put_item.assert_not_called()

    def test_non_finite_time_is_invalid(self):
        for value in ('nan','inf','-inf'):
            self.assertEqual(self.api.submit(self.event(self.payload(loadedAt=value)))['statusCode'],400)
        self.db.put_item.assert_not_called()

    def test_rate_limit_is_shared_with_posts(self):
        self.api._rate_ok.return_value=(False,'limit')
        self.assertEqual(self.api.submit(self.event(self.payload()))['statusCode'],429)
        self.api._rate_ok.assert_called_once_with('192.0.2.1',daily_cap=5);self.db.put_item.assert_not_called()

    def test_authenticated_captcha_exemption_and_existing_cap_unchanged(self):
        self.api.verify_cognito_jwt.return_value={'nick':'Verified','sub':'account'}
        self.assertEqual(self.api.submit(self.event(self.payload()))['statusCode'],201)
        self.api._verify_turnstile.assert_not_called();self.api._rate_ok.assert_called_once_with('192.0.2.1',daily_cap=30)

    def test_danger_is_flagged_not_public(self):
        self.assertEqual(self.api.submit(self.event(self.payload(text='Odporúčam cure autism a zázračnú liečbu.')))['statusCode'],201)
        self.assertEqual(self.db.put_item.call_args.kwargs['Item']['status'],'flagged')

    def test_banned_and_invalid_length_never_write(self):
        for text in ('short','x'*1201,'Visit casino for useful tips now'):
            self.assertIn(self.api.submit(self.event(self.payload(text=text)))['statusCode'],(400,422))
        self.db.put_item.assert_not_called()

    def test_approved_children_current_content_minimal_allowlist(self):
        self.db.query.return_value={'Items':[self.child]}
        self.db.get_item.side_effect=[{'Item':self.parent},{'Item':self.child},{'Item':self.parent}]
        result=self.api.get_approved(self.parent['id']);body=json.loads(result['body'])
        self.assertEqual(result['statusCode'],200);self.assertEqual(body['comments'][0]['text'],'Current public comment')
        self.assertEqual(set(body['comments'][0]),{'id','nick','text','created','verified'})
        self.assertFalse(body['comments_truncated'])
        q=self.db.query.call_args.kwargs
        self.assertEqual(q['IndexName'],'parent-created-index');self.assertEqual(q['Limit'],100);self.assertFalse(q['ScanIndexForward'])
        self.assertTrue(all(c.kwargs['ConsistentRead'] for c in self.db.get_item.call_args_list))

    def test_stale_index_wrong_parent_and_private_children_are_hidden(self):
        candidates=[{**self.child,'id':str(i)*16} for i in range(1,5)]
        self.db.query.return_value={'Items':candidates}
        rows=[{**candidates[0],'status':'pending'},{**candidates[1],'parent_id':'2222222222222222'},None,{**candidates[3],'status':'deleted'}]
        self.db.get_item.side_effect=[{'Item':self.parent}]+[{} if x is None else {'Item':x} for x in rows]+[{'Item':self.parent}]
        self.assertEqual(json.loads(self.api.get_approved(self.parent['id'])['body'])['comments'],[])

    def test_root_revocation_after_child_reads_hides_whole_thread(self):
        self.db.query.return_value={'Items':[self.child]}
        self.db.get_item.side_effect=[{'Item':self.parent},{'Item':self.child},{'Item':{**self.parent,'status':'deleted'}}]
        result=self.api.get_approved(self.parent['id'])
        self.assertEqual(result['statusCode'],404);self.assertNotIn('comments',json.loads(result['body']))

    def test_direct_child_detail_hidden_even_if_approved(self):
        self.db.get_item.return_value={'Item':self.child}
        self.assertEqual(self.api.get_approved(self.child['id'])['statusCode'],404);self.db.query.assert_not_called()

    def test_root_list_excludes_children_after_consistent_read(self):
        self.db.query.return_value={'Items':[self.parent,self.child]}
        self.db.get_item.side_effect=[{'Item':self.parent},{'Item':self.child}]
        body=json.loads(self.api.list_approved({})['body'])
        self.assertEqual([x['id'] for x in body['items']],[self.parent['id']])

    def test_truncation_is_explicit_without_private_pagination_keys(self):
        self.db.query.return_value={'Items':[],'LastEvaluatedKey':{'id':'private-index-key'}}
        body=json.loads(self.api.get_approved(self.parent['id'])['body'])
        self.assertTrue(body['comments_truncated']);self.assertNotIn('LastEvaluatedKey',body)

if __name__=='__main__':unittest.main()
