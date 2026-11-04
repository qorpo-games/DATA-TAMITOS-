import importlib.util
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).parents[1]
sys.path.insert(0, str(ROOT / 'data-pipeline'))
import directory_extensions as e


def rows():
    header = ['rok', 'eduid', 'kodsko', 'kraj', 'okres', 'nazov', 'ulica', 'miesto', 'psc', 'adrwww', 'postih']
    row = ['2025', '100000001', '000123456', '1', '101', 'Test škola', 'Test 1', 'Bratislava', '81101', 'https://example.org', 'so sluchovým postihnutím']
    return [['Počty detí k 15. 9. 2025'], header, row]


class ExtensionTests(unittest.TestCase):
    def test_observation_and_region_are_not_import_date_or_availability(self):
        item = e.parse_school_rows(rows(), 'ms', b'xls')[0]
        self.assertEqual(item['ext_id'], 'cvti-ms:100000001')
        self.assertEqual(item['region'], 'Bratislavský kraj')
        self.assertEqual(item['source_observed_at'], '2025-09-15')
        self.assertEqual(item['category'], 'kindergarten')
        self.assertNotIn('registered_capacity', item)
        self.assertNotIn('reported_vacancies', item)
        self.assertFalse(item['autism_specific'])
        self.assertIn('2025-09-15', item['availability_note'])

    def test_special_rows_merge_targets_without_double_counting_school(self):
        data = rows(); second = list(data[-1]); second[-1] = 's autizmom'; data.append(second)
        result = e.parse_school_rows(data, 'specms', b'xls')
        self.assertEqual(len(result), 1)
        self.assertTrue(result[0]['autism_specific'])
        self.assertIn('sluchovým', result[0]['target_group'])
        self.assertIn('autizmom', result[0]['target_group'])

    def test_conflicting_identity_and_unknown_schema_fail(self):
        data = rows(); second = list(data[-1]); second[6] = 'Different 2'; data.append(second)
        with self.assertRaises(ValueError): e.parse_school_rows(data, 'specms', b'xls')
        data = rows(); data[1][0] = 'year'
        with self.assertRaises(ValueError): e.parse_school_rows(data, 'ms', b'xls')
        data = rows(); data[-1][3] = '9'
        with self.assertRaises(ValueError): e.parse_school_rows(data, 'ms', b'xls')

    def test_year_mismatch_fails_instead_of_labeling_new_year_old_date(self):
        data = rows(); data[-1][0] = '2026'
        with self.assertRaises(ValueError): e.parse_school_rows(data, 'ms', b'xls')

    def test_school_identity_not_shared_between_education_stages(self):
        a = e.parse_school_rows(rows(), 'ms', b'xls')[0]
        b = e.parse_school_rows(rows(), 'zs', b'xls')[0]
        self.assertNotEqual(a['ext_id'], b['ext_id'])
        self.assertEqual(a['source_record_id'], b['source_record_id'])

    def test_dental_excludes_canceled_and_non_dental_matches(self):
        def row(code, specialty, canceled=''):
            return f'<tr class="{canceled}"><td></td><td><a href="?page_id=123">Test</a><span class="specializacny_odbor">{specialty}</span>66-12345678-A{code}</td><td>Test 1, 81101 Bratislava</td></tr>'
        html = '<input name="search_kraj"><table>' + row('0001', 'zubné lekárstvo') + row('0002', 'stomatológia', 'canceled-row') + row('0003', 'fyzioterapia') + '</table>'
        result = e.base.parse_health(html.encode(), 'https://www.e-vuc.sk/bsk/?page_id=1', 'bsk', 'dental')
        self.assertEqual([x['ext_id'] for x in result], ['evuc-dental:66-12345678-A0001'])
        self.assertEqual(result[0]['source_scope'], 'evuc-dental-bsk')
        self.assertFalse(result[0]['autism_specific'])
        with self.assertRaises(ValueError): e.base.parse_health(b'<html>error</html>', 'https://www.e-vuc.sk/', 'bsk', 'dental', True)

    def test_one_facility_can_offer_dental_and_rehabilitation_without_overwrite(self):
        html = b'<input name="search_kraj"><table><tr><td></td><td><a href="?page_id=123">Test</a><span class="specializacny_odbor">stomatologia; rehabilitacia</span>66-12345678-A0001</td><td>Test 1, 81101 Bratislava</td></tr></table>'
        url = 'https://www.e-vuc.sk/bsk/?page_id=1'
        dental = e.base.parse_health(html, url, 'bsk', 'dental')[0]
        rehabilitation = e.base.parse_rehabilitation(html, url, 'bsk')[0]
        self.assertNotEqual(dental['ext_id'], rehabilitation['ext_id'])
        self.assertNotEqual(dental['service_id'], rehabilitation['service_id'])
        self.assertEqual(dental['branch_id'], rehabilitation['branch_id'])

    def test_failed_dental_second_query_never_publishes_partial_first_query(self):
        from unittest.mock import patch
        def fetch(url):
            if url == e.base.HEALTH_HOME: return b'index'
            if 'search_kraj=stomat' in url: raise OSError('source down')
            return b'result'
        with patch.object(e, 'parse_school', return_value=[{'source_observed_at': '2025-09-15'}]), \
             patch.object(e.base, 'discover_health_regions', return_value={'bsk': 'https://www.e-vuc.sk/?page_id=1'}), \
             patch.object(e.base, 'parse_health', return_value=[{'ext_id': 'evuc:test'}]):
            result = e.collect(fetch)
        self.assertFalse(result['complete'])
        self.assertEqual(result['sources'][-1]['status'], 'failed')
        self.assertNotIn('evuc:test', [x.get('ext_id') for x in result['items']])


if __name__ == '__main__': unittest.main()
