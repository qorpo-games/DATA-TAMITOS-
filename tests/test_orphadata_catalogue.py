import copy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / 'data-pipeline'))
import orphadata_catalogue as c


def fixture(lang='en', code='72', group='36547', date='2026-06-23 07:53:50'):
    return {'JDBOR': [{'date': date, 'version': 'test',
        'Availability': [{'Licence': [{'ShortIdentifier': 'CC-BY-4.0'}]}],
        'DisorderList': [{'count': '1', 'Disorder': [{
            'OrphaCode': code, 'Name': [{'lang': lang, 'label': 'Angelman syndrome'}],
            'DisorderGroup': [{'id': group}],
            'ExternalReferenceList': [{'ExternalReference': [{
                'Source':'ICD-10', 'Reference':'Q93.5',
                'DisorderMappingRelation':[{'Name':[{'lang':'en','label':'NTBT (narrower)'}]}],
                'DisorderMappingValidationStatus':[{'Name':[{'lang':'en','label':'Validated'}]}]},
                {'Source':'MedDRA','Reference':'restricted-example'}]}]
        }]}]}]}


def raw(obj):
    return json.dumps(obj).encode()


class CatalogueTests(unittest.TestCase):
    def test_orpha_identity_not_external_equivalence(self):
        records, sources = c.build(raw(fixture()), raw(fixture('cs')))
        record = records[0]
        self.assertEqual(record['id'], 'ORPHA:72')
        self.assertEqual(record['level'], 'disorder')
        self.assertEqual(record['mappings'][0]['relation'], 'NTBT (narrower)')
        self.assertEqual(len(record['mappings']), 1)
        self.assertIsNone(record['editorial']['reviewed_at'])
        self.assertEqual(record['editorial']['status'], 'missing')
        self.assertEqual(sources[0]['source_date'], '2026-06-23')

    def test_missing_czech_translation_is_not_mislabeled(self):
        records, _ = c.build(raw(fixture()), raw(fixture('en')))
        self.assertEqual(records[0]['names']['cs'], '')

    def test_inactive_non_rare_and_replacement_are_preserved(self):
        obj = fixture(); row = obj['JDBOR'][0]['DisorderList'][0]['Disorder'][0]
        row['DisorderFlagList'] = [{'DisorderFlag':[
            {'id':'495','Label':'Inactive'},{'id':'456','Label':'Non-rare disease in Europe'}]}]
        row['DisorderDisorderAssociationList'] = [{'DisorderDisorderAssociation': [{
            'TargetDisorder':[{'OrphaCode':'73'}],
            'DisorderDisorderAssociationType':[{'Name':[{'lang':'en','label':'Moved to'}]}]}]}]
        rows, _ = c.build(raw(obj),raw(fixture('cs')))
        self.assertEqual(rows[0]['lifecycle'],'inactive')
        self.assertTrue(rows[0]['non_rare_in_europe'])
        self.assertEqual(rows[0]['associations'],[{'target':'ORPHA:73','relation':'Moved to'}])

    def test_count_duplicate_license_and_schema_rejected(self):
        for change in ('count','duplicate','licence','group'):
            obj = fixture(); root = obj['JDBOR'][0]
            if change == 'count': root['DisorderList'][0]['count'] = '2'
            if change == 'duplicate':
                root['DisorderList'][0]['Disorder'] *= 2
                root['DisorderList'][0]['count'] = '2'
            if change == 'licence': root['Availability'] = []
            if change == 'group': root['DisorderList'][0]['Disorder'][0]['DisorderGroup'][0]['id']='new'
            with self.subTest(change=change), self.assertRaises(ValueError):
                c.build(raw(obj), raw(fixture('cs')))

    def test_language_releases_and_id_sets_must_match(self):
        for cs in (fixture('cs', date='2025-06-23 07:53:50'), fixture('cs', code='73')):
            with self.assertRaises(ValueError): c.build(raw(fixture()), raw(cs))

    def test_draft_cannot_claim_review_and_stale_review_marked(self):
        entry = {'status':'reviewed','name_sk':'Angelmanov syndróm'}
        with self.assertRaises(ValueError): c.build(raw(fixture()),raw(fixture('cs')),{'72':entry})
        entry.update(reviewed_by='reviewer-id',reviewed_at='2026-06-23',
                     source_date_reviewed='2025-06-23',source_sha256_reviewed='0'*64,
                     sources=['https://example.org/source'], explanation_sk='Reviewed text')
        records, _ = c.build(raw(fixture()),raw(fixture('cs')),{'72':entry})
        self.assertEqual(records[0]['editorial']['status'], 'needs_recheck')

    def test_approval_binds_exact_bytes_not_just_a_date(self):
        entry = {'status':'reviewed','name_sk':'Reviewed name','explanation_sk':'Reviewed text',
                 'reviewed_by':'reviewer-id','reviewed_at':'2026-06-23',
                 'source_date_reviewed':'2026-06-23',
                 'source_sha256_reviewed':hashlib.sha256(raw(fixture())).hexdigest(),
                 'sources':['https://example.org/source']}
        rows, _ = c.build(raw(fixture()),raw(fixture('cs')),{'72':entry})
        self.assertEqual(rows[0]['editorial']['status'],'reviewed')
        changed = fixture(); changed['JDBOR'][0]['DisorderList'][0]['Disorder'][0]['Name'][0]['label']='Updated name'
        rows, _ = c.build(raw(changed),raw(fixture('cs')),{'72':entry})
        self.assertEqual(rows[0]['editorial']['status'],'needs_recheck')

    def test_candidate_is_never_an_approved_slovak_translation(self):
        records, _ = c.build(raw(fixture()),raw(fixture('cs')))
        queue = c.candidate_matches([{'name_sk':'Angelman syndrome'}],records)
        self.assertEqual(queue[0]['candidate_orpha_ids'], ['ORPHA:72'])
        self.assertEqual(queue[0]['status'], 'requires_review')
        self.assertEqual(records[0]['editorial']['name_sk'], '')

    def test_immutable_release_changes_and_manifest_points_to_complete_files(self):
        records, sources = c.build(raw(fixture()),raw(fixture('cs')))
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)
            m = c.publish(records,sources,target)
            release = target / m['release']
            self.assertTrue((release/'index.json').is_file())
            self.assertEqual(json.loads((release/'detail-72.json').read_text('utf-8'))['72']['id'],'ORPHA:72')
            records[0]['names']['en'] = 'Changed'
            newer = c.publish(records,sources,target)
            self.assertNotEqual(newer['release'],m['release'])
            self.assertTrue(release.exists())


if __name__ == '__main__': unittest.main()
