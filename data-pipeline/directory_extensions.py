"""Official school snapshots and dental facilities; no inferred autism suitability."""
import datetime as dt
import io
import re
import time
import urllib.parse
import public_registers as base

SCHOOL_PAGE = 'https://www.cvtisr.sk/informacie-o-skolstve/registre/zoznamy-skol-a-skolskych-zariadeni/'
SCHOOLS = {
    'ms': ('kindergarten', 'Materská škola'),
    'specms': ('special_kindergarten', 'Špeciálna materská škola'),
    'zs': ('primary_school', 'Základná škola'),
    'speczs': ('special_primary_school', 'Špeciálna základná škola'),
}
SCHOOL_REGIONS = dict(zip('12345678', (base.REGIONS[k] for k in ('bsk', 'ttsk', 'tsk', 'nsk', 'zsk', 'bbsk', 'psk', 'ksk'))))
VERSION = 'directory-extensions-v1'


def school_url(key):
    if key not in SCHOOLS:
        raise ValueError('Unknown school source')
    return f'https://www.cvtisr.sk/wp-content/uploads/buxus/docs/JC/zoznamy/{key}_z.xls'


def cell(value):
    if isinstance(value, float):
        if not value.is_integer():
            raise ValueError('Unexpected fractional school value')
        value = str(int(value))
    return base.text(value)


def parse_school_rows(rows, key, payload):
    """Merge repeated disability rows into one EDU ID per school-source scope.

    Pupil counts are deliberately not imported: they are neither capacity nor
    availability and special-school breakdowns are not additive school totals.
    """
    category, kind = SCHOOLS[key]
    header_index = next((i for i, row in enumerate(rows[:8]) if 'eduid' in row and 'nazov' in row), None)
    if header_index is None:
        raise ValueError('School headers not found')
    header = [cell(x) for x in rows[header_index]]
    required = {'rok', 'eduid', 'kodsko', 'kraj', 'okres', 'nazov', 'ulica', 'miesto', 'psc', 'adrwww'}
    if not required <= set(header) or len(header) != len(set(header)):
        raise ValueError('School schema changed')
    title = ' '.join(cell(x) for row in rows[:header_index] for x in row)
    match = re.search(r'k\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})', title)
    if not match:
        raise ValueError('School observation date missing')
    observation = dt.date(int(match[3]), int(match[2]), int(match[1])).isoformat()
    result = {}
    for values in rows[header_index + 1:]:
        if not any(cell(x) for x in values):
            continue
        if len(values) != len(header):
            raise ValueError('School row width changed')
        row = dict(zip(header, map(cell, values)))
        if not re.fullmatch(r'\d{9}', row['eduid']) or row['kraj'] not in SCHOOL_REGIONS or not row['nazov']:
            raise ValueError('Invalid school identity or region')
        if row['rok'] != str(int(match[3])):
            raise ValueError('School year disagrees with observation date')
        identity = f"cvti-{key}:" + row['eduid']
        target = row.get('postih', '')
        current = {**base.source_fields(school_url(key), payload, 'CVTI SR — školská štatistická evidencia'),
                   'parser_version': VERSION, 'source_observed_at': observation, 'ext_id': identity, 'source_scope': 'cvti-' + key,
                   'source_record_id': row['eduid'], 'service_id': identity,
                   'source_url': SCHOOL_PAGE, 'source_file_url': school_url(key),
                   'active': True, 'name': row['nazov'], 'category': category, 'kind': kind,
                   'region': SCHOOL_REGIONS[row['kraj']], 'district': row['okres'],
                   'city': row['miesto'], 'address': ', '.join(x for x in (row['ulica'], row['psc'], row['miesto']) if x),
                   'website': base.safe_url(row['adrwww']), 'contact': '', 'age_group': '',
                   'availability_note': 'Štatistický zoznam k ' + observation + '; aktuálnu prevádzku a prijímanie treba potvrdiť.',
                   'autism_specific': 'autizm' in base.fold(row['nazov'] + ' ' + target),
                   'target_group': target}
        if identity in result:
            previous = result[identity]
            if any(previous[k] != current[k] for k in ('name', 'address', 'region', 'website')):
                raise ValueError('Conflicting school identity')
            previous['target_group'] = '; '.join(sorted(set(filter(None, previous['target_group'].split('; ') + [target]))))
            previous['autism_specific'] |= current['autism_specific']
        else:
            result[identity] = current
    if not result:
        raise ValueError('Empty school snapshot refused')
    for row in result.values():
        row['search_text'] = base.fold(' '.join(row.get(k, '') for k in ('name', 'city', 'address', 'kind', 'target_group')))
    return list(result.values())


def parse_school(payload, key):
    import xlrd
    sheet = xlrd.open_workbook(file_contents=payload, on_demand=True).sheet_by_index(0)
    return parse_school_rows([sheet.row_values(i) for i in range(sheet.nrows)], key, payload)


def collect(fetcher=base.fetch):
    items, sources = [], []
    for key in SCHOOLS:
        try:
            rows = parse_school(fetcher(school_url(key)), key)
            items.extend(rows)
            sources.append({'id': 'cvti-' + key, 'status': 'ok', 'records': len(rows), 'source_observed_at': rows[0]['source_observed_at']})
        except Exception as exc:
            sources.append({'id': 'cvti-' + key, 'status': 'failed', 'error': str(exc)[:250]})
    try:
        regions = base.discover_health_regions(fetcher(base.HEALTH_HOME))
    except Exception as exc:
        regions = {}
        sources.append({'id': 'evuc-dental-index', 'status': 'failed', 'error': str(exc)[:250]})
    for region, url in regions.items():
        try:
            found = {}
            for term in ('zub', 'stomat'):
                parsed = urllib.parse.urlparse(url)
                query = urllib.parse.parse_qs(parsed.query); query['search_kraj'] = [term]
                search = urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query, doseq=True)))
                for row in base.parse_health(fetcher(search), search, region, 'dental', allow_empty=True):
                    found.setdefault(row['ext_id'], row)
                if fetcher is base.fetch:
                    time.sleep(.25)
            if not found:
                raise ValueError('Empty dental region refused')
            items.extend(found.values())
            sources.append({'id': 'evuc-dental-' + region, 'status': 'ok', 'records': len(found)})
        except Exception as exc:
            # Both query variants must succeed before publishing/retiring a region.
            sources.append({'id': 'evuc-dental-' + region, 'status': 'failed', 'error': str(exc)[:250]})
    return {'items': items, 'sources': sources, 'captured_at': base.now(), 'complete': all(x['status'] == 'ok' for x in sources)}
