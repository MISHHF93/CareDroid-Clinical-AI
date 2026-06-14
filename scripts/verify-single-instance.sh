#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0

check_file() {
  local label="$1"
  local path="$2"
  if [[ -f "$path" ]]; then
    echo "PASS $label: $path"
  else
    echo "FAIL $label missing: $path"
    failures=$((failures + 1))
  fi
}

check_contains() {
  local label="$1"
  local path="$2"
  local pattern="$3"
  if rg -q "$pattern" "$path"; then
    echo "PASS $label"
  else
    echo "FAIL $label"
    failures=$((failures + 1))
  fi
}

check_file "frontend entrypoint" "src/main.jsx"
check_file "frontend app router" "src/App.jsx"
check_file "active AppShell" "src/components/AppShell.tsx"
check_file "active Sidebar" "src/components/Sidebar.tsx"
check_file "active Header" "src/components/Header.tsx"
check_file "active Emergency store" "src/store/emergencyStore.ts"
check_file "Emergency OS API facade" "src/services/emergencyOsApi.js"
check_file "Nest app module" "backend/src/app.module.ts"
check_file "Nest bootstrap" "backend/src/main.ts"
check_file "Emergency OS backend controller" "backend/src/modules/emergency-os/emergency-os.controller.ts"

check_contains "App imports active AppShell" "src/App.jsx" "from './components/AppShell'"
check_contains "App mounts one RootLayout shell" "src/App.jsx" "<AppShell>"
check_contains "Nest global API prefix" "backend/src/main.ts" "setGlobalPrefix\\('api'"
check_contains "Emergency controller owns /api/emergency" "backend/src/modules/emergency-os/emergency-os.controller.ts" "@Controller\\('emergency'\\)"
check_contains "API facade prefers /api/emergency" "src/services/emergencyOsApi.js" "/api/emergency/"

if rg -q "from ['\\\"].*frontend/src|frontend/src/main|frontend/src/App" src backend lib; then
  echo "FAIL active code imports frontend/src as a second app"
  failures=$((failures + 1))
else
  echo "PASS no active imports from frontend/src second app"
fi

if [[ -f "frontend/package.json" ]]; then
  echo "FAIL frontend/package.json exists, investigate possible second app"
  failures=$((failures + 1))
else
  echo "PASS no frontend/package.json second app"
fi

if (( failures > 0 )); then
  echo "verify-single-instance failed with $failures issue(s)."
  exit 1
fi

echo "verify-single-instance passed."
