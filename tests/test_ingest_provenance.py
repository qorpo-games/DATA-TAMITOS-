import importlib.util
import io
import json
import pathlib
import sys
import unittest
from unittest.mock import patch

path=pathlib.Path(__file__).parents[1]/'data-pipeline/tamitos_ingest.py'
spec=importlib.util.spec_from_file_location('ingest',path)
ingest=importlib.util.module_from_spec(spec);spec.loader.exec_module(ingest)

class IngestTests(unittest.TestCase):
    def test_multiple_pages_and_repeated_cursor(self):
        responses=[{'studies':[{'a':1}],'nextPageToken':'next'}, {'studies':[{'a':2}]}]
        def fetch(*args,**kwargs):return io.BytesIO(json.dumps(responses.pop(0)).encode())
        with patch.object(ingest.urllib.request,'urlopen',side_effect=fetch):
            self.assertEqual(len(ingest.fetch_clinicaltrials()),2)
        with patch.object(ingest.urllib.request,'urlopen',side_effect=lambda *a,**k:io.BytesIO(b'{"studies":[],"nextPageToken":"loop"}')):
            with self.assertRaises(ValueError):ingest.fetch_clinicaltrials()

    def test_malformed_response_does_not_look_empty(self):
        with patch.object(ingest.urllib.request,'urlopen',return_value=io.BytesIO(b'{"error":"upstream unavailable"}')):
            with self.assertRaises(ValueError):ingest.fetch_clinicaltrials()

    def test_study_original_update_is_not_fetch_date(self):
        row=ingest.normalize_study({'protocolSection':{'identificationModule':{'nctId':'NCT00000001'},'statusModule':{'lastUpdatePostDateStruct':{'date':'2025-12-01'}}}})
        self.assertEqual(row['source_updated_at'],'2025-12-01')
        self.assertTrue(row['source_url'].endswith('NCT00000001'))
        with self.assertRaises(ValueError):ingest.normalize_study({'protocolSection':{}})

    def test_cvti_preserves_unknown_contact_and_source_hash(self):
        import openpyxl
        wb=openpyxl.Workbook();ws=wb.active;ws.append(['Názov','Mesto','Adresa','Webová stránka']);ws.append(['Centrum','Mesto','Ulica 1','www.example.org'])
        data=io.BytesIO();wb.save(data)
        with patch.object(ingest.urllib.request,'urlopen',return_value=io.BytesIO(data.getvalue())):
            row=ingest.load_cvti_xlsx()[0]
        self.assertEqual(row['contact'],'');self.assertEqual(len(row['source_sha256']),64)
        self.assertEqual(row['source_file_url'],ingest.CVTI_XLSX)
        self.assertEqual(row['verification_status'],'imported_not_individually_verified')
        self.assertEqual(row['website'],'https://www.example.org')

if __name__=='__main__':unittest.main()
