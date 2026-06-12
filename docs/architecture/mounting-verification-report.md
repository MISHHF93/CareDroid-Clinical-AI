# Emergency OS Mounting Verification

Generated: 2026-06-12T02:51:28.298Z

Total checks: 60
Passing checks: 60
Failing checks: 0

## service

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | capacityService | backend/src/api/capacity.routes.ts + backend/src/main.ts | backend/src/services/capacity.service.ts | export const capacityService = new CapacityService(); expressApp.use('/api/capacity', capacityRoutes) |
| PASS | emsService | backend/src/api/ems.routes.ts + backend/src/main.ts | backend/src/services/ems.service.ts | export const emsService = new EMSService(); expressApp.use('/api/ems', emsRoutes) |
| PASS | reassessmentService | backend/src/api/reassessment.routes.ts + backend/src/main.ts | backend/src/services/reassessment.service.ts | export const reassessmentService = new ReassessmentService(); expressApp.use('/api/reassessment', reassessmentRoutes) |
| PASS | smartIntakeService | backend/src/api/smart-intake.routes.ts + backend/src/main.ts | backend/src/services/smart-intake.service.ts | export const smartIntakeService = new SmartIntakeService(); expressApp.use('/api/emergency/intake', smartIntakeRoutes) |
| PASS | copilotService | backend/src/api/copilot.routes.ts + backend/src/main.ts | backend/src/services/copilot.service.ts | export const copilotService = new CopilotService(); expressApp.use('/api/copilot', copilotRoutes) |
| PASS | mpiService | backend/src/services/smart-intake.service.ts | backend/src/services/mpi.service.ts | import { mpiService } from './mpi.service'; private matcher = mpiService |
| PASS | ocrService | backend/src/services/smart-intake.service.ts | backend/src/services/ocr.service.ts | import { ocrService } from './ocr.service'; private ocr = ocrService |
| PASS | textMiningService | backend/src/services/smart-intake.service.ts | backend/src/services/text-mining.service.ts | import { textMiningService } from './text-mining.service'; private textMining = textMiningService |
| PASS | fhirService | backend/src/services/smart-intake.service.ts | backend/src/services/fhir.service.ts | import { fhirService } from './fhir.service'; private fhir = fhirService |

## scheduler

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | reassessmentScheduler | backend/src/main.ts | backend/src/scheduler/reassessment.scheduler.ts | Scheduler imported and started in Emergency OS runtime. |
| PASS | ocrService.initialize | backend/src/main.ts | backend/src/services/ocr.service.ts | OCR provider startup hook runs with Emergency OS runtime. |

## page

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | EmergencyWhiteboard | src/App.jsx | src/components/EmergencyWhiteboard.jsx | /emergency/whiteboard; short alias / |
| PASS | Patients | src/App.jsx | src/components/EmergencyWhiteboard.jsx | /emergency/patients; short alias /patients |
| PASS | EMSIntake | src/App.jsx | src/components/EMSPipeline.jsx | /emergency/ems; short alias /ems |
| PASS | SmartIntake | src/App.jsx | src/pages/emergency/SmartIntake.jsx | /emergency/intake; short alias /intake |
| PASS | Queues | src/App.jsx | src/App.jsx#EmergencyQueueRoute | /emergency/queues; short alias /queues |
| PASS | Reassessment | src/App.jsx | src/components/ReassessmentDrawer.jsx | /emergency/reassessment; short alias /reassessment |
| PASS | Capacity | src/App.jsx | src/App.jsx#EmergencyCapacityRoute | /emergency/capacity; short alias /capacity |
| PASS | Boarding | src/App.jsx | src/App.jsx#EmergencyCapacityRoute | /emergency/boarding; short alias /boarding |
| PASS | Referrals | src/App.jsx | src/components/ReferralPanel.jsx | /emergency/referrals; short alias /referrals |
| PASS | Copilot | src/App.jsx | src/layout/AppShell.jsx#ChatInterface | /emergency/copilot; short alias /copilot |
| PASS | Analytics | src/App.jsx | src/pages/emergency/EmergencyAnalytics.jsx | /emergency/analytics; short alias /analytics |
| PASS | Settings | src/App.jsx | src/App.jsx#SettingsRoute | /emergency/settings; short alias /settings |

## navigation

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | EmergencyWhiteboard navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/whiteboard |
| PASS | Patients navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/patients |
| PASS | EMSIntake navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/ems |
| PASS | SmartIntake navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/intake |
| PASS | Queues navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/queues |
| PASS | Reassessment navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/reassessment |
| PASS | Capacity navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/capacity |
| PASS | Boarding navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/boarding |
| PASS | Referrals navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/referrals |
| PASS | Copilot navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/copilot |
| PASS | Analytics navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/analytics |
| PASS | Settings navigation | src/config/navigation.config.js | src/config/navigation.config.js | Sidebar destination for /emergency/settings |

## command

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | EmergencyWhiteboard command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/whiteboard |
| PASS | Patients command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/patients |
| PASS | EMSIntake command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/ems |
| PASS | SmartIntake command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/intake |
| PASS | Queues command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/queues |
| PASS | Reassessment command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/reassessment |
| PASS | Capacity command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/capacity |
| PASS | Boarding command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/boarding |
| PASS | Referrals command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/referrals |
| PASS | Copilot command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/copilot |
| PASS | Analytics command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/analytics |
| PASS | Settings command | src/components/CommandPalette.jsx | src/components/CommandPalette.jsx | Command palette destination for /emergency/settings |

## search

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | EmergencyWhiteboard search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/whiteboard |
| PASS | Patients search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/patients |
| PASS | EMSIntake search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/ems |
| PASS | SmartIntake search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/intake |
| PASS | Queues search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/queues |
| PASS | Reassessment search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/reassessment |
| PASS | Capacity search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/capacity |
| PASS | Boarding search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/boarding |
| PASS | Referrals search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/referrals |
| PASS | Copilot search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/copilot |
| PASS | Analytics search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/analytics |
| PASS | Settings search | src/data/searchFirstDiscovery.js | src/data/searchFirstDiscovery.js | Search destination for /emergency/settings |

## component

| Status | Name | Expected Parent | Location | Details |
| --- | --- | --- | --- | --- |
| PASS | AppShell | src/App.jsx | src/layout/AppShell.jsx | Single shell with nav, command palette, workspace area, and Copilot panel. |
