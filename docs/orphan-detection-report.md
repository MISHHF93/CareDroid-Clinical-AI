# Orphan Detection Report

Generated: 2026-07-01 (regenerate with `npm run orphan-detection:write-docs`)

## Classification key

| Class | Meaning |
|-------|---------|
| **wire** | Reachable in product intent (nav/inventory) but missing route, import, or API contract |
| **merge** | Duplicate surface or overlapping module � consolidate |
| **quarantine** | No production consumer � archive or delete after review |
| **legacy** | Redirect, alias, gated stub, or deprecated path kept for compatibility |

## Executive summary

| Metric | Count |
|--------|------:|
| Total orphan findings | 279 |
| App.jsx routes | 243 |
| Orphan / gap routes | 92 |
| Orphan pages | 0 |
| Orphan components | 0 |
| Domain module findings (dashboard / simulation / lab / 3D) | 0 |
| Orphan services | 0 |
| Executor contract gaps | 0 |
| API orphans / stubs | 141 |
| Weakly linked markdown | 46 |
| **wire** | 85 |
| **merge** | 0 |
| **quarantine** | 37 |
| **legacy** | 157 |

## Merge candidates (explicit)

| ID | Primary | Duplicate | Note |
|----|---------|-----------|------|
| dashboard-dual-home | src/pages/CommandDashboard.jsx | removed: src/pages/Dashboard.jsx | Former assistant page duplicate removed; ED Copilot now lives in src/components/ChatInterface.jsx. |
| pack-marketplace-dual | src/pages/organization/OrganizationPages.jsx (PackMarketplace) | /asset-packs vs /settings/organization/packs | Intentional dual context: product discovery and organization entitlement management share PackMarketplace. |
| notification-services-dual | src/services/NotificationService.ts | src/test/fixtures/legacyNotificationService.ts | Legacy queue-style client moved to test fixtures; active app client is src/services/NotificationService.ts. |

## Critical findings

1. **Simulation / lab / 3D workspace styles** � `SimulationLaboratoryViewer.css` is an intentional shared style module for active demo pages; no missing page component is required. Class: **legacy**.
2. **AI agents / platform APIs** � platform/product clients are represented in `frontendApiCallsInventory`; current scan has no **wire** findings.
3. **Chart/export components** � legacy barrel-only components have been removed; keep new chart surfaces route-owned. Class: **resolved**.
4. **Dual registry** � hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.

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
| /automation-audit | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /automation-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /protocols | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /documentation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /clinical-decision-support | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /credentials | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /digital-twin-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /marketplace | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /enterprise-readiness | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /trackmind | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /trackmind-maturity | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /enterprise-platform | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-admin | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /timeline | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /workspace-dependency-graph | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /plugins | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /dependency-map | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /dependency-graph | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /data-lineage | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /self-diagnostics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /governance-registry | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /artifacts | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-models | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /ai-evaluation | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-learning-engine | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /brain | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /business-brain | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /organization-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /tenant-admin/workspaces | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/packs | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/assets | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /platform-analytics | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /department-intelligence | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
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
| /integrations-marketplace | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /integration-readiness | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /solution-builder | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /configuration-studio | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /welcome | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /onboarding | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /settings/organization/ | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /privacy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/ai | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/phi | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/integrations | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /audit/policy | wire | In navigation.config / CANONICAL_ROUTES but no exact App.jsx route |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /clinical-decision-support | wire | toolInventory route not registered in App.jsx |
| /credentials | wire | toolInventory route not registered in App.jsx |
| /integrations/fhir | wire | toolInventory route not registered in App.jsx |
| /integrations/hl7 | wire | toolInventory route not registered in App.jsx |
| /integrations/source-provenance | wire | toolInventory route not registered in App.jsx |
| /artifacts | wire | toolInventory route not registered in App.jsx |
| /costs | wire | toolInventory route not registered in App.jsx |
| /ai-evaluation | wire | toolInventory route not registered in App.jsx |
| /ai-memory | wire | toolInventory route not registered in App.jsx |
| /audit/ai | wire | toolInventory route not registered in App.jsx |
| /training | wire | toolInventory route not registered in App.jsx |
| /review | wire | toolInventory route not registered in App.jsx |
| /protocols | wire | toolInventory route not registered in App.jsx |
| /documentation | wire | toolInventory route not registered in App.jsx |
| /lab | legacy | Redirect or alias route in App.jsx |
| /medical-simulation | legacy | Redirect or alias route in App.jsx |
| /laboratory | legacy | Redirect or alias route in App.jsx |
| /chat | legacy | Redirect or alias route in App.jsx |
| /home | legacy | Redirect or alias route in App.jsx |
| /workspace | legacy | Redirect or alias route in App.jsx |
| /anatomy-viewer | legacy | Redirect or alias route in App.jsx |

## Orphan pages

