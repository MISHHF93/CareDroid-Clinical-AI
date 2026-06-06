# Demo/Live State Reconciliation

Generated: 2026-06-06

## Purpose

Audit CareDroid surfaces that can look live while using demo, mock, simulated, local-only, backend-unavailable, or unsupported data. The goal is to make every affected page explicit about source state before users interpret telemetry, devices, fleet positions, simulations, AI outputs, analytics, or governance/security data as operational truth.

## State Labels

| Label | Meaning | Required UI treatment |
|---|---|---|
| Live | Backed by a real backend or external system of record. | Show source and timestamp. |
| Demo | Deterministic sample contract or frontend fixture. | Say it is demo and not clinical/operational truth. |
| Mock | Synthetic placeholder or visual mock. | Say it is a mock/coordinate placeholder. |
| Simulated | Scenario, model, escalation, or training output without real-world side effects. | Say it is simulated and not dispatched/executed externally. |
| Backend unavailable | A backend capability exists in concept but is unavailable from this environment. | Show fallback state and explain local/demo fallback. |
| Unsupported | No backend route/capability exists for the requested operation. | Say unsupported and avoid live-action language. |

## Audit Matrix

| Surface | Files | Current state | Risk | Fix |
|---|---|---|---|---|
| Hospital map | `src/pages/HospitalMapDashboard.jsx`, `src/services/hospitalMapService.js`, backend hospital-map/live-tracking routes | Backend demo contracts with local demo fallback. Device coordinates and telemetry can look operational. | Fake telemetry/mock devices may be interpreted as live indoor tracking. | Add visible state labels for demo, mock coordinate layer, backend unavailable, and unsupported planned endpoints. |
| Medical IoT | `src/pages/MedicalIotDashboard.jsx`, `src/services/medicalIotService.js` | Demo telemetry from backend or local fixtures. | Patient/device vitals can look like live monitoring. | Add explicit demo telemetry and backend-unavailable labels near hero and data panels. |
| Device fleet | `src/pages/DeviceFleetManagement.jsx`, `src/services/hospitalMapService.js` | Uses hospital/device demo snapshot; write actions are local-only. | Assignment, maintenance, calibration, and firmware controls can look like live device actions. | Preserve local-only action note and add source-state labels for mock devices, unsupported writes, and backend-unavailable fallback. |
| Fleet command and map | `src/pages/fleet/FleetDashboard.jsx`, `src/pages/fleet/FleetLiveMap.jsx`, `src/services/fleetTelemetryService.js` | Demo/mock fleet telemetry contracts and frontend fallback. | “Live” and operational fleet wording can imply real dispatch/GPS. | Label command and map views as demo/mock fleet data unless backend source is truly live. |
| Combined live map | `src/pages/LiveTrackingMap.jsx`, live/fleet/hospital/IoT services | Combines demo fleet, hospital, and IoT snapshots. | Aggregated fake live claims across multiple domains. | Add cross-domain source labels and avoid unqualified live claims. |
| Simulation | `src/pages/MedicalSimulationSuite.jsx`, `src/pages/SimulationScenarioPlayer.jsx`, `src/pages/SimulationOutcomes.jsx`, backend simulation module | Simulation/demo training flows. | Scenario outputs may be mistaken for real patient care execution. | Add simulated-state labels and ensure no real dispatch/clinical action implication. |
| Laboratory | `src/pages/LaboratoryDashboard.jsx`, `src/pages/tools/LabInterpreter.jsx` | Demo lab dashboard data and AI/tool output surfaces. | Local-only or generated lab interpretations can appear clinical-authoritative. | Label demo/local-only AI outputs and backend-unavailable/unsupported routes. |
| 3D viewer | `src/pages/Medical3DViewer.jsx` | Local visualization/demo asset surface. | View can appear as patient-specific imaging. | Label as demo/mock visualization unless real imaging source is present. |
| AI dashboards | `src/pages/AiCommandCenterDashboard.jsx`, AI/evaluation/cost services | Mixed backend, local fallback, and demo status cards. | Local-only AI outputs and fallback metrics may appear production-live. | Standardize fallback/demo/backend-unavailable labels. |
| Analytics | `src/pages/AnalyticsDashboard.jsx`, analytics services | Backend analytics when available; otherwise empty/error states. | Fake/backend-unavailable responses can be unclear. | Add backend state labels and no fake live analytics claims. |
| Governance/security | `src/pages/GovernanceRegistry.jsx`, `src/pages/platform/PlatformGovernanceWorkspace.jsx`, governance/security services | Demo/synthetic governance records and review queues in several places. | Demo governance/security findings can look like active production controls. | Add demo/simulated/security-review labels where backend returns demo or synthetic contracts. |
| Digital twin backend | `backend/src/modules/platform-assets/digital-twin.service.ts` | Organization-scoped snapshots can be entitlement-aware while still using static/demo contracts. | `live_contract_ready` could imply live operational feeds are connected. | Rename status to organization-contract-ready and include explicit `demoData: true`, `liveDataAvailable: false`, and safer source label. |

