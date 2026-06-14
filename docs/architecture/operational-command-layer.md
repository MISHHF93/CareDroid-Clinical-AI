# Operational Command Layer

Date: 2026-06-14

## Scope

This pass discovered operational metrics already present in the active CareDroid Emergency OS frontend/backend spine and wired safe existing metrics into the shared command surfaces:

```text
Emergency store / backend Emergency OS services
  -> CareDroid Central Node snapshot
  -> operationalSummary metrics
  -> AppShell/Header, Whiteboard, Analytics
```

No new route system, API facade, metrics engine, domain model, state model, alert model, or design system was introduced.

## Discovered Metric Inventory

| Metric | Classification | Source | Computation | API / Store Path | Consumer | Current UI |
| --- | --- | --- | --- | --- | --- | --- |
| Patients today | ACTIVE_VISIBLE | Store patients; backend central node | Count patients whose `arrivalTime` is today | `CareDroidCentralNode.currentDepartmentStatus.patientsToday`; `/api/emergency/central-node/snapshot.data.patientsToday`; `selectEmergencyOperationalSummary()` | Header, Whiteboard, Analytics | Header operational strip, Whiteboard command layer, Analytics command layer |
| Active census | ACTIVE_VISIBLE | Store patients; backend analytics/central node | Active patients excluding `Discharge` | `currentDepartmentStatus.activePatients`; `/api/emergency/analytics.data.activeCensus`; Whiteboard local `stats.total` | Whiteboard, Analytics backend payload | Whiteboard status pill shows active ED records; analytics payload available but not a primary command card |
| Waiting patients | ACTIVE_VISIBLE | Store patients; backend central node queue metrics | Count patients in `Waiting` state | `currentDepartmentStatus.waitingPatients`; `queueHealth.waiting`; `/api/emergency/central-node/snapshot.data.waitingPatients` | Header, queue surfaces | Header operational strip; queue routes/cards |
| Longest wait | ACTIVE_VISIBLE | Store capacity fallback and patient arrivals; backend central node | `capacity.longestWaitMinutes` or max minutes since arrival | `operationalSummary.metrics.longestWait`; `/api/emergency/central-node/snapshot.data.longestWait` | Header | Header operational strip |
| Average wait | ACTIVE_VISIBLE | Store active patient arrivals; backend analytics/central node | Mean minutes since active patient arrival | `operationalSummary.metrics.averageWait`; `/api/emergency/analytics.data.averageWaitMinutes`; `/api/emergency/central-node/snapshot.data.averageWait` | Header, Whiteboard, Analytics | Newly visible in Header operational strip, Whiteboard command layer, and Analytics command layer |
| Queue average/oldest wait | STORE_ONLY | Store queue rows; backend queue metrics | Queue row `averageWaitMinutes`, `oldestWaitMinutes`, target breach | `selectQueuePanelRows()`; `CareDroidCentralNode.queueHealth`; `/api/emergency/queues` | Queue route/panel | Queue intelligence UI, not promoted into command layer except longest/average wait |
| EMS inbound | ACTIVE_VISIBLE | Store EMS arrivals, incoming patients, units, and EMS flags; backend central node | Count inbound EMS signals and active EMS-arrival patients | `emsPressure.inbound`; `/api/emergency/central-node/snapshot.data.emsInbound`; `/api/emergency/ems.data.arrivals` | Header, Whiteboard, Analytics, EMS | Header strip, Whiteboard command layer, Analytics command layer, EMS pipeline |
| EMS ETA | ACTIVE_VISIBLE | Store `emsArrivals`; backend EMS intake | Minutes until `estimatedArrivalTime`; backend `etaMinutes` | `emsArrivals[].estimatedArrivalTime`; `/api/emergency/ems.data.arrivals[].etaMinutes` | Whiteboard, EMS | Whiteboard EMS arrival cards show ETA; EMS route shows pipeline |
| EMS offload/readiness | API_ONLY | Backend EMS intake | `offloadRisk` from high-risk status plus room availability | `/api/emergency/ems.data.arrivals[].offloadRisk`; `/api/emergency/ems.data.availableResusRooms` | EMS | EMS route consumes; not promoted to Header/Analytics command layer |
| Capacity score/band | ACTIVE_VISIBLE | Capacity engine; backend capacity/central node | `calculateEmergencyOsCapacity()` from census, rooms, boarders, reassessment, waits, EMS | `capacity.score`, `capacity.band`; `/api/emergency/capacity.data.capacity`; `capacityStatus` in central snapshot | Header, Whiteboard, Analytics, Capacity | Header central status/strip, Whiteboard command layer/stats, Analytics command layer, Capacity page |
| Rooms/occupancy | ACTIVE_VISIBLE | Store rooms; backend capacity | Occupied rooms, total rooms, occupancy percent | `capacity.occupiedRooms`, `capacity.totalRooms`, `capacity.occupancyPercent`; `/api/emergency/capacity.data.rooms` | Capacity, crisis mode | Capacity route and crisis mode; not duplicated into command layer |
| Boarding count | ACTIVE_VISIBLE | Store capacity and patient states/flags; backend central node/boarding | Count admissions, dispositions, or `PendingAdmission` flags | `boardingStatus.boarders`; `capacity.boardingCount`; `/api/emergency/boarding.data.patients` | Header, Whiteboard, Analytics, Boarding | Header strip, Whiteboard command layer/stats, Analytics command layer, Boarding page |
| Boarding duration | API_ONLY | Backend boarding service | Max minutes since arrival among boarders | `/api/emergency/boarding.data.longestBoardingMinutes` | Boarding | Boarding route data; not promoted to command layer |
| Boarding escalation | API_ONLY | Backend boarding service/settings | Text escalation when boarders exist; risk in central node against thresholds | `/api/emergency/boarding.data.escalation`; `boardingStatus.risk` | Boarding, central node | Boarding route/central snapshot; count only in command layer |
| Referrals pending | ACTIVE_VISIBLE | Store referrals; backend central node derives from patient states/high risk | Count non-closed referrals in store, or backend candidate referral patients | `referralStatus.pending`; `/api/emergency/referrals`; `/api/emergency/central-node/snapshot.data.referralsPending` | Header, Whiteboard, Analytics, Referrals | Header strip, Whiteboard command layer, Analytics command layer, Referral panel |
| Referral awaiting response / delay | MANUAL_REVIEW | Store referral statuses and backend generated referral `elapsedMinutes` | Status-specific delay is available but not normalized to one active metric | `referrals[].status`, `requestedAt`, `respondedAt`; `/api/emergency/referrals.data.referrals[].elapsedMinutes` | Referral panel | Referral UI shows rows/statuses; no central command metric yet |
| Analytics shift KPIs | ACTIVE_VISIBLE | Store analytics builder; backend analytics | Current active census, waiting, high risk, boarding, reassessment, average wait, capacity score | `emergencyAnalytics.data.shift`; `/api/emergency/analytics` | Analytics | Analytics KPI cards and charts |
| Central node operational summary | ACTIVE_VISIBLE | Central node builder | Normalized metric list from current department status, EMS, capacity, reassessment, boarding, referrals | `useCareDroidCentralNode().snapshot.operationalSummary.metrics` | Header, Whiteboard, Analytics | Shared command strip/cards |
| Store operational summary selector | DUPLICATE_DERIVED | Store selector | Mirrors central command metrics for store-only consumers/tests | `selectEmergencyOperationalSummary()` | Tests and retained local consumers | Hidden as a selector; kept aligned with central summary |
| Fixtures/demo metrics | FIXTURE_ONLY | Backend fixtures and scenario fixtures | In-memory patients, rooms, alerts, EMS/referrals | `emergency-os.fixtures.ts`, `edScenarioFixtures` | Backend services/store initialization | Labelled by existing envelope/source handling as backend fixture or walkthrough dataset |

