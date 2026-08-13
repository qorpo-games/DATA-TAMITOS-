# TAMITOS Health — registrácia (Cognito) + newsletter

Hybridný model: písať sa dá **anonymne**, alebo sa rodič **voliteľne prihlási**
cez existujúce QORPO **AWS Cognito**. Prihlásený user má výhody a môže dať
**súhlas s TAMITOS newsletterom**. Všetko sa ukladá do **TAMITOS databázy**.

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
`backend/auth.py` overí token voči Cognito JWKS. Integrácia do
`community_lambda.py` (funkcia `submit`) — 5 riadkov:

```python
from auth import verify_cognito_jwt
claims = verify_cognito_jwt(event)
trusted = claims is not None
# ak trusted:  preskoč _verify_turnstile,  DAILY_CAP = 30,  nick = claims["nick"], badge = "verified"
if trusted:
    ok, why = _rate_ok(ip)   # stále light rate-limit, ale bez captchy
else:
    if not _verify_turnstile(body.get("captcha",""), ip): return _resp(403, {...})
```

## Frontend (Angular)
- **Login**: Cognito Hosted UI (OAuth redirect) alebo Amplify Auth; po prihlásení
  drž `id_token` a posielaj ho v `Authorization` hlavičke z `CommunityService`.
- **Newsletter checkbox** pri registrácii → nastaví Cognito atribút
  `custom:newsletter`. (Custom atribút vytvoriť v User Poole.)
- Komponent `komunita.component.ts` už má miesto pre stav prihlásenia; stačí
  doplniť `auth.service.ts` (login/logout/token) a checkbox do sign-up formu.

## Config (env)
- Post-confirmation Lambda: `USERS_TABLE`, `NEWSLETTER_TABLE`.
- Community Lambda (auth): `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`.
- Závislosť pre auth: `pyjwt[crypto]`.

Doplň mi tieto 3 Cognito hodnoty (region, user pool id, app client id) a JWT
integráciu zapojím naostro do community Lambdy.
