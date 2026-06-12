# Component Dependency Map

Generated: 2026-06-12T21:37:03.803Z

Scanned 2274 text/code files. Resolved 5689 relative import edges. Found 281 backend endpoint declarations and 1307 frontend API references.

| Frontend Page |Components |Store |API Clients |Backend Endpoint |Service |Entity / Schema |
| --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | src/components/EmergencyWhiteboard.jsx -> src/components/PatientCard.jsx, src/components/NewPatientIntake.jsx, src/components/QueueIntelligencePanel.jsx | store/emergencyStore.ts | src/services/patientManagementApi.js, src/services/emergencyRealtimeService.js | /api/patients/*, /api/platform-systems/* | backend/src/modules/platform-systems/platform-systems.service.ts | types/emergency.ts |
| Patient Journey Engine | src/components/EmergencyWhiteboard.jsx -> src/components/JourneyTimeline.jsx, src/components/PatientCard.jsx | store/emergencyStore.ts | src/services/patientManagementApi.js | /api/patients/:id/timeline | backend/src/modules/platform-systems/platform-systems.service.ts | types/emergency.ts, backend/src/models/PatientJourney.ts |
| EMS Intake | src/components/EMSPipeline.jsx -> src/components/EMSPressureScore.jsx, src/components/EMSCriticalBroadcast.jsx | store/emergencyStore.ts | src/services/emergencyRealtimeService.js | /api/ems/incoming, /api/ems/alert, /api/ems/status/:emsUnitId, /api/ems/arrive/:emsUnitId | backend/src/services/ems.service.ts | backend/src/models/Patient.ts, types/emergency.ts |
| Smart Intake | src/pages/emergency/SmartIntake.jsx -> src/pages/emergency/SmartIntake.jsx | store/emergencyStore.ts | src/services/smartIntakeApi.js | /api/emergency/intake/sessions, /api/emergency/intake/:id/* | backend/src/services/smart-intake.service.ts | backend/src/models/SmartIntake.ts, backend/src/models/Patient.ts |
| Queue Intelligence | src/App.jsx#EmergencyQueueRoute -> src/components/QueueIntelligencePanel.jsx, src/components/WhoNextPanel.jsx | store/emergencyStore.ts | src/services/queueIntelligenceService.js, src/services/emergencyAnalyticsApi.js | /api/emergency/queues/analytics | none | types/emergency.ts |
| Reassessment Engine | src/components/EmergencyWhiteboard.jsx -> src/components/ReassessmentDrawer.jsx | store/emergencyStore.ts | src/utils/reassessmentScheduler.js | /api/reassessment/due, /api/reassessment/:patientId/reassess | backend/src/services/reassessment.service.ts | backend/src/models/Patient.ts, types/emergency.ts |
| Capacity Intelligence | src/App.jsx#EmergencyCapacityRoute -> src/layout/AppShell.jsx#CapacityBadge, src/layout/AppShell.jsx#CapacityDetailPanel | store/emergencyStore.ts | src/services/emergencyAnalyticsApi.js | /api/capacity/dashboard, /api/emergency/capacity/history | backend/src/services/capacity.service.ts | backend/src/models/Patient.ts, types/emergency.ts |
| Boarding Intelligence | src/App.jsx#EmergencyCapacityRoute -> src/layout/AppShell.jsx#CapacityDetailPanel | store/emergencyStore.ts | src/services/boardingIntelligenceEngine.js | /api/emergency/analytics | none | types/emergency.ts |
| Referral Intelligence | src/components/ReferralPanel.jsx -> src/components/ReferralPanel.jsx | store/emergencyStore.ts | src/services/referralHub.js | /api/emergency/referrals | none | types/emergency.ts |
| ED Copilot | src/layout/AppShell.jsx#ChatInterface -> src/components/ChatInterface.jsx | store/emergencyStore.ts | src/services/clinicalChatService.js | /api/copilot/query, /api/chat/message | backend/src/services/copilot.service.ts | types/emergency.ts |
| Analytics | src/pages/emergency/EmergencyAnalytics.jsx -> src/pages/emergency/EmergencyAnalytics.jsx | store/emergencyStore.ts | src/services/emergencyAnalyticsApi.js | /api/emergency/analytics, /api/emergency/capacity/history, /api/emergency/queues/analytics | none | types/emergency.ts |

## Import Graph Hotspots

| File |Imports |Imported By |Classification |
| --- | --- | --- | --- |
| backend/src/models/Patient.ts | 0 | 7 | Connected Emergency OS |
| backend/src/models/PatientJourney.ts | 0 | 0 | Connected Emergency OS |
| backend/src/models/SmartIntake.ts | 0 | 5 | Connected Emergency OS |
| backend/src/modules/platform-systems/platform-systems.service.ts | 1 | 6 | Connected Emergency OS |
| backend/src/services/capacity.service.ts | 1 | 2 | Connected Emergency OS |
| backend/src/services/copilot.service.ts | 4 | 1 | Connected Emergency OS |
| backend/src/services/ems.service.ts | 1 | 2 | Connected Emergency OS |
| backend/src/services/reassessment.service.ts | 1 | 3 | Connected Emergency OS |
| backend/src/services/smart-intake.service.ts | 6 | 1 | Connected Emergency OS |
| engine/journeyEngine.ts | 2 | 5 | Connected Emergency OS |
| lib/features/featureRegistry.ts | 0 | 8 | Connected Emergency OS |
| src/App.jsx | 177 | 4 | Connected Emergency OS |
| src/components/ChatInterface.jsx | 21 | 2 | Connected Emergency OS |
| src/components/CommandPalette.jsx | 5 | 1 | Connected Emergency OS |
| src/components/EmergencyWhiteboard.jsx | 9 | 3 | Connected Emergency OS |
| src/components/EMSCriticalBroadcast.jsx | 5 | 2 | Connected Emergency OS |
| src/components/EMSPipeline.jsx | 4 | 2 | Connected Emergency OS |
| src/components/EMSPressureScore.jsx | 2 | 4 | Connected Emergency OS |
| src/components/JourneyTimeline.jsx | 3 | 1 | Connected Emergency OS |
| src/components/NewPatientIntake.jsx | 4 | 2 | Connected Emergency OS |
| src/components/PatientCard.jsx | 19 | 3 | Connected Emergency OS |
| src/components/QueueIntelligencePanel.jsx | 2 | 3 | Connected Emergency OS |
| src/components/ReassessmentDrawer.jsx | 4 | 1 | Connected Emergency OS |
| src/components/ReferralPanel.jsx | 4 | 2 | Connected Emergency OS |
| src/components/WhoNextPanel.jsx | 5 | 2 | Connected Emergency OS |
| src/config/navigation.config.js | 1 | 15 | Connected Emergency OS |
| src/config/routes.config.js | 0 | 31 | Connected Emergency OS |
| src/data/searchFirstDiscovery.js | 11 | 4 | Connected Emergency OS |
| src/layout/AppShell.jsx | 22 | 2 | Connected Emergency OS |
| src/pages/emergency/EmergencyAnalytics.jsx | 2 | 1 | Connected Emergency OS |
| src/pages/emergency/SmartIntake.jsx | 5 | 1 | Connected Emergency OS |
| src/services/boardingIntelligenceEngine.js | 0 | 7 | Connected Emergency OS |
| src/services/clinicalChatService.js | 3 | 21 | Connected Emergency OS |
| src/services/emergencyAnalyticsApi.js | 2 | 2 | Connected Emergency OS |
| src/services/emergencyRealtimeService.js | 1 | 1 | Connected Emergency OS |
| src/services/patientManagementApi.js | 1 | 1 | Connected Emergency OS |
| src/services/queueIntelligenceService.js | 0 | 10 | Connected Emergency OS |
| src/services/referralHub.js | 0 | 6 | Connected Emergency OS |
| src/services/smartIntakeApi.js | 1 | 1 | Connected Emergency OS |
| src/utils/reassessmentScheduler.js | 0 | 3 | Connected Emergency OS |
| store/emergencyStore.ts | 11 | 39 | Connected Emergency OS |
| types/emergency.ts | 0 | 44 | Connected Emergency OS |
| BACKEND_GAP_REPORT.md | 0 | 0 | Duplicate or Legacy |
| backend/migrations/004_emergency_os_cleanup.js | 0 | 0 | Duplicate or Legacy |
| backend/public/assets/index-C5W2SYTa.js | 0 | 0 | Duplicate or Legacy |
| backend/src/fixtures/smart-intake.fixtures.ts | 1 | 0 | Duplicate or Legacy |
| backend/src/main.ts | 13 | 0 | Duplicate or Legacy |
| backend/src/modules/live-tracking/device-live-tracking.controller.ts | 1 | 0 | Duplicate or Legacy |
| backend/src/modules/live-tracking/hospital-live-tracking.controller.ts | 1 | 0 | Duplicate or Legacy |
| config/alertmanager/config.yml | 0 | 0 | Duplicate or Legacy |
| data/artifacts/caredroid_artifacts.json | 0 | 0 | Duplicate or Legacy |
| docs/ai-evaluation-lab-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/backend-to-ui-trace-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/calculator-tool-mounting-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/capability-inventory.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/clickable-map-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/component-dependency-map.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/current-stack-normalization-validation.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/current-state-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/current-system-inventory.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/current-tech-stack-and-structure.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/disconnected-api-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/disconnected-capabilities.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/disconnected-integrations.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/disconnected-operational-intelligence.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/emergency-os-code-functionality-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/emergency-os-integration-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/emergency-os-ui-connectivity-validation.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/flattened-emergency-os-final-state.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/layout-normalization-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/layout-routing-consolidation-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/mobile-emergency-integration-gap-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/no-return-value-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/orphaned-services-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/p0-pilot-blocker-fixes.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/page-layout-map.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/path-connectivity-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/refactor-recommendations.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/render-path-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/revenue-readiness-final-report.md | 0 | 0 | Duplicate or Legacy |
