#!/usr/bin/env bash
set -euo pipefail

echo "=== Cleaning Frontend - Emergency OS Audit ==="

FRONTEND_DIR="./src"
EXECUTE="${CLEAN_EXECUTE:-false}"

PAGES_TO_REMOVE=(
  "$FRONTEND_DIR/pages/icu"
  "$FRONTEND_DIR/pages/lab"
  "$FRONTEND_DIR/pages/research"
  "$FRONTEND_DIR/pages/education"
  "$FRONTEND_DIR/pages/fleet"
  "$FRONTEND_DIR/pages/iot"
  "$FRONTEND_DIR/pages/command-center"
  "$FRONTEND_DIR/pages/dashboard-old"
  "$FRONTEND_DIR/pages/modules"
  "$FRONTEND_DIR/pages/platform"
  "$FRONTEND_DIR/pages/commercial"
  "$FRONTEND_DIR/pages/organization"
)

COMPONENTS_TO_REMOVE=(
  "$FRONTEND_DIR/components/icu-dashboard"
  "$FRONTEND_DIR/components/lab-results"
  "$FRONTEND_DIR/components/research-panel"
  "$FRONTEND_DIR/components/governance"
  "$FRONTEND_DIR/components/module-navigation"
  "$FRONTEND_DIR/components/nested-sidebar"
  "$FRONTEND_DIR/components/duplicate-header"
)

HOOKS_TO_REMOVE=(
  "$FRONTEND_DIR/hooks/useModuleRegistry"
  "$FRONTEND_DIR/hooks/useEnterpriseFeatures"
)

echo "Mode: $([ "$EXECUTE" = "true" ] && echo "DELETE" || echo "DRY RUN")"
echo ""

delete_or_report() {
  local target="$1"
  if [ -d "$target" ] || [ -f "$target" ]; then
    if [ "$EXECUTE" = "true" ]; then
      echo "Removing: $target"
      rm -rf "$target"
    else
      echo "Would remove: $target"
    fi
  fi
}

for page in "${PAGES_TO_REMOVE[@]}"; do
  delete_or_report "$page"
done

for component in "${COMPONENTS_TO_REMOVE[@]}"; do
  delete_or_report "$component"
  delete_or_report "$component.tsx"
  delete_or_report "$component.jsx"
  delete_or_report "$component.ts"
  delete_or_report "$component.js"
done

for hook in "${HOOKS_TO_REMOVE[@]}"; do
  delete_or_report "$hook.ts"
  delete_or_report "$hook.js"
done

echo ""
echo "=== Required Emergency OS pages/components ==="
for required in \
  "$FRONTEND_DIR/components/EmergencyWhiteboard.jsx" \
  "$FRONTEND_DIR/components/EMSPipeline.jsx" \
  "$FRONTEND_DIR/components/QueueIntelligencePanel.jsx" \
  "$FRONTEND_DIR/components/ReassessmentDrawer.jsx" \
  "$FRONTEND_DIR/pages/emergency/SmartIntake.jsx" \
  "$FRONTEND_DIR/pages/emergency/EmergencySettings.jsx"; do
  if [ -f "$required" ]; then
    echo "Present: $required"
  else
    echo "Missing: $required"
  fi
done

echo ""
echo "=== Remaining top-level pages ==="
find "$FRONTEND_DIR/pages" -maxdepth 2 -type f \( -name '*.jsx' -o -name '*.tsx' -o -name '*.js' -o -name '*.ts' \) 2>/dev/null | sort || echo "No pages directory"

echo ""
echo "=== Frontend cleanup audit complete ==="
if [ "$EXECUTE" != "true" ]; then
  echo "No files were deleted. Re-run with CLEAN_EXECUTE=true after reviewing the dry run."
fi
