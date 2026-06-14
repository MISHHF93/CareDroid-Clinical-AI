# Orphan Detection Report

Generated: 2026-06-14 (regenerate with `npm run orphan-detection:write-docs`)

## Classification key

| Class | Meaning |
|-------|---------|
| **wire** | Reachable in product intent (nav/inventory) but missing route, import, or API contract |
| **merge** | Duplicate surface or overlapping module — consolidate |
| **quarantine** | No production consumer — archive or delete after review |
| **legacy** | Redirect, alias, gated stub, or deprecated path kept for compatibility |

## Executive summary

| Metric | Count |
|--------|------:|
| Total orphan findings | 651 |
| App.jsx routes | 139 |
| Orphan / gap routes | 123 |
| Orphan pages | 145 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 21 |
| Orphan services | 4 |
| Executor contract gaps | 0 |
| API orphans / stubs | 141 |
| Weakly linked markdown | 217 |
| **wire** | 188 |
| **merge** | 0 |
| **quarantine** | 192 |
| **legacy** | 271 |

## Merge candidates (explicit)

| ID | Primary | Duplicate | Note |
|----|---------|-----------|------|
| dashboard-dual-home | src/pages/CommandDashboard.jsx | removed: src/pages/Dashboard.jsx | Former assistant page duplicate removed; ED Copilot now lives in src/components/ChatInterface.jsx. |
| pack-marketplace-dual | src/pages/organization/OrganizationPages.jsx (PackMarketplace) | /asset-packs vs /settings/organization/packs | Intentional dual context: product discovery and organization entitlement management share PackMarketplace. |
| notification-services-dual | src/services/NotificationService.js | src/services/notifications/NotificationService.js | Nested service is legacy queue-style compatibility only; active app client is src/services/NotificationService.js. |

## Critical findings

1. **Simulation / lab / 3D workspace styles** — `SimulationLaboratoryViewer.css` is an intentional shared style module for active demo pages; no missing page component is required. Class: **legacy**.
2. **AI agents / platform APIs** — platform/product clients are represented in `frontendApiCallsInventory`; current scan has no **wire** findings.
3. **Chart/export components** — legacy barrel-only components have been removed; keep new chart surfaces route-owned. Class: **resolved**.
4. **Dual registry** — hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.

## Orphan routes

