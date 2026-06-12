# Emergency OS Code Functionality Report

Generated: 2026-06-12T03:27:29.433Z

## Active Contract

The current active route contract is 12 Emergency OS routes, not the prompt sample's 8-route `frontend/src/router.tsx` contract.

| Feature | UI route | Page/component | Store/hook | API/backend | Repository/database/event layer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | /emergency/whiteboard | src/components/EmergencyWhiteboard.jsx | store/emergencyStore.ts | patientManagementApi.js, emergencyRealtimeService.js, platform systems APIs | types/emergency.ts, journeyEngine, Zustand events | mounted; partly local store backed |
| Patients | /emergency/patients | EmergencyWhiteboard patient mode | store/emergencyStore.ts | patientManagementApi.js | Patient journey events in store; backend platform-systems partial | mounted |
| Patient Journey Engine | /emergency/patients | JourneyTimeline / PatientCard | engine/journeyEngine.ts, store/emergencyStore.ts | patientManagementApi timeline calls | types/emergency.ts, backend/src/models/PatientJourney.ts | frontend authoritative, backend partial |
| EMS Intake | /emergency/ems | src/components/EMSPipeline.jsx | store/emergencyStore.ts | emergencyRealtimeService.js; optional /api/ems | backend/src/services/ems.service.ts, socket events | mounted; Express API conditional |
| Smart Intake | /emergency/intake | src/pages/emergency/SmartIntake.jsx | local component state + smartIntakeApi | /api/emergency/intake/* | backend SmartIntake model, MPI/FHIR/OCR/text mining services | mounted; demo fallback active |
| Queue Intelligence | /emergency/queues | EmergencyQueueRoute -> QueueIntelligencePanel | store/emergencyStore.ts | queueIntelligenceService.js, emergencyAnalyticsApi.js | client-derived queue projections | mounted; backend gap |
| Reassessment Engine | /emergency/reassessment | EmergencyWhiteboard + ReassessmentDrawer | store/emergencyStore.ts, reassessmentScheduler | optional /api/reassessment/* | backend reassessment.service.ts and scheduler | mounted; Express API conditional |
| Capacity Intelligence | /emergency/capacity | EmergencyCapacityRoute + CapacityDetailPanel | store/emergencyStore.ts | emergencyAnalyticsApi.js, optional /api/capacity/dashboard | backend capacity.service.ts | mounted; mixed backend/fallback |
| Boarding Intelligence | /emergency/boarding | EmergencyCapacityRoute | store/emergencyStore.ts | boardingIntelligenceEngine.js | emergency analytics/fallback | client-derived boarding state | mounted; backend gap |
| Referral Intelligence | /emergency/referrals | ReferralPanel | store/emergencyStore.ts | referralHub.js | local referral projections | mounted; backend gap |
| Provincial Health Connector | no active route | Smart Intake integration path | smartIntakeApi + local state | FHIR/MPI services | backend/src/services/fhir.service.ts and mpi.service.ts | not a standalone active route |
| ED Copilot | /emergency/copilot | AppShell right panel -> ChatInterface | ConversationContext, emergencyStore | clinicalChatService.js, /api/chat/message, optional /api/copilot/query | Chat pipeline, optional copilot.service.ts | mounted; copilot route opens panel |
| Analytics | /emergency/analytics | EmergencyAnalytics.jsx | store/emergencyStore.ts | emergencyAnalyticsApi.js | local operational fallback | mounted; fallback noted in UI |
| Settings | /emergency/settings and /settings/features | SettingsRoute -> EmergencySettings.jsx; SettingsFeaturesRoute -> FeatureManagement.jsx | emergencyStore, featureStore | emergencySettingsApi.js | settings/features, protocol/admin integration APIs | mounted |

## Mock/Fallback Usage In Active Pages

- `src/pages/emergency/SmartIntake.jsx` starts from `SMART_INTAKE_DEMO` and falls back locally when backend session creation fails.
- `src/pages/emergency/EmergencyAnalytics.jsx` displays local operational fallback when backend aggregate data is unavailable.
- `store/emergencyStore.ts` seeds mock staff, rooms, patients, EMS arrivals, units, referrals, and client fallback analytics.

## Fixes Applied

- Added `backend/src/services/index.ts`.
- Updated `backend/src/api/capacity.routes.ts`, `copilot.routes.ts`, `ems.routes.ts`, `reassessment.routes.ts`, and `smart-intake.routes.ts` to import singleton services from the registry.
- Mounted `/settings/features` to `SettingsFeaturesRoute`.
- Removed a duplicate `POST /api/audit/sync` backend handler and updated backend route inventory parity.
- Removed unused type imports from `backend/src/services/smart-intake.service.ts`.

## Not Applied

- Did not rewrite the app to a nonexistent `frontend/src/router.tsx` architecture.
- Did not delete keyword-matching files because current backend and test configuration still imports many non-emergency platform modules.

