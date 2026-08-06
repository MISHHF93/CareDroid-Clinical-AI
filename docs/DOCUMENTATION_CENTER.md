# CareDroid Documentation Center

> The canonical index into every piece of CareDroid documentation — product, architecture, API, data model, AI platform, operations, and role guides. Start here.

CareDroid is a single-application emergency department (ED) operating platform. For the product pitch, suite taxonomy, and a 5-minute local quick start, read the [root README](../README.md) first — this Documentation Center goes deeper on architecture, APIs, data, deployment, and governance, and organizes the ~90 existing documents in `docs/` so you don't have to guess which one is current.

**A note on freshness:** several sections of this platform's documentation are auto-generated from source (see [Living Documentation](#living-documentation-source-of-truth) below) and regenerate on every `npm run docs:generate`. Where a generated doc exists, it is the source of truth — the hand-written docs linked here either explain *why* something is built the way it is, or cover ground the generator doesn't (architecture rationale, API contracts across both route systems, deployment, data model, glossary).

---

## Start here by role

| I am a(n)... | Start with |
|---|---|
| **New developer** | [Getting Started](#getting-started) → [Developer Guide](developer-guide.md) → [Platform Architecture Overview](architecture/platform-architecture-overview.md) |
| **Backend/API engineer** | [API Reference](api/api-reference.md) → [Data Model Reference](data-model/data-model-reference.md) → [AI Platform Guide](ai/ai-documentation.md) |
| **Frontend engineer** | [Platform Architecture Overview](architecture/platform-architecture-overview.md) (§Frontend) → [Developer Guide](developer-guide.md) → [generated/routes.md](generated/routes.md), [generated/components.md](generated/components.md) |
| **IT / systems administrator** | [Deployment Guide](deployment-guide.md) → [Configuration Reference](configuration-reference.md) → [`it-administrator.md`](manuals/roles/it-administrator.md) |
| **Hospital / ED administrator** | [`hospital-administrator.md`](manuals/roles/hospital-administrator.md) → [Product Overview](../README.md#product-suites) → [generated/roles.md](generated/roles.md), [generated/permissions.md](generated/permissions.md) |
| **Clinician (physician, nurse, paramedic, etc.)** | Your role manual under [`docs/manuals/roles/`](manuals/roles/) → [Master User Manual](manuals/caredroid-master-user-manual.md) |
| **Compliance / quality & safety officer** | [`quality-safety-officer.md`](manuals/roles/quality-safety-officer.md) → [Governance & Security Guide](#governance-security--compliance) → [Glossary](glossary.md) |
| **AI/ML engineer** | [AI Platform Guide](ai/ai-documentation.md) → [AI Features Reference](AI_FEATURES.md) → `backend/ml-services/` (NLU + artifact-router training pipelines) |
| **Product / project manager** | [Product Overview](../README.md) → [generated/README.md](generated/README.md) (living metrics) → [Known Documentation Debt](#known-documentation-debt) |
| **Executive** | [Product Overview](../README.md) → [`executive-guide.md`](users/executive-guide.md) |

---

## Getting Started

CareDroid is one Vite + React frontend plus one NestJS backend, run together with `npm start`. The root README covers the full quick start (install, env, run, demo walkthrough) — see:

- [Quick start](../README.md#quick-start) — install, env templates, `npm start`, focused dev commands
- [Demo walkthrough](../README.md#demo-walkthrough) — a 6-step tour through Reception → Whiteboard → EMS → Copilot → Tools → Pulse
- [Environment configuration](../README.md#environment-configuration) — frontend/backend `.env` essentials (full reference: [Configuration Reference](configuration-reference.md))
- [Testing](../README.md#testing) and [Docker](../README.md#docker) — see also the deeper [Deployment Guide](deployment-guide.md)

---

## Product Overview

- [README — What makes CareDroid different, product suites, active clinical surfaces, hospital roles, calculators](../README.md)
- [generated/roles.md](generated/roles.md) — all 11 modeled roles with generated metadata (frontend also models 23 fine-grained hospital roles — see [Platform Architecture Overview §RBAC](architecture/platform-architecture-overview.md#authorization--rbac))
- [generated/workflows.md](generated/workflows.md) — the 21 generated workflow/automation records
- [Full Emergency Care Journey](specs/full-emergency-care-journey.md) — mission and clinical-safety principles behind the 20-stage 911→outcome journey
- [specs/saas-service-journey-map.md](specs/saas-service-journey-map.md) — per-service implementation status (Existing/Extended/Runtime stub) for every service backing the journey, keyed to `fullEmergencyCareJourneyService.ts`
- [specs/service-bottleneck-spec.md](specs/service-bottleneck-spec.md) — tracked-service patient-impact levels and degradation detection, keyed to `bottleneckRegistry.ts`
- [specs/three-minute-response-spec.md](specs/three-minute-response-spec.md) — the 3-minute critical-alert ownership timer spec, keyed to `threeMinuteTimerEngine.ts`
- [specs/visual-responsive-standards.md](specs/visual-responsive-standards.md) — cross-device typography, layout, and touch-target standards

---

## Platform Architecture

- **[Platform Architecture Overview](architecture/platform-architecture-overview.md)** — **new, canonical**: how the frontend, backend, AI layer, and data stores fit together, with diagrams. Start here for any cross-cutting architectural question.
- [architecture/system-architecture.md](architecture/system-architecture.md) — earlier reverse-engineered architecture snapshot
- [architecture/current-state-report.md](architecture/current-state-report.md), [architecture/project-audit.md](architecture/project-audit.md), [architecture/current-system-inventory.md](architecture/current-system-inventory.md) — dated audit snapshots (useful for history, not current-state reference — prefer the Overview above)
- [architecture/backend-frontend-tool-contract.md](architecture/backend-frontend-tool-contract.md), [architecture/tool-contract-matrix.md](architecture/tool-contract-matrix.md) — generated contract matrices (regen via `npm run contract:write-docs`)
- [architecture/feature-coverage-matrix.md](architecture/feature-coverage-matrix.md) — generated feature coverage (regen via `npm run feature-coverage-matrix:write-docs`)
- [architecture/platform-inventory.md](architecture/platform-inventory.md) — generated platform inventory (regen via `npm run inventory:report`)
- [duplicate-system-audit.md](duplicate-system-audit.md), [orphan-detection-report.md](orphan-detection-report.md) — audits of competing/orphaned code paths
- [enterprise-subsystems-capability-map.md](enterprise-subsystems-capability-map.md) — hand-written capability audit against `research.md`'s 14 proposed enterprise subsystems (FHIR/HL7 interop, MPI, adaptive intake forms, consent/privacy, clinical knowledge registry, CDS Hooks, clinical safety, AI execution gateway, OCR, digital twin, imaging, NACRS reporting, human-factors lab, regulatory registry) — audit only, no implementation started
- [architecture/RECEPTION_WORKSPACE_REFERENCE.md](architecture/RECEPTION_WORKSPACE_REFERENCE.md) — the Reception workspace as the canonical architectural template (route → screen mode → role → KPI layering) for building any other role workspace
- [architecture/emergency-resource-board.md](architecture/emergency-resource-board.md) — the resource-board concept (rooms, stretchers, monitors, telemetry, infusion pumps) and how its acceptance criteria map onto the existing `/emergency/capacity`, `/emergency/ems`, and `/emergency/analytics` routes rather than a standalone page

---

## Developer Guide

**[Developer Guide](developer-guide.md)** — repo layout gotchas (two `lib/` dirs, one consolidated backend route system), path aliases, testing infrastructure (Vitest/Jest/Playwright), coding conventions, and the living-documentation generator.

---

## API Reference

**[API Reference](api/api-reference.md)** — **new, canonical**: consolidates both API surfaces (legacy Express routers under `backend/src/api/` and ~65 NestJS modules) into one reference, plus the MCP server. Cross-references:

- [generated/apis.md](generated/apis.md) — 50 generated API↔page-binding records (frontend consumption view)
- Swagger/OpenAPI UI — `http://localhost:5190/api/docs` when running locally
- [architecture/backend-frontend-tool-contract.md](architecture/backend-frontend-tool-contract.md) — tool-calling contract between frontend and backend

---

## Data Model Reference

**[Data Model Reference](data-model/data-model-reference.md)** — **new, canonical**: every TypeORM entity (relational) and Mongoose model (clinical patient domain), grouped by module, with the dual-persistence rationale explained.

- [specs/data-model-spec.md](specs/data-model-spec.md) — earlier conceptual data model (canonical identity fields) — complementary reading, not exhaustive

---

## AI Platform Guide

- [ai/ai-documentation.md](ai/ai-documentation.md) — generated AI documentation from `backend/src/modules/ai*`, medical-control-plane, `src/lib/ai/`
- [AI_FEATURES.md](AI_FEATURES.md) — the 17 AI services, governance posture, per-service model configuration
- [AI_PATIENT_INTAKE.md](AI_PATIENT_INTAKE.md) — AI-assisted patient intake pipeline and staff-verification safety boundary
- [artifact-intelligence-pipeline-report.md](artifact-intelligence-pipeline-report.md) — the artifact-cataloging pipeline that feeds the artifact-router ML model
- [generated/ai-capabilities.md](generated/ai-capabilities.md) — 10 generated AI capability records
- Unified AI Node (NLU intent classifier + artifact-router), MCP clinical-tool server, and the 3-phase intent-classification pipeline are documented in the [Platform Architecture Overview §AI Platform](architecture/platform-architecture-overview.md#ai-platform)

---

## User Guides (by clinical/operational role)

Two parallel sets of role documentation exist — see [Known Documentation Debt](#known-documentation-debt) for the reconciliation plan. Until merged, treat `docs/manuals/roles/` as the fuller "mission-framed" reference and `docs/users/` as the shorter guide-style companion.

- [Master User Manual](manuals/caredroid-master-user-manual.md) — all roles, v2.0
- [`docs/manuals/roles/`](manuals/roles/) — [charge-nurse](manuals/roles/charge-nurse.md), [demo-observer](manuals/roles/demo-observer.md), [emergency-physician](manuals/roles/emergency-physician.md), [hospital-administrator](manuals/roles/hospital-administrator.md), [it-administrator](manuals/roles/it-administrator.md), [lab-technician](manuals/roles/lab-technician.md), [paramedic](manuals/roles/paramedic.md), [patient-flow-coordinator](manuals/roles/patient-flow-coordinator.md), [pharmacist](manuals/roles/pharmacist.md), [quality-safety-officer](manuals/roles/quality-safety-officer.md), [radiology-technician](manuals/roles/radiology-technician.md), [reception-clerk](manuals/roles/reception-clerk.md), [registered-nurse](manuals/roles/registered-nurse.md), [specialist](manuals/roles/specialist.md), [triage-nurse](manuals/roles/triage-nurse.md)
- [`docs/users/`](users/) — administrator, charge-nurse, developer, executive, it-admin, patient-flow-coordinator, physician, quality-safety, reception, specialist, triage-nurse

---

## Administrator Guide

- [`hospital-administrator.md`](manuals/roles/hospital-administrator.md), [`administrator-guide.md`](users/administrator-guide.md)
- [`it-administrator.md`](manuals/roles/it-administrator.md), [`it-admin-guide.md`](users/it-admin-guide.md)
- [generated/permissions.md](generated/permissions.md), [generated/roles.md](generated/roles.md) — canonical permission/role records
- [Configuration Reference](configuration-reference.md), [Deployment Guide](deployment-guide.md)

---

## Governance, Security & Compliance

- [README §Security & governance](../README.md#security--governance) — tenant isolation, RBAC, audit logging, AI governance, secrets posture (**note: CareDroid does not claim HIPAA/PHIPA certification** — see that section for the exact scope)
- [operations/saas-compliance-audit.md](operations/saas-compliance-audit.md) — SaaS architecture compliance audit
- Backend governance modules: `platform-governance`, `ai-governance`, `llm-security`, `regulatory`, `privacy-center`, `human-review` — see [API Reference §Governance](api/api-reference.md#governance--compliance)
- `platform_governance_policies`, `clinical_release_gates`, `clinical_safety_findings`, `platform_consent_records` and related entities — see [Data Model Reference §Governance](data-model/data-model-reference.md#governance--compliance-entities)
- [enterprise-subsystems-capability-map.md](enterprise-subsystems-capability-map.md) — confirms `compliance.service.ts`'s and `platform-governance.service.ts`'s consent stores are independently real but disconnected (split-authority, no shared write path), and that `Permission.BREAK_GLASS_ACCESS`/`breakGlassAllowed` are defined and documented but never checked by any guard — a live false-assurance gap, not merely an absent feature
- **[INTENDED_USE_BOUNDARY_v1.md](INTENDED_USE_BOUNDARY_v1.md)** — the P0.3 release-gate intended-use boundary statement (decision support only, human review required, explicit not-positioned-as list). **Draft awaiting CMIO/clinical-safety reviewer sign-off — not yet an approved boundary.**

---

## Deployment & Configuration

- **[Deployment Guide](deployment-guide.md)** — **new, canonical**: the three `docker-compose*.yml` profiles, `Dockerfile`s, Vercel deployment, and the 7 GitHub Actions workflows explained together
- **[Configuration Reference](configuration-reference.md)** — **new, canonical**: every environment variable, grouped by concern, frontend and backend
- [config/](../config/) — Prometheus, Alertmanager, Grafana (9 dashboards), Kibana, Logstash configuration files

---

## Testing Guide

Covered in the [Developer Guide §Testing Infrastructure](developer-guide.md#testing-infrastructure): Vitest (frontend, ~950 test files), Jest (backend + root integration), Playwright (3 configs: responsive QA, canonical routes, production smoke), and the `qa/` audit-artifact scripts.

- [tool-render-execute-manual-qa.md](tool-render-execute-manual-qa.md) — manual QA checklist for wired clinical & fleet tools, run after `npm run test:e2e-matrix` passes; canonical source is `src/data/e2eManualQaChecklist.ts`

---

## Troubleshooting & FAQ

**[Troubleshooting & FAQ](troubleshooting-faq.md)** — common local-dev issues (port conflicts, SQLite vs. Postgres, AI features silently disabled, Mongoose Emergency-OS runtime toggle) and answers to platform-shape questions.

---

## Glossary

**[Glossary](glossary.md)** — clinical acronyms (CTAS, ESI, DPS, SOFA, NEWS2...), platform-specific terms (Journey State, Unified AI Node, Artifact Router, Tenant vs. Organization vs. Workspace), and role/permission vocabulary.

---

## Architecture Decision Records (ADRs)

**[docs/adr/](adr/README.md)** — **new**: records the *why* behind major, already-made architectural decisions found in the codebase (NLU migration off Python, dual SQLite/Postgres + optional Mongoose runtime, Unified AI Node, in-house design system). These are retroactive ADRs — write new ones going forward for any comparably significant decision.

---

## Operations

- [operations/emergency-demo-environment.md](operations/emergency-demo-environment.md), [operations/emergency-demo-mode.md](operations/emergency-demo-mode.md) — **overlapping**, see [Known Documentation Debt](#known-documentation-debt)
- [operations/emergency-pilot-readiness.md](operations/emergency-pilot-readiness.md) — first hospital ED pilot readiness assessment
- [operations/saas-compliance-audit.md](operations/saas-compliance-audit.md)
- [operations/surge-mongo-local-setup.md](operations/surge-mongo-local-setup.md) — reproducible path to a real MongoDB for `SurgeCapacityService` (mass-casualty/disaster-surge logic); no MongoDB is provisioned by default in this repo

---

## Roadmap / Release Notes / Changelog

No `CHANGELOG.md`, `ROADMAP.md`, or tagged-release process currently exists in this repository. Release-shaped signal today comes from: `.github/workflows/release.yml` (a release workflow exists but no changelog artifact was found it produces), `docs/BACKEND_MIGRATION_REPORT.md` (the Python→TypeScript backend migration, marked complete), and commit history. **Recommendation:** if release notes matter to your audience (customers, pilot hospitals), introduce a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) conventions going forward — this is flagged as a gap, not filled with invented history.

---

## Living Documentation (source of truth)

`docs/generated/` is regenerated from source via `npm run docs:generate` (validate freshness with `npm run docs:check`). It supersedes several older hand-written docs — see [`docs/generated/superseded-manifest.json`](generated/superseded-manifest.json) for the exact mapping:

| Generated doc | Records | Supersedes |
|---|---:|---|
| [routes.md](generated/routes.md) | 16 | `specs/page-map.md`, `specs/route-map.md` |
| [apis.md](generated/apis.md) | 50 | `architecture/endpoint-to-frontend-matrix.md` |
| [roles.md](generated/roles.md) | 11 | — |
| [permissions.md](generated/permissions.md) | 37 | `specs/role-permission-map.md` |
| [workflows.md](generated/workflows.md) | 21 | `workflows/patient-journey.md`, `specs/full-emergency-care-journey.md` (phases only — the mission/principles content in that spec is not superseded) |
| [services.md](generated/services.md) | 32 | `services/service-catalog.md` |
| [ai-capabilities.md](generated/ai-capabilities.md) | 10 | `specs/ai-chief-spec.md` |
| [components.md](generated/components.md) | 12 | — |
| [configuration.md](generated/configuration.md) | 82 | — |
| [contextual-help.md](generated/contextual-help.md) | 14 | — |

Files marked `> **SUPERSEDED**` at the top still exist in the repo for historical traceability — do not treat them as current.

---

## Known Documentation Debt

Findings from the research pass behind this Documentation Center, flagged rather than silently fixed (each needs a judgment call this pass didn't have the context to make safely):

1. **Duplicate role guides** — `docs/manuals/roles/*.md` (15 files, "3-minute response" mission framing) and `docs/users/*.md` (11 files, shorter guide style) cover overlapping roles (charge nurse, IT admin, patient-flow coordinator, quality/safety, reception, specialist, triage nurse, hospital admin/administrator). Recommend picking one canonical home per role and redirecting the other, rather than maintaining both.
2. **Duplicate demo-mode specs** — `operations/emergency-demo-environment.md` and `operations/emergency-demo-mode.md` appear to cover the same "First Customer Demo Mode" concept. Recommend merging.
3. **`agent-tools/` at repo root is not an agent-tool registry** — it's ~82 UUID-named session-transcript `.txt` files and a few screenshots (gitignored, some pre-existing commits). It should not be confused with the real tool registries (`lib/ai/toolRegistry.ts`, `backend/src/modules/medical-control-plane/tool-orchestrator/`). Candidate for cleanup.
4. **No CHANGELOG/ROADMAP** — see [Roadmap section](#roadmap--release-notes--changelog) above.
5. **Two RBAC models that don't share code** — the backend's actual enforced RBAC (`UserRole`: `PHYSICIAN | NURSE | STUDENT | ADMIN`, in `backend/src/modules/auth/`) is coarser than and independent from the frontend's 22–23-role hospital RBAC (`src/lib/users/`), which is a client-side mirror used only as a last-resort fallback. This is a real architectural fact, not a doc bug, but it is easy to misread the frontend role list as backend-enforced — see [Platform Architecture Overview §Authorization](architecture/platform-architecture-overview.md#authorization--rbac) for the precise relationship.
