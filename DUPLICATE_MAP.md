# Duplicate Map

R1 inventory generated during consolidation because no upstream `DUPLICATE_MAP.md` was present after a brief wait.

## Patient Display
- `src/components/PatientCard.tsx` - canonical card.
- `src/components/PatientDetailPanel.tsx` - canonical detail panel.
- `src/components/EmergencyPatientCard.jsx` - duplicate card with keyboard/highlight and legacy-vitals compatibility.
- `src/components/EmergencyPatientDetailPanel.jsx` - duplicate detail panel with reassessment reminder helpers.
- `src/components/EmergencyWhiteboard.jsx` - legacy whiteboard mounting duplicate card/detail panel.
- `src/pages/emergency/index.tsx` - canonical whiteboard page.

## State Stores
- `src/store/emergencyStore.ts` - canonical Emergency OS store.
- `src/store/emergency-store.ts` - shim to legacy frontend store.
- `frontend/src/store/emergency-store.ts` - legacy persisted/backend dashboard store.
- `src/services/tenantContextStore.js` - non-Emergency OS tenant context store, keep separate.

## AI Clients And Config
- `src/lib/ai/config.ts` - browser-safe config compatibility surface.
- `lib/ai/client.ts` - root direct Anthropic client using provider keys.
- `lib/ai/config.ts` - provider configuration source.
- `src/services/clinicalChatService.js` - direct backend chat caller.
- `src/services/emergencyCopilotApi.js` - direct Emergency Copilot caller.
- `backend/src/config/ai.config.ts` and `backend/src/config/environment.config.ts` - backend-owned provider configuration.

## Whiteboard And Workspaces
- `src/pages/emergency/index.tsx` - canonical Emergency OS whiteboard page.
- `src/components/EmergencyWhiteboard.jsx` - legacy whiteboard duplicate.
- `src/pages/WorkspaceHome.jsx`, `src/pages/CommandDashboard.jsx`, `src/pages/AnalyticsDashboard.jsx`, `src/pages/Operations.jsx`, `src/pages/fleet/*`, commercial/platform/profile/dashboard pages - non-ED workspace surfaces.
- `src/App.jsx` - active route tree with redirects/stubs.

## Types
- `src/types/emergency.ts` - canonical frontend Emergency OS types.
- `backend/src/modules/emergency-os/emergency-os.types.ts` - backend Emergency OS types, keep backend-owned.
- Ad hoc legacy frontend types in `frontend/src/store/emergency-store.ts` - merge or redirect to canonical store.

## Alerts And Notifications
- `src/engine/capacityEngine.ts` - creates capacity alerts directly.
- `src/components/calculators/qSOFA.tsx` - creates qSOFA alerts directly.
- `src/components/PatientDetailPanel.tsx` - creates escalation alerts directly.
- `src/utils/vitalsAlertPipeline.js`, `src/components/ui/Alert.jsx`, `src/components/clinical/ClinicalAlertBanner.jsx`, `src/services/clinicalAlertsApi.js`, `src/pages/ClinicalAlertsPage.jsx` - separate alert/notification surfaces.

## Navigation
- `src/components/Sidebar.tsx` - canonical sidebar component.
- `src/config/unified-navigation.config.ts` - shim to legacy frontend nav config.
- `frontend/src/config/unified-navigation.config.ts` - legacy nav config.
- `src/config/navigation.config.js`, `src/navigation/primaryNavigation.js`, `src/navigation/NavIcon.jsx`, `src/layout/AppShell.jsx` - legacy/broader platform navigation surfaces.

## Calculators
- `src/pages/emergency/ClinicalCalculatorHub.jsx` - Emergency OS calculator hub.
- `src/pages/tools/Calculators.jsx` and many `src/pages/tools/*Calculator*.jsx` files - legacy standalone calculator route/hub and calculator implementations.
- `src/components/calculators/HEARTScore.tsx`, `src/components/calculators/qSOFA.tsx`, `src/components/calculators/PediatricDrugCalc.tsx` - ED embedded calculators.
- `src/components/ClinicalScoreCalculator.jsx`, `src/components/PediatricDrugCalculator.jsx` - older reusable calculator components.
- `src/utils/*Calculator*.js` and `src/data/calculatorHubManifest.js` - reusable calculator logic/registry, keep as implementation support.

## API Client
- `src/services/apiClient.js` - existing shared API client.
- `src/lib/apiClient.ts` - missing canonical TypeScript API client path.

## Layout
- `src/components/AppShell.tsx` - canonical Emergency OS app shell.
- `src/layout/AppShell.jsx` - legacy platform shell duplicate.
