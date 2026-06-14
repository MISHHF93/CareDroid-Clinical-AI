# Wiring Upgrade Report

Date: 2026-06-14

## Goal

Strengthen active Emergency OS wiring without adding new architecture. The pass focused on existing frontend routes, existing Nest endpoints, existing hooks/services, and existing settings surfaces.

## Upgrades Applied

### 1. EMS Vitals Rendering

- Issue: EMS arrivals could show missing BP/SpO2 values when backend or fixture vitals used a different key shape.
- Why it matters: EMS ETA and handoff cards are pilot-critical and should not appear incomplete when data exists.
- Before: `EMSPipeline.jsx` directly read a narrow vital key set.
- After: `EMSPipeline.jsx` resolves current and legacy vital aliases before rendering.
- Validation: IDE lints clean; command validation pending.

### 2. Referral Latest-Vitals Summary

- Issue: Referral clinical summaries could receive a vitals array but render it as a single object.
- Why it matters: Consult/transfer summaries need the most recent clinical context.
- Before: `ReferralPanel.jsx` formatted `patient.vitals` directly.
- After: `ReferralPanel.jsx` extracts the latest vitals entry and supports current/legacy vital aliases.
- Validation: IDE lints clean; command validation pending.

### 3. Analytics Fallback Shape

- Issue: Local analytics fallback did not fully match the active chart/KPI expectations.
- Why it matters: Demo and degraded-backend paths should still show meaningful operational charts.
- Before: fallback produced basic daily volume and complaints.
- After: fallback includes daily volume, hourly arrivals, wait trend, top complaints, and richer shift KPIs while preserving backend `operationalCommand` data when present.
- Validation: IDE lints clean; command validation pending.

### 4. Backend Capability Alignment

- Issue: Active `/api/emergency/queues` and `/api/emergency/capacity` inventory rows pointed at capabilities intended for optional unmounted analytics/dashboard endpoints.
- Why it matters: Capability reports could imply phantom routes were mounted or active routes were disabled.
- Before: `emergency-queues` used `emergencyQueueAnalytics`; `emergency-capacity` used `emergencyCapacityDashboard`.
- After: active rows use `emergencyQueues` and `emergencyCapacity`; unmounted dashboard/history/analytics capabilities remain disabled.
- Validation: IDE lints clean; focused test pending.

### 5. Settings Runtime Backend Status

- Issue: Integration Hub and Provincial Health backend envelopes existed but were not visibly surfaced in the active shell.
- Why it matters: Users need to see whether connectors are demo-backed, partially configured, or unavailable.
- Before: Settings exposed configuration controls and audit data but not runtime connector envelope status.
- After: Settings renders compact Integration Hub and Provincial Health runtime cards using existing `/api/emergency/integrations` and `/api/emergency/provincial-health` calls.
- Validation: IDE lints clean; command validation pending.

### 6. Central Node Backend Snapshot Bridge

- Issue: `/api/emergency/central-node/snapshot` was fetched by the active central-node hook, but visible header/status metrics still came only from the local store snapshot.
- Why it matters: CareDroid is the central operational node; active route headers should consume the backend central-node aggregate when it is available.
- Before: `useCareDroidCentralNode` stored the backend envelope mostly as sync evidence while `buildCareDroidCentralNodeSnapshot` rebuilt metrics from store state.
- After: The existing central-node builder harmonizes the backend `CareDroidCentralNode` envelope into the same visible snapshot contract, with store fallbacks for absent fields.
- Validation: Focused central-node contract test added; command validation pending.

### 7. Startup Store Hydration Through Canonical API Facade

- Issue: AppShell startup used direct fetches for a subset of active Emergency OS modules, bypassing the canonical `emergencyOsApi.js` facade and leaving referrals, queues, reassessment, and workflow logs out of the central store until individual pages mounted.
- Why it matters: The central operational node, header metrics, drawers, and route pages should share the same backend-backed operational state as soon as the shell initializes.
- Before: `initializeFromBackend`/`refreshAllData` loaded whiteboard, capacity, boarding, and EMS through ad hoc fetch logic.
- After: `refreshAllData` uses existing facade methods for whiteboard, capacity, boarding, EMS, queues, reassessment, referrals, and workflow logs, then hydrates the existing store with normalized queues/referrals/audit data.
- Validation: Frontend typecheck, lint, focused wiring/exposure tests, frontend build, backend build, and backend Emergency OS spec passed.

### 8. Patient Journey Envelope Visible In Patients Route

