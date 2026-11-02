"""Index search mode of GET /providers; no AWS credentials or requests."""
import importlib.util, json, os, pathlib, sys, types, unittest
from unittest.mock import Mock, patch

ROWS = [
    {'ext_id': 'evuc:1', 'name': 'Ambulancia rehabilitácie', 'city': 'Žilina', 'region': 'Žilinský kraj', 'category': 'medical_rehabilitation', 'kind': 'Fyziatria', 'search_text': 'ambulancia rehabilitacie zilina fyziatria', 'internal_note': 'x'},
    {'ext_id': 'evuc:2', 'name': 'Rehabilitácia Martin', 'city': 'Martin', 'region': 'Žilinský kraj', 'category': 'medical_rehabilitation', 'kind': 'Fyziatria', 'search_text': 'rehabilitacia martin fyziatria'},
    {'ext_id': 'issos:3', 'name': 'Včasná intervencia Žilina', 'city': 'Žilina', 'region': 'Žilinský kraj', 'category': 'social_services', 'kind': 'služba včasnej intervencie', 'search_text': 'vcasna intervencia zilina'},
    {'ext_id': 'issos:4', 'name': 'Zrušená služba', 'city': 'Žilina', 'region': 'Žilinský kraj', 'category': 'social_services', 'kind': 'x', 'active': False, 'search_text': 'zrusena zilina'},
    {'ext_id': 'cvti:5', 'name': 'CPP Bratislava', 'city': 'Bratislava', 'region': 'Bratislavský kraj', 'category': 'counselling', 'kind': 'CPP'},
]

class IndexTests(unittest.TestCase):
    def setUp(self):
        boto = types.ModuleType('boto3'); boto.resource = Mock()
        spec = importlib.util.spec_from_file_location('index_test', pathlib.Path(__file__).parents[1] / 'backend/data_read_lambda.py')
        self.api = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'boto3': boto}), patch.dict(os.environ, {'ARTICLES_TABLE': 'a', 'PROVIDERS_TABLE': 'p', 'STUDIES_TABLE': 's'}):
            spec.loader.exec_module(self.api)
        self.scans = []
        def table():
            t = Mock()
            def scan(**args):
                self.scans.append(args)
                seg = args['Segment']
                return {'Items': [r for i, r in enumerate(ROWS) if i % args['TotalSegments'] == seg]}
            t.scan.side_effect = scan
            return t
        self.api._segment_table = table

    def call(self, query):
        r = self.api.handler({'rawPath': '/providers', 'queryStringParameters': query, 'requestContext': {'http': {'method': 'GET'}}}, None)
        return r['statusCode'], json.loads(r['body']), r['headers']

    def test_exact_totals_facets_and_accent_free_search(self):
        code, body, headers = self.call({'offset': '0', 'q': 'ZILINA'})
        self.assertEqual(code, 200)
        self.assertEqual(body['total_matching'], 2)  # canceled row excluded
        self.assertEqual(body['facets']['category'], {'medical_rehabilitation': 1, 'social_services': 1})
        self.assertIsNone(body['next_offset'])
        self.assertNotIn('internal_note', body['items'][0]); self.assertNotIn('search_text', body['items'][0]); self.assertNotIn('_s', body['items'][0])
        self.assertIn('max-age', headers['Cache-Control'])
        code, body, _ = self.call({'offset': '0', 'q': 'žilina', 'category': 'medical_rehabilitation'})
        self.assertEqual(body['total_matching'], 1)
        self.assertEqual(body['facets']['category']['social_services'], 1)  # facets ignore the chosen category

    def test_paging_and_rows_without_search_text(self):
        _, body, _ = self.call({'offset': '0', 'limit': '2'})
        self.assertEqual(body['total_matching'], 4); self.assertEqual(body['next_offset'], 2)
        _, body2, _ = self.call({'offset': '2', 'limit': '2'})
        self.assertIsNone(body2['next_offset'])
        self.assertFalse({x['ext_id'] for x in body['items']} & {x['ext_id'] for x in body2['items']})
        _, body, _ = self.call({'offset': '0', 'q': 'bratislava'})
        self.assertEqual(body['total_matching'], 1)

    def test_index_is_cached_and_bad_input_rejected(self):
        self.call({'offset': '0'}); first = len(self.scans); self.call({'offset': '0', 'q': 'x'})
        self.assertEqual(len(self.scans), first)
        self.assertEqual(self.call({'offset': '-1'})[0], 400)
        self.assertEqual(self.call({'offset': '0', 'limit': '500'})[0], 400)

    def test_failed_scan_returns_503_not_empty(self):
        def broken():
            t = Mock(); t.scan.side_effect = RuntimeError('ddb'); return t
        self.api._segment_table = broken
        code, body, _ = self.call({'offset': '0'})
        self.assertEqual(code, 503)

if __name__ == '__main__':
    unittest.main()
