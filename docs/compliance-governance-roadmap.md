# CareDroid Compliance and Governance Roadmap

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** AI governance, audit trails, privacy center, consent management, human review queue, risk classification, model/version tracking, data retention, PHI handling, access control, and security events.  
**Goal:** Prepare CareDroid for hospital and enterprise conversations by defining the minimum viable enterprise controls and the roadmap to mature them.  
**Non-goal:** This document does not claim HIPAA compliance, HITRUST certification, SOC 2 readiness, FDA clearance, or production PHI approval.

## Executive Summary

CareDroid already has important governance ingredients: audit, compliance, platform governance, LLM security, regulatory, privacy center, human review, EHR audit, permissions, authentication, organizations, workspaces, and platform assets. The enterprise gap is not naming the modules. The gap is turning them into enforceable, auditable, tenant-scoped controls across every clinical, AI, operational, and commercial surface.

The minimum enterprise posture should be:

```text
Every user action and AI action
  -> tied to organization, workspace, user, role, asset, risk, and data source
  -> checked against entitlement, permission, consent, retention, and safety policy
  -> logged with appropriate audit detail
  -> reviewable by authorized administrators
```

## Current Module Map

| Area | Current source | Roadmap role |
| --- | --- | --- |
| Audit trails | [`backend/src/modules/audit`](../backend/src/modules/audit) | Canonical audit event recording and retrieval |
| Compliance APIs | [`backend/src/modules/compliance`](../backend/src/modules/compliance) | Compliance dashboard and policy checks |
| Platform governance | [`backend/src/modules/platform-governance`](../backend/src/modules/platform-governance) | AI governance, model inventory, risk state, review metadata |
| Governance shell | [`backend/src/modules/governance`](../backend/src/modules/governance) | Broader governance domain boundary |
| LLM security | [`backend/src/modules/llm-security`](../backend/src/modules/llm-security) | Prompt, response, tool-call, and model safety controls |
| Regulatory | [`backend/src/modules/regulatory`](../backend/src/modules/regulatory) | Intended use, classification, evidence, approval workflows |
| Human review | [`backend/src/modules/human-review`](../backend/src/modules/human-review) | Review queue for clinical, AI, governance, and simulation outputs |
| Privacy center | [`backend/src/modules/privacy-center`](../backend/src/modules/privacy-center) | Privacy controls, data subject requests, consent visibility |
| EHR audit | [`backend/src/modules/ehr-audit`](../backend/src/modules/ehr-audit) | EHR access and interoperability audit |
| Permissions | [`backend/src/modules/permissions`](../backend/src/modules/permissions) | Effective permissions by role, workspace, and explicit grants |
| Organizations | [`backend/src/modules/organizations`](../backend/src/modules/organizations) | Tenant membership, admin checks, onboarding, entitlement owner |
| Workspaces | [`backend/src/modules/workspaces`](../backend/src/modules/workspaces) | Workspace scope, membership, operational context |
| Platform assets | [`backend/src/modules/platform-assets`](../backend/src/modules/platform-assets) | Asset risk, lifecycle, governance metadata, pack entitlement |

## Governance Module Map

The governance layer should be split into clear domains.

### AI Governance

Owns:

- AI asset registry.
- Model and version registry.
- Intended use.
- Risk classification.
- Validation status.
- Human review policy.
- Safety gate configuration.
- RAG source review.
- AI usage and safety metrics.

### Clinical Governance

Owns:

- Clinical tool risk classification.
- Calculator/protocol validation status.
- Clinical decision support guardrails.
- Review and escalation rules.
- Source and guideline versioning.
- Clinical safety incident tracking.

### Operational Governance

Owns:

- Device, telemetry, fleet, map, and alert workflow policies.
- Stale data rules.
- Demo/live labeling.
- Device and operational action audit.
- Incident command review.

### Product Governance

Owns:

- Asset lifecycle: draft, active, deprecated, admin-only.
- Pack membership.
- Feature flag state.
- Organization entitlement changes.
- Subscription and commercial plan effects.
- Release readiness.

### Education Governance

Owns:

- Simulation rubric versioning.
- OSCE review policy.
- Competency sign-off.
- Learner data retention.
- Faculty approval workflows.

## Security Module Map

Security controls should be defined around identity, authorization, data, AI, integration, and monitoring.

| Security area | Controls |
| --- | --- |
| Identity | SSO, MFA, biometric setup where available, device fingerprinting, session policy |
| Authorization | global roles, organization membership, workspace membership, effective permissions, asset entitlement |
| Data protection | encryption, retention policy, PHI minimization, export controls, deletion policy |
| AI security | prompt injection defense, tool-call validation, model approval, output safety filters |
| Integration security | FHIR/HL7/API credentials, source allowlists, webhook validation, vendor access review |
| Operational security | device security events, telemetry anomalies, fleet source integrity |
| Monitoring | audit logs, security events, alerting, observability, anomaly reports |
| Administration | admin action audit, pack install/remove audit, feature flag audit, role changes |

