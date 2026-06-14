# Deep Upgrade Inventory

Date: 2026-06-14

## Scope

Deep Upgrade, Wiring, Artifact Consolidation, and Layout Harmonization Mode inspected the active CareDroid Emergency OS platform and strengthened only existing patterns. No second app, AppShell, router, backend API convention, or speculative module was added.

## Active Spine

| Layer | Active artifact | Status |
| --- | --- | --- |
| App entry | `src/main.jsx`, `src/App.jsx` | Active single Vite SPA entry and route tree. |
| Shell/layout | `src/components/AppShell.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx` | Active single shell, rail, header, drawer/panel host. |
| Route config | `src/config/routes.config.js`, `src/config/unified-navigation.config.ts` | Canonical `/emergency/*` route and navigation source. |
| Store/hooks/API | `src/store/emergencyStore.ts`, `src/hooks/useEmergencyOs.js`, `src/services/emergencyOsApi.js` | Active store hydration, module hooks, and `/api/emergency/*` facade. |
| Backend | `backend/src/modules/emergency-os/` | Active Nest Emergency OS controller/services/types/module. |
| Compatibility config | `src/config/navigation.config.js`, `src/navigation/primaryNavigation.js` | Compatibility projections derived from unified navigation; left in place. |

## Module Trace

| Module | Artifact | Usage | Workflow | Frontend route/UI | Backend endpoint | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| Whiteboard | `src/pages/emergency/index.tsx`, `src/components/EmergencyWhiteboard.jsx` | Mounted through lazy whiteboard route. | Operational command board, cards, filters, quick actions. | `/emergency/whiteboard` in `AppShell`. | `GET /api/emergency/whiteboard` via `useEmergencyWhiteboard`. | Pending command validation; source trace complete. |
| Patients | `src/App.jsx`, `src/components/PatientCard.tsx`, `src/components/PatientDetailPanel.tsx` | Patients route and detail drawer. | Search, card open, timeline, workflow actions. | `/emergency/patients`. | `GET/POST /api/emergency/patients`, patient workflow logs. | Pending command validation; source trace complete. |
| Patient Journey | `PatientDetailPanel`, `usePatientTimelineContext`, timeline utils | Rendered inside patient detail panel. | Journey/timeline events and workflow logs. | Visible from patient cards/timeline buttons. | `GET /api/emergency/journey`, `GET /patients/:id/workflow-logs`. | Pending command validation; source trace complete. |
| EMS | `src/components/EMSPipeline.jsx` | Active EMS route. | ETA, bay prep, conversion, handoff. | `/emergency/ems`. | `GET /api/emergency/ems`; optional transport clients guarded. | Safe P1 applied for vital display; lints clean. |
| Smart Intake | `src/pages/emergency/SmartIntake.jsx` | Active intake route. | Identity review, create/link/unknown patient. | `/emergency/intake`. | `GET/POST /api/emergency/intake`, `POST /intake/vertical-slice`. | Pending command validation; source trace complete. |
| Queues | Inline `QueueRoute` in `src/App.jsx` | Active route helper. | Queue counts, oldest wait, breaches. | `/emergency/queues`. | `GET /api/emergency/queues`. | Capability inventory aligned. |
| Reassessment | Inline `ReassessmentRoute`, `ReassessmentDrawer` | Active route plus drawer. | Due/overdue reassessment queue. | `/emergency/reassessment`, drawer events. | `GET /api/emergency/reassessment`. | Pending command validation; source trace complete. |
| Capacity | Inline `CapacityRoute`, central node header metrics | Active capacity view. | Capacity score, rooms, boarders, forecast review cards. | `/emergency/capacity`. | `GET /api/emergency/capacity`, upgrade harness capacity. | Capability inventory aligned. |
| Boarding | Inline `BoardingRoute` | Active route helper. | Boarding patients and escalation. | `/emergency/boarding`. | `GET /api/emergency/boarding`. | Pending command validation; source trace complete. |
| Referrals | `src/components/ReferralPanel.jsx` | Active referral route. | Referral/transfer creation and status progression. | `/emergency/referrals`. | `GET /api/emergency/referrals`; transport persistence guarded. | Safe P1 applied for summary vitals; lints clean. |
| Copilot/AI Layer | `src/components/CopilotPanel.tsx`, inline Copilot route, AI governance settings | Docked panel and route. | Suggested prompts, human-review context, audit logs. | `/emergency/copilot`, Settings AI cards. | `GET /api/emergency/copilot`, governance endpoints. | Pending command validation; source trace complete. |
| Analytics | `src/pages/emergency/EmergencyAnalytics.jsx`, `emergencyStore.ts` | Active analytics direct route. | Shift KPIs, charts, upgrade harness metrics. | `/emergency/analytics`. | `GET /api/emergency/analytics`, upgrade harness. | Safe P1 fallback enrichment; lints clean. |
| Settings | `src/pages/emergency/EmergencySettings.jsx` | Active settings direct route. | Demo dataset, central node, audit, AI, integrations, provincial, thresholds. | `/emergency/settings`. | `GET/PATCH /api/emergency/settings`, workflow logs, AI governance, integrations, provincial. | Safe P1 runtime status cards; lints clean. |
| Central Node | `src/hooks/useCareDroidCentralNode`, `Header.tsx`, backend service | Header and central snapshot. | Operational status strip/metrics. | All active routes through header. | `GET /api/emergency/central-node/snapshot`. | Pending command validation; source trace complete. |
| Alerts | Store alerts, patient detail escalation, header/status surfaces | Active in store and UI. | Alert badges and operational warnings. | Header/cards/detail/settings. | Included in whiteboard/patients envelopes and local dispatch. | Pending command validation; source trace complete. |
| Integrations | `EmergencySettings.jsx`, `IntegrationHubService` | Now rendered in Settings runtime cards. | Connector source status and review queue. | `/emergency/settings#integrations`. | `GET /api/emergency/integrations`. | Safe P1 applied; lints clean. |
| Provincial Health | `EmergencySettings.jsx`, `ProvincialHealthService` | Now rendered in Settings runtime cards. | Connector status, manual-review records, disclaimer. | `/emergency/settings#provincial-health`. | `GET /api/emergency/provincial-health`. | Safe P1 applied; lints clean. |

## Applied Upgrades

- EMS vital display normalized across current and legacy vital keys.
- Referral clinical summaries now use latest vitals and current/legacy vital keys.
- Analytics fallback now supplies chart-ready daily, hourly, wait trend, complaint, and shift KPI data.
- Backend capability inventory now separates mounted queue/capacity endpoints from optional unmounted analytics/dashboard endpoints.
- Settings now surfaces existing Integration Hub and Provincial Health backend envelope status.

## Deferred

No uncertain code was moved or removed. Compatibility projections, future-review artifacts, legacy dashboards, mobile/Android residue, and retained docs remain documented rather than moved because broad relocation in this dirty tree would be riskier than useful.
