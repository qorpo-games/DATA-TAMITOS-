"""Pagination regression tests; no AWS credentials, requests or production writes."""
import base64
import importlib.util
import json
import os
import pathlib
import sys
import types
import unittest
from unittest.mock import Mock, patch

class DataReadTests(unittest.TestCase):
    def setUp(self):
        boto = types.ModuleType('boto3'); boto.resource = Mock()
        spec = importlib.util.spec_from_file_location('read_test', pathlib.Path(__file__).parents[1] / 'backend/data_read_lambda.py')
        self.api = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'boto3': boto}), patch.dict(os.environ, {'ARTICLES_TABLE': 'a', 'PROVIDERS_TABLE': 'p', 'STUDIES_TABLE': 's'}):
            spec.loader.exec_module(self.api)
        self.table = self.api.ddb.Table.return_value

    def call(self, query=None, name='studies', method='GET'):
        result = self.api.handler({'rawPath': '/'+name, 'queryStringParameters': query,
                                   'requestContext': {'http': {'method': method}}}, None)
        return result['statusCode'], json.loads(result['body'])

    def test_cursor_follows_actual_database_page(self):
        self.table.scan.return_value = {'Items': [{'nct_id': 'NCT00000001'}], 'LastEvaluatedKey': {'nct_id': 'NCT00000001'}}
        code, page = self.call({'limit': '1'})
        self.assertEqual(code, 200); self.assertEqual(page['coverage'], 'page')
        self.assertIsNone(page['total_matching'])
        cursor = page['next_cursor']
        self.table.scan.return_value = {'Items': [{'nct_id': 'NCT00000002'}]}
        _, page = self.call({'cursor': cursor, 'limit': '1'})
        self.table.scan.assert_called_with(Limit=1, ExclusiveStartKey={'nct_id': 'NCT00000001'})
        self.assertEqual(page['coverage'], 'end_of_scan'); self.assertIsNone(page['next_cursor'])
        self.assertEqual(page['upstream_coverage'], 'not_verified')

    def test_empty_one_megabyte_page_can_still_continue(self):
        self.table.scan.return_value = {'Items': [], 'LastEvaluatedKey': {'nct_id': 'NCT00000001'}}
        _, page = self.call(); self.assertTrue(page['next_cursor']); self.assertEqual(page['returned_count'], 0)

    def test_reject_invalid_limits_and_cross_collection_cursors(self):
        for limit in ['0', '-1', '501', 'abc']:
            self.assertEqual(self.call({'limit': limit})[0], 400)
        cursor = base64.urlsafe_b64encode(json.dumps({'collection': 'providers', 'key': {'ext_id': 'cvti:2'}}).encode()).decode()
        for value in [cursor, 'not-base64', 'a'*2049]:
            self.assertEqual(self.call({'cursor': value})[0], 400)
        self.table.scan.assert_not_called()

    def test_unknown_collection_and_methods(self):
        self.assertEqual(self.call(name='secrets')[0], 404)
        self.assertEqual(self.call(method='POST')[0], 405)
        self.assertEqual(self.call(method='OPTIONS')[0], 204)

    def test_provider_filters_are_bound_and_cursor_scoped(self):
        self.table.scan.return_value={'Items':[], 'LastEvaluatedKey':{'ext_id':'issos:1'}}
        code,page=self.call({'q':'Žilina','category':'social_services'},name='providers')
        self.assertEqual(code,200)
        self.assertEqual(self.table.scan.call_args.kwargs['ExpressionAttributeValues'][':q'],'zilina')
        self.assertEqual(self.call({'cursor':page['next_cursor'],'q':'Bratislava','category':'social_services'},name='providers')[0],400)

    def test_provider_private_fields_and_inactive_rows_never_public(self):
        self.table.scan.return_value={'Items':[{'ext_id':'issos:1','name':'Public','search_text':'private index','internal_note':'private note'}, {'ext_id':'issos:2','active':False}]}
        _,page=self.call(name='providers')
        self.assertEqual(page['items'],[{'ext_id':'issos:1','name':'Public'}])

if __name__ == '__main__': unittest.main()
