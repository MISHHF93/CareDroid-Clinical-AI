# Advanced Emergency OS Capabilities

Status: implemented as deterministic, fixture-backed Nest services with active frontend routes.

## Capability Traceability

| Capability | Backend service | Backend endpoints | Frontend API and hook | UI route | Data source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Real-Time Simulation for ED decision support | `RealTimeSimulationService` in `backend/src/modules/emergency-os/emergency-os.advanced-services.ts` | `POST /api/emergency/simulation/update-live`, `POST /api/emergency/simulation/evaluate`, `POST /api/emergency/simulation/compare`, `GET /api/emergency/simulation/recommendations` | `emergencyOsApi.js`, `useRealTimeSimulation` | `/emergency/simulation` | Emergency OS patient/capacity fixtures fused with request payload values and historical distributions | Active demo contract |
| Federated Learning for multi-hospital ED prediction | `FederatedLearningService` | `POST /api/emergency/federated-learning/register`, `POST /api/emergency/federated-learning/update`, `POST /api/emergency/federated-learning/aggregate`, `GET /api/emergency/federated-learning/global-model/:hospitalId`, `GET /api/emergency/federated-learning/dashboard` | `emergencyOsApi.js`, `useFederatedLearning` | `/emergency/federated-learning` | In-memory hospitals, local updates, and global model | Active demo contract |
| Hybrid DES-ABM Digital Twin for ED operations | `HybridDigitalTwinService` | `POST /api/emergency/digital-twin/initialize`, `POST /api/emergency/digital-twin/simulate`, `GET /api/emergency/digital-twin/state`, `POST /api/emergency/digital-twin/scenario` | `emergencyOsApi.js`, `useHybridDigitalTwin` | `/emergency/digital-twin` | RtS live state plus deterministic DES-ABM calculations | Active demo contract |

## Implemented Behavior

Real-Time Simulation fuses live request values with historical ED distributions, computes current capacity status, generates a 4-hour forecast, evaluates interventions, ranks interventions by recovery time, and returns action recommendations with confidence and time-to-implement values.

Federated Learning supports hospital registration, local model update submission, endpoint-driven FedAvg weighted by sample count, deterministic differential-privacy noise when enabled, global model retrieval, and dashboard state for hospitals, rounds, metrics, pending updates, and contribution weights.

Hybrid Digital Twin initializes from live or fixture ED state, runs deterministic DES-ABM style simulations, returns twin state, evaluates intervention scenarios, and reports throughput, wait time, LOS, LWBS, burnout, bed/physician/nurse utilization, calibration error, confidence intervals, and optional event traces.

## Discovery and Navigation

The advanced capabilities are wired into:

- `CANONICAL_ROUTES` and React Router in `src/App.jsx`
- `APP_SHELL_NAV_ITEMS` in `src/config/navigation.config.js`
- `EMERGENCY_OS_ROUTE_COMMANDS` in `src/config/commandPalette.config.js`
- Search-first discovery in `src/data/searchFirstDiscovery.js`
- Backend/frontend traceability inventories in `src/data/backendHttpRouteInventory.js` and `src/data/frontendApiCallsInventory.js`
- Capability gating metadata as `emergencyAdvancedDecisionSupport` in `src/config/backendApiCapabilities.js`

## Remaining Production Gaps

- Live ADT/EHR/device feed synchronization is not connected; current RtS and twin state use fixtures plus request payload values.
- Secure aggregation, homomorphic encryption, and real hospital-to-hospital broadcast are placeholder contracts.
- Federated model registry, durable update storage, rollback, approval workflow, and model lineage persistence are not implemented.
- DES engine calibration uses deterministic fixture formulas, not a validated external DES package or hospital-calibrated parameters.
- ABM patient/staff behavior parameters require local calibration before operational use.
- Database persistence is not implemented for advanced simulation state, local model updates, twin state, event traces, or scenario runs.
- Clinical/operations recommendations remain decision support only and require human review before operational action.

## Verification Targets

Focused tests cover:

- `backend/src/modules/emergency-os/emergency-os.controller.spec.ts` for new controller/service contracts.
- `src/services/emergencyOsApi.test.js` for endpoint path and POST payload wiring.
- `src/layout/AppShell.navigation.test.jsx` for AppShell and command palette reachability.
