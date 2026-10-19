#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
version=$(node -p "require('./manifest.json').version")
archive="dist/gripread-v${version}.zip"
rm -f "$archive"
files=(manifest.json background.js content.js content.css popup.html popup.js popup.css icons lib viewer vendor content-docs.js content-docs-main.js content-docs-init.js content-docs.css)
if command -v zip >/dev/null 2>&1; then
  zip -qr "$archive" "${files[@]}"
else
  python3 -m zipfile -c "$archive" "${files[@]}"
fi
