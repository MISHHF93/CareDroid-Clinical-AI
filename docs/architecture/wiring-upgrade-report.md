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

## Active Endpoint Bridge

| Endpoint | Client/hook | Rendered surface |
| --- | --- | --- |
| `GET /api/emergency/whiteboard` | `useEmergencyWhiteboard` | Whiteboard route and cards. |
| `GET /api/emergency/patients` | `useEmergencyPatients` | Patients route and detail panel. |
| `GET /api/emergency/journey` | `usePatientJourney` | Patient journey/timeline surfaces. |
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
| `GET /api/emergency/workflow-logs` | `fetchEmergencyWorkflowLogs` | Settings audit view and patient logs. |
| `GET /api/emergency/integrations` | `fetchIntegrationHub` | Settings Integration Hub runtime cards. |
| `GET /api/emergency/provincial-health` | `fetchProvincialHealth` | Settings Provincial Health runtime cards. |

## Remaining Wiring Risks

- Optional advanced endpoints under simulation, federated learning, digital twin, referral history, transfer workflow, intake sessions, capacity history, and queue analytics remain guarded or documented. They should not be promoted without backend route ownership and product acceptance.
- Legacy route aliases for provincial health/integrations still redirect to whiteboard; Settings now surfaces connector status without adding routes.
- Future-review modules remain in `_review`; they are not active runtime dependencies.