## Minimum Viable Enterprise Controls

Before hospital procurement conversations, CareDroid should be able to demonstrate:

1. Tenant boundary: every organization-scoped API proves membership or explicit admin permission.
2. Workspace boundary: operational data and collaboration are scoped to workspaces.
3. Asset boundary: visible and launchable assets come from entitlements and access policy.
4. Role boundary: global, organization, workspace, and role profile layers have distinct meanings.
5. Audit trail: security, clinical, AI, administrative, and operational actions create audit records.
6. AI governance: model class, model version, agent, asset, safety outcome, and review outcome are traceable.
7. Human review: high-risk AI outputs and official simulation scoring require review.
8. Consent and privacy visibility: users and admins can see relevant consent/privacy state.
9. Data retention policy: organization-level retention defaults are configurable and documented.
10. Demo/live labeling: demo data cannot be mistaken for production hospital monitoring.
11. Admin exports: authorized admins can export audit and governance evidence.
12. Incident readiness: security events and governance exceptions have owners and states.

## Compliance Risk Matrix

| Risk | Severity | Current concern | Roadmap control |
| --- | --- | --- | --- |
| Tenant data exposure | Critical | Organization IDs can appear in broad platform APIs | Enforce membership checks and org-scoped reads everywhere |
| AI unsafe recommendation | Critical | AI workflows span clinical and operational decisions | Risk classification, safety gates, human review, audit |
| PHI leakage in logs | Critical | Prompt/response and analytics events may contain sensitive context | PHI-minimized events, explicit retention policy, secure raw trace storage |
| Demo data misrepresented | High | Digital Twin, IoT, fleet, and simulation may use seeded data | Dataset-level demo/live labeling and commercial readiness states |
| Weak audit coverage | High | Audit exists but needs consistent event taxonomy | Canonical audit event model and required audit policy per asset |
| Permission overreach | High | Permission union behavior may expand access in SaaS flows | Entitlement-first narrowing before role and permission allow |
| AI model drift | High | Model routing and versions need approval state | Model/version registry, release gates, evaluation records |
| Human review backlog | Medium | High-risk outputs need review ownership | Review queue SLAs, assignments, escalation, metrics |
| RAG source staleness | Medium | Clinical retrieval requires source lifecycle | Source registry, versioning, review status, citation quality |
| Device/fleet action ambiguity | Medium | Operational recommendations could imply autonomous control | Human-confirmed workflows and action audit |
| Simulation assessment misuse | Medium | AI scoring could imply certification | Rubric versioning and faculty sign-off |
| Analytics privacy risk | Medium | Product metrics can become behavioral surveillance | Aggregation, minimization, admin policy, retention limits |

## Audit Trail Requirements

Audit events should be consistent across modules.

Minimum audit envelope:

- `eventId`
- `eventType`
- `organizationId`
- `workspaceId`
- `userId`
- `actorRole`
- `assetId`
- `resourceType`
- `resourceId`
- `action`
- `outcome`
- `riskLevel`
- `ipAddress` or device/session reference where appropriate
- `createdAt`
- `metadata`

Required audit families:

- Authentication and session events.
- Organization membership and role changes.
- Workspace membership and permission changes.
- Pack install/remove and entitlement changes.
- Asset lifecycle changes.
- Feature flag changes.
- AI launches, model routing, RAG retrieval, tool calls, safety gates, and human review.
- Clinical calculator/protocol executions where risk policy requires it.
- Digital Twin, device, telemetry, fleet, alert, and workflow actions.
- Simulation assessment, rubric, sign-off, and export actions.
- Privacy, consent, export, retention, and deletion events.
- Security events and administrative exports.

## Privacy And Consent

Privacy controls should cover both patient/clinical data and user/workforce data.

Minimum capabilities:

- Consent status visibility.
- Consent history.
- Privacy notice and policy acknowledgment.
- User preference and communication consent.
- Data export request workflow.
- Deletion or de-identification request workflow where applicable.
- Organization retention defaults.
- PHI handling policy for prompts, responses, logs, and analytics events.

Consent should not be treated as a universal authorization override. Access still flows through tenant, workspace, role, permission, asset, and purpose-of-use controls.

## Human Review Queue

The human review queue should support clinical, operational, simulation, AI, and governance use cases.

Review item fields:

- `reviewId`
- `organizationId`
- `workspaceId`
- `assetId`
- `agentId`
- `sourceType`
- `sourceId`
- `riskLevel`
- `reason`
- `assignedTo`
- `status`
- `dueAt`
- `decision`
- `decisionReason`
- `createdAt`
- `completedAt`

