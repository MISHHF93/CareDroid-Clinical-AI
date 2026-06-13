# Consolidation Decisions

Sorted by action. Format: `[FILE PATH] -> [ACTION] -> [CANONICAL TARGET] -> [REASON]`

## DELETE
`src/components/EmergencyPatientCard.jsx` -> DELETE -> `src/components/PatientCard.tsx` -> Duplicate patient card; unique keyboard/highlight/legacy-vitals behavior is merged into canonical card.
`src/components/EmergencyPatientDetailPanel.jsx` -> DELETE -> `src/components/PatientDetailPanel.tsx` -> Duplicate patient detail panel; reassessment helper behavior is merged into canonical store/detail flow.
`src/components/EmergencyWhiteboard.jsx` -> DELETE -> `src/pages/emergency/index.tsx` -> Legacy whiteboard duplicates the canonical Emergency OS route page.

## MERGE INTO
`frontend/src/store/emergency-store.ts` -> MERGE INTO -> `src/store/emergencyStore.ts` -> Backend loading, UI, copilot, EMS, and realtime concepts are represented on the canonical store surface.
`src/store/emergency-store.ts` -> MERGE INTO -> `src/store/emergencyStore.ts` -> Shim should redirect to the canonical store rather than the legacy frontend store.
`lib/ai/client.ts` -> MERGE INTO -> `src/lib/ai/client.ts` -> Preserve unified AI request types while keeping frontend provider calls backend-owned.
`src/services/clinicalChatService.js` -> MERGE INTO -> `src/lib/ai/client.ts` -> Chat callers should use one AI wrapper for request typing and backend route selection.
`src/services/emergencyCopilotApi.js` -> MERGE INTO -> `src/lib/ai/client.ts` -> Emergency Copilot calls become the COPILOT_CHAT backend path in the unified AI client.
`src/engine/capacityEngine.ts` -> MERGE INTO -> `src/engine/alertEngine.ts` -> Capacity alerts should dispatch through one alert engine.
`src/components/calculators/qSOFA.tsx` -> MERGE INTO -> `src/engine/alertEngine.ts` -> Critical qSOFA warnings should dispatch through one alert engine.
`src/components/PatientDetailPanel.tsx` -> MERGE INTO -> `src/engine/alertEngine.ts` -> Escalation alerts should dispatch through one alert engine.
`frontend/src/config/unified-navigation.config.ts` -> MERGE INTO -> `src/components/Sidebar.tsx` -> Canonical sidebar should own the visible Emergency OS nav set.
`src/pages/tools/Calculators.jsx` -> MERGE INTO -> `src/pages/emergency/ClinicalCalculatorHub.jsx` -> Standalone calculator route becomes an implementation source behind Emergency OS tools.
`src/components/ClinicalScoreCalculator.jsx` -> MERGE INTO -> `src/pages/emergency/ClinicalCalculatorHub.jsx` -> Older score UI is superseded by the Emergency OS tools hub.
`src/components/PediatricDrugCalculator.jsx` -> MERGE INTO -> `src/pages/emergency/ClinicalCalculatorHub.jsx` -> Pediatric dosing is available from the Emergency OS tools hub.
`src/types/emergency.ts` -> MERGE INTO -> `src/types/emergency.ts` -> Expand the canonical types with legacy-compatible note, flag, shift, EMS, referral, and feature fields.
`src/services/apiClient.js` -> MERGE INTO -> `src/lib/apiClient.ts` -> Provide the canonical API client import path while reusing existing implementation.
`src/layout/AppShell.jsx` -> MERGE INTO -> `src/components/AppShell.tsx` -> Keep the Emergency OS shell and engines as the app layout.

## RENAME TO
`src/pages/emergency/ClinicalCalculatorHub.jsx` -> RENAME TO -> `src/components/ClinicalCalculatorHub.tsx` -> Canonical target is component-level; keep route shim only if needed.

