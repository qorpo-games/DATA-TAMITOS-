# Dátová vrstva: zmeny po audite Kompasio

## Výsledné správanie

Čítacie API už nezahodí LastEvaluatedKey pri prvých 200 položkách. Vracia next_cursor, returned_count a coverage. Klient musí pokračovať až po null cursor; end_of_scan znamená koniec čítania tabuľky, nie úplnosť pôvodného registra. total_matching zostáva null. Limity 1–500 a rozsah kurzora sú validované.

Import CVTI má názov a URL zdroja, presnú URL XLSX, SHA-256 obsahu, hárok/riadok, verziu parsera a príznak neovereného importu. Samostatne zachová web poskytovateľa. V oficiálnom súbore zachytenom 2. 11. 2026 bolo 161 pomenovaných záznamov a 126 webov; žiadne telefónne/emailové stĺpce. Tieto počty nie sú konštantou aplikácie ani zárukou úplnosti všetkých pobočiek. Prázdny kontakt zostáva neznámy.

ClinicalTrials.gov už uchová aj URL konkrétnej štúdie, ID zdroja, parser_version a source_updated_at podľa lastUpdatePostDateStruct. Dátum importu sa nemení na dátum odborného overenia. Slučka stránkovania odmieta opakovaný token a chybnú odpoveď bez studies array. Lambda normalizuje všetky štúdie pred otvorením writeru.

Angular dátová stránka už nezobrazuje pôvodné placeholdery 9400, priemerný vek diagnózy 4,5 a ilustračné regionálne/vekové grafy. Ukazuje WHO/CDC s populáciou a obdobím a samostatne odkazuje na zverejnený slovenský poisťovňový agregát. Necelí medzery v dátach vymysleným modelom.

## Overené primárne zdroje

- WHO: https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders — svet/všetky veky, 2021, približne 1/127, vydanie 2025-09-17.
- CDC: https://www.cdc.gov/mmwr/volumes/74/ss/ss7402a1.htm — 8-roční, 16 lokalít ADDM, 2022, 32,2/1000; publikácia 2025-04-17.
- CVTI: https://www.cvtisr.sk/informacie-o-skolstve/vyskumy-a-prevencia/zariadenia-poradenstva-a-prevencie/
- Použitý CVTI súbor: https://www.cvtisr.sk/buxus/docs//prevencia/CPP_SCPP/Adresar_organizacii_CPP_SCPP_2.xlsx
- ClinicalTrials API: https://clinicaltrials.gov/api/v2/studies — súčasný importný dotaz query.cond=autism, pageSize=100, bez filtra lokality v Lambda handleri.
- Slovenská sekundárna publikácia: https://github.com/Modra-hliadka/data-o-autizme/blob/498eb38e53a342132005cc5d79fd2f5bb61973c9/README.md — 35029 za 2025; nie populačná prevalencia, problematické prestupy a modelový vek × kraj. Pôvodné poisťovňové súbory neboli nezávisle overené.

## Nasadenie a kompatibilita

1. Review a merge tejto dátovej vetvy. Samotný merge nie je dôkazom nasadenia Lambda kódu.
2. Release owner musí overiť aktuálny AWS účet, API Gateway integráciu a Lambda funkcie obsluhujúce súčasné API. Staré infra/README.md a deploy/redeploy.sh odkazujú na starší účet. Nespúšťať ich naslepo.
3. Nasadiť read handler a ingest modul do správnych existujúcich funkcií. Nepoužívať Terraform apply zo starého účtu na migráciu tejto opravy.
4. Overiť GET /studies?limit=1 a pokračovanie kurzorom. Žiadna stránka nesmie byť prezentovaná ako celý upstream dataset.
5. Po úspešnom importe skontrolovať source_url, source_file_url, source_sha256, website a source_updated_at. Staré záznamy bez nových polí zostávajú čitateľné.
6. Následne pripojiť webovú vetvu feat/data-provenance-20261102 v qorpo-games/tamitos-site-deploy. Web má spätnú kompatibilitu, ale pri starom API nedokáže obnoviť zahodené pokračovanie; zobrazí neoverenú úplnosť.

## Validácia

`python -X utf8 -m unittest discover -s tests -v` — 54 testov prešlo vrátane ôsmich nových testov stránkovania a proveniencie; testy nevykonávajú AWS zápisy.

`npm run build` — Angular production build prešiel. Existujúce inline Google Fonts vyžadujú sieť pri builde.

## Zostávajúce limity

- Hash neznamená archív pôvodných bajtov. Nemenné source_snapshot úložisko, verzovaná publikácia a rollback sú ďalšia samostatná zmena.
- DynamoDB batch writer nie je transakčná výmena celej kolekcie. Výpadok zápisu môže stále zanechať čiastočnú aktualizáciu; nevykonáva sa automatické mazanie starej kolekcie.
- Staré ext_id cvti:riadok ostáva zachované kvôli kompatibilite. Presuny riadkov a nepomenované elokované pobočky potrebujú model organizácia/pobočka a kontrolovanú migráciu ID.
- Čísla v public API samy nepreukazujú aktuálnu verziu nasadeného serverového kódu. Bez overenia nasadenia netvrdiť, že produkcia už používa tieto opravy.
- NCZI/školské agregáty, overovanie kapacít a kontaktný review workflow neboli v tejto sade implementované.
- VÚC sociálne služby zatiaľ nie sú pokryté: vuc_registers.py je kostra; HTML adaptéry vracajú prázdne pole, XLSX vetva potrebuje overený priamy súbor. Neprezentovať tieto zdroje ako úspešne importované.
- Importované CVTI centrum v Angular adresári nedostáva automatický štítok evidence=good. Autoritatívny adresár nepreukazuje účinnosť služby ani aktuálnu kapacitu; karty využijú novú hodnotu website.
