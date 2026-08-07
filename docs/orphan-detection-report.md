# Orphan Detection Report

Generated: 2026-08-07 (regenerate with `npm run orphan-detection:write-docs`)

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
| Total orphan findings | 432 |
| App.jsx routes | 269 |
| Orphan / gap routes | 125 |
| Orphan pages | 149 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 20 |
| Orphan services | 0 |
| Executor contract gaps | 0 |
| API orphans / stubs | 127 |
| Weakly linked markdown | 11 |
| **wire** | 165 |
| **merge** | 0 |
| **quarantine** | 0 |
| **legacy** | 267 |

## Merge candidates (explicit)

| ID | Primary | Duplicate | Note |
|----|---------|-----------|------|
| dashboard-dual-home | src/pages/CommandDashboard.jsx | removed: src/pages/Dashboard.jsx | Former assistant page duplicate removed; ED Copilot now lives in src/components/CopilotPanel.tsx (ChatInterface.tsx superseded it and was itself removed as dead code, 2026-07-17). |
| pack-marketplace-dual | src/pages/organization/OrganizationPages.jsx (PackMarketplace) | /asset-packs vs /settings/organization/packs | Intentional dual context: product discovery and organization entitlement management share PackMarketplace. |
| notification-services-dual | src/services/NotificationService.ts | src/test/fixtures/legacyNotificationService.ts | Legacy queue-style client moved to test fixtures; active app client is src/services/NotificationService.ts. |

## Critical findings

1. **Simulation / lab / 3D workspace styles** — `SimulationLaboratoryViewer.css` is an intentional shared style module for active demo pages; no missing page component is required. Class: **legacy**.
2. **AI agents / platform APIs** — platform/product clients are represented in `frontendApiCallsInventory`; current scan has no **wire** findings.
3. **Chart/export components** — legacy barrel-only components have been removed; keep new chart surfaces route-owned. Class: **resolved**.
4. **Dual registry** — hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.

## Orphan routes

