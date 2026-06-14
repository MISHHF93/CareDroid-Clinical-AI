# Backend Frontend Wiring Validation

Date: 2026-06-14

## Operating Contract

This pass preserves one CareDroid Emergency OS: one repository, one active Vite SPA, one AppShell, one route surface, one navigation system, one `/api/emergency/*` API facade, one Nest Emergency OS module, one central node, and one AI governance layer.

## Active Wiring Trace

| Capability | Backend chain | Frontend chain | Classification |
| --- | --- | --- | --- |
| Central Node | `GET /api/emergency/central-node/snapshot` -> `EmergencyOsController` -> `CareDroidCentralNodeService` -> typed `CareDroidCentralNodeSnapshot` envelope | `fetchCareDroidCentralNodeSnapshot` -> `useCareDroidCentralNode` -> `buildCareDroidCentralNodeSnapshot` -> `Header` status strip | ACTIVE |
| Whiteboard | `GET /api/emergency/whiteboard` -> `EmergencyWhiteboardService` -> patient/room/staff/alert/capacity envelope | `fetchEmergencyWhiteboard` -> `useEmergencyWhiteboard` -> whiteboard route/cards | ACTIVE |
| Patients | `GET/POST /api/emergency/patients` -> `EmergencyPatientService` and `SmartIntakeService` -> patient envelope/create envelope | `fetchEmergencyPatients`, `createEmergencyPatient` -> `useEmergencyPatients` and intake actions -> Patients route/detail panel | ACTIVE |
| Patient Journey | `GET /api/emergency/journey`, `GET /api/emergency/patients/:id/workflow-logs` -> `PatientJourneyService`, `WorkflowActionLogService` | `usePatientJourney`, patient timeline context -> Patients route Journey Engine card and `PatientDetailPanel` | ACTIVE |
| EMS | `GET /api/emergency/ems` -> `EMSIntakeService` -> arrivals/offload envelope | `fetchEMSIntake` -> `useEMSIntake` -> `EMSPipeline` | ACTIVE |
| Smart Intake | `GET/POST /api/emergency/intake`, `POST /api/emergency/intake/vertical-slice` -> `SmartIntakeService` | `fetchSmartIntake`, `createSmartIntakePatient`, `runSmartIntakeVerticalSlice` -> `SmartIntake` page and intake controls | ACTIVE |
| Queues | `GET /api/emergency/queues` -> `QueueIntelligenceService` | `fetchEmergencyQueues` -> `useEmergencyQueues` -> Queues route | ACTIVE |
| Reassessment | `GET /api/emergency/reassessment` -> `ReassessmentService` | `fetchReassessmentQueue` -> `useReassessmentQueue` -> Reassessment route/drawer | ACTIVE |
| Capacity | `GET /api/emergency/capacity` -> `CapacityService` | `fetchCapacityStatus` -> `useCapacityStatus` -> Capacity route and central status | ACTIVE |
| Boarding | `GET /api/emergency/boarding` -> `BoardingService` | `fetchBoardingStatus` -> `useBoardingStatus` -> Boarding route | ACTIVE |
| Referrals | `GET /api/emergency/referrals` -> `ReferralService` | `fetchReferrals` -> `useReferrals` -> `ReferralPanel` | ACTIVE |
| Copilot and AI Governance | `GET /api/emergency/copilot`, governance endpoints -> `EDCopilotService`, governance controllers/services | `fetchEDCopilot`, governance clients -> Copilot route/panel with text, image metadata, and browser voice dictation; Settings AI cards | ACTIVE |
| Analytics | `GET /api/emergency/analytics` -> `EmergencyAnalyticsService` | analytics client/store fallback -> `EmergencyAnalytics` | ACTIVE |
| Settings | `GET/PATCH /api/emergency/settings` -> `EmergencySettingsService` | settings clients -> `EmergencySettings` | ACTIVE |
| Workflow Audit | `GET /api/emergency/workflow-logs` -> `WorkflowActionLogService` | `fetchEmergencyWorkflowLogs` -> Settings audit and patient log merge | ACTIVE |
| Integration Hub | `GET /api/emergency/integrations` -> `IntegrationHubService` | `fetchIntegrationHub` -> Settings runtime connector cards | ACTIVE |
| Provincial Health | `GET /api/emergency/provincial-health` -> `ProvincialHealthService` | `fetchProvincialHealth` -> Settings provincial runtime cards | ACTIVE |
| Upgrade Harness | upgrade-harness endpoints -> `EmergencyOsUpgradeHarnessService` deterministic pilot envelopes | upgrade harness hooks -> analytics/capacity/patient detail review cards | MANUAL_REVIEW |
| Simulation, Federated Learning, Digital Twin | advanced endpoints -> deterministic demo services | guarded/review clients | MANUAL_REVIEW |

## Harmonization Applied

- Central Node: the existing backend central-node envelope now feeds the active central-node snapshot builder and header/status strip, with local store fallback for missing fields.
- Startup hydration: the AppShell store initialization now uses the canonical `emergencyOsApi.js` facade for active module envelopes and hydrates queues, reassessment, referrals, and workflow logs into the existing central store.
- Patient Journey: the existing journey endpoint is now rendered inside the active Patients route instead of requiring a second journey route or duplicate page shell.
- Runtime connectors: Integration Hub and Provincial Health remain visible through Settings runtime cards without adding routes.
- Capability inventory: active queue/capacity endpoints are separated from optional disabled dashboard/history/analytics routes.
- Data shape normalization: EMS and referral vitals accept current and legacy vital aliases; analytics fallback remains chart-ready.
- Copilot multimodal UI: the active docked Copilot now accepts typed prompts, browser image attachment metadata/previews, and speech-recognition dictation without creating another assistant surface.

## Remaining MANUAL_REVIEW Items

- Optional capacity dashboard/history, queue analytics, shift export, Smart Intake session APIs, referral transfer/diversion history, and advanced AI/ML automation require backend ownership, product acceptance, reliability criteria, and clinical safety review before promotion.
- Copilot image interpretation remains guarded until a reviewed vision backend contract, model governance, audit payload, storage/retention policy, and human-review workflow are defined.
- `src/layout/AppShell.jsx` remains a compatibility artifact; the active shell is `src/components/AppShell.tsx`.
- `_review` future modules remain archived review material and are not active runtime dependencies.

## Validation Plan

- Frontend: focused central-node, settings, capability, API facade, and route wiring tests; frontend typecheck; ESLint; production build.
- Backend: Emergency OS controller tests and backend build for touched contracts.
- Residual: full Playwright responsive QA, Android QA, and complete `validate:ci` remain broader release checks.

## Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck:frontend` | Passed | Central-node adapter type narrowing fixed and rerun clean. |
| `npm run lint` | Passed | Frontend ESLint completed cleanly. |
| `npx vitest run src/central-node/careDroidCentralNode.test.ts` | Passed | Central-node local snapshot, backend envelope, and public redaction cases covered. |
| `npx vitest run src/central-node/careDroidCentralNode.test.ts src/services/emergencyOsApi.test.js src/config/backendApiCapabilities.test.js src/pages/emergency/EmergencySettings.test.jsx src/components/R12EndToEndWiring.test.tsx src/data/backendFrontendExposure.test.js` | Passed | Focused wiring and exposure suite passed: 6 files, 46 tests. |
| `npm run build` | Passed | Production frontend build passed; existing circular/manual chunk and `offlineService` import warnings remain. |
| `npm run backend:build` | Passed | Nest backend build passed. |
| `npm test -- emergency-os.controller.spec.ts --runInBand` from `backend/` | Passed | Emergency OS backend controller spec passed: 12 tests. |
