import csv
import datetime as dt
import importlib.util
import io
import pathlib
import unittest
from unittest.mock import MagicMock as Mock

ROOT = pathlib.Path(__file__).parents[1]
def module(name, path):
    spec=importlib.util.spec_from_file_location(name, ROOT/path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
r=module('registers','data-pipeline/public_registers.py')
publication=module('publication','backend/register_publication.py')

def csv_payload(rows):
    stream=io.StringIO();w=csv.writer(stream,delimiter=';');w.writerow(['Poskytovateľ']);w.writerow(r.SOCIAL_HEADERS);w.writerows(rows);return stream.getvalue().encode('utf-8-sig')
def social(sid='123'):
    row=['']*28;row[0]='Test centrum';row[1]='12345678';row[9]=sid;row[10]='sociálna rehabilitácia';row[11]='ambulantná';row[12]='Žilinský kraj';row[14]='Žilina';row[15]='Test 1';row[22]='20';row[23]='0';row[24]='';return row
def health_row(canceled=False):
    return '<tr'+(' class="canceled-row" style="display:none"' if canceled else '')+'><td class="hide_for_mobile"></td><td><a href="https://www.e-vuc.sk/bbsk/test.html?page_id='+('2' if canceled else '1')+'">Test reha</a><span class="specializacny_odbor">Fyziatria, balneológia a liečebná rehabilitácia</span><span>66-12345678-A000'+('2' if canceled else '1')+'</span></td><td>Test 1, 01001 Žilina</td></tr>'
def health_html():return ('<input name="search_kraj"><table>'+health_row()+health_row(True)+'</table>').encode()

class RegisterTests(unittest.TestCase):
    def test_national_csv_identity_null_and_zero(self):
        row=social();row[5]='Unneeded statutory name';row[19]='Unneeded responsible name'
        parsed=r.parse_social_csv(csv_payload([row]),updated='2026-11-01 23:30')[0]
        self.assertEqual(parsed['ext_id'],'issos:123');self.assertEqual(parsed['reported_vacancies'],0)
        self.assertIsNone(parsed['reported_waiting']);self.assertFalse(parsed['autism_specific'])
        self.assertNotIn('Unneeded',str(parsed));self.assertIn('zilina',parsed['search_text'])
        self.assertEqual(len(parsed['source_sha256']),64)
    def test_reordering_does_not_change_ids(self):
        a,b=social('1'),social('2')
        first=r.parse_social_csv(csv_payload([a,b]));second=r.parse_social_csv(csv_payload([b,a]))
        self.assertEqual({x['ext_id'] for x in first},{x['ext_id'] for x in second})
    def test_terminated_and_future_services_excluded(self):
        a,b,c=social('1'),social('2'),social('3');a[26]='01.01.2020';b[25]='01.01.2030'
        rows=r.parse_social_csv(csv_payload([a,b,c]),today=dt.date(2026,11,2));self.assertEqual([x['ext_id'] for x in rows],['issos:3'])
    def test_malformed_and_duplicate_exports_fail_closed(self):
        for payload in [b'<html>error</html>',csv_payload([social(),social()]),csv_payload([])]:
            with self.assertRaises(ValueError):r.parse_social_csv(payload)
        broken=social();broken[23]='not a count'
        with self.assertRaises(ValueError):r.parse_social_csv(csv_payload([broken]))
    def test_health_excludes_hidden_cancelled_facilities(self):
        rows=r.parse_rehabilitation(health_html(),'https://www.e-vuc.sk/','bbsk')
        self.assertEqual(len(rows),1);self.assertEqual(rows[0]['ext_id'],'evuc:66-12345678-A0001')
        self.assertEqual(rows[0]['city'],'Žilina');self.assertFalse(rows[0]['autism_specific'])
    def test_changed_health_layout_and_pagination_fail_closed(self):
        for payload in [b'error',health_html()+b'<a rel="next" href="next">next</a>']:
            with self.assertRaises(ValueError):r.parse_rehabilitation(payload,'https://www.e-vuc.sk/','bbsk')
    def test_all_eight_health_regions_required(self):
        html=''.join('<a href="https://www.e-vuc.sk/'+key+'/zdravotnictvo/ambulantne-zdravotnicke-zariadenia.html?page_id=1">Ambulancie</a>' for key in r.REGIONS)
        self.assertEqual(len(r.discover_health_regions(html)),8)
        with self.assertRaises(ValueError):r.discover_health_regions(html.replace('bbsk','missing'))
    def test_failed_source_does_not_retire_last_good_rows(self):
        table=Mock();table.scan.return_value={'Items':[{'ext_id':'issos:old','source_scope':'issos'}]}
        result=publication.publish(table,None,{'items':[],'sources':[{'id':'issos','status':'failed'}],'captured_at':'2026'})
        table.batch_writer.assert_not_called();table.update_item.assert_not_called();self.assertFalse(result['complete'])
    def test_failed_write_does_not_retire_old_records(self):
        table=Mock();table.scan.return_value={'Items':[{'ext_id':'issos:old','source_scope':'issos'}]};table.batch_writer.side_effect=RuntimeError()
        result=publication.publish(table,None,{'items':[{'ext_id':'issos:new','source_scope':'issos'}],'sources':[{'id':'issos','status':'ok'}],'captured_at':'2026'})
        table.update_item.assert_not_called();self.assertFalse(result['complete'])
    def test_successful_refresh_only_retires_its_own_scope(self):
        table=Mock();table.scan.return_value={'Items':[{'ext_id':'issos:old','source_scope':'issos'},{'ext_id':'evuc:other','source_scope':'evuc-bbsk'}]}
        result=publication.publish(table,None,{'items':[{'ext_id':'issos:new','source_scope':'issos'}],'sources':[{'id':'issos','status':'ok'}],'captured_at':'2026'})
        self.assertTrue(result['complete']);self.assertEqual(table.update_item.call_count,1)
        self.assertEqual(table.update_item.call_args.kwargs['Key'],{'ext_id':'issos:old'})

    def test_unexpected_shrink_requires_operator_review_before_any_write(self):
        table=Mock();table.scan.return_value={'Items':[{'ext_id':'issos:'+str(i),'source_scope':'issos'} for i in range(10)]}
        result=publication.publish(table,None,{'items':[{'ext_id':'issos:1','source_scope':'issos'}],'sources':[{'id':'issos','status':'ok'}],'captured_at':'2026'})
        self.assertEqual(result['sources'][0]['status'],'review_required');table.batch_writer.assert_not_called();table.update_item.assert_not_called()

if __name__=='__main__':unittest.main()
