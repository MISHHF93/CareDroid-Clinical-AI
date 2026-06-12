# Layout Conflict Map

Generated: 2026-06-11T20:28:56.732Z

Scope: read-only layout/navigation/route sweep. No source code fixes were applied. This file is the requested repair queue artifact.

## Summary

- Direct App route definitions found: 268.
- Generated/inventory tool routes matched by route patterns: 209.
- Routes wrapped by AppShellPage directly or implicitly: 266.
- Layout/full-wrapper files found: 245.
- Navigation/link files found: 118.
- Active navigation files with unmatched internal routes: 0.
- Orphan page files from static scan: 48.

## Conflict Map

| Conflict Type | Files involved | Impact | Recommended action |
| --- | --- | --- | --- |
| Public/Auth shell is no-op but still AppShell-wrapped | src/App.jsx; src/layout/PublicShell.jsx; src/layout/AuthShell.jsx; public/legal/auth routes | 10 routes render through AppShell because they omit publicOnly, despite PublicShell/AuthShell naming. Legal/help/shared/auth-callback pages inherit Emergency OS header/nav/Copilot chrome. | Decide whether public/auth pages should be shell-free. If yes, mark those route records publicOnly or change resolveElement semantics; if no, rename wrappers and remove misleading compatibility comments. |
| Nested main landmarks inside AppShell | src/pages/Artifacts.jsx, src/pages/AutomationAuditTrail.jsx, src/pages/ClinicalDecisionSupport.jsx, src/pages/ClinicalDocumentationAssistant.jsx, src/pages/ClinicalKnowledgeGraph.jsx, src/pages/Competencies.jsx, src/pages/Credentials.jsx, src/pages/DataLineageExplorer.jsx, src/pages/DependencyGraph.jsx, src/pages/DependencyMap.jsx, src/pages/emergency/ClinicalCalculatorHub.jsx, src/pages/emergency/EmergencyAnalytics.jsx, src/pages/emergency/EmergencySettings.jsx, src/pages/GovernanceRegistry.jsx, src/pages/platform/PlatformSystemPage.jsx, src/pages/PlatformSelfDiagnostics.jsx, src/pages/RecommendationsPage.jsx, src/pages/ResearchEvidenceHub.jsx, +1 more | 19 routed page/components render <main> or PageShell-as-main under AppShell's single <main id="main-content">, producing invalid landmarks and scroll ownership ambiguity. | Convert route-page roots to section/div or pass PageShell as="section" when rendered inside AppShell; keep only AppShell as the main landmark owner. |
| Viewport ownership conflict | src/layout/AppShell.css, src/pages/BiometricSetup.css, src/pages/ConsentFlow.css, src/pages/GDPRNotice.jsx, src/pages/HelpCenter.jsx, src/pages/HIPAANotice.jsx, src/pages/legal/ConsentFlow.css, src/pages/NotificationPreferences.css, src/pages/team/TeamManagement.css, src/pages/tools/PsychiatryAssistantPage.jsx, src/pages/tools/SharedToolSession.css, src/pages/TwoFactorSetup.jsx | AppShell fixes the viewport and hides overflow, while 11 route/component/style files also request 100vh/100dvh. This can cause clipped content, double scroll, or mobile browser chrome issues. | Keep AppShell/root as viewport owner; change child pages to min-height: auto/content-based sizing or constrained panel sizing. |
| Duplicate sidebar/navigation systems | src/layout/AppShell.jsx; src/components/Sidebar.jsx; src/config/navigation.config.js; src/components/QuickCommandLauncher.jsx | AppShell renders an internal Emergency OS nav rail from feature flags; Sidebar renders PRIMARY_SIDEBAR_NAV_ITEMS from navigation.config; QuickCommand builds a third destination set. These can expose different labels/routes for the same concepts. | Choose one canonical navigation projection and make AppShell, Sidebar/drawer, and QuickCommand consume it instead of maintaining separate projections. |
| Stale layout tests describe old shell | src/layout/AppShell.layout.test.js; src/layout/AppShell.navigation.test.jsx; src/styles/designLanguageFit.test.js; src/layout/ProfileSettingsShell.test.jsx | Tests expect <Sidebar>, .app-shell, current-page labels, and old bottom-nav contracts that do not match ed-os-shell/ed-nav-rail implementation, making diagnostics contradictory. | Update tests to the current AppShell contract before using them as repair gates, or restore the tested Sidebar-based implementation deliberately. |
| Alias routes used as navigation destinations | src/pages/tools/ToolPageLayout.jsx; src/components/Sidebar.jsx; src/components/QuickCommandLauncher.jsx; src/config/navigation.config.js | Several UI actions still navigate to /dashboard or /assistant even though /dashboard redirects to /emergency and /assistant opens/redirects to the Copilot-in-shell flow. Users see stale labels and extra redirects. | Replace user-facing nav labels and breadcrumb targets with canonical Emergency OS destinations, or explicitly document aliases as compatibility routes only. |
| Route inventory executable drift | src/routing/routeHealth.js; src/config/routes.config.js | routeHealth.js cannot run under plain Node because extensionless ESM imports fail, so route-health diagnostics are not directly executable outside the bundler/test environment. | Make route-health diagnostics executable with Node-compatible import specifiers or a supported runner, then use it as the source of truth for route status. |
| Page components imported nowhere / orphaned UI | src/pages/AiCommandCenterDashboard.jsx, src/pages/AiEvaluationDashboard.jsx, src/pages/AiModelsPage.jsx, src/pages/AnalyticsDashboard.jsx, src/pages/AuditLogs.jsx, src/pages/AutomationAnalytics.jsx, src/pages/CareDroidBrainDashboard.jsx, src/pages/CommandDashboard.jsx, src/pages/CostAnalyticsDashboard.jsx, src/pages/DeviceFleetManagement.jsx, src/pages/DigitalOperationsCenter.jsx, src/pages/DigitalTwinIntelligence.jsx, src/pages/ExecutiveCommandCenter.jsx, src/pages/HospitalMapDashboard.jsx, src/pages/LaboratoryDashboard.jsx, src/pages/LiveTrackingMap.jsx, src/pages/MedicalIotDashboard.jsx, src/pages/MedicalSimulationSuite.jsx, src/pages/MemoryDashboard.jsx, src/pages/Patients.jsx, +28 more | 48 page files are not referenced by App.jsx or the non-test source corpus. Some are superseded by FutureReleaseStub/redirect routes, creating dead layout/nav surfaces. | Confirm whether each orphan is intentionally parked; delete, route, or document as future-only before repairing layout around it. |

## Layout Files

