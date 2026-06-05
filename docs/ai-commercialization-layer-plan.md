# CareDroid AI Commercialization Layer Plan

**Status:** Planning baseline  
**Date:** 2026-06-05  
**Scope:** Packaging, governing, metering, routing, and selling CareDroid AI capabilities.  
**Goal:** Decide how AI capabilities should become commercial products without bypassing clinical safety, audit, organization entitlements, or cost controls.  
**Non-goal:** This document does not implement billing, model routing, safety policy, or production clinical claims.

## Executive Summary

CareDroid should sell AI as governed capabilities inside solution packs, not as an unbounded chat feature. The commercial unit is an AI-enabled asset or agent that belongs to a pack, runs through the AI Gateway, resolves organization/workspace/role access, produces audit and usage records, and routes to standard or premium models according to risk, tier, and cost policy.

The existing backend already exposes the right technical foundation:

- AI Gateway and foundation services in [`backend/src/modules/ai`](../backend/src/modules/ai).
- MoE routing in [`backend/src/modules/moe-router`](../backend/src/modules/moe-router).
- RAG and citation services in [`backend/src/modules/rag`](../backend/src/modules/rag).
- Tool calling in [`backend/src/modules/tool-calling`](../backend/src/modules/tool-calling).
- AI memory in [`backend/src/modules/memory`](../backend/src/modules/memory).
- Cost optimization in [`backend/src/modules/cost-optimizer`](../backend/src/modules/cost-optimizer).
- Evaluation in [`backend/src/modules/evaluation`](../backend/src/modules/evaluation).
- Governance, LLM security, audit, human review, and regulatory modules registered in [`backend/src/app.module.ts`](../backend/src/app.module.ts).

The product gap is not lack of AI modules. The gap is commercial control: every AI launch needs a product identity, usage meter, tier policy, safety class, review rule, cost policy, and audit trail.

```text
Organization entitlement
  -> workspace and role profile
  -> AI asset / agent access
  -> safety and governance policy
  -> routing and cost policy
  -> usage, audit, review, and analytics records
```

## AI Product Model

The AI commercialization layer should use the same SaaS hierarchy defined in [SaaS Bottleneck Architecture Plan](./saas-bottleneck-architecture-plan.md):

```text
Commercial plan
  -> product / suite
  -> asset pack
  -> AI asset or AI agent
  -> AI Gateway / MoE / RAG / tool calling / memory
```

AI should be packaged in three forms:

| Product form | Examples | Commercial behavior |
| --- | --- | --- |
| AI agents | Clinical AI, Emergency AI, Lab AI, Fleet AI, Governance AI, Research AI | Entitled by pack, personalized by role, routed through Assistant. |
| AI workflows | Triage summary, documentation assistant, guideline RAG, simulation debrief, order-set support | Entitled as launchable assets with workflow-specific safety policy. |
| AI platform capabilities | RAG, memory, tool calling, premium model routing, evaluation, audit exports | Sold as tier features or enterprise add-ons. |

AI assets should carry:

- `assetId`
- `agentId` when the asset is a persona or assistant mode
- `organizationId`
- `workspaceId`
- `userId`
- `roleProfileId`
- `riskLevel`
- `intendedUse`
- `modelPolicy`
- `usagePolicy`
- `reviewPolicy`
- `auditPolicy`
- `retentionPolicy`

## AI Agents

Seeded AI agents should become the first commercial agent catalog:

- `agent-clinical`: general clinical reasoning, calculator guidance, protocol navigation, patient summary support.
- `agent-emergency`: ED triage, deterioration, trauma, stroke, ACS, and emergency protocol workflows.
- `agent-lab`: lab interpretation, ABG reasoning, critical value summaries, and quality review.
- `agent-operations`: hospital capacity, alerts, maps, device state, staffing, and incident context.
- `agent-fleet`: dispatch context, route risk, vehicle status, maintenance risk, and EMS handoff summaries.
- `agent-education`: simulation tutoring, debriefing, competency coaching, and OSCE support.
- `agent-research`: guideline RAG, evidence synthesis, cohort logic, citations, and explainability.
- `agent-governance`: audit review, risk classification, policy checks, model inventory, and human review triage.