- Issue: `GET /api/emergency/journey` existed and had a hook, but there was no active mounted page evidence for the backend state-count/timeline envelope.
- Why it matters: Patient Journey is an active workflow, but it should be surfaced inside the existing Patients route rather than adding a duplicate journey page.
- Before: `/emergency/journey` redirected to Patients and the Patients route only rendered patient cards/search.
- After: Patients renders a compact Patient Journey Engine status card from `usePatientJourney`, showing backend state counts and timeline-event count with local fallback.
- Validation: Frontend typecheck, lint, focused wiring/exposure tests, frontend build, backend build, and backend Emergency OS spec passed.

## Active Endpoint Bridge

| Endpoint | Client/hook | Rendered surface |
| --- | --- | --- |
| `GET /api/emergency/whiteboard` | `useEmergencyWhiteboard` | Whiteboard route and cards. |
| `GET /api/emergency/patients` | `useEmergencyPatients` | Patients route and detail panel. |
| `GET /api/emergency/journey` | `usePatientJourney` | Patients route Journey Engine status card and patient timeline surfaces. |
| `GET /api/emergency/ems` | `useEMSIntake` | EMS route. |
| `GET/POST /api/emergency/intake` | `useSmartIntake`, intake clients | Smart Intake route. |
| `GET /api/emergency/queues` | `useEmergencyQueues` | Queues route. |
| `GET /api/emergency/reassessment` | `useReassessmentQueue` | Reassessment route and drawer. |
| `GET /api/emergency/capacity` | `useCapacityStatus` | Capacity route and header metrics. |
| `GET /api/emergency/boarding` | `useBoardingStatus` | Boarding route. |
| `GET /api/emergency/referrals` | `useReferrals` | Referrals route. |
| `GET /api/emergency/copilot` | `useEDCopilot` | Copilot route/panel. |
| `GET /api/emergency/analytics` | `emergencyAnalyticsApi`, store fallback | Analytics route. |
| `GET/PATCH /api/emergency/settings` | settings clients | Settings route. |
| `GET /api/emergency/workflow-logs` | `fetchEmergencyWorkflowLogs`, store startup hydration | Settings audit view, patient logs, and central store workflow state. |
| `GET /api/emergency/integrations` | `fetchIntegrationHub` | Settings Integration Hub runtime cards. |
| `GET /api/emergency/provincial-health` | `fetchProvincialHealth` | Settings Provincial Health runtime cards. |
| `GET /api/emergency/central-node/snapshot` | `fetchCareDroidCentralNodeSnapshot`, `useCareDroidCentralNode` | Active header central-node status strip and operational summary. |

## Artifact Classification

| Artifact group | Classification | Notes |
| --- | --- | --- |
| Active Vite SPA, `src/App.jsx`, `src/components/AppShell.tsx` | ACTIVE | Single app shell and route tree preserved. |
| Emergency OS Nest module under `backend/src/modules/emergency-os/` | ACTIVE | Existing controller/service/type surface remains canonical. |
| `src/services/emergencyOsApi.js`, `src/hooks/useEmergencyOs.js` | ACTIVE | Canonical frontend API facade and module hooks. |
| `src/hooks/useCareDroidCentralNode.ts`, `src/central-node/careDroidCentralNode.ts` | ACTIVE | Central operational node now consumes backend central-node envelope when available. |
| `src/pages/emergency/`, `src/components/EmergencyWhiteboard.jsx`, `src/components/EMSPipeline.jsx`, `src/components/ReferralPanel.jsx` | ACTIVE | Mounted Emergency OS product surfaces. |
| `src/config/unified-navigation.config.ts`, `src/config/routes.config.js` | ACTIVE | Single route/navigation source retained. |
| Optional advanced simulation, federated-learning, digital-twin, and upgrade-harness clients | MANUAL_REVIEW | Existing backend demo facades remain guarded/review-scoped until product and safety ownership confirms promotion. |
| Retained future/review modules under `_review` | ARCHIVED | Not mounted in the active route surface. |
| Legacy compatibility projections such as `src/layout/AppShell.jsx` | MANUAL_REVIEW | Kept for compatibility/tests; not treated as active shell. |

## Remaining Wiring Risks

- Optional advanced endpoints under simulation, federated learning, digital twin, referral history, transfer workflow, intake sessions, capacity history, and queue analytics remain guarded or documented. They should not be promoted without backend route ownership, clinical safety review, and product acceptance.
- Legacy route aliases for provincial health/integrations still redirect to whiteboard; Settings now surfaces connector status without adding routes.
- Future-review modules remain in `_review`; they are not active runtime dependencies.