| File path | What it renders/sets | Where it is used | Does it conflict with another layout |
| --- | --- | --- | --- |
| src/App.jsx | header, navigation, AppShell/layout | src/data/artifactIntelligence.js, src/data/duplicateSystemAudit.js, src/data/frontendRenderingInventory.js, src/data/orphanDetectionAudit.js, src/data/platformCapabilityMatrix.js, src/data/segmentInventory.js, src/data/sourceCodeToolDiscovery.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/components/alerts/EmergencyModal.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/charts/DrugInteractionHeatmap.jsx | header | src/components/charts/index.js | No direct conflict found |
| src/components/charts/LabAnomalyScatter.jsx | header | src/components/charts/index.js | No direct conflict found |
| src/components/charts/VitalsTrendChart.jsx | header | src/components/charts/index.js | No direct conflict found |
| src/components/chat/AiRouteMetadata.jsx | header | src/components/ChatInterface.jsx | No direct conflict found |
| src/components/chat/AISourcePanel.jsx | header | src/components/ChatInterface.jsx | No direct conflict found |
| src/components/chat/ChatExecutionCard.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/chat/OperationalResultCard.jsx | header, navigation | src/components/chat/AssistantResultRenderer.jsx, src/components/ToolVisualization.jsx | No direct conflict found |
| src/components/ChatInterface.css | full viewport height | src/components/ChatInterface.jsx | No direct conflict found |
| src/components/clinical/AnomalyBanner.jsx | header | src/pages/tools/ToolPageLayout.jsx | No direct conflict found |
| src/components/clinical/ClinicalAlertBanner.jsx | header | src/pages/tools/ToolPageLayout.jsx | No direct conflict found |
| src/components/clinical/ToolPreflightStatus.jsx | header | src/pages/tools/Calculators.jsx, src/pages/tools/DrugChecker.jsx, src/pages/tools/LabInterpreter.jsx | No direct conflict found |
| src/components/clinical/TrendChart.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/ClinicalScoreCalculator.css | full viewport height | src/components/ClinicalScoreCalculator.jsx | No direct conflict found |
| src/components/ClinicalScoreCalculator.jsx | header, sidebar/aside | src/components/EmergencyWhiteboard.jsx, src/components/NewPatientIntake.jsx, src/components/PatientCard.jsx, src/components/ProtocolSuggestion.jsx | No direct conflict found |
| src/components/CommandPalette.jsx | header | src/layout/AppShell.jsx | No direct conflict found |
| src/components/ContextInsightCard.jsx | header | src/components/ProfileToolGraphCard.jsx, src/pages/AiCommandCenterDashboard.jsx, src/pages/DeviceFleetManagement.jsx, src/pages/DigitalTwinIntelligence.jsx, src/pages/fleet/FleetDashboard.jsx, src/pages/HospitalMapDashboard.jsx, src/pages/LaboratoryDashboard.jsx, src/pages/LiveTrackingMap.jsx | No direct conflict found |
| src/components/CrossModuleLinkPanel.jsx | header | src/pages/DeviceFleetManagement.jsx, src/pages/HospitalMapDashboard.jsx, src/pages/LaboratoryDashboard.jsx, src/pages/Medical3DViewer.jsx, src/pages/MedicalIotDashboard.jsx, src/pages/MedicalSimulationSuite.jsx, src/pages/tools/Calculators.jsx, src/pages/tools/Protocols.jsx | No direct conflict found |
| src/components/dashboard/DashboardVisualizations.jsx | header | src/pages/AiCommandCenterDashboard.jsx, src/pages/AiEvaluationDashboard.jsx, src/pages/CommandDashboard.jsx, src/pages/ExecutiveCommandCenter.jsx, src/pages/fleet/FleetDashboard.jsx, src/pages/MedicalIotDashboard.jsx | No direct conflict found |
| src/components/EmergencyWhiteboard.jsx | header | /emergency, src/App.jsx, src/pages/WorkspaceHome.jsx | No direct conflict found |
| src/components/EMSPipeline.jsx | header | /emergency/ems, src/App.jsx, src/pages/WorkspaceHome.jsx | No direct conflict found |
| src/components/ErrorBoundary.jsx | full viewport height | src/App.jsx | No direct conflict found |
| src/components/forms/Checkbox.jsx | header | src/pages/legal/ConsentFlow.jsx | No direct conflict found |
| src/components/forms/RadioGroup.css | layout-related symbols | src/components/forms/RadioGroup.jsx | No direct conflict found |
| src/components/forms/RadioGroup.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/forms/Select.css | full viewport height | src/components/forms/Select.jsx | No direct conflict found |
| src/components/forms/TextArea.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/LiveCostDashboard.css | full viewport height | src/components/LiveCostDashboard.jsx | No direct conflict found |
| src/components/LiveCostDashboard.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/components/NewPatientIntake.css | full viewport height | src/components/NewPatientIntake.jsx | No direct conflict found |
| src/components/NewPatientIntake.jsx | <main>, header, navigation | src/components/EmergencyWhiteboard.jsx | No direct conflict found |
| src/components/NotificationPreferences.jsx | header | /notification-preferences, src/App.jsx, src/data/segmentInventory.js, src/pages/NotificationPreferences.jsx | No direct conflict found |
| src/components/notifications/NotificationCenter.jsx | header | src/components/notifications/index.js | No direct conflict found |
| src/components/offline/OfflineSupport.jsx | header | src/components/offline/index.js, src/contexts/OfflineProvider.jsx | No direct conflict found |
| src/components/PatientCard.jsx | header, navigation, sidebar/aside | src/components/EmergencyWhiteboard.jsx | No direct conflict found |
| src/components/ProfileToolGraphCard.jsx | header, navigation | not statically imported/route-discovered | No direct conflict found |
| src/components/ProtocolSuggestion.jsx | header, sidebar/aside | src/components/NewPatientIntake.jsx, src/components/PatientCard.jsx | No direct conflict found |
| src/components/QueueIntelligencePanel.jsx | header, sidebar/aside | src/App.jsx, src/components/EmergencyWhiteboard.jsx | No direct conflict found |
| src/components/QuickCommandLauncher.css | sidebar/aside, full viewport height | src/components/QuickCommandLauncher.jsx | No direct conflict found |
| src/components/QuickCommandLauncher.jsx | header, navigation | src/data/emergencyOperatingSystem.js, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/components/ReassessmentDrawer.jsx | header | src/layout/AppShell.jsx | No direct conflict found |
| src/components/ReferralPanel.jsx | header | /emergency/referrals, src/App.jsx, src/pages/WorkspaceHome.jsx | No direct conflict found |
| src/components/ShiftSummary.jsx | header | /emergency/shift, src/App.jsx, src/pages/WorkspaceHome.jsx | No direct conflict found |
| src/components/Sidebar.css | sidebar/aside, full viewport height, AppShell/layout | src/components/Sidebar.jsx | Legacy/canonical sidebar surface overlaps AppShell internal ed-nav-rail. |
| src/components/Sidebar.jsx | header, navigation, sidebar/aside | src/data/duplicateSystemAudit.js, src/data/segmentInventory.js, src/data/uxDebtEliminationEngine.js | Legacy/canonical sidebar surface overlaps AppShell internal ed-nav-rail. |
| src/components/ToolCard.jsx | header | src/components/chat/ChatExecutionCard.jsx, src/components/chat/OperationalResultCard.jsx, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/components/tools/ToolResultShare.jsx | header | src/data/backendFrontendToolContract.js, src/data/sourceCodeToolDiscovery.js, src/data/toolInventory.js, src/pages/tools/ToolPageLayout.jsx | No direct conflict found |
| src/components/ui/CareDroidPrimitives.jsx | header, sidebar/aside, PageShell | src/components/ApiStateBanner.jsx, src/pages/AiCommandCenterDashboard.jsx, src/pages/AiEvaluationDashboard.jsx, src/pages/AnalyticsDashboard.jsx, src/pages/AuditLogs.jsx, src/pages/AutomationAnalytics.jsx, src/pages/CommandDashboard.jsx, src/pages/commercial/CommercialPages.jsx | No direct conflict found |
| src/components/ui/Drawer.css | full viewport height | src/components/ui/Drawer.jsx | No direct conflict found |
| src/components/ui/Drawer.jsx | header | src/data/uxDebtEliminationEngine.js, src/pages/Settings.jsx | No direct conflict found |
| src/components/ui/Modal.css | full viewport height | src/components/ui/Modal.jsx | No direct conflict found |
| src/components/ui/Modal.jsx | header | src/components/alerts/EmergencyModal.jsx | No direct conflict found |
| src/components/ui/PageContinuations.jsx | navigation | not statically imported/route-discovered | No direct conflict found |
| src/components/ui/PageHeader.jsx | header | src/components/ui/CareDroidPrimitives.jsx | No direct conflict found |
| src/components/WorkspaceCreationModal.css | full viewport height | src/components/WorkspaceCreationModal.jsx | No direct conflict found |
| src/components/WorkspaceCreationModal.jsx | header | not statically imported/route-discovered | No direct conflict found |
| src/config/layout.config.js | sidebar/aside, AppShell/layout | src/data/platformSelfDiagnostics.js, src/data/responsiveQaMatrix.js | No direct conflict found |
| src/config/routes.config.js | layout-related symbols | src/App.jsx, src/components/ui/PageContinuations.jsx, src/config/auth.config.js, src/config/navigation.config.js, src/data/artifactIntelligence.js, src/data/artifactKnowledgeGraph.js, src/data/assetInventory.js, src/data/commandDashboardModel.js | No direct conflict found |
| src/config/theme.tokens.js | layout-related symbols | src/contexts/ThemeContext.jsx | No direct conflict found |
| src/data/accessibilityAudit.js | sidebar/aside, AppShell/layout | not statically imported/route-discovered | No direct conflict found |
| src/data/androidDeviceQaMatrix.js | sidebar/aside | not statically imported/route-discovered | No direct conflict found |
| src/data/capabilityExposureMatrix.js | sidebar/aside | not statically imported/route-discovered | No direct conflict found |
| src/data/chatAssistedHubGroups.js | full viewport height | src/data/calculatorHubManifest.js, src/data/frontendRenderingInventory.js, src/data/toolVisibilityMatrix.js, src/pages/tools/Calculators.jsx | No direct conflict found |
| src/data/clinicalSafetyGuardrails.js | sidebar/aside, full viewport height | src/components/clinical/ClinicalDecisionSupportDisclaimer.jsx, src/data/clinicalCatalogWiring.js, src/data/clinicalIntentToolCatalog.js, src/data/clinicalSafetyComplianceReport.js | No direct conflict found |
| src/data/duplicateSystemAudit.js | sidebar/aside, AppShell/layout | not statically imported/route-discovered | No direct conflict found |
| src/data/e2eManualQaChecklist.js | sidebar/aside | src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/data/e2eRegressionChecklist.js | layout-related symbols | not statically imported/route-discovered | No direct conflict found |
| src/data/frontendOperatingSystem.js | AppShell/layout | not statically imported/route-discovered | No direct conflict found |
| src/data/frontendRenderingInventory.js | sidebar/aside | src/data/backendFrontendToolContract.js | No direct conflict found |
| src/data/platformSelfDiagnostics.js | sidebar/aside, AppShell/layout | src/pages/PlatformSelfDiagnostics.jsx | No direct conflict found |
| src/data/responsiveQaMatrix.js | layout-related symbols | src/data/androidDeviceQaMatrix.js, src/data/uxDebtEliminationEngine.js, src/test/responsiveRegression.routes.js | No direct conflict found |
| src/data/segmentInventory.js | sidebar/aside, AppShell/layout | not statically imported/route-discovered | No direct conflict found |
| src/data/sourceCodeToolDiscovery.js | sidebar/aside | src/data/backendFrontendToolContract.js, src/data/e2eToolValidationMatrix.js, src/data/frontendRenderingInventory.js, src/data/segmentInventory.js, src/data/toolVisibilityMatrix.js, src/pages/tools/ClinicalToolCatalog.jsx, src/utils/catalogSearch.js | No direct conflict found |
| src/data/toolRegistry.js | sidebar/aside, full viewport height | src/components/WorkspaceCreationModal.jsx, src/contexts/CostTrackingContext.jsx, src/data/backendFrontendToolContract.js, src/data/clinicalCatalogWiring.js, src/data/e2eToolValidationMatrix.js, src/data/frontendRenderingInventory.js, src/data/medicalToolsCatalogIndex.js, src/data/nluLaunchContract.js | No direct conflict found |
| src/data/toolVisibilityMatrix.js | sidebar/aside | not statically imported/route-discovered | No direct conflict found |
| src/data/uxDebtEliminationEngine.js | sidebar/aside, AppShell/layout | not statically imported/route-discovered | No direct conflict found |
| src/index.css | full viewport height | src/data/segmentInventory.js, src/main.jsx | No direct conflict found |
| src/layout/AppShell.css | sidebar/aside, full viewport height, AppShell/layout | src/layout/AppShell.jsx | Canonical viewport/header/nav owner; conflicts with nested page mains/full-height children. |
| src/layout/AppShell.jsx | <main>, header, navigation, sidebar/aside, AppShell/layout | src/App.jsx, src/data/duplicateSystemAudit.js, src/data/segmentInventory.js, src/data/uxDebtEliminationEngine.js | Canonical viewport/header/nav owner; conflicts with nested page mains/full-height children. |
| src/layout/AuthShell.css | full viewport height | not statically imported/route-discovered | No-op wrapper name implies separate shell, but route resolver still wraps in AppShell unless publicOnly is set. |
| src/layout/AuthShell.jsx | AppShell/layout | src/App.jsx | No-op wrapper name implies separate shell, but route resolver still wraps in AppShell unless publicOnly is set. |
| src/layout/breakpoints.js | sidebar/aside, AppShell/layout | src/config/layout.config.js, src/data/segmentInventory.js, src/layout/designTokens.js | No direct conflict found |
| src/layout/designTokens.js | layout-related symbols | src/config/theme.tokens.js | No direct conflict found |
| src/layout/PublicShell.css | full viewport height | not statically imported/route-discovered | No-op wrapper name implies separate shell, but route resolver still wraps in AppShell unless publicOnly is set. |
| src/layout/PublicShell.jsx | AppShell/layout | src/App.jsx, src/data/segmentInventory.js | No-op wrapper name implies separate shell, but route resolver still wraps in AppShell unless publicOnly is set. |
| src/main.jsx | layout-related symbols | src/components/NewPatientIntake.jsx, src/data/automationAuditTrail.js, src/data/automationRegistry.js, src/data/capabilityExposureMatrix.js, src/data/segmentInventory.js, src/data/workspaceArchitecture.js, src/layout/AppShell.jsx, src/pages/AiModelsPage.jsx | No direct conflict found |
| src/pages/AiCommandCenterDashboard.jsx | PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/AiEvaluationDashboard.jsx | PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/AiModelsPage.jsx | <main>, header | not statically imported/route-discovered | No direct conflict found |
| src/pages/AnalyticsDashboard.jsx | PageShell | src/data/segmentInventory.js | No direct conflict found |
| src/pages/Artifacts.css | layout-related symbols | /artifacts, src/pages/Artifacts.jsx | No direct conflict found |
| src/pages/Artifacts.jsx | <main>, header, sidebar/aside | /artifacts, src/App.jsx, src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/AuditLogs.css | full viewport height | src/pages/AuditLogs.jsx | No direct conflict found |
| src/pages/AuditLogs.jsx | PageShell | src/data/segmentInventory.js | No direct conflict found |
| src/pages/Auth.jsx | header | src/App.jsx, src/data/segmentInventory.js, src/pages/TwoFactorSetup.jsx, src/routing/routeHealth.js | No direct conflict found |
| src/pages/AutomationAnalytics.css | layout-related symbols | src/pages/AutomationAnalytics.jsx | No direct conflict found |
| src/pages/AutomationAnalytics.jsx | PageShell | not statically imported/route-discovered | No direct conflict found |
| src/pages/AutomationAuditTrail.jsx | <main>, header | /automation-audit, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/BillingPage.jsx | header | /billing, src/App.jsx | No direct conflict found |
| src/pages/BiometricSetup.css | full viewport height | /biometric-setup, src/pages/BiometricSetup.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/BiometricSetup.jsx | header, navigation | /biometric-setup, src/App.jsx, src/data/segmentInventory.js | No direct conflict found |
| src/pages/CapabilityDiscovery.jsx | header, navigation | /discover, src/App.jsx | No direct conflict found |
| src/pages/CareDroidBrainDashboard.jsx | <main>, header, navigation | not statically imported/route-discovered | No direct conflict found |
| src/pages/ClinicalAlertsPage.jsx | header | /clinical/alerts, src/App.jsx, src/data/segmentInventory.js | No direct conflict found |
| src/pages/ClinicalDecisionSupport.css | layout-related symbols | /clinical-decision-support, src/pages/ClinicalDecisionSupport.jsx | No direct conflict found |
| src/pages/ClinicalDecisionSupport.jsx | <main>, header, sidebar/aside | /clinical-decision-support, src/App.jsx, src/components/clinical/ClinicalDecisionSupportDisclaimer.jsx, src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/toolInventory.js, src/pages/tools/ClinicalToolCatalog.jsx, src/pages/tools/ToolPageLayout.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/ClinicalDocumentationAssistant.css | layout-related symbols | /documentation, src/pages/ClinicalDocumentationAssistant.jsx | No direct conflict found |
| src/pages/ClinicalDocumentationAssistant.jsx | <main>, navigation | /documentation, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/ClinicalKnowledgeGraph.css | layout-related symbols | /knowledge-graph, src/pages/ClinicalKnowledgeGraph.jsx | No direct conflict found |
| src/pages/ClinicalKnowledgeGraph.jsx | <main>, navigation, sidebar/aside | /knowledge-graph, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/CommandDashboard.jsx | header, navigation, PageShell | src/data/duplicateSystemAudit.js, src/data/orphanDetectionAudit.js, src/data/platformCapabilityMatrix.js, src/data/segmentInventory.js, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/pages/commercial/CommercialPages.jsx | header, navigation, PageShell | src/App.jsx, src/data/saasBottleneckImplementationAudit.js, src/data/segmentInventory.js, src/pages/BillingPage.jsx, src/pages/UsagePage.jsx | No direct conflict found |
| src/pages/Competencies.jsx | <main>, header, sidebar/aside | /competencies, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/CompetencyCredentialing.css | layout-related symbols | src/pages/Competencies.jsx, src/pages/Credentials.jsx | No direct conflict found |
| src/pages/ConsentFlow.css | full viewport height | /consent, src/pages/legal/ConsentFlow.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/CostAnalyticsDashboard.jsx | header, PageShell | src/data/segmentInventory.js, src/data/sourceCodeToolDiscovery.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/Credentials.jsx | <main>, header, sidebar/aside | /credentials, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/customer-portal/CustomerPortalPage.jsx | header, navigation | /customer-portal, src/App.jsx | No direct conflict found |
| src/pages/DataLineageExplorer.jsx | <main>, header | /data-lineage, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/DependencyGraph.jsx | <main>, header | /dependency-graph, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/DependencyMap.jsx | <main>, header | /dependency-map, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/DeviceFleetManagement.jsx | header, navigation, PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/DigitalOperationsCenter.jsx | header, navigation, PageShell | not statically imported/route-discovered | No direct conflict found |
| src/pages/DigitalTwinIntelligence.jsx | navigation, PageShell | not statically imported/route-discovered | No direct conflict found |
| src/pages/emergency/ClinicalCalculatorHub.jsx | <main>, header, navigation | /emergency/tools, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/emergency/EmergencyAnalytics.jsx | <main>, header | /emergency/analytics, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/emergency/EmergencySettings.jsx | <main>, header | /emergency/settings, /settings, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/EnterpriseReadinessPage.jsx | header, navigation | /enterprise-readiness, src/App.jsx | No direct conflict found |
| src/pages/ExecutiveCommandCenter.jsx | <main>, header | not statically imported/route-discovered | No direct conflict found |
| src/pages/FeatureFlagCenter.jsx | header | /feature-flags, src/App.jsx | No direct conflict found |
| src/pages/fleet/FleetDashboardWidgets.jsx | header | src/pages/fleet/FleetDashboard.jsx | No direct conflict found |
| src/pages/fleet/FleetLiveMap.jsx | header, navigation, sidebar/aside | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/pages/fleet/FleetPageChrome.jsx | header, navigation, PageShell, AppShell/layout | src/data/frontendRenderingInventory.js, src/pages/fleet/FleetDashboard.jsx, src/pages/fleet/FleetLiveMap.jsx, src/pages/fleet/PredictiveMaintenance.jsx, src/pages/fleet/RouteOptimizer.jsx, src/routing/routeHealth.js | No direct conflict found |
| src/pages/fleet/PredictiveMaintenance.css | layout-related symbols | src/pages/fleet/PredictiveMaintenance.jsx | No direct conflict found |
| src/pages/fleet/PredictiveMaintenance.jsx | layout-related symbols | src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/platformCapabilityMatrix.js, src/data/segmentInventory.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/fleet/RouteOptimizer.css | layout-related symbols | src/pages/fleet/RouteOptimizer.jsx | No direct conflict found |
| src/pages/fleet/RouteOptimizer.jsx | header | src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/platformCapabilityMatrix.js, src/data/segmentInventory.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/GDPRNotice.jsx | navigation, full viewport height | /gdpr, src/App.jsx, src/data/segmentInventory.js | Full viewport height can fight AppShell scroll container. |
| src/pages/GovernanceRegistry.jsx | <main>, header | /governance-registry, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/HelpCenter.jsx | navigation, full viewport height | /help, src/App.jsx, src/data/segmentInventory.js | Full viewport height can fight AppShell scroll container. |
| src/pages/HIPAANotice.jsx | navigation, full viewport height | /hipaa, src/App.jsx, src/data/segmentInventory.js | Full viewport height can fight AppShell scroll container. |
| src/pages/HospitalMapDashboard.jsx | header, navigation, sidebar/aside, PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/pages/KnowledgeBasePage.jsx | header, navigation | /knowledge-base, src/App.jsx | No direct conflict found |
| src/pages/LaboratoryDashboard.jsx | header, sidebar/aside | src/data/backendFrontendToolContract.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/legal/ConsentFlow.css | full viewport height | /consent, src/pages/legal/ConsentFlow.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/legal/ConsentFlow.jsx | header, navigation | /consent, src/App.jsx, src/data/segmentInventory.js, src/pages/legal/index.js | No direct conflict found |
| src/pages/legal/ConsentHistory.jsx | header, navigation | /consent-history, src/App.jsx, src/data/segmentInventory.js, src/pages/legal/index.js | No direct conflict found |
| src/pages/legal/PrivacyPolicy.jsx | header | /privacy, /legal/privacy, src/App.jsx, src/data/segmentInventory.js, src/pages/legal/index.js | No direct conflict found |
| src/pages/legal/TermsOfService.jsx | header | /terms, src/App.jsx, src/data/segmentInventory.js, src/pages/legal/index.js | No direct conflict found |
| src/pages/LegalPages.css | full viewport height | not statically imported/route-discovered | No direct conflict found |
| src/pages/LiveTrackingMap.jsx | header, navigation, PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js, src/data/uxDebtEliminationEngine.js | No direct conflict found |
| src/pages/MarketplacePage.jsx | header, navigation | /marketplace, src/App.jsx | No direct conflict found |
| src/pages/Medical3DViewer.jsx | header, sidebar/aside | /3d-viewer, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/MedicalIotDashboard.jsx | header, navigation, PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/MedicalSimulationSuite.jsx | <main>, header, sidebar/aside | src/data/backendFrontendToolContract.js, src/data/pluginRegistry.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/MemoryDashboard.css | layout-related symbols | src/pages/MemoryDashboard.jsx | No direct conflict found |
| src/pages/MemoryDashboard.jsx | PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/NotificationPreferences.css | full viewport height | /notification-preferences, src/components/NotificationPreferences.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/Operations.jsx | navigation, sidebar/aside, PageShell | src/data/backendFrontendToolContract.js, src/data/pluginRegistry.js, src/data/segmentInventory.js, src/data/toolInventory.js, src/routing/routeHealth.js | No direct conflict found |
| src/pages/organization/OrganizationPages.jsx | header, navigation, PageShell | src/App.jsx, src/data/orphanDetectionAudit.js | No direct conflict found |
| src/pages/Patients.jsx | <main>, header, navigation | src/data/segmentInventory.js | No direct conflict found |
| src/pages/platform/components/PlatformWorkflowPrimitives.jsx | <main>, header, PageShell | src/pages/platform/PlatformGovernanceWorkspace.jsx | No direct conflict found |
| src/pages/platform/PlatformGovernanceWorkspace.jsx | PageShell | /integrations, /integrations/source-provenance, /operations/observability, /operations/deployments, /operations/service-health, /operations/incidents, /privacy/access-log, /privacy/requests, /consent/:patientId, /ai-governance | PageShell defaults to <main>, so authenticated route can nest main landmarks. |
| src/pages/platform/PlatformSystemPage.jsx | <main>, header, navigation | /integrations/fhir, /integrations/hl7, /tools/workflow-builder-ai, /tools/clinical-reasoning-engine, /tools/why-engine, /tools/audit-trail-ai, /tools/soap-builder, /tools/clinical-dictation, /tools/discharge-summary-ai, /tools/referral-ai | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/PlatformAdminPage.jsx | header, navigation | /platform-admin, src/App.jsx | No direct conflict found |
| src/pages/PlatformLearningEngine.jsx | <main>, header, navigation | not statically imported/route-discovered | No direct conflict found |
| src/pages/PlatformOSPages.css | layout-related symbols | src/pages/PlatformOSPages.jsx | No direct conflict found |
| src/pages/PlatformOSPages.jsx | navigation, PageShell | src/App.jsx, src/data/platformCapabilityMatrix.js | No direct conflict found |
| src/pages/PlatformSelfDiagnostics.jsx | <main>, header | /self-diagnostics, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/PluginMarketplace.jsx | header | /plugins, src/App.jsx | No direct conflict found |
| src/pages/PredictiveAnalyticsDashboard.jsx | <main>, header, navigation | src/data/backendFrontendToolContract.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/Profile.jsx | header, navigation | /profile, src/App.jsx, src/components/profile/ProfileSummaryCard.jsx, src/components/ProfileToolGraphCard.jsx, src/data/emergencyOperatingSystem.js, src/data/segmentInventory.js, src/pages/profile/ProfileActivity.jsx, src/pages/profile/ProfilePreferences.jsx, src/pages/profile/ProfileSecurity.jsx | No direct conflict found |
| src/pages/profile/ProfileActivity.jsx | header, navigation | /profile/activity, src/App.jsx, src/data/segmentInventory.js | No direct conflict found |
| src/pages/profile/ProfilePreferences.jsx | header | /profile/preferences, src/App.jsx | No direct conflict found |
| src/pages/profile/ProfileSecurity.jsx | header, navigation | /profile/security, src/App.jsx, src/data/segmentInventory.js | No direct conflict found |
| src/pages/profile/ProfileToolPreferences.jsx | header | /profile/tool-preferences, src/App.jsx | No direct conflict found |
| src/pages/profile/ProfileWorkspaces.jsx | header | /profile/workspaces, src/App.jsx, src/data/emergencyOperatingSystem.js, src/data/segmentInventory.js | No direct conflict found |
| src/pages/ProfileSettings.jsx | navigation, PageShell | /profile/settings, src/App.jsx, src/data/segmentInventory.js | PageShell defaults to <main>, so authenticated route can nest main landmarks. |
| src/pages/RecommendationsPage.jsx | <main>, header, navigation | /recommendations, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/ResearchEvidenceHub.jsx | <main>, header, navigation | /research, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/SaasHealthCenter.jsx | header | /saas-health, src/App.jsx | No direct conflict found |
| src/pages/Settings.jsx | header, navigation | src/data/segmentInventory.js | No direct conflict found |
| src/pages/settings/FeatureManagement.jsx | <main>, header, sidebar/aside | /settings/features, src/App.jsx | Nested <main> inside AppShell main when route is authenticated. |
| src/pages/SimulationLaboratoryViewer.css | layout-related symbols | src/pages/LaboratoryDashboard.jsx, src/pages/Medical3DViewer.jsx, src/pages/MedicalSimulationSuite.jsx, src/pages/SimulationOutcomes.jsx, src/pages/SimulationScenarioPlayer.jsx | No direct conflict found |
| src/pages/SimulationOutcomes.jsx | <main>, header, sidebar/aside | src/data/backendFrontendToolContract.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/SimulationScenarioPlayer.jsx | header, sidebar/aside | src/data/backendFrontendToolContract.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/success-center/SuccessCenterPage.jsx | header, navigation | /success-center, src/App.jsx | No direct conflict found |
| src/pages/SystemHealth.jsx | PageShell | /system-health, src/App.jsx | No direct conflict found |
| src/pages/team/TeamManagement.css | full viewport height | /team, src/pages/team/TeamManagement.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/team/TeamManagement.jsx | header | /team, src/App.jsx, src/data/segmentInventory.js, src/pages/team/index.js | No direct conflict found |
| src/pages/tools/AiExplainability.jsx | layout-related symbols | /tools/ai-explainability, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/AmbientScribe.jsx | layout-related symbols | /tools/ambient-scribe, src/App.jsx, src/data/segmentInventory.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/CalculatorRecommender.jsx | navigation | /tools/calculator-recommender, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/Calculators.css | layout-related symbols | /tools/calculators/:slug, src/pages/tools/Calculators.jsx | No direct conflict found |
| src/pages/tools/Calculators.jsx | header, navigation | /tools/calculators/:slug, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/frontendRenderingInventory.js, src/data/segmentInventory.js, src/data/sourceCodeToolDiscovery.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/CardiologyAssistantPage.jsx | header, navigation | /tools/cardiology/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/ClinicalAudit.jsx | layout-related symbols | /tools/clinical-audit, src/App.jsx, src/data/segmentInventory.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/ClinicalToolCatalog.css | layout-related symbols | /tools/catalog, src/pages/tools/ClinicalToolCatalog.jsx | No direct conflict found |
| src/pages/tools/ClinicalToolCatalog.jsx | header, navigation, sidebar/aside | /tools/catalog, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/frontendRenderingInventory.js, src/data/pluginRegistry.js, src/data/segmentInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/DiagnosisAssistant.jsx | layout-related symbols | /tools/diagnosis, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/DifferentialAi.jsx | layout-related symbols | /tools/differential-ai, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/DrugChecker.jsx | header | /tools/drug-checker, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/segmentInventory.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/EndocrineMetabolicAssistantPage.jsx | header, navigation | /tools/endocrine/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/GastroenterologyAssistantPage.jsx | header, navigation | /tools/gastroenterology/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/GuidelineRag.jsx | layout-related symbols | /tools/guideline-rag, src/App.jsx, src/data/segmentInventory.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/LabInterpreter.css | layout-related symbols | /tools/lab-interpreter, src/pages/tools/LabInterpreter.jsx | No direct conflict found |
| src/pages/tools/LabInterpreter.jsx | header | /tools/lab-interpreter, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/clinicalSafetyGuardrails.js, src/data/segmentInventory.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/NephrologyAssistantPage.jsx | header, navigation | /tools/nephrology/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/NeurologyAssistantPage.jsx | header, navigation | /tools/neurology/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/OrderSetAi.jsx | layout-related symbols | /tools/order-set-ai, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/PatientSummaryAi.jsx | layout-related symbols | /tools/patient-summary-ai, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/PediatricsObgynAssistantPage.jsx | header, navigation | /tools/pediatrics-obgyn/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/pediatricsObgynCalculators.jsx | header | src/pages/tools/Calculators.jsx, src/routing/routeHealth.js | No direct conflict found |
| src/pages/tools/ProcedureGuide.jsx | layout-related symbols | /tools/procedures, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/Protocols.jsx | header, navigation | /protocols, /tools/protocols, src/App.jsx, src/data/backendFrontendToolContract.js, src/data/pluginRegistry.js, src/data/toolInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/tools/PsychiatryAssistantPage.jsx | header, navigation, full viewport height | /tools/psychiatry/:toolId, src/App.jsx, src/data/toolInventory.js | Full viewport height can fight AppShell scroll container. |
| src/pages/tools/PulmonologyAssistantPage.jsx | header, navigation | /tools/pulmonology/:toolId, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/SharedToolSession.css | full viewport height | /shared/tools/:shareId, src/pages/tools/SharedToolSession.jsx | Full viewport height can fight AppShell scroll container. |
| src/pages/tools/TimelineAi.jsx | layout-related symbols | /tools/timeline-ai, src/App.jsx, src/data/toolInventory.js | No direct conflict found |
| src/pages/tools/ToolPageLayout.css | layout-related symbols | src/pages/tools/ToolPageLayout.jsx | No direct conflict found |
| src/pages/tools/ToolPageLayout.jsx | header, navigation, PageShell | src/data/clinicalSafetyGuardrails.js, src/data/frontendRenderingInventory.js, src/pages/tools/AiExplainability.jsx, src/pages/tools/AmbientScribe.jsx, src/pages/tools/CalculatorRecommender.jsx, src/pages/tools/Calculators.jsx, src/pages/tools/CardiologyAssistantPage.jsx, src/pages/tools/ClinicalAudit.jsx | No direct conflict found |
| src/pages/tools/ToolsOverview.jsx | header, navigation | /tools, /tools/calculators, src/App.jsx, src/data/segmentInventory.js, src/data/toolVisibilityMatrix.js | No direct conflict found |
| src/pages/TrainingDashboard.css | layout-related symbols | src/pages/TrainingDashboard.jsx | No direct conflict found |
| src/pages/TrainingDashboard.jsx | sidebar/aside, PageShell | src/data/platformCapabilityMatrix.js, src/data/toolInventory.js | No direct conflict found |
| src/pages/TwoFactorSetup.jsx | navigation, full viewport height | /two-factor-setup, src/App.jsx, src/data/segmentInventory.js | Full viewport height can fight AppShell scroll container. |
| src/pages/UsagePage.jsx | header | /usage, src/App.jsx | No direct conflict found |
| src/pages/WorkflowAutomationBuilder.css | layout-related symbols | src/pages/WorkflowAutomationBuilder.jsx | No direct conflict found |
| src/pages/WorkflowAutomationBuilder.jsx | <main>, header, sidebar/aside | not statically imported/route-discovered | No direct conflict found |
| src/pages/WorkspaceHome.css | layout-related symbols | src/pages/WorkspaceHome.jsx | No direct conflict found |
| src/pages/WorkspaceHome.jsx | header, navigation, sidebar/aside, PageShell | src/data/emergencyOperatingSystem.js, src/data/platformCapabilityMatrix.js, src/services/emergencyIntakeOperatingSystemService.js | No direct conflict found |
| src/routing/routeHealth.js | sidebar/aside, AppShell/layout | src/data/platformCapabilityMatrix.js | No direct conflict found |
| src/services/apiClient.js | layout-related symbols | src/auth/devAuthBypass.js, src/components/ErrorBoundary.jsx, src/components/offline/OfflineSupport.jsx, src/components/TwoFactorSettings.jsx, src/contexts/TenantContext.jsx, src/contexts/WorkspaceContext.jsx, src/data/backendFrontendToolContract.js, src/data/segmentInventory.js | No direct conflict found |
| src/styles/calculators-mobile-pr.css | layout-related symbols | src/pages/tools/Calculators.jsx | No direct conflict found |
| src/styles/catalog-mobile.css | layout-related symbols | src/pages/tools/ClinicalToolCatalog.jsx | No direct conflict found |
| src/styles/design-tokens.css | sidebar/aside | src/config/theme.tokens.js, src/layout/designTokens.js, src/main.jsx | No direct conflict found |
| src/styles/layout-breakpoints.css | layout-related symbols | src/main.jsx | No direct conflict found |
| src/styles/layout-visibility.css | AppShell/layout | src/data/uxDebtEliminationEngine.js, src/main.jsx | No direct conflict found |
| src/styles/mobile-first-layout.css | layout-related symbols | src/main.jsx | No direct conflict found |
| src/styles/mobile-first-recovery.css | sidebar/aside, full viewport height | src/main.jsx | No direct conflict found |
| src/styles/mobile-performance.css | full viewport height | src/main.jsx | No direct conflict found |
| src/styles/responsive-ux.css | sidebar/aside | src/main.jsx | No direct conflict found |
| src/styles/theme-surfaces.css | full viewport height | src/main.jsx | No direct conflict found |
| src/styles/visual-consistency.css | layout-related symbols | src/main.jsx | No direct conflict found |
| src/test/testRenderUtils.jsx | AppShell/layout | not statically imported/route-discovered | No direct conflict found |