## Command Layer Model

The active command layer is the CareDroid Central Node snapshot. It normalizes store and backend Emergency OS data into:

- `currentDepartmentStatus`: patients today, active patients, waiting patients, longest wait, average wait, capacity band, active alerts.
- `queueHealth`: per-queue counts, oldest wait, targets, breach flag.
- `emsPressure`: inbound EMS count, critical inbound count, pressure status.
- `capacityStatus`: existing capacity snapshot with score, band, rooms, boarders, reassessment, occupancy, deductions.
- `boardingStatus`: boarder count and risk.
- `referralStatus`: pending referral count.
- `operationalSummary.metrics`: shared visible metric list used by Header/AppShell, Whiteboard, and Analytics.

Freshness/source handling remains delegated to the existing central node sync state and analytics envelope source:

- `sync.source` distinguishes `store` from `backend-snapshot`.
- `sync.lastSyncedAt`, `generatedAt`, and existing status messages power labels/tooltips.
- Analytics still labels backend, client fallback, and walkthrough/demo states through existing `emergencyAnalytics.source` and `message`.

## Wiring Map

| Surface | Wiring | Metrics now visible |
| --- | --- | --- |
| AppShell / Header | `Header` already runs inside `AppShell` and uses `useCareDroidCentralNode({ realtime: true })`; the shared `operationalSummary.metrics` now includes `averageWait` and the route map opens the queues route for wait metrics. | Patients today, waiting, longest wait, average wait, EMS inbound, reassessments due, capacity score/band, boarders, referrals pending |
| Whiteboard | `EmergencyWhiteboard` now uses `useCareDroidCentralNode({ screenMode: 'COMMAND_CENTER_DISPLAY' })` and renders route-aware central-node metric cards above local stats. | Patients today, average wait, EMS inbound, capacity score/band, boarders, referrals pending, with local/store vs backend snapshot freshness |
| Analytics | `EmergencyAnalytics` now uses the central node snapshot alongside existing analytics backend data and renders an "Operational Command Layer" section before aggregate charts. | Patients today, average wait, EMS inbound, capacity score/band, boarders, referrals pending, with source/freshness labels |

