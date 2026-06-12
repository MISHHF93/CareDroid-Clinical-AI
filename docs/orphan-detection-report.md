# Orphan Detection Report

Generated: 2026-06-12 (regenerate with `npm run orphan-detection:write-docs`)

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
| Total orphan findings | 298 |
| App.jsx routes | 279 |
| Orphan / gap routes | 9 |
| Orphan pages | 38 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 3 |
| Orphan services | 1 |
| Executor contract gaps | 0 |
| API orphans / stubs | 137 |
| Weakly linked markdown | 110 |
| **wire** | 0 |
| **merge** | 0 |
| **quarantine** | 109 |
| **legacy** | 189 |

## Merge candidates (explicit)

| ID | Primary | Duplicate | Note |
|----|---------|-----------|------|
| dashboard-dual-home | src/pages/CommandDashboard.jsx | removed: src/pages/Dashboard.jsx | Former assistant page duplicate removed; ED Copilot now lives in src/components/ChatInterface.jsx. |
| pack-marketplace-dual | src/pages/organization/OrganizationPages.jsx (PackMarketplace) | /asset-packs vs /settings/organization/packs | Intentional dual context: product discovery and organization entitlement management share PackMarketplace. |
| notification-services-dual | src/services/NotificationService.js | src/services/notifications/NotificationService.js | Nested service is legacy queue-style compatibility only; active app client is src/services/NotificationService.js. |

## Critical findings

1. **`SimulationLaboratoryViewer.jsx`** — missing; tests and CSS reference a removed page. Class: **quarantine**.
2. **AI agents / platform APIs** — platform/product clients are represented in `frontendApiCallsInventory`; current scan has no **wire** findings.
3. **Chart/export components** — legacy barrel-only components have been removed; keep new chart surfaces route-owned. Class: **resolved**.
4. **Dual registry** — hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.

## Orphan routes

