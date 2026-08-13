#!/usr/bin/env python3
"""
TAMITOS — denný zber NOVINIEK do feedu (tabuľka `articles`).

Ťahá RSS/Atom feedy overených zdrojov + TAMITOS blog a ukladá NOVÉ články.
Idempotentné: kľúč = URL článku (INSERT OR IGNORE), takže sa nič neduplikuje;
počet skutočne nových článkov za beh sa vypíše a označí `is_new=1` pre daný deň.

Spustenie:
    pip install feedparser
    python3 feeds_ingest.py --db tamitos.db
    python3 feeds_ingest.py --sample     # offline: použije sample_data/feeds_sample.xml

Beží v tom istom dennom jobe ako tamitos_ingest.py (05:00 Europe/Bratislava).
"""
import argparse, sqlite3, datetime, hashlib, sys, os, urllib.request, html, re

try:
    import feedparser  # robustný RSS/Atom parser
except ImportError:
    feedparser = None

from feeds import RSS_FEEDS, TAMITOS_BLOG, TAMITOS_BLOG_RSS_CANDIDATES

UA = {"User-Agent": "TAMITOS-feeds/1.0 (+https://tamitos.com)"}


def init(con):
    con.executescript("""
    CREATE TABLE IF NOT EXISTS articles (
        id           TEXT PRIMARY KEY,     -- sha1(url)
        url          TEXT UNIQUE,
        title        TEXT,
        summary      TEXT,
        source       TEXT,
        kind         TEXT,                 -- research | news | tamitos | vuc
        lang         TEXT,                 -- en | sk
        published    TEXT,
        first_seen   TEXT,
        is_new       INTEGER DEFAULT 1,    -- 1 = pribudol v poslednom behu
        translated_sk TEXT                 -- doplní prekladová vrstva (neskôr)
    );
    """)
    con.commit()


def _id(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def upsert(con, rows):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    # najprv zhoď príznak is_new zo starých záznamov, aby „nové" znamenalo tento beh
    con.execute("UPDATE articles SET is_new=0")
    n_new = 0
    for r in rows:
        cur = con.execute(
            """INSERT OR IGNORE INTO articles
               (id,url,title,summary,source,kind,lang,published,first_seen,is_new)
               VALUES (?,?,?,?,?,?,?,?,?,1)""",
            (_id(r["url"]), r["url"], r["title"], r.get("summary", ""), r["source"],
             r.get("kind", "news"), r.get("lang", "en"), r.get("published", ""), now),
        )
        if cur.rowcount:  # 1 = naozaj nový
            n_new += 1
    con.commit()
    return n_new


def parse_feed(url, source, kind, lang):
    if not feedparser:
        raise RuntimeError("feedparser nie je nainštalovaný (pip install feedparser)")
    d = feedparser.parse(url, request_headers=UA)
    out = []
    for e in d.entries[:40]:
        link = e.get("link")
        if not link:
            continue
        summ = re.sub("<[^>]+>", "", html.unescape(e.get("summary", "")))[:400]
        out.append({
            "url": link, "title": html.unescape(e.get("title", "")).strip(),
            "summary": summ.strip(), "source": source, "kind": kind, "lang": lang,
            "published": e.get("published", e.get("updated", "")),
        })
    return out


def scrape_tamitos_blog():
    """TAMITOS blog nemá RSS -> skús kandidátske RSS, inak zparsuj HTML listing."""
    for cand in TAMITOS_BLOG_RSS_CANDIDATES:
        try:
            got = parse_feed(cand, TAMITOS_BLOG["name"], "tamitos", "sk")
            if got:
                return got
        except Exception:
            pass
    # fallback: stiahni HTML a povytiahaj odkazy na články
    try:
        req = urllib.request.Request(TAMITOS_BLOG["url"], headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            page = r.read().decode("utf-8", "ignore")
    except Exception as e:
        print(f"  ! TAMITOS blog nedostupný: {e}", file=sys.stderr)
        return []
    out, seen = [], set()
    for m in re.finditer(r'href="(/sk/blog/[^"#?]+)"[^>]*>(.*?)</a>', page, re.S):
        href, txt = m.group(1), re.sub("<[^>]+>", "", m.group(2)).strip()
        if href in seen or len(txt) < 6:
            continue
        seen.add(href)
        out.append({"url": "https://tamitos.com" + href, "title": html.unescape(txt),
                    "summary": "", "source": TAMITOS_BLOG["name"], "kind": "tamitos", "lang": "sk",
                    "published": ""})
    return out


def run(db, sample=False):
    con = sqlite3.connect(db)
    init(con)
    all_rows = []
    if sample:
        # offline: jeden ukážkový článok, nech sa dá otestovať bez siete
        all_rows = [{"url": "https://www.sciencedaily.com/releases/2026/example-autism.htm",
                     "title": "Nová štúdia o skorej intervencii pri autizme",
                     "summary": "Ukážkový záznam pre offline test feedu.",
                     "source": "ScienceDaily · Autism", "kind": "research", "lang": "en", "published": ""}]
    else:
        for f in RSS_FEEDS:
            try:
                rows = parse_feed(f["url"], f["name"], f["kind"], f["lang"])
                all_rows += rows
                print(f"  ✓ {f['name']}: {len(rows)} položiek")
            except Exception as e:
                print(f"  ✗ {f['name']}: {e}", file=sys.stderr)
        blog = scrape_tamitos_blog()
        all_rows += blog
        print(f"  ✓ {TAMITOS_BLOG['name']}: {len(blog)} položiek")

    n_new = upsert(con, all_rows)
    total = con.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    print(f"\n→ Feed: {len(all_rows)} načítaných, {n_new} NOVÝCH, {total} spolu v DB")
    print("Najnovšie:")
    for row in con.execute("SELECT source,title FROM articles WHERE is_new=1 ORDER BY first_seen DESC LIMIT 8"):
        print(f"   [{row[0]}] {row[1][:70]}")
    con.close()
    return n_new


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="TAMITOS feed ingest (Novinky)")
    ap.add_argument("--db", default="tamitos.db")
    ap.add_argument("--sample", action="store_true")
    a = ap.parse_args()
    run(a.db, a.sample)
