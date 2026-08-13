# TAMITOS Health — backend (komunita)

Serverless API pre komunitné príspevky. Jedna Lambda (`community_lambda.py`) za
API Gateway, dáta v DynamoDB. Detaily a anti-spam v `../docs/updates-and-community.md`.

## Nasadenie (AWS)

1. **DynamoDB**
   - `th_community` — PK `id` (S). GSI `status-created-index`: PK `status` (S), SK `created` (N).
   - `th_ratelimit` — PK `ip` (S). Zapni **TTL** na atribúte `ttl`.
2. **Lambda** (Python 3.11) z `community_lambda.py`, IAM: `dynamodb:GetItem/PutItem/Query` na obe tabuľky.
   - Env: `POSTS_TABLE=th_community`, `RATE_TABLE=th_ratelimit`, `TURNSTILE_SECRET=<secret>`.
3. **API Gateway (HTTP API)** — routes `POST /community`, `GET /community` → Lambda.
   - Zapni **throttling** (napr. rate 5, burst 10) a ideálne **AWS WAF** rate-based rule.
4. **Cloudflare Turnstile** — vytvor widget, `sitekey` daj do frontendu
   (`komunita.component.ts`, `data-sitekey`), `secret` do Lambdy.
5. **CORS** — v Lambde je povolený origin `https://tamitos.com` (uprav podľa domény).

## Moderácia
Príspevky sú `pending`/`flagged`; jednoduchý moderačný pohľad číta `status`
a nastaví `approved`. Web (GET) vracia len `approved`.

## Lokálny test
`community_lambda.py` sa dá volať s mock `event` (bez Turnstile secret preskočí captcha).