| Route | Class | Evidence |
| --- | --- | --- |
| /auth-callback | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /executive | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /discover | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /automation-audit | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /automation-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /operations-center | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /protocols | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /documentation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /knowledge-graph | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /predictive-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /clinical-decision-support | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /competencies | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /credentials | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /simulation/outcomes | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /3d-viewer | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /digital-twin-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /profile | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /profile/settings | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /profile/tool-preferences | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /knowledge-hub | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /knowledge-base | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /billing | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /usage | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /notifications | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /timeline | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /workflow-mining | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /workspace-dependency-graph | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /search | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /plugins | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /feature-flags | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /dependency-map | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /dependency-graph | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /data-lineage | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /self-diagnostics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /system-health | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /saas-health | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance-registry | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-governance | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /security | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /regulatory | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /human-review | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /artifacts | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-models | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-evaluation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-learning-engine | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /brain | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /business-brain | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /organization | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /organization-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tenant-admin/workspaces | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/packs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /department-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /departments | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /service-lines | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /products | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /asset-packs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /plans | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /specialties | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /care-pathways | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /agents | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /maturity-assessment | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /outcomes | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /value-tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /product-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /expansion-opportunities | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /customer-success | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /integration-readiness | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /solution-builder | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /configuration-studio | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /welcome | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /onboarding | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /notification-preferences | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /maps | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /live-tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /organization/ | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/ | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai/evaluation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /privacy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit-logs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/ai | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/phi | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/integrations | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/policy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /clinical-decision-support | wire | toolInventory route not registered in App.jsx |
| /competencies | wire | toolInventory route not registered in App.jsx |
| /credentials | wire | toolInventory route not registered in App.jsx |
| /simulation/outcomes | wire | toolInventory route not registered in App.jsx |
| /simulation/sepsis-deterioration | wire | toolInventory route not registered in App.jsx |
| /simulation/outcomes | wire | toolInventory route not registered in App.jsx |
| /simulation/sepsis-deterioration | wire | toolInventory route not registered in App.jsx |
| /integrations/fhir | wire | toolInventory route not registered in App.jsx |
| /integrations/hl7 | wire | toolInventory route not registered in App.jsx |
| /integrations/source-provenance | wire | toolInventory route not registered in App.jsx |
| /artifacts | wire | toolInventory route not registered in App.jsx |
| /ai-command-center | wire | toolInventory route not registered in App.jsx |
| /costs | wire | toolInventory route not registered in App.jsx |
| /ai-evaluation | wire | toolInventory route not registered in App.jsx |
| /ai-governance | wire | toolInventory route not registered in App.jsx |
| /ai-memory | wire | toolInventory route not registered in App.jsx |
| /audit/ai | wire | toolInventory route not registered in App.jsx |
| /training | wire | toolInventory route not registered in App.jsx |
| /audit | wire | toolInventory route not registered in App.jsx |
| /review | wire | toolInventory route not registered in App.jsx |
| /security | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /documentation | wire | toolInventory route not registered in App.jsx |
| /knowledge-graph | wire | toolInventory route not registered in App.jsx |
| /predictive-analytics | wire | toolInventory route not registered in App.jsx |
| /3d-viewer | wire | toolInventory route not registered in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /chat | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/AiCommandCenterDashboard.jsx | wire | import:src/pages/AiCommandCenterDashboard.jsx |
| src/pages/AiEvaluationDashboard.jsx | wire | import:src/pages/AiEvaluationDashboard.jsx |
| src/pages/AiModelsPage.jsx | legacy | import:AiModelsPage |
| src/pages/AnalyticsDashboard.jsx | legacy | import:src/pages/AnalyticsDashboard.jsx |
| src/pages/Artifacts.jsx | wire | import:src/pages/Artifacts.jsx |
| src/pages/Auth.jsx | legacy | import:src/pages/Auth.jsx |
| src/pages/AuthCallback.jsx | legacy | import:src/pages/AuthCallback.jsx |
| src/pages/AutomationAnalytics.jsx | legacy | import:AutomationAnalytics |
| src/pages/AutomationAuditTrail.jsx | legacy | import:AutomationAuditTrail |
| src/pages/BillingPage.jsx | legacy | import:BillingPage |
| src/pages/BiometricSetup.jsx | legacy | import:src/pages/BiometricSetup.jsx |
| src/pages/CapabilityDiscovery.jsx | legacy | import:CapabilityDiscovery |
| src/pages/CapacityDetail.jsx | legacy | import:CapacityDetail |
| src/pages/CareDroidBrainDashboard.jsx | legacy | import:CareDroidBrainDashboard |
| src/pages/ClinicalAlertsPage.jsx | legacy | import:src/pages/ClinicalAlertsPage.jsx |
| src/pages/ClinicalDecisionSupport.jsx | wire | import:src/pages/ClinicalDecisionSupport.jsx |
| src/pages/ClinicalDocumentationAssistant.jsx | wire | import:src/pages/ClinicalDocumentationAssistant.jsx |
| src/pages/ClinicalKnowledgeGraph.jsx | wire | import:src/pages/ClinicalKnowledgeGraph.jsx |
| src/pages/CommandDashboard.jsx | legacy | import:src/pages/CommandDashboard.jsx |
| src/pages/commercial/CommercialPages.jsx | legacy | import:src/pages/commercial/CommercialPages.jsx |
| src/pages/commercial/CommercialPageShell.jsx | legacy | import:CommercialPageShell |
| src/pages/Competencies.jsx | wire | import:src/pages/Competencies.jsx |
| src/pages/CostAnalyticsDashboard.jsx | wire | import:src/pages/CostAnalyticsDashboard.jsx |
| src/pages/Credentials.jsx | wire | import:src/pages/Credentials.jsx |
| src/pages/customer-portal/CustomerPortalPage.jsx | legacy | import:CustomerPortalPage |
| src/pages/DataLineageExplorer.jsx | legacy | import:DataLineageExplorer |
| src/pages/DependencyGraph.jsx | legacy | import:DependencyGraph |
| src/pages/DependencyMap.jsx | legacy | import:DependencyMap |
| src/pages/DeviceFleetManagement.jsx | wire | import:src/pages/DeviceFleetManagement.jsx |
| src/pages/DigitalOperationsCenter.jsx | legacy | import:DigitalOperationsCenter |
| src/pages/DigitalTwinIntelligence.jsx | legacy | import:DigitalTwinIntelligence |
| src/pages/emergency/ClinicalCalculatorHub.jsx | legacy | import:./pages/emergency/ClinicalCalculatorHub |
| src/pages/EnterpriseReadinessPage.jsx | legacy | import:EnterpriseReadinessPage |
| src/pages/ExecutiveCommandCenter.jsx | legacy | import:ExecutiveCommandCenter |
| src/pages/FeatureFlagCenter.jsx | legacy | import:FeatureFlagCenter |
| src/pages/fleet/FleetDashboard.jsx | wire | import:src/pages/fleet/FleetDashboard.jsx |
| src/pages/fleet/FleetDashboardWidgets.jsx | legacy | import:src/pages/fleet/FleetDashboardWidgets.jsx |
| src/pages/fleet/FleetLiveMap.jsx | wire | import:src/pages/fleet/FleetLiveMap.jsx |
| src/pages/fleet/FleetPageChrome.jsx | legacy | import:./pages/fleet/FleetPageChrome |
| src/pages/fleet/PredictiveMaintenance.jsx | wire | import:src/pages/fleet/PredictiveMaintenance.jsx |
| src/pages/fleet/PredictiveMaintenanceWidgets.jsx | legacy | import:PredictiveMaintenanceWidgets |
| src/pages/fleet/RouteOptimizer.jsx | wire | import:src/pages/fleet/RouteOptimizer.jsx |
| src/pages/fleet/RouteOptimizerWidgets.jsx | legacy | import:RouteOptimizerWidgets |
| src/pages/GDPRNotice.jsx | legacy | import:src/pages/GDPRNotice.jsx |
| src/pages/GovernanceRegistry.jsx | legacy | import:GovernanceRegistry |
| src/pages/HelpCenter.jsx | legacy | import:src/pages/HelpCenter.jsx |
| src/pages/HIPAANotice.jsx | legacy | import:src/pages/HIPAANotice.jsx |
| src/pages/HospitalMapDashboard.jsx | wire | import:src/pages/HospitalMapDashboard.jsx |
| src/pages/KnowledgeBasePage.jsx | legacy | import:KnowledgeBasePage |
| src/pages/LaboratoryDashboard.jsx | wire | import:src/pages/LaboratoryDashboard.jsx |
| src/pages/legal/ConsentFlow.jsx | legacy | import:src/pages/legal/ConsentFlow.jsx |
| src/pages/legal/ConsentHistory.jsx | legacy | import:src/pages/legal/ConsentHistory.jsx |
| src/pages/legal/index.js | legacy | import:index |
| src/pages/legal/PrivacyPolicy.jsx | legacy | import:src/pages/legal/PrivacyPolicy.jsx |
| src/pages/legal/TermsOfService.jsx | legacy | import:src/pages/legal/TermsOfService.jsx |
| src/pages/LiveTrackingMap.jsx | wire | import:src/pages/LiveTrackingMap.jsx |
| src/pages/MarketplacePage.jsx | legacy | import:MarketplacePage |
| src/pages/Medical3DViewer.jsx | wire | import:src/pages/Medical3DViewer.jsx |
| src/pages/MedicalIotDashboard.jsx | wire | import:src/pages/MedicalIotDashboard.jsx |
| src/pages/MedicalSimulationSuite.jsx | wire | import:src/pages/MedicalSimulationSuite.jsx |
| src/pages/MemoryDashboard.jsx | wire | import:src/pages/MemoryDashboard.jsx |
| src/pages/NotificationPreferences.jsx | legacy | import:src/pages/NotificationPreferences.jsx |
| src/pages/Operations.jsx | wire | import:src/pages/Operations.jsx |
| src/pages/organization/OrganizationPages.jsx | legacy | import:src/pages/organization/OrganizationPages.jsx |
| src/pages/Patients.jsx | legacy | import:src/pages/Patients.jsx |
| src/pages/platform/components/PlatformWorkflowPrimitives.jsx | legacy | import:PlatformWorkflowPrimitives |
| src/pages/platform/PlatformGovernanceWorkspace.jsx | wire | import:src/pages/platform/PlatformGovernanceWorkspace.jsx |
| src/pages/platform/PlatformSystemPage.jsx | wire | import:src/pages/platform/PlatformSystemPage.jsx |
| src/pages/PlatformAdminPage.jsx | legacy | import:PlatformAdminPage |
| src/pages/PlatformLearningEngine.jsx | legacy | import:PlatformLearningEngine |
| src/pages/PlatformOSPages.jsx | legacy | import:src/pages/PlatformOSPages |
| src/pages/PlatformSelfDiagnostics.jsx | legacy | import:PlatformSelfDiagnostics |
| src/pages/PluginMarketplace.jsx | legacy | import:PluginMarketplace |
| src/pages/PredictiveAnalyticsDashboard.jsx | wire | import:src/pages/PredictiveAnalyticsDashboard.jsx |
| src/pages/profile/ProfileActivity.jsx | legacy | import:src/pages/profile/ProfileActivity.jsx |
| src/pages/profile/ProfilePreferences.jsx | legacy | import:ProfilePreferences |
| src/pages/profile/ProfileSecurity.jsx | legacy | import:src/pages/profile/ProfileSecurity.jsx |
| src/pages/profile/ProfileToolPreferences.jsx | legacy | import:ProfileToolPreferences |
| src/pages/profile/ProfileWorkspaces.jsx | legacy | import:src/pages/profile/ProfileWorkspaces.jsx |
| src/pages/Profile.jsx | legacy | import:src/pages/Profile.jsx |
| src/pages/ProfileSettings.jsx | legacy | import:src/pages/ProfileSettings.jsx |
| src/pages/RecommendationsPage.jsx | legacy | import:RecommendationsPage |
| src/pages/ResearchEvidenceHub.jsx | wire | import:src/pages/ResearchEvidenceHub.jsx |
| src/pages/SaasHealthCenter.jsx | legacy | import:SaasHealthCenter |
| src/pages/settings/FeatureManagement.jsx | legacy | import:FeatureManagement |
| src/pages/Settings.jsx | legacy | import:src/pages/Settings.jsx |
| src/pages/ShiftSummary.jsx | legacy | import:ShiftSummary |
| src/pages/SimulationOutcomes.jsx | wire | import:src/pages/SimulationOutcomes.jsx |
| src/pages/SimulationScenarioPlayer.jsx | wire | import:src/pages/SimulationScenarioPlayer.jsx |
| src/pages/success-center/SuccessCenterPage.jsx | legacy | import:SuccessCenterPage |
| src/pages/SystemHealth.jsx | legacy | import:SystemHealth |
| src/pages/team/index.js | legacy | import:index |
| src/pages/team/TeamManagement.jsx | legacy | import:src/pages/team/TeamManagement.jsx |
| src/pages/tools/abcd2Calculator.jsx | legacy | import:abcd2Calculator |
| src/pages/tools/AiExplainability.jsx | wire | import:src/pages/tools/AiExplainability.jsx |
| src/pages/tools/AmbientScribe.jsx | wire | import:src/pages/tools/AmbientScribe.jsx |
| src/pages/tools/calculatorPrimitives.jsx | legacy | import:calculatorPrimitives |
| src/pages/tools/CalculatorRecommender.jsx | wire | import:src/pages/tools/CalculatorRecommender.jsx |
| src/pages/tools/Calculators.jsx | legacy | import:src/pages/tools/Calculators.jsx |
| src/pages/tools/CardiologyAssistantPage.jsx | wire | import:src/pages/tools/CardiologyAssistantPage.jsx |
| src/pages/tools/cardiologyCalculators.jsx | legacy | import:cardiologyCalculators |
| src/pages/tools/ClinicalAudit.jsx | wire | import:src/pages/tools/ClinicalAudit.jsx |
| src/pages/tools/ClinicalToolCatalog.jsx | wire | import:src/pages/tools/ClinicalToolCatalog.jsx |
| src/pages/tools/DiagnosisAssistant.jsx | wire | import:src/pages/tools/DiagnosisAssistant.jsx |
| src/pages/tools/DifferentialAi.jsx | wire | import:src/pages/tools/DifferentialAi.jsx |
| src/pages/tools/DrugChecker.jsx | wire | import:src/pages/tools/DrugChecker.jsx |
| src/pages/tools/emergencyCriticalCareCalculators.jsx | legacy | import:emergencyCriticalCareCalculators |
| src/pages/tools/EndocrineMetabolicAssistantPage.jsx | wire | import:src/pages/tools/EndocrineMetabolicAssistantPage.jsx |
| src/pages/tools/endocrineMetabolicCalculators.jsx | legacy | import:endocrineMetabolicCalculators |
| src/pages/tools/GastroenterologyAssistantPage.jsx | wire | import:src/pages/tools/GastroenterologyAssistantPage.jsx |
| src/pages/tools/GuidelineRag.jsx | wire | import:src/pages/tools/GuidelineRag.jsx |
| src/pages/tools/hepatologyGiCalculators.jsx | legacy | import:hepatologyGiCalculators |
| src/pages/tools/hospitalOperationsCalculators.jsx | legacy | import:hospitalOperationsCalculators |
| src/pages/tools/LabInterpreter.jsx | wire | import:src/pages/tools/LabInterpreter.jsx |
| src/pages/tools/mentalHealthCalculators.jsx | legacy | import:src/pages/tools/mentalHealthCalculators.jsx |
| src/pages/tools/NephrologyAssistantPage.jsx | wire | import:src/pages/tools/NephrologyAssistantPage.jsx |
| src/pages/tools/nephrologyCalculators.jsx | legacy | import:nephrologyCalculators |
| src/pages/tools/NeurologyAssistantPage.jsx | wire | import:src/pages/tools/NeurologyAssistantPage.jsx |
| src/pages/tools/neurologyCalculators.jsx | legacy | import:neurologyCalculators |
| src/pages/tools/nextWaveCalculators.jsx | legacy | import:nextWaveCalculators |
| src/pages/tools/OrderSetAi.jsx | wire | import:src/pages/tools/OrderSetAi.jsx |
| src/pages/tools/PatientSummaryAi.jsx | wire | import:src/pages/tools/PatientSummaryAi.jsx |
| src/pages/tools/PediatricsObgynAssistantPage.jsx | wire | import:src/pages/tools/PediatricsObgynAssistantPage.jsx |
| src/pages/tools/pediatricsObgynCalculators.jsx | legacy | import:pediatricsObgynCalculators |
| src/pages/tools/pr4aCalculators.jsx | legacy | import:src/pages/tools/pr4aCalculators.jsx |
| src/pages/tools/pr8ClinicalBatchCalculators.jsx | legacy | import:pr8ClinicalBatchCalculators |
| src/pages/tools/ProcedureGuide.jsx | wire | import:src/pages/tools/ProcedureGuide.jsx |
| src/pages/tools/Protocols.jsx | wire | import:src/pages/tools/Protocols.jsx |
| src/pages/tools/PsychiatryAssistantPage.jsx | wire | import:src/pages/tools/PsychiatryAssistantPage.jsx |
| src/pages/tools/psychiatryScreeningCalculators.jsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/PulmonologyAssistantPage.jsx | wire | import:src/pages/tools/PulmonologyAssistantPage.jsx |
| src/pages/tools/pulmonologyCalculators.jsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/SharedToolSession.jsx | legacy | import:src/pages/tools/SharedToolSession.jsx |
| src/pages/tools/sourceBackedClinicalCalculators.jsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/TimelineAi.jsx | wire | import:src/pages/tools/TimelineAi.jsx |
| src/pages/tools/ToolNotFound.jsx | legacy | import:./pages/tools/ToolNotFound |
| src/pages/tools/ToolPageLayout.jsx | legacy | import:src/pages/tools/ToolPageLayout.jsx |
| src/pages/tools/ToolsAreaFallback.jsx | legacy | import:ToolsAreaFallback |
| src/pages/TrainingDashboard.jsx | wire | import:src/pages/TrainingDashboard.jsx |
| src/pages/TwoFactorSetup.jsx | legacy | import:src/pages/TwoFactorSetup.jsx |
| src/pages/UsagePage.jsx | legacy | import:UsagePage |
| src/pages/Version.jsx | legacy | import:Version |
| src/pages/Welcome.jsx | legacy | import:Welcome |
| src/pages/WorkflowAutomationBuilder.jsx | legacy | import:WorkflowAutomationBuilder |
| src/pages/WorkspaceHome.jsx | legacy | import:src/pages/WorkspaceHome |