Each agent should have a commercial profile:

| Agent | Default pack | Standard capability | Premium capability |
| --- | --- | --- | --- |
| Clinical AI | `core-platform`, `ai-workflow-pack` | General assistant, calculator guidance, low-risk summaries | Patient-context synthesis, multi-document RAG, premium CDS routing |
| Emergency AI | `emergency-department-pack` | Protocol and score guidance | Time-sensitive multi-signal triage and handoff synthesis |
| Lab AI | `laboratory-intelligence` | Lab explanation and calculator recommendation | Trend analysis, abnormality clusters, quality-control anomaly review |
| Operations AI | `hospital-operations`, `digital-twin-pack` | Operational summaries and alert explanations | Digital twin correlation, capacity forecasting, incident planning |
| Fleet AI | `fleet-logistics` | Fleet status and route explanation | Dispatch recommendation, predictive maintenance synthesis |
| Education AI | `simulation-training-pack` | Tutor prompts and debrief summaries | Adaptive remediation plans and OSCE scoring support |
| Research AI | `research-education` | Citation-backed evidence retrieval | Cohort-aware synthesis and explainability workflows |
| Governance AI | `governance-compliance-pack` | Policy checklists and audit summaries | Risk classification, review queue prioritization, compliance evidence assembly |

## Subscription Tiers

AI tiers should not only differ by model quality. They should differ by governance, context size, workflow scope, integrations, and reporting.

| Tier | Included AI | Limits | Best fit |
| --- | --- | --- | --- |
| Core | Assistant, search, basic calculator guidance, low-risk agent prompts | Low monthly prompt and token allowance, no PHI production use unless contracted | Trials, demos, small clinics |
| Standard | Pack-specific agents, RAG, tool calling for entitled tools, basic analytics | Moderate usage caps, standard model routing, workspace-level reporting | Clinics, universities, standard specialty deployments |
| Enterprise | Premium routing, larger context windows, organization analytics, governance exports, SSO-integrated audit | Contracted limits, overage controls, human review workflows | Hospitals, health systems, EMS, enterprise research |
| Add-on | Governance AI, simulation tutor, digital twin AI, advanced documentation AI, premium model pack | Capability-specific quotas and approval workflows | Buyers with specialized needs |

## Usage Limits

Usage should be metered at organization, workspace, asset, agent, user, and model levels.

Minimum usage counters:

- AI launches by `assetId` and `agentId`.
- Prompt count, completion count, token count, and estimated cost.
- RAG retrieval count, document count, citation count, and rerank count.
- Tool-call count, validation failures, execution failures, and recovery path.
- Memory reads/writes by memory type.
- Premium model invocations.
- Human review submissions and completions.
- Safety blocks, policy warnings, and escalation events.

Limit policies:

- Core tier: low default monthly usage, no premium routing by default, strict demo labeling.
- Standard tier: pack-level usage allowance, standard model routing, limited RAG corpus size.
- Enterprise tier: organization-level contracted allowance, premium routing pools, role-based overrides, hard and soft caps.
- Add-ons: separate quotas for high-cost or high-risk capabilities such as documentation AI, simulation tutor, digital twin correlation, and governance AI exports.

## Metering Events

Every AI interaction should produce a privacy-safe usage event and, when clinically or operationally relevant, an audit event.

Recommended event families:

- `ai.launch_requested`
- `ai.access_denied`
- `ai.prompt_submitted`
- `ai.route_selected`
- `ai.rag_retrieved`
- `ai.tool_call_requested`
- `ai.tool_call_completed`
- `ai.memory_read`
- `ai.memory_written`
- `ai.response_generated`
- `ai.safety_gate_triggered`
- `ai.human_review_requested`
- `ai.user_feedback_recorded`
- `ai.cost_recorded`

Event payloads should store IDs and classifications, not raw PHI:

- `organizationId`
- `workspaceId`
- `assetId`
- `agentId`
- `userRole`
- `roleProfileId`
- `riskLevel`
- `modelClass`
- `routingReason`
- `usageUnits`
- `estimatedCost`
- `safetyOutcome`
- `reviewOutcome`

