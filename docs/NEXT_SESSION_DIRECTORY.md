# Začni tu: adresár Tamitos — školy, škôlky, sociálne služby a zubné pracoviská

## Kde je kód

- Backend a importéry: https://github.com/qorpo-games/DATA-TAMITOS-/pull/8 . Vetva `feat/directory-schools-dentists-20261104`. Skontroluj stav PR a aktuálny main; samotný merge nie je nasadenie.
- Web: https://github.com/qorpo-games/tamitos-site-deploy/pull/68 . Rovnaká vetva. Merge do main spúšťa existujúci produkčný deploy na tamitos.com; najprv musí fungovať backend.
- Backend: `data-pipeline/public_registers.py`, `data-pipeline/directory_extensions.py`, `backend/lambda_ingest.py`, `backend/register_publication.py`, `backend/data_read_lambda.py`, `backend/provider_review.py`.
- Web: `build-parent-resources.js`, `parent-hub/provider-directory.js`, `parent-hub/source-context.js`.
- Kompletná metodika: `docs/DIRECTORY_SCHOOLS_DENTAL_20261104.md`, `docs/SOCIAL_REHAB_PROVIDER_REVIEW.md`, `docs/PUBLIC_SOURCES_AND_SECURITY.md`.

## Kde nájdeš publikované dáta

Webová stránka: https://tamitos.com/sk/spolu/adresar . Verejné API: https://jony4bp5gc.execute-api.eu-central-1.amazonaws.com . Verejné údaje čítaj cez API, nie priamym prístupom prehliadača k DynamoDB.

`GET /providers?offset=0&limit=30` vracia malú stránku, `total_matching`, `facets.category`, `next_offset`, `index_built_at`, `applied_filters`. Pokračuj podľa `next_offset`, nesčítavaj jednu stránku ako celý register. Index má existujúcu 15-minútovú cache. Alternatívny starší režim bez offset používa next_cursor; režimy nemiešaj.

Príklady filtrov:

```
/providers?offset=0&limit=30&category=kindergarten
/providers?offset=0&limit=30&category=special_kindergarten
/providers?offset=0&limit=30&category=primary_school
/providers?offset=0&limit=30&category=special_primary_school
/providers?offset=0&limit=30&category=dental
/providers?offset=0&limit=30&category=social_services
/providers?offset=0&limit=30&category=counselling
/providers?offset=0&limit=30&category=medical_rehabilitation
/provider-sources
```

Pre mesto/názov pridaj URL-encoded `q`, pre kraj `region` (napr. Žilinský kraj). `kind` je presný druh služby. `/provider-sources` ukazuje bezpečný stav importov a počty; nie interné chyby, tokeny či identity evidence.

Polia karty: ext_id, name, category, kind, address, city, region, source_name, source_url, source_file_url, source_observed_at, source_updated_at, fetched_at, target_group, availability_note. Školské `source_observed_at=2025-09-15` je dátum štatistického zisťovania, nie dnešná prevádzka/prijímanie. Neznámy kontakt nie je prázdny počet ani nulová kapacita. Schválené potvrdenia majú samostatné dátumy a zoznam konkrétnych potvrdených polí.

## Skutočné primárne zdroje

- Sociálne služby: https://sos.mpsvr.gov.sk/pm/poskytovatel-sos ; CSV https://sos.mpsvr.gov.sk/pm/api/services/export ; dátum https://sos.mpsvr.gov.sk/pm/api/timestamp . Rozsah `issos`.
- Školy a škôlky: https://www.cvtisr.sk/informacie-o-skolstve/registre/zoznamy-skol-a-skolskych-zariadeni/ ; súbory `https://www.cvtisr.sk/wp-content/uploads/buxus/docs/JC/zoznamy/{ms,specms,zs,speczs}_z.xls` . Rozsahy `cvti-ms`, `cvti-specms`, `cvti-zs`, `cvti-speczs`.
- Zdravotná rehabilitácia a zubné pracoviská: https://www.e-vuc.sk/ ; objavujú sa regionálne indexy, pri zubných pracoviskách oba dotazy `search_kraj=zub` a `search_kraj=stomat`, následne sa kontroluje odbornosť a vylučujú zrušené riadky. Rozsahy `evuc-{kraj}` a `evuc-dental-{kraj}`.
- CPP/ŠCPP: oficiálny adresár CVTI podľa existujúceho tamitos_ingest.py.