Review statuses:

- pending
- assigned
- in_review
- approved
- edited
- rejected
- escalated
- expired

Review queues should expose volume, SLA, reviewer workload, rejection reasons, and recurring policy failures.

## Risk Classification

Every asset should carry risk metadata:

| Risk level | Examples | Controls |
| --- | --- | --- |
| Low | navigation, basic education, product help | basic audit, disclaimers |
| Medium | calculators, lab explanations, simulation coaching | audit, source/version metadata, clinician or faculty awareness |
| High | CDS, order-set support, emergency escalation, official scoring | human review, strict audit, approved models, validation record |
| Critical | autonomous clinical or operational control | not allowed without explicit separate regulatory and safety program |

Risk metadata should include intended use, excluded use, validation status, owner, review cadence, and known limitations.

## Model And Version Tracking

Model tracking should include:

- provider
- model family
- model version or deployment ID
- approved use classes
- prohibited use classes
- release date
- evaluation record
- safety notes
- fallback model
- retirement date
- owner

Model usage records should connect each AI response to model class and version without storing raw PHI by default.

## Data Retention

Retention should be configurable by organization and data class.

Data classes:

- Audit events.
- AI usage metrics.
- Raw AI prompts/responses.
- RAG retrieval traces.
- Tool-call parameters and outputs.
- Simulation assessment data.
- Device telemetry.
- Fleet and location history.
- Consent/privacy records.
- Security events.

Retention policy should define:

- default duration
- legal hold behavior
- export behavior
- deletion/de-identification behavior
- admin visibility
- PHI sensitivity

## PHI Handling

PHI handling requirements:

- Default analytics events should not store raw PHI.
- Raw AI prompt/response retention must be disabled or restricted unless organization policy enables it.
- Clinical memory requires explicit controls and retention.
- RAG source and citation logs should use source IDs and metadata rather than patient content where possible.
- Exports containing PHI require role checks, audit, purpose, and retention metadata.
- Demo environments must not imply real PHI support.

## Access Control

Access checks should be layered:

```text
Authenticated user
  -> global security role
  -> organization membership
  -> workspace membership
  -> asset entitlement
  -> asset permission policy
  -> feature flag and lifecycle state
  -> risk and review policy
```

Rules:

- Entitlements narrow product access.
- Workspaces narrow operational context.
- Role profiles personalize and recommend; they do not grant unauthorized access.
- Feature flags roll out behavior; they do not replace authorization.
- Deep links should resolve to allowed, locked, restricted, admin-only, or unavailable states.

## Security Events

Security event categories:

- authentication failure
- MFA setup/change
- suspicious session
- role or permission change
- organization membership change
- export/download
- failed authorization
- integration credential event
- prompt injection attempt
- blocked tool call
- unusual AI usage
- device security anomaly
- telemetry source anomaly
- audit export

Security event dashboards should support filtering by organization, workspace, user, asset, event class, severity, and time.

## Implementation Phases

### Phase 1: Control Inventory

- Inventory governance controls by module.
- Define canonical audit event envelope.
- Add required governance fields to asset metadata.
- Label module maturity: implemented, partial, shell, missing.
- Document demo/live and PHI readiness status.

### Phase 2: Tenant And Asset Enforcement

- Enforce organization membership on organization-scoped reads and writes.
- Route asset launch through the same access policy across UI, direct links, and AI tool calling.
- Separate entitlement, workspace, role profile, permission, lifecycle, and feature flag decisions.
- Add locked/restricted/admin-only states.

### Phase 3: AI And Clinical Governance

- Add model/version registry.
- Add risk classification to AI and clinical assets.
- Enforce human review rules for high-risk workflows.
- Record AI safety, RAG, tool-call, and model routing audit events.

### Phase 4: Privacy And Retention

- Add organization retention policies.
- Define PHI-safe analytics and audit defaults.
- Add privacy/consent workflows and admin visibility.
- Add export and deletion/de-identification workflows.

### Phase 5: Enterprise Evidence

- Build governance dashboards.
- Add compliance evidence exports.
- Add security event dashboards.
- Add review SLA and audit completeness metrics.
- Prepare procurement-ready control summaries.

## Acceptance Criteria

- Governance, security, compliance, audit, privacy, human review, and regulatory modules have explicit ownership.
- Every enterprise-facing asset has risk, lifecycle, governance, audit, and review metadata.
- Organization-scoped reads prove membership or admin authority.
- AI model/version, routing, safety outcome, and review outcome are auditable.
- PHI-sensitive logs, prompts, responses, analytics events, and exports have retention and access policies.
- Minimum viable enterprise controls can be demonstrated without claiming certifications the product has not earned.

