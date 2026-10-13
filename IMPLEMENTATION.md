# TAMITOS Spolu, slovenská komunita

EN ostáva existujúci článkový blog. Nový hub, fórum, centrá a podpora sú iba SK.

Tento overlay vychádza z DATA main dcd6f6dd3167981f1823d3850a055492e2aa6654. Nie je nasadený.

## Pripravené

- Admin API validuje stavy, ID a akcie, nevyrobí prázdny príspevok rozhodnutím o neexistujúcom ID, ukladá posledného moderátora a čas.
- Schválenie zaradí otázku do AI práce iba pri serverovom TAMITOS_AI_ENABLED=true. Predvolene vypnuté.
- ai_replies.process má atomický DynamoDB lease, max. tri pokusy, retry a kontrolu, že rodičovský príspevok je stále schválený. Po stiahnutí otázky sa odpoveď nepublikuje.
- Poskytovateľ dostáva iba schválený text, nie profilové metadáta. Text stále môže obsahovať citlivé údaje, preto provider musí byť schválený pred živým použitím.
- Citácie sa vyberajú zo schválených SK zdrojov s platnosťou kontroly. URL nemôže dodávať model. Citácia sama neoveruje pravdivosť celej odpovede.
- Výstup je označený TAMITOS AI. Klinické témy sa automaticky nezverejňujú. Auto-publication je zatiaľ obmedzené na navigáciu k produktovým a komunitným zdrojom, ktoré redaktor výslovne schválil na automatické použitie.
- Bez ľudskej kontroly sa publikuje iba presný schválený úryvok zdroja. Voľne generované vysvetlenia sú návrhy na kontrolu, aj ak model tvrdí, že ide o produktovú navigáciu.
- Verejný zoznam dostáva ID príspevku a iba publikovanú AI odpoveď; interné návrhy, chyby a claims sa nevracajú.

## Ešte potrebné pred živým zapnutím

1. Používateľ určí AWS Bedrock alebo firemný OpenAI API a dátové pravidlá. Adaptér musí mať timeout kratší ako lease, SK prompt, JSON výstup a nulové logovanie otázok/secrets.
2. Redaktor schváli zdrojový register, aktuálnosť, povolené auto-publication kategórie. Ingestované RSS články ani klinické štúdie automaticky neznamenajú schválenie.
3. Minútový EventBridge/SQS worker, ohraničená kapacita a stránkovanie fronty. Samotné process nezaručuje odpoveď do niekoľkých minút.
4. Moderátor potrebuje akcie schváliť/stiahnuť AI návrh, detail odpovedí a audit rozhodnutí. Aktuálny DATA API ešte tieto akcie nemá.
5. Verejné vlákna, rodičovské odpovede, hlásenie obsahu a napojenie nového hubu. Pôvodný DATA systém je plochý moderovaný zoznam, nie hotové fórum.
6. Overiť API Gateway/CDN CORS pre help.tamitos.com serverový proxy. DATA_ADMIN_TOKEN ostáva iba v serverovom prostredí spoločného adminu.
7. Integračné DynamoDB testy súbehu, zrušenia a pádu workeru, red-team prompt injection a zdravotných otázok pred zapnutím auto-publication.

Nepresúvať ani nemaž starý admin, kým spoločný admin neprejde živou kontrolou. Nová správa má /admin/spolu; existujúca /admin/komunita naďalej patrí Move skupinám.
