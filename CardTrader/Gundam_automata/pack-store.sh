#!/usr/bin/env bash
# Pack Crometium TCG for Chrome Web Store upload (store-ready zip).
# Usage (from anywhere):
#   ./pack-store.sh
#   ./pack-store.sh 0.8.1    # optional override version label in filename only
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

MANIFEST="$ROOT/manifest.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo "manifest.json not found in $ROOT" >&2
  exit 1
fi

VERSION="$(
  python3 - <<'PY' "$MANIFEST"
import json, sys
print(json.load(open(sys.argv[1]))["version"])
PY
)"
LABEL="${1:-$VERSION}"
OUT_DIR="$ROOT/dist"
ZIP_NAME="CrometiumTCG-${LABEL}-chrome.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"
STAGE="$OUT_DIR/stage-$$"

mkdir -p "$OUT_DIR"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# Copy extension files; exclude site, docs, tooling, junk.
# Keep CHANGELOG.md / README.md out of the package (lighter + no internal links).
rsync -a \
  --exclude '.DS_Store' \
  --exclude '.git/' \
  --exclude '.cursor/' \
  --exclude 'dist/' \
  --exclude 'web/' \
  --exclude 'docs/' \
  --exclude 'pack-store.sh' \
  --exclude 'icons/icon-source.png' \
  --exclude '*.log' \
  --exclude 'debug-*.log' \
  --exclude '.gitignore' \
  --exclude 'README.md' \
  --exclude 'CHANGELOG.md' \
  "$ROOT/" "$STAGE/"

# Sanity checks
for need in manifest.json background.js popup.html popup.js icons/icon-128.png; do
  if [[ ! -e "$STAGE/$need" ]]; then
    echo "Missing required file in package: $need" >&2
    rm -rf "$STAGE"
    exit 1
  fi
done

# Manifest must be at zip root (not nested in a folder).
rm -f "$ZIP_PATH"
(
  cd "$STAGE"
  zip -r -q "$ZIP_PATH" . \
    -x "*.DS_Store" \
    -x "**/.DS_Store"
)

rm -rf "$STAGE"

BYTES="$(wc -c < "$ZIP_PATH" | tr -d ' ')"
echo "OK: $ZIP_PATH ($BYTES bytes)"
echo
echo "Next:"
echo "  1. chrome://extensions → Load unpacked → test $ROOT"
echo "  2. https://chrome.google.com/webstore/devconsole → New item / Upload"
echo "  3. Paste listing from docs/STORE_LISTING.md"
echo "  4. Complete privacy from docs/STORE_PRIVACY_CHECKLIST.md"
echo
echo "Contents preview:"
unzip -l "$ZIP_PATH" | head -n 40
