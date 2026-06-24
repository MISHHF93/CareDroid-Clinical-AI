# Orphan Detection Report

Generated: 2026-06-24 (regenerate with `npm run orphan-detection:write-docs`)

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
| Total orphan findings | 490 |
| App.jsx routes | 257 |
| Orphan / gap routes | 35 |
| Orphan pages | 78 |
| Orphan components | 1 |
| Domain module findings (dashboard / simulation / lab / 3D) | 8 |
| Orphan services | 4 |
| Executor contract gaps | 0 |
| API orphans / stubs | 141 |
| Weakly linked markdown | 223 |
| **wire** | 60 |
| **merge** | 0 |
| **quarantine** | 200 |
| **legacy** | 230 |

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
| /auth | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth-callback | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/forgot-password | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/magic-link | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /auth/invite | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /reset-password | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /verify-email | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /admin/staff-workflows | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /human-review | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tenant-admin/workspaces | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /welcome | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /privacy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/ai | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/phi | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/integrations | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/policy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /simulation/sepsis-deterioration | wire | toolInventory route not registered in App.jsx |
| /simulation/sepsis-deterioration | wire | toolInventory route not registered in App.jsx |
| /integrations/fhir | wire | toolInventory route not registered in App.jsx |
| /integrations/hl7 | wire | toolInventory route not registered in App.jsx |
| /integrations/source-provenance | wire | toolInventory route not registered in App.jsx |
| /costs | wire | toolInventory route not registered in App.jsx |
| /ai-memory | wire | toolInventory route not registered in App.jsx |
| /audit/ai | wire | toolInventory route not registered in App.jsx |
| /training | wire | toolInventory route not registered in App.jsx |
| /operations/observability | wire | toolInventory route not registered in App.jsx |
| /review | wire | toolInventory route not registered in App.jsx |
| /operations/incidents | wire | toolInventory route not registered in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |
| /medical-simulation | legacy | Redirect or alias route in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /chat | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /anatomy-viewer | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/AnalyticsDashboard.jsx | legacy | import:src/pages/AnalyticsDashboard.jsx |
| src/pages/CapacityDetail.jsx | legacy | import:CapacityDetail |
| src/pages/ClinicalAlertsPage.jsx | legacy | import:src/pages/ClinicalAlertsPage.jsx |
| src/pages/CommandDashboard.jsx | legacy | import:src/pages/CommandDashboard.jsx |
| src/pages/commercial/CommercialPageShell.jsx | legacy | import:CommercialPageShell |
| src/pages/CostAnalyticsDashboard.jsx | wire | import:src/pages/CostAnalyticsDashboard.jsx |
| src/pages/emergency/ClinicalCalculatorHub.jsx | legacy | import:./pages/emergency/ClinicalCalculatorHub |
| src/pages/emergency/emergencyRouteShared.jsx | legacy | import:emergencyRouteShared |
| src/pages/emergency/ReceptionPipelineShell.jsx | legacy | import:ReceptionPipelineShell |
| src/pages/fleet/FleetDashboardWidgets.jsx | legacy | import:src/pages/fleet/FleetDashboardWidgets.jsx |
| src/pages/fleet/FleetPageChrome.jsx | legacy | import:./pages/fleet/FleetPageChrome |
| src/pages/fleet/PredictiveMaintenanceWidgets.jsx | legacy | import:PredictiveMaintenanceWidgets |
| src/pages/fleet/RouteOptimizerWidgets.jsx | legacy | import:RouteOptimizerWidgets |
| src/pages/GDPRNotice.jsx | legacy | import:src/pages/GDPRNotice.jsx |
| src/pages/HelpCenter.jsx | legacy | import:src/pages/HelpCenter.jsx |
| src/pages/HIPAANotice.jsx | legacy | import:src/pages/HIPAANotice.jsx |
| src/pages/legal/ConsentFlow.jsx | legacy | import:src/pages/legal/ConsentFlow.jsx |
| src/pages/legal/ConsentHistory.jsx | legacy | import:src/pages/legal/ConsentHistory.jsx |
| src/pages/legal/index.js | legacy | import:index |
| src/pages/legal/PrivacyPolicy.jsx | legacy | import:src/pages/legal/PrivacyPolicy.jsx |
| src/pages/legal/TermsOfService.jsx | legacy | import:src/pages/legal/TermsOfService.jsx |
| src/pages/MemoryDashboard.jsx | wire | import:src/pages/MemoryDashboard.jsx |
| src/pages/Operations.jsx | wire | import:src/pages/Operations.jsx |
| src/pages/Patients.jsx | legacy | import:src/pages/Patients.jsx |
| src/pages/platform/components/PlatformWorkflowPrimitives.jsx | legacy | import:PlatformWorkflowPrimitives |
| src/pages/platform/PlatformGovernanceWorkspace.jsx | wire | import:src/pages/platform/PlatformGovernanceWorkspace.jsx |
| src/pages/platform/PlatformSystemPage.jsx | wire | import:src/pages/platform/PlatformSystemPage.jsx |
| src/pages/RecommendationsPage.jsx | legacy | import:RecommendationsPage |
| src/pages/settings/FeatureManagement.jsx | legacy | import:FeatureManagement |
| src/pages/Settings.jsx | legacy | import:src/pages/Settings.jsx |
| src/pages/ShiftSummary.jsx | legacy | import:ShiftSummary |
| src/pages/team/index.js | legacy | import:index |
| src/pages/tools/abcd2Calculator.jsx | legacy | import:abcd2Calculator |
| src/pages/tools/AiExplainability.jsx | wire | import:src/pages/tools/AiExplainability.jsx |
| src/pages/tools/AmbientScribe.jsx | wire | import:src/pages/tools/AmbientScribe.jsx |
| src/pages/tools/calculatorPrimitives.jsx | legacy | import:calculatorPrimitives |
| src/pages/tools/CalculatorRecommender.jsx | wire | import:src/pages/tools/CalculatorRecommender.jsx |
| src/pages/tools/Calculators.jsx | legacy | import:src/pages/tools/Calculators.jsx |
| src/pages/tools/CardiologyAssistantPage.jsx | wire | import:src/pages/tools/CardiologyAssistantPage.jsx |
| src/pages/tools/cardiologyCalculators.jsx | legacy | import:cardiologyCalculators |
| src/pages/tools/ClinicalAudit.jsx | wire | import:src/pages/tools/ClinicalAudit.jsx |
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
| src/pages/tools/PsychiatryAssistantPage.jsx | wire | import:src/pages/tools/PsychiatryAssistantPage.jsx |
| src/pages/tools/psychiatryScreeningCalculators.jsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/PulmonologyAssistantPage.jsx | wire | import:src/pages/tools/PulmonologyAssistantPage.jsx |
| src/pages/tools/pulmonologyCalculators.jsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/sourceBackedClinicalCalculators.jsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/TimelineAi.jsx | wire | import:src/pages/tools/TimelineAi.jsx |
| src/pages/tools/ToolNotFound.jsx | legacy | import:./pages/tools/ToolNotFound |
| src/pages/tools/ToolPageLayout.jsx | legacy | import:src/pages/tools/ToolPageLayout.jsx |
| src/pages/tools/ToolsAreaFallback.jsx | legacy | import:ToolsAreaFallback |
| src/pages/TrainingDashboard.jsx | wire | import:src/pages/TrainingDashboard.jsx |
| src/pages/Version.jsx | legacy | import:Version |
| src/pages/WorkflowAutomationBuilder.jsx | legacy | import:WorkflowAutomationBuilder |
| src/pages/WorkspaceHome.jsx | legacy | import:src/pages/WorkspaceHome |

## Orphan components

| Component | Class | Evidence |
| --- | --- | --- |
| src/components/whiteboard/operationalHandoffArtifactRegistry.js | quarantine | No production import |

## Dashboards

_None detected._

## Simulations

_None detected._

## Laboratory modules

| Module | Class | Evidence |
| --- | --- | --- |
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
| POST /api/emergency/copilot/query | legacy | Backend-only route (no SPA client) |
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
| docs/architecture/route-config-pruning-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/scenario-fixture-validation.md | quarantine | No inbound links from README, src, or other docs |

_… and 163 more doc files._

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.js`

