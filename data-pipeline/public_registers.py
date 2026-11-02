"""Read-only official nationwide social-services export and e-VUC rehabilitation.

No patient records, guessed contacts or provider-verification claims are imported.
"""
import csv
import datetime as dt
import hashlib
import io
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request

SOCIAL_EXPORT = 'https://sos.mpsvr.gov.sk/pm/api/services/export'
SOCIAL_TIMESTAMP = 'https://sos.mpsvr.gov.sk/pm/api/timestamp'
SOCIAL_PAGE = 'https://sos.mpsvr.gov.sk/pm/poskytovatel-sos'
HEALTH_HOME = 'https://www.e-vuc.sk/'
VERSION = 'services-v1'
REGIONS = {'bbsk': 'Banskobystrický kraj', 'bsk': 'Bratislavský kraj',
           'ksk': 'Košický kraj', 'nsk': 'Nitriansky kraj', 'psk': 'Prešovský kraj',
           'tsk': 'Trenčiansky kraj', 'ttsk': 'Trnavský kraj', 'zsk': 'Žilinský kraj'}
SOCIAL_HEADERS = ['Názov', 'IČO', 'Právna forma', 'Typ poskytovateľa', 'Adresa sídla',
                  'Štatutárny zástupca', 'Telefón', 'e-mail', 'Webové sídlo', 'ID',
                  'Druh', 'Forma', 'Kraj poskytovania', 'Okres poskytovania',
                  'Obec poskytovania', 'Adresa poskytovania', 'Cieľová skupina',
                  'Veková kategória', 'Bližšie informácie k cieľovej skupine a sociálnej službe',
                  'Zodpovedná osoba', 'Telefón', 'e-mail', 'Kapacita', 'Voľné miesta',
                  'Čakatelia', 'Poskytovaná od', 'Poskytovaná do', 'Dátum zápisu do registra']


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')


def text(value):
    return ' '.join(str(value or '').split())