## Execution Plan

1. Add a shared demo/live state helper so labels are consistent and easy to test.
2. Apply visible labels to operational tracking pages: hospital map, Medical IoT, device fleet, fleet map, and combined live map.
3. Apply labels to clinical/AI pages: simulation, laboratory, 3D viewer, AI dashboards, analytics, and governance/security surfaces.
4. Add focused tests for visible labels, backend unavailable state, unsupported state, and no fake live claims.
5. Run focused tests and production build, then record verification here.

## Acceptance Notes

This report is created before code changes. The implementation should avoid broad refactors and focus on source-state clarity. Existing route names such as “Live Tracking Map” may remain for navigation compatibility, but page content must qualify demo/mock sources visibly.

## Executed Fixes

- Added shared source-state vocabulary in `src/utils/demoLiveState.js` and reusable visible notice component in `src/components/StateSourceNotice.jsx`.
- Applied normalized labels to operational pages: `src/pages/HospitalMapDashboard.jsx`, `src/pages/MedicalIotDashboard.jsx`, `src/pages/DeviceFleetManagement.jsx`, `src/pages/fleet/FleetDashboard.jsx`, `src/pages/fleet/FleetLiveMap.jsx`, and `src/pages/LiveTrackingMap.jsx`.
- Applied normalized labels to simulation, lab, 3D, AI, analytics, and governance/security surfaces: `src/pages/MedicalSimulationSuite.jsx`, `src/pages/SimulationScenarioPlayer.jsx`, `src/pages/SimulationOutcomes.jsx`, `src/pages/LaboratoryDashboard.jsx`, `src/pages/tools/LabInterpreter.jsx`, `src/pages/Medical3DViewer.jsx`, `src/pages/AiCommandCenterDashboard.jsx`, `src/pages/AiEvaluationDashboard.jsx`, `src/pages/PredictiveAnalyticsDashboard.jsx`, `src/pages/AnalyticsDashboard.jsx`, `src/pages/CostAnalyticsDashboard.jsx`, `src/pages/GovernanceRegistry.jsx`, and `src/pages/platform/PlatformGovernanceWorkspace.jsx`.
- Tightened digital twin backend metadata so organization-scoped demo snapshots no longer claim live-contract readiness.
- Reworded ambiguous AI command center copy from unqualified "live" language to source-mix/refresh wording while keeping real backend status visible where available.
- Added focused tests for visible labels, backend-unavailable and unsupported coverage, and fake-live copy prevention.

## Verification

- `npm run test:run -- src/components/StateSourceNotice.test.jsx src/utils/demoLiveState.test.js src/pages/demoLiveStateReconciliation.test.js` passed: 3 files, 7 tests.
- `npm run test:run -- src/components/StateSourceNotice.test.jsx src/utils/demoLiveState.test.js src/pages/demoLiveStateReconciliation.test.js src/pages/fleet/FleetDashboard.test.jsx src/pages/GovernanceRegistry.test.jsx` passed: 5 files, 17 tests.
- `cd backend && npm test -- digital-twin.service.spec.ts` passed: 1 suite, 2 tests.
- `npm run build` passed, including asset validation and Vite production build.
- `cd backend && npm run build` passed.
