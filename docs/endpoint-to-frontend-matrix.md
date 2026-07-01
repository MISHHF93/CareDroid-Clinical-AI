# Endpoint-to-frontend matrix

**Generated:** 2026-07-01T03:22:38.224Z

| Method | Path | Backend | Frontend client | Exposure |
|--------|------|---------|-----------------|----------|
| POST | `/api/chat/message` | ChatController | clinicalChatService.js | ? |
| POST | `/api/chat/intent-classify` | ChatController | advancedRecommendationService.js | ? |
| POST | `/api/chat/suggest-action` | ChatController | clinicalChatService.js | ? |
| POST | `/api/chat/analyze-vitals` | ChatController | clinicalChatService.js | ? |
| POST | `/api/chat/messages` | � | syncService.js | ?? gated |
| POST | `/api/chat/conversations` | � | syncService.js | ?? gated |
| GET | `/api/settings/features` | SettingsFeaturesController | emergencySettingsApi.js / featureStore.ts | ? |
| PATCH | `/api/settings/features` | SettingsFeaturesController | emergencySettingsApi.js / featureStore.ts | ? |
| GET | `/api/protocols` | ProtocolController | clinicalContentApi.js | ? |
| GET | `/api/protocols/categories` | ProtocolController | clinicalContentApi.js | ? |
| GET | `/api/protocols/:id` | ProtocolController | clinicalContentApi.js / Protocols.jsx | ? |
| GET | `/api/drugs` | DrugController | clinicalContentApi.js | ? |
| GET | `/api/drugs/categories` | DrugController | clinicalContentApi.js | ? |
| GET | `/api/drugs/:id` | DrugController | clinicalContentApi.js | ? |
| GET | `/api/tools` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| GET | `/api/tools/available` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| GET | `/api/tools/:id` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| POST | `/api/tools/:id/validate` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| GET | `/api/tools/catalog/executors` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| GET | `/api/tools/statistics` | ToolOrchestratorController | clinicalToolsApi.js | ? |
| POST | `/api/tools/:id/execute` | ToolOrchestratorController | clinicalOrchestratorApi.js | ? |
| POST | `/api/tools/results` | ToolOrchestratorController | syncService.js | ? |
| POST | `/api/tools/share-results` | � | ToolResultShare.jsx | ?? gated |
| GET | `/api/compliance/consent` | ComplianceController | complianceApi.js | ? |
| POST | `/api/compliance/consent` | ComplianceController | complianceApi.js | ? |
| POST | `/api/compliance/export` | ComplianceController | complianceApi.js / Settings.jsx | ? |
| DELETE | `/api/compliance/delete-account` | ComplianceController | complianceApi.js | ? |
| GET | `/api/audit/logs` | AuditController | Settings.jsx / Profile.jsx | ? |
| GET | `/api/audit/my-logs` | AuditController | auditApi.js / ProfileActivity.jsx | ? |
| GET | `/api/audit/phi-access` | AuditController | auditApi.js / PatientDetailPanel | ? |
| GET | `/api/audit/verify-integrity` | AuditController | auditApi.js | ? |
| GET | `/api/audit/statistics` | AuditController | auditApi.js | ? |
| POST | `/api/audit/sync` | AuditController | syncService.js | ? |
| GET | `/api/notifications` | NotificationController | NotificationService.js | ? |
| GET | `/api/notifications/unread/count` | NotificationController | NotificationService.js | ? |
| PATCH | `/api/notifications/:id/read` | NotificationController | NotificationService.js | ? |
| POST | `/api/notifications/read-all` | NotificationController | NotificationService.js | ? |
| DELETE | `/api/notifications/:id` | NotificationController | NotificationService.js | ? |
| GET | `/api/notifications/preferences` | NotificationController | NotificationService.js | ? |
| PATCH | `/api/notifications/preferences` | NotificationController | NotificationService.js | ? |
| POST | `/api/notifications/preferences/toggle-all` | NotificationController | NotificationService.js | ? |
| POST | `/api/notifications/devices/register` | NotificationController | NotificationService.js | ? |
| GET | `/api/notifications/devices` | NotificationController | NotificationService.js | ? |
| DELETE | `/api/notifications/devices/:token` | NotificationController | NotificationService.js | ? |
| POST | `/api/notifications/test` | NotificationController | NotificationService.js | ? |
| GET | `/api/notifications/stream` | � | NotificationService.js | ?? gated |
| POST | `/api/notifications/send/:channel` | � | src/test/fixtures/legacyNotificationService.ts | ?? gated |
| GET | `/api/team/users` | � | TeamManagement.jsx | ?? gated |
| PUT | `/api/team/users/:id` | � | TeamManagement.jsx | ?? gated |
| DELETE | `/api/team/users/:id` | � | TeamManagement.jsx | ?? gated |
| POST | `/api/team/invite` | � | TeamManagement.jsx | ?? gated |
| POST | `/api/sync` | � | offline.js / OfflineSupport.jsx | ?? gated |
| GET | `/api/fleet/vehicles/live` | FleetController | fleetTelemetryService.js | ? |
| GET | `/api/fleet/routes/active` | FleetController | fleetTelemetryService.js | ? |
| GET | `/api/fleet/alerts` | FleetController | fleetTelemetryService.js | ? |
| GET | `/api/fleet/snapshot` | FleetController | emergencyTransportApi.js | ? |
| GET | `/api/hospital-map/floors` | HospitalMapController | hospitalMapService.js | ? |
| GET | `/api/hospital-map/devices` | HospitalMapController | hospitalMapService.js | ? |
| GET | `/api/devices/live` | TelemetryController | medicalIotService.js | ? |
| GET | `/api/telemetry/live` | TelemetryController | medicalIotService.js | ? |
| GET | `/api/alerts/devices` | TelemetryController | medicalIotService.js | ? |
| GET | `/api/clinical/alerts` | ClinicalAlertsController | clinicalAlertsApi.js / ClinicalAlertsPage.jsx | ? |
| POST | `/api/clinical/alerts/:id/acknowledge` | ClinicalAlertsController | clinicalAlertsApi.js / ClinicalAlertsPage.jsx | ? |
| POST | `/api/clinical/alerts/:id/dismiss` | ClinicalAlertsController | clinicalAlertsApi.js / ClinicalAlertsPage.jsx | ? |
| GET | `/api/clinical/alerts/stream` | � | clinicalAlertsApi.js / ClinicalAlertsPage.jsx | ?? gated |
| GET | `/api/emergency/central-node/snapshot` | EmergencyOsController | emergencyOsApi.js / useCareDroidCentralNode | ? |
| GET | `/api/emergency/whiteboard` | EmergencyOsController | emergencyOsApi.js / useEmergencyWhiteboard | ? |
| GET | `/api/emergency/patients` | EmergencyOsController | emergencyOsApi.js / useEmergencyPatients | ? |
| POST | `/api/emergency/patients` | EmergencyOsController | emergencyOsApi.js / createEmergencyPatient | ? |
| GET | `/api/emergency/journey` | EmergencyOsController | emergencyOsApi.js / usePatientJourney / PatientsRoute journey status | ? |
| GET | `/api/emergency/ems` | EmergencyOsController | emergencyOsApi.js / useEMSIntake | ? |
| GET | `/api/emergency/intake` | EmergencyOsController | emergencyOsApi.js / useSmartIntake | ? |
| POST | `/api/emergency/intake` | EmergencyOsController | emergencyOsApi.js / QuickIntake | ? |
| POST | `/api/emergency/intake/vertical-slice` | EmergencyOsController | emergencyOsApi.js / NewPatientIntake | ? |
| GET | `/api/emergency/queues` | EmergencyOsController | emergencyOsApi.js / useEmergencyQueues | ? |
| GET | `/api/emergency/reassessment` | EmergencyOsController | emergencyOsApi.js / useReassessmentQueue | ? |
| GET | `/api/emergency/capacity` | EmergencyOsController | emergencyOsApi.js / useCapacityStatus | ? |
| GET | `/api/emergency/boarding` | EmergencyOsController | emergencyOsApi.js / useBoardingStatus | ? |
| GET | `/api/emergency/referrals` | EmergencyOsController | emergencyOsApi.js / useReferrals | ? |
| GET | `/api/emergency/provincial-health` | EmergencyOsController | emergencyOsApi.js / useProvincialHealth / EmergencySettings runtime card | ? |
| GET | `/api/emergency/integrations` | EmergencyOsController | emergencyOsApi.js / useIntegrationHub / EmergencySettings runtime card | ? |
| GET | `/api/emergency/workflow-logs` | EmergencyOsController | emergencyOsApi.js / EmergencySettings audit view / store startup hydration | ? |
| GET | `/api/emergency/implementation-readiness` | EmergencyOsController | emergencyOsApi.js / fetchCompleteImplementationReadiness | ? |
| GET | `/api/emergency/copilot` | EmergencyOsController | emergencyOsApi.js / useEDCopilot | ? |
| POST | `/api/emergency/copilot/message` | EmergencyAIController | lib/ai/client.ts / clinicalChatService.js | ? |
| POST | `/api/emergency/intake/ai/message` | EmergencyAIController | lib/ai/client.ts | ? |
| POST | `/api/emergency/referrals/ai/message` | EmergencyAIController | lib/ai/client.ts | ? |
| POST | `/api/emergency/analytics/ai/message` | EmergencyAIController | lib/ai/client.ts | ? |
| GET | `/api/emergency/settings` | EmergencyOsController | emergencyOsApi.js / useEmergencySettings / emergencySettingsApi.js | ? |
| PATCH | `/api/emergency/settings` | EmergencyOsController | emergencySettingsApi.js / EmergencySettings.jsx | ? |
| GET | `/api/emergency/analytics` | EmergencyOsController | emergencyAnalyticsApi.js | ? |
| GET | `/api/emergency/upgrade-harness` | EmergencyOsController | emergencyOsApi.js / useAdvancedEmergencyOsUpgradeHarness | ? |
| GET | `/api/emergency/upgrade-harness/capacity` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessCapacity / CapacityRoute | ? |
| GET | `/api/emergency/upgrade-harness/patient-flow` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessPatientFlow / EmergencyWhiteboard | ? |
| GET | `/api/emergency/upgrade-harness/patient-flow/:patientId` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessPatientFlow / PatientDetailPanel | ? |
| GET | `/api/emergency/upgrade-harness/clinical-intelligence` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessClinicalIntelligence / CopilotRoute | ? |
| GET | `/api/emergency/upgrade-harness/clinical-intelligence/:patientId` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessClinicalIntelligence | ? |
| GET | `/api/emergency/upgrade-harness/audit-summary` | EmergencyOsController | emergencyOsApi.js / useUpgradeHarnessAuditSummary / CopilotRoute | ? |
| POST | `/api/emergency/simulation/update-live` | EmergencyOsController | emergencyOsApi.js / useRealTimeSimulation | ? |
| POST | `/api/emergency/simulation/evaluate` | EmergencyOsController | emergencyOsApi.js / useRealTimeSimulation | ? |
| POST | `/api/emergency/simulation/compare` | EmergencyOsController | emergencyOsApi.js / useRealTimeSimulation | ? |
| GET | `/api/emergency/simulation/recommendations` | EmergencyOsController | emergencyOsApi.js / useRealTimeSimulation | ? |
| POST | `/api/emergency/federated-learning/register` | EmergencyOsController | emergencyOsApi.js / useFederatedLearning | ? |
| POST | `/api/emergency/federated-learning/update` | EmergencyOsController | emergencyOsApi.js / useFederatedLearning | ? |
| POST | `/api/emergency/federated-learning/aggregate` | EmergencyOsController | emergencyOsApi.js / useFederatedLearning | ? |
| GET | `/api/emergency/federated-learning/global-model/:hospitalId` | EmergencyOsController | emergencyOsApi.js / useFederatedLearning | ? |
| GET | `/api/emergency/federated-learning/dashboard` | EmergencyOsController | emergencyOsApi.js / useFederatedLearning | ? |
| POST | `/api/emergency/digital-twin/initialize` | EmergencyOsController | emergencyOsApi.js / useHybridDigitalTwin | ? |
| POST | `/api/emergency/digital-twin/simulate` | EmergencyOsController | emergencyOsApi.js / useHybridDigitalTwin | ? |
| GET | `/api/emergency/digital-twin/state` | EmergencyOsController | emergencyOsApi.js / useHybridDigitalTwin | ? |
| POST | `/api/emergency/digital-twin/scenario` | EmergencyOsController | emergencyOsApi.js / useHybridDigitalTwin | ? |
| GET | `/api/emergency/capacity/history` | � | emergencyAnalyticsApi.js | ?? gated |
| GET | `/api/emergency/queues/analytics` | � | emergencyAnalyticsApi.js | ?? gated |
| GET | `/api/emergency/shift/report/export` | � | emergencyAnalyticsApi.js | ?? gated |
| POST | `/api/emergency/referrals` | EmergencyOsController | emergencyTransportApi.js | ? |
| GET | `/api/emergency/patients/:patientId/referrals` | � | emergencyTransportApi.js | ?? gated |
| PATCH | `/api/emergency/transfers/:referralId/status` | � | emergencyTransportApi.js | ?? gated |
| GET | `/api/emergency/diversion/status` | � | emergencyTransportApi.js | ?? gated |
| POST | `/api/emergency/intake/sessions` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/manual-entry` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/documents` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/ocr-results` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/match` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/verify-field` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/link-patient` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/create-patient` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/continue-unknown` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/ems-evidence` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/reconcile-unknown` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/biometric-consent` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/emergency/intake/:sessionId/biometric-consent/withdraw` | � | smartIntakeApi.js | ?? gated |
| GET | `/api/emergency/intake/:sessionId/audit-log` | � | smartIntakeApi.js | ?? gated |
| POST | `/api/clinical-intelligence/ambient-scribe/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / AmbientScribe.jsx | ? |
| POST | `/api/clinical-intelligence/guideline-rag/query` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / GuidelineRag.jsx | ? |
| POST | `/api/clinical-intelligence/differential-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / DifferentialAi.jsx | ? |
| POST | `/api/clinical-intelligence/timeline-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / TimelineAi.jsx | ? |
| POST | `/api/clinical-intelligence/patient-summary-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / PatientSummaryAi.jsx | ? |
| POST | `/api/clinical-intelligence/order-set-ai/generate` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / OrderSetAi.jsx | ? |
| GET | `/api/clinical-intelligence/ai-explainability/trace` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / AiExplainability.jsx | ? |
| GET | `/api/clinical-intelligence/clinical-audit/execution-logs` | ClinicalIntelligenceController | clinicalIntelligenceApi.js / ClinicalAudit.jsx | ? |
| GET | `/api/platform-systems/capabilities/:capabilityId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/ai-governance/summary` | GovernanceController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/emergency/governance/registry` | EmergencyAIGovernanceController | emergencyGovernanceApi.js / AIGovernanceDashboard.tsx | ? |
| GET | `/api/emergency/governance/safety-rules` | EmergencyAIGovernanceController | emergencyGovernanceApi.js | ? |
| GET | `/api/emergency/governance/compliance` | EmergencyAIGovernanceController | emergencyGovernanceApi.js / AIGovernanceDashboard.tsx | ? |
| GET | `/api/emergency/governance/violations` | EmergencyAIGovernanceController | emergencyGovernanceApi.js | ? |
| GET | `/api/emergency/governance/validate-prompts` | EmergencyAIGovernanceController | emergencyGovernanceApi.js / AIGovernanceDashboard.tsx | ? |
| GET | `/api/security/summary` | LlmSecurityController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| POST | `/api/security/evaluate` | LlmSecurityController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/interoperability/summary` | InteroperabilityController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/regulatory/summary` | RegulatoryController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/equity/summary` | EquityController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/human-review/items` | HumanReviewController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| POST | `/api/human-review/items/:itemId/decision` | HumanReviewController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/privacy/summary` | PrivacyCenterController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| POST | `/api/privacy/requests` | PrivacyCenterController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/api/ehr-audit/summary` | EhrAuditController | platformGovernanceApi.js / PlatformGovernanceWorkspace.jsx | ? |
| GET | `/health` | AppController | systemHealthService.js / SystemHealth.jsx | ? |
| GET | `/api/system-health` | ObservabilityController | systemHealthService.js / SystemHealth.jsx | ? |
| GET | `/api/saas-health` | SaasHealthController | saasHealthApi.js / SaasHealthCenter.jsx | ? |
| GET | `/api/platform-systems/packs/:pack` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/dependency-graph` | ProductCatalogController | productCatalogApi.js / DependencyGraph.jsx | ? |
| GET | `/api/integrations/fhir/connections` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/integrations/fhir/connections` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/integrations/fhir/:connectionId/test` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/integrations/fhir/:connectionId/sync` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/integrations/hl7/interfaces` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/integrations/hl7/interfaces/:interfaceId/test-message` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/patients/import/ehr` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/patients/:patientId/import/labs` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/patients/:patientId/import/medications` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/patients/:patientId/import/observations` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/patients/:patientId/workspace` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PatientCard.tsx / EmergencyWhiteboard.jsx | ? |
| GET | `/api/patients/:patientId/summary` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | ? |
| GET | `/api/patients/:patientId/timeline` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | ? |
| GET | `/api/patients/:patientId/source-data` | PlatformSystemsController | patientManagementApi.js / PatientDetailPanel / PatientCard.tsx | ? |
| GET | `/api/patients/:patientId/review-items` | PlatformSystemsController | patientManagementApi.js / PatientDetailPanel | ? |
| GET | `/api/privacy/patient/:patientId/access-log` | PlatformSystemsController | patientManagementApi.js / PatientDetailPanel | ? |
| POST | `/api/patients/:patientId/events` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/patients/:patientId/risk-scores` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | ? |
| POST | `/api/patients/:patientId/risk-scores` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/patients/:patientId/care-plan` | PlatformSystemsController | platformSystemsApi.js / patientManagementApi.js / PatientDetailPanel | ? |
| POST | `/api/clinical-intelligence/calculator-recommender/suggest` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/clinical-intelligence/workflow-builder/generate` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/clinical-intelligence/reasoning/analyze` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/clinical-intelligence/why-engine/explain` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/clinical-intelligence/audit-trail/summarize` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/clinical-intelligence/clinical-event-ai/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/soap/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/dictation/transcribe` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/discharge-summary/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/referral/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/prior-auth/draft` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/:documentId/approve` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/documentation/:documentId/export` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/governance/ai/policies` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| PUT | `/api/governance/ai/policies/:policyId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/governance/model-usage/summary` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/governance/model-usage/events` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/governance/costs/summary` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| PUT | `/api/governance/costs/budgets/:budgetId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/governance/clinical-safety/findings` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/governance/clinical-safety/findings/:findingId/review` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/consent/:patientId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/consent/:patientId` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/consent/:patientId/revoke` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| GET | `/api/privacy/access-log` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/privacy/export` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/privacy/delete-request` | PlatformSystemsController | platformSystemsApi.js / PlatformSystemPage.jsx | ? |
| POST | `/api/exports/pdf` | � | export/ExportService.js | ?? gated |
| POST | `/api/exports/excel` | � | export/ExportService.js | ?? gated |
| POST | `/api/reports/generate` | � | export/ExportService.js | ?? gated |
| POST | `/api/reports/schedule` | � | export/ExportService.js | ?? gated |
| DELETE | `/api/reports/schedule/:reportId` | � | export/ExportService.js | ?? gated |
| GET | `/api/analytics/metrics` | AnalyticsController | AnalyticsDashboard.jsx | ? |
| GET | `/api/auth/biometric/stats` | BiometricController | BiometricSetup.jsx | ? |
| POST | `/api/auth/biometric/verify` | BiometricController | BiometricSetup.jsx | ? |
| DELETE | `/api/auth/biometric/disable/:deviceId` | BiometricController | BiometricSetup.jsx | ? |
| GET | `/api/config/system` | AppController | configService.js | ? |
| GET | `/api/tenant/context` | TenantContextController | TenantContext.jsx | ? |
| GET | `/api/tenant/isolation-audit` | TenantContextController | tenantIsolationApi.js / Settings.jsx | ? |
| GET | `/api/ai/remaining-queries` | AiController | configService.js | ? |
| GET | `/api/platform/assets` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/governance-registry` | PlatformAssetsController | platformAssetsApi.js / GovernanceRegistry.jsx | ? |
| PATCH | `/api/platform/assets/:assetId/lifecycle` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/context` | PlatformAssetsController | platformAssetsApi.js / UserIdentityContext.jsx | ? |
| GET | `/api/platform/packs` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/role-profiles` | PlatformAssetsController | platformAssetsApi.js / ProfileSettings.jsx | ? |
| GET | `/api/platform/departments` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/departments/:departmentId` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/service-lines` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/service-lines/:serviceLineId` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/marketplace/packs` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/marketplace/packs/:packId` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/platform/users/me/assets` | PlatformAssetsController | platformAssetsApi.js / ProfileToolPreferences.jsx | ? |
| GET | `/api/platform/users/me/recommendations` | PlatformAssetsController | platformAssetsApi.js / CommandDashboard.jsx | ? |
| PATCH | `/api/platform/me/role-profile` | PlatformAssetsController | platformAssetsApi.js / ProfileSettings.jsx | ? |
| GET | `/api/platform/digital-twin` | PlatformAssetsController | platformAssetsApi.js / DigitalTwinIntelligence.jsx | ? |
| GET | `/api/platform/organizations/:organizationId/analytics` | PlatformAssetsController | platformAssetsApi.js / OrganizationPages.jsx | ? |
| GET | `/api/users/profile` | UsersController | UserContext.jsx / syncService.js | ? |
| PATCH | `/api/users/profile` | UsersController | UserContext.jsx / syncService.js | ? |
| GET | `/api/profile/me` | UserProfileController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| PATCH | `/api/profile/me` | UserProfileController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| GET | `/api/profile/me/preferences` | UserProfileController | userIdentityApi.js / ProfilePreferences.jsx | ? |
| PATCH | `/api/profile/me/preferences` | UserProfileController | userIdentityApi.js / ProfilePreferences.jsx | ? |
| GET | `/api/profile/me/activity` | UserProfileController | userIdentityApi.js / ProfileActivity.jsx | ? |
| GET | `/api/profile/me/security` | UserProfileController | userIdentityApi.js / ProfileSecurity.jsx | ? |
| GET | `/api/profile/me/workspaces` | UserProfileController | userIdentityApi.js / ProfileWorkspaces.jsx | ? |
| PATCH | `/api/profile/me/workspaces/active` | UserProfileController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| GET | `/api/workspaces` | WorkspacesController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| POST | `/api/workspaces` | WorkspacesController | userIdentityApi.js / ProfileWorkspaces.jsx | ? |
| POST | `/api/workspaces/active` | WorkspacesController | userIdentityApi.js / Sidebar.jsx | ? |
| POST | `/api/activity` | UserActivityController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| GET | `/api/personalization/me` | PersonalizationController | userIdentityApi.js / UserIdentityContext.jsx | ? |
| PATCH | `/api/personalization/me` | PersonalizationController | userIdentityApi.js / ProfilePreferences.jsx | ? |
| POST | `/api/personalization/me/saved-prompts` | PersonalizationController | userIdentityApi.js / ProfilePreferences.jsx | ? |
| GET | `/api/artifacts` | ArtifactsController | artifactsApi.js / Artifacts.jsx | ? |
| GET | `/api/artifacts/graph` | ArtifactsController | artifactsApi.js / Artifacts.jsx | ? |
| GET | `/api/artifacts/:artifactId/versions` | ArtifactsController | artifactsApi.js / Artifacts.jsx | ? |
| GET | `/api/memory/dashboard` | MemoryController | memoryApi.js / MemoryDashboard.jsx | ? |
| POST | `/api/memory/short` | MemoryController | memoryApi.js / MemoryDashboard.jsx | ? |
| POST | `/api/memory/long` | MemoryController | memoryApi.js | ? |
| POST | `/api/memory/clinical` | MemoryController | memoryApi.js | ? |
| GET | `/api/memory/fabric/context` | MemoryController | memoryApi.js / UserIdentityContext.jsx | ? |
| POST | `/api/memory/fabric/signals` | MemoryController | memoryApi.js / UserIdentityContext.jsx | ? |
| GET | `/api/training/dashboard` | TrainingController | trainingApi.js / TrainingDashboard.jsx | ? |
| GET | `/api/training/pipeline` | TrainingController | trainingApi.js | ? |
| GET | `/api/training/runs` | TrainingController | trainingApi.js | ? |
| POST | `/api/training/runs` | TrainingController | trainingApi.js / TrainingDashboard.jsx | ? |
| POST | `/api/training/runs/:runId/evaluate` | TrainingController | trainingApi.js | ? |
| GET | `/api/training/moe-plan` | TrainingController | trainingApi.js | ? |
| GET | `/api/evaluation/dashboard` | EvaluationController | evaluationApi.js / AiEvaluationDashboard.jsx | ? |
| POST | `/api/evaluation/runs` | EvaluationController | evaluationApi.js | ? |
| GET | `/api/cost-optimizer/dashboard` | CostOptimizerController | aiCommandCenterApi.js / AiCommandCenterDashboard.jsx | ? |
| GET | `/api/subscriptions/current` | SubscriptionsController | configService.js / subscriptionApi.js | ? |
| GET | `/api/subscriptions/plans` | SubscriptionsController | configService.js / subscriptionApi.js | ? |
| GET | `/api/subscriptions/lifecycle` | SubscriptionsController | subscriptionApi.js | ? |
| POST | `/api/subscriptions/entitlements/resolve` | SubscriptionsController | subscriptionApi.js | ? |
| GET | `/api/subscriptions/billing` | SubscriptionsController | subscriptionApi.js | ? |
| GET | `/api/subscriptions/usage` | SubscriptionsController | subscriptionApi.js / usageMeteringService.js | ? |
| GET | `/api/subscriptions/usage/metering` | SubscriptionsController | subscriptionApi.js / usageMeteringService.js | ? |
| POST | `/api/subscriptions/usage/events` | SubscriptionsController | subscriptionApi.js / usageMeteringService.js | ? |
| POST | `/api/subscriptions/create-checkout` | SubscriptionsController | subscriptionApi.js | ? |
| POST | `/api/subscriptions/portal` | SubscriptionsController | subscriptionApi.js | ? |
| GET | `/api/products` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/products/pack-map` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/products/builder` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/products/:slug` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/products/:slug/builder` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/products/:slug/assets` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/asset-packs` | ProductCatalogController | productCatalogApi.js / OrganizationPages.jsx | ? |
| GET | `/api/commercial-plans` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/commercial-plans/:id` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/specialties` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/specialties/:slug` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/care-pathways` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/care-pathways/:slug` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/agents` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/integrations-marketplace` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/integration-readiness` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| POST | `/api/solution-builder/recommendations` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| POST | `/api/solution-builder/apply` | ProductCatalogController | productCatalogApi.js / CommercialPages.jsx | ? |
| GET | `/api/organizations/:organizationId/outcomes` | ProductCatalogController | productCatalogApi.js / OrganizationPages.jsx | ? |
| GET | `/api/organizations/:organizationId/value-tracking` | ProductCatalogController | productCatalogApi.js / OrganizationPages.jsx | ? |
| PATCH | `/api/organizations/:organizationId/configuration` | ProductCatalogController | productCatalogApi.js / OrganizationPages.jsx | ? |
| POST | `/api/organizations/:organizationId/integrations/request` | ProductCatalogController | productCatalogApi.js / OrganizationPages.jsx | ? |
| GET | `/api/automation-audit` | AutomationAuditController | automationAuditApi.js / AutomationAuditTrail.jsx | ? |
| POST | `/api/automation-audit` | AutomationAuditController | automationAuditApi.js / WorkflowAutomationBuilder.jsx | ? |
| GET | `/api/white-label/:tenantId` | WhiteLabelController | whiteLabelApi.js / WhiteLabelContext.jsx | ? |
| POST | `/api/auth/login` | AuthController | Auth.jsx | ? |
| POST | `/api/auth/register` | AuthController | Auth.jsx | ? |
| POST | `/api/auth/verify-2fa` | AuthController | Auth.jsx | ? |
| POST | `/api/auth/magic-link` | AuthController | Auth.jsx | ? |
| POST | `/api/auth/dev-session` | AuthController | Auth.jsx | ? |
| GET | `/api/auth/identity-providers` | AuthController | enterpriseIdentityApi.js / Settings.jsx | ? |
| GET | `/api/auth/biometric/config` | BiometricController | BiometricSetup.jsx | ? |
| POST | `/api/auth/biometric/enroll` | BiometricController | BiometricSetup.jsx | ? |
| GET | `/api/auth/biometric/available` | BiometricController | BiometricSetup.jsx | ? |
| DELETE | `/api/auth/biometric/delete/:deviceId` | BiometricController | BiometricSetup.jsx | ? |
| GET | `/api/two-factor/generate` | TwoFactorController | TwoFactorSetup.jsx | ? |
| POST | `/api/two-factor/enable` | TwoFactorController | TwoFactorSetup.jsx | ? |
| GET | `/api/two-factor/status` | TwoFactorController | TwoFactorSettings.jsx | ? |
| DELETE | `/api/two-factor/disable` | TwoFactorController | TwoFactorSettings.jsx | ? |
| POST | `/api/crashes` | AnalyticsController | ErrorBoundary.jsx | ? |
| POST | `/api/analytics/events` | AnalyticsController | analyticsService.ts | ? |

## Backend route inventory (reference)

- `GET /health`
- `GET /api/config/system`
- `GET /api/settings/features`
- `PATCH /api/settings/features`
- `GET /api/emergency/whiteboard`
- `GET /api/emergency/central-node/snapshot`
- `GET /api/emergency/patients`
- `POST /api/emergency/patients`
- `GET /api/emergency/journey`
- `GET /api/emergency/workflow-logs`
- `GET /api/emergency/implementation-readiness`
- `GET /api/emergency/patients/:patientId/workflow-logs`
- `GET /api/emergency/ems`
- `GET /api/emergency/intake`
- `POST /api/emergency/intake`
- `POST /api/emergency/intake/vertical-slice`
- `GET /api/emergency/queues`
- `GET /api/emergency/reassessment`
- `GET /api/emergency/capacity`
- `GET /api/emergency/boarding`

_�and 504 more in src/data/backendHttpRouteInventory.js_