def fold(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', text(value).lower()) if not unicodedata.combining(c))


def safe_url(value):
    value = text(value)
    if value and '://' not in value:
        value = 'https://' + value
    try:
        p = urllib.parse.urlparse(value)
        return value if p.scheme in ('http', 'https') and p.hostname and not p.username and not p.password else ''
    except ValueError:
        return ''


def fetch(url):
    if urllib.parse.urlparse(url).hostname not in {'sos.mpsvr.gov.sk', 'www.e-vuc.sk'}:
        raise ValueError('Unapproved register host')
    req = urllib.request.Request(url, headers={'User-Agent': 'TAMITOS-public-registers/1.0', 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=30) as response:
        if urllib.parse.urlparse(response.url).hostname != urllib.parse.urlparse(url).hostname:
            raise ValueError('Unexpected source redirect')
        data = response.read(16 * 1024 * 1024 + 1)
    if len(data) > 16 * 1024 * 1024:
        raise ValueError('Register exceeds 16 MiB source budget')
    return data


def source_fields(url, payload, source_name, updated=None):
    return {'source': source_name, 'source_name': source_name, 'source_url': url,
            'source_sha256': hashlib.sha256(payload).hexdigest(), 'fetched_at': now(),
            'source_updated_at': updated, 'parser_version': VERSION,
            'verification_status': 'imported_not_individually_verified'}


def date_value(value):
    value = text(value)
    if not value:
        return None
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d. %m. %Y'):
        try:
            return dt.datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    raise ValueError('Unknown register date format: ' + value[:30])


def optional_int(value):
    value = text(value).replace(' ', '').replace('\u00a0', '')
    if value in ('', '-', '—'):
        return None
    if not value.isdigit():
        raise ValueError('Invalid capacity value')
    return int(value)


def parse_social_csv(payload, updated=None, today=None):
    today = today or dt.datetime.now(dt.timezone.utc).date()
    rows = list(csv.reader(io.StringIO(payload.decode('utf-8-sig')), delimiter=';'))
    if len(rows) < 3 or [text(x) for x in rows[1][:28]] != SOCIAL_HEADERS:
        raise ValueError('IS SoS export headers changed; keep previous data')
    result, seen = [], set()
    meta = source_fields(SOCIAL_PAGE, payload, 'MPSVR SR — verejný register IS SoS', updated)
    for row in rows[2:]:
        if not any(row):
            continue
        if len(row) < 28:
            raise ValueError('Truncated IS SoS record')
        row = list(map(text, row))
        name, ico, sid, kind = row[0], row[1], row[9], row[10]
        if not name or not re.fullmatch(r'\d+', sid) or not kind:
            raise ValueError('Missing source service identity')
        end, start = date_value(row[26]), date_value(row[25])
        if (end and end < today) or (start and start > today):
            continue
        if sid in seen:
            raise ValueError('Duplicate social service ID')
        seen.add(sid)
        organisation_id = 'ico:' + ico if re.fullmatch(r'\d{8}', ico) else 'issos-org:' + sid
        # One source service ID stays distinct from other services at the same branch.
        branch_key = organisation_id + '|' + fold(row[14] + '|' + row[15] + '|' + row[11])
        result.append({**meta, 'ext_id': 'issos:' + sid, 'source_record_id': sid,
                       'source_scope': 'issos', 'active': True,
                       'source_url': SOCIAL_PAGE + '/' + sid, 'source_file_url': SOCIAL_EXPORT,
                       'organisation_id': organisation_id, 'branch_id': 'issos-branch:' + hashlib.sha256(branch_key.encode()).hexdigest()[:20],
                       'service_id': 'issos:' + sid, 'name': name, 'kind': kind,
                       'category': 'social_services', 'service_form': row[11],
                       'region': row[12], 'district': row[13], 'city': row[14],
                       'address': row[15], 'target_group': row[16], 'age_group': row[17],
                       'website': safe_url(row[8]), 'phone': row[20] or row[6],
                       'email': row[21] or row[7],
                       'contact': ' · '.join(filter(None, [row[20] or row[6], row[21] or row[7]])),
                       'registered_capacity': optional_int(row[22]),
                       'reported_vacancies': optional_int(row[23]), 'reported_waiting': optional_int(row[24]),
                       'availability_note': 'Údaj registra k uvedenej aktualizácii; dostupnosť treba potvrdiť u poskytovateľa.',
                       'autism_specific': 'autiz' in fold(row[16] + ' ' + row[18])})
    if not result:
        raise ValueError('No active social services; keep previous data')
    for item in result:
        item['search_text'] = fold(' '.join(item.get(k, '') for k in ('name', 'city', 'address', 'kind', 'target_group')) + (' autizmus' if item['autism_specific'] else ''))
    return result


def discover_health_regions(payload):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(payload, 'html.parser')
    found = {}
    for a in soup.find_all('a', href=True):
        url = urllib.parse.urljoin(HEALTH_HOME, a['href'])
        p = urllib.parse.urlparse(url)
        if p.hostname != 'www.e-vuc.sk':
            continue
        bits = p.path.strip('/').split('/')
        if bits[0] in REGIONS and bits[1:] in (['zdravotnictvo', 'ambulantne-zdravotnicke-zariadenia.html'], ['ambulantne-zdravotnicke-zariadenia.html']):
            query = urllib.parse.parse_qs(p.query); query['search_kraj'] = ['rehabilit']
            found[bits[0]] = urllib.parse.urlunparse(p._replace(query=urllib.parse.urlencode(query, doseq=True)))
    if set(found) != set(REGIONS):
        raise ValueError('e-VUC region index changed or incomplete')
    return found


def parse_rehabilitation(payload, url, region):
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(payload, 'html.parser')
    if not soup.find('input', attrs={'name': 'search_kraj'}):
        raise ValueError('Not an e-VUC search page')
    # Never silently accept one page of an unexpectedly paginated result.
    if soup.select('.pagination a, .paginator a, a[rel="next"]'):
        raise ValueError('Unexpected health result pagination')
    result, seen = [], set()
    meta = source_fields(url, payload, 'e-VÚC — register zdravotníckych zariadení')
    for tr in soup.select('tr'):
        if 'canceled-row' in tr.get('class', []):
            continue
        specialty = tr.select_one('.specializacny_odbor')
        if not specialty or not any(x in fold(specialty.get_text()) for x in ('rehabilit', 'fyziatr', 'fyzioterap')):
            continue
        tds = tr.find_all('td', recursive=False)
        a = tr.find('a', href=True)
        if not a or len(tds) < 3:
            raise ValueError('Health result layout changed')
        href = urllib.parse.urljoin(url, a['href'])
        source_id = urllib.parse.parse_qs(urllib.parse.urlparse(href).query).get('page_id', [''])[0]
        code_match = re.search(r'\b\d{2}-\d{8}-[A-Z]\d{4}\b', tr.get_text(' ', strip=True))
        if not source_id.isdigit() or not code_match or urllib.parse.urlparse(href).hostname != 'www.e-vuc.sk':
            raise ValueError('Missing health source identity')
        source_code = code_match.group(0)
        if source_code in seen:
            continue
        seen.add(source_code)
        # The HTML includes hidden abolished rows: exclude canceled-row explicitly.
        # Do not infer age,
        # autism focus or current availability from a specialty/name match.
        address_td = tds[2] if 'hide_for_mobile' in tds[0].get('class', []) else tds[1]
        address = text(address_td.get_text(' ', strip=True))
        city_match = re.search(r'\b\d{3}\s?\d{2}\s+(.+)$', address)
        city = city_match.group(1) if city_match else ''
        ico = source_code.split('-')[1]
        result.append({**meta, 'ext_id': 'evuc:' + source_code, 'source_record_id': source_id,
                       'source_scope': 'evuc-' + region, 'active': True,
                       'organisation_id': 'ico:' + ico, 'branch_id': 'evuc:' + source_code,
                       'service_id': 'evuc:' + source_code, 'source_url': href,
                       'name': text(a.get_text(' ', strip=True)),
                       'kind': text(specialty.get_text()).strip('()'), 'category': 'medical_rehabilitation',
                       'region': REGIONS[region], 'city': city, 'address': address,
                       'contact': '', 'website': '', 'age_group': '', 'autism_specific': False,
                       'verification_status': 'imported_not_individually_verified'})
    if not result:
        raise ValueError('No rehabilitation records; review source before publishing')
    for item in result:
        item['search_text'] = fold(' '.join(item.get(k, '') for k in ('name', 'city', 'address', 'kind')))
    return result


def collect(fetcher=fetch):
    records, health = [], []
    try:
        timestamp = json.loads(fetcher(SOCIAL_TIMESTAMP)).get('timestamp')
        payload = fetcher(SOCIAL_EXPORT)
        rows = parse_social_csv(payload, timestamp)
        records.extend(rows)
        health.append({'id': 'issos', 'status': 'ok', 'records': len(rows), 'source_updated_at': timestamp, 'sha256': hashlib.sha256(payload).hexdigest()})
    except Exception as exc:
        health.append({'id': 'issos', 'status': 'failed', 'error': str(exc)[:250]})
    try:
        regions = discover_health_regions(fetcher(HEALTH_HOME))
    except Exception as exc:
        regions = {}
        health.append({'id': 'evuc-index', 'status': 'failed', 'error': str(exc)[:250]})
    for region, url in regions.items():
        try:
            payload = fetcher(url)
            rows = parse_rehabilitation(payload, url, region)
            records.extend(rows)
            health.append({'id': 'evuc-' + region, 'status': 'ok', 'records': len(rows), 'sha256': hashlib.sha256(payload).hexdigest()})
        except Exception as exc:
            health.append({'id': 'evuc-' + region, 'status': 'failed', 'error': str(exc)[:250]})
        if fetcher is fetch:
            time.sleep(.25)
    return {'items': records, 'sources': health, 'complete': bool(health) and all(x['status'] == 'ok' for x in health), 'captured_at': now()}