## Orphan components

_None detected._

## Dashboards

_None detected._

## Simulations

_None detected._

## Laboratory modules

| Module | Class | Evidence |
| --- | --- | --- |
| src/pages/LaboratoryDashboard.jsx | wire | import:src/pages/LaboratoryDashboard.jsx |
| src/pages/tools/LabInterpreter.jsx | wire | import:src/pages/tools/LabInterpreter.jsx |

## 3D viewer code

_None detected._

## Orphan services

| Service | Class | Evidence |
| --- | --- | --- |
| src/services/boardingApi.js | quarantine | No production import of service module |
| src/services/emergencyCopilotApi.js | quarantine | No production import of service module |
| src/services/reassessmentApi.js | quarantine | No production import of service module |
| src/services/surgeApi.js | quarantine | No production import of service module |

## Orphan executors

_None detected._

## Orphan APIs

| API | Class | Evidence |
| --- | --- | --- |
| chat-messages-sync | legacy | Gated stub — intentional no-op until backend exists |
| chat-conversations-sync | legacy | Gated stub — intentional no-op until backend exists |
| tools-share-results | legacy | Gated stub — intentional no-op until backend exists |
| notifications-stream | legacy | Gated stub — intentional no-op until backend exists |
| notifications-send-channel | legacy | Gated stub — intentional no-op until backend exists |
| team-users | legacy | Gated stub — intentional no-op until backend exists |
| team-user-update | legacy | Gated stub — intentional no-op until backend exists |
| team-user-delete | legacy | Gated stub — intentional no-op until backend exists |
| team-invite | legacy | Gated stub — intentional no-op until backend exists |
| bulk-sync | legacy | Gated stub — intentional no-op until backend exists |
| clinical-alerts-stream | legacy | Gated stub — intentional no-op until backend exists |
| emergency-capacity-history | legacy | Gated stub — intentional no-op until backend exists |
| emergency-queue-analytics | legacy | Gated stub — intentional no-op until backend exists |
| emergency-shift-report-export | legacy | Gated stub — intentional no-op until backend exists |
| emergency-referral-history | legacy | Gated stub — intentional no-op until backend exists |
| emergency-transfer-status | legacy | Gated stub — intentional no-op until backend exists |
| emergency-diversion-status | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-session-create | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-manual-entry | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-document | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-ocr | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-match | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-verify-field | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-link-patient | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-create-patient | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-continue-unknown | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-ems-evidence | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-reconcile-unknown | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-biometric-consent | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-biometric-consent-withdraw | legacy | Gated stub — intentional no-op until backend exists |
| emergency-smart-intake-audit-log | legacy | Gated stub — intentional no-op until backend exists |
| exports-pdf | legacy | Gated stub — intentional no-op until backend exists |
| exports-excel | legacy | Gated stub — intentional no-op until backend exists |
| reports-generate | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub — intentional no-op until backend exists |
| GET /api/emergency/patients/:patientId/workflow-logs | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/digital-twin/organizational/simulate | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/digital-twin/organizational/synchronize | legacy | Backend-only route (no SPA client) |
| POST /api/ems/ai-call-interrogation | legacy | Backend-only route (no SPA client) |
| POST /api/ems/ai-call-interrogation/ecg | legacy | Backend-only route (no SPA client) |
| POST /api/ems/federated/112-call | legacy | Backend-only route (no SPA client) |
| POST /api/federated/lmecs/predict | legacy | Backend-only route (no SPA client) |
| POST /api/federated/lmecs/select | legacy | Backend-only route (no SPA client) |
| POST /api/handover/er-pulse | legacy | Backend-only route (no SPA client) |
| GET /api/auth/verify-email | legacy | Backend-only route (no SPA client) |
| GET /api/auth/google | legacy | Backend-only route (no SPA client) |
| GET /api/auth/google/callback | legacy | Backend-only route (no SPA client) |
| GET /api/auth/linkedin | legacy | Backend-only route (no SPA client) |
| GET /api/auth/linkedin/callback | legacy | Backend-only route (no SPA client) |
| GET /api/auth/oidc | legacy | Backend-only route (no SPA client) |
| GET /api/auth/saml | legacy | Backend-only route (no SPA client) |
| GET /api/auth/me | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId/members | legacy | Backend-only route (no SPA client) |
| POST /api/workspaces/:workspaceId/invitations | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces/:workspaceId/tools | legacy | Backend-only route (no SPA client) |
| PATCH /api/workspaces/:workspaceId/tools | legacy | Backend-only route (no SPA client) |
| GET /api/organizations | legacy | Backend-only route (no SPA client) |
| POST /api/organizations | legacy | Backend-only route (no SPA client) |
| GET /api/organizations/:organizationId | legacy | Backend-only route (no SPA client) |
| PATCH /api/organizations/:organizationId | legacy | Backend-only route (no SPA client) |
| GET /api/organizations/current | legacy | Backend-only route (no SPA client) |
| POST /api/organizations/onboarding | legacy | Backend-only route (no SPA client) |
| GET /api/specialties/:slug/assets | legacy | Backend-only route (no SPA client) |
| GET /api/maturity-assessments/questionnaire | legacy | Backend-only route (no SPA client) |
| POST /api/maturity-assessments | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/pinned-assets | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/hidden-assets | legacy | Backend-only route (no SPA client) |
| GET /api/platform/assets/:assetId | legacy | Backend-only route (no SPA client) |
| GET /api/platform/packs/:packId | legacy | Backend-only route (no SPA client) |
| GET /api/platform/role-profiles/:id | legacy | Backend-only route (no SPA client) |
| GET /api/platform/organizations/:organizationId/entitlements | legacy | Backend-only route (no SPA client) |
| POST /api/platform/organizations/:organizationId/packs/:packId/install | legacy | Backend-only route (no SPA client) |
| POST /api/platform/organizations/:organizationId/packs/:packId/remove | legacy | Backend-only route (no SPA client) |
| GET /api/activity/me | legacy | Backend-only route (no SPA client) |
| GET /api/activity/me/summary | legacy | Backend-only route (no SPA client) |
| GET /api/activity/workspaces/:workspaceId | legacy | Backend-only route (no SPA client) |
| GET /api/personalization/me/recommendations | legacy | Backend-only route (no SPA client) |
| DELETE /api/personalization/me/saved-prompts/:promptId | legacy | Backend-only route (no SPA client) |
| POST /api/artifacts | legacy | Backend-only route (no SPA client) |
| GET /api/artifacts/:id | legacy | Backend-only route (no SPA client) |
| PATCH /api/artifacts/:id | legacy | Backend-only route (no SPA client) |
| GET /api/memory/short | legacy | Backend-only route (no SPA client) |
| GET /api/memory/long | legacy | Backend-only route (no SPA client) |
| GET /api/memory/clinical | legacy | Backend-only route (no SPA client) |
| POST /api/two-factor/verify | legacy | Backend-only route (no SPA client) |
| GET /api/subscriptions/config | legacy | Backend-only route (no SPA client) |
| POST /api/subscriptions/webhook | legacy | Backend-only route (no SPA client) |
| POST /api/chat/message-3d | legacy | Backend-only route (no SPA client) |
| GET /api/patients | legacy | Backend-only route (no SPA client) |
| GET /api/patients/:patientId | legacy | Backend-only route (no SPA client) |
| POST /api/patients | legacy | Backend-only route (no SPA client) |
| PATCH /api/patients/:patientId | legacy | Backend-only route (no SPA client) |
| GET /api/staff | legacy | Backend-only route (no SPA client) |
| GET /api/rooms | legacy | Backend-only route (no SPA client) |
| GET /api/shift | legacy | Backend-only route (no SPA client) |
| GET /api/ems | legacy | Backend-only route (no SPA client) |
| GET /api/referrals | legacy | Backend-only route (no SPA client) |
| POST /api/referrals | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/registry | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/safety-rules | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/compliance | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/violations | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/validate-prompts | legacy | Backend-only route (no SPA client) |
| POST /api/interoperability/events | legacy | Backend-only route (no SPA client) |
| GET /api/interoperability/events | legacy | Backend-only route (no SPA client) |
| GET /api/interoperability/events/:id | legacy | Backend-only route (no SPA client) |
| POST /api/tools/execute | legacy | Backend-only route (no SPA client) |
| POST /api/tool-calling/execute | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/catalog | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/resolve | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/logs | legacy | Backend-only route (no SPA client) |
| POST /api/cost-optimizer/route | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/metrics | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/runs | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/pinned-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/users/me/hidden-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/assets/:assetId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/packs/:packId | legacy | Platform/product API is deferred and not frontend-inventory wired |

