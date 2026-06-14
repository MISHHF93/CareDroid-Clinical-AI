# Backend To Frontend Trace

## Canonical Emergency OS Controller

Controller: `backend/src/modules/emergency-os/emergency-os.controller.ts`

| Endpoint | Backend function/service | DTO/data shape | Frontend client | Hook/store | Component/page | Rendered state | Status |
|---|---|---|---|---|---|---|---|
| `GET /api/emergency/whiteboard` | `EmergencyWhiteboardService.getWhiteboard` | `{ patients, rooms, staff, alerts, capacity }` envelope | `fetchEmergencyWhiteboard` | `useEmergencyWhiteboard`, `hydrateFromApi` | `EmergencyWhiteboard`, `PatientCard`, `CapacityCrisisMode` | Patient cards, filters, alerts, capacity status, EMS/task summaries | ACTIVE_AND_WIRED |
| `GET /api/emergency/patients` | `EmergencyPatientService.getPatientEnvelope` | `{ patients, staff, alerts }` envelope | `fetchEmergencyPatients` | `useEmergencyPatients` | inline `PatientsRoute` | searchable patient list and patient cards | ACTIVE_AND_WIRED |
| `POST /api/emergency/patients` | `SmartIntakeService.createFromIntake` | `{ patient }` envelope | `createEmergencyPatient` | `hydrateFromApi` via callers | Quick intake/patient creation workflows | created patient appears in store and board | ACTIVE_AND_WIRED |
| `GET /api/emergency/journey` | `PatientJourneyService.getJourney` | `{ events, stateCounts }` envelope | `fetchPatientJourney` | `usePatientJourney` | no active standalone route | review-only journey data, patient timelines still visible through patient payloads | BACKEND_ONLY |
| `GET /api/emergency/workflow-logs` | `WorkflowActionLogService.getEnvelope` | `{ logs }` envelope | `fetchEmergencyWorkflowLogs` | direct settings load and hook hydration | `EmergencySettings` | workflow audit log list | ACTIVE_AND_WIRED |
| `GET /api/emergency/patients/:patientId/workflow-logs` | `WorkflowActionLogService.getEnvelope(patientId)` | `{ logs }` envelope | no active patient-specific client | no active hook | patient detail currently uses patient timeline/store logs | not separately visible | NEEDS_MANUAL_REVIEW |
| `GET /api/emergency/ems` | `EMSIntakeService.getEMSIntake` | `{ arrivals, availableResusRooms }` envelope | `fetchEMSIntake` | `useEMSIntake`, normalized `emsArrivals` | `EMSPipeline`, whiteboard EMS section, `EMSPressureScore` | inbound/awaiting handoff rows, ETA, risk, offload status | ACTIVE_AND_WIRED |
| `GET /api/emergency/intake` | `SmartIntakeService.getSmartIntake` | `{ mode, identityReview, recentPatients }` envelope | `fetchSmartIntake` | Smart Intake start action | `SmartIntake` | session/status state and safeguarded review mode | ACTIVE_AND_WIRED |
| `POST /api/emergency/intake` | `SmartIntakeService.createFromIntake` | `{ patient }` envelope | `createSmartIntakePatient` | `hydrateFromApi` | `QuickIntake` | patient created and visible on board | ACTIVE_AND_WIRED |
| `POST /api/emergency/intake/vertical-slice` | `SmartIntakeService.createVerticalSlice` | `{ patient, encounter, transitions, reassessmentTriggered, whiteboard, queueMetrics, reassessment, capacity, validation }` envelope | `runSmartIntakeVerticalSlice` | `hydrateFromApi` | `SmartIntake`, `NewPatientIntake` | create/unknown patient, whiteboard/queue/reassessment/capacity updates | ACTIVE_AND_WIRED |
| `GET /api/emergency/queues` | `QueueIntelligenceService.getQueues` | `{ queues }` envelope | `fetchEmergencyQueues` | `useEmergencyQueues` | inline `QueueRoute` | queue cards, counts, oldest wait, breached queues | ACTIVE_AND_WIRED |
| `GET /api/emergency/reassessment` | `ReassessmentService.getReassessmentQueue` | `{ patients, overdueCount, nextAction }` envelope | `fetchReassessmentQueue` | `useReassessmentQueue` | inline `ReassessmentRoute`, AppShell drawer | due/overdue patient cards and next action | ACTIVE_AND_WIRED |
| `GET /api/emergency/capacity` | `CapacityService.getCapacity` | `{ capacity, rooms, recommendations }` envelope | `fetchCapacityStatus` | `useCapacityStatus` | inline `CapacityRoute`, whiteboard crisis mode | score, band, rooms, recommendations, boarders | ACTIVE_AND_WIRED |
| `GET /api/emergency/boarding` | `BoardingService.getBoarding` | `{ patients, longestBoardingMinutes, escalation }` envelope | `fetchBoardingStatus` | `useBoardingStatus` | inline `BoardingRoute` | admitted/boarding patient cards and escalation | ACTIVE_AND_WIRED |
| `GET /api/emergency/referrals` | `ReferralService.getReferrals` | `{ referrals }` envelope | `fetchReferrals` | `useReferrals`, normalized `referrals` | `ReferralPanel` | referral groups, department/status/delay metrics | ACTIVE_AND_WIRED |
| `GET /api/emergency/provincial-health` | `ProvincialHealthService.getProvincialHealth` | placeholder records envelope | `fetchProvincialHealth` | `useProvincialHealth` | no active route | configured in settings only | BACKEND_ONLY |
| `GET /api/emergency/integrations` | `IntegrationHubService.getIntegrationHub` | placeholder sources/review queue | `fetchIntegrationHub` | `useIntegrationHub` | no active route | settings integration controls only | BACKEND_ONLY |
| `GET /api/emergency/implementation-readiness` | `CompleteImplementationReadinessService.getReadiness` | active-spine reconciliation contract | `fetchCompleteImplementationReadiness` | no active hook | no active route | review-only readiness/reporting contract | FUTURE_MODULE |
| `GET /api/emergency/copilot` | `EDCopilotService.getCopilotContext` | `{ promptContext, quickActions }` envelope | `fetchEDCopilot` | `useEDCopilot` | inline `CopilotRoute`, docked Copilot | operational context, quick actions, disclaimer | ACTIVE_AND_WIRED |
| `GET /api/emergency/analytics` | `EmergencyAnalyticsService.getAnalytics` | `{ activeCensus, waiting, highRisk, boarding, reassessmentDue, averageWaitMinutes, capacity }` envelope | `fetchEmergencyAnalytics` | `loadEmergencyAnalytics` | `EmergencyAnalytics`, queue analytics consumers | census, wait, boarding, high risk, reassessment KPIs | ACTIVE_AND_WIRED |
| `GET/PATCH /api/emergency/settings` | `EmergencySettingsService.getSettings/updateSettings` | settings contract/patch | `fetchEmergencySettings`, `updateEmergencySettings`, `emergencySettingsApi` wrapper | settings store updates | `EmergencySettings` | tenant, modules, AI, integrations, notifications, thresholds | ACTIVE_AND_WIRED |

## Future/Review Controllers

Advanced services and research controllers are retained but not mounted into active Emergency OS navigation:

- `RealTimeSimulationService`: `/api/emergency/simulation/*`, FUTURE_MODULE.
- `FederatedLearningService`: `/api/emergency/federated-learning/*`, FUTURE_MODULE.
- `HybridDigitalTwinService`: `/api/emergency/digital-twin/*`, FUTURE_MODULE.
- `ERPulseHandoverController`, `FederatedEMSController`, `LMECSController`, `AICallInterrogationController`, `OrganizationalDigitalTwinController`: FUTURE_MODULE / NEEDS_MANUAL_REVIEW.

## Files Changed

See `docs/architecture/discovery-execution-report.md` for the complete file list.
