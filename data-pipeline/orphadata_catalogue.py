"""Versioned Orphadata Science catalogue. No patient data or production writes.

python data-pipeline/orphadata_catalogue.py --output public/diagnoses
Use --input-dir for an offline build from en_product1.json/cs_product1.json.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tarfile
import tempfile
import unicodedata
import urllib.request
from datetime import datetime, timezone

SOURCE_PAGE = 'https://sciences.orphadata.com/alignments/'
URLS = {lang: f'https://www.orphadata.com/data/json/{lang}_product1.json.tar.gz'
        for lang in ('en', 'cs')}
LICENCE = 'CC-BY-4.0'
GROUPS = {'36540': 'group', '36547': 'disorder', '36554': 'subtype'}
MAX_DOWNLOAD = 16 * 1024 * 1024
MAX_JSON = 96 * 1024 * 1024


def children(node, container, item):
    return [v for box in node.get(container, []) for v in box.get(item, [])]


def label(values, lang='en'):
    return next((x['label'] for x in values if x.get('lang') == lang), '')


def relation_label(values):
    return label([n for value in values or [] for n in value.get('Name', [])])


def normalize(text):
    return ' '.join(re.sub(r'[^\w]+', ' ', ''.join(
        c for c in unicodedata.normalize('NFKD', text.casefold())
        if not unicodedata.combining(c))).split())


def read_source(raw, lang):
    if len(raw) > MAX_JSON:
        raise ValueError('Dataset exceeds JSON size limit')
    root = json.loads(raw)['JDBOR']
    if len(root) != 1:
        raise ValueError('Unexpected dataset envelope')
    root = root[0]
    licences = children(root, 'Availability', 'Licence')
    if not any(x.get('ShortIdentifier') == LICENCE for x in licences):
        raise ValueError('Expected CC-BY-4.0 licence is missing')
    date = datetime.strptime(root['date'], '%Y-%m-%d %H:%M:%S').date().isoformat()
    boxes = root['DisorderList']
    if len(boxes) != 1:
        raise ValueError('Unexpected disorder list')
    rows = boxes[0]['Disorder']
    if int(boxes[0]['count']) != len(rows) or not rows:
        raise ValueError('Source count mismatch or empty dataset')
    result = {}
    for row in rows:
        code = str(row['OrphaCode'])
        if not re.fullmatch(r'[1-9][0-9]*', code) or code in result:
            raise ValueError('Invalid or duplicate ORPHAcode')
        if not label(row['Name'], lang) and lang == 'en':
            raise ValueError('Missing language-specific preferred name')
        result[code] = row
    return result, {'language': lang, 'url': URLS[lang], 'source_date': date,
                    'format_version': root['version'], 'licence': LICENCE,
                    'sha256': hashlib.sha256(raw).hexdigest(), 'count': len(rows)}


def download(lang):
    req = urllib.request.Request(URLS[lang], headers={'User-Agent': 'TamitosCatalogue/1.0'})
    with urllib.request.urlopen(req, timeout=60) as response:
        if response.url != URLS[lang]:
            raise ValueError('Unexpected download redirect; review source before continuing')
        archive = response.read(MAX_DOWNLOAD + 1)
    if len(archive) > MAX_DOWNLOAD:
        raise ValueError('Download size limit exceeded')
    # Read one explicitly named member. Never extract archive paths to disk.
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        members = [m for m in tar.getmembers() if m.name == f'{lang}_product1.json' and m.isfile()]
        if len(members) != 1 or members[0].size > MAX_JSON:
            raise ValueError('Unexpected archive contents or member size')
        return tar.extractfile(members[0]).read(MAX_JSON + 1)


def definition(row, lang):
    for summary in children(row, 'SummaryInformationList', 'SummaryInformation'):
        if summary.get('lang') != lang:
            continue
        for section in children(summary, 'TextSectionList', 'TextSection'):
            if any(t.get('id') == '16907' for t in section.get('TextSectionType', [])):
                return section.get('Contents', '')
    return ''


def validate_editorial(entry, code, source_date):
    """A timestamp must never be invented by a data refresh or machine translation."""
    if entry.get('status') not in ('draft', 'reviewed'):
        raise ValueError(f'Unknown editorial status for {code}')
    if not entry.get('name_sk') or not isinstance(entry['name_sk'], str):
        raise ValueError(f'Missing Slovak name for {code}')
    if entry['status'] == 'reviewed':
        required = ('reviewed_by', 'reviewed_at', 'source_date_reviewed', 'source_sha256_reviewed', 'sources', 'explanation_sk')
        if not all(entry.get(k) for k in required):
            raise ValueError(f'Incomplete review for {code}')
        reviewed = datetime.strptime(entry['reviewed_at'], '%Y-%m-%d').date()
        reviewed_source = datetime.strptime(entry['source_date_reviewed'], '%Y-%m-%d').date()
        if reviewed < reviewed_source:
            raise ValueError('Review predates the reviewed dataset')
        if not re.fullmatch(r'[a-f0-9]{64}', entry['source_sha256_reviewed']):
            raise ValueError('Review must bind the exact English dataset SHA256')
        if reviewed > datetime.now(timezone.utc).date():
            raise ValueError('Review date is in the future')
        if entry['source_date_reviewed'] > source_date:
            raise ValueError('Review refers to a future source version')
        if not isinstance(entry['sources'], list) or not all(
                isinstance(u, str) and u.startswith('https://') for u in entry['sources']):
            raise ValueError('Review requires explicit HTTPS sources')
    return entry


def build(en_raw, cs_raw, editorial=None):
    en, em = read_source(en_raw, 'en')
    cs, cm = read_source(cs_raw, 'cs')
    if em['source_date'] != cm['source_date'] or set(en) != set(cs):
        raise ValueError('English/Czech release identities do not match')
    editorial = editorial or {}
    if set(editorial) - set(en):
        raise ValueError('Editorial data references unknown ORPHAcodes')
    records = []
    for code, source in en.items():
        group = source['DisorderGroup'][0]['id']
        if group not in GROUPS:
            raise ValueError(f'Unknown classification level {group}')
        names = {lang: label(row['Name'], lang) for lang, row in [('en',source),('cs',cs[code])]}
        synonyms = {lang: [s['label'] for s in children(row, 'SynonymList', 'Synonym')
                           if s.get('lang') == lang] for lang,row in [('en',source),('cs',cs[code])]}
        local = validate_editorial(editorial[code], code, em['source_date']) if code in editorial else None
        status = 'missing'
        if local:
            status = local['status']
            if status == 'reviewed' and (local['source_date_reviewed'] != em['source_date']
                                        or local['source_sha256_reviewed'] != em['sha256']):
                status = 'needs_recheck'
        mappings = []
        flags = [{'id': f['id'], 'label': f.get('Label','')} for f in
                 children(source, 'DisorderFlagList', 'DisorderFlag')]
        inactive = any(f['id'] in {'495','455','459','460','461'} for f in flags)
        non_rare = any(f['id'] == '456' for f in flags)
        associations = []
        for association in children(source, 'DisorderDisorderAssociationList', 'DisorderDisorderAssociation'):
            for target in association.get('TargetDisorder', []):
                if re.fullmatch(r'[1-9][0-9]*', str(target.get('OrphaCode',''))):
                    associations.append({'target': 'ORPHA:' + str(target['OrphaCode']),
                                         'relation': relation_label(association.get('DisorderDisorderAssociationType'))})
        # Export only these systems; do not silently redistribute other terminologies.
        for ref in children(source, 'ExternalReferenceList', 'ExternalReference'):
            if ref['Source'] in {'ICD-10', 'ICD-11', 'MONDO', 'GARD'}:
                mappings.append({'system': ref['Source'], 'code': ref['Reference'],
                                 'relation': relation_label(ref.get('DisorderMappingRelation')),
                                 'validation': relation_label(ref.get('DisorderMappingValidationStatus'))})
        records.append({'id': f'ORPHA:{code}', 'orphacode': code, 'level': GROUPS[group],
                        'names': names, 'synonyms': synonyms,
                        'definitions': {'en': definition(source,'en'), 'cs': definition(cs[code],'cs')},
                        'mappings': mappings,
                        'lifecycle': 'inactive' if inactive else 'active',
                        'non_rare_in_europe': non_rare, 'source_flags': flags,
                        'associations': associations,
                        'source_url': f'https://www.orpha.net/en/disease/detail/{code}',
                        'source_date': em['source_date'],
                        'editorial': {'status': status, 'name_sk': local['name_sk'] if local else '',
                                      'explanation_sk': local.get('explanation_sk','') if local else '',
                                      'reviewed_at': local.get('reviewed_at') if local else None,
                                      'sources': local.get('sources',[]) if local else []}})
    return sorted(records, key=lambda r: int(r['orphacode'])), [em, cm]


def candidate_matches(seeds, records):
    """Produce a review queue, never promote lexical candidates into translations."""
    index = {}
    for record in records:
        for name in list(record['names'].values()) + sum(record['synonyms'].values(), []):
            index.setdefault(normalize(name), set()).add(record['id'])
    result = []
    for seed in seeds:
        terms = [seed['name_sk']] + seed.get('aliases_as_published','').split(',')
        matches = sorted(set().union(*(index.get(normalize(s),set()) for s in terms if s.strip())))
        result.append({'name_sk': seed['name_sk'], 'reference_url': seed.get('url'),
                       'candidate_orpha_ids': matches, 'status': 'requires_review' if matches else 'unmatched'})
    return result


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    # Same-directory replace keeps individual files atomic. Manifest is written last.
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        tmp = f.name
    os.replace(tmp, path)


def publish(records, sources, output, editorial_digest=None):
    digest = hashlib.sha256(json.dumps([sources,records], sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:20]
    # Immutable release path ensures a browser cannot mix a new index with old detail files.
    release = output / digest
    index = []
    shards = {}
    for row in records:
        code = row['orphacode']
        shards.setdefault(str(int(code) % 100), {})[code] = row
        index.append({k: row[k] for k in ('id','orphacode','level','names','synonyms','lifecycle','non_rare_in_europe')})
        index[-1]['name_sk'] = row['editorial']['name_sk'] if row['editorial']['status']=='reviewed' else ''
    write_json(release / 'index.json', index)
    for shard, rows in shards.items():
        write_json(release / f'detail-{shard}.json', rows)
    manifest = {'schema_version': 1, 'release': digest, 'count': len(records),
                'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'editorial_sha256': editorial_digest,
                'active_count': sum(r['lifecycle']=='active' for r in records),
                'levels': {level: sum(r['level']==level for r in records) for level in GROUPS.values()},
                'sources': sources, 'source_page': SOURCE_PAGE, 'licence': LICENCE,
                'licence_url': 'https://creativecommons.org/licenses/by/4.0/',
                'attribution': 'Orphadata Science: Free access data from Orphanet. © INSERM 1999.',
                'changes': 'Normalized schema, selected mappings, English/Czech joined by ORPHAcode. Slovak editorial content is separate.',
                'ai_notice': 'If used in AI services: outputs may not reflect Orphanet/Orphadata data; Orphanet is not responsible for output quality.',
                'built_at': datetime.now(timezone.utc).isoformat()}
    write_json(output / 'manifest.json', manifest)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path)
    parser.add_argument('--output', type=Path, default=Path('public/diagnoses'))
    parser.add_argument('--editorial', type=Path, default=Path('data-pipeline/diagnosis-editorial.json'))
    parser.add_argument('--candidates', type=Path, help='Optional local reference list; never published')
    parser.add_argument('--review-output', type=Path, help='Private review queue outside public/ and output/')
    parser.add_argument('--if-present', action='store_true', help='Reuse an existing complete local build; refresh explicitly without this flag')
    args = parser.parse_args()
    if args.candidates and (not args.review_output or
            any(args.review_output.resolve().is_relative_to(p) for p in (Path('public').resolve(), args.output.resolve()))):
        parser.error('--candidates requires --review-output outside public/ and output/')
    editorial = json.loads(args.editorial.read_text('utf-8')) if args.editorial.exists() else {}
    editorial_digest = hashlib.sha256(json.dumps(editorial,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    if args.if_present and (args.output / 'manifest.json').exists():
        manifest = json.loads((args.output / 'manifest.json').read_text('utf-8'))
        release = manifest.get('release','')
        if (manifest.get('generator_sha256') == hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
                and manifest.get('editorial_sha256') == editorial_digest
                and re.fullmatch(r'[a-f0-9]{20}',release) and all(
                (args.output / release / name).is_file()
                for name in ['index.json'] + [f'detail-{i}.json' for i in range(100)])):
            print('Reusing complete local catalogue; run catalogue:refresh to fetch a new version.')
            return
    raw = {lang: (args.input_dir / f'{lang}_product1.json').read_bytes() if args.input_dir else download(lang)
           for lang in URLS}
    records, sources = build(raw['en'], raw['cs'], editorial)
    if len(records) < 10000:
        raise ValueError('Unexpected catalogue shrinkage: publication stopped')
    old = args.output / 'manifest.json'
    if old.exists() and len(records) < json.loads(old.read_text('utf-8'))['count'] * .95:
        raise ValueError('More than 5% drop: manual source review required')
    manifest = publish(records, sources, args.output, editorial_digest)
    if args.candidates:
        write_json(args.review_output,
                   candidate_matches(json.loads(args.candidates.read_text('utf-8')), records))
    print(json.dumps(manifest, ensure_ascii=True))


if __name__ == '__main__':
    main()
