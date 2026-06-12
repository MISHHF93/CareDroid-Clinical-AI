# Component Dependency Map

Generated: 2026-06-12T02:34:02.555Z

Scanned 2209 text/code files. Resolved 5609 relative import edges. Found 282 backend endpoint declarations and 1239 frontend API references.

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
| backend/src/models/Patient.ts | 0 | 6 | Connected Emergency OS |
| backend/src/models/PatientJourney.ts | 0 | 0 | Connected Emergency OS |
| backend/src/models/SmartIntake.ts | 0 | 2 | Connected Emergency OS |
| backend/src/modules/platform-systems/platform-systems.service.ts | 1 | 6 | Connected Emergency OS |
| backend/src/services/capacity.service.ts | 1 | 2 | Connected Emergency OS |
| backend/src/services/copilot.service.ts | 4 | 1 | Connected Emergency OS |
| backend/src/services/ems.service.ts | 1 | 2 | Connected Emergency OS |
| backend/src/services/reassessment.service.ts | 1 | 3 | Connected Emergency OS |
| backend/src/services/smart-intake.service.ts | 2 | 1 | Connected Emergency OS |
| engine/journeyEngine.ts | 2 | 4 | Connected Emergency OS |
| lib/features/featureRegistry.ts | 0 | 8 | Connected Emergency OS |
| src/App.jsx | 152 | 4 | Connected Emergency OS |
| src/components/ChatInterface.jsx | 21 | 2 | Connected Emergency OS |
| src/components/CommandPalette.jsx | 4 | 1 | Connected Emergency OS |
| src/components/EmergencyWhiteboard.jsx | 9 | 3 | Connected Emergency OS |
| src/components/EMSCriticalBroadcast.jsx | 5 | 1 | Connected Emergency OS |
| src/components/EMSPipeline.jsx | 4 | 2 | Connected Emergency OS |
| src/components/EMSPressureScore.jsx | 2 | 4 | Connected Emergency OS |
| src/components/JourneyTimeline.jsx | 3 | 1 | Connected Emergency OS |
| src/components/NewPatientIntake.jsx | 4 | 2 | Connected Emergency OS |
| src/components/PatientCard.jsx | 18 | 2 | Connected Emergency OS |
| src/components/QueueIntelligencePanel.jsx | 2 | 3 | Connected Emergency OS |
| src/components/ReassessmentDrawer.jsx | 4 | 1 | Connected Emergency OS |
| src/components/ReferralPanel.jsx | 4 | 2 | Connected Emergency OS |
| src/components/WhoNextPanel.jsx | 5 | 2 | Connected Emergency OS |
| src/config/navigation.config.js | 1 | 15 | Connected Emergency OS |
| src/config/routes.config.js | 0 | 27 | Connected Emergency OS |
| src/data/searchFirstDiscovery.js | 11 | 4 | Connected Emergency OS |
| src/layout/AppShell.jsx | 20 | 2 | Connected Emergency OS |
| src/pages/emergency/EmergencyAnalytics.jsx | 2 | 1 | Connected Emergency OS |
| src/pages/emergency/SmartIntake.jsx | 3 | 1 | Connected Emergency OS |
| src/services/boardingIntelligenceEngine.js | 0 | 7 | Connected Emergency OS |
| src/services/clinicalChatService.js | 3 | 21 | Connected Emergency OS |
| src/services/emergencyAnalyticsApi.js | 2 | 2 | Connected Emergency OS |
| src/services/emergencyRealtimeService.js | 1 | 1 | Connected Emergency OS |
| src/services/patientManagementApi.js | 1 | 1 | Connected Emergency OS |
| src/services/queueIntelligenceService.js | 0 | 10 | Connected Emergency OS |
| src/services/referralHub.js | 0 | 6 | Connected Emergency OS |
| src/services/smartIntakeApi.js | 1 | 1 | Connected Emergency OS |
| src/utils/reassessmentScheduler.js | 0 | 3 | Connected Emergency OS |
| store/emergencyStore.ts | 11 | 36 | Connected Emergency OS |
| types/emergency.ts | 0 | 41 | Connected Emergency OS |
| BACKEND_GAP_REPORT.md | 0 | 0 | Duplicate or Legacy |
| backend/migrations/004_emergency_os_cleanup.js | 0 | 0 | Duplicate or Legacy |
| backend/public/assets/index-C5W2SYTa.js | 0 | 0 | Duplicate or Legacy |
| backend/src/fixtures/smart-intake.fixtures.ts | 1 | 0 | Duplicate or Legacy |
| backend/src/main.ts | 12 | 0 | Duplicate or Legacy |
| backend/src/modules/live-tracking/device-live-tracking.controller.ts | 1 | 0 | Duplicate or Legacy |
| backend/src/modules/live-tracking/hospital-live-tracking.controller.ts | 1 | 0 | Duplicate or Legacy |
| config/alertmanager/config.yml | 0 | 0 | Duplicate or Legacy |
| data/artifacts/caredroid_artifacts.json | 0 | 0 | Duplicate or Legacy |
| docs/ai-evaluation-lab-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/component-dependency-map.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/emergency-os-integration-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/orphaned-services-report.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/smart-intake-identity-validation.md | 0 | 0 | Duplicate or Legacy |
| docs/architecture/unmounted-components-report.md | 0 | 0 | Duplicate or Legacy |
| docs/artifact-intelligence-pipeline-report.md | 0 | 0 | Duplicate or Legacy |
| docs/artifact-knowledge-graph-report.md | 0 | 0 | Duplicate or Legacy |
| docs/asset-dependency-graph.md | 0 | 0 | Duplicate or Legacy |
| docs/asset-lifecycle-management.md | 0 | 0 | Duplicate or Legacy |
| docs/asset-pack-productization-plan.md | 0 | 0 | Duplicate or Legacy |
| docs/asset-utilization-intelligence-report.md | 0 | 0 | Duplicate or Legacy |
| docs/automation-xray-report.md | 0 | 0 | Duplicate or Legacy |
| docs/backend-frontend-tool-contract.md | 0 | 0 | Duplicate or Legacy |
| docs/CARE_DROID_SAAS_ARCHITECTURE_CHARTER.md | 0 | 0 | Duplicate or Legacy |
| docs/caredroid-brain-layer-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-consolidation-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-density-optimization-report.md | 0 | 0 | Duplicate or Legacy |
| docs/component-stitching-and-redundancy-report.md | 0 | 0 | Duplicate or Legacy |
| docs/dashboard-compression-report.md | 0 | 0 | Duplicate or Legacy |
| docs/dashboard-decluttering-report.md | 0 | 0 | Duplicate or Legacy |
| docs/design-language-and-component-fit-report.md | 0 | 0 | Duplicate or Legacy |
| docs/emergency-ai-agent-ecosystem.md | 0 | 0 | Duplicate or Legacy |
| docs/emergency-identity-resolution-layer.md | 0 | 0 | Duplicate or Legacy |
| docs/emergency-intake-operating-system.md | 0 | 0 | Duplicate or Legacy |
| docs/emergency-os-master-implementation-report.md | 0 | 0 | Duplicate or Legacy |
| docs/emergency-workspace-final-compression.md | 0 | 0 | Duplicate or Legacy |
| docs/final-saas-migration-execution-plan.md | 0 | 0 | Duplicate or Legacy |
| docs/frontend-layer-ownership-report.md | 0 | 0 | Duplicate or Legacy |