_None detected._

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
| chat-messages-sync | legacy | Gated stub � intentional no-op until backend exists |
| chat-conversations-sync | legacy | Gated stub � intentional no-op until backend exists |
| tools-share-results | legacy | Gated stub � intentional no-op until backend exists |
| notifications-stream | legacy | Gated stub � intentional no-op until backend exists |
| notifications-send-channel | legacy | Gated stub � intentional no-op until backend exists |
| team-users | legacy | Gated stub � intentional no-op until backend exists |
| team-user-update | legacy | Gated stub � intentional no-op until backend exists |
| team-user-delete | legacy | Gated stub � intentional no-op until backend exists |
| team-invite | legacy | Gated stub � intentional no-op until backend exists |
| bulk-sync | legacy | Gated stub � intentional no-op until backend exists |
| clinical-alerts-stream | legacy | Gated stub � intentional no-op until backend exists |
| emergency-capacity-history | legacy | Gated stub � intentional no-op until backend exists |
| emergency-queue-analytics | legacy | Gated stub � intentional no-op until backend exists |
| emergency-shift-report-export | legacy | Gated stub � intentional no-op until backend exists |
| emergency-referral-history | legacy | Gated stub � intentional no-op until backend exists |
| emergency-transfer-status | legacy | Gated stub � intentional no-op until backend exists |
| emergency-diversion-status | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-session-create | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-manual-entry | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-document | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-ocr | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-match | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-verify-field | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-link-patient | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-create-patient | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-continue-unknown | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-ems-evidence | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-reconcile-unknown | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-biometric-consent | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-biometric-consent-withdraw | legacy | Gated stub � intentional no-op until backend exists |
| emergency-smart-intake-audit-log | legacy | Gated stub � intentional no-op until backend exists |
| exports-pdf | legacy | Gated stub � intentional no-op until backend exists |
| exports-excel | legacy | Gated stub � intentional no-op until backend exists |
| reports-generate | legacy | Gated stub � intentional no-op until backend exists |
| reports-schedule-create | legacy | Gated stub � intentional no-op until backend exists |
| reports-schedule-cancel | legacy | Gated stub � intentional no-op until backend exists |
| GET /api/emergency/patients/:patientId/workflow-logs | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/copilot/query | legacy | Backend-only route (no SPA client) |
| GET /api/emergency/copilot/interactions | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/copilot/interactions | legacy | Backend-only route (no SPA client) |
| GET /api/emergency/clinical-calculators/results | legacy | Backend-only route (no SPA client) |
| POST /api/emergency/clinical-calculators/results | legacy | Backend-only route (no SPA client) |
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
| POST /api/platform/users/me/pinned-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| POST /api/platform/users/me/hidden-assets | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/assets/:assetId | legacy | Platform/product API is deferred and not frontend-inventory wired |
| GET /api/platform/packs/:packId | legacy | Platform/product API is deferred and not frontend-inventory wired |

_� and 21 more API rows._

## Orphan markdown (weak inbound links)

| Doc | Class | Evidence |
| --- | --- | --- |
| docs/architecture/button-clickability-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/calculator-tool-mounting-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/clickable-map-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/component-mounting-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/emergency-os-ui-connectivity-validation.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/layout-routing-consolidation-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/path-connectivity-report.md | legacy | No inbound links from README, src, or other docs |
| docs/architecture/ui-surface-compression.md | quarantine | No inbound links from README, src, or other docs |
| docs/architecture/workflow-launcher-report.md | legacy | No inbound links from README, src, or other docs |
| docs/caredroid-vnext-refinement-audit.md | quarantine | No inbound links from README, src, or other docs |
| docs/duplicate-system-audit.md | legacy | No inbound links from README, src, or other docs |
| docs/emergency-demo-environment.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-demo-mode.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-os-master-implementation-report.md | quarantine | No inbound links from README, src, or other docs |
| docs/emergency-resource-board.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/caredroid-master-user-manual.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/charge-nurse.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/demo-observer.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/emergency-physician.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/hospital-administrator.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/it-administrator.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/lab-technician.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/paramedic.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/patient-flow-coordinator.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/pharmacist.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/quality-safety-officer.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/radiology-technician.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/reception-clerk.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/registered-nurse.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/specialist.md | quarantine | No inbound links from README, src, or other docs |
| docs/manuals/roles/triage-nurse.md | quarantine | No inbound links from README, src, or other docs |
| docs/responsive-regression-coverage.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/ai-chief-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/alert-lifecycle-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/component-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/current-codebase-findings.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/data-model-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/full-emergency-care-journey.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/page-map.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/role-permission-map.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/route-map.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/saas-service-journey-map.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/service-bottleneck-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/three-minute-response-spec.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/visual-responsive-standards.md | quarantine | No inbound links from README, src, or other docs |
| docs/specs/workflow-map.md | quarantine | No inbound links from README, src, or other docs |

## Appendix

- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)
- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)
- Generator: `src/data/orphanDetectionAudit.ts`

