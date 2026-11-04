# Označenie zdrojov a ochrana dát

Verejná formulácia: **Údaje spracúva Tamitos. Zdroje: CVTI SR, register sociálnych služieb MPSVR SR a krajské registre e-VÚC. Záznamy zjednocujeme a automaticky kontrolujeme. Pôvod a dátum údajov uvádzame pri každom zázname; individuálne potvrdenie poskytovateľom uvádzame osobitne.**

Tamitos je spracovateľ adresára, nie pôvodca úradných registrov. Google Maps by bol zdrojom mapového podkladu, nie záznamov týchto importérov. Sekundárne národné agregáty, ku ktorým nemáme overené primárne vstupy, sa nezverejňujú pod našou značkou.

## Implementované hranice

- Import beží na serveri; frontend nedostáva databázové, AWS ani administrátorské prihlasovacie údaje.
- Verejné provider odpovede v kurzorovom aj indexovom režime používajú zoznam povolených polí. Interné poznámky, identity evidence, tokeny a tokenové hashe sa neexportujú.
- Administrátorské review operácie vyžadujú token kontrolovaný na serveri. Neplatný Unicode token v hlavičke vráti 401 namiesto pádu handlera. Statická administračná stránka nie je bezpečnostnou hranicou.
- Provider výzvy sú náhodné, uložené hashované, časovo obmedzené a jednorazové. Návrh vyžaduje schválenie. Potvrdenie neznamená klinickú certifikáciu.
- Review odpovede a štandardné API odpovede majú no-store a nosniff. Verejný index vedome povoľuje max-age=60; neobsahuje súkromné polia. Review používa aj no-referrer.
- Súkromná review tabuľka má v infra šablóne SSE, PITR, TTL a obmedzené IAM oprávnenia. Existujúca API stage šablóna obsahuje throttling 20/s, burst 40. Skutočné produkčné nastavenia nie sú touto lokálnou kontrolou potvrdené.

## Čo treba overiť pri produkčnom nasadení

Nasadiť aktuálny backend a overiť unauthenticated review=401, neplatný provider token, povolené verejné polia, hlavičky, existujúce šifrovanie tabuľky, IAM a skutočné API throttling nastavenia. Request/response logovanie nesmie ukladať admin token ani celé potvrdenia. Rate limit na stage je celkový limit; ochrana podľa IP vyžaduje podporovanú edge/proxy konfiguráciu a nevyplýva automaticky z CORS. Administrátorský zdieľaný token je existujúce riešenie; osobné účty s rolami/MFA sú samostatné budúce rozšírenie.

Verejné údaje, ktoré návštevníkovi zobrazíme, nemožno urobiť nekopírovateľnými. Frontendové šifrovanie alebo skrytie URL nie je náhrada autorizácie. Chránime súkromné údaje, interné procesy a prevádzku, pričom pravdivý pôvod verejných údajov zostáva viditeľný.
