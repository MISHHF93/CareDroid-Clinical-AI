#!/usr/bin/env bash
set -euo pipefail

echo "=== Emergency OS Verification ==="
echo "Checking for dead code and legacy references..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
BACKEND_DIR="./backend/src"
FRONTEND_DIR="./src"

echo ""
echo "Checking for legacy module imports..."
LEGACY_IMPORTS=(
  "from.*icu"
  "from.*lab"
  "from.*research"
  "from.*education"
  "from.*fleet"
  "from.*iot"
  "from.*digital.*twin"
  "from.*governance"
  "from.*command.*center"
)

for pattern in "${LEGACY_IMPORTS[@]}"; do
  if command -v rg >/dev/null 2>&1; then
    results=$(rg -n -i --glob '*.{ts,tsx,js,jsx}' "$pattern" "$BACKEND_DIR" "$FRONTEND_DIR" 2>/dev/null | rg -v "legacy|FUTURE_RELEASE_ROUTES" | head -5 || true)
  else
    results=$(grep -RInE "$pattern" "$BACKEND_DIR" "$FRONTEND_DIR" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "legacy" | head -5 || true)
  fi

  if [ -n "$results" ]; then
    echo -e "${RED}Found legacy import/reference: $pattern${NC}"
    echo "$results"
    FAILED=1
  else
    echo -e "${GREEN}No legacy imports for: $pattern${NC}"
  fi
done

echo ""
echo "Checking required Emergency OS route files..."
REQUIRED_BACKEND_ROUTES=(
  "$BACKEND_DIR/api/ems.routes.ts"
  "$BACKEND_DIR/api/reassessment.routes.ts"
  "$BACKEND_DIR/api/capacity.routes.ts"
  "$BACKEND_DIR/api/copilot.routes.ts"
  "$BACKEND_DIR/api/smart-intake.routes.ts"
)

for route in "${REQUIRED_BACKEND_ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo -e "${GREEN}Present: $route${NC}"
  else
    echo -e "${RED}Missing: $route${NC}"
    FAILED=1
  fi
done

echo ""
echo "Checking required Emergency OS frontend surfaces..."
KNOWN_EMERGENCY_COMPONENTS=(
  "EmergencyWhiteboard"
  "EMSPipeline"
  "QueueIntelligencePanel"
  "ReassessmentDrawer"
  "Capacity"
  "PatientCard"
  "ChatInterface"
  "SmartIntake"
  "EmergencySettings"
)

for component in "${KNOWN_EMERGENCY_COMPONENTS[@]}"; do
  if rg -n "$component" "$FRONTEND_DIR" --glob '*.{js,jsx,ts,tsx}' >/dev/null 2>&1; then
    echo -e "${GREEN}Referenced: $component${NC}"
  else
    echo -e "${YELLOW}Possibly unused or missing: $component${NC}"
  fi
done

echo ""
echo "Checking for duplicate route definitions..."
if command -v rg >/dev/null 2>&1; then
  rg -n "path:\s*['\"]" "$FRONTEND_DIR/App.jsx" "$FRONTEND_DIR/config" "$FRONTEND_DIR/routing" --glob '*.{js,jsx,ts,tsx}' 2>/dev/null | head -40 || true
fi

echo ""
echo "Checking .env for legacy variables..."
if [ -f ".env" ]; then
  LEGACY_ENV=$(grep -E "(ICU|LAB|RESEARCH|FLEET|IOT|DIGITAL_TWIN|GOVERNANCE)" .env || true)
  if [ -n "$LEGACY_ENV" ]; then
    echo -e "${YELLOW}Legacy env vars found:${NC}"
    echo "$LEGACY_ENV"
  else
    echo -e "${GREEN}No legacy env vars${NC}"
  fi
fi

echo ""
echo "=== Verification Complete ==="
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All blocking checks passed for Emergency OS verification.${NC}"
else
  echo -e "${RED}Some checks failed. Review issues above before destructive cleanup.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to ensure no frontend compilation errors."
echo "2. Run 'cd backend && npm run build' to ensure no backend compilation errors."
echo "3. Manually test the Emergency Whiteboard and Smart Intake in browser."

exit "$FAILED"
