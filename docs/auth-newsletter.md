# TAMITOS Health — registrácia (Cognito) + newsletter

Hybridný model: písať sa dá **anonymne**, alebo sa rodič **voliteľne prihlási**
cez **AWS Cognito**. Prihlásený user má výhody a môže dať **súhlas s TAMITOS
newsletterom**. Všetko sa ukladá do **TAMITOS databázy**.

> ⚠️ **Samostatný pool.** TAMITOS má mať **vlastný Cognito User Pool
> (`tamitos-users`)** — oddelený od existujúceho `daoblackswan` (DAO pool, ~1652
> userov). Rovnaký AWS účet (979848238256), región **eu-central-1**. Nový pool
> sa vytvorí v deploy kroku (Terraform) spolu s `custom:newsletter` atribútom,
> app clientom a post-confirmation triggerom. Referenčná podoba (z daoblackswan):
> OIDC/JWKS `https://cognito-idp.eu-central-1.amazonaws.com/<POOL_ID>/.well-known/…`.

## Prečo hybrid
Povinný účet pri citlivej téme (autizmus dieťaťa) odradí väčšinu rodičov od
zdieľania. Anonym + voliteľná registrácia = najviac príspevkov aj možnosť
budovať identitu/reputáciu pre tých, čo chcú.

## Výhody prihláseného usera
Rezervovaná prezývka · edit/delete vlastných príspevkov · preskočí captcha ·
vyšší denný limit · odznak „overený rodič".

## Dátový model (TAMITOS DynamoDB)
- `th_users` — PK `sub` (Cognito sub). Atrib.: email, nick, newsletter_consent, created.
- `th_newsletter` — PK `email`. Atrib.: sub, consent, consent_at, status, unsubscribed.
  (status začína `pending_double_optin` → po kliknutí v e-maili `subscribed`.)

## Tok registrácie + newsletter
```
[Cognito Hosted UI signUp]  ── custom:newsletter = true/false (checkbox) ──►
        │  (po potvrdení e-mailu)
        ▼
[Post-Confirmation Lambda: cognito_post_confirmation.py]
        ├─► th_users (vždy)
        └─► th_newsletter (LEN pri súhlase, GDPR double opt-in)
```
Trigger sa zapne v **Cognito User Pool → Triggers → Post confirmation**.

## GDPR
Súhlas je **explicitný** (checkbox, nie predvyplnený) a ukladá sa s časom a
zdrojom. Odporúčaný **double opt-in**: po registrácii potvrdzovací e-mail;
`status` sa zmení na `subscribed` až po kliknutí. Každý e-mail má
**unsubscribe** (nastaví `unsubscribed=true`).

## Dôveryhodná cesta pre komunitu (JWT)
Prihlásený user pošle v požiadavke `Authorization: Bearer <id_token>`.
`backend/auth.py` overí token voči Cognito JWKS. Zapojené v
`community_lambda.py`: anonym = captcha + prísny limit; prihlásený = bez captchy,
limit 30/deň, overená prezývka + `verified:true`.

## Frontend (Angular)
- **Login**: Cognito Hosted UI (OAuth redirect) alebo Amplify Auth; po prihlásení
  drž `id_token` a posielaj ho v `Authorization` hlavičke z `CommunityService`.
- **Newsletter checkbox** pri registrácii → nastaví Cognito atribút
  `custom:newsletter`. (Custom atribút vytvoriť v novom User Poole.)
- Komponent `komunita.component.ts` už má miesto pre stav prihlásenia; stačí
  doplniť `auth.service.ts` (login/logout/token) a checkbox do sign-up formu.

## Config (env) — vyplní sa hodnotami NOVÉHO `tamitos-users` poolu
- Post-confirmation Lambda: `USERS_TABLE=th_users`, `NEWSLETTER_TABLE=th_newsletter`.
- Community Lambda (auth): `COGNITO_REGION=eu-central-1`,
  `COGNITO_USER_POOL_ID=<nový tamitos-users pool>`, `COGNITO_APP_CLIENT_ID=<nový app client>`.
- Závislosť pre auth: `pyjwt[crypto]`.

Kód je hotový a **JWT dôveryhodná cesta je zapojená v `community_lambda.py`**
(anonym = captcha + prísny limit; prihlásený = bez captchy, limit 30/deň,
overená prezývka + `verified:true`). Stačí pri deployi vyplniť env hodnoty
nového poolu. Pozn.: `auth.py` musí byť v tom istom Lambda balíku ako
`community_lambda.py`.
