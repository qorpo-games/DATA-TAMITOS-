"""
TAMITOS Health — Cognito Post-Confirmation trigger (AWS Lambda).

Spustí sa PO tom, čo si používateľ potvrdí registráciu vo vašom Cognito.
Zapíše používateľa do TAMITOS databázy (DynamoDB `th_users`) a — ak dal
súhlas — pridá ho do newsletter zoznamu so záznamom súhlasu (GDPR).

Všetko ostáva na TAMITOS infra: Cognito rieši identitu, ale kópia usera +
súhlas žijú vo vašej DB, odkiaľ posielate emaily.

Nastavenie: v Cognito User Pool → Triggers → Post confirmation → táto Lambda.
Custom atribút `custom:newsletter` ('true'/'false') sa nastaví pri registrácii
podľa checkboxu vo formulári (frontend ho pošle do signUp).
IAM: dynamodb:PutItem na th_users, th_newsletter.
Env: USERS_TABLE=th_users, NEWSLETTER_TABLE=th_newsletter.
"""
import os, time, json
import boto3

ddb = boto3.resource("dynamodb")
USERS = ddb.Table(os.environ.get("USERS_TABLE", "th_users"))
NEWSLETTER = ddb.Table(os.environ.get("NEWSLETTER_TABLE", "th_newsletter"))


def handler(event, context):
    attrs = (event.get("request", {}) or {}).get("userAttributes", {}) or {}
    sub = attrs.get("sub")
    email = (attrs.get("email") or "").lower().strip()
    nick = attrs.get("preferred_username") or attrs.get("nickname") or ""
    consent = str(attrs.get("custom:newsletter", "false")).lower() == "true"
    now = int(time.time())
    iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # 1) používateľ do TAMITOS DB
    if sub:
        USERS.put_item(Item={
            "sub": sub, "email": email, "nick": nick,
            "newsletter_consent": consent, "created": now, "created_iso": iso,
            "source": "cognito",
        })

    # 2) newsletter zoznam — LEN pri explicitnom súhlase (GDPR)
    if consent and email:
        NEWSLETTER.put_item(Item={
            "email": email, "sub": sub, "consent": True,
            "consent_at": iso, "status": "pending_double_optin",  # pošle sa potvrdzovací e-mail
            "unsubscribed": False,
        })

    # trigger musí vrátiť event nezmenený
    return event
