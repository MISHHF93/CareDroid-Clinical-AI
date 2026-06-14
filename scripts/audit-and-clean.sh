#!/usr/bin/env bash
set -euo pipefail

echo "=== CareDroid Emergency OS Cleanup ==="
echo "Auditing non-emergency modules..."

BACKEND_DIR="./backend/src"
FRONTEND_DIR="./src"

PATTERNS_TO_REMOVE=(
  "ICU"
  "Lab"
  "Research"
  "Education"
  "Fleet"
  "IoT"
  "DigitalTwin"
  "Digital_Twin"
  "Digital Twin"
  "Governance"
  "CommandCenter"
  "Command_Center"
  "Command Center"
  "Enterprise Command"
)

DIRS_TO_DELETE=(
  "$BACKEND_DIR/modules/icu"
  "$BACKEND_DIR/modules/lab"
  "$BACKEND_DIR/modules/research"
  "$BACKEND_DIR/modules/education"
  "$BACKEND_DIR/modules/fleet"
  "$BACKEND_DIR/modules/iot"
  "$BACKEND_DIR/modules/telemetry"
  "$BACKEND_DIR/modules/hospital-map"
  "$BACKEND_DIR/modules/live-tracking"
  "$BACKEND_DIR/modules/simulation"
  "$BACKEND_DIR/modules/governance"
  "$BACKEND_DIR/modules/platform-governance"
  "$BACKEND_DIR/modules/llm-security"
  "$BACKEND_DIR/modules/interoperability"
  "$BACKEND_DIR/modules/regulatory"
  "$BACKEND_DIR/modules/equity"
  "$BACKEND_DIR/modules/human-review"
  "$BACKEND_DIR/modules/privacy-center"
  "$BACKEND_DIR/modules/ehr-audit"
  "$FRONTEND_DIR/pages/fleet"
  "$FRONTEND_DIR/pages/icu"
  "$FRONTEND_DIR/pages/lab"
  "$FRONTEND_DIR/pages/research"
  "$FRONTEND_DIR/pages/education"
  "$FRONTEND_DIR/pages/iot"
  "$FRONTEND_DIR/components/command-center"
  "$FRONTEND_DIR/components/governance"
)

echo "Mode: VERIFY ONLY"
echo "This script never deletes files. Use the generated audit output for manual review."
echo ""

for dir in "${DIRS_TO_DELETE[@]}"; do
  if [ -d "$dir" ]; then
    echo "Review candidate: $dir"
  fi
done

echo ""
echo "Checking for remaining non-emergency references..."

for pattern in "${PATTERNS_TO_REMOVE[@]}"; do
  echo ""
  echo "Searching for '$pattern'..."
  if command -v rg >/dev/null 2>&1; then
    rg -n --glob '*.{ts,tsx,js,jsx,json,css,md}' "$pattern" "$BACKEND_DIR" "$FRONTEND_DIR" 2>/dev/null || echo "  None found"
  else
    grep -RIn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.json" --include="*.css" --include="*.md" "$pattern" "$BACKEND_DIR" "$FRONTEND_DIR" 2>/dev/null || echo "  None found"
  fi
done

echo ""
echo "=== Cleanup audit complete ==="
echo "No files were deleted. Archive or remove files only after proving they are inactive and unimported."
echo "Next: Run route audit to verify active Emergency OS endpoints remain canonical."
