# R12 End-to-End Wiring Report

## Wiring implemented

### WIRE 1 - AppShell starts the engines
- `src/components/AppShell.tsx` now initializes the canonical emergency store from backend on mount via `useEmergencyStore.getState().initializeFromBackend()`.
- `AppShell` starts reassessment and capacity engines once per mount and clears both intervals on cleanup.
- Development-only simulation startup now uses a safe dynamic `import('../engine/simulation')`; no browser `require` is used.
- `src/main.jsx` no longer starts the simulation directly, keeping engine startup centralized in `AppShell`.
- `src/engine/simulation.ts` now returns active interval ids while keeping `stopSimulation()` as the cleanup API.
- `src/store/emergencyStore.ts` now includes `initializeFromBackend()`, which hydrates any available backend whiteboard payload and falls back to local state without throwing when backend endpoints are unavailable.

### WIRE 2 - Complaint entered routes to score suggestions
- Added `src/engine/complaintRouter.ts` as a thin adapter around the existing `src/data/clinicalIntentRouter.js`.
- `src/components/QuickIntake.tsx` debounces complaint text for 400ms, calls `routeComplaint(value)`, and updates protocol/score suggestions from `route.scoreIds`.
- `src/components/PatientDetailPanel.tsx` routes the open patient's chief complaint and shows suggested score ids when matching scores have not already been saved to patient notes.

### WIRE 3 - Critical vitals fire alerts and flags
- `src/components/PatientDetailPanel.tsx` now checks newly saved vitals after `addVitals()`.
- It dispatches a Critical alert and adds `PatientFlag.DeteriorationRisk` when SpO2 is below 88, HR is below 40 or above 150, or SBP is below 80.

### WIRE 4 - Flag updates re-render patient cards
- `src/components/PatientCard.tsx` now subscribes to the canonical store by patient id and falls back to the prop patient only when the store record is unavailable.
- Focused tests confirm adding `DeteriorationRisk` to the store immediately updates the card badge and visual class.

### WIRE 5 - Capacity updates the header
- Existing store mutations already recalculate capacity when patient state, flags, rooms, or patient lists change.
- `src/engine/capacityEngine.ts` already calls `store.setCapacity()` every 30 seconds and on startup.
- `src/components/Header.tsx` already reads `store.capacity.band` and applies a smooth color transition; focused tests confirm a patient state change updates the header badge.

## Files changed
- `src/components/AppShell.tsx`
- `src/components/QuickIntake.tsx`
- `src/components/PatientDetailPanel.tsx`
- `src/components/PatientCard.tsx`
- `src/engine/complaintRouter.ts`
- `src/engine/simulation.ts`
- `src/store/emergencyStore.ts`
- `src/main.jsx`
- `src/components/AppShell.r12.test.tsx`
- `src/components/R12EndToEndWiring.test.tsx`
- `R12_END_TO_END_WIRING_REPORT.md`

## Tests added/updated
- Added `src/components/AppShell.r12.test.tsx` for AppShell backend initialization, reassessment/capacity startup, development simulation startup, and cleanup.
- Added `src/components/R12EndToEndWiring.test.tsx` for QuickIntake complaint routing debounce, PatientDetailPanel suggested scores, critical vitals alert/flag flow, PatientCard store reactivity, and Header capacity badge updates.

## Verification commands and results
- `npx vitest run src/components/AppShell.r12.test.tsx src/components/R12EndToEndWiring.test.tsx`
  - Passed: 2 files, 6 tests.
- `npm run typecheck:frontend`
  - Passed.
- `npm run build`
  - Passed. Vite reported the existing large chunk warning for calculator/vendor chunks.
- `ReadLints` on edited files
  - No linter errors found.

## Remaining risks/blockers
- No R12 blockers found.
- Backend availability is not assumed. `initializeFromBackend()` preserves local Emergency OS state when API calls fail and marks backend availability accordingly.
- `caredroid.sqlite` was not touched.