| Route | Class | Evidence |
| --- | --- | --- |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /login | legacy | Redirect or alias route in App.jsx |
| /signin | legacy | Redirect or alias route in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /chat | legacy | Redirect or alias route in App.jsx |
| /medical-simulation | legacy | Redirect or alias route in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |
| /anatomy-viewer | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/Auth.jsx | legacy | import:src/pages/Auth.jsx |
| src/pages/AutomationAnalytics.jsx | legacy | import:AutomationAnalytics |
| src/pages/commercial/CommercialPageShell.jsx | legacy | import:CommercialPageShell |
| src/pages/emergency/DepartmentPulse.jsx | legacy | import:pages/emergency/DepartmentPulse |
| src/pages/fleet/FleetDashboardWidgets.jsx | legacy | import:src/pages/fleet/FleetDashboardWidgets.jsx |
| src/pages/fleet/FleetPageChrome.jsx | legacy | import:./pages/fleet/FleetPageChrome |
| src/pages/fleet/PredictiveMaintenanceWidgets.jsx | legacy | import:PredictiveMaintenanceWidgets |
| src/pages/fleet/RouteOptimizerWidgets.jsx | legacy | import:RouteOptimizerWidgets |
| src/pages/legal/index.js | legacy | import:index |
| src/pages/Patients.jsx | legacy | import:src/pages/Patients.jsx |
| src/pages/platform/components/PlatformWorkflowPrimitives.jsx | legacy | import:PlatformWorkflowPrimitives |
| src/pages/PlatformLearningEngine.jsx | legacy | import:PlatformLearningEngine |
| src/pages/Settings.jsx | legacy | import:src/pages/Settings.jsx |
| src/pages/team/index.js | legacy | import:index |
| src/pages/tools/abcd2Calculator.jsx | legacy | import:abcd2Calculator |
| src/pages/tools/calculatorPrimitives.jsx | legacy | import:calculatorPrimitives |
| src/pages/tools/Calculators.jsx | legacy | import:src/pages/tools/Calculators.jsx |
| src/pages/tools/cardiologyCalculators.jsx | legacy | import:cardiologyCalculators |
| src/pages/tools/emergencyCriticalCareCalculators.jsx | legacy | import:emergencyCriticalCareCalculators |
| src/pages/tools/endocrineMetabolicCalculators.jsx | legacy | import:endocrineMetabolicCalculators |
| src/pages/tools/hepatologyGiCalculators.jsx | legacy | import:hepatologyGiCalculators |
| src/pages/tools/hospitalOperationsCalculators.jsx | legacy | import:hospitalOperationsCalculators |
| src/pages/tools/mentalHealthCalculators.jsx | legacy | import:src/pages/tools/mentalHealthCalculators.jsx |
| src/pages/tools/nephrologyCalculators.jsx | legacy | import:nephrologyCalculators |
| src/pages/tools/neurologyCalculators.jsx | legacy | import:neurologyCalculators |
| src/pages/tools/nextWaveCalculators.jsx | legacy | import:nextWaveCalculators |
| src/pages/tools/pediatricsObgynCalculators.jsx | legacy | import:pediatricsObgynCalculators |
| src/pages/tools/pr4aCalculators.jsx | legacy | import:src/pages/tools/pr4aCalculators.jsx |
| src/pages/tools/pr8ClinicalBatchCalculators.jsx | legacy | import:pr8ClinicalBatchCalculators |
| src/pages/tools/psychiatryScreeningCalculators.jsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/pulmonologyCalculators.jsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/sourceBackedClinicalCalculators.jsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/ToolNotFound.jsx | legacy | import:./pages/tools/ToolNotFound |
| src/pages/tools/ToolPageLayout.jsx | legacy | import:src/pages/tools/ToolPageLayout.jsx |
| src/pages/tools/ToolsAreaFallback.jsx | legacy | import:ToolsAreaFallback |
| src/pages/tools/ToolsOverview.jsx | legacy | import:src/pages/tools/ToolsOverview.jsx |
| src/pages/WorkflowAutomationBuilder.jsx | legacy | import:WorkflowAutomationBuilder |
| src/pages/WorkspaceHome.jsx | legacy | import:src/pages/WorkspaceHome |

## Orphan components

_None detected._

## Dashboards

_None detected._

## Simulations

| Module | Class | Evidence |
| --- | --- | --- |
| src/pages/SimulationLaboratoryViewer.jsx | quarantine | Referenced in tests/docs but page module never existed; only .css remains |

## Laboratory modules

_None detected._

## 3D viewer code

_None detected._

## Orphan services

| Service | Class | Evidence |
| --- | --- | --- |
| src/services/emergencyRealtimeService.js | quarantine | No production import of service module |

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
| emergency-analytics | legacy | Gated stub — intentional no-op until backend exists |
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
| exports-pdf | legacy | Gated stub — intentional no-op until backend exists |
| exports-excel | legacy | Gated stub — intentional no-op until backend exists |
| reports-generate | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub — intentional no-op until backend exists |
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
| POST /api/tools/execute | legacy | Backend-only route (no SPA client) |
| POST /api/tool-calling/execute | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/catalog | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/resolve | legacy | Backend-only route (no SPA client) |
| GET /api/tool-calling/logs | legacy | Backend-only route (no SPA client) |
| POST /api/cost-optimizer/route | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/metrics | legacy | Backend-only route (no SPA client) |
| GET /api/evaluation/runs | legacy | Backend-only route (no SPA client) |
| POST /api/drugs | legacy | Backend-only route (no SPA client) |
| PUT /api/drugs/:id | legacy | Backend-only route (no SPA client) |
| DELETE /api/drugs/:id | legacy | Backend-only route (no SPA client) |
| GET /api/protocols/:id | legacy | Backend-only route (no SPA client) |
| POST /api/protocols | legacy | Backend-only route (no SPA client) |
| PUT /api/protocols/:id | legacy | Backend-only route (no SPA client) |
| DELETE /api/protocols/:id | legacy | Backend-only route (no SPA client) |
| POST /api/compliance/export | legacy | Backend-only route (no SPA client) |
| POST /api/health | legacy | Backend-only route (no SPA client) |
| POST /api/ai/query | legacy | Backend-only route (no SPA client) |
| POST /api/ai/structured | legacy | Backend-only route (no SPA client) |
| GET /api/ai/usage | legacy | Backend-only route (no SPA client) |
| GET /api/audit/events | legacy | Backend-only route (no SPA client) |
| GET /api/audit/events/:eventId | legacy | Backend-only route (no SPA client) |
| POST /api/audit/export | legacy | Backend-only route (no SPA client) |
| GET /api/audit/integrity/status | legacy | Backend-only route (no SPA client) |
| POST /api/audit/integrity/verify | legacy | Backend-only route (no SPA client) |
| GET /api/audit/patients/:patientId/access | legacy | Backend-only route (no SPA client) |
| POST /api/platform/users/me/pinned-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/users/me/hidden-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/assets/:assetId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/packs/:packId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/role-profiles/:id | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/organizations/:organizationId/entitlements | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/organizations/:organizationId/packs/:packId/install | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/organizations/:organizationId/packs/:packId/remove | legacy | Platform/product API is deferred and not frontend-inventory wired |