Raw prompts and responses should only be retained under explicit organization policy with PHI handling, retention, and audit controls.

## Safety Gating

AI safety should be tier-independent. Higher tiers may unlock stronger models and more workflows, but they must not reduce safety requirements.

Safety classes:

| Class | Examples | Required controls |
| --- | --- | --- |
| Informational | search, education, product help, low-risk summaries | Disclaimers, citation preference, feedback capture |
| Clinical support | calculator guidance, guideline RAG, lab explanation | Clinician-in-loop, source attribution, audit event |
| High-risk clinical | order-set support, differential diagnosis, escalation guidance | Human review rule, risk label, explicit non-autonomous language |
| Operational | fleet, IoT, capacity, incident workflows | Operational audit, stale data warnings, no autonomous dispatch |
| Governance | model risk, policy review, compliance evidence | Review queue, versioned evidence, export audit |

Safety gates should check:

- Organization entitlement.
- Workspace and role profile.
- Asset risk level and intended use.
- Patient-context availability and freshness.
- RAG citation quality when retrieval is required.
- Tool-call validation.
- Model/version approval.
- Human review requirement.
- Retention and PHI policy.

## Human Review Rules

Human review should be mandatory when an AI output can influence high-risk care, compliance findings, or operational actions.

Require review for:

- Clinical decision support that suggests diagnosis, treatment, escalation, or order-set options.
- Documentation AI before content enters the medical record.
- Simulation competency scoring before official credentialing decisions.
- Digital twin recommendations that trigger staffing, routing, maintenance, or incident actions.
- Governance AI risk classifications before external reporting.
- Any workflow with low confidence, missing citations, stale data, or failed validation.

Human review records should include:

- Reviewing user.
- Review timestamp.
- Source AI asset and agent.
- Model/version class.
- Decision: approved, edited, rejected, escalated.
- Rationale or structured reason code.
- Downstream action taken.

## Premium vs Standard Routing

Routing should balance clinical risk, complexity, context size, tier, cost, and model approval status.

Standard model routing:

- Default assistant Q&A.
- Calculator explanations.
- Navigation and tool discovery.
- Low-risk simulation coaching.
- Administrative summaries without PHI.

Premium model routing:

- Multi-document or long-context synthesis.
- High-risk clinical support that passes governance gates.
- Complex RAG with citation requirements.
- Documentation drafting with patient context.
- Digital twin correlation across map, telemetry, alerts, and operations data.
- Governance evidence synthesis and risk classification.

Cost optimizer rules:

- Prefer cached or lower-cost responses for repeated low-risk prompts.
- Use premium routing only when complexity, risk, tier, or workflow policy justifies it.
- Record routing reason and cost estimate for every model call.
- Allow enterprise admins to set soft caps, hard caps, and approval workflows.

## RAG Commercialization

RAG should be sold as a governed knowledge capability, not a generic upload feature.

RAG package levels:

- Core: curated CareDroid help and public clinical references where permitted.
- Standard: pack-specific guideline RAG with citations and limited organization corpus.
- Enterprise: organization-controlled corpus, source lifecycle, access control, citation audit, and retention policy.
- Research add-on: evidence hub, cohort notes, research workspace retrieval, and explainability workflows.

RAG requirements:

- Source registry with owner, type, version, license, effective date, and review status.
- Retrieval audit with cited source IDs and confidence.
- Reranking and citation quality metrics.
- Source lifecycle states: draft, active, retired, superseded, restricted.
- Workspace and role access to private corpora.

## Tool Calling Commercialization

Tool calling should only execute entitled assets. The AI layer can recommend tools, collect parameters, and call backend services, but the launch decision must use the same asset-aware access policy as the UI.

Commercial tool-calling controls:

- Entitlement check before recommendation and execution.
- Parameter validation before execution.
- Audit events for clinical and operational execution.
- Workspace context included in the call.
- Locked state when an AI flow references a non-entitled asset.
- Clear upgrade/request-access path for sales-qualified blocked assets.

## AI Memory Commercialization

Memory is a premium and governance-sensitive capability.

Memory categories:

