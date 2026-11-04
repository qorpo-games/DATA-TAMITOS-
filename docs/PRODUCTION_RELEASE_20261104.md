# Produkčný release Tamitos — 4. 11. 2026

## Overený stav

Webové rozšírenie je nasadené na https://tamitos.com/sk/spolu/adresar .
Web PR #68 je merged, release commit `605c862be1f4da2f9d80f5571869ccd7bcabbc3a`.
Produkčný workflow úspešne skončil: https://github.com/qorpo-games/tamitos-site-deploy/actions/runs/41834014001 .

HTTP kontrola živého adresára vrátila 200, HTML obsahuje všetkých päť nových kategórií a označenie Tamitosu ako spracovateľa. Živý súbor `/parent-hub/provider-directory.js?v=a16090711a` sa presne zhodoval s releasovým zdrojom; SHA-256 `6a7eac0daf041336dc3d9b1294e65bb27a7f7e2b0e91c3522f6e3b2c58860b0a`. Vo verejnom adresárovom HTML nebol odkaz na sekundárnu platformu.

**Backendové rozšírenie a nový import zatiaľ NIE SÚ nasadené.** Overenie o 13:04 UTC / 14:04 Europe/Bratislava:
- /provider-sources: deväť pôvodných zdrojov; 12 nových školských/dentálnych rozsahov chýba.
- social_services: 5 666; medical_rehabilitation: 1 031; counselling: 161.
- kindergarten, special_kindergarten, primary_school, special_primary_school a dental: zatiaľ 0 v produkčnom indexe.
- GET /provider-review bez prihlásenia vracia 401.

Web tento čiastočný stav priznáva poznámkou o dopĺňaní školských a zubných záznamov. Poznámka zmizne až po úspešnom publikovaní všetkých 12 nových rozsahov. Nulový počet nie je dôkaz, že v oficiálnom registri dané zariadenia neexistujú.

## Čo zostáva dokončiť

Backend PR #8 je v main, merge commit `fd337497f71213e30d5d490ac01a00a71ea02707`. Má 98 prechádzajúcich testov. Nasadiť aktuálny ingest/read/review kód a závislosť xlrd==2.0.2 cez existujúcu autorizovanú backendovú CloudShell session, potom spustiť import a obnoviť čítací index. Zachovať aktuálne nastavenia a pripraviť rollback. Aktuálny produkčný deployment môže používať kontajnerové obrazy; zistiť reálny PackageType, nepoužiť naslepo historický ZIP/Terraform postup.

Schválená read-only diagnostika v účte 884945122168 potvrdila, že existujúca rola tamitos-site-deploy nemá prístup k API Gateway route/integration inventory ani Lambda listu. Oprávnenia sa nemenili. Táto rola je cesta pre webový pipeline, nie potvrdený backendový deploy prístup.

Backendové zadanie bolo s výslovným súhlasom používateľa odovzdané existujúcej deploy session. Tá pripravila rollback a nasadzovací skript, ale jej AWS konzola hlásila Unable to load content; backend zatiaľ nespustila. Potrebuje obnovenú fungujúcu autorizovanú konzolu operátora. Nepýtaj si heslá ani kľúče do chatu a nerozširuj webovej role oprávnenia ako obchádzku.

## Kde hľadať údaje a pokračovať

Čítaj [NEXT_SESSION_DIRECTORY.md](NEXT_SESSION_DIRECTORY.md) pre presné importéry, kategórie, zdrojové URL, API dotazy, lokálne snímky, schema a bezpečnostné hranice.
Skutočná školská/dentálna validačná snímka má 9 453 nových zdrojových ID; ešte to nie je produkčný počet.

Po dokončení backendu over /provider-sources, všetkých päť nových kategórií, source_observed_at pri školách, žiadne súkromné polia, bezpečnostné hlavičky, existujúce kategórie aj zmiznutie dočasnej poznámky. Až potom označiť celý release ako dokončený a tento dokument aktualizovať. Samotný webový deploy neznamená dokončený dátový import.
