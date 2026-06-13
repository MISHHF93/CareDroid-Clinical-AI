# Scenario Fixture Validation

## Scenario Catalog

The active Emergency OS app now uses `src/data/edScenarioFixtures.js` as the canonical demo fixture source for:

- `normal-day`
- `high-volume-day`
- `ems-surge`
- `boarding-crisis`
- `reassessment-backlog`
- `capacity-red`
- `multiple-high-risk-waiting`
- `unknown-patient-intake`
- `provincial-data-conflict`

Each scenario produces internally consistent patients, rooms, staff, EMS arrivals, queues, reassessment state, boarding state, capacity status, analytics aggregates, provincial connector context, and copilot prompt context.

## Surface Coverage

All scenarios populate the same surface contracts:

- Whiteboard: `patients`, `staff`, `rooms`, `alerts`, and `capacity`.
- Queues: queue rows with counts, target waits, oldest waits, breached state, and patients.
- EMS: inbound/arrived arrivals, EMS units, vitals, severity, ETA, offload, and prepared room context.
- Reassessment: due patients, overdue count, and next action.
- Capacity: score, band, room status, boarding count, reassessment count, and recommendations.
- Boarding: boarding patients, longest boarding minutes, and escalation label.
- Analytics: daily volume, hourly arrivals, wait trend, top complaints, and queue performance.
- Copilot: patient count, high-risk count, EMS pressure, boarding count, reassessment count, queue summary, capacity, and data conflict count.
- Provincial data conflict: conflict records and required human reconciliation context.
- Unknown intake: temporary MRN, EMS arrival flag, and identity reconciliation action.

## Frontend Wiring

`src/store/emergencyStore.ts` initializes from the persisted scenario id and exposes:

- `availableScenarios`
- `activeScenarioId`
- `activeScenario`
- `scenarioData`
- `setActiveScenario()`

`src/hooks/useEmergencyOs.js` returns scenario-backed envelopes for active Emergency OS modules, so mounted route pages continue using their existing hook contracts instead of isolated mock-only code. Backend fetch behavior remains available in the request helpers; scenario mode supplies the active demo data before the network path is used.

`store/emergencyStore.ts` also receives root-store scenario adapters for currently mounted EMS and analytics surfaces that still consume the root Emergency OS store. The header selector updates both stores to keep these routes synchronized.

`src/components/Header.tsx` exposes the active scenario selector next to capacity status. `src/pages/emergency/index.tsx`, `src/components/EMSPipeline.jsx`, and `src/pages/emergency/EmergencyAnalytics.jsx` display scenario labels so users can see which demo mode is loaded.

## Validation Commands

Focused scenario validation:

```bash
npm run test:run -- src/data/edScenarioFixtures.test.js src/store/emergencyScenarioStore.test.ts
```

Relevant route and service validation:

```bash
npm run test:run -- src/routing/canonicalRouteRedirects.test.js src/routing/routeAuthRebuild.test.js src/services/emergencyOsApi.test.js
```

Requested broader verification:

```bash
npm run typecheck:frontend
npm run lint
npm run build
```

## Boundaries

These fixtures are deterministic demo data for the active app shell. They do not write to backend services, do not touch `caredroid.sqlite`, and do not replace production Emergency OS endpoints. The selector persists the selected demo id in browser `localStorage` for reload continuity. Clinical content is illustrative and must remain under human review; provincial conflict records are explicit reconciliation prompts, not autonomous medication guidance.
