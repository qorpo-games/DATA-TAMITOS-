#!/usr/bin/env bash
# Zabalí Lambda kód (app.zip) a závislosti (layer.zip) pre Terraform.
# Spusti z koreňa repa:  bash deploy/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build"
rm -rf "$OUT"; mkdir -p "$OUT/app" "$OUT/layer/python"

echo "→ kód lambd do app.zip"
# všetok backend kód + pipeline moduly (importujú sa navzájom)
cp "$ROOT"/backend/*.py "$OUT/app/"
cp "$ROOT"/data-pipeline/tamitos_ingest.py "$OUT/app/"
cp "$ROOT"/data-pipeline/feeds_ingest.py "$OUT/app/"
cp "$ROOT"/data-pipeline/feeds.py "$OUT/app/"
cp "$ROOT"/data-pipeline/vuc_registers.py "$OUT/app/"
( cd "$OUT/app" && zip -qr "$OUT/app.zip" . )

echo "→ závislosti do layer.zip (python3.11)"
python3 -m pip install --quiet \
  openpyxl feedparser requests "pyjwt[crypto]" \
  --target "$OUT/layer/python" --platform manylinux2014_x86_64 \
  --implementation cp --python-version 3.11 --only-binary=:all: --upgrade
( cd "$OUT/layer" && zip -qr "$OUT/layer.zip" . )

echo "✓ hotovo: build/app.zip + build/layer.zip"
ls -lh "$OUT"/*.zip