## Navigation Components And Links

| File path | Navigation type/items | Route(s) linked to | Does route exist |
| --- | --- | --- | --- |
| src/App.jsx | links/programmatic navigation: /, /3d-viewer, /agents, /ai-command-center, /ai-evaluation, /ai-governance, /ai-memory, /ai-models, /analytics, /artifacts, /asset-packs, /assets, /assistant, /audit, +253 more | /; /3d-viewer; /agents; /ai-command-center; /ai-evaluation; /ai-governance; /ai-memory; /ai-models; /analytics; /artifacts; /asset-packs; /assets; /assistant; /audit; /audit/ai; /audit/integrations; /audit/phi; /audit/policy; /auth; /auth-callback; /auth/callback; /automation-analytics; /automation-audit; /billing; /biometric-setup; /brain; /business-brain; /care-pathways; +239 more | / (yes); /3d-viewer (yes); /agents (yes); /ai-command-center (yes); /ai-evaluation (yes); /ai-governance (yes); /ai-memory (yes); /ai-models (yes); /analytics (yes); /artifacts (yes); /asset-packs (yes); /assets (yes); /assistant (yes); /audit (yes); /audit/ai (yes); /audit/integrations (yes); /audit/phi (yes); /audit/policy (yes); /auth (yes); /auth-callback (yes); /auth/callback (yes); /automation-analytics (yes); /automation-audit (yes); /billing (yes); /biometric-setup (yes); /brain (yes); /business-brain (yes); /care-pathways (yes); +239 more |
| src/benchmarks/algorithmicLookup.bench.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/components/BuildInfoBadge.jsx | links/programmatic navigation: /version | /version | /version (yes) |
| src/components/chat/OperationalResultCard.jsx | links/programmatic navigation: /assistant, /recommendations, /settings, /timeline | /assistant; /recommendations; /settings; /timeline | /assistant (yes); /recommendations (yes); /settings (yes); /timeline (yes) |
| src/components/FeatureGate.jsx | links/programmatic navigation: /settings/features | /settings/features | /settings/features (yes) |
| src/components/NewPatientIntake.jsx | nav component: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/components/profile/ProfileSummaryCard.jsx | links/programmatic navigation: /profile/workspaces | /profile/workspaces | /profile/workspaces (yes) |
| src/components/ProfileToolGraphCard.jsx | links/programmatic navigation: /profile/tool-preferences | /profile/tool-preferences | /profile/tool-preferences (yes) |
| src/components/QuickCommandLauncher.jsx | command palette navigation: /assistant | /assistant | /assistant (yes) |
| src/components/Sidebar.jsx | sidebar/nav rail: /assistant | /assistant | /assistant (yes) |
| src/components/TwoFactorSettings.jsx | links/programmatic navigation: /two-factor-setup | /two-factor-setup | /two-factor-setup (yes) |
| src/components/ui/PageContinuations.jsx | nav component: /workspace | /workspace | /workspace (yes) |
| src/config/layout.config.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/config/navigation.config.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/contexts/WorkspaceContext.jsx | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/accessibilityAudit.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/androidDeviceQaMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/artifactIntelligence.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/assetInventory.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/backendFrontendToolContract.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/capabilityExposureMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/clinicalCatalogWiring.js | sidebar/nav rail: /assistant | /assistant | /assistant (yes) |
| src/data/clinicalIntentToolCatalog.js | sidebar/nav rail: /fleet/command, /fleet/predictive-maintenance, /fleet/route-optimizer, /simulation/sepsis-deterioration, /tools/calculator-recommender, /tools/calculators, /tools/calculators/aa-gradient, /tools/calculators/abcd2, /tools/calculators/adjusted-body-weight, /tools/calculators/anion-gap, /tools/calculators/apache-ii, /tools/calculators/apgar-score, /tools/calculators/apri, /tools/calculators/ascvd-risk, +159 more | /fleet/command; /fleet/predictive-maintenance; /fleet/route-optimizer; /simulation/sepsis-deterioration; /tools/calculator-recommender; /tools/calculators; /tools/calculators/aa-gradient; /tools/calculators/abcd2; /tools/calculators/adjusted-body-weight; /tools/calculators/anion-gap; /tools/calculators/apache-ii; /tools/calculators/apgar-score; /tools/calculators/apri; /tools/calculators/ascvd-risk; /tools/calculators/asthma-severity-score; /tools/calculators/audit-c; /tools/calculators/bed-occupancy-calculator; /tools/calculators/bisap-score; /tools/calculators/bishop-score; /tools/calculators/bmi; /tools/calculators/bode-index; /tools/calculators/braden-scale; /tools/calculators/bsa; /tools/calculators/bun-creatinine-ratio; /tools/calculators/cage; /tools/calculators/centor-mcisaac; /tools/calculators/chads2; /tools/calculators/chads2vasc; +145 more | /fleet/command (yes); /fleet/predictive-maintenance (yes); /fleet/route-optimizer (yes); /simulation/sepsis-deterioration (yes); /tools/calculator-recommender (yes); /tools/calculators (yes); /tools/calculators/aa-gradient (yes); /tools/calculators/abcd2 (yes); /tools/calculators/adjusted-body-weight (yes); /tools/calculators/anion-gap (yes); /tools/calculators/apache-ii (yes); /tools/calculators/apgar-score (yes); /tools/calculators/apri (yes); /tools/calculators/ascvd-risk (yes); /tools/calculators/asthma-severity-score (yes); /tools/calculators/audit-c (yes); /tools/calculators/bed-occupancy-calculator (yes); /tools/calculators/bisap-score (yes); /tools/calculators/bishop-score (yes); /tools/calculators/bmi (yes); /tools/calculators/bode-index (yes); /tools/calculators/braden-scale (yes); /tools/calculators/bsa (yes); /tools/calculators/bun-creatinine-ratio (yes); /tools/calculators/cage (yes); /tools/calculators/centor-mcisaac (yes); /tools/calculators/chads2 (yes); /tools/calculators/chads2vasc (yes); +145 more |
| src/data/clinicalSafetyGuardrails.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/clinicalToolAliasSync.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/clinicalToolIdContract.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/duplicateSystemAudit.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/e2eManualQaChecklist.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/e2eToolValidationMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/featureCoverageMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/frontendRenderingInventory.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/medicalToolsCatalogIndex.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/mountedCapabilityGraph.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/nluLaunchContract.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/orchestratorMappingAudit.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/platformCapabilitiesCatalog.js | sidebar/nav rail: /assistant, /clinical/alerts, /protocols, /tools/drug-checker | /assistant; /clinical/alerts; /protocols; /tools/drug-checker | /assistant (yes); /clinical/alerts (yes); /protocols (yes); /tools/drug-checker (yes) |
| src/data/platformInventory.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/platformSelfDiagnostics.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/pluginRegistry.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/productPackagingAudit.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/segmentInventory.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/sidebarToolPresentation.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/sourceCodeToolDiscovery.js | sidebar/nav rail: /analytics, /assistant, /clinical/alerts, /costs, /settings, /shared/tools/:shareId, /tools | /analytics; /assistant; /clinical/alerts; /costs; /settings; /shared/tools/:shareId; /tools | /analytics (yes); /assistant (yes); /clinical/alerts (yes); /costs (yes); /settings (yes); /shared/tools/:shareId (yes); /tools (yes) |
| src/data/toolAuditReport.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/toolInventory.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/toolRegistry.js | sidebar/nav rail: /3d-viewer, /ai-command-center, /ai-evaluation, /ai-governance, /ai-memory, /artifacts, /assistant, /clinical-decision-support, /competencies, /costs, /credentials, /devices, /documentation, /fleet/command, +195 more | /3d-viewer; /ai-command-center; /ai-evaluation; /ai-governance; /ai-memory; /artifacts; /assistant; /clinical-decision-support; /competencies; /costs; /credentials; /devices; /documentation; /fleet/command; /fleet/map; /fleet/predictive-maintenance; /fleet/route-optimizer; /hospital-map; /knowledge-graph; /laboratory; /live-map; /medical-iot; /operations; /predictive-analytics; /protocols; /research; /security; /simulation; +181 more | /3d-viewer (yes); /ai-command-center (yes); /ai-evaluation (yes); /ai-governance (yes); /ai-memory (yes); /artifacts (yes); /assistant (yes); /clinical-decision-support (yes); /competencies (yes); /costs (yes); /credentials (yes); /devices (yes); /documentation (yes); /fleet/command (yes); /fleet/map (yes); /fleet/predictive-maintenance (yes); /fleet/route-optimizer (yes); /hospital-map (yes); /knowledge-graph (yes); /laboratory (yes); /live-map (yes); /medical-iot (yes); /operations (yes); /predictive-analytics (yes); /protocols (yes); /research (yes); /security (yes); /simulation (yes); +181 more |
| src/data/toolRenderExecuteMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/toolVisibilityMatrix.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/data/uxDebtEliminationEngine.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/layout/AppShell.jsx | sidebar/nav rail: /emergency, /emergency/ems, /emergency/queues, /emergency/shift | /emergency; /emergency/ems; /emergency/queues; /emergency/shift | /emergency (yes); /emergency/ems (yes); /emergency/queues (yes); /emergency/shift (yes) |
| src/layout/breakpoints.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/navigation/iconRegistry.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/navigation/primaryNavigation.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/navigation/registryToolLaunch.js | sidebar/nav rail: /assistant | /assistant | /assistant (yes) |
| src/pages/Auth.jsx | links/programmatic navigation: / | / | / (yes) |
| src/pages/AuthCallback.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/BiometricSetup.jsx | links/programmatic navigation: /settings | /settings | /settings (yes) |
| src/pages/ClinicalDecisionSupport.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/ClinicalDocumentationAssistant.jsx | links/programmatic navigation: /clinical-decision-support, /protocols, /tools/ambient-scribe | /clinical-decision-support; /protocols; /tools/ambient-scribe | /clinical-decision-support (yes); /protocols (yes); /tools/ambient-scribe (yes) |
| src/pages/ClinicalKnowledgeGraph.jsx | links/programmatic navigation: /ai-models, /artifacts, /asset-packs, /integrations-marketplace, /products | /ai-models; /artifacts; /asset-packs; /integrations-marketplace; /products | /ai-models (yes); /artifacts (yes); /asset-packs (yes); /integrations-marketplace (yes); /products (yes) |
| src/pages/CommandDashboard.jsx | links/programmatic navigation: /clinical/alerts, /profile/activity, /profile/workspaces | /clinical/alerts; /profile/activity; /profile/workspaces | /clinical/alerts (yes); /profile/activity (yes); /profile/workspaces (yes) |
| src/pages/commercial/CommercialPages.jsx | links/programmatic navigation: /asset-packs, /assistant, /care-pathways, /configuration-studio, /dashboard, /integrations-marketplace, /onboarding, /organization, /plans, /products, /settings/organization/assets, /specialties | /asset-packs; /assistant; /care-pathways; /configuration-studio; /dashboard; /integrations-marketplace; /onboarding; /organization; /plans; /products; /settings/organization/assets; /specialties | /asset-packs (yes); /assistant (yes); /care-pathways (yes); /configuration-studio (yes); /dashboard (yes); /integrations-marketplace (yes); /onboarding (yes); /organization (yes); /plans (yes); /products (yes); /settings/organization/assets (yes); /specialties (yes) |
| src/pages/Competencies.jsx | links/programmatic navigation: /credentials | /credentials | /credentials (yes) |
| src/pages/Credentials.jsx | links/programmatic navigation: /competencies | /competencies | /competencies (yes) |
| src/pages/customer-portal/CustomerPortalPage.jsx | links/programmatic navigation: /integration-readiness, /tenant-admin | /integration-readiness; /tenant-admin | /integration-readiness (yes); /tenant-admin (yes) |
| src/pages/DeviceFleetManagement.jsx | links/programmatic navigation: /assistant, /hospital-map, /medical-iot | /assistant; /hospital-map; /medical-iot | /assistant (yes); /hospital-map (yes); /medical-iot (yes) |
| src/pages/DigitalOperationsCenter.jsx | links/programmatic navigation: /digital-twin, /fleet/command, /hospital-map, /medical-iot, /notifications, /system-health | /digital-twin; /fleet/command; /hospital-map; /medical-iot; /notifications; /system-health | /digital-twin (yes); /fleet/command (yes); /hospital-map (yes); /medical-iot (yes); /notifications (yes); /system-health (yes) |
| src/pages/DigitalTwinIntelligence.jsx | nav component: /devices, /digital-twin, /fleet/map, /hospital-map, /medical-iot | /devices; /digital-twin; /fleet/map; /hospital-map; /medical-iot | /devices (yes); /digital-twin (yes); /fleet/map (yes); /hospital-map (yes); /medical-iot (yes) |
| src/pages/emergency/ClinicalCalculatorHub.jsx | links/programmatic navigation: /emergency/tools | /emergency/tools | /emergency/tools (yes) |
| src/pages/EnterpriseReadinessPage.jsx | links/programmatic navigation: /governance-registry, /integration-readiness, /security, /settings | /governance-registry; /integration-readiness; /security; /settings | /governance-registry (yes); /integration-readiness (yes); /security (yes); /settings (yes) |
| src/pages/fleet/FleetLiveMap.jsx | links/programmatic navigation: /live-map | /live-map | /live-map (yes) |
| src/pages/fleet/FleetPageChrome.jsx | links/programmatic navigation: /operations | /operations | /operations (yes) |
| src/pages/HospitalMapDashboard.jsx | links/programmatic navigation: /assistant, /operations | /assistant; /operations | /assistant (yes); /operations (yes) |
| src/pages/LaboratoryDashboard.jsx | links/programmatic navigation: /tools/lab-interpreter | /tools/lab-interpreter | /tools/lab-interpreter (yes) |
| src/pages/legal/ConsentFlow.jsx | links/programmatic navigation: /, /auth, /privacy, /terms | /; /auth; /privacy; /terms | / (yes); /auth (yes); /privacy (yes); /terms (yes) |
| src/pages/legal/ConsentHistory.jsx | links/programmatic navigation: /consent, /privacy, /terms | /consent; /privacy; /terms | /consent (yes); /privacy (yes); /terms (yes) |
| src/pages/LiveTrackingMap.jsx | links/programmatic navigation: /assistant, /fleet/map, /hospital-map, /medical-iot | /assistant; /fleet/map; /hospital-map; /medical-iot | /assistant (yes); /fleet/map (yes); /hospital-map (yes); /medical-iot (yes) |
| src/pages/MedicalIotDashboard.jsx | links/programmatic navigation: /assistant, /devices, /operations | /assistant; /devices; /operations | /assistant (yes); /devices (yes); /operations (yes) |
| src/pages/MedicalSimulationSuite.jsx | links/programmatic navigation: /assistant, /simulation, /simulation/outcomes | /assistant; /simulation; /simulation/outcomes | /assistant (yes); /simulation (yes); /simulation/outcomes (yes) |
| src/pages/MemoryDashboard.jsx | links/programmatic navigation: /profile/preferences | /profile/preferences | /profile/preferences (yes) |
| src/pages/Operations.jsx | sidebar/nav rail: /clinical/alerts, /fleet/command, /fleet/predictive-maintenance, /fleet/route-optimizer | /clinical/alerts; /fleet/command; /fleet/predictive-maintenance; /fleet/route-optimizer | /clinical/alerts (yes); /fleet/command (yes); /fleet/predictive-maintenance (yes); /fleet/route-optimizer (yes) |
| src/pages/organization/OrganizationPages.jsx | links/programmatic navigation: /asset-packs, /assistant, /billing, /customer-success, /organization, /organization/settings, /outcomes, /platform-analytics, /products, /settings/organization, /solution-builder, /tenant-admin, /value-tracking | /asset-packs; /assistant; /billing; /customer-success; /organization; /organization/settings; /outcomes; /platform-analytics; /products; /settings/organization; /solution-builder; /tenant-admin; /value-tracking | /asset-packs (yes); /assistant (yes); /billing (yes); /customer-success (yes); /organization (yes); /organization/settings (yes); /outcomes (yes); /platform-analytics (yes); /products (yes); /settings/organization (yes); /solution-builder (yes); /tenant-admin (yes); /value-tracking (yes) |
| src/pages/Patients.jsx | links/programmatic navigation: /assistant, /patients/demo-patient/documentation, /patients/demo-patient/summary, /patients/demo-patient/timeline, /patients/demo-patient/workflows, /patients/demo-patient/workspace, /patients/import | /assistant; /patients/demo-patient/documentation; /patients/demo-patient/summary; /patients/demo-patient/timeline; /patients/demo-patient/workflows; /patients/demo-patient/workspace; /patients/import | /assistant (yes); /patients/demo-patient/documentation (yes); /patients/demo-patient/summary (yes); /patients/demo-patient/timeline (yes); /patients/demo-patient/workflows (yes); /patients/demo-patient/workspace (yes); /patients/import (yes) |
| src/pages/platform/PlatformSystemPage.jsx | links/programmatic navigation: /tools | /tools | /tools (yes) |
| src/pages/PlatformOSPages.jsx | links/programmatic navigation: /assistant, /devices, /digital-twin, /fleet/map, /hospital-map, /live-map, /medical-iot, /notifications, /system-health, /workspace/emergency | /assistant; /devices; /digital-twin; /fleet/map; /hospital-map; /live-map; /medical-iot; /notifications; /system-health; /workspace/emergency | /assistant (yes); /devices (yes); /digital-twin (yes); /fleet/map (yes); /hospital-map (yes); /live-map (yes); /medical-iot (yes); /notifications (yes); /system-health (yes); /workspace/emergency (yes) |
| src/pages/PredictiveAnalyticsDashboard.jsx | links/programmatic navigation: /clinical-decision-support, /fleet/predictive-maintenance, /medical-iot, /protocols | /clinical-decision-support; /fleet/predictive-maintenance; /medical-iot; /protocols | /clinical-decision-support (yes); /fleet/predictive-maintenance (yes); /medical-iot (yes); /protocols (yes) |
| src/pages/Profile.jsx | links/programmatic navigation: /audit, /competencies, /credentials, /dashboard, /profile/activity, /profile/preferences, /profile/security, /profile/settings, /profile/tool-preferences, /profile/workspaces, /settings | /audit; /competencies; /credentials; /dashboard; /profile/activity; /profile/preferences; /profile/security; /profile/settings; /profile/tool-preferences; /profile/workspaces; /settings | /audit (yes); /competencies (yes); /credentials (yes); /dashboard (yes); /profile/activity (yes); /profile/preferences (yes); /profile/security (yes); /profile/settings (yes); /profile/tool-preferences (yes); /profile/workspaces (yes); /settings (yes) |
| src/pages/profile/ProfileSecurity.jsx | links/programmatic navigation: /audit, /biometric-setup, /notifications, /settings, /two-factor-setup | /audit; /biometric-setup; /notifications; /settings; /two-factor-setup | /audit (yes); /biometric-setup (yes); /notifications (yes); /settings (yes); /two-factor-setup (yes) |
| src/pages/ProfileSettings.jsx | links/programmatic navigation: /profile | /profile | /profile (yes) |
| src/pages/ResearchEvidenceHub.jsx | links/programmatic navigation: /protocols, /simulation, /tools/guideline-rag | /protocols; /simulation; /tools/guideline-rag | /protocols (yes); /simulation (yes); /tools/guideline-rag (yes) |
| src/pages/Settings.jsx | links/programmatic navigation: /billing, /configuration-studio, /organization, /products, /profile, /settings/features, /tenant-admin | /billing; /configuration-studio; /organization; /products; /profile; /settings/features; /tenant-admin | /billing (yes); /configuration-studio (yes); /organization (yes); /products (yes); /profile (yes); /settings/features (yes); /tenant-admin (yes) |
| src/pages/settings/FeatureManagement.jsx | sidebar/nav rail: /billing | /billing | /billing (yes) |
| src/pages/SimulationOutcomes.jsx | links/programmatic navigation: /simulation | /simulation | /simulation (yes) |
| src/pages/SimulationScenarioPlayer.jsx | links/programmatic navigation: /simulation, /simulation/outcomes | /simulation; /simulation/outcomes | /simulation (yes); /simulation/outcomes (yes) |
| src/pages/success-center/SuccessCenterPage.jsx | links/programmatic navigation: /customer-portal, /value-tracking | /customer-portal; /value-tracking | /customer-portal (yes); /value-tracking (yes) |
| src/pages/SystemHealth.jsx | links/programmatic navigation: /version | /version | /version (yes) |
| src/pages/tools/CalculatorRecommender.jsx | links/programmatic navigation: /tools/calculator-recommender | /tools/calculator-recommender | /tools/calculator-recommender (yes) |
| src/pages/tools/Calculators.jsx | links/programmatic navigation: /tools/calculators | /tools/calculators | /tools/calculators (yes) |
| src/pages/tools/CardiologyAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/ClinicalToolCatalog.jsx | sidebar/nav rail: /assistant, /tools | /assistant; /tools | /assistant (yes); /tools (yes) |
| src/pages/tools/EndocrineMetabolicAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/GastroenterologyAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/NephrologyAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/NeurologyAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/PediatricsObgynAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/Protocols.jsx | links/programmatic navigation: /clinical-decision-support, /protocols, /simulation | /clinical-decision-support; /protocols; /simulation | /clinical-decision-support (yes); /protocols (yes); /simulation (yes) |
| src/pages/tools/PsychiatryAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/PulmonologyAssistantPage.jsx | links/programmatic navigation: /assistant | /assistant | /assistant (yes) |
| src/pages/tools/SharedToolSession.jsx | links/programmatic navigation: /dashboard, /tools | /dashboard; /tools | /dashboard (yes); /tools (yes) |
| src/pages/tools/ToolNotFound.jsx | links/programmatic navigation: /dashboard, /tools, /tools/catalog | /dashboard; /tools; /tools/catalog | /dashboard (yes); /tools (yes); /tools/catalog (yes) |
| src/pages/tools/ToolPageLayout.jsx | breadcrumbs/local nav: /assistant, /dashboard, /tools | /assistant; /dashboard; /tools | /assistant (yes); /dashboard (yes); /tools (yes) |
| src/pages/TwoFactorSetup.jsx | links/programmatic navigation: /profile-settings | /profile-settings | /profile-settings (yes) |
| src/pages/Version.jsx | links/programmatic navigation: /auth, /tools | /auth; /tools | /auth (yes); /tools (yes) |
| src/pages/Welcome.jsx | links/programmatic navigation: /dashboard, /onboarding | /dashboard; /onboarding | /dashboard (yes); /onboarding (yes) |
| src/pages/WorkspaceHome.jsx | sidebar/nav rail: /assistant, /notifications, /profile/workspaces, /workspace, /workspace/emergency | /assistant; /notifications; /profile/workspaces; /workspace; /workspace/emergency | /assistant (yes); /notifications (yes); /profile/workspaces (yes); /workspace (yes); /workspace/emergency (yes) |
| src/routing/routeHealth.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/services/advancedRecommendationService.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |
| src/utils/catalogSearch.js | sidebar/nav rail: dynamic/config-driven | dynamic/config-driven; routes not statically enumerable from this file | dynamic/config-driven; routes not statically enumerable from this file |

