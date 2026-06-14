# Emergency OS AI/ML Backend-to-Frontend Wiring Report

Generated: 2026-06-14

## Scope

This audit follows the active Emergency OS spine only:

`src/main.jsx` -> `src/App.jsx` -> `src/components/AppShell.tsx` -> `/emergency/*` routes -> `src/services/emergencyOsApi.js` / `src/hooks/useEmergencyOs.js` / `src/store/emergencyStore.ts` -> `backend/src/modules/emergency-os/emergency-os.controller.ts` and adjacent Emergency OS services.

No second frontend app, second shell, second router, or new `/api/v1` primary convention was introduced.

## Root Findings

- Core Emergency OS operational endpoints are already mounted under `/api/emergency/*` and most active pages consume them through `src/services/emergencyOsApi.js` and `src/hooks/useEmergencyOs.js`.
- Advanced AI/ML upgrade-harness endpoints already return pilot-safe envelopes with provenance, confidence, human-review safety policy, blocked autonomous actions, and audit hashes.
- The active frontend rendered some upgrade-harness signals, but governance/config state from the canonical AI registry was not surfaced in the active Settings page.
- The docked Copilot panel used local board context and the chat facade, but did not render the backend `/api/emergency/copilot` quick actions or safety context.
- Several advanced ML surfaces remain intentionally review-only or pilot-only: real-time simulation, federated learning operations, hybrid digital twin operations, provincial health, and integration hub placeholders.

## Active Render Paths

- `GET /api/emergency/copilot` -> `fetchEDCopilot` -> `useEDCopilot` -> `src/App.jsx` Copilot route and `src/components/CopilotPanel.tsx`.
- `GET /api/emergency/upgrade-harness` -> `fetchAdvancedEmergencyOsUpgradeHarness` -> `useAdvancedEmergencyOsUpgradeHarness` -> `src/pages/emergency/EmergencyAnalytics.jsx`.
- `GET /api/emergency/upgrade-harness/patient-flow/:patientId` -> `fetchUpgradeHarnessPatientFlow` -> `useUpgradeHarnessPatientFlow` -> `src/components/PatientDetailPanel.tsx`.
- `GET /api/emergency/upgrade-harness/clinical-intelligence` and `GET /api/emergency/upgrade-harness/audit-summary` -> active Copilot route cards in `src/App.jsx`.
- `GET /api/emergency/governance/registry`, `GET /api/emergency/governance/compliance`, and `GET /api/emergency/governance/validate-prompts` -> `src/services/emergencyOsApi.js` -> `src/pages/emergency/EmergencySettings.jsx`.
- `GET /api/emergency/settings` -> `fetchEmergencySettings` / `emergencySettingsApi.js` -> `EmergencySettings.jsx` and `emergencyStore.ts`.

## Fixes Applied

- Added canonical Emergency OS governance registry, compliance, safety-rule, violation, and prompt-validation functions to `src/services/emergencyOsApi.js`.
- Added matching governance hooks in `src/hooks/useEmergencyOs.js` for registry, compliance, and prompt-validation access.
- Updated `src/pages/emergency/EmergencySettings.jsx` to render backend AI governance/config status: governed service count, human-review coverage, blocked autonomous actions, compliance/audit status, prompt validation, Copilot provider/model, and future/deterministic ML model posture.
- Updated `src/components/CopilotPanel.tsx` to use backend Copilot quick actions and safety policy when `/api/emergency/copilot` responds, while clearly showing a local-state fallback if unavailable.
- Updated `src/pages/emergency/EmergencyAnalytics.jsx` to show upgrade-harness confidence, safety policy, blocked autonomous actions, audit hash, and deterministic provider provenance.
- Updated `src/components/PatientDetailPanel.tsx` patient-level harness cards to display review requirement, confidence, deterministic provider provenance, and audit hash.
- Updated focused tests for the Emergency OS API facade and Settings page governance rendering.

## Backend Signals Surfaced

- AI provider/model/config: rendered in Settings from `/api/emergency/settings` and `/api/emergency/governance/registry`.
- Human-review requirement: rendered in Settings, Copilot, Analytics, and Patient Detail.
- Blocked autonomous actions: rendered in Settings and Analytics.
- Upgrade-harness confidence: rendered in Analytics and Patient Detail.
- Upgrade-harness provenance/provider: rendered in Analytics and Patient Detail.
- Immutable audit hash / audit storage mode: rendered in Analytics, Patient Detail, and Settings.
- Prompt validation status: rendered in Settings from `/api/emergency/governance/validate-prompts`.
- Compliance/human-review rate: rendered in Settings from `/api/emergency/governance/compliance`.

## Backend-Only or Review-Only

- `/api/emergency/simulation/*`, `/api/emergency/federated-learning/*`, and `/api/emergency/digital-twin/*` remain exported through the facade/hooks but are not promoted into new active routes. They are deterministic pilot/review tools until validated against local operational data and governance approvals.
- `/api/emergency/provincial-health` and `/api/emergency/integrations` remain explicit placeholder/review surfaces because live credentials and adapters are not configured.
- `/api/v1/governance/*` remains compatibility/backend-only; active frontend paths use `/api/emergency/governance/*`.

## Residual Risks

- `src/store/emergencyStore.ts` still initializes the global board from a limited core refresh set; page-level hooks handle settings, Copilot, and governance enrichment.
- The governance registry and upgrade-harness outputs are deterministic fixtures, not validated production model performance.
- GET `/api/emergency/copilot` records a workflow audit event when context is generated; repeated panel opens can add benign audit entries.
- No persistent database, live EHR/HL7/FHIR, EMS dispatch, BLE/device, secure aggregation, model registry, or external ledger is connected in this slice.