_… and 17 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/dashboard-context-note-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/dashboard-to-asset-compression-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/dead-end-elimination-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/demo-live-state-reconciliation.md | legacy | No inbound links from README, src, or other docs |
| docs/department-asset-mapping-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/department-performance-intelligence-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/digital-twin-intelligence-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/door-to-doctor-intelligence.md | quarantine | No inbound links from README, src, or other docs |
| docs/ed-ai-copilot-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/ed-automation-marketplace-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/ed-onboarding-experience.md | quarantine | No inbound links from README, src, or other docs |
| docs/ed-roi-calculator-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/ed-workflow-command-center.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-analytics-mvp.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-capacity-intelligence-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-command-center-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-copilot-everywhere.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-demo-environment.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-demo-mode.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-department-operating-system-final.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-department-operating-system-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-escalation-engine.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-flow-intelligence-platform.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-kpi-layer.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-mvp-packaging-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-os-first-customer-execution-sequence.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-patient-path.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-progressive-disclosure.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-queue-intelligence-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-resource-board.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-simulation-scenarios.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-workspace-flattening-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/ems-offload-command-center.md | quarantine | No inbound links from README, src, or other docs |
| docs/ems-prearrival-workspace-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/enterprise-identity-layer.md | quarantine | No inbound links from README, src, or other docs |
| docs/enterprise-readiness-center-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/entropy-reduction-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/environment-management.md | quarantine | No inbound links from README, src, or other docs |
| docs/executive-command-center-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/feature-flag-platform-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/first-customer-path.md | quarantine | No inbound links from README, src, or other docs |
| docs/first-ed-customer-readiness-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/frontend-entropy-compression-final.md | quarantine | No inbound links from README, src, or other docs |
| docs/frontend-flattening-master-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/frontend-normalization-final-pass.md | quarantine | No inbound links from README, src, or other docs |
| docs/frontend-operating-system-refactor.md | quarantine | No inbound links from README, src, or other docs |
| docs/healthcare-integration-automation-report.md | legacy | No inbound links from README, src, or other docs |
| docs/healthcare-knowledge-hub-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/hospital-readiness-assessment-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/hospital-solution-builder.md | quarantine | No inbound links from README, src, or other docs |
| docs/information-architecture-refactor.md | quarantine | No inbound links from README, src, or other docs |
| docs/integration-readiness-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/marketplace-foundation-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/mobile-first-recovery-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/navigation-anxiety-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/navigation-compression-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/nested-frontend-detection-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/onboarding-wizard-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/one-action-principle-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/one-screen-emergency-workflow.md | quarantine | No inbound links from README, src, or other docs |

_… and 50 more doc files._

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.js`

