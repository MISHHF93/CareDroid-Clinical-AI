# Orphan Detection Report

Generated: 2026-08-26 (regenerate with `npm run orphan-detection:write-docs`)

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
| Total orphan findings | 174 |
| App.jsx routes | 392 |
| Orphan / gap routes | 10 |
| Orphan pages | 27 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 2 |
| Orphan services | 0 |
| Executor contract gaps | 0 |
| API orphans / stubs | 125 |
| Weakly linked markdown | 10 |
| **wire** | 0 |
| **merge** | 0 |
| **quarantine** | 0 |
| **legacy** | 174 |

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
| /home | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /medical-simulation | legacy | Redirect or alias route in App.jsx |
| /anatomy-viewer | legacy | Redirect or alias route in App.jsx |
| /chat | legacy | Redirect or alias route in App.jsx |
| /login | legacy | Redirect or alias route in App.jsx |
| /signin | legacy | Redirect or alias route in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /laboratory/* | legacy | Redirect or alias route in App.jsx |

## Orphan pages

| Page file | Class | Evidence |
| --- | --- | --- |
| src/pages/commercial/CommercialPageShell.tsx | legacy | import:CommercialPageShell |
| src/pages/emergency/emergencyRouteShared.tsx | legacy | import:src/pages/emergency/emergencyRouteShared |
| src/pages/emergency/shift/shiftSummaryData.ts | legacy | import:shiftSummaryData |
| src/pages/legal/index.ts | legacy | import:index |
| src/pages/team/index.ts | legacy | import:index |
| src/pages/tools/abcd2Calculator.tsx | legacy | import:abcd2Calculator |
| src/pages/tools/calculatorPrimitives.tsx | legacy | import:calculatorPrimitives |
| src/pages/tools/Calculators.tsx | legacy | import:src/pages/tools/Calculators.tsx |
| src/pages/tools/cardiologyCalculators.tsx | legacy | import:cardiologyCalculators |
| src/pages/tools/emergencyCriticalCareCalculators.tsx | legacy | import:emergencyCriticalCareCalculators |
| src/pages/tools/endocrineMetabolicCalculators.tsx | legacy | import:endocrineMetabolicCalculators |
| src/pages/tools/hepatologyGiCalculators.tsx | legacy | import:hepatologyGiCalculators |
| src/pages/tools/hospitalOperationsCalculators.tsx | legacy | import:hospitalOperationsCalculators |
| src/pages/tools/lazySpecialtyCalculators.tsx | legacy | import:lazySpecialtyCalculators |
| src/pages/tools/mentalHealthCalculators.tsx | legacy | import:src/pages/tools/mentalHealthCalculators.tsx |
| src/pages/tools/nephrologyCalculators.tsx | legacy | import:nephrologyCalculators |
| src/pages/tools/neurologyCalculators.tsx | legacy | import:neurologyCalculators |
| src/pages/tools/nextWaveCalculators.tsx | legacy | import:nextWaveCalculators |
| src/pages/tools/pediatricsObgynCalculators.tsx | legacy | import:src/pages/tools/pediatricsObgynCalculators.tsx |
| src/pages/tools/pr4aCalculators.tsx | legacy | import:src/pages/tools/pr4aCalculators.tsx |
| src/pages/tools/pr8ClinicalBatchCalculators.tsx | legacy | import:pr8ClinicalBatchCalculators |
| src/pages/tools/psychiatryScreeningCalculators.tsx | legacy | import:psychiatryScreeningCalculators |
| src/pages/tools/pulmonologyCalculators.tsx | legacy | import:pulmonologyCalculators |
| src/pages/tools/sourceBackedClinicalCalculators.tsx | legacy | import:sourceBackedClinicalCalculators |
| src/pages/tools/ToolNotFound.tsx | legacy | import:./pages/tools/ToolNotFound |
| src/pages/tools/ToolPageLayout.tsx | legacy | import:src/pages/tools/ToolPageLayout.tsx |
| src/pages/tools/ToolsAreaFallback.tsx | legacy | import:ToolsAreaFallback |

## Orphan components

_None detected._

## Dashboards

_None detected._

## Simulations

_None detected._

## Laboratory modules

_None detected._

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
| emergency-diversion-status | legacy | Gated stub — intentional no-op until backend exists |
| exports-pdf | legacy | Gated stub — intentional no-op until backend exists |
| exports-excel | legacy | Gated stub — intentional no-op until backend exists |
| reports-generate | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub — intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub — intentional no-op until backend exists |
| GET /api/emergency/public-waiting-snapshot | legacy | Backend-only route (no SPA client) |
| PATCH /api/emergency/patients/:patientId | legacy | Backend-only route (no SPA client) |
| PATCH /api/emergency/patients/:patientId/staff | legacy | Backend-only route (no SPA client) |
| PATCH /api/emergency/patients/:patientId/escalate | legacy | Backend-only route (no SPA client) |
| GET /api/emergency/patients/:patientId/workflow-logs | legacy | Backend-only route (no SPA client) |
| PATCH /api/emergency/ems/arrivals/:arrivalId/status | legacy | Backend-only route (no SPA client) |
| GET /api/emergency/staff | legacy | Backend-only route (no SPA client) |
| PATCH /api/emergency/staff/:staffId/duty-status | legacy | Backend-only route (no SPA client) |
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
| GET /api/profile/me/preferences | legacy | Backend-only route (no SPA client) |
| GET /api/profile/me/activity | legacy | Backend-only route (no SPA client) |
| GET /api/profile/me/security | legacy | Backend-only route (no SPA client) |
| GET /api/workspaces | legacy | Backend-only route (no SPA client) |
| POST /api/workspaces | legacy | Backend-only route (no SPA client) |
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
| GET /api/personalization/me | legacy | Backend-only route (no SPA client) |
| PATCH /api/personalization/me | legacy | Backend-only route (no SPA client) |
| GET /api/personalization/me/recommendations | legacy | Backend-only route (no SPA client) |
| POST /api/personalization/me/saved-prompts | legacy | Backend-only route (no SPA client) |
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
| GET /api/ai-feedback | legacy | Backend-only route (no SPA client) |
| GET /api/surface-views | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/registry | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/safety-rules | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/compliance | legacy | Backend-only route (no SPA client) |
| GET /api/v1/governance/violations | legacy | Backend-only route (no SPA client) |
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
| GET /api/platform-governance/summary | legacy | Platform/product API is deferred and not frontend-inventory wired |

_… and 5 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/archive/CAREDROID_ARCHITECTURE_CLEANUP_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/CLINICAL_PROCESS_SAAS_HARMONIZATION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/INTERACTION_EXECUTION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/PLATFORM_MODERNIZATION_REPORT.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/02-dependency-map.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/03-orphaned-code.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/04-rbac-permission-matrix.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/05-information-architecture.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/reception-upgrade/NEW_HEADER_INTEGRATION_GUIDE.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |
| docs/archive/SCORECARD-archive-2026-07-23-cycles-1-157.md | legacy | Intentionally archived/unlinked historical record — already reviewed, kept for git history |

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.ts`

