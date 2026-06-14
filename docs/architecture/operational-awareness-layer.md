# Operational Awareness Layer

Generated: 2026-06-14

## Discovery Method

- Reviewed the active Emergency OS frontend surfaces under `src/central-node`, `src/hooks`, `src/store`, `src/components`, `src/pages/emergency`, and `src/services/emergencyOsApi.js`.
- Reviewed the active Nest Emergency OS module under `backend/src/modules/emergency-os`.
- Traced data from backend envelopes and scenario fixtures into store hydration, central-node normalization, AppShell/Header, Whiteboard, Analytics, and Copilot.
- Preserved the current one-product spine: one AppShell, one route/API surface, one central node, one emergency store, one patient journey model, and one alert/escalation model.

## Operational Intelligence Inventory

- ACTIVE_VISIBLE - Central node snapshot: `GET /api/emergency/central-node/snapshot` and `useCareDroidCentralNode` normalize backend and store state into `CareDroidCentralNodeSnapshot`. Visible through `Header`, Whiteboard command metrics, Analytics command metrics, and Copilot awareness context.
- ACTIVE_VISIBLE - Capacity score and band: computed in `EmergencyPatientService.computeCapacity`, `capacityEngine`, `store.capacity`, and `centralSnapshot.capacityStatus`. Visible in AppShell/Header, Whiteboard, Analytics, Copilot, Capacity page, and crisis mode.
- API_ONLY - Capacity recommendations: `CapacityService.getCapacity()` returns recommendation strings, and `CapacityCrisisMode` derives deterministic action suggestions. These are not yet centralized into `CareDroidCentralNodeSnapshot`.
- ACTIVE_VISIBLE - EMS pressure, ETA, offload: `CareDroidCentralNodeSnapshot.emsPressure`, `EMSPipeline`, `EMSPressureScore`, `EMSCriticalBroadcast`, and backend EMS intake expose inbound, critical, ETA, offload, and bay-prep signals. This pass added Copilot and Analytics central-node awareness visibility.
- ACTIVE_VISIBLE - Boarding count and risk: backend `BoardingService`, store capacity, central-node `boardingStatus`, Whiteboard stats, Analytics cards, Header command strip, and Copilot awareness now expose boarders and risk.
- ACTIVE_VISIBLE - Queue health, breaches, and oldest wait: backend queue metrics, store queue selectors, `QueueIntelligencePanel`, `centralSnapshot.queueHealth`, Header operational strip, Whiteboard chips, Analytics awareness, and Copilot prompt context expose count, oldest wait, target, and breach status.
- ACTIVE_VISIBLE - Reassessment due, overdue, and action context: backend `ReassessmentService`, reassessment engine, `ReassessmentDrawer`, central-node `reassessmentStatus`, Header, Whiteboard, Analytics, and Copilot all surface due/overdue counts. Backend `nextAction` remains API-only outside the dedicated reassessment endpoint.
- ACTIVE_VISIBLE - Alerts and escalations: backend fixtures, alert engine, store alert selectors, Header alert drawer, Sidebar badges, capacity crisis escalation, EMS critical broadcast, Analytics awareness, and Copilot prompt context expose active alert/escalation state.
- ACTIVE_VISIBLE - Analytics KPIs: `EmergencyAnalyticsService`, local store fallback, and scenario analytics expose shift census, waiting, high risk, boarding, reassessment due, average wait, daily volume, hourly arrivals, wait trend, complaint mix, and central-node awareness cards.
- ACTIVE_VISIBLE - Copilot quick actions and prompt context: backend `EDCopilotService`, scenario fixtures, and `CopilotPanel` expose quick actions and safety policy. This pass added central-node capacity, EMS, boarding, queue health, reassessment, and alert context to prompt, UI cards, workflow metadata, and AI call context.
- ACTIVE_VISIBLE - Freshness and source data: `useCareDroidCentralNode`, Header sync status, Whiteboard central command layer, and Analytics freshness labels expose store vs backend snapshot source and last update age.
- STORE_ONLY - Emergency store operational summary: `selectEmergencyOperationalSummary` duplicates a subset of central-node command metrics for store consumers. It remains useful but should not become a second awareness engine.
- DUPLICATE_DERIVED - EMS pressure in `ChatInterface.jsx`: legacy/general chat derives EMS pressure separately via `EMSPressureScore`. Keep for the chat surface unless a later convergence pass promotes a shared selector.
- API_ONLY - Backend envelopes for module pages: whiteboard, queues, reassessment, capacity, boarding, referrals, copilot, analytics, settings, and workflow logs are active `/api/emergency/*` contracts, but some fields remain fixture/demo backed.
- PENDING_PARALLEL_WORK - Operational command layer report and broader state/events/alerts/data freshness work may further refine source-of-truth boundaries. This pass did not duplicate that report.
- MANUAL_REVIEW - Live external integrations, persistence, production alert routing, capacity recommendation ownership, and clinical model claims require approval and validation before being treated as production intelligence.

