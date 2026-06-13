# INVENTORY E21

Snapshot source: start-of-run dirty working tree, excluding tests, pure docs, generated dist artifacts, and `caredroid.sqlite`.

.gitignore | Config | Complete | None
backend/migrations/009_create_unified_patients.js | Engine | Complete | None
backend/src/api/boarding.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/capacity.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/deterioration.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/digital-twin.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/api/federated.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/handover.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/api/iot.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/api/moh.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/api/placeholder.routes.ts | Config | Stub | backend/src/api/digital-twin.routes.ts; backend/src/api/handover.routes.ts; backend/src/api/iot.routes.ts; backend/src/api/moh.routes.ts; backend/src/api/simulation.routes.ts; backend/src/api/wearable.routes.ts
backend/src/api/protocol.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/reassessment.routes.ts | Config | Complete | backend/src/api/routes-registry.ts
backend/src/api/routes-registry.ts | Config | Complete | backend/src/api/routes-registry.spec.ts (test); backend/src/app.controller.ts; backend/src/main.ts
backend/src/api/simulation.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/api/wearable.routes.ts | Config | Stub | backend/src/api/routes-registry.ts
backend/src/app.controller.ts | Engine | Complete | backend/src/app.controller.spec.ts (test); backend/src/app.module.spec.ts (test); backend/src/app.module.ts
backend/src/index.ts | Engine | Partial | None
backend/src/main.ts | Engine | Complete | None
backend/src/models/Patient.ts | Engine | Complete | backend/src/models/unified-patient.model.spec.ts (test)
backend/src/models/unified-patient.model.ts | Engine | Complete | backend/src/models/Patient.ts; backend/src/models/unified-patient.model.spec.ts (test); backend/src/scheduler/reassessment.scheduler.ts; backend/src/services/boarding.service.ts; backend/src/services/capacity.service.ts; backend/src/services/copilot.service.ts; backend/src/services/discharge-prediction.service.ts; backend/src/services/ems.service.ts; backend/src/services/mpi.service.ts; backend/src/services/reassessment.service.ts; backend/src/services/smart-intake.service.ts; backend/src/services/surge-capacity.service.ts
backend/src/modules/emergency-os/emergency-os.controller.ts | Engine | Complete | backend/src/modules/emergency-os/emergency-os.controller.spec.ts (test); backend/src/modules/emergency-os/emergency-os.module.ts
backend/src/modules/emergency-os/emergency-os.services.ts | Engine | Complete | backend/src/modules/emergency-os/emergency-os.advanced-services.ts; backend/src/modules/emergency-os/emergency-os.controller.spec.ts (test); backend/src/modules/emergency-os/emergency-os.controller.ts; backend/src/modules/emergency-os/emergency-os.module.ts; backend/src/services/service-registry.ts
backend/src/modules/emergency-os/emergency-os.types.ts | Type | Complete | backend/src/modules/emergency-os/emergency-os.advanced-services.ts; backend/src/modules/emergency-os/emergency-os.controller.ts; backend/src/modules/emergency-os/emergency-os.fixtures.ts; backend/src/modules/emergency-os/emergency-os.services.ts
backend/src/scheduler/reassessment.scheduler.ts | Engine | Complete | backend/src/main.ts
backend/src/services/boarding.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/capacity.service.ts | Engine | Complete | backend/src/services/copilot.service.ts; backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/clinical-protocol.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/consent.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/copilot.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/deterioration-prediction-v3.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/discharge-prediction.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/ems.service.ts | Engine | Complete | backend/src/services/copilot.service.ts; backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/incident-reporting.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/index.ts | Engine | Complete | backend/src/api/boarding.routes.ts; backend/src/api/capacity.routes.ts; backend/src/api/copilot.routes.ts; backend/src/api/deterioration.routes.ts; backend/src/api/ems.routes.ts; backend/src/api/federated.routes.ts; backend/src/api/protocol.routes.ts; backend/src/api/reassessment.routes.ts; backend/src/api/smart-intake.routes.ts; backend/src/api/surge.routes.ts
backend/src/services/iot-digital-twin.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/moh-fhir.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/mpi.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts; backend/src/services/smart-intake.service.ts
backend/src/services/reassessment.service.ts | Engine | Complete | backend/src/scheduler/reassessment.scheduler.ts; backend/src/services/copilot.service.ts; backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/service-registry.ts | Engine | Complete | backend/src/api/health.routes.spec.ts (test); backend/src/api/health.routes.ts; backend/src/index.ts; backend/src/main.ts; backend/src/services/index.ts; backend/src/services/service-registry.spec.ts (test)
backend/src/services/smart-intake.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/surge-capacity.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
backend/src/services/wearable-rpm.service.ts | Engine | Complete | backend/src/services/index.ts; backend/src/services/service-registry.ts
frontend/src/config/unified-navigation.config.ts | Config | Complete | src/config/unified-navigation.config.ts
frontend/src/hooks/useEmergencyWebSocket.ts | Hook | Complete | None
frontend/src/store/emergency-store.ts | Store | Complete | frontend/src/hooks/useEmergencyWebSocket.ts; src/hooks/useEmergencyWebSocket.ts; src/store/emergency-store.ts
package.json | Config | Complete | None
scripts/capture-emergency-page-screenshots.mjs | Engine | Complete | None
src/App.jsx | Engine | Complete | src/main.jsx; src/routing/canonicalAppRoutes.deepLink.test.jsx (test); src/routing/canonicalRouteTree.behavior.test.jsx (test); src/test/pilotWalkthrough.test.jsx (test)
src/components/AppShell.tsx | Component | Complete | src/App.jsx
src/components/CommandPalette.d.ts | Type | Complete | None
src/components/CommandPalette.jsx | Component | Complete | src/components/AppShell.tsx; src/layout/AppShell.jsx
src/components/CopilotPanel.tsx | Component | Complete | src/components/AppShell.tsx
src/components/EMSCriticalBroadcast.d.ts | Type | Complete | None
src/components/EMSCriticalBroadcast.jsx | Component | Complete | src/components/AppShell.tsx; src/components/EMSCriticalBroadcast.test.jsx (test); src/layout/AppShell.jsx
src/components/EMSPipeline.jsx | Component | Complete | src/App.jsx; src/features/future-modules/_review/pages/WorkspaceHome.jsx
src/components/EmergencyPatientCard.jsx | Component | Complete | src/components/EmergencyWhiteboard.jsx
src/components/EmergencyPatientDetailPanel.jsx | Component | Complete | src/components/EmergencyWhiteboard.jsx
src/components/EmergencyWhiteboard.jsx | Component | Complete | src/App.jsx; src/components/EmergencyWhiteboard.storeReactivity.test.jsx (test); src/features/future-modules/_review/pages/WorkspaceHome.jsx
src/components/Header.tsx | Component | Complete | src/components/AppShell.tsx
src/components/NewPatientIntake.jsx | Component | Complete | src/components/EmergencyWhiteboard.jsx; src/components/NewPatientIntake.test.jsx (test)
src/components/PatientCard.css | Config | Complete | src/components/PatientCard.tsx
src/components/PatientCard.tsx | Component | Complete | src/App.jsx; src/components/PatientCard.clinicalIntelligence.test.jsx (test); src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx; src/pages/emergency/index.tsx
src/components/PatientDetailPanel.css | Config | Complete | src/components/EmergencyPatientDetailPanel.jsx; src/components/PatientDetailPanel.tsx
src/components/PatientDetailPanel.tsx | Component | Complete | src/components/AppShell.tsx; src/components/PatientCard.clinicalIntelligence.test.jsx (test)
src/components/QuickIntake.tsx | Component | Complete | src/pages/emergency/index.tsx
src/components/ReassessmentDrawer.d.ts | Type | Complete | None
src/components/ReferralPanel.jsx | Component | Complete | src/App.jsx; src/features/future-modules/_review/pages/WorkspaceHome.jsx
src/components/Sidebar.tsx | Component | Complete | src/components/AppShell.tsx; src/components/Sidebar.test.tsx (test)
src/components/WorkloadBalancePanel.d.ts | Type | Complete | None
src/config/backendApiCapabilities.js | Config | Complete | src/components/offline/OfflineSupport.jsx; src/components/tools/ToolResultShare.jsx; src/config/backendApiCapabilities.test.js (test); src/data/backendFrontendExposure.js; src/data/backendFrontendExposure.test.js (test); src/data/backendOrphanAudit.js; src/data/capabilityExposureMatrix.test.js (test); src/data/duplicateSystemAudit.js; src/data/frontendApiCallsInventory.js; src/data/frontendApiCallsInventory.schedule.test.js (test); src/data/mountedCapabilityGraph.js; src/data/orphanDetectionAudit.js; src/data/platformSelfDiagnostics.js; src/db/offline.js; src/pages/ClinicalAlertsPage.jsx; src/pages/legal/ConsentHistory.jsx; src/pages/team/TeamManagement.capability.test.jsx (test); src/pages/team/TeamManagement.jsx; src/services/NotificationService.js; src/services/aiCommandCenterApi.js; src/services/automationAuditApi.js; src/services/boardingApi.js; src/services/clinicalAlertsApi.js; src/services/clinicalToolsApi.js; src/services/clinicalToolsApi.test.js (test); src/services/complianceApi.js; src/services/disabledBackendMocks.js; src/services/emergencyAnalyticsApi.js; src/services/emergencyCopilotApi.js; src/services/emergencyGovernanceApi.js; src/services/emergencySettingsApi.js; src/services/emergencyTransportApi.js; src/services/evaluationApi.js; src/services/export/ExportService.js; src/services/liveTrackingApi.js; src/services/liveTrackingApi.test.js (test); src/services/notifications/NotificationService.js; src/services/reassessmentApi.js; src/services/smartIntakeApi.js; src/services/surgeApi.js; src/services/syncService.js; src/services/trainingApi.js; src/utils/chatCapabilitySuggestions.js; src/utils/chatCapabilitySuggestions.test.js (test)
src/config/emergencyRolePermissions.js | Config | Complete | frontend/src/config/unified-navigation.config.ts; src/App.jsx; src/components/AppShell.tsx; src/components/CommandPalette.jsx; src/components/EMSCriticalBroadcast.jsx; src/components/EMSPipeline.jsx; src/components/Header.tsx; src/components/PatientDetailPanel.tsx; src/components/QuickIntake.tsx; src/components/ReferralPanel.jsx; src/config/emergencyRolePermissions.test.js (test); src/hooks/useEmergencyRolePermissions.js; src/pages/emergency/SmartIntake.jsx; src/pages/emergency/index.tsx
src/config/routes.config.js | Config | Complete | frontend/src/config/unified-navigation.config.ts; src/App.jsx; src/App.permissions.test.jsx (test); src/components/AppShell.tsx; src/components/CommandPalette.jsx; src/components/Header.tsx; src/config/auth.config.js; src/config/canonicalConfig.contract.test.js (test); src/config/commandPalette.config.js; src/config/emergencyRolePermissions.js; src/config/emergencyRolePermissions.test.js (test); src/config/navigation.config.js; src/data/artifactIntelligence.js; src/data/artifactIntelligence.test.js (test); src/data/artifactKnowledgeGraph.js; src/data/assetInventory.js; src/data/assetInventory.test.js (test); src/data/commandDashboardModel.js; src/data/dependencyMap.js; src/data/digitalOperationsCenter.js; src/data/duplicateSystemAudit.js; src/data/emergencyPageRenderInventory.js; src/data/frontendOperatingSystem.js; src/data/hospitalOperationsWiring.test.js (test); src/data/mountedCapabilityGraph.js; src/data/orphanDetectionAudit.js; src/data/platformSelfDiagnostics.js; src/data/searchFirstDiscovery.js; src/data/uxDebtEliminationEngine.js; src/data/workspaceArchitecture.js; src/layout/ProfileSettingsShell.test.jsx (test); src/navigation/primaryNavigation.test.js (test); src/pages/AiCommandCenterDashboard.jsx; src/pages/CommandDashboard.jsx; src/pages/Operations.jsx; src/pages/tools/ToolsOverview.jsx; src/routing/authPathAliases.js; src/routing/canonicalRouteRedirects.test.js (test); src/routing/routeAuthRebuild.test.js (test); src/routing/routeHealth.js; src/routing/sectionLinkInventory.test.js (test); src/routing/workspaceSubpageRoutes.test.js (test)
src/config/unified-navigation.config.ts | Config | Complete | src/components/AppShell.tsx; src/components/Sidebar.test.tsx (test); src/components/Sidebar.tsx; src/config/navigation.config.js; src/config/unified-navigation.config.test.ts (test)
src/contexts/UserContext.jsx | Engine | Complete | src/App.devBypass.test.jsx (test); src/App.jsx; src/components/ChatInterface.jsx; src/components/EMSCriticalBroadcast.jsx; src/components/EscalateButton.jsx; src/components/PermissionGate.jsx; src/components/Sidebar.test.tsx (test); src/components/WhoNextPanel.jsx; src/contexts/CostTrackingContext.jsx; src/contexts/OrganizationContext.jsx; src/contexts/SystemConfigContext.jsx; src/contexts/TenantContext.jsx; src/contexts/UserIdentityContext.jsx; src/contexts/WorkspaceContext.jsx; src/features/future-modules/_review/components/QuickCommandLauncher.jsx; src/features/future-modules/_review/components/ShiftSummary.jsx; src/hooks/useEmergencyRolePermissions.js; src/layout/AppShell.jsx; src/pages/AnalyticsDashboard.jsx; src/pages/AuthCallback.jsx; src/pages/CapabilityDiscovery.jsx; src/pages/CareDroidBrainDashboard.jsx; src/pages/ClinicalDecisionSupport.jsx; src/pages/CommandDashboard.jsx; src/pages/Competencies.jsx; src/pages/Credentials.jsx; src/pages/DigitalOperationsCenter.jsx; src/pages/FeatureFlagCenter.jsx; src/pages/MedicalSimulationSuite.jsx; src/pages/PlatformOSPages.jsx; src/pages/Profile.jsx; src/pages/ProfileSettings.jsx; src/pages/RecommendationsPage.jsx; src/pages/Settings.jsx; src/pages/SimulationScenarioPlayer.jsx; src/pages/customer-portal/CustomerPortalPage.jsx; src/pages/profile/ProfileToolPreferences.jsx; src/pages/tools/DrugChecker.jsx; src/pages/tools/ToolNotFound.jsx; src/pages/tools/ToolsOverview.jsx; src/routing/canonicalAppRoutes.deepLink.test.jsx (test); src/routing/canonicalRouteTree.behavior.test.jsx (test); src/test/CostTrackingContext.test.jsx (test); src/test/pilotWalkthrough.test.jsx (test); src/utils/chatCapabilitySuggestions.js
src/data/backendHttpRouteInventory.js | Engine | Complete | src/data/artifactIntelligence.js; src/data/backendControllerRouteScan.js; src/data/backendFrontendExposure.js; src/data/backendFrontendExposure.test.js (test); src/data/backendOrphanAudit.test.js (test); src/data/backendRouteExposurePolicy.js; src/data/capabilityExposureMatrix.js; src/data/capabilityExposureMatrix.test.js (test); src/data/dataLineageExplorer.js; src/data/dependencyMap.js; src/data/emergencyPageRenderInventory.test.js (test); src/data/featureCoverageMatrix.js; src/data/fullPlatformConsolidation.test.js (test); src/data/orphanDetectionAudit.js; src/data/platformCapabilityMatrix.js; src/data/platformCapabilityMatrix.test.js (test); src/data/platformSelfDiagnostics.js; src/data/toolInventory.js; src/utils/chatCapabilitySuggestions.js; src/utils/chatCapabilitySuggestions.test.js (test)
src/data/backendOrphanAudit.js | Engine | Complete | src/data/backendFrontendExposure.report.test.js (test); src/data/backendOrphanAudit.test.js (test)
src/data/backendRouteExposurePolicy.js | Engine | Complete | src/data/backendFrontendExposure.js; src/data/backendFrontendExposure.test.js (test); src/data/backendOrphanAudit.js; src/data/backendOrphanAudit.test.js (test); src/data/orphanDetectionAudit.js
src/data/capabilityExposureMatrix.js | Engine | Complete | src/data/capabilityExposureMatrix.test.js (test)
src/data/edScenarioFixtures.d.ts | Type | Complete | None
src/data/edScenarioFixtures.js | Engine | Complete | src/data/edScenarioFixtures.test.js (test); src/hooks/useEmergencyOs.js; src/store/emergencyStore.ts; store/emergencyStore.ts
src/data/emergencyPageRenderInventory.js | Engine | Complete | scripts/capture-emergency-page-screenshots.mjs; src/App.permissions.test.jsx (test); src/data/emergencyPageRenderInventory.test.js (test); src/data/fullPlatformConsolidation.test.js (test); src/data/searchFirstDiscovery.test.js (test); src/layout/ProfileSettingsShell.test.jsx (test); src/routing/routeAuthRebuild.test.js (test)
src/data/firstCustomerDemoMode.js | Engine | Complete | src/data/edScenarioFixtures.js; src/data/edScenarioFixtures.test.js (test); src/pages/emergency/EmergencySettings.jsx; store/firstCustomerDemoMode.test.ts (test)
src/data/frontendApiCallsInventory.js | Engine | Complete | src/data/artifactIntelligence.js; src/data/backendFrontendExposure.js; src/data/backendFrontendExposure.test.js (test); src/data/backendOrphanAudit.test.js (test); src/data/backendRouteExposurePolicy.js; src/data/capabilityExposureMatrix.test.js (test); src/data/dataLineageExplorer.js; src/data/dependencyMap.js; src/data/featureCoverageMatrix.js; src/data/frontendApiCallsInventory.schedule.test.js (test); src/data/orphanDetectionAudit.js; src/data/platformCapabilityMatrix.js; src/data/platformSelfDiagnostics.js; src/data/toolInventory.js
src/data/orphanDetectionAudit.js | Engine | Complete | src/data/orphanDetectionAudit.report.test.js (test)
src/data/smartIntakeVerticalSlice.js | Engine | Complete | src/components/NewPatientIntake.jsx; src/pages/emergency/SmartIntake.jsx
src/hooks/useEmergencyOs.js | Hook | Complete | src/App.jsx; src/pages/emergency/index.tsx
src/hooks/useEmergencyRolePermissions.js | Hook | Complete | src/App.jsx; src/components/AppShell.tsx; src/components/CommandPalette.jsx; src/components/EMSCriticalBroadcast.jsx; src/components/EMSPipeline.jsx; src/components/Header.tsx; src/components/PatientDetailPanel.tsx; src/components/QuickIntake.tsx; src/components/ReferralPanel.jsx; src/components/Sidebar.tsx; src/pages/emergency/SmartIntake.jsx; src/pages/emergency/index.tsx
src/hooks/useEmergencyWebSocket.ts | Hook | Complete | None
src/hooks/usePatientTimelineContext.ts | Hook | Complete | src/components/PatientDetailPanel.tsx
src/pages/emergency/EmergencyAnalytics.jsx | Page | Complete | src/App.jsx
src/pages/emergency/EmergencySettings.css | Page | Complete | src/pages/emergency/EmergencySettings.jsx
src/pages/emergency/EmergencySettings.jsx | Page | Complete | src/App.jsx; src/pages/emergency/EmergencySettings.test.jsx (test)
src/pages/emergency/SmartIntake.jsx | Page | Complete | src/App.jsx
src/pages/emergency/index.tsx | Page | Complete | None
src/services/clinicalContentApi.js | Engine | Complete | src/pages/tools/Protocols.jsx; src/services/clinicalContentApi.test.js (test)
src/services/emergencyGovernanceApi.js | Engine | Complete | src/pages/AIGovernanceDashboard.tsx; src/services/emergencyGovernanceApi.test.js (test)
src/services/emergencyOsApi.js | Engine | Complete | src/components/NewPatientIntake.jsx; src/components/QuickIntake.tsx; src/hooks/useEmergencyOs.js; src/hooks/usePatientTimelineContext.ts; src/pages/emergency/EmergencySettings.jsx; src/services/emergencyOsApi.test.js (test)
src/services/emergencySettingsApi.js | Engine | Complete | src/pages/emergency/EmergencySettings.jsx; src/pages/emergency/EmergencySettings.test.jsx (test); src/services/emergencySettingsApi.test.js (test); store/featureStore.ts
src/services/smartIntakeApi.js | Engine | Complete | src/pages/emergency/SmartIntake.jsx; src/services/smartIntakeApi.test.js (test)
src/store/emergency-store.ts | Store | Complete | src/store/emergency-store.test.ts (test)
src/store/emergencyStore.ts | Store | Complete | src/App.jsx; src/components/AppShell.tsx; src/components/CopilotPanel.tsx; src/components/Header.tsx; src/components/PatientCard.clinicalIntelligence.test.jsx (test); src/components/PatientCard.tsx; src/components/PatientDetailPanel.tsx; src/components/QuickIntake.tsx; src/components/Sidebar.tsx; src/components/calculators/HEARTScore.tsx; src/components/calculators/PediatricDrugCalc.tsx; src/components/calculators/qSOFA.tsx; src/engine/capacityEngine.ts; src/engine/reassessmentEngine.ts; src/engine/simulation.ts; src/hooks/useEmergencyOs.js; src/pages/emergency/EmergencySettings.jsx; src/pages/emergency/index.tsx; src/store/emergencyScenarioStore.test.ts (test)
src/types/emergency.ts | Type | Complete | src/App.jsx; src/components/AppShell.tsx; src/components/CopilotPanel.tsx; src/components/Header.tsx; src/components/PatientCard.clinicalIntelligence.test.jsx (test); src/components/PatientCard.tsx; src/components/PatientDetailPanel.tsx; src/components/QuickIntake.tsx; src/components/Sidebar.tsx; src/components/calculators/HEARTScore.tsx; src/components/calculators/qSOFA.tsx; src/engine/capacityEngine.ts; src/engine/reassessmentEngine.ts; src/engine/simulation.ts; src/pages/emergency/index.tsx; src/store/emergencyStore.ts; src/utils/patientTimeline.test.ts (test); src/utils/patientTimeline.ts
src/utils/patientTimeline.ts | Engine | Complete | src/components/PatientDetailPanel.tsx; src/hooks/usePatientTimelineContext.ts; src/utils/patientTimeline.test.ts (test)
store/emergencyStore.ts | Store | Complete | engine/capacityEngine.ts; engine/journeyEngine.ts; engine/reassessmentEngine.ts; engine/simulation.ts; src/components/ChatInterface.jsx; src/components/ChatInterface.nlu.test.jsx (test); src/components/CommandPalette.jsx; src/components/CrisisMode.jsx; src/components/CrisisMode.test.jsx (test); src/components/EMSCriticalBroadcast.jsx; src/components/EMSCriticalBroadcast.test.jsx (test); src/components/EMSPipeline.jsx; src/components/EMSPressureScore.jsx; src/components/EmergencyPatientCard.jsx; src/components/EmergencyPatientDetailPanel.jsx; src/components/EmergencyWhiteboard.jsx; src/components/EmergencyWhiteboard.storeReactivity.test.jsx (test); src/components/EscalateButton.jsx; src/components/NewPatientIntake.jsx; src/components/NewPatientIntake.test.jsx (test); src/components/PediatricDrugCalculator.jsx; src/components/PediatricDrugCalculator.test.jsx (test); src/components/QueueIntelligencePanel.jsx; src/components/QueueIntelligencePanel.test.jsx (test); src/components/ReassessmentDrawer.jsx; src/components/ReferralPanel.jsx; src/components/WhoNextPanel.jsx; src/features/future-modules/_review/components/ShiftSummary.jsx; src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx; src/layout/AppShell.jsx; src/pages/ClinicalDecisionSupport.jsx; src/pages/emergency/ClinicalCalculatorHub.jsx; src/pages/emergency/DepartmentPulse.test.jsx (test); src/pages/emergency/EmergencyAnalytics.jsx; src/pages/emergency/EmergencySettings.jsx; src/pages/emergency/SmartIntake.jsx; src/routing/canonicalRouteTree.behavior.test.jsx (test); src/test/pilotWalkthrough.test.jsx (test); store/emergencyStore.test.ts (test); store/firstCustomerDemoMode.test.ts (test)
types/emergency.ts | Type | Complete | config/criticalChecklists.ts; engine/alertEngine.test.ts (test); engine/alertEngine.ts; engine/capacityEngine.ts; engine/journeyEngine.ts; engine/reassessmentEngine.ts; engine/simulation.ts; engine/triageEngine.test.ts (test); engine/triageEngine.ts; lib/ai/contextEngine.ts; lib/ai/toolRegistry.ts; src/components/CrisisMode.test.jsx (test); src/components/EMSCriticalBroadcast.test.jsx (test); src/components/EmergencyPatientDetailPanel.jsx; src/components/EmergencyWhiteboard.storeReactivity.test.jsx (test); src/components/JourneyTimeline.jsx; src/components/NewPatientIntake.jsx; src/components/NewPatientIntake.test.jsx (test); src/components/PediatricDrugCalculator.test.jsx (test); src/components/ReassessmentDrawer.jsx; src/components/ReferralPanel.jsx; src/components/WorkloadBalancePanel.test.jsx (test); src/data/smartIntakeVerticalSlice.js; src/features/future-modules/_review/components/ShiftSummary.jsx; src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx; src/layout/AppShell.jsx; src/services/CapacityIntelligence.js; src/services/CapacityIntelligence.test.js (test); src/services/PatientJourneyEngine.js; src/services/PatientJourneyEngine.test.js (test); src/services/ReassessmentEngine.js; src/services/ReassessmentEngine.test.js (test); src/test/pilotWalkthrough.test.jsx (test); src/utils/crisisMode.js; src/utils/crisisMode.test.js (test); src/utils/longWaitRescue.js; src/utils/staffManagement.js; src/utils/staffManagement.test.js (test); src/utils/whoNext.js; src/utils/whoNext.test.js (test); store/emergencyStore.test.ts (test); store/emergencyStore.ts; store/firstCustomerDemoMode.test.ts (test)

TOTAL FILES CREATED: 106
COMPLETE: 98
PARTIAL: 1
STUB: 7
BROKEN: 0

LIST 1 — NOT WIRED (files that exist but nothing imports them):
These are dead unless we connect them.
- .gitignore
- backend/migrations/009_create_unified_patients.js
- backend/src/index.ts
- backend/src/main.ts
- frontend/src/hooks/useEmergencyWebSocket.ts
- package.json
- scripts/capture-emergency-page-screenshots.mjs
- src/components/CommandPalette.d.ts
- src/components/EMSCriticalBroadcast.d.ts
- src/components/ReassessmentDrawer.d.ts
- src/components/WorkloadBalancePanel.d.ts
- src/data/edScenarioFixtures.d.ts
- src/hooks/useEmergencyWebSocket.ts
- src/pages/emergency/index.tsx

LIST 2 — MISSING IMPORTS (files that import something that does not exist yet):
These will cause runtime crashes.
- None found.

LIST 3 — STORE ACTIONS CALLED BUT NOT DEFINED
(components calling store.X where X does not exist in the store):
These crash silently.
- None found.
