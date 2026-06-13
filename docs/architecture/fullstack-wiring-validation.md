# Fullstack Wiring Validation

Generated: 2026-06-13

## Verification Commands

| Step | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck:frontend` | Passed after fixing the whiteboard hook envelope type boundary. |
| Backend typecheck/build | `npm run backend:build` | Passed. |
| Frontend lint | `npm run lint` | Passed. |
| Backend lint | `cd backend && npm run lint` | Passed. |
| Frontend build | `npm run build` | Passed. Vite reported the existing large chunk/dynamic import warnings. |
| Focused frontend tests | `npx vitest run src/layout/AppShell.navigation.test.jsx src/navigation/iconRegistry.test.js src/config/backendApiCapabilities.test.js src/data/frontendApiCallsInventory.schedule.test.js` | Passed: 4 files, 20 tests. |
| Focused backend test | `cd backend && npm test -- --runTestsByPath src/modules/emergency-os/emergency-os.controller.spec.ts` | Passed: 1 suite, 2 tests. |

## Module Validation Matrix

| Module | Frontend route | Page file | Components | Hooks | API client | Backend endpoint | Service | Data source | UI render location | Status before | Status after | Remaining gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | `/emergency/whiteboard` | `src/pages/emergency/index.tsx` | `PatientCard`, `QuickIntake` | `useEmergencyWhiteboard` | `emergencyOsApi.js` | `/api/emergency/whiteboard` | `EmergencyWhiteboardService` | Backend fixture | Whiteboard stats/grid | Store-backed | Verified API-backed UI | Durable DB |
| Patients | `/emergency/patients` | `src/App.jsx` | `PatientsRoute` | `useEmergencyPatients` | `emergencyOsApi.js` | `/api/emergency/patients` | `EmergencyPatientService` | Backend fixture | Patient route | Alias-only | Verified route/API/backend | CRUD persistence |
| Patient Journey Engine | `/emergency/journey` | `src/App.jsx` | `JourneyRoute` | `usePatientJourney` | `emergencyOsApi.js` | `/api/emergency/journey` | `PatientJourneyService` | Timeline fixtures | Journey route | Not routed | Verified route/API/backend | Durable event log |
| EMS Intake | `/emergency/ems` | `src/App.jsx` | `EMSRoute` | `useEMSIntake` | `emergencyOsApi.js` | `/api/emergency/ems` | `EMSIntakeService` | EMS fixture | EMS page | Optional route split | Verified route/API/backend | Live EMS feed |
| Smart Intake | `/emergency/intake` | `src/App.jsx`, `QuickIntake.tsx` | `SmartIntakeRoute`, `QuickIntake` | `useSmartIntake` | `emergencyOsApi.js` | `/api/emergency/intake` | `SmartIntakeService` | Fixture plus POST-created patients | Intake route/modal | Local-only create | Verified GET/POST/backend | OCR/MPI/provincial connectors |
| Queue Intelligence | `/emergency/queues` | `src/App.jsx` | `QueueRoute` | `useEmergencyQueues` | `emergencyOsApi.js` | `/api/emergency/queues` | `QueueIntelligenceService` | Patient-derived | Queue cards | Local-only | Verified route/API/backend | Durable queue events |
| Reassessment Engine | `/emergency/reassessment` | `src/App.jsx` | `ReassessmentRoute` | `useReassessmentQueue` | `emergencyOsApi.js` | `/api/emergency/reassessment` | `ReassessmentService` | Flag-derived | Reassessment cards | Disconnected optional backend | Verified route/API/backend | Completion KPI |
| Capacity Intelligence | `/emergency/capacity` | `src/App.jsx` | `CapacityRoute` | `useCapacityStatus` | `emergencyOsApi.js` | `/api/emergency/capacity` | `CapacityService` | Rooms/patients | Capacity metrics | Local-only | Verified route/API/backend | Bed feed |
| Boarding Intelligence | `/emergency/boarding` | `src/App.jsx` | `BoardingRoute` | `useBoardingStatus` | `emergencyOsApi.js` | `/api/emergency/boarding` | `BoardingService` | Patient-derived | Boarding cards | Local-only | Verified route/API/backend | Inpatient bed feed |
| Referral Intelligence | `/emergency/referrals` | `src/App.jsx` | `ReferralsRoute` | `useReferrals` | `emergencyOsApi.js` | `/api/emergency/referrals` | `ReferralService` | Patient-derived | Referral cards | API mismatch | Verified route/API/backend | Referral writes |
| Provincial Health Connector | `/emergency/provincial-health` | `src/App.jsx` | `ProvincialHealthRoute` | `useProvincialHealth` | `emergencyOsApi.js` | `/api/emergency/provincial-health` | `ProvincialHealthService` | Placeholder | Provincial route | Missing | Verified placeholder route/API/backend | Live provincial adapter |
| IoT/Integration Hub placeholders | `/emergency/integrations` | `src/App.jsx` | `IntegrationsRoute` | `useIntegrationHub` | `emergencyOsApi.js` | `/api/emergency/integrations` | `IntegrationHubService` | Placeholder | Integration route | Disconnected demos | Verified placeholder route/API/backend | Live connector runtime |
| ED Copilot | `/emergency/copilot` | `src/App.jsx`, `CopilotPanel.tsx` | `CopilotRoute`, `CopilotPanel` | `useEDCopilot` | `emergencyOsApi.js`, `clinicalChatService.js` | `/api/emergency/copilot` | `EDCopilotService` | Context fixture | Copilot route/panel | Chat only | Verified context route/API/backend | Provider/auth configuration |
| Analytics | `/emergency/analytics` | `src/App.jsx` | `AnalyticsRoute` | `useEmergencyAnalytics` | `emergencyOsApi.js` | `/api/emergency/analytics` | `EmergencyAnalyticsService` | Derived fixture | Analytics metrics | Local/disabled | Verified route/API/backend | Durable KPI source |
| Settings | `/emergency/settings` | `src/App.jsx` | `EmergencySettingsRoute` | `useEmergencySettings` | `emergencyOsApi.js` | `/api/emergency/settings` | `EmergencySettingsService` | Settings fixture | Settings cards | Static local | Verified route/API/backend | Settings persistence |

## Acceptance Criteria Status

- Every listed Emergency OS module has a reachable frontend route inside `RootLayout -> AppShell`.
- Every route consumes a named hook backed by `src/services/emergencyOsApi.js` or, for chat messages, the existing `clinicalChatService.js` facade.
- Every normalized `/api/emergency/*` endpoint exists in the always-mounted Nest `EmergencyOsModule` and returns typed envelopes.
- Fixture-backed data visibly reaches UI cards, tables, metrics, or panels.
- Local fixture status is explicit for provincial health and integration hub placeholders; no live external connector is implied.
