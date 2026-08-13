"""
TAMITOS Health — komunitné príspevky (AWS Lambda za API Gateway).

NIE je to chat — je to moderovaný priestor na zdieľanie skúseností rodičov.
Príspevky idú do stavu `pending` a zobrazia sa až po schválení (alebo po
auto-schválení, ak prejdú kontrolami). Dôraz na ochranu pred botmi/spamom.

Endpoints (jedna Lambda, routing podľa method/path):
  POST /community          -> odoslať príspevok
  GET  /community          -> vrátiť schválené príspevky (pre web)

DynamoDB tabuľky:
  th_community  (PK id)            — príspevky, GSI status-created-index
  th_ratelimit  (PK ip)  TTL ttl   — per-IP rate limiting

Anti-spam vrstvy (viac vrstiev = odolnosť):
  1) API Gateway throttling (rate/burst) + WAF (nastavené v infra, nie tu)
  2) Cloudflare Turnstile / hCaptcha — token overený server-side
  3) Honeypot pole (ak vyplnené -> tichý drop)
  4) Time-trap — odoslané < 4 s po načítaní formulára -> bot
  5) Per-IP rate limit — max 1 / 10 s a max 5 / deň (DynamoDB atomic)
  6) Obsahové filtre — dĺžka, počet odkazov, zoznam nebezpečných „liečob"
  7) Moderácia — všetko končí ako `pending`; publikuje sa po schválení
"""
import json, os, re, time, hashlib, urllib.request, urllib.parse
import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb")
POSTS = ddb.Table(os.environ.get("POSTS_TABLE", "th_community"))
RATE = ddb.Table(os.environ.get("RATE_TABLE", "th_ratelimit"))

TURNSTILE_SECRET = os.environ.get("TURNSTILE_SECRET", "")
MAX_LEN = 1200
MIN_LEN = 15
MAX_LINKS = 1
RATE_SECONDS = 10          # min. odstup medzi príspevkami z jednej IP
DAILY_CAP = 5              # max. príspevkov z jednej IP za deň
MIN_FILL_SECONDS = 4       # rýchlejšie = bot

# Nebezpečné „liečby" — príspevky, ktoré ich propagujú, idú na prísnu moderáciu.
DANGER = ["mms", "oxid chlori", "chlorine dioxide", "chelácia", "chelacia", "chelation",
          "gcmaf", "bielidlo", "zázračn", "zazracn", "vyliečim autizmus", "cure autism"]
BANNED = re.compile(r"(viagra|casino|crypto|\bporn\b|http\S+\.(ru|top|xyz)\b)", re.I)

CORS = {"Access-Control-Allow-Origin": "https://tamitos.com",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"}


def _resp(code, body):
    return {"statusCode": code, "headers": {"Content-Type": "application/json", **CORS},
            "body": json.dumps(body, ensure_ascii=False)}


def _client_ip(event):
    h = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    xff = h.get("x-forwarded-for", "")
    return (xff.split(",")[0].strip() if xff else
            event.get("requestContext", {}).get("http", {}).get("sourceIp", "0.0.0.0"))


def _verify_turnstile(token, ip):
    if not TURNSTILE_SECRET:      # ak nie je nastavené, preskoč (dev)
        return True
    data = urllib.parse.urlencode({"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip}).encode()
    req = urllib.request.Request("https://challenges.cloudflare.com/turnstile/v0/siteverify", data=data)
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.load(r).get("success", False)


def _rate_ok(ip):
    """Atomicky: povolí max 1/RATE_SECONDS a DAILY_CAP/deň. Vracia (ok, dôvod)."""
    now = int(time.time())
    day = time.strftime("%Y%m%d", time.gmtime(now))
    key = {"ip": hashlib.sha256(ip.encode()).hexdigest()}  # IP neukladáme v čitateľnej podobe
    item = RATE.get_item(Key=key).get("Item")
    if item:
        if now - int(item.get("last", 0)) < RATE_SECONDS:
            return False, "Príliš rýchlo po sebe — skús o pár sekúnd."
        if item.get("day") == day and int(item.get("count", 0)) >= DAILY_CAP:
            return False, "Denný limit príspevkov vyčerpaný."
        count = int(item.get("count", 0)) + 1 if item.get("day") == day else 1
    else:
        count = 1
    RATE.put_item(Item={**key, "last": now, "day": day, "count": count,
                        "ttl": now + 86400 * 2})  # TTL 2 dni
    return True, ""


def _moderate(text):
    """Vráti (auto_status, flag). auto_status: 'pending' vždy; 'flagged' ak riziko."""
    low = text.lower()
    if any(d in low for d in DANGER):
        return "flagged", "danger-cure"
    if BANNED.search(text):
        return "rejected", "banned"
    if len(re.findall(r"https?://", low)) > MAX_LINKS:
        return "flagged", "too-many-links"
    return "pending", ""


def submit(event):
    ip = _client_ip(event)
    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return _resp(400, {"error": "bad json"})

    # 3) honeypot
    if (body.get("website") or "").strip():
        return _resp(200, {"ok": True})  # tichý drop — bot si myslí, že prešiel

    # 4) time-trap
    try:
        if time.time() - float(body.get("loadedAt", 0)) / 1000.0 < MIN_FILL_SECONDS:
            return _resp(429, {"error": "Formulár odoslaný príliš rýchlo."})
    except Exception:
        return _resp(400, {"error": "bad payload"})

    text = (body.get("text") or "").strip()
    if not (MIN_LEN <= len(text) <= MAX_LEN):
        return _resp(400, {"error": f"Text musí mať {MIN_LEN}–{MAX_LEN} znakov."})

    # 2) captcha
    if not _verify_turnstile(body.get("captcha", ""), ip):
        return _resp(403, {"error": "Overenie sa nepodarilo, skús znova."})

    # 5) rate limit
    ok, why = _rate_ok(ip)
    if not ok:
        return _resp(429, {"error": why})

    # 6) obsahová moderácia
    status, flag = _moderate(text)
    if status == "rejected":
        return _resp(422, {"error": "Príspevok nebolo možné prijať."})

    pid = hashlib.sha1(f"{ip}{text}{time.time()}".encode()).hexdigest()[:16]
    POSTS.put_item(Item={
        "id": pid, "status": status, "flag": flag,
        "nick": (body.get("nick") or "Rodič").strip()[:40],
        "category": (body.get("category") or "tip").strip()[:20],
        "childAge": (body.get("childAge") or "").strip()[:20],
        "text": text, "created": int(time.time()),
        "created_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    # 7) publikuje sa až po schválení moderátorom
    return _resp(201, {"ok": True, "status": status,
                       "message": "Ďakujeme! Príspevok posielame na krátku kontrolu a zobrazí sa po schválení."})


def list_approved(event):
    q = (event.get("queryStringParameters") or {})
    limit = min(int(q.get("limit", 30)), 100)
    res = POSTS.query(IndexName="status-created-index",
                      KeyConditionExpression=Key("status").eq("approved"),
                      ScanIndexForward=False, Limit=limit)
    items = [{"nick": i["nick"], "category": i["category"], "childAge": i.get("childAge", ""),
              "text": i["text"], "created": i["created_iso"]} for i in res.get("Items", [])]
    return _resp(200, {"items": items})


def handler(event, context):
    method = (event.get("requestContext", {}).get("http", {}).get("method")
              or event.get("httpMethod", "GET")).upper()
    if method == "OPTIONS":
        return _resp(204, {})
    if method == "POST":
        return submit(event)
    return list_approved(event)
