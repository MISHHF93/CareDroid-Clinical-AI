# CareDroid Emergency OS Auto Wiring Map

## Active Backend To UI Map

| Backend capability | Service/function | Endpoint | API client/hook/store | Visible frontend location | Status | Bridge implemented |
|---|---|---|---|---|---|---|
| Emergency whiteboard | `EmergencyWhiteboardService.getWhiteboard` | `GET /api/emergency/whiteboard` | `fetchEmergencyWhiteboard` -> `useEmergencyWhiteboard` -> `hydrateFromApi` | `/emergency/whiteboard`, `EmergencyWhiteboard`, `PatientCard`, capacity and EMS summaries | ACTIVE_AND_WIRED | Existing |
| Patients | `EmergencyPatientService.getPatientEnvelope` | `GET /api/emergency/patients` | `fetchEmergencyPatients` -> `useEmergencyPatients` | `/emergency/patients`, inline `PatientsRoute`, `PatientCard` | ACTIVE_AND_WIRED | Existing |
| Create patient | `SmartIntakeService.createFromIntake` | `POST /api/emergency/patients`, `POST /api/emergency/intake` | `createEmergencyPatient`, `createSmartIntakePatient` | Quick intake and Smart Intake fallback workflows | ACTIVE_AND_WIRED | Existing |
| Patient journey | `PatientJourneyService.getJourney` | `GET /api/emergency/journey` | `fetchPatientJourney` -> `usePatientJourney` | Patient timeline/details indirectly through patient payload; no active standalone route | BACKEND_ONLY | Documented review |
| Workflow logs | `WorkflowActionLogService.getEnvelope` | `GET /api/emergency/workflow-logs` | `fetchEmergencyWorkflowLogs`, hook hydration | `/emergency/settings` audit section | ACTIVE_AND_WIRED | Hydration extended |
| EMS intake | `EMSIntakeService.getEMSIntake` | `GET /api/emergency/ems` | `fetchEMSIntake` -> `useEMSIntake` -> normalized `emsArrivals` | `/emergency/ems`, whiteboard EMS cards, `EMSPressureScore` | ACTIVE_AND_WIRED | Added hook mount and normalization |
| Smart Intake state | `SmartIntakeService.getSmartIntake` | `GET /api/emergency/intake` | `fetchSmartIntake` | `/emergency/intake` start/review state | ACTIVE_AND_WIRED | Replaced disabled session call |
| Smart Intake vertical slice | `SmartIntakeService.createVerticalSlice` | `POST /api/emergency/intake/vertical-slice` | `runSmartIntakeVerticalSlice` | `/emergency/intake`, `NewPatientIntake`, dependent whiteboard/queues/reassessment/capacity | ACTIVE_AND_WIRED | Smart Intake create/unknown bridged |
| Queues | `QueueIntelligenceService.getQueues` | `GET /api/emergency/queues` | `fetchEmergencyQueues` -> `useEmergencyQueues` | `/emergency/queues` | ACTIVE_AND_WIRED | Existing |
| Reassessment | `ReassessmentService.getReassessmentQueue` | `GET /api/emergency/reassessment` | `fetchReassessmentQueue` -> `useReassessmentQueue` | `/emergency/reassessment`, AppShell reassessment drawer | ACTIVE_AND_WIRED | Existing |
| Capacity | `CapacityService.getCapacity` | `GET /api/emergency/capacity` | `fetchCapacityStatus` -> `useCapacityStatus` | `/emergency/capacity`, whiteboard crisis mode | ACTIVE_AND_WIRED | Existing |
| Boarding | `BoardingService.getBoarding` | `GET /api/emergency/boarding` | `fetchBoardingStatus` -> `useBoardingStatus` | `/emergency/boarding`, capacity cards | ACTIVE_AND_WIRED | Existing |
| Referrals | `ReferralService.getReferrals` | `GET /api/emergency/referrals` | `fetchReferrals` -> `useReferrals` -> normalized `referrals` | `/emergency/referrals`, whiteboard referral actions | ACTIVE_AND_WIRED | Added hook mount and normalization |
| Copilot context | `EDCopilotService.getCopilotContext` | `GET /api/emergency/copilot` | `fetchEDCopilot` -> `useEDCopilot` | `/emergency/copilot`, docked Copilot context | ACTIVE_AND_WIRED | Existing |
| Analytics | `EmergencyAnalyticsService.getAnalytics` | `GET /api/emergency/analytics` | `fetchEmergencyAnalytics` -> `loadEmergencyAnalytics` | `/emergency/analytics`, queue analytics consumers | ACTIVE_AND_WIRED | Backend-first loader added |
| Settings | `EmergencySettingsService.getSettings/updateSettings` | `GET/PATCH /api/emergency/settings` | `fetchEmergencySettings`, `updateEmergencySettings`, `emergencySettingsApi` wrapper | `/emergency/settings` | ACTIVE_AND_WIRED | Canonical PATCH added |

## Review/Future Backend Capabilities

| Capability | Endpoint(s) | Classification | Rationale |
|---|---|---|---|
| Provincial health connector | `GET /api/emergency/provincial-health` | BACKEND_ONLY | Placeholder connector, no active route; settings exposes connector configuration. |
| Integration hub | `GET /api/emergency/integrations` | BACKEND_ONLY | Placeholder external feed status; no active route. |
| Complete implementation readiness | `GET /api/emergency/implementation-readiness` | FUTURE_MODULE | Review-only reconciliation contract for implementation prompts and active-spine conflicts. |
| Real-time simulation | `/api/emergency/simulation/*` | FUTURE_MODULE | Advanced operational simulation, not one of active routes. |
| Federated learning | `/api/emergency/federated-learning/*` | FUTURE_MODULE | Research/privacy model workflow, not active navigation. |
| Hybrid digital twin | `/api/emergency/digital-twin/*` | FUTURE_MODULE | Future modeling contract, not active navigation. |
| Research controllers | `/handover/er-pulse`, `/ems/federated/112-call`, `/federated/lmecs/*`, `/ems/ai-call-interrogation*`, `/api/emergency/digital-twin/organizational/*` depending global prefix | FUTURE_MODULE | Research-only controllers mounted in module but outside active Emergency OS pages. |

## Files Changed By Wiring

- `src/services/emergencyOsApi.js`
- `src/services/emergencySettingsApi.js`
- `src/hooks/useEmergencyOs.js`
- `src/components/EMSPipeline.jsx`
- `src/components/ReferralPanel.jsx`
- `src/pages/emergency/SmartIntake.jsx`
- `src/store/emergencyStore.ts`
- `src/pages/emergency/EmergencyAnalytics.jsx`
- `src/services/emergencyOsApi.test.js`

## Remaining Risks

- Mutation parity is incomplete for referrals and manual patient linking because canonical Nest endpoints are read-only or absent for those actions.
- Advanced/research backend capabilities should stay out of active navigation until product scope and clinical safety requirements are approved.
