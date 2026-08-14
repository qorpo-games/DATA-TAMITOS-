#!/usr/bin/env bash
# TAMITOS Health — jednorazový redeploy z AWS CloudShell.
# Použitie:  bash deploy/redeploy.sh
# Spraví: git pull -> build Angular -> sync do S3 -> invalidácia CloudFront
#         -> aktualizácia community + admin Lambdy.
set -euo pipefail

REGION="eu-central-1"
BUCKET="tamitos-health-web-979848238256"
DIST="E1MSJBVQDPJ56A"
LAMBDA="tamitos-health-community"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ 1/5 git pull"
git pull --ff-only

echo "→ 2/5 build frontendu (Angular, production)"
if [ ! -d node_modules ]; then npm ci || npm install; fi
npx ng build --configuration production

echo "→ 3/5 sync do S3 ($BUCKET)"
# hashované assety (JS/CSS/fonty/obrázky) -> 1 rok immutable (prehliadač ich cachuje natrvalo)
aws s3 sync dist/tamitos-health/browser "s3://$BUCKET" --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html" --exclude "assets/*"
# HTML (index.html) -> vždy revaliduj, aby nový deploy bol vidno okamžite
aws s3 sync dist/tamitos-health/browser "s3://$BUCKET" \
  --cache-control "no-cache" \
  --exclude "*" --include "*.html"

echo "→ 4/5 invalidácia CloudFront ($DIST)"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" >/dev/null
echo "   ✓ web nasadený"

echo "→ 5/5 update Lambd (community + admin)"
rm -rf /tmp/thapp && mkdir -p /tmp/thapp
cp backend/*.py /tmp/thapp/
for f in tamitos_ingest feeds_ingest feeds vuc_registers; do
  [ -f "data-pipeline/$f.py" ] && cp "data-pipeline/$f.py" /tmp/thapp/ || true
done
( cd /tmp/thapp && zip -qr /tmp/thapp.zip . )
aws lambda update-function-code --function-name "$LAMBDA" \
  --zip-file fileb:///tmp/thapp.zip --region "$REGION" >/dev/null
echo "   ✓ community lambda"
aws lambda update-function-code --function-name "tamitos-health-admin" \
  --zip-file fileb:///tmp/thapp.zip --region "$REGION" >/dev/null
echo "   ✓ admin lambda (schvaľovanie + mazanie)"

echo ""
echo "✅ HOTOVO. Over na https://data.tamitos.com (tvrdý refresh: Ctrl/Cmd+Shift+R)."
