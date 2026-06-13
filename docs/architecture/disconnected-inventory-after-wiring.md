# Disconnected Inventory After Wiring

Generated: 2026-06-13

This report lists what remains disconnected after the Emergency OS full-stack wiring pass. Active pages now consume backend endpoints; remaining disconnected areas are explicit placeholders or future integration work.

| Module | Frontend route | Page file | Components | Hooks | API client | Backend endpoint | Service | Data source | UI render location | Status before | Status after | Remaining gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | `/emergency/whiteboard` | `src/pages/emergency/index.tsx` | `PatientCard`, `QuickIntake` | `useEmergencyWhiteboard` | `emergencyOsApi.js` | `/api/emergency/whiteboard` | `EmergencyWhiteboardService` | Backend fixture | Whiteboard grid | Backend disconnected | Connected | Durable DB still disconnected |
| Patients | `/emergency/patients` | `src/App.jsx` | `PatientsRoute` | `useEmergencyPatients` | `emergencyOsApi.js` | `/api/emergency/patients` | `EmergencyPatientService` | Backend fixture | Patient route | No dedicated route | Connected | Persistent patient controller/repository |
| Patient Journey Engine | `/emergency/journey` | `src/App.jsx` | `JourneyRoute` | `usePatientJourney` | `emergencyOsApi.js` | `/api/emergency/journey` | `PatientJourneyService` | Timeline fixtures | Journey page | Not active route | Connected | Durable event stream |
| EMS Intake | `/emergency/ems` | `src/App.jsx` | `EMSRoute` | `useEMSIntake` | `emergencyOsApi.js` | `/api/emergency/ems` | `EMSIntakeService` | EMS fixture | EMS page | Optional backend only | Connected to fixture endpoint | Live EMS/offload feed |
| Smart Intake | `/emergency/intake` | `src/App.jsx`, `QuickIntake.tsx` | `QuickIntake` | `useSmartIntake` | `emergencyOsApi.js` | `/api/emergency/intake` | `SmartIntakeService` | Fixture plus POST | Intake modal | Local-only create | Connected | OCR/MPI/provider connectors |
| Queue Intelligence | `/emergency/queues` | `src/App.jsx` | `QueueRoute` | `useEmergencyQueues` | `emergencyOsApi.js` | `/api/emergency/queues` | `QueueIntelligenceService` | Patient-derived | Queue route | Local only | Connected | Durable SLA data |
| Reassessment Engine | `/emergency/reassessment` | `src/App.jsx` | `ReassessmentRoute` | `useReassessmentQueue` | `emergencyOsApi.js` | `/api/emergency/reassessment` | `ReassessmentService` | Flag-derived | Reassessment page | Optional backend disconnected | Connected | Completion rate metrics |
| Capacity Intelligence | `/emergency/capacity` | `src/App.jsx` | `CapacityRoute` | `useCapacityStatus` | `emergencyOsApi.js` | `/api/emergency/capacity` | `CapacityService` | Rooms/patients | Capacity route | Local only | Connected | Bed management integration |
| Boarding Intelligence | `/emergency/boarding` | `src/App.jsx` | `BoardingRoute` | `useBoardingStatus` | `emergencyOsApi.js` | `/api/emergency/boarding` | `BoardingService` | Patient-derived | Boarding route | Local only | Connected | Inpatient bed feed |
| Referral Intelligence | `/emergency/referrals` | `src/App.jsx` | `ReferralsRoute` | `useReferrals` | `emergencyOsApi.js` | `/api/emergency/referrals` | `ReferralService` | Patient-derived | Referral route | API mismatch | Connected | Referral status writes |
| Provincial Health Connector | `/emergency/provincial-health` | `src/App.jsx` | `ProvincialHealthRoute` | `useProvincialHealth` | `emergencyOsApi.js` | `/api/emergency/provincial-health` | `ProvincialHealthService` | Placeholder | Provincial route | Missing | Explicit placeholder UI | Provincial/HIE/OHIP live connector |
| IoT/Integration Hub placeholders | `/emergency/integrations` | `src/App.jsx` | `IntegrationsRoute` | `useIntegrationHub` | `emergencyOsApi.js` | `/api/emergency/integrations` | `IntegrationHubService` | Placeholder | Integration route | Demo/disconnected | Explicit placeholder UI | FHIR/HL7/device gateway runtime |
| ED Copilot | `/emergency/copilot` | `src/App.jsx`, `CopilotPanel.tsx` | `CopilotRoute`, `CopilotPanel` | `useEDCopilot` | `emergencyOsApi.js`, `clinicalChatService.js` | `/api/emergency/copilot` | `EDCopilotService` | Context fixture | Copilot route/panel | Chat context local | Connected context endpoint | AI provider/auth availability |
| Analytics | `/emergency/analytics` | `src/App.jsx` | `AnalyticsRoute` | `useEmergencyAnalytics` | `emergencyOsApi.js` | `/api/emergency/analytics` | `EmergencyAnalyticsService` | Derived fixture | Analytics cards | Local/disabled backend | Connected | Durable KPI source |
| Settings | `/emergency/settings` | `src/App.jsx` | `EmergencySettingsRoute` | `useEmergencySettings` | `emergencyOsApi.js` | `/api/emergency/settings` | `EmergencySettingsService` | Settings fixture | Settings cards | Static local | Connected | PATCH persistence |

## Remaining Disconnected/Future Items

- `caredroid.sqlite` remains an untracked local database artifact and was not committed or wired.
- Optional Express/Mongoose Emergency OS routes remain gated by `ENABLE_MONGOOSE_EMERGENCY_OS=true`; active wiring now uses the Nest `EmergencyOsModule` by default.
- Provincial health, HL7, FHIR, IoT/device telemetry, MQTT/device gateways, and inpatient bed systems are rendered as placeholders with explicit non-live status.
- AI provider availability still depends on configured backend auth/provider settings for `/api/emergency/copilot/message`; the route context endpoint is wired independently.
