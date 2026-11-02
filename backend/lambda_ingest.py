"""
TAMITOS Health — denný ingest ako AWS Lambda (píše do DynamoDB).

Znovupoužíva fetch/normalize funkcie z pipeline modulov (tamitos_ingest,
feeds_ingest, vuc_registers) a zapisuje do DynamoDB tabuliek. Spúšťa ho
EventBridge Scheduler o 05:00 Europe/Bratislava.

Zahraničné (nie SK) články sa prekladajú do slovenčiny cez Amazon Translate
(translate_sk.py). Originál zostáva zachovaný (title/summary + url na zdroj),
preklad ide do title_sk/summary_sk. Už preložené články sa neprekladajú znova.

Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE.
"""
import os
import boto3

from tamitos_ingest import fetch_clinicaltrials, normalize_study, load_cvti_xlsx
from feeds_ingest import parse_feed, scrape_tamitos_blog, _id
from feeds import RSS_FEEDS
from translate_sk import translate_to_sk
import public_registers

ddb = boto3.resource("dynamodb")
ARTICLES = ddb.Table(os.environ["ARTICLES_TABLE"])
PROVIDERS = ddb.Table(os.environ["PROVIDERS_TABLE"])
STUDIES = ddb.Table(os.environ["STUDIES_TABLE"])


def _clean(d):
    # DynamoDB neberie None; prázdny string je OK
    return {k: v for k, v in d.items() if v is not None}


def handler(event, context):
    out = {"studies": 0, "providers": 0, "articles": 0, "translated": 0}

    # 1) klinické štúdie
    try:
        raw = fetch_clinicaltrials(locn=None)
        # Validate the complete source before opening a writer: malformed later rows
        # must not cause a partly refreshed study collection.
        normalized = [_clean(normalize_study(s)) for s in raw]
        if not normalized:
            raise ValueError('No studies returned; retaining previous records')
        with STUDIES.batch_writer(overwrite_by_pkeys=["nct_id"]) as bw:
            for it in normalized:
                bw.put_item(Item=it)
                out["studies"] += 1
    except Exception as e:
        print("studies err", e)

    # 2) CVTI and nationwide official social/medical registers are independent:
    # a failed CVTI source must not prevent the other adapters from running.
    try:
        provs = load_cvti_xlsx()
        with PROVIDERS.batch_writer(overwrite_by_pkeys=["ext_id"]) as bw:
            for p in provs:
                bw.put_item(Item=_clean(p))
                out["providers"] += 1
    except Exception as e:
        print("providers err", e)

    try:
        from register_publication import publish
        register_result = public_registers.collect()
        reviews = ddb.Table(os.environ['PROVIDER_REVIEW_TABLE']) if os.environ.get('PROVIDER_REVIEW_TABLE') else None
        # This Lambda has no public invoke route. A release operator can explicitly
        # acknowledge a verified legitimate contraction for named source scopes.
        approved = (event or {}).get('approved_shrink_sources', [])
        if not isinstance(approved, list) or any(not isinstance(x, str) for x in approved):
            raise ValueError('Invalid shrink approval')
        published = publish(PROVIDERS, reviews, register_result, approved)
        out['providers'] += published['written']
        out['register_sources'] = published['sources']
        out['register_complete'] = published['complete']
    except Exception as exc:
        out['register_complete'] = False
        print('register publication failed', type(exc).__name__)

    # 3) feed noviniek (RSS + TAMITOS blog) + preklad do SK
    try:
        rows = []
        for f in RSS_FEEDS:
            try:
                rows += parse_feed(f["url"], f["name"], f["kind"], f["lang"])
            except Exception as e:
                print("feed err", f["name"], e)
        rows += scrape_tamitos_blog()
        with ARTICLES.batch_writer(overwrite_by_pkeys=["id"]) as bw:
            for r in rows:
                aid = _id(r["url"])
                lang = (r.get("lang") or "en").lower()
                title = r.get("title", "")
                summary = r.get("summary", "")

                if lang == "sk":
                    # SK zdroj (napr. TAMITOS blog) — netreba prekladať
                    title_sk, summary_sk, translated = title, summary, 0
                else:
                    # skús znovupoužiť existujúci preklad (šetrí náklady na Translate)
                    try:
                        prev = ARTICLES.get_item(Key={"id": aid}).get("Item", {}) or {}
                    except Exception:
                        prev = {}
                    if prev.get("summary_sk") and prev.get("title") == title:
                        title_sk = prev.get("title_sk", title)
                        summary_sk = prev.get("summary_sk", summary)
                    else:
                        title_sk = translate_to_sk(title)
                        summary_sk = translate_to_sk(summary)
                        out["translated"] += 1
                    translated = 1

                item = _clean({
                    "id": aid, "is_new": 1, **r,
                    "title_sk": title_sk, "summary_sk": summary_sk,
                    "translated": translated,
                })
                bw.put_item(Item=item)
                out["articles"] += 1
    except Exception as e:
        print("articles err", e)

    print("ingest done", out)
    return {"ok": True, **out}