## Fixes Applied

- Added `averageWait` to the shared operational metric key union, store selector, central node operational summary, and header route registry.
- Reused the existing central node snapshot for Whiteboard and Analytics instead of creating a new metrics engine.
- Added Whiteboard command-layer cards for the requested operational focus metrics while preserving existing queue-filter handoff and whiteboard stats.
- Added Analytics command-layer cards so live/store operational metrics sit beside, but remain distinct from, aggregate analytics charts.
- Updated focused tests for store summary labels, Header command labels, and central node backend harmonization.

## Remaining Hidden / Manual-Review Metrics

- EMS offload risk is available from `/api/emergency/ems`, but remains an EMS route metric rather than a global command metric.
- Boarding duration and escalation are available from `/api/emergency/boarding`, but the global command layer shows boarder count/risk only.
- Referral delay/awaiting-response metrics are present as referral status, timestamps, and backend `elapsedMinutes`, but need one normalized definition before promotion to the command layer.
- Active census is visible on the Whiteboard and present in analytics/central snapshots; it was not added as a separate command card because the requested patient command metric was patients today and Header width is constrained.
- Store and central-node summaries intentionally duplicate derivation for local-selector coverage; central node remains the visible command-layer contract.

## Validation

Passed:

```text
npx eslint "src/store/emergencyStore.ts" "src/central-node/careDroidCentralNode.ts" "src/components/Header.tsx" "src/pages/emergency/index.tsx" "src/pages/emergency/EmergencyAnalytics.jsx"
npm run typecheck:frontend
npx vitest run "src/store/emergencyStore.operationalSummary.test.ts" "src/central-node/careDroidCentralNode.test.ts" "src/components/Header.centralControl.test.tsx" "src/components/EmergencyWhiteboard.storeReactivity.test.jsx"
```

Results:

```text
ESLint: passed
Frontend typecheck: passed
Vitest: 4 files passed, 8 tests passed
```
