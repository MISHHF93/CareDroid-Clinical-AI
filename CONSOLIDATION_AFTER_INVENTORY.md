# Consolidation After Inventory

Generated after R2-R14 consolidation work.

## Patient Display: Before -> After
- Before: canonical `src/components/PatientCard.tsx` and `src/components/PatientDetailPanel.tsx`, plus duplicate implementations in `src/components/EmergencyPatientCard.jsx`, `src/components/EmergencyPatientDetailPanel.jsx`, and `src/components/EmergencyWhiteboard.jsx`.
- After: active routes mount `src/pages/emergency/index.tsx`, `src/components/PatientCard.tsx`, and `src/components/PatientDetailPanel.tsx`.
- After: legacy display files remain only as compatibility stubs that re-export canonical components/pages.

## State Stores: Before -> After
- Before: `src/store/emergencyStore.ts`, `src/store/emergency-store.ts`, `frontend/src/store/emergency-store.ts`, and root `store/emergencyStore.ts` competed as Emergency OS state surfaces.
- After: `src/store/emergencyStore.ts` is canonical.
- After: `src/store/emergency-store.ts` and root `store/emergencyStore.ts` redirect to the canonical store.
- After: canonical store includes patients, staff, rooms, capacity, activeShift, emsUnits/emsArrivals, referrals, alerts, selectedPatientId, copilotOpen, activeQueueFilter, loading, features, workflow logs, note/referral/reassessment actions, and legacy selectors.

## AI Clients: Before -> After
- Before: root `lib/ai/client.ts` directly called Anthropic, while frontend services called chat/copilot backend routes directly.
- After: `src/lib/ai/client.ts` provides browser-safe `callAI` and `streamAI` for COPILOT_CHAT, HANDOFF_BRIEF, SCORE_ASSIST, INTAKE_SUGGEST, and PROTOCOL_SUGGEST.
- After: Copilot panel uses `callAI`; backend/provider secrets remain backend-owned.
- Remaining: broader non-ED/future chat callers still use `src/services/clinicalChatService.js` as a compatibility route wrapper.

## Dashboard Pages: Before -> After
- Before: broad dashboard/workspace routes and legacy aliases remained in route/config files.
- After: active app routes redirect non-ED entry points to Emergency OS and mount canonical Emergency OS whiteboard/tools/shift surfaces.
- Remaining: many non-ED page files remain in the repo as unmounted/future modules and test/data inventory references.

## Type Files: Before -> After
- Before: canonical `src/types/emergency.ts` missed several fields used by active ED flows and legacy store actions.
- After: `src/types/emergency.ts` includes PatientState, P1-P5 Priority, priority normalization, richer Note/Referral/Reminder/EMS/feature/capacity metadata, and alert/workflow metadata alignment.

## Alert Systems: Before -> After
- Before: capacity, qSOFA, and detail-panel escalation created alerts directly.
- After: `src/engine/alertEngine.ts` owns `dispatchAlert`, `dispatchScoreAlert`, and `dispatchCriticalVitalsAlerts`; root `engine/alertEngine.ts` redirects to it.
- Remaining: legacy notification/clinical-alert pages and services still exist but are outside the active Emergency OS alert dispatch path.

## Navigation Components: Before -> After
- Before: `src/components/Sidebar.tsx` consumed a shim to `frontend/src/config/unified-navigation.config.ts`; broader platform navigation configs also existed.
- After: `src/config/unified-navigation.config.ts` defines one Emergency OS sidebar set: Whiteboard, EMS, Referrals, Capacity, Tools, Shift, Settings.
- After: `src/components/Sidebar.css` includes mobile bottom-tab behavior.
- Remaining: broader navigation inventory/test files still exist for future modules.

## Calculator Locations: Before -> After
- Before: `src/pages/tools/Calculators.jsx`, standalone tool routes, and `src/pages/emergency/ClinicalCalculatorHub.jsx` coexisted.
- After: `src/components/ClinicalCalculatorHub.tsx` is the canonical component target and wraps the Emergency OS hub.
- After: `/tools/*` and `/calculators/*` redirect to `/emergency/tools` with `open`/`tool` query support.
- After: calculator saves use a standard note/timeline pattern and dispatch unified alerts for high/critical score outputs.

## Files Removed / LOC Removed
- Files physically removed: 0. Duplicate implementations were stubbed rather than deleted where tests/future modules still import them.
- Files substantially stubbed/redirected: `src/components/EmergencyPatientCard.jsx`, `src/components/EmergencyPatientDetailPanel.jsx`, `src/components/EmergencyWhiteboard.jsx`, root `store/emergencyStore.ts`, and root `engine/{alertEngine,capacityEngine,reassessmentEngine}.ts`.
- `git diff --stat` currently reports 55 changed files with 2,221 insertions and 8,016 deletions across the full working tree. This includes pre-existing/other-agent changes visible in the moving repo, not only this consolidation.

## Verification
- `npm run typecheck:frontend` - passed.
- `npm run build` - passed. Warnings: existing chunk-size/code-splitting warnings for large calculator/vendor bundles and one dynamic/static import warning for `offlineService.js`.
- `npx vitest run src/store/emergency-store.test.ts src/components/PatientCard.clinicalIntelligence.test.jsx src/components/EmergencyWhiteboard.storeReactivity.test.jsx src/pages/tools/Calculators.route.test.jsx` - passed, 29 tests.
- `ReadLints` on edited frontend files - no linter errors found.

## Blockers / Risks
- The repo remains a moving dirty tree with many backend/test/config edits that were not part of this consolidation pass.
- `caredroid.sqlite` remains untracked and was not modified.
- Some non-ED/future module files and data inventories remain present by design; they are redirected or unmounted rather than deleted.
- Direct AI compatibility services still exist for broader modules; active ED Copilot is migrated to the unified browser-safe client.

STATUS: EMERGENCY OS CORE CONSOLIDATED; LEGACY/FUTURE MODULE STUBS REMAIN