- Short memory: current session state, temporary tool parameters, conversation continuity.
- Long memory: user preferences, recurring workflows, workspace personalization.
- Clinical memory: patient or clinical context; highest governance burden.

Memory policy:

- Core tier should use short memory only.
- Standard tier can enable user/workspace preference memory with opt-out.
- Enterprise tier can configure memory retention, export, deletion, and audit policies.
- Clinical memory requires explicit PHI controls, organization policy, access control, and retention settings.

## Audit Requirements

Minimum AI audit fields:

- `organizationId`
- `workspaceId`
- `userId`
- `assetId`
- `agentId`
- `modelClass`
- `modelVersion`
- `promptClass`
- `riskLevel`
- `routingReason`
- `sourcesUsed`
- `toolsCalled`
- `safetyOutcome`
- `reviewRequired`
- `reviewOutcome`
- `estimatedCost`
- `createdAt`

Audit views should support:

- AI usage by product suite.
- AI usage by agent.
- Premium model usage and cost.
- Safety gate triggers.
- Human review volume and outcomes.
- RAG source usage and citation quality.
- Tool-call success/failure rates.

## Product Packaging

AI should be included in product suites as follows:

- Emergency Department Suite: Emergency AI, triage summaries, protocol-aware guidance, ED handoff, simulation debrief.
- ICU Suite: Clinical AI, daily summary, sepsis/deterioration review, ABG/lab trend interpretation.
- Cardiology Suite: Clinical AI, ECG/STEMI workflow support, chest pain risk synthesis, telemetry event summary.
- Laboratory Intelligence Suite: Lab AI, abnormality explanations, ABG interpretation, quality review.
- Medical IoT Suite: Operations AI, device anomaly summary, maintenance prioritization.
- Digital Twin Suite: Operations AI, capacity, telemetry, map, alert, and workflow correlation.
- Fleet & EMS Suite: Fleet AI, route risk, dispatch support, EMS handoff, maintenance prioritization.
- Simulation & Training Suite: Education AI, scenario tutor, debrief, remediation, OSCE support.
- Governance & Compliance Suite: Governance AI, risk classification, policy checks, review queue triage.
- Research Suite: Research AI, guideline RAG, evidence synthesis, explainability.

## Implementation Phases

### Phase 1: Commercial Inventory

- Assign every AI workflow and agent a `PlatformAsset.id`.
- Map AI assets to packs, role profiles, workspaces, and organization types.
- Define risk, review, audit, and usage policy metadata.
- Label demo-backed versus integration-ready AI assets.

### Phase 2: Metering And Access

- Emit usage events for AI launch, routing, RAG, tool calling, memory, safety, review, and cost.
- Gate AI launches through organization, workspace, role, entitlement, and asset policy.
- Add organization-level usage summaries.
- Create locked/request-access states for non-entitled AI assets.

### Phase 3: Governance And Premium Routing

- Enforce human review rules for high-risk workflows.
- Add approved model/version registry.
- Add standard versus premium routing policy.
- Connect cost optimizer decisions to subscription tier and admin caps.

### Phase 4: Commercial Dashboards

- Build buyer-facing adoption dashboards by suite, agent, and workflow.
- Build admin-facing cost, safety, and review dashboards.
- Add renewal signals: active users, workflows launched, time saved proxy, review completion, and outcome adoption.

## Risks

- AI appears as one generic assistant instead of a set of governed sellable assets.
- Premium routing is sold before audit, review, and cost controls are reliable.
- Raw prompt/response retention creates PHI exposure without explicit policy.
- Tool calling bypasses entitlement or workspace scope.
- RAG is marketed as authoritative without source lifecycle and citation quality controls.
- Human review queues become a promise without workflow ownership or metrics.

## Acceptance Criteria

- Every commercial AI workflow has an asset ID, pack mapping, role/workspace policy, risk level, and audit policy.
- Every AI call can be tied to organization, workspace, asset, agent, model class, model version, and estimated cost.
- Standard and premium routing are explicit tier policies.
- Human review rules exist for high-risk clinical, operational, simulation, and governance workflows.
- AI usage can be reported by organization, suite, agent, asset, and model class without exposing raw PHI by default.
- Locked and upgrade states are consistent with the asset entitlement model.

