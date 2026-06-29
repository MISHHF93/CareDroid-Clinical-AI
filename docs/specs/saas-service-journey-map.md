# SaaS Service Journey Map

Runtime source: `src/services/fullEmergencyCareJourneyService.ts`

## Service Map

| Service | Status | Implementation | Stages |
|---|---|---|---|
| EmergencySignalService | Existing | `src/services/emergencySignalService.ts` | Emergency Event, Emergency Call, Rapid Intake |
| DispatchIntakeService | Existing | `src/services/dispatchIntakeService.ts` | Emergency Call, Dispatcher Triage |
| CADIntegrationService | Runtime stub | Dispatch assignment model until external CAD is connected | Ambulance Dispatch |
| EMSUnitService | Extended | `src/store/emergencyStore.ts`, `src/services/emsPreArrivalPipelineService.ts` | Ambulance Dispatch, EMS En Route, Patient Arrival |
| PrehospitalAssessmentService | Extended | `PrehospitalAssessment`, `EMSAssessment`, `PrehospitalPacket` types and EMS surfaces | Scene Assessment, Prehospital Care |
| PreArrivalNotificationService | Existing | `src/services/preArrivalNotification.ts` | Hospital Pre-Arrival Notification |
| EDReadinessService | Existing | `src/services/edReadinessService.ts` | ED Readiness |
| PatientIntakeService | Extended | `src/services/emergencyIntakeOperatingSystemService.ts`, `SmartIntake`, `ReceptionWorkspace` | Patient Arrival, Rapid Intake |
| TriageService | Extended | `src/services/triageAssist.ts`, `src/engine/triageEngine.ts` | Triage, Treatment Observation |
| AIChiefService | Extended | `careDroidBrainService`, `emergencyCopilotApi`, `useAiChiefRouting`, Copilot route | Dispatcher Triage, EMS Pre-Arrival, AI Chief Review |
| CriticalAlertService | Extended | `src/engine/alertEngine.ts`, `src/services/clinicalAlertsApi.ts` | Pre-Arrival, Clinical Action, Treatment Observation |
| ThreeMinuteResponseService | Existing | `src/engine/threeMinuteTimerEngine.ts`, mounted in `src/app/providers.tsx` | Critical prehospital care, triage, critical alerts |
| StaffRoutingService | Extended | Emergency store staff assignment, role access, team management | Dispatch, ED Readiness, Clinical Action |
| DepartmentCapacityService | Existing | `src/services/emergencyCapacityIntelligenceService.ts`, `src/engine/capacityEngine.ts` | ED Readiness, Treatment, Disposition |
| DiagnosticsCoordinationService | Runtime map | `/emergency/diagnostics` aggregates lab/radiology/pharmacy/consult routing | Diagnostics |
| HandoffService | Extended | `ambulanceHandoffChecklist`, `handoffClose`, shift summary | Disposition, Handoff / Reporting |
| BottleneckRegistryService | Existing | `src/services/bottleneckRegistry.ts` | AI Chief Review, Analytics Feedback |
| AnalyticsService | Existing | `src/services/analyticsService.ts`, `emergencyAnalyticsApi` | Outcome Tracking, Analytics Feedback |
| ReportingService | Extended | `/emergency/reports` over live journey metrics and analytics | Handoff / Reporting, Outcome Tracking |
| HelpManualService | Existing | `src/config/userManual.config.ts`, `src/components/help/HelpHub.tsx` | Analytics Feedback, downtime, fallback |

## Reuse Rules Applied

- Existing services were reused first.
- Missing dedicated external integrations are represented as explicit runtime stubs, not hidden fake production integrations.
- Every new service concept is wired to a route, hook, store, OS aggregator, or manual page.
- AI outputs remain advisory and require human review for clinical, EMS, dispatch, and operational actions.