## Route Definitions

| Path | Component it renders | Layout it uses | Status | Source |
| --- | --- | --- | --- | --- |
| * | ToolNotFound | AppShellPage -> AppShell | working fallback | src/App.jsx:2342 |
| / | Navigate | none/publicOnly | working alias/redirect | src/App.jsx:754 |
| /3d-viewer | Medical3DViewer | AppShellPage -> AppShell | working | src/App.jsx:1400 |
| /agents | AgentsRegistryPage | AppShellPage -> AppShell | working | src/App.jsx:1856 |
| /ai-command-center | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1254 |
| /ai-evaluation | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1248 |
| /ai-governance | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2007 |
| /ai-memory | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1237 |
| /ai-models | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1226 |
| /analytics | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:2154 |
| /artifacts | Artifacts | AppShellPage -> AppShell | working | src/App.jsx:1221 |
| /asset-packs | PackMarketplace | AppShellPage -> AppShell | working | src/App.jsx:1826 |
| /assets | AssetLibraryPage | AppShellPage -> AppShell | working | src/App.jsx:1028 |
| /assistant | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1038 |
| /audit | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2124 |
| /audit/ai | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2130 |
| /audit/integrations | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2142 |
| /audit/phi | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2136 |
| /audit/policy | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2148 |
| /auth | Navigate | none/publicOnly | working alias/redirect | src/App.jsx:759 |
| /auth-callback | AuthCallback | AppShellPage -> AuthShell(no-op) | working | src/App.jsx:764 |
| /auth/callback | LegacyOAuthCallbackRedirect | AppShellPage -> AuthShell(no-op) | working | src/App.jsx:772 |
| /automation-analytics | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:928 |
| /automation-audit | AutomationAuditTrail | AppShellPage -> AppShell | working | src/App.jsx:923 |
| /billing | BillingPage | AppShellPage -> AppShell | working | src/App.jsx:1710 |
| /biometric-setup | BiometricSetup | AppShellPage -> AppShell | working | src/App.jsx:1801 |
| /brain | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1266 |
| /business-brain | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1272 |
| /care-pathways | CarePathwaysIndexPage | AppShellPage -> AppShell | working | src/App.jsx:1846 |
| /care-pathways/:slug | CarePathwayDetailPage | AppShellPage -> AppShell | working | src/App.jsx:1851 |
| /clinical-decision-support | ClinicalDecisionSupport | AppShellPage -> AppShell | working | src/App.jsx:1360 |
| /clinical/alerts | ClinicalAlertsPage | AppShellPage -> AppShell | working | src/App.jsx:1628 |
| /competencies | Competencies | AppShellPage -> AppShell | working | src/App.jsx:1365 |
| /configuration-studio | ConfigurationStudioPage | AppShellPage -> AppShell | working | src/App.jsx:1896 |
| /consent | ConsentFlow | AppShellPage -> AppShell | working | src/App.jsx:1907 |
| /consent-history | ConsentHistory | AppShellPage -> AppShell | working | src/App.jsx:1912 |
| /consent/:patientId | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1946 |
| /costs | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:2160 |
| /credentials | Credentials | AppShellPage -> AppShell | working | src/App.jsx:1370 |
| /customer-portal | CustomerPortalPage | AppShellPage -> AppShell | working | src/App.jsx:1685 |
| /customer-success | CustomerSuccessDashboard | AppShellPage -> AppShell | working | src/App.jsx:1760 |
| /dashboard | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:902 |
| /data-lineage | DataLineageExplorer | AppShellPage -> AppShell | working | src/App.jsx:2081 |
| /department-intelligence | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1013 |
| /departments | DepartmentsPage | AppShellPage -> AppShell | working | src/App.jsx:1775 |
| /dependency-graph | DependencyGraph | AppShellPage -> AppShell | working | src/App.jsx:2069 |
| /dependency-map | DependencyMap | AppShellPage -> AppShell | working | src/App.jsx:2063 |
| /devices | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1296 |
| /digital-twin | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:993 |
| /digital-twin-intelligence | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1003 |
| /discover | CapabilityDiscovery | AppShellPage -> AppShell | working | src/App.jsx:913 |
| /documentation | ClinicalDocumentationAssistant | AppShellPage -> AppShell | working | src/App.jsx:1345 |
| /emergency | EmergencyWhiteboard | AppShellPage -> AppShell | working | src/App.jsx:785 |
| /emergency/* | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:896 |
| /emergency/analytics | EmergencyAnalytics | AppShellPage -> AppShell | working | src/App.jsx:868 |
| /emergency/boarding | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:877 |
| /emergency/capacity | EmergencyCapacityRoute | AppShellPage -> AppShell | working | src/App.jsx:817 |
| /emergency/command-center | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:882 |
| /emergency/copilot | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:835 |
| /emergency/ems | EMSPipeline | AppShellPage -> AppShell | working | src/App.jsx:799 |
| /emergency/patients | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:858 |
| /emergency/queue | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:863 |
| /emergency/queues | EmergencyQueueRoute | AppShellPage -> AppShell | working | src/App.jsx:790 |
| /emergency/referrals | ReferralPanel | AppShellPage -> AppShell | working | src/App.jsx:808 |
| /emergency/settings | EmergencySettings | AppShellPage -> AppShell | working | src/App.jsx:891 |
| /emergency/shift | ShiftSummary | AppShellPage -> AppShell | working | src/App.jsx:826 |
| /emergency/tools | ClinicalCalculatorHub | AppShellPage -> AppShell | working | src/App.jsx:844 |
| /emergency/whiteboard | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:853 |
| /enterprise-readiness | EnterpriseReadinessPage | AppShellPage -> AppShell | working | src/App.jsx:1700 |
| /equity | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2025 |
| /executive | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:907 |
| /expansion-opportunities | CustomerExpansionOpportunitiesPage | AppShellPage -> AppShell | working | src/App.jsx:1881 |
| /feature-flags | FeatureFlagCenter | AppShellPage -> AppShell | working | src/App.jsx:2051 |
| /fleet/* | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1621 |
| /fleet/command | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1595 |
| /fleet/map | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1600 |
| /fleet/predictive-maintenance | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1606 |
| /fleet/route-optimizer | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1611 |
| /gdpr | GDPRNotice | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1960 |
| /governance | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2166 |
| /governance-registry | GovernanceRegistry | AppShellPage -> AppShell | working | src/App.jsx:2075 |
| /governance/ai | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2304 |
| /governance/ai-security | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2196 |
| /governance/ai-security/incidents | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2214 |
| /governance/ai-security/model-access | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2208 |
| /governance/ai-security/prompt-firewall | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2202 |
| /governance/clinical | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2172 |
| /governance/clinical-safety | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2323 |
| /governance/clinical/policies | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2178 |
| /governance/clinical/release-gates | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2184 |
| /governance/clinical/safety-findings | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2190 |
| /governance/consent | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2329 |
| /governance/costs | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2316 |
| /governance/equity | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2244 |
| /governance/equity/cohorts | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2256 |
| /governance/equity/findings | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2262 |
| /governance/equity/metrics | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2250 |
| /governance/equity/reports | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2268 |
| /governance/model-usage | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2310 |
| /governance/privacy | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2335 |
| /governance/regulatory | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2220 |
| /governance/regulatory/capabilities | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2226 |
| /governance/regulatory/evidence | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2238 |
| /governance/regulatory/intended-use | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2232 |
| /governance/validation | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2274 |
| /governance/validation/release-gates | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2298 |
| /governance/validation/runs | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2292 |
| /governance/validation/scenarios | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2280 |
| /governance/validation/synthetic-patients | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2286 |
| /help | HelpCenter | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1976 |
| /hipaa | HIPAANotice | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1968 |
| /hospital-map | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1290 |
| /human-review | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2031 |
| /integration-readiness | IntegrationReadinessPage | AppShellPage -> AppShell | working | src/App.jsx:1891 |
| /integrations | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1172 |
| /integrations-marketplace | IntegrationsMarketplacePage | AppShellPage -> AppShell | working | src/App.jsx:1886 |
| /integrations/fhir | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1178 |
| /integrations/hl7 | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1184 |
| /integrations/source-provenance | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1190 |
| /knowledge-base | KnowledgeBasePage | AppShellPage -> AppShell | working | src/App.jsx:1690 |
| /knowledge-graph | ClinicalKnowledgeGraph | AppShellPage -> AppShell | working | src/App.jsx:1350 |
| /knowledge-hub | HealthcareKnowledgeHubPage | AppShellPage -> AppShell | working | src/App.jsx:983 |
| /laboratory | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1395 |
| /legal/privacy | PrivacyPolicy | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1926 |
| /live-map | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1278 |
| /marketplace | MarketplacePage | AppShellPage -> AppShell | working | src/App.jsx:1695 |
| /maturity-assessment | MaturityAssessmentPage | AppShellPage -> AppShell | working | src/App.jsx:1861 |
| /medical-iot | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1284 |
| /memory | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1232 |
| /notification-preferences | NotificationPreferences | AppShellPage -> AppShell | working | src/App.jsx:1790 |
| /notifications | NotificationCenterPage | AppShellPage -> AppShell | working | src/App.jsx:1785 |
| /onboarding | OrganizationOnboardingPage | AppShellPage -> AppShell | working | src/App.jsx:1811 |
| /operations | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:998 |
| /operations/deployments | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1203 |
| /operations/incidents | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1215 |
| /operations/observability | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1196 |
| /operations/service-health | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1209 |
| /organization | OrganizationDashboard | AppShellPage -> AppShell | working | src/App.jsx:1720 |
| /organization-intelligence | OrganizationIntelligenceProfile | AppShellPage -> AppShell | working | src/App.jsx:1765 |
| /organization/settings | OrganizationSettings | AppShellPage -> AppShell | working | src/App.jsx:1725 |
| /outcomes | OutcomesDashboardPage | AppShellPage -> AppShell | working | src/App.jsx:1866 |
| /patients | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1047 |
| /patients/:patientId/care-plan | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1112 |
| /patients/:patientId/consent | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1118 |
| /patients/:patientId/documentation | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1158 |
| /patients/:patientId/documentation/:documentId | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1165 |
| /patients/:patientId/events | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1099 |
| /patients/:patientId/labs/import | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1059 |
| /patients/:patientId/medications/import | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1066 |
| /patients/:patientId/observations/import | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1073 |
| /patients/:patientId/privacy | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1137 |
| /patients/:patientId/review | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1130 |
| /patients/:patientId/risk-history | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1106 |
| /patients/:patientId/source-data | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1124 |
| /patients/:patientId/summary | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1086 |
| /patients/:patientId/timeline | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1093 |
| /patients/:patientId/workflows | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1144 |
| /patients/:patientId/workflows/:workflowId | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1151 |
| /patients/:patientId/workspace | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1080 |
| /patients/import | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1052 |
| /plans | CommercialPlansPage | AppShellPage -> AppShell | working | src/App.jsx:1831 |
| /platform-admin | PlatformAdminPage | AppShellPage -> AppShell | working | src/App.jsx:1705 |
| /platform-analytics | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1755 |
| /platform-learning-engine | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1260 |
| /plugins | PluginMarketplace | AppShellPage -> AppShell | working | src/App.jsx:2057 |
| /predictive-analytics | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1355 |
| /privacy | PrivacyPolicy | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1918 |
| /privacy/access-log | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1934 |
| /privacy/requests | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:1940 |
| /product-intelligence | ProductIntelligenceLayerPage | AppShellPage -> AppShell | working | src/App.jsx:1876 |
| /products | ProductsIndexPage | AppShellPage -> AppShell | working | src/App.jsx:1816 |
| /products/:slug | ProductDetailPage | AppShellPage -> AppShell | working | src/App.jsx:1821 |
| /profile | Profile | AppShellPage -> AppShell | working | src/App.jsx:1634 |
| /profile-settings | Navigate | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:1669 |
| /profile/activity | ProfileActivity | AppShellPage -> AppShell | working | src/App.jsx:1644 |
| /profile/preferences | ProfilePreferences | AppShellPage -> AppShell | working | src/App.jsx:1649 |
| /profile/security | ProfileSecurity | AppShellPage -> AppShell | working | src/App.jsx:1664 |
| /profile/settings | ProfileSettings | AppShellPage -> AppShell | working | src/App.jsx:1639 |
| /profile/tool-preferences | ProfileToolPreferences | AppShellPage -> AppShell | working | src/App.jsx:1654 |
| /profile/workspaces | ProfileWorkspaces | AppShellPage -> AppShell | working | src/App.jsx:1659 |
| /protocols | Protocols | AppShellPage -> AppShell | working | src/App.jsx:1405 |
| /recommendations | RecommendationsPage | AppShellPage -> AppShell | working | src/App.jsx:918 |
| /regulatory | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2019 |
| /research | ResearchEvidenceHub | AppShellPage -> AppShell | working | src/App.jsx:1410 |
| /review | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2094 |
| /review/clinical | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2100 |
| /review/documentation | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2106 |
| /review/governance | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2118 |
| /review/privacy | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2112 |
| /saas-health | SaasHealthCenter | AppShellPage -> AppShell | working | src/App.jsx:2044 |
| /search | SearchResultsPage | AppShellPage -> AppShell | working | src/App.jsx:978 |
| /security | PlatformGovernanceWorkspace | AppShellPage -> AppShell | working | src/App.jsx:2013 |
| /self-diagnostics | PlatformSelfDiagnostics | AppShellPage -> AppShell | working | src/App.jsx:2087 |
| /service-lines | ServiceLinesPage | AppShellPage -> AppShell | working | src/App.jsx:1780 |
| /settings | EmergencySettings | AppShellPage -> AppShell | working | src/App.jsx:1674 |
| /settings/features | FeatureManagement | AppShellPage -> AppShell | working | src/App.jsx:1679 |
| /settings/organization | OrganizationSettings | AppShellPage -> AppShell | working | src/App.jsx:1740 |
| /settings/organization/assets | AssetLifecycleAdmin | AppShellPage -> AppShell | working | src/App.jsx:1750 |
| /settings/organization/packs | PackMarketplace | AppShellPage -> AppShell | working | src/App.jsx:1745 |
| /shared/tools/:shareId | SharedToolSession | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1992 |
| /simulation | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1375 |
| /simulation/:scenarioId | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1390 |
| /simulation/outcomes | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1380 |
| /simulation/sepsis-deterioration | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:1385 |
| /solution-builder | HospitalSolutionBuilderPage | AppShellPage -> AppShell | working | src/App.jsx:1901 |
| /specialties | SpecialtiesIndexPage | AppShellPage -> AppShell | working | src/App.jsx:1836 |
| /specialties/:slug | SpecialtyDetailPage | AppShellPage -> AppShell | working | src/App.jsx:1841 |
| /success-center | SuccessCenterPage | AppShellPage -> AppShell | working | src/App.jsx:1770 |
| /system-health | SystemHealth | AppShellPage -> AppShell | working | src/App.jsx:2037 |
| /team | TeamManagement | AppShellPage -> AppShell | working | src/App.jsx:2001 |
| /tenant-admin | TenantAdministrationCenter | AppShellPage -> AppShell | working | src/App.jsx:1730 |
| /tenant-admin/workspaces | TenantAdministrationCenter | AppShellPage -> AppShell | working | src/App.jsx:1735 |
| /terms | TermsOfService | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1952 |
| /timeline | ClinicalTimelinePage | AppShellPage -> AppShell | working | src/App.jsx:988 |
| /tools | ToolsOverview | AppShellPage -> AppShell | working | src/App.jsx:1304 |
| /tools/* | ToolNotFound | AppShellPage -> AppShell | working fallback | src/App.jsx:1616 |
| /tools/ai-explainability | AiExplainability | AppShellPage -> AppShell | working | src/App.jsx:1581 |
| /tools/ambient-scribe | AmbientScribe | AppShellPage -> AppShell | working | src/App.jsx:1431 |
| /tools/audit-trail-ai | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1470 |
| /tools/calculator-recommender | CalculatorRecommender | AppShellPage -> AppShell | working | src/App.jsx:1438 |
| /tools/calculators | ToolsOverview | AppShellPage -> AppShell | working | src/App.jsx:1335 |
| /tools/calculators/:slug | Calculators | AppShellPage -> AppShell | working | src/App.jsx:1340 |
| /tools/calculators/aa-gradient | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:650 |
| /tools/calculators/abcd2 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1985 |
| /tools/calculators/adjusted-body-weight | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:561 |
| /tools/calculators/anion-gap | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2466 |
| /tools/calculators/apache-ii | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1242 |
| /tools/calculators/apgar-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1073 |
| /tools/calculators/apri | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1166 |
| /tools/calculators/ascvd-risk | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:223 |
| /tools/calculators/asthma-severity-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:702 |
| /tools/calculators/audit-c | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:718 |
| /tools/calculators/bed-occupancy-calculator | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2498 |
| /tools/calculators/bisap-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1121 |
| /tools/calculators/bishop-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1061 |
| /tools/calculators/bmi | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:83 |
| /tools/calculators/bode-index | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:617 |
| /tools/calculators/braden-scale | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1085 |
| /tools/calculators/bsa | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:529 |
| /tools/calculators/bun-creatinine-ratio | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:436 |
| /tools/calculators/cage | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:785 |
| /tools/calculators/centor-mcisaac | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1049 |
| /tools/calculators/chads2 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:304 |
| /tools/calculators/chads2vasc | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:96 |
| /tools/calculators/child-pugh | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:135 |
| /tools/calculators/ckd-staging | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:344 |
| /tools/calculators/columbia-suicide-severity-workflow | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:874 |
| /tools/calculators/copd-gold-assessment | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:633 |
| /tools/calculators/corrected-calcium | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:505 |
| /tools/calculators/corrected-sodium | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:448 |
| /tools/calculators/creatinine-clearance-cg | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:380 |
| /tools/calculators/curb-65 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1255 |
| /tools/calculators/duke-treadmill-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:247 |
| /tools/calculators/egfr-ckd-epi | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:368 |
| /tools/calculators/epworth-sleepiness-scale | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:862 |
| /tools/calculators/fena | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:392 |
| /tools/calculators/fenton-growth-chart-helper | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2127 |
| /tools/calculators/feurea | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:408 |
| /tools/calculators/fib4 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1133 |
| /tools/calculators/four-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2024 |
| /tools/calculators/framingham-risk | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1207 |
| /tools/calculators/free-water-deficit | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:460 |
| /tools/calculators/gad7 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:764 |
| /tools/calculators/gcs | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1268 |
| /tools/calculators/gestational-age-calculator | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2078 |
| /tools/calculators/gfr | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:70 |
| /tools/calculators/glasgow-blatchford-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1178 |
| /tools/calculators/has-bled | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:157 |
| /tools/calculators/hcm-sudden-death-risk | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:282 |
| /tools/calculators/heart-failure-staging | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:322 |
| /tools/calculators/heart-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1037 |
| /tools/calculators/homa-ir | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:484 |
| /tools/calculators/hunt-hess-scale | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1999 |
| /tools/calculators/ich-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2012 |
| /tools/calculators/ideal-body-weight | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:545 |
| /tools/calculators/kfre | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:420 |
| /tools/calculators/maddrey-discriminant-function | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1145 |
| /tools/calculators/mdq | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:845 |
| /tools/calculators/meld | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:176 |
| /tools/calculators/meld-na | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:193 |
| /tools/calculators/mews | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1281 |
| /tools/calculators/mmse | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:801 |
| /tools/calculators/moca-placeholder-workflow | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:817 |
| /tools/calculators/modified-rankin-scale | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2036 |
| /tools/calculators/morse-fall-scale | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1097 |
| /tools/calculators/neonatal-bilirubin-risk-helper | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2143 |
| /tools/calculators/news2 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:122 |
| /tools/calculators/nihss-summary-view | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2048 |
| /tools/calculators/osmolal-gap | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:472 |
| /tools/calculators/pao2-fio2-ratio | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:662 |
| /tools/calculators/pcl5 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:829 |
| /tools/calculators/pediatric-bp-percentile | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2095 |
| /tools/calculators/pediatric-dose-safety-checker | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2156 |
| /tools/calculators/pediatric-gcs | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2061 |
| /tools/calculators/pews | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1307 |
| /tools/calculators/phq9 | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:742 |
| /tools/calculators/pneumonia-severity-index | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:690 |
| /tools/calculators/pregnancy-due-date-calculator | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2115 |
| /tools/calculators/qsofa | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:109 |
| /tools/calculators/ranson-criteria | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1109 |
| /tools/calculators/rass | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2482 |
| /tools/calculators/resource-utilization-index | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2554 |
| /tools/calculators/revised-trauma-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1294 |
| /tools/calculators/reynolds-risk-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:265 |
| /tools/calculators/rockall-score | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1195 |
| /tools/calculators/rox-index | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:674 |
| /tools/calculators/serum-osmolality | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:517 |
| /tools/calculators/shock-index | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2450 |
| /tools/calculators/sofa | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:52 |
| /tools/calculators/staffing-ratio-calculator | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2515 |
| /tools/calculators/stop-bang | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:595 |
| /tools/calculators/timi-ua-nstemi | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:210 |
| /tools/calculators/turnaround-time-calculator | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2532 |
| /tools/calculators/waist-hip-ratio | Calculators via /tools/calculators/:slug | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:579 |
| /tools/cardiology/:toolId | CardiologyAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1443 |
| /tools/cardiology/acs-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3266 |
| /tools/cardiology/arrhythmia-risk-classifier | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3354 |
| /tools/cardiology/atrial-fibrillation-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3286 |
| /tools/cardiology/cardiac-telemetry-analyzer | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3320 |
| /tools/cardiology/cardiology-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3392 |
| /tools/cardiology/ecg-interpretation-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3235 |
| /tools/cardiology/ecg-trend-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3337 |
| /tools/cardiology/heart-failure-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3303 |
| /tools/cardiology/remote-cardiology-monitoring-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3375 |
| /tools/cardiology/stemi-pathway-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:3255 |
| /tools/catalog | ClinicalToolCatalog | AppShellPage -> AppShell | working | src/App.jsx:1309 |
| /tools/clinical-audit | ClinicalAudit | AppShellPage -> AppShell | working | src/App.jsx:1588 |
| /tools/clinical-dictation | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1484 |
| /tools/clinical-reasoning-engine | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1456 |
| /tools/diagnosis | DiagnosisAssistant | AppShellPage -> AppShell | working | src/App.jsx:1421 |
| /tools/differential-ai | DifferentialAi | AppShellPage -> AppShell | working | src/App.jsx:1553 |
| /tools/discharge-summary-ai | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1491 |
| /tools/drug-checker | DrugChecker | AppShellPage -> AppShell | working | src/App.jsx:1315 |
| /tools/endocrine/:toolId | EndocrineMetabolicAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1527 |
| /tools/endocrine/continuous-glucose-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1727 |
| /tools/endocrine/diabetes-care-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1591 |
| /tools/endocrine/dka-pathway-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1611 |
| /tools/endocrine/endocrine-monitoring-system | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1695 |
| /tools/endocrine/glucose-telemetry-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1663 |
| /tools/endocrine/insulin-trend-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1679 |
| /tools/endocrine/metabolic-analytics | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1711 |
| /tools/endocrine/metabolic-syndrome-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1643 |
| /tools/endocrine/thyroid-disorder-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1627 |
| /tools/gastroenterology/:toolId | GastroenterologyAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1522 |
| /tools/gastroenterology/cirrhosis-monitoring-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1868 |
| /tools/gastroenterology/endoscopy-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1848 |
| /tools/gastroenterology/gi-bleed-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1765 |
| /tools/gastroenterology/gi-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1884 |
| /tools/gastroenterology/gi-surveillance-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1817 |
| /tools/gastroenterology/hepatic-trend-analytics | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1832 |
| /tools/gastroenterology/liver-disease-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1781 |
| /tools/gastroenterology/pancreatitis-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1797 |
| /tools/guideline-rag | GuidelineRag | AppShellPage -> AppShell | working | src/App.jsx:1547 |
| /tools/lab-interpreter | LabInterpreter | AppShellPage -> AppShell | working | src/App.jsx:1320 |
| /tools/nephrology/:toolId | NephrologyAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1517 |
| /tools/nephrology/aki-staging-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1495 |
| /tools/nephrology/ckd-progression-predictor | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1543 |
| /tools/nephrology/dialysis-readiness-helper | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1511 |
| /tools/nephrology/dialysis-utilization-tracker | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1558 |
| /tools/nephrology/electrolyte-disorder-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1522 |
| /tools/nephrology/electrolyte-trend-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1569 |
| /tools/nephrology/fluid-balance-monitor | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1580 |
| /tools/nephrology/renal-monitoring-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1532 |
| /tools/neurology/:toolId | NeurologyAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1532 |
| /tools/neurology/eeg-trend-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2423 |
| /tools/neurology/headache-red-flag-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2344 |
| /tools/neurology/neuro-exam-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2380 |
| /tools/neurology/neuro-monitoring-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2412 |
| /tools/neurology/neuro-telemetry-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2391 |
| /tools/neurology/neurology-timeline-ai | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2434 |
| /tools/neurology/seizure-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2317 |
| /tools/neurology/stroke-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2402 |
| /tools/neurology/stroke-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2333 |
| /tools/neurology/vertigo-hints-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2360 |
| /tools/order-set-ai | OrderSetAi | AppShellPage -> AppShell | working | src/App.jsx:1574 |
| /tools/patient-summary-ai | PatientSummaryAi | AppShellPage -> AppShell | working | src/App.jsx:1567 |
| /tools/pediatrics-obgyn/:toolId | PediatricsObgynAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1537 |
| /tools/pediatrics-obgyn/growth-trend-analytics | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2285 |
| /tools/pediatrics-obgyn/maternal-monitoring-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2253 |
| /tools/pediatrics-obgyn/neonatal-assessment-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2205 |
| /tools/pediatrics-obgyn/neonatal-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2237 |
| /tools/pediatrics-obgyn/ob-triage-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2221 |
| /tools/pediatrics-obgyn/pediatric-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2269 |
| /tools/pediatrics-obgyn/pediatric-sepsis-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2173 |
| /tools/pediatrics-obgyn/perinatal-risk-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2301 |
| /tools/pediatrics-obgyn/pregnancy-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:2189 |
| /tools/prior-auth-ai | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1505 |
| /tools/procedures | ProcedureGuide | AppShellPage -> AppShell | working | src/App.jsx:1426 |
| /tools/protocols | Protocols | AppShellPage -> AppShell | working | src/App.jsx:1416 |
| /tools/psychiatry/:toolId | PsychiatryAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1542 |
| /tools/psychiatry/behavioral-analytics-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:954 |
| /tools/psychiatry/cognitive-screening-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:939 |
| /tools/psychiatry/crisis-escalation-audit-log | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1005 |
| /tools/psychiatry/mental-health-screening-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:886 |
| /tools/psychiatry/population-screening-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1021 |
| /tools/psychiatry/psychiatry-monitoring-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:985 |
| /tools/psychiatry/screening-trend-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:970 |
| /tools/psychiatry/substance-use-screening-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:920 |
| /tools/psychiatry/suicide-risk-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:906 |
| /tools/pulmonology/:toolId | PulmonologyAssistantPage | AppShellPage -> AppShell | working | src/App.jsx:1512 |
| /tools/pulmonology/asthma-exacerbation-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1391 |
| /tools/pulmonology/copd-workflow-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1426 |
| /tools/pulmonology/oxygen-escalation-helper | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1416 |
| /tools/pulmonology/pulmonary-trend-engine | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1469 |
| /tools/pulmonology/respiratory-command-center | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1484 |
| /tools/pulmonology/respiratory-telemetry-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1447 |
| /tools/pulmonology/sleep-apnea-analytics | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1458 |
| /tools/pulmonology/ventilator-monitoring-dashboard | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1437 |
| /tools/pulmonology/ventilator-support-assistant | Specialty assistant dynamic route | AppShellPage -> AppShell | working generated/inventory route | src/data/toolRegistry.js:1406 |
| /tools/referral-ai | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1498 |
| /tools/soap-builder | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1477 |
| /tools/timeline-ai | TimelineAi | AppShellPage -> AppShell | working | src/App.jsx:1560 |
| /tools/why-engine | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1463 |
| /tools/workflow-builder-ai | PlatformSystemPage | AppShellPage -> AppShell | working | src/App.jsx:1449 |
| /training | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:1242 |
| /two-factor-setup | TwoFactorSetup | AppShellPage -> AppShell | working | src/App.jsx:1796 |
| /usage | UsagePage | AppShellPage -> AppShell | working | src/App.jsx:1715 |
| /value-tracking | ValueTrackingPage | AppShellPage -> AppShell | working | src/App.jsx:1871 |
| /version | Version | AppShellPage -> PublicShell(no-op) | working | src/App.jsx:1984 |
| /welcome | Welcome | AppShellPage -> AppShell | working | src/App.jsx:1806 |
| /workflow-mining | WorkflowMiningEnginePage | AppShellPage -> AppShell | working | src/App.jsx:1018 |
| /workflows | WorkflowBuilderPage | AppShellPage -> AppShell | working | src/App.jsx:1008 |
| /workspace | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:933 |
| /workspace-dependency-graph | WorkspaceDependencyGraphPage | AppShellPage -> AppShell | working | src/App.jsx:1023 |
| /workspace/:workspaceId | WorkspaceRouteRedirect | AppShellPage -> AppShell | working | src/App.jsx:968 |
| /workspace/:workspaceId/:subpage | WorkspaceRouteRedirect | AppShellPage -> AppShell | working | src/App.jsx:973 |
| /workspace/emergency/copilot | EmergencyCopilotRedirect | AppShellPage -> AppShell | working | src/App.jsx:953 |
| /workspace/emergency/queue | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:943 |
| /workspace/emergency/queues | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:948 |
| /workspace/emergency/settings | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:958 |
| /workspace/emergency/whiteboard | LegacyProtectedRouteRedirect | AppShellPage -> AppShell | working alias/redirect | src/App.jsx:938 |
| /workspaces | FutureReleaseStub | AppShellPage -> AppShell | working stub | src/App.jsx:963 |

## Nesting And Duplication Details

| Finding | Files | Detail |
| --- | --- | --- |
| Routes that are children of AppShell plus local main/layout | src/pages/Artifacts.jsx, src/pages/AutomationAuditTrail.jsx, src/pages/ClinicalDecisionSupport.jsx, src/pages/ClinicalDocumentationAssistant.jsx, src/pages/ClinicalKnowledgeGraph.jsx, src/pages/Competencies.jsx, src/pages/Credentials.jsx, src/pages/DataLineageExplorer.jsx, src/pages/DependencyGraph.jsx, src/pages/DependencyMap.jsx, src/pages/emergency/ClinicalCalculatorHub.jsx, src/pages/emergency/EmergencyAnalytics.jsx, src/pages/emergency/EmergencySettings.jsx, src/pages/GovernanceRegistry.jsx, src/pages/platform/PlatformSystemPage.jsx, src/pages/PlatformSelfDiagnostics.jsx, src/pages/RecommendationsPage.jsx, src/pages/ResearchEvidenceHub.jsx, src/pages/settings/FeatureManagement.jsx | These route contents sit under AppShell's main and render their own main/PageShell main. |
| PublicShell/AuthShell nested inside AppShell | /auth-callback -> AppShellPage -> AuthShell(no-op), /auth/callback -> AppShellPage -> AuthShell(no-op), /privacy -> AppShellPage -> PublicShell(no-op), /legal/privacy -> AppShellPage -> PublicShell(no-op), /terms -> AppShellPage -> PublicShell(no-op), /gdpr -> AppShellPage -> PublicShell(no-op), /hipaa -> AppShellPage -> PublicShell(no-op), /help -> AppShellPage -> PublicShell(no-op), /version -> AppShellPage -> PublicShell(no-op), /shared/tools/:shareId -> AppShellPage -> PublicShell(no-op) | No-op wrappers do not prevent AppShell wrapping because publicOnly is absent on these route definitions. |
| Navigation components duplicate each other | src/layout/AppShell.jsx; src/components/Sidebar.jsx; src/config/navigation.config.js; src/components/QuickCommandLauncher.jsx | Emergency nav rail, Sidebar primary nav, and QuickCommand destination lists are separate projections. |
| Bottom nav intentionally absent but stale tests mention it | src/layout/AppShell.navigation.test.jsx; src/layout/AppShell.layout.test.js; src/data/uxDebtEliminationEngine.js | Tests and audit code still enforce absence of old bottom nav while also expecting old Sidebar markup. |

## Broken Or Questionable Navigation Targets

No unmatched static internal navigation targets found in active UI/navigation source files.

## Orphaned Page Files

- `src/pages/AiCommandCenterDashboard.jsx`
- `src/pages/AiEvaluationDashboard.jsx`
- `src/pages/AiModelsPage.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/AuditLogs.jsx`
- `src/pages/AutomationAnalytics.jsx`
- `src/pages/CareDroidBrainDashboard.jsx`
- `src/pages/CommandDashboard.jsx`
- `src/pages/CostAnalyticsDashboard.jsx`
- `src/pages/DeviceFleetManagement.jsx`
- `src/pages/DigitalOperationsCenter.jsx`
- `src/pages/DigitalTwinIntelligence.jsx`
- `src/pages/ExecutiveCommandCenter.jsx`
- `src/pages/HospitalMapDashboard.jsx`
- `src/pages/LaboratoryDashboard.jsx`
- `src/pages/LiveTrackingMap.jsx`
- `src/pages/MedicalIotDashboard.jsx`
- `src/pages/MedicalSimulationSuite.jsx`
- `src/pages/MemoryDashboard.jsx`
- `src/pages/Patients.jsx`
- `src/pages/PlatformLearningEngine.jsx`
- `src/pages/PredictiveAnalyticsDashboard.jsx`
- `src/pages/SimulationOutcomes.jsx`
- `src/pages/SimulationScenarioPlayer.jsx`
- `src/pages/TrainingDashboard.jsx`
- `src/pages/WorkflowAutomationBuilder.jsx`
- `src/pages/WorkspaceHome.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/FleetLiveMap.jsx`
- `src/pages/platform/components/PlatformWorkflowPrimitives.jsx`
- `src/pages/tools/ToolsAreaFallback.jsx`
- `src/pages/tools/abcd2Calculator.jsx`
- `src/pages/tools/calculatorPrimitives.jsx`
- `src/pages/tools/cardiologyCalculators.jsx`
- `src/pages/tools/emergencyCriticalCareCalculators.jsx`
- `src/pages/tools/endocrineMetabolicCalculators.jsx`
- `src/pages/tools/hepatologyGiCalculators.jsx`
- `src/pages/tools/hospitalOperationsCalculators.jsx`
- `src/pages/tools/mentalHealthCalculators.jsx`
- `src/pages/tools/nephrologyCalculators.jsx`
- `src/pages/tools/neurologyCalculators.jsx`
- `src/pages/tools/nextWaveCalculators.jsx`
- `src/pages/tools/pediatricsObgynCalculators.jsx`
- `src/pages/tools/pr4aCalculators.jsx`
- `src/pages/tools/pr8ClinicalBatchCalculators.jsx`
- `src/pages/tools/psychiatryScreeningCalculators.jsx`
- `src/pages/tools/pulmonologyCalculators.jsx`
- `src/pages/tools/sourceBackedClinicalCalculators.jsx`

## Notes

- Route existence is based on `src/App.jsx` route patterns plus generated tool inventory paths that match those patterns. Dynamic template-string links are marked external/dynamic unless a static prefix is recoverable.
- `working stub` means a route resolves to `FutureReleaseStub`; it is route-valid but not feature-complete.
- Tests are excluded from the layout/navigation inventory tables except where they are part of an explicit stale-test conflict.
- The canvas skill was considered, but the user requested this specific markdown file deliverable, so the artifact is saved as `LAYOUT_CONFLICT_MAP.md`.
