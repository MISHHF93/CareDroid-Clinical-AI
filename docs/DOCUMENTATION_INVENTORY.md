# CareDroid Documentation Inventory

Generated: 2026-06-28

This inventory maps the documentation set to the current source tree. The implementation remains the source of truth; these documents describe the React/NestJS application that is present in this repository.

## Product Discovery

| Document | Purpose | Source anchors |
|---|---|---|
| `docs/PRODUCT_DISCOVERY_REPORT.md` | Product reverse-engineering report and deliverables index. | `src/app/router.tsx`, `src/components/AppShell.tsx`, `backend/src/` |
| `docs/PLATFORM_INVENTORY.md` | Platform module and route inventory. | `src/config/routes.config.ts`, `src/data/platformInventory.ts` |
| `docs/gap-analysis.md` | Mission-alignment gaps and priorities. | Emergency routes, services, help config |
| `docs/PRODUCT_IMPROVEMENT_PLAN.md` | Traceable implementation roadmap after this reforging pass. | Current docs and changed files |

## Architecture

| Document | Purpose |
|---|---|
| `docs/architecture/system-architecture.md` | Frontend, backend, routing, state, AI, and service architecture. |
| `docs/architecture/current-system-inventory.md` | Current route/component/service inventory. |
| `docs/architecture/project-audit.md` | Broader technical audit. |
| `docs/architecture/*report.md` | Focused route, layout, UI, and connectivity reports. |

## Pages, Services, AI

| Document | Purpose |
|---|---|
| `docs/pages/page-specifications.md` | Emergency page specifications and known issues. |
| `docs/services/service-catalog.md` | Service catalog for ED, SaaS, AI, and platform services. |
| `docs/ai/ai-documentation.md` | AI intent, safety, review, and fallback documentation. |

## Role Manuals

| Role manual | Implementation role mapping |
|---|---|
| `docs/users/executive-guide.md` | Executive / ED manager analytics view. |
| `docs/users/reception-guide.md` | `registration_clerk`. |
| `docs/users/triage-nurse-guide.md` | `triage_nurse`. |
| `docs/users/charge-nurse-guide.md` | `charge_nurse`. |
| `docs/users/physician-guide.md` | `physician`. |
| `docs/users/specialist-guide.md` | Physician plus referral workflows. |
| `docs/users/patient-flow-coordinator-guide.md` | ED manager / charge nurse flow workflows. |
| `docs/users/administrator-guide.md` | `admin`. |
| `docs/users/it-admin-guide.md` | Admin plus system health, settings, and deployment. |
| `docs/users/developer-guide.md` | Repo, scripts, routing, tests, and contribution workflow. |
| `docs/users/ai-chief-guide.md` | Copilot, AI safety, and human-review workflow. |
| `docs/users/quality-safety-guide.md` | Alerts, reassessment, audit, and KPI review. |

## Workflows

| Workflow document | Primary implementation anchors |
|---|---|
| `docs/workflows/patient-journey.md` | Reception, intake, whiteboard, queues, referrals, discharge. |
| `docs/workflows/three-minute-response.md` | Alerts, reassessment, EMS, whiteboard, Copilot. |
| `docs/workflows/critical-alert.md` | `ClinicalAlertsPage`, alert engine, critical banner. |
| `docs/workflows/escalation.md` | Reception escalation, patient flags, reassessment, alerts. |
| `docs/workflows/department-routing.md` | Queue assignment, route permissions, navigation. |
| `docs/workflows/staff-assignment.md` | Whiteboard staff/room assignment. |
| `docs/workflows/patient-handoff.md` | Reception handoff, EMS handoff, shift summary. |
| `docs/workflows/discharge.md` | Patient disposition, referrals, documentation assistant. |
| `docs/workflows/analytics.md` | Analytics, Pulse, capacity, shift summary. |

## Operations

| Document | Purpose |
|---|---|
| `docs/operations/runbook.md` | Daily operating runbook. |
| `docs/deployment/deployment-guide.md` | Local/build/deploy commands. |
| `docs/training/onboarding-guide.md` | Role onboarding and guided demo path. |
| `docs/troubleshooting/common-issues.md` | Known operational and developer troubleshooting. |
| `docs/release-notes/2026-06-28-reforging.md` | This reforging pass release note. |

