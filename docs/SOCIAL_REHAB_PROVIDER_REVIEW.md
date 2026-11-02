# Sociálne služby, rehabilitácie a pravidelné potvrdenia

Tento dokument nahrádza staršie poznámky, že VÚC import je iba kostra. Zmena je zdrojový kód a overené lokálne snímky, nie potvrdenie produkčného nasadenia.

## Zdroje a overený rozsah (2. 11. 2026)

1. MPSVR IS SoS, oficiálny celoštátny export: https://sos.mpsvr.gov.sk/pm/api/services/export
   - Verejná stránka s tlačidlom exportu: https://sos.mpsvr.gov.sk/pm/poskytovatel-sos
   - Aktualizácia zdroja: https://sos.mpsvr.gov.sk/pm/api/timestamp (snímok `2026-11-01 23:30`; zdroj neurčuje časové pásmo, nepreznačovať na UTC).
   - 5 664 aktuálnych služieb v ôsmich krajoch; z toho 106 včasných intervencií, 32 samostatných sociálnych rehabilitácií, 36 rehabilitačných stredísk, 436 DSS, 407 špecializovaných zariadení.
   - Jeden ID služby nie je jedna organizácia. Sociálna rehabilitácia môže byť súčasťou iného druhu služby; 32 neznamená všetky jej formy v SR.
2. e-VÚC: odkazy pre všetkých osem krajov sa objavia na https://www.e-vuc.sk/ . Import používa skutočný filter `search_kraj=rehabilit` a kontroluje odborné zameranie.
   - 1 042 nezrušených záznamov zdravotnej rehabilitácie: BB 113, BA 220, KE 165, NR 96, PO 159, TN 98, TT 103, ZA 88.
   - HTML zahŕňa aj `canceled-row` s display:none. Tieto riadky sa musia vylúčiť, inak je počet nesprávny (s nimi vychádzalo 1 255).
   - Ide o registrované pracoviská nájdené daným filtrom, nie každého fyzioterapeuta či úplnú evidenciu súkromných podporných aktivít. Rozsah je viditeľný pri zdroji.
3. CVTI CPP/ŠCPP zostáva samostatný import: 161 pomenovaných záznamov / 126 webov v overenom súbore. Iné zameranie služby nesmie byť zamieňané s diagnostickým či autizmus-špecifickým centrom.

Spolu nové zdroje poskytli 6 706 jedinečných službových ID. Nie všetky služby sú pre deti alebo autizmus. Skutočný importný počet sa môže meniť; tieto čísla nie sú konštanty aplikácie.

## Import a zachovanie kvality

`data-pipeline/public_registers.py` validuje presné hlavičky, typy, ID, termíny poskytovania, opakované ID a rozloženie HTML. Používa stabilné `issos:<service-id>` a `evuc:<facility-code>` namiesto čísla riadka. IČO pomáha priradiť organizáciu; pobočky a služby zostávajú oddelené. Zodpovedné osoby a mená štatutárov z exportu sa neimportujú.

Proveniencia: source_url, source_record_id, source_sha256, source_updated_at, fetched_at, parser_version. Web/telefón/email sa preberá iba z dodaného verejného kontaktu. Neznáma kapacita je null, nie 0. Voľné miesta v IS SoS sú údaj k času aktualizácie, nie rezervácia. Vek a cieľová skupina sú prevzaté ako zdrojové údaje. Autism_specific sa nastaví len pri výslovnom uvedení vo zdrojovej cieľovej skupine/informáciách; iné rehabilitácie sa netvária ako autizmus-špecializované.

`backend/register_publication.py` najprv prijme validovanú množinu. Výpadok jedného zdroja neodstráni jeho posledné dobré záznamy. Zmiznuté ID sa označí active=false iba po úspešnom refreshi príslušného zdroja. Nečakaný pokles viac než 10 % sa zadrží na manuálnu kontrolu ešte pred zápisom. Schválenie legitímneho poklesu: dôveryhodný operátor vyvolá ingest Lambda s `{"approved_shrink_sources":["issos"]}` po overení zdroja. Táto Lambda nemá verejnú HTTP invoke cestu.

Stav deviatich zdrojov je uložený v súkromnej review tabuľke; GET /provider-sources zverejní iba bezpečný prehľad stavu a počtov. Import nie je automatické potvrdenie poskytovateľom.

Batch zápisy nie sú transakčná výmena celej zdrojovej kolekcie. Pri databázovom výpadku počas batch zápisu môže byť aktualizácia čiastočná; vyradenie starých ID sa v takom prípade nespustí a stav zdroja je publish_failed. Nemenný archív originálnych bajtov a plne atomické verzie kolekcie zostávajú ďalšie samostatné rozšírenie.

## Pravidelné potvrdzovanie

Súkromná tabuľka `PROVIDER_REVIEW_TABLE` sa nesmie zverejniť cez všeobecný scan API. Obsahuje identity evidence a hashované výzvy. Potvrdenia sú oddelené od importu a neprepisujú originálny záznam.