| Route | Class | Evidence |
| --- | --- | --- |
| /auth | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth-callback | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/forgot-password | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/magic-link | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/invite | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /reset-password | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /verify-email | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /intake | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /alerts | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-chief | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /executive | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /automation-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /assistant | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-command-center | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /workspaces | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /operations-center | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /predictive-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /surveillance/nexus | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /digital-twin-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /customer-portal | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /marketplace | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /enterprise-readiness | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /trackmind | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /trackmind-maturity | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /enterprise-platform | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-admin | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /notifications | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /timeline | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /system-health | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-governance | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /security | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /regulatory | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /human-review | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /training | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-models | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-learning-engine | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /brain | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tenant-admin | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tenant-admin/workspaces | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/packs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /departments | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /service-lines | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /products | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /asset-packs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /plans | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /specialties | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /care-pathways | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /agents | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /outcomes | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /value-tracking | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /customer-success | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /success-center | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /integrations-marketplace | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /integration-readiness | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /solution-builder | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /configuration-studio | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /welcome | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /organization/ | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/ | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai/evaluation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/ai | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/model-usage | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/costs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/clinical-safety | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/consent | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/privacy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /privacy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/ai-security | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/ai-security/policy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/ai-security/model-access | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/ai-security/incidents | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit-logs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/ai | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/phi | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/integrations | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/policy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/regulatory | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/regulatory/capabilities | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/regulatory/intended-use | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance/regulatory/evidence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /assistant | wire | toolInventory route not registered in App.jsx |
| /governance/clinical | wire | toolInventory route not registered in App.jsx |
| /governance/clinical/release-gates | wire | toolInventory route not registered in App.jsx |
| /governance/clinical-safety | wire | toolInventory route not registered in App.jsx |
| /governance/clinical/safety-findings | wire | toolInventory route not registered in App.jsx |
| /governance/consent | wire | toolInventory route not registered in App.jsx |
| /governance/costs | wire | toolInventory route not registered in App.jsx |
| /governance/model-usage | wire | toolInventory route not registered in App.jsx |
| /governance/privacy | wire | toolInventory route not registered in App.jsx |
| /integrations/fhir | wire | toolInventory route not registered in App.jsx |
| /integrations/hl7 | wire | toolInventory route not registered in App.jsx |
| /integrations/source-provenance | wire | toolInventory route not registered in App.jsx |
| /ai-command-center | wire | toolInventory route not registered in App.jsx |
| /assistant | wire | toolInventory route not registered in App.jsx |
| /ai-governance | wire | toolInventory route not registered in App.jsx |
| /audit/ai | wire | toolInventory route not registered in App.jsx |
| /assistant | wire | toolInventory route not registered in App.jsx |
| /training | wire | toolInventory route not registered in App.jsx |
| /audit | wire | toolInventory route not registered in App.jsx |
| /governance/equity/findings | wire | toolInventory route not registered in App.jsx |
| /governance/equity | wire | toolInventory route not registered in App.jsx |
| /review | wire | toolInventory route not registered in App.jsx |
| /governance/regulatory/intended-use | wire | toolInventory route not registered in App.jsx |
| /security | wire | toolInventory route not registered in App.jsx |
| /governance/ai-security/model-access | wire | toolInventory route not registered in App.jsx |
| /assistant | wire | toolInventory route not registered in App.jsx |
| /governance/ai-security/prompt-firewall | wire | toolInventory route not registered in App.jsx |
| /governance/regulatory | wire | toolInventory route not registered in App.jsx |
| /governance/validation/synthetic-patients | wire | toolInventory route not registered in App.jsx |
| /governance/validation | wire | toolInventory route not registered in App.jsx |
| /assistant | wire | toolInventory route not registered in App.jsx |
| /predictive-analytics | wire | toolInventory route not registered in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /medical-simulation | legacy | Redirect or alias route in App.jsx |
| /anatomy-viewer | legacy | Redirect or alias route in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /laboratory/* | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/admin/AdminOperationsHome.tsx | legacy | import:./pages/admin/AdminOperationsHome |
| src/pages/admin/EdStaffWorkflowAdmin.tsx | legacy | import:src/pages/admin/EdStaffWorkflowAdmin |
| src/pages/ai/AiCommandCenterDashboard.tsx | legacy | import:AiCommandCenterDashboard |
| src/pages/ai/AiEvaluationDashboard.tsx | legacy | import:./pages/ai/AiEvaluationDashboard |
| src/pages/ai/CostAnalyticsDashboard.tsx | legacy | import:./pages/ai/CostAnalyticsDashboard |
| src/pages/ai/MemoryDashboard.tsx | legacy | import:./pages/ai/MemoryDashboard |
| src/pages/analytics/AnalyticsDashboard.tsx | legacy | import:./pages/analytics/AnalyticsDashboard |
| src/pages/analytics/PredictiveAnalyticsDashboard.tsx | legacy | import:PredictiveAnalyticsDashboard |
| src/pages/AppNavigator.tsx | legacy | import:./pages/AppNavigator |
| src/pages/AutomationAuditTrail.tsx | legacy | import:./pages/AutomationAuditTrail |
| src/pages/BillingPage.tsx | legacy | import:./pages/BillingPage |
| src/pages/clinical/ClinicalDecisionSupport.tsx | legacy | import:./pages/clinical/ClinicalDecisionSupport |
| src/pages/clinical/ClinicalKnowledgeGraph.tsx | legacy | import:./pages/clinical/ClinicalKnowledgeGraph |
| src/pages/clinical/LaboratoryDashboard.tsx | legacy | import:./pages/clinical/LaboratoryDashboard |
| src/pages/clinical/Medical3DViewer.tsx | legacy | import:./pages/clinical/Medical3DViewer |
| src/pages/clinical/ResearchEvidenceHub.tsx | legacy | import:./pages/clinical/ResearchEvidenceHub |
| src/pages/ClinicalAlertsPage.tsx | legacy | import:src/pages/ClinicalAlertsPage.tsx |
| src/pages/ClinicalDocumentationAssistant.tsx | wire | import:src/pages/ClinicalDocumentationAssistant.tsx |
| src/pages/collaboration/CollaborationHub.tsx | legacy | import:./pages/collaboration/CollaborationHub |
| src/pages/commercial/CommercialPages.tsx | legacy | import:src/pages/commercial/CommercialPages |
| src/pages/commercial/CommercialPageShell.tsx | legacy | import:CommercialPageShell |
| src/pages/commercial/ExpansionOpportunities.tsx | legacy | import:./pages/commercial/ExpansionOpportunities |
| src/pages/commercial/MaturityAssessment.tsx | legacy | import:./pages/commercial/MaturityAssessment |
| src/pages/commercial/ProductIntelligence.tsx | legacy | import:./pages/commercial/ProductIntelligence |
| src/pages/emergency/DispatchConsole.tsx | legacy | import:src/pages/emergency/DispatchConsole.tsx |
| src/pages/emergency/EmergencyAnalytics.tsx | legacy | import:src/pages/emergency/EmergencyAnalytics |
| src/pages/emergency/emergencyRoutePages.tsx | legacy | import:src/pages/emergency/emergencyRoutePages |
| src/pages/emergency/emergencyRouteShared.tsx | legacy | import:src/pages/emergency/emergencyRouteShared |
| src/pages/emergency/EmergencySettings.tsx | legacy | import:./pages/emergency/EmergencySettings |
| src/pages/emergency/EmergencySurfaceRedirect.tsx | legacy | import:./pages/emergency/EmergencySurfaceRedirect |
| src/pages/emergency/FullJourneyOperatingPage.tsx | legacy | import:src/pages/emergency/FullJourneyOperatingPage.tsx |
| src/pages/emergency/HelpHubPage.tsx | legacy | import:./pages/emergency/HelpHubPage |
| src/pages/emergency/HospitalCommandCenter.tsx | legacy | import:src/pages/emergency/HospitalCommandCenter.tsx |
| src/pages/emergency/index.tsx | legacy | import:src/pages/emergency/index |
| src/pages/emergency/PatientRoomDisplay.tsx | legacy | import:src/pages/emergency/PatientRoomDisplay |
| src/pages/emergency/pulse/index.tsx | legacy | import:index |
| src/pages/emergency/ReceptionWorkspace.tsx | legacy | import:src/pages/emergency/ReceptionWorkspace.tsx |
| src/pages/emergency/SelfArrivalCheckIn.tsx | legacy | import:src/pages/emergency/SelfArrivalCheckIn.tsx |
| src/pages/emergency/shift/index.tsx | legacy | import:index |
| src/pages/emergency/shift/shiftSummaryData.ts | legacy | import:shiftSummaryData |
| src/pages/emergency/SmartIntake.tsx | legacy | import:src/pages/emergency/SmartIntake |
| src/pages/executive/CommandDashboard.tsx | legacy | import:src/pages/executive/CommandDashboard.tsx |
| src/pages/executive/ExecutiveCommandCenter.tsx | legacy | import:src/pages/executive/ExecutiveCommandCenter.tsx |
| src/pages/fleet/FleetDashboard.tsx | wire | import:src/pages/fleet/FleetDashboard.tsx |
| src/pages/fleet/FleetLiveMap.tsx | legacy | import:src/pages/fleet/FleetLiveMap |
| src/pages/fleet/PredictiveMaintenance.tsx | legacy | import:src/pages/fleet/PredictiveMaintenance.tsx |
| src/pages/fleet/RouteOptimizer.tsx | legacy | import:src/pages/fleet/RouteOptimizer.tsx |
| src/pages/GDPRNotice.tsx | legacy | import:src/pages/GDPRNotice.tsx |
| src/pages/governance/Artifacts.tsx | legacy | import:./pages/governance/Artifacts |
| src/pages/governance/DataLineageExplorer.tsx | legacy | import:./pages/governance/DataLineageExplorer |
| src/pages/governance/DependencyGraph.tsx | legacy | import:./pages/governance/DependencyGraph |
| src/pages/governance/DependencyMap.tsx | legacy | import:./pages/governance/DependencyMap |
| src/pages/governance/GovernanceRegistry.tsx | legacy | import:./pages/governance/GovernanceRegistry |
| src/pages/HelpCenter.tsx | legacy | import:src/pages/HelpCenter.tsx |
| src/pages/HIPAANotice.tsx | legacy | import:src/pages/HIPAANotice.tsx |
| src/pages/integrations/IntegrationHubPage.tsx | legacy | import:./pages/integrations/IntegrationHubPage |
| src/pages/legal/ConsentFlow.tsx | legacy | import:src/pages/legal/ConsentFlow.tsx |
| src/pages/legal/ConsentHistory.tsx | legacy | import:src/pages/legal/ConsentHistory.tsx |
| src/pages/legal/index.ts | legacy | import:index |
| src/pages/legal/PrivacyPolicy.tsx | legacy | import:src/pages/legal/PrivacyPolicy.tsx |
| src/pages/legal/TermsOfService.tsx | legacy | import:src/pages/legal/TermsOfService.tsx |
| src/pages/NotificationPreferences.tsx | legacy | import:src/pages/NotificationPreferences.tsx |
| src/pages/operations/DeviceFleetManagement.tsx | legacy | import:./pages/operations/DeviceFleetManagement |
| src/pages/operations/HospitalMapDashboard.tsx | legacy | import:./pages/operations/HospitalMapDashboard |
| src/pages/operations/LiveTrackingMap.tsx | legacy | import:./pages/operations/LiveTrackingMap |
| src/pages/operations/MedicalIotDashboard.tsx | legacy | import:./pages/operations/MedicalIotDashboard |
| src/pages/operations/Operations.tsx | legacy | import:./pages/operations/Operations |
| src/pages/organization/OrganizationPages.tsx | legacy | import:src/pages/organization/OrganizationPages |
| src/pages/platform/BusinessBrain.tsx | legacy | import:./pages/platform/BusinessBrain |
| src/pages/platform/DepartmentIntelligence.tsx | legacy | import:./pages/platform/DepartmentIntelligence |
| src/pages/platform/HealthcareKnowledgeHub.tsx | legacy | import:./pages/platform/HealthcareKnowledgeHub |
| src/pages/platform/PlatformGovernanceWorkspace.tsx | wire | import:src/pages/platform/PlatformGovernanceWorkspace.tsx |
| src/pages/platform/PlatformSelfDiagnostics.tsx | legacy | import:./pages/platform/PlatformSelfDiagnostics |
| src/pages/platform/PlatformSystemPage.tsx | wire | import:src/pages/platform/PlatformSystemPage.tsx |
| src/pages/platform/WorkflowBuilder.tsx | legacy | import:./pages/platform/WorkflowBuilder |
| src/pages/platform/WorkflowMiningEngine.tsx | legacy | import:./pages/platform/WorkflowMiningEngine |
| src/pages/platform/WorkspaceDependencyGraph.tsx | legacy | import:./pages/platform/WorkspaceDependencyGraph |
| src/pages/PlatformEntryHub.tsx | legacy | import:./pages/PlatformEntryHub |
| src/pages/profile/ProfileActivity.tsx | legacy | import:src/pages/profile/ProfileActivity.tsx |
| src/pages/profile/ProfilePreferences.tsx | legacy | import:./pages/profile/ProfilePreferences |
| src/pages/profile/ProfileSecurity.tsx | legacy | import:src/pages/profile/ProfileSecurity.tsx |
| src/pages/profile/ProfileToolPreferences.tsx | legacy | import:./pages/profile/ProfileToolPreferences |
| src/pages/profile/ProfileWorkspaces.tsx | legacy | import:src/pages/profile/ProfileWorkspaces.tsx |
| src/pages/Profile.tsx | legacy | import:src/pages/Profile.tsx |
| src/pages/ProfileSettings.tsx | legacy | import:src/pages/ProfileSettings.tsx |
| src/pages/saas/CapabilityDiscovery.tsx | legacy | import:./pages/saas/CapabilityDiscovery |
| src/pages/saas/FeatureFlagCenter.tsx | legacy | import:./pages/saas/FeatureFlagCenter |
| src/pages/saas/PluginMarketplace.tsx | legacy | import:./pages/saas/PluginMarketplace |
| src/pages/saas/SaasHealthCenter.tsx | legacy | import:./pages/saas/SaasHealthCenter |
| src/pages/Settings.tsx | legacy | import:src/pages/Settings.tsx |
| src/pages/SystemHealth.tsx | legacy | import:./pages/SystemHealth |
| src/pages/team/index.ts | legacy | import:index |
| src/pages/team/TeamManagement.tsx | legacy | import:src/pages/team/TeamManagement.tsx |
| src/pages/tools/abcd2Calculator.tsx | legacy | import:abcd2Calculator |
| src/pages/tools/AiExplainability.tsx | wire | import:src/pages/tools/AiExplainability.tsx |
| src/pages/tools/AmbientScribe.tsx | wire | import:src/pages/tools/AmbientScribe.tsx |
| src/pages/tools/calculatorPrimitives.tsx | legacy | import:calculatorPrimitives |
| src/pages/tools/CalculatorRecommender.tsx | wire | import:src/pages/tools/CalculatorRecommender.tsx |
| src/pages/tools/Calculators.tsx | legacy | import:src/pages/tools/Calculators.tsx |
| src/pages/tools/CardiologyAssistantPage.tsx | wire | import:src/pages/tools/CardiologyAssistantPage.tsx |
| src/pages/tools/cardiologyCalculators.tsx | legacy | import:cardiologyCalculators |
| src/pages/tools/ClinicalAudit.tsx | wire | import:src/pages/tools/ClinicalAudit.tsx |
| src/pages/tools/ClinicalToolCatalog.tsx | wire | import:src/pages/tools/ClinicalToolCatalog.tsx |
| src/pages/tools/DiagnosisAssistant.tsx | wire | import:src/pages/tools/DiagnosisAssistant.tsx |
| src/pages/tools/DifferentialAi.tsx | wire | import:src/pages/tools/DifferentialAi.tsx |
| src/pages/tools/DrugChecker.tsx | wire | import:src/pages/tools/DrugChecker.tsx |
| src/pages/tools/emergencyCriticalCareCalculators.tsx | legacy | import:emergencyCriticalCareCalculators |
| src/pages/tools/EndocrineMetabolicAssistantPage.tsx | wire | import:src/pages/tools/EndocrineMetabolicAssistantPage.tsx |
| src/pages/tools/endocrineMetabolicCalculators.tsx | legacy | import:endocrineMetabolicCalculators |
| src/pages/tools/GastroenterologyAssistantPage.tsx | wire | import:src/pages/tools/GastroenterologyAssistantPage.tsx |
| src/pages/tools/GuidelineRag.tsx | wire | import:src/pages/tools/GuidelineRag.tsx |
| src/pages/tools/hepatologyGiCalculators.tsx | legacy | import:hepatologyGiCalculators |
| src/pages/tools/hospitalOperationsCalculators.tsx | legacy | import:hospitalOperationsCalculators |
| src/pages/tools/LabInterpreter.tsx | wire | import:src/pages/tools/LabInterpreter.tsx |
| src/pages/tools/lazySpecialtyCalculators.tsx | legacy | import:lazySpecialtyCalculators |
| src/pages/tools/mentalHealthCalculators.tsx | legacy | import:src/pages/tools/mentalHealthCalculators.tsx |
| src/pages/tools/NephrologyAssistantPage.tsx | wire | import:src/pages/tools/NephrologyAssistantPage.tsx |
| src/pages/tools/nephrologyCalculators.tsx | legacy | import:nephrologyCalculators |
| src/pages/tools/NeurologyAssistantPage.tsx | wire | import:src/pages/tools/NeurologyAssistantPage.tsx |
| src/pages/tools/neurologyCalculators.tsx | legacy | import:neurologyCalculators |
| src/pages/tools/nextWaveCalculators.tsx | legacy | import:nextWaveCalculators |
| src/pages/tools/OrderSetAi.tsx | wire | import:src/pages/tools/OrderSetAi.tsx |
| src/pages/tools/PatientSummaryAi.tsx | wire | import:src/pages/tools/PatientSummaryAi.tsx |
| src/pages/tools/PediatricsObgynAssistantPage.tsx | wire | import:src/pages/tools/PediatricsObgynAssistantPage.tsx |
| src/pages/tools/pediatricsObgynCalculators.tsx | legacy | import:pediatricsObgynCalculators |
| src/pages/tools/pr4aCalculators.tsx | legacy | import:src/pages/tools/pr4aCalculators.tsx |
| src/pages/tools/pr8ClinicalBatchCalculators.tsx | legacy | import:pr8ClinicalBatchCalculators |
| src/pages/tools/ProcedureGuide.tsx | wire | import:src/pages/tools/ProcedureGuide.tsx |
| src/pages/tools/Protocols.tsx | wire | import:src/pages/tools/Protocols.tsx |
| src/pages/tools/PsychiatryAssistantPage.tsx | wire | import:src/pages/tools/PsychiatryAssistantPage.tsx |
| src/pages/tools/psychiatryScreeningCalculators.tsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/PulmonologyAssistantPage.tsx | wire | import:src/pages/tools/PulmonologyAssistantPage.tsx |
| src/pages/tools/pulmonologyCalculators.tsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/SharedToolSession.tsx | legacy | import:src/pages/tools/SharedToolSession.tsx |
| src/pages/tools/sourceBackedClinicalCalculators.tsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/TimelineAi.tsx | wire | import:src/pages/tools/TimelineAi.tsx |
| src/pages/tools/ToolNotFound.tsx | legacy | import:./pages/tools/ToolNotFound |
| src/pages/tools/ToolPageLayout.tsx | legacy | import:src/pages/tools/ToolPageLayout.tsx |
| src/pages/tools/ToolsAreaFallback.tsx | legacy | import:ToolsAreaFallback |
| src/pages/tools/ToolsFilteredConsole.tsx | legacy | import:./pages/tools/ToolsFilteredConsole |
| src/pages/tools/ToolsOverview.tsx | legacy | import:src/pages/tools/ToolsOverview.tsx |
| src/pages/training/Competencies.tsx | legacy | import:./pages/training/Competencies |
| src/pages/training/Credentials.tsx | legacy | import:./pages/training/Credentials |
| src/pages/training/MedicalSimulationSuite.tsx | legacy | import:./pages/training/MedicalSimulationSuite |
| src/pages/training/SimulationOutcomes.tsx | legacy | import:./pages/training/SimulationOutcomes |
| src/pages/training/SimulationScenarioPlayer.tsx | legacy | import:./pages/training/SimulationScenarioPlayer |
| src/pages/training/TrainingDashboard.tsx | legacy | import:TrainingDashboard |
| src/pages/UsagePage.tsx | legacy | import:./pages/UsagePage |
| src/pages/Version.tsx | legacy | import:./pages/Version |

## Orphan components

_None detected._

## Dashboards

_None detected._

## Simulations

_None detected._

## Laboratory modules

| Module | Class | Evidence |
| --- | --- | --- |
| src/pages/clinical/LaboratoryDashboard.tsx | wire | import:./pages/clinical/LaboratoryDashboard |
| src/pages/tools/LabInterpreter.tsx | wire | import:src/pages/tools/LabInterpreter.tsx |

## 3D viewer code

_None detected._

## Orphan services

_None detected._

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
| exports-pdf | legacy | Gated stub — intentional no-op until backend exists |
| exports-excel | legacy | Gated stub — intentional no-op until backend exists |
| reports-generate | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub — intentional no-op until backend exists |
| GET /api/emergency/patients/:patientId/workflow-logs | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/copilot/interactions | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/clinical-calculators/results | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/digital-twin/organizational/simulate | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/digital-twin/organizational/synchronize | legacy | Backend-only route (no SPA client) |
| POST /api/ems/ai-call-interrogation | legacy | Backend-only route (no SPA client) |
| POST /api/ems/ai-call-interrogation/ecg | legacy | Backend-only route (no SPA client) |
| GET /api/ems/federated | legacy | Backend-only route (no SPA client) |
| GET /api/ems/federated/health | legacy | Backend-only route (no SPA client) |
| POST /api/ems/federated/round | legacy | Backend-only route (no SPA client) |
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
| POST /api/platform/users/me/pinned-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/users/me/hidden-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/assets/:assetId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/packs/:packId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/role-profiles/:id | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/organizations/:organizationId/entitlements | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/organizations/:organizationId/packs/:packId/install | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/organizations/:organizationId/packs/:packId/remove | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform-governance/consent/:patientId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform-governance/consent/:patientId/:scope | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform-governance/gate/evaluate | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform-governance/observability | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform-governance/privacy/:patientId/:requestType | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform-governance/review/items | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform-governance/review/items | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform-governance/review/items/:itemId/decision | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform-governance/security/events | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform-governance/source-provenance/:sourceId | legacy | Platform/product API is deferred and not frontend-inventory wired |

_… and 7 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/archive/CAREDROID_ARCHITECTURE_CLEANUP_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/CLINICAL_PROCESS_SAAS_HARMONIZATION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/INTERACTION_EXECUTION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/PLATFORM_MODERNIZATION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/02-dependency-map.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/02-scorecard-baseline.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/03-orphaned-code.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/04-rbac-permission-matrix.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/05-information-architecture.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/NEW_HEADER_INTEGRATION_GUIDE.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/SCORECARD-archive-2026-07-23-cycles-1-157.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.ts`

