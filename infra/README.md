# TAMITOS Health — AWS nasadenie (Terraform)

Reprodukovateľná infra pre celý backend: dáta, denný job, komunitné API a
**samostatný** Cognito pool. Región **eu-central-1**. Spustí sa jedným `apply`.

## Čo to vytvorí
- **DynamoDB**: `tamitos-health-articles/-providers/-studies` (dáta) + `th_community`,
  `th_ratelimit` (TTL), `th_users`, `th_newsletter` (komunita/registrácia).
- **Lambdy**: `ingest` (denný zber → DynamoDB), `data-read` (GET API),
  `community` (POST/GET + anti-spam + Cognito JWT), `cognito-post-confirm`
  (user + newsletter súhlas → DB).
- **API Gateway (HTTP API)**: `GET /articles /providers /studies`, `GET/POST /community` + throttling.
- **EventBridge Scheduler**: denný ingest `cron(0 3 * * ? *)` = 05:00 Europe/Bratislava.
- **Cognito**: nový pool **`tamitos-users`** + web app client + `custom:newsletter`
  atribút + post-confirmation trigger + Hosted UI doména.

## Predpoklady
- Terraform ≥ 1.5, AWS CLI s prístupom do účtu **979848238256** (profil/role),
  Python 3.11 + pip (na build vrstvy), `zip`.

## Postup
```bash
# 1) zabaľ Lambda kód + závislosti
bash deploy/build.sh

# 2) infra
cd infra
terraform init
terraform apply \
  -var="turnstile_secret=<CF_TURNSTILE_SECRET>"      # anti-spam (voliteľné pre dev)

# 3) výstupy (ID poolu, client ID, API URL)
terraform output
```

Po `apply` doplň do frontendu (`environment`) hodnoty z `terraform output`:
`cognito_user_pool_id`, `cognito_app_client_id`, `api_base_url`.

## data.tamitos.com (custom doména API)
1. V ACM (eu-central-1) vydaj cert pre `data.tamitos.com` (DNS validácia).
2. Pridaj do `main.tf`:
   ```hcl
   resource "aws_apigatewayv2_domain_name" "data" {
     domain_name = "data.tamitos.com"
     domain_name_configuration {
       certificate_arn = "<ACM_ARN>"
       endpoint_type   = "REGIONAL"
       security_policy = "TLS_1_2"
     }
   }
   resource "aws_apigatewayv2_api_mapping" "data" {
     api_id      = aws_apigatewayv2_api.api.id
     domain_name = aws_apigatewayv2_domain_name.data.id
     stage       = aws_apigatewayv2_stage.default.id
   }
   ```
3. V DNS zóne `tamitos.com` pridaj CNAME `data` → target z
   `aws_apigatewayv2_domain_name.data.domain_name_configuration[0].target_domain_name`.
4. Web potom číta z `https://data.tamitos.com/articles`, `/community`, atď.
   (v Angular službách zmeň base URL z `data.tamitos.com/api` na `data.tamitos.com`).

## Frontend (Angular sekcia)
```bash
npm install && npm run build           # dist/tamitos-health/browser
```
Nasadenie: buď do **S3 + CloudFront** (statická sekcia na subdoméne/ceste),
alebo integrovať do hlavného `tamitos-ssr`. Doplň `id_token` z Cognita do
`Authorization` hlavičke v `CommunityService`.

## Cloudflare Turnstile
Vytvor widget → `sitekey` do `komunita.component.ts` (`data-sitekey`),
`secret` do `-var="turnstile_secret=..."`. Bez secretu je captcha v dev
preskočená.

## Poradie na produkcii
1. `deploy/build.sh` → 2. `terraform apply` → 3. custom doména + DNS →
4. frontend build + deploy → 5. Turnstile kľúče → 6. over: prvý beh ingestu
   (`aws lambda invoke --function-name tamitos-health-ingest out.json`).

> Cez tento sandbox sa na vaše AWS priamo nedostanem — infra je pripravená tak,
> aby ju devops (alebo ty s AWS prístupom) spustil vyššie uvedenými príkazmi.
