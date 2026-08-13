#!/usr/bin/env python3
"""
TAMITOS — zber poskytovateľov SOCIÁLNYCH SLUŽIEB z registrov 8 samosprávnych krajov (VÚC).

Každý kraj vedie vlastný register (XLSX / PDF / HTML tabuľka) — formáty sa líšia,
preto má každý kraj svoj `parser`. Doplnené sú aj centrá včasnej intervencie (CVI),
ktoré sú druhom sociálnej služby a patria priamo do adresára pre rodičov.

Cieľ: zjednotiť 8 rôznych formátov do jednej tabuľky `providers` (rovnaká schéma
ako CVTI ingest). Beží v dennom jobe. URL over pri prvom nasadení — VÚC ich menia.

Stav: KOSTRA — URL a rámec sú pripravené; per-kraj parser sa dopĺňa podľa
reálneho formátu daného registra (väčšinou stačí mapovanie stĺpcov XLSX).
"""
import datetime

# Verejné registre poskytovateľov sociálnych služieb podľa kraja.
VUC_REGISTERS = [
    {"kraj": "Bratislavský",   "url": "https://bratislavskykraj.sk/socialne-veci/register-socialnych-sluzieb/", "fmt": "html"},
    {"kraj": "Trnavský",       "url": "https://trnava-vuc.sk/socialne-sluzby/evidencia-zariadeni-a-subjektov/", "fmt": "html"},
    {"kraj": "Trenčiansky",    "url": "https://www.tsk.sk/socialne-sluzby.html", "fmt": "html"},
    {"kraj": "Nitriansky",     "url": "https://www.unsk.sk/socialne-sluzby", "fmt": "html"},
    {"kraj": "Žilinský",       "url": "https://www.zilinskazupa.sk/sk/samosprava/urad-zsk/odbor-socialnych-veci/register-poskytovatelov-socialnych-sluzieb.html", "fmt": "xlsx"},
    {"kraj": "Banskobystrický","url": "https://www.bbsk.sk/poskytovatelia-socialnych-sluzieb", "fmt": "html"},
    {"kraj": "Prešovský",      "url": "https://psk.sk/domov/urad-psk/esluzby-psk/socialne-sluzby/register-poskytovatelov-ss/register-poskytovatelov-ss-zoznam/", "fmt": "html"},
    {"kraj": "Košický",        "url": "https://www.kosickazupa.sk/samosprava/kompetencie/socialne-veci/socialne-sluzby-poskytovatel", "fmt": "html"},
]

# Centrálny IS SoS (MPSVR) — krížová kontrola / doplnenie.
IS_SOS = "https://sos.mpsvr.gov.sk/pm/"

# Zameranie služieb, ktoré nás pre autizmus zaujímajú (filter po parsovaní).
RELEVANT_KEYWORDS = ["autizm", "včasn", "vcasn", "špecializ", "specializ", "rehabilit", "dss", "podporovan"]


def _now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def parse_xlsx_register(kraj, path_or_bytes):
    """Univerzálny XLSX parser — mapuje bežné stĺpce (názov/adresa/druh služby)."""
    import openpyxl, io
    wb = openpyxl.load_workbook(path_or_bytes if isinstance(path_or_bytes, str) else io.BytesIO(path_or_bytes),
                                read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    header = [str(h).strip().lower() if h else "" for h in rows[0]]

    def col(*names):
        for n in names:
            for i, h in enumerate(header):
                if n in h:
                    return i
        return None

    ci = {"name": col("názov", "nazov", "poskytovat", "zariaden"),
          "kind": col("druh", "forma", "typ služby", "služba"),
          "city": col("obec", "mesto", "sídlo", "sidlo"),
          "address": col("adresa", "ulica"),
          "contact": col("mail", "e-mail", "telef", "kontakt")}
    out = []
    for idx, r in enumerate(rows[1:], start=2):
        def g(k):
            return str(r[ci[k]]).strip() if ci[k] is not None and r[ci[k]] is not None else ""
        name = g("name")
        if not name:
            continue
        out.append({"ext_id": f"vuc:{kraj}:{idx}", "name": name, "kind": g("kind") or "sociálna služba",
                    "region": kraj, "city": g("city"), "address": g("address"), "contact": g("contact"),
                    "source": f"Register soc. služieb — {kraj} (VÚC)", "fetched_at": _now()})
    return out


def fetch_region(reg):
    """Stiahne a zparsuje jeden krajský register. HTML kraje = TODO per-kraj selektor."""
    import urllib.request
    ua = {"User-Agent": "TAMITOS-vuc/1.0"}
    if reg["fmt"] == "xlsx":
        req = urllib.request.Request(reg["url"], headers=ua)
        with urllib.request.urlopen(req, timeout=60) as r:
            return parse_xlsx_register(reg["kraj"], r.read())
    # HTML kraje: každý má inú tabuľku — doplní sa selektor (BeautifulSoup) podľa stránky.
    # Vrátime [] kým nie je per-kraj parser hotový, nech beh nespadne.
    return []


def run_all():
    all_rows = []
    for reg in VUC_REGISTERS:
        try:
            rows = fetch_region(reg)
            all_rows += rows
            print(f"  {reg['kraj']}: {len(rows)}")
        except Exception as e:
            print(f"  {reg['kraj']}: chyba — {e}")
    return all_rows


if __name__ == "__main__":
    rows = run_all()
    print(f"Spolu: {len(rows)} poskytovateľov soc. služieb (VÚC)")
