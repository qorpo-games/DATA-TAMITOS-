"""
TAMITOS Health — denný ingest ako AWS Lambda (píše do DynamoDB).

Znovupoužíva fetch/normalize funkcie z pipeline modulov (tamitos_ingest,
feeds_ingest, vuc_registers) a zapisuje do DynamoDB tabuliek. Spúšťa ho
EventBridge Scheduler o 05:00 Europe/Bratislava.

Env: ARTICLES_TABLE, PROVIDERS_TABLE, STUDIES_TABLE.
"""
import os
import boto3

from tamitos_ingest import fetch_clinicaltrials, normalize_study, load_cvti_xlsx
from feeds_ingest import parse_feed, scrape_tamitos_blog, _id
from feeds import RSS_FEEDS
import vuc_registers

ddb = boto3.resource("dynamodb")
ARTICLES = ddb.Table(os.environ["ARTICLES_TABLE"])
PROVIDERS = ddb.Table(os.environ["PROVIDERS_TABLE"])
STUDIES = ddb.Table(os.environ["STUDIES_TABLE"])


def _clean(d):
    # DynamoDB neberie None; prázdny string je OK
    return {k: v for k, v in d.items() if v is not None}


def handler(event, context):
    out = {"studies": 0, "providers": 0, "articles": 0}

    # 1) klinické štúdie
    try:
        raw = fetch_clinicaltrials(locn=None)
        with STUDIES.batch_writer(overwrite_by_pkeys=["nct_id"]) as bw:
            for s in raw:
                if s.get("protocolSection"):
                    it = _clean(normalize_study(s))
                    if it.get("nct_id"):
                        bw.put_item(Item=it)
                        out["studies"] += 1
    except Exception as e:
        print("studies err", e)

    # 2) poskytovatelia (CVTI + VÚC)
    try:
        provs = load_cvti_xlsx()
        try:
            provs += vuc_registers.run_all()
        except Exception as e:
            print("vuc err", e)
        with PROVIDERS.batch_writer(overwrite_by_pkeys=["ext_id"]) as bw:
            for p in provs:
                bw.put_item(Item=_clean(p))
                out["providers"] += 1
    except Exception as e:
        print("providers err", e)

    # 3) feed noviniek (RSS + TAMITOS blog)
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
                bw.put_item(Item=_clean({"id": _id(r["url"]), "is_new": 1, **r}))
                out["articles"] += 1
    except Exception as e:
        print("articles err", e)

    print("ingest done", out)
    return {"ok": True, **out}