## Visibility Map

- AppShell: `AppShell.tsx` mounts `Header.tsx`, `Sidebar.tsx`, `EMSCriticalBroadcast`, `ReassessmentDrawer`, `CommandPalette`, and `CopilotPanel`. `Header.tsx` already wires central-node realtime polling, the live status cluster, global operational metric strip, patient lookup, reassessment launcher, and alert drawer.
- Whiteboard: `src/pages/emergency/index.tsx` already rendered capacity, EMS signals, reassessment, boarding, queue intelligence, crisis mode, and command-layer metrics. This pass added central-node queue breach count, boarding risk, and active alert chips to the hero status strip.
- Analytics: `EmergencyAnalytics.jsx` already rendered operational KPIs and central-node command metrics. This pass expanded command metrics to include waiting, longest wait, and reassessment, and added an Operational Awareness section for capacity, EMS pressure, boarding, queue health, reassessment, and alerts.
- Copilot: `CopilotPanel.tsx` already rendered quick actions, backend safety policy, local patient/capacity/reassessment/alert prompt context, and workflow logging. This pass wired `useCareDroidCentralNode` into Copilot so UI cards, prompt context, workflow metadata, and AI request context include capacity, EMS pressure, boarding, queue health, reassessment, and alerts.

## Fixes Applied

- Added Copilot central-node operational awareness cards and prompt context from `CareDroidCentralNodeSnapshot`.
- Added Copilot workflow metadata for EMS pressure, boarders, boarding risk, breached queues, reassessment due, and active alerts.
- Added Analytics operational awareness cards backed by `centralSnapshot` instead of a new metrics engine.
- Expanded Analytics central command metrics to include waiting, longest wait, and reassessments due.
- Added Whiteboard hero chips for queue breaches, boarding risk, and active alerts.
- Added focused source-level tests for Copilot and Analytics awareness wiring, and extended the Whiteboard wiring test.

## Remaining Hidden, Pending, Manual Review

- PENDING_PARALLEL_WORK - `docs/architecture/operational-command-layer.md` is owned by the concurrent operational metrics worker.
- PENDING_PARALLEL_WORK - Broader state reconciliation, data freshness, event-system, and alert routing work may change source labels or sync behavior.
- MANUAL_REVIEW - Capacity recommendation strings from `/api/emergency/capacity` are not yet part of the central-node contract.
- MANUAL_REVIEW - Backend intelligence is fixture/in-memory backed; live EMS, EHR, device, bed management, and notification connectors remain non-production.
- DUPLICATE_DERIVED - Legacy/general chat still has separate EMS pressure context. Do not delete during this dirty-tree pass.

## Validation

- `npx vitest run src/components/CopilotPanel.operationalAwareness.test.ts src/pages/emergency/EmergencyAnalytics.operationalAwareness.test.js src/components/EmergencyWhiteboard.navigation.test.js src/components/Header.centralControl.test.tsx src/central-node/careDroidCentralNode.test.ts` - passed, 5 files and 12 tests.
- `npx eslint src/components/CopilotPanel.tsx src/pages/emergency/index.tsx src/pages/emergency/EmergencyAnalytics.jsx src/components/CopilotPanel.operationalAwareness.test.ts src/pages/emergency/EmergencyAnalytics.operationalAwareness.test.js src/components/EmergencyWhiteboard.navigation.test.js` - passed.
- `npm run typecheck:frontend` - passed.
- IDE diagnostics for touched files - no linter errors found.

Backend-focused tests were not rerun because this pass did not change backend code. Backend operational intelligence was inspected through `emergency-os.services.ts`, `emergency-os.controller.ts`, `emergency-os.types.ts`, fixtures, and existing controller spec evidence.