1. Rodič vidí pôvodný zdroj, stav a dátumy. Poskytovateľ môže požiadať redakciu o overenie cez odkaz v karte.
2. Moderátor otvorí `/parent-hub/provider-admin.html`, zadá existujúci admin token (iba pamäť, nie úložisko prehliadača), overí oprávneného zástupcu cez oficiálnu doménu, zverejnený spätný kontakt alebo dokument a uloží referenciu dôkazu.
3. POST /provider-review s action=issue vydá náhodný 256-bitový odkaz na sedem dní. V tabuľke je iba hash; v URL je token vo fragmente, ktorý sa neposiela serveru. Odkaz sa odovzdáva manuálne overenej osobe. Táto implementácia neposiela žiadne emaily ani automatické oslovovanie.
4. `/sk/spolu/potvrdenie#token=...` načíta náhľad cez POST /provider-confirmation action=preview. Zástupca výslovne vyberie polia, potvrdí oprávnenie a odošle ich action=confirm. Stav prejde na pending podmieneným jednorazovým zápisom.
5. Moderátor skontroluje presný obsah. Approve atomicky zmení stav návrhu a uloží potvrdené hodnoty/dátum; reject nezverejní nič. Výmena zdrojového záznamu alebo novšie potvrdenie vyvolá konflikt.
6. Verejná karta označuje konkrétne potvrdené polia. Import ani zmena celého súborového hashu neobnoví potvrdenie. Zmena konkrétnych zdrojových polí vyžaduje novú kontrolu.
7. Po 90 dňoch sa stav pri čítaní zmení na due a záznam sa objaví v administrátorskej fronte. Moderátor znovu overí zástupcu a vydá novú výzvu. Nejde o automaticky odosielané pripomienky.

Schválené potvrdenie kontaktu nepreukazuje účinnosť terapie, kvalifikáciu pre všetky služby ani voľnú kapacitu.

## API, výkon a ochrana

GET /providers podporuje q (bez diakritiky), region, category a presný kind. Kurzor je viazaný na rovnaký filter; zmena filtra vyžaduje nový začiatok. DynamoDB scan môže vrátiť prázdnu stránku s pokračovaním. Nesmie sa to vydávať za nulu služieb.

Web načítava malé stránky a vykresľuje po 30 kartách. Neposiela celú databázu na každé otvorenie. Public API používa allowlist polí; interné poznámky, indexové texty, dôkazy overenia a tokenové záznamy sa nezobrazujú. Základný API Gateway throttling už existuje v infra šablóne; jeho skutočné produkčné nastavenie treba overiť pri releasi. Šifrovanie tabuľky a obmedzená IAM rola pre review sú v provider-review.tf. Verejné údaje zobrazené návštevníkovi nemožno technicky urobiť nekopírovateľnými.

Súčasné listovanie používa DynamoDB Scan, nie geografický alebo fulltextový index. Menšie odpovede šetria prenos a DOM, ale filtrovací scan stále číta kapacitu databázy. Pri raste používania zaviesť index/cache a merať spotrebu; nesľubovať náklady podľa samotného počtu vrátených položiek.

## Release — nespúšťať starý účet naslepo

1. Overiť aktuálny AWS účet a API Gateway integrácie. Staré Terraform/redeploy odkazy môžu smerovať do pôvodného účtu; v tejto úlohe sa infra nenasadzovala.
2. Doplniť beautifulsoup4 do ingest layeru a public_registers.py do ZIP. backend/*.py zahŕňa nové register_publication.py a provider_review.py.
3. V aktuálnom účte vytvoriť/importovať review tabuľku (id hash key, TTL ttl, šifrovanie, PITR). Nastaviť PROVIDER_REVIEW_TABLE pri ingest/read/review Lambda. Pripravené zdroje a obmedzená review rola sú v infra/provider-review.tf.
4. Pripojiť routy GET /provider-sources, GET/POST /provider-review, POST /provider-confirmation; CORS musí povoliť content-type a x-admin-token z tamitos.com. Admin token nesmie byť vložený do webových súborov.
5. Nasadiť read+review API, spustiť jeden ingest a overiť deväť stavov zdrojov, filtre, source_updated_at a neprítomnosť zrušených záznamov. Prvé rozšírenie nejde cez LFS ani cez Git dataset commit.
6. Nasadiť príslušnú webovú vetvu. Overiť adresár, zdravotnú/sociálnu kategóriu, pokračovanie prázdnej scan stránky a jednorazové potvrdenie na vlastnom testovacom zázname. Produkční poskytovatelia zatiaľ neboli oslovení ani potvrdení.

## Validácia

Offline parser replay nad zachyteným oficiálnym CSV a ôsmimi HTML snímkami: complete=true, 9 zdrojov, 6 706 jedinečných služieb. Príklady a bezpečnostné regresie používajú syntetické údaje v tests/test_public_registers.py, test_provider_review.py a test_data_read.py. Angulárny production build prešiel. Lokálny Chrome overil stránkovanie, zmenu kategórie, hľadanie a odoslanie potvrdenia do pending nad fixture API; nejde o produkčný cloudový test.
