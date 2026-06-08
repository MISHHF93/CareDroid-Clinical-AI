# Automation Commercialization Matrix

Generated: 2026-06-06

## Purpose

Commercialize CareDroid automations as sellable SaaS assets. Each automation must map to a department, buyer, asset pack, product, subscription tier, organization type, role, outcome, and risk level so entitlements, role visibility, and product pages can treat automations like first-class commercial assets.

## Packaging Principles

- Automations are assets, not hidden behavior. Each automation needs a stable asset ID and pack assignment.
- High-risk clinical workflow automation must remain human-review gated. Packaging can sell the workflow, but execution must not bypass clinical review.
- Operational automations can create tasks, notifications, and review queue items. They must not control devices or modify clinical records directly.
- Governance and audit automations belong in enterprise/government packaging and should be visible only to administrative, compliance, security, or governance roles.
- Packaging must be organization-neutral. Hospital-specific thresholds, routing teams, and escalation contacts belong in tenant configuration, not asset metadata.

## Matrix

| Automation asset ID | Automation | Department | Buyer | Asset pack | Product | Subscription tier | Organization type | Role | Outcome | Risk level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `automation-news2-clinician-notification` | High NEWS2 escalation | Emergency Department / ICU | ED Director, CMO, ICU Medical Director | Emergency Department Pack, ICU Pack | Emergency Flow Intelligence Platform / ICU Suite | Professional, Enterprise | Hospital, Health System, Government Hospital | Emergency physician, nurse, intensivist | Earlier deterioration review and escalation | High-risk clinical workflow; human review required |
| `automation-device-offline-maintenance` | Device offline automation | Biomedical Engineering / Operations | Biomedical Engineering Lead, COO | Medical IoT Pack | Medical IoT Solution | Enterprise | Hospital, Health System | Biomedical engineer, clinical engineer, operations admin | Faster device downtime triage and maintenance ticketing | Operational |
| `automation-potassium-lab-workflow` | Abnormal potassium lab workflow | Laboratory / Emergency Department | Laboratory Director, CMO, ED Director | Laboratory Pack, Emergency Department Pack | Laboratory Suite / Emergency Flow Intelligence Platform | Professional, Enterprise | Hospital, Health System, Reference Lab | Pathologist, lab manager, emergency physician, pharmacist | Critical result review with repeat/trend workflow | High-risk clinical workflow; human review required |
| `automation-audit-event-review` | Audit automation | Compliance / Governance | Compliance Officer, CIO, Chief Privacy Officer | Governance Pack | Governance & Compliance Solution | Enterprise, Government | Hospital, Health System, Government, Academic Medical Center | Compliance officer, administrator, security analyst | Faster audit review and exception detection | Governance required |
| `automation-integration-unsupported-labeling` | Unsupported integration labeling | Clinical Informatics / IT / Governance | CIO, CMIO, Integration Lead | Governance Pack, AI Workflow Pack | Governance & Compliance Solution / AI Workflow Pack | Enterprise, Government | Hospital, Health System, Government | Integration analyst, administrator, compliance officer | Clear labeling and auditability for unsupported FHIR/HL7/LIS/telemetry events | Governance required |

## Entitlement Model

| Pack | Included automation asset IDs | Default entitlement state |
| --- | --- | --- |
| `emergency-department-pack` | `automation-news2-clinician-notification`, `automation-potassium-lab-workflow` | Review-required for clinical roles; hidden from non-clinical roles |
| `icu-pack` | `automation-news2-clinician-notification` | Review-required for ICU clinical roles |
| `medical-iot-pack` | `automation-device-offline-maintenance` | Available to biomedical engineering and operations roles |
| `laboratory-intelligence` | `automation-potassium-lab-workflow` | Review-required for lab and clinical review roles |
| `governance-compliance-pack` | `automation-audit-event-review`, `automation-integration-unsupported-labeling` | Enterprise/government only; admin/compliance/security roles |
| `ai-workflow-pack` | `automation-integration-unsupported-labeling` | Enterprise/government only; admin/integration roles |

## Dashboard Cards

| Card | Packs | Route | Audience |
| --- | --- | --- | --- |
| Clinical automation review | Emergency Department Pack, ICU Pack, Laboratory Pack | `/automation` | ED, ICU, lab, and quality leaders |
| Device automation queue | Medical IoT Pack | `/medical-iot` | Biomedical engineering and operations |
| Governance automation controls | Governance Pack, AI Workflow Pack | `/audit/automation` | Compliance, security, governance, and administrators |

## Acceptance Criteria

- Every automation has an asset ID and at least one pack assignment.
- Every automation has at least one subscription tier.
- Restricted governance and high-risk clinical automations are hidden from unauthorized roles.
- Automation assets appear in the expected product and pack views.
- Clinical automations remain human-review gated.