Tamitos je spracovateľ (normalizácia, deduplikácia, automatické kontroly), nie pôvodca úradných registrov. Google Maps nie je zdroj týchto záznamov. Neprezentuj import alebo zaradenie ako klinické overenie/autism-friendly certifikáciu.

## Čo je lokálne a čo v Gite

Na Romanovom/Tomasovom Windows pracovisku je checkout pod `C:\Users\Tomas\Documents\Codex\2026-10-26\files-mentioned-by-the-user-toy\work\tamitos-data` a `work\tamitos-site`. Výskumné XLS/HTML snímky sú mimo repozitárov v `work\modra-directory-research`; validácia `extension-validation.json`, normalizované dáta `extension-replay.json`. Staršie sociálne/rehabilitačné snímky sú `work\service-register-research`. Na inom PC tieto lokálne súbory nemusia byť dostupné: zdrojové URL a parsery sú v Gite. Raw datasety sa nepushujú a nemajú sa prenášať cez Git LFS.

Overená školská/dentálna snímka zo 4. 11. 2026: 3 163 bežných MŠ, 101 špeciálnych MŠ, 2 032 ZŠ, 249 špeciálnych ZŠ, 3 908 zubných pracovísk = 9 453 zdrojových ID. Nie počet unikátnych organizácií. Dentálne `ext_id=evuc-dental:<kód>` sú oddelené od existujúcej rehabilitácie `evuc:<kód>`, spoločný branch_id zachováva identitu pracoviska.

## Nasadenie a bezpečnosť

Produkčný AWS účet je 884945122168, región eu-central-1, API ID jony4bp5gc. Aktuálne Lambda názvy, tabuľky, role, layers a env treba zistiť zo skutočných integrácií; historické Terraform/deploy skripty smerujú aj na starý účet, nepúšťať ich naslepo. Backend ZIP musí obsahovať directory_extensions.py; kompatibilný layer musí mať xlrd==2.0.2 a ostatné existujúce závislosti. Zachovať ostatné moduly/config a pripraviť rollback.

Pred webovým mergom: nasadiť backend, spustiť/overiť ingest, skontrolovať 12 nových source stavov, ochranu nezvyčajného poklesu a obnovu čítacieho indexu. Pri výpadku zdroja podržať posledné dobré dáta. Aktuálny stav nasadenia potvrď živým API a release výsledkom; tento návod sám nie je dôkaz produkčného nasadenia.

V poslednej kontrole pred týmto release produkcia mala 6 858 záznamov (5 666 sociálnych, 1 031 rehabilitačných, 161 CPP/ŠCPP), bez nových školských/dentálnych kategórií. Tento údaj je prednasadzovací baseline, nie cieľová konštanta.

Súkromné tokeny, tokenové hashe, interné poznámky a identity evidence nesmú opustiť review API ani byť zabalené do JS. Admin token sa neposiela do chatu/Gitu. Overenie poskytovateľa vyžaduje kontrolu identity a schválenie; nikomu automaticky nepíš. Verejné zobrazené údaje nemožno urobiť nekopírovateľnými; CORS nie je autorizácia ani ochrana proti scrapingu.

Pred nasadením prešlo 98 backend testov a webové resource/provenance/statistics/runtime kontroly. GitHub PR CI musí byť zelené na aktuálnom head. Produkčnú kontrolu urob po reálnom nasadení; nehlás hotovo iba po pushi alebo mergi.
