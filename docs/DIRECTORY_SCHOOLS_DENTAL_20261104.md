# Školy, škôlky, sociálne služby a zubné pracoviská

## Verejná metodika a označenie

Údaje spracúva Tamitos z verejných oficiálnych zdrojov CVTI SR, MPSVR SR a e-VÚC. Tamitos vykonáva normalizáciu, deduplikáciu a automatické kontroly; individuálne potvrdenie poskytovateľom je samostatný stav. Pri každom zázname zostávajú skutočné zdrojové URL a dátumy. Google Maps sa nesmie uvádzať ako zdroj týchto registrov. Výskumné poznámky o iných platformách nie sú súčasťou verejnej metodiky ani produktových výstupov.

## Naše priame zdroje a rozsah

- Sociálne služby: už implementovaný celoštátny IS SoS MPSVR, https://sos.mpsvr.gov.sk/pm/poskytovatel-sos a export `/pm/api/services/export`. Zahŕňa všetky validované aktívne druhy v exporte, nielen zariadenia pre autizmus. Presný rozsah predchádzajúceho importu je v SOCIAL_REHAB_PROVIDER_REVIEW.md. Žiadne nové tvrdenie o úplnosti celého sociálneho sektora mimo registra.
- Školy: oficiálna stránka https://www.cvtisr.sk/informacie-o-skolstve/registre/zoznamy-skol-a-skolskych-zariadeni/ odkazuje na `https://www.cvtisr.sk/wp-content/uploads/buxus/docs/JC/zoznamy/{ms,specms,zs,speczs}_z.xls`. Obsahuje školy vykazujúce štatistický výkaz; nejde o živú kapacitu ani automatické potvrdenie súčasnej prevádzky. Aktuálny register RIS je samostatný doplnkový zdroj: https://crinfo.iedu.sk/RISPortal/register/ . Tento adaptér RIS zatiaľ nesťahuje.
- Zubné pracoviská: oficiálne krajské e-VÚC indexy objavené z https://www.e-vuc.sk/ . Dve vyhľadávania na kraj (`search_kraj=zub`, `search_kraj=stomat`) a kontrola skutočného odborného zamerania pokrývajú zubné lekárstvo, stomatologické a čeľustné/dentoalveolárne pracoviská. Nie je to zoznam všetkých jednotlivých zubárov, dentálnych hygienikov či špecialistov na autizmus. Rušené `canceled-row` sa vylučujú. Rovnaký kód zariadenia z oboch dotazov sa publikuje iba raz.

Overená lokálna snímka stiahnutá 4. 11. 2026:

| Zdroj | Jedinečné záznamy | Dátum pozorovania |
| --- | ---: | --- |
| Bežné MŠ | 3 163 | 15. 9. 2025 |
| Špeciálne MŠ | 101 | 15. 9. 2025 |
| Bežné ZŠ | 2 032 | 15. 9. 2025 |
| Špeciálne ZŠ | 249 | 15. 9. 2025 |
| Zubné pracoviská, 8 krajov | 3 908 | zdroj neuvádza jednotný dátum pozorovania |
| Nové záznamy spolu | 9 453 | nesčítavať ako počet organizácií |

Zubné pracoviská podľa kraja: BB 363, BA 944, KE 519, NR 391, PO 451, TN 376, TT 350, ZA 514. Počty sú validačná snímka, nie konštanty aplikácie. Záznam jednej školy môže byť vo viacerých stupňoch a nejde o počet unikátnych organizácií naprieč zdrojmi.

## Ako sa spracujú

`directory_extensions.py` číta BIFF XLS cez xlrd 2.0.2. Overuje schému, EDU ID, kraj, rok a dátum v titulku. Opakované riadky špeciálnych škôl podľa postihnutia zlúči do jedného EDU ID v danom zdrojovom rozsahu; zamerania zachová. Pri konflikte názvu/adresy zadrží celý zdroj. Počty žiakov sa neimportujú ako kapacita či voľné miesta. Email a telefón sa nevymýšľajú; CVTI uvádza, že ich v týchto súboroch aktuálne neposkytuje.

Identita školy je `cvti-{typ}:{eduid}`, zdrojový rozsah `cvti-{typ}`. Rozsahy oddeľujú stupne a kategórie; spoločné EDU ID možno neskôr použiť na riadené prepojenie. `source_observed_at` je dátum štatistickej snímky, `fetched_at` čas nášho načítania. Dátum pozorovania sa nevydáva za aktualizáciu registra. Pôvodné URL, súborové SHA-256 a verzia parsera zostávajú v databáze. Verejné API sprístupňuje dátum pozorovania a poznámku o pokrytí.

Dentálne dáta sú rozsahy `evuc-dental-{kraj}` so stabilným kódom zariadenia. Dentálny ext_id/service_id používa prefix `evuc-dental:`, pričom branch_id zostáva `evuc:`. Kontrola voči predchádzajúcej rehabilitačnej snímke našla tri spoločné kódy zariadení; samostatný priestor ID bráni prepísaniu existujúcej rehabilitačnej služby. Oba dotazy kraja musia uspieť pred publikovaním aj vyraďovaním starých ID; pri zlyhaní sa podrží posledná dobrá verzia. Publikovanie používa existujúcu ochranu poklesu nad 10 %. Rozšírenie sa pridá k existujúcim sociálnym a rehabilitačným zdrojom v lambda_ingest; ich pipeline ani nový indexový režim čítacieho API sa nenahrádzajú.

`autism_specific` pri školách vychádza len z výslovného názvu/zamerania v oficiálnom zdroji. Nie je certifikáciou vhodnosti. Zubné pracoviská tento príznak automaticky nedostávajú. Praktické úpravy (tichá čakáreň, adaptačné návštevy, podpora AAK, postup pri senzorickej citlivosti) treba overiť samostatne poskytovateľom s dátumom a dôkazom. Sedáciu či prijímanie detí nemožno vyvodzovať zo všeobecnej odbornosti.

## Release a limity

Pridať nový modul do Lambda ZIP a xlrd do kompatibilného Python layeru (upravený deploy/build.sh). Zachovať aktuálny produkčný kód, env, role a indexové optimalizácie. Nasadiť backend prvý, vykonať ingest, skontrolovať 12 nových stavov zdrojov a počty, potom web s novými filtrami. Čítací index sa obnovuje podľa existujúcej 15-minútovej cache; overiť teplý aj nový index. Rozšírenie zvyšuje veľkosť indexu a počet importných HTTP požiadaviek: sledovať duration, memory a DynamoDB spotrebu, nie sľubovať nulový náklad.

Validácia: Backendové testy prešlo; fixture replay nad štyrmi oficiálnymi XLS a 16 HTML odpoveďami vyšiel complete=true a 9 453 unikátnych ID. Webové resource/provenance/runtime testy prešli. Nejde o potvrdenie produkčného ingestu ani klinické overenie poskytovateľov. Raw XLS/HTML a interné výskumné snímky zostávajú lokálne, žiadne datasety, mapové kľúče alebo LFS assety sa do Gitu neposielajú.