## REDIRECT
`src/App.jsx` -> REDIRECT -> `src/pages/emergency/index.tsx` -> `/emergency/whiteboard` should mount the canonical whiteboard page and non-ED routes should return to `/emergency`.
`src/config/unified-navigation.config.ts` -> REDIRECT -> `src/components/Sidebar.tsx` -> Sidebar should expose only Whiteboard, EMS, Referrals, Capacity, Tools, Shift, Settings.
`src/config/navigation.config.js` -> REDIRECT -> `src/components/Sidebar.tsx` -> Broader platform nav is non-ED for this Emergency OS consolidation.
`src/navigation/primaryNavigation.js` -> REDIRECT -> `src/components/Sidebar.tsx` -> Broader platform nav is non-ED for this Emergency OS consolidation.
`src/pages/tools/Calculators.jsx` -> REDIRECT -> `src/pages/emergency/ClinicalCalculatorHub.jsx` -> `/tools/*` should route to `/emergency/tools?open=[id]`.
`src/pages/WorkspaceHome.jsx` -> REDIRECT -> `src/pages/emergency/index.tsx` -> Non-ED workspace surface is a future module.
`src/pages/CommandDashboard.jsx` -> REDIRECT -> `src/pages/emergency/index.tsx` -> Non-ED dashboard surface is a future module.
`src/pages/AnalyticsDashboard.jsx` -> REDIRECT -> `src/pages/emergency/index.tsx` -> Non-ED analytics dashboard surface is a future module.
`src/pages/Operations.jsx` -> REDIRECT -> `src/pages/emergency/index.tsx` -> Non-ED operations workspace is a future module.

## KEEP
`src/components/PatientCard.tsx` -> KEEP -> `src/components/PatientCard.tsx` -> Canonical patient display card.
`src/components/PatientDetailPanel.tsx` -> KEEP -> `src/components/PatientDetailPanel.tsx` -> Canonical patient detail panel.
`src/store/emergencyStore.ts` -> KEEP -> `src/store/emergencyStore.ts` -> Canonical Emergency OS state store.
`src/lib/ai/config.ts` -> KEEP -> `src/lib/ai/client.ts` -> Browser-safe AI config compatibility remains.
`backend/src/config/ai.config.ts` -> KEEP -> `src/lib/ai/client.ts` -> Backend owns provider credentials and model calls.
`backend/src/config/environment.config.ts` -> KEEP -> `src/lib/ai/client.ts` -> Backend owns AI provider environment validation.
`src/pages/emergency/index.tsx` -> KEEP -> `src/pages/emergency/index.tsx` -> Canonical whiteboard route.
`src/types/emergency.ts` -> KEEP -> `src/types/emergency.ts` -> Canonical frontend Emergency OS types.
`backend/src/modules/emergency-os/emergency-os.types.ts` -> KEEP -> `src/types/emergency.ts` -> Backend types stay backend-owned.
`src/components/Sidebar.tsx` -> KEEP -> `src/components/Sidebar.tsx` -> Canonical navigation component.
`src/components/AppShell.tsx` -> KEEP -> `src/components/AppShell.tsx` -> Canonical layout shell.
`src/utils/*Calculator*.js` -> KEEP -> `src/components/ClinicalCalculatorHub.tsx` -> Reusable calculator logic remains as implementation support.
`src/data/calculatorHubManifest.js` -> KEEP -> `src/components/ClinicalCalculatorHub.tsx` -> Calculator registry remains as implementation support.
`src/services/tenantContextStore.js` -> KEEP -> `src/store/emergencyStore.ts` -> Tenant context is not an Emergency OS state duplicate.

## STUB OUT
`src/pages/fleet/*` -> STUB OUT -> `src/pages/emergency/index.tsx` -> Non-ED fleet workspace is a future module.
`src/pages/commercial/*` -> STUB OUT -> `src/pages/emergency/index.tsx` -> Non-ED commercial workspace is a future module.
`src/pages/platform/*` -> STUB OUT -> `src/pages/emergency/index.tsx` -> Non-ED platform workspace is a future module.
`src/features/future-modules/_review/*` -> STUB OUT -> `src/pages/emergency/index.tsx` -> Future modules remain unmounted review material.

## Counts
- DELETE: 3
- MERGE INTO: 15
- RENAME TO: 1
