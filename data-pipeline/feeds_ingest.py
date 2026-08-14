#!/usr/bin/env python3
"""
TAMITOS — denný zber NOVINIEK do feedu (tabuľka `articles`).

Ťahá RSS/Atom feedy overených zdrojov + TAMITOS blog a ukladá NOVÉ články.
TAMITOS blog je client-rendered (SPA), preto zoznam článkov berieme zo
sitemap.xml (spoľahlivé, server ho generuje pre SEO).

Spustenie:
    pip install feedparser
    python3 feeds_ingest.py --db tamitos.db
    python3 feeds_ingest.py --sample     # offline
"""
import argparse, sqlite3, datetime, hashlib, sys, os, urllib.request, html, re

try:
    import feedparser
except ImportError:
    feedparser = None

from feeds import RSS_FEEDS, TAMITOS_BLOG, TAMITOS_BLOG_RSS_CANDIDATES

UA = {"User-Agent": "TAMITOS-feeds/1.0 (+https://tamitos.com)"}
SITEMAPS = [
    "https://tamitos.com/sitemap.xml",
    "https://tamitos.com/sitemap-0.xml",
    "https://tamitos.com/sk/sitemap.xml",
]


def init(con):
    con.executescript("""
    CREATE TABLE IF NOT EXISTS articles (
        id           TEXT PRIMARY KEY,
        url          TEXT UNIQUE,
        title        TEXT,
        summary      TEXT,
        source       TEXT,
        kind         TEXT,
        lang         TEXT,
        published    TEXT,
        first_seen   TEXT,
        is_new       INTEGER DEFAULT 1,
        translated_sk TEXT
    );
    """)
    con.commit()


def _id(url):
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


def upsert(con, rows):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
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
        if cur.rowcount:
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


def _title_from_slug(slug):
    """Z URL slugu poskladá čitateľný titulok (SK slugy nemajú diakritiku)."""
    t = slug.replace("-", " ").strip()
    return (t[:1].upper() + t[1:]) if t else slug


def _fetch(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def scrape_tamitos_blog():
    """Všetky SK blogy zo sitemap.xml (SPA listing sa nedá scrapnúť bez JS)."""
    urls = []
    for sm in SITEMAPS:
        try:
            xml = _fetch(sm)
        except Exception as e:
            print(f"  ! sitemap {sm}: {e}", file=sys.stderr)
            continue
        for m in re.finditer(r'https?://[^<>"\s]*?/sk/blog/([a-z0-9\-]+)', xml):
            full, slug = m.group(0), m.group(1)
            if slug and slug not in ("", "blog"):
                urls.append((full.rstrip("/"), slug))
        if urls:
            break  # prvá sitemap ktorá niečo vrátila stačí

    seen, out = set(), []
    for full, slug in urls:
        if full in seen:
            continue
        seen.add(full)
        out.append({
            "url": full, "title": _title_from_slug(slug), "summary": "",
            "source": TAMITOS_BLOG["name"], "kind": "tamitos", "lang": "sk", "published": "",
        })

    # fallback: skús RSS kandidáty, ak sitemap zlyhala
    if not out:
        for cand in TAMITOS_BLOG_RSS_CANDIDATES:
            try:
                got = parse_feed(cand, TAMITOS_BLOG["name"], "tamitos", "sk")
                if got:
                    return got
            except Exception:
                pass
    print(f"  ✓ TAMITOS blog (sitemap): {len(out)} článkov")
    return out


def run(db, sample=False):
    con = sqlite3.connect(db)
    init(con)
    all_rows = []
    if sample:
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
        all_rows += scrape_tamitos_blog()

    n_new = upsert(con, all_rows)
    total = con.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
    print(f"\n→ Feed: {len(all_rows)} načítaných, {n_new} NOVÝCH, {total} spolu v DB")
    con.close()
    return n_new


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="TAMITOS feed ingest (Novinky)")
    ap.add_argument("--db", default="tamitos.db")
    ap.add_argument("--sample", action="store_true")
    a = ap.parse_args()
    run(a.db, a.sample)
