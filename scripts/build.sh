#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/adhd-reader.zip
files=(manifest.json background.js content.js content.css popup.html popup.js popup.css icons)
if command -v zip >/dev/null 2>&1; then
  zip -qr dist/adhd-reader.zip "${files[@]}"
else
  python3 -m zipfile -c dist/adhd-reader.zip "${files[@]}"
fi
