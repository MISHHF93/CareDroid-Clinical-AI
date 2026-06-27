# Emergency OS Component Mounting Report

Generated: 2026-06-13

## Scope

This pass audited active Emergency OS React components against the currently mounted app tree:

- Active router: `src/App.jsx`
- Active shell: `src/components/AppShell.tsx`
- Active whiteboard page: `src/pages/emergency/index.tsx`
- Canonical route registry: `src/config/routes.config.js`

The goal was to eliminate active Emergency OS components that existed but were not mounted. Components that are duplicates, legacy references, or future/review modules are classified below instead of being silently left as product surface.

## Mounted Components

- `src/components/EMSPipeline.jsx`
  - Mounted at `CANONICAL_ROUTES.emergencyEms`.
  - Replaced the inline `EMSRoute` stub in `src/App.jsx`.
  - Connected to its existing Emergency OS store hooks plus EMS fleet/diversion APIs.
  - Added explicit EMS unit loading, empty, and error states.

- `src/pages/emergency/SmartIntake.jsx`
  - Mounted at `CANONICAL_ROUTES.emergencyIntake`.
  - Replaced the inline `SmartIntakeRoute` stub.
  - Keeps its existing Smart Intake API/session fallback and local patient creation connection.

- `src/components/ReferralPanel.jsx`
  - Mounted at `CANONICAL_ROUTES.emergencyReferrals`.
  - Replaced the inline `ReferralsRoute` stub.
  - Connected to referral, transfer workflow, patient, staff, query-param, and backend persistence data.
  - Existing UI covers pending sync, error/status messages, empty groups, and form validation.

- `src/pages/emergency/EmergencyAnalytics.jsx`
  - Mounted at `CANONICAL_ROUTES.emergencyAnalytics`.
  - Replaced the inline `AnalyticsRoute` stub.
  - Connected to `loadEmergencyAnalytics()` with backend or local fallback chart data.

- `src/pages/emergency/EmergencySettings.jsx`
  - Mounted at `CANONICAL_ROUTES.emergencySettings`.
  - Replaced the inline `EmergencySettingsRoute` stub.
  - Connected to settings, feature flags, staff, room, protocol, and integration APIs.

- `src/pages/tools/ToolsOverview.jsx` with `src/components/ClinicalCalculatorHub.tsx`
  - Mounted at `CANONICAL_ROUTES.emergencyTools`.
  - Added the canonical route entry for `/emergency/tools`.
  - Redirected emergency tool aliases (`/tools`, `/calculators`, `/emergency/calculators`, `/emergency/clinical-tools`, and workspace emergency tool aliases) to the mounted clinical tools page instead of the whiteboard.
  - Embeds `ClinicalCalculatorHub` when Medical Tools receives calculator intent.

- `src/components/CommandPalette.jsx`
  - Mounted in the active `src/components/AppShell.tsx`.
  - Replaced the inline simplified command palette.
  - Connected command execution to active routes, intake, referrals, calculators, capacity, patient selection, and reassessment drawer actions.
  - Added `src/components/CommandPalette.d.ts` so the TS shell can mount the JSX component without pulling legacy root-store type errors into frontend typecheck.

- `src/components/ReassessmentDrawer.jsx`
  - Mounted in the active `src/components/AppShell.tsx`.
  - Connected to the reassessment command and global `open-reassessment-drawer` event.
  - Uses existing store filtering and empty self-close behavior.
  - Added `src/components/ReassessmentDrawer.d.ts` for the TS shell boundary.

- `src/components/EMSCriticalBroadcast.jsx`
  - Mounted in the active `src/components/AppShell.tsx`.
  - Previously only existed in the inactive `src/layout/AppShell.jsx`.
  - Uses its existing EMS critical checklist data/actions and returns `null` when no critical arrival exists.
  - Added `src/components/EMSCriticalBroadcast.d.ts` for the TS shell boundary.

- `src/components/WorkloadBalancePanel.jsx`
  - Mounted from the active `src/components/Header.tsx`.
  - Replaced the “Staff menu coming” placeholder.
  - Connected to active staff, patients, assignment action, and derived workload/rebalance props.
  - Added `src/components/WorkloadBalancePanel.d.ts` for the TS header boundary.

## Duplicate Or Non-Active Components

- `src/components/EmergencyWhiteboard.jsx`
  - Classified as duplicate legacy rich whiteboard.
  - The active route already mounts `src/pages/emergency/index.tsx`.
  - Not mounted to avoid two competing whiteboard owners.

- `src/components/NewPatientIntake.jsx`, `src/components/QueueIntelligencePanel.jsx`, `src/components/WhoNextPanel.jsx`, `src/components/CrisisMode.jsx`, and `src/components/ClinicalScoreCalculator.jsx`
  - Classified as legacy rich-whiteboard children.
  - They are not mounted independently because their only active parent candidate is the duplicate `src/components/EmergencyWhiteboard.jsx`.
  - `ToolsOverview` is now the active Medical Tools route owner; `ClinicalCalculatorHub` is embedded for calculator intent.

- `src/pages/emergency/pulse/index.tsx`
  - Mounted at `CANONICAL_ROUTES.emergencyPulse`.
  - Active as the Department Pulse support route.

- `src/pages/emergency/shift/index.tsx`
  - Mounted at `CANONICAL_ROUTES.emergencyShift`.
  - Active as the Shift Summary support route.

- `src/components/JourneyTimeline.jsx`, `src/components/EscalateButton.jsx`, and `src/components/ProtocolSuggestion.jsx`
  - Classified as patient-detail enhancement candidates, not active route components.
  - Current active patient detail behavior is owned by `src/components/PatientDetailPanel.tsx`.
  - These should be promoted deliberately into patient detail in a future pass or moved under `_review`; they are not active floating page components after this audit.

## Verification

- `npm run typecheck:frontend` passed.
- `npm run lint` passed.
- Focused Vitest route/shell smoke command passed: 4 files, 196 tests.
  - `src/routing/canonicalRouteTree.behavior.test.jsx`
  - `src/test/routePagesSmoke.test.jsx`
  - `src/components/WorkloadBalancePanel.test.jsx`
  - `src/components/EMSCriticalBroadcast.test.jsx`

## Remaining Boundary

The repository still contains both the lean active Emergency OS store under `src/store/emergencyStore.ts` and the richer legacy/review store under `store/emergencyStore.ts`. This pass avoided a risky store migration and used TS declaration files at JSX shell boundaries to keep active mounting clean while preserving current runtime component behavior.
