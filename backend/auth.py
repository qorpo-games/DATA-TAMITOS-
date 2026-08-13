"""
TAMITOS Health — overenie Cognito JWT (dôveryhodná cesta pre komunitu).

Ak používateľ pošle v hlavičke `Authorization: Bearer <id_token>`, community
Lambda ho overí voči Cognito JWKS. Prihlásený user = dôveryhodná cesta
(preskočí captcha, vyšší limit, overená prezývka, odznak „overený").

Integrácia v community_lambda.py (submit):
    from auth import verify_cognito_jwt
    claims = verify_cognito_jwt(event)
    trusted = claims is not None
    # ak trusted: preskoč _verify_turnstile, zvýš DAILY_CAP, nick = claims['nick']

Env: COGNITO_REGION, COGNITO_USER_POOL_ID, COGNITO_APP_CLIENT_ID.
Závislosť: PyJWT[crypto] (pip install "pyjwt[crypto]").
"""
import os, json, urllib.request, time

REGION = os.environ.get("COGNITO_REGION", "")
POOL = os.environ.get("COGNITO_USER_POOL_ID", "")
CLIENT = os.environ.get("COGNITO_APP_CLIENT_ID", "")

_JWKS = {"keys": None, "ts": 0}


def _jwks():
    if not (REGION and POOL):
        return None
    if _JWKS["keys"] and time.time() - _JWKS["ts"] < 3600:
        return _JWKS["keys"]
    url = f"https://cognito-idp.{REGION}.amazonaws.com/{POOL}/.well-known/jwks.json"
    with urllib.request.urlopen(url, timeout=6) as r:
        keys = json.load(r).get("keys", [])
    _JWKS["keys"], _JWKS["ts"] = keys, time.time()
    return keys


def verify_cognito_jwt(event):
    """Vráti claims dict ak je token platný, inak None (anonymná cesta)."""
    try:
        import jwt  # PyJWT
        from jwt.algorithms import RSAAlgorithm
    except ImportError:
        return None
    h = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    auth = h.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    keys = _jwks()
    if not keys:
        return None
    try:
        kid = jwt.get_unverified_header(token).get("kid")
        jwk = next((k for k in keys if k["kid"] == kid), None)
        if not jwk:
            return None
        key = RSAAlgorithm.from_jwk(json.dumps(jwk))
        claims = jwt.decode(token, key, algorithms=["RS256"], audience=CLIENT or None,
                            issuer=f"https://cognito-idp.{REGION}.amazonaws.com/{POOL}")
        return {"sub": claims.get("sub"), "email": claims.get("email"),
                "nick": claims.get("preferred_username") or claims.get("nickname") or "Overený rodič"}
    except Exception:
        return None