_… and 21 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/action-driven-emergency-ux.md | quarantine | No inbound links from README, src, or other docs |
| docs/ai-agent-registry-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/ai-memory-fabric-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/adaptive-layout-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/advanced-emergency-os-capabilities.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-configuration-inventory.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-consolidation-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-governance-validation.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/ai-harmonization-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-route-and-service-map.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-safety-policy.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/ai-usage-company-structure.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/api-client-alignment-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/api-surface-compression.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/appshell-final-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/artifact-consolidation-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/backend-frontend-api-harmonization.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/backend-frontend-route-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/backend-frontend-traceability-map.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/blocking-conflicts-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/button-clickability-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/caredroid-emergency-os-final-readiness.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/central-node-architecture.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/central-node-final-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/central-node-inventory.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/central-node-wiring-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/central-operational-snapshot-contract.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/clickability-validation-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/cognitive-load-destruction.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/command-center-normalization.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/complete-implementation-safe-slice-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/component-mounting-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/component-style-normalization-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/component-visual-consistency-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/current-ai-configuration-inventory.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/current-integration-inventory.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/dark-mode-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/data-return-chain-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/design-system-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/design-system-specification.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/design-token-application-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/desktop-ultrawide-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/disconnected-code-after-refactor.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/disconnected-ed-scenarios.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/disconnected-inventory-after-wiring.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/ed-scenario-coverage-audit.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/ed-scenario-source-code-map.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/emergency-os-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/emergency-os-convergence-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/emergency-os-e2e-trace-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/event-system-wiring.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/extreme-hardening-roadmap.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/feature-flag-settings-normalization-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/final-flattening-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/final-reconciliation-validation.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/first-customer-demo-mode.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/first-customer-walkthrough-validation.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/flashpoint-final-convergence.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/frontend-backend-alignment-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/frontend-backend-connection-report.md | legacy | No inbound links from README, src, or other docs |

_… and 157 more doc files._

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.js`

