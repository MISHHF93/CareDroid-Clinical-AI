#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== Circular Dependency Detector ==="
echo "This script reports only; it does not modify files."

MADGE_BIN=""
if [[ -x "node_modules/.bin/madge" ]]; then
  MADGE_BIN="node_modules/.bin/madge"
elif command -v madge >/dev/null 2>&1; then
  MADGE_BIN="madge"
fi

if [[ -n "$MADGE_BIN" ]]; then
  "$MADGE_BIN" --circular --extensions ts,tsx,js,jsx src backend/src lib
  exit $?
fi

echo "madge is not installed in this repo and no global madge command was found."
echo "Skipped deep circular analysis to avoid adding dependencies during a safe audit."
echo "Suggested optional command after approval: npx madge --circular --extensions ts,tsx,js,jsx src backend/src lib"
