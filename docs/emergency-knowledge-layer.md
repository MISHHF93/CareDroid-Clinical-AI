# Emergency Knowledge Layer

## Goal

Centralize Emergency Department knowledge at `/workspace/emergency/knowledge`.

The Emergency Knowledge Layer is the search-first guidance surface for:

- Protocols.
- Calculators.
- Pathways.
- Simulations.
- Evidence.
- Workflows.

Clinicians should be able to type a complaint, risk signal, workflow, protocol, or operational need and immediately find the right ED guidance. The layer does not diagnose, order treatment, determine disposition, or autonomously escalate. It routes clinicians to human-reviewed guidance.

## Route

- Route: `/workspace/emergency/knowledge`
- Workspace: Emergency
- Audience: ED physicians, triage nurses, charge nurses, clinical educators, informatics leads
- Mode: Search-first clinical guidance layer
- Data posture: configured/demo knowledge first, customer-approved local protocols and evidence later

## Knowledge Layer Contract

```js
export const EmergencyKnowledgeLayer = Object.freeze({
  route: '/workspace/emergency/knowledge',
  title: 'Emergency Knowledge Layer',
  purpose: 'Help clinicians find ED guidance instantly.',
  design: 'search-first',
  indexedDomains: [
    'protocols',
    'calculators',
    'pathways',
    'simulations',
    'evidence',
    'workflows',
  ],
});
```

Each indexed knowledge item must use this shape:

```js
{
  knowledgeId: string,
  title: string,
  domain: 'protocol' | 'calculator' | 'pathway' | 'simulation' | 'evidence' | 'workflow',
  complaintTags: string[],
  workflowIds: string[],
  aliases: string[],
  summary: string,
  sourceState: 'demo' | 'configured' | 'local-approved' | 'live' | 'stale',
  reviewRequirement: string,
  launchTarget: string,
}
```

## Indexed Domains

| Domain | Purpose | Source |
| --- | --- | --- |
| Protocols | Retrieve ED protocol guidance by complaint, risk signal, or workflow. | Emergency RAG complaint context, local protocol library, configured demo protocols. |
| Calculators | Launch ED-relevant calculators from clinical context. | `clinicalToolIdContract.js`, Emergency Workflow Registry, clinical intent routing. |
| Pathways | Present complaint-specific and operational pathway steps. | Emergency Workflow Registry, Patient Journey Engine, ED protocol context. |
| Simulations | Link training scenarios to current ED workflows and gaps. | Emergency simulation scenarios, complaint-specific simulation mappings. |
| Evidence | Surface cited evidence summaries, safety notes, and local policy references. | RAG evidence context, approved clinical references, local policy content. |
| Workflows | Start or continue standardized ED workflows. | `EmergencyWorkflowRegistry`, ED command center, whiteboard, triage, evidence routes. |

## Search-First Design

Search is the primary interaction. The page should open with a single search field and high-signal quick filters.

Search must support:

- Chief complaint: chest pain, stroke symptoms, sepsis concern, trauma, shortness of breath, abdominal pain, behavioral health.
- Calculator name: HEART, NIHSS, qSOFA, NEWS2, Wells PE, Shock Index, Revised Trauma Score.
- Protocol name: ACS/chest pain, stroke window, sepsis, trauma, respiratory distress, PE, discharge readiness.
- Workflow name: Chest Pain, Stroke, Sepsis, Trauma, Respiratory Distress, Abdominal Pain, Behavioral Health, Discharge, Referral, Admission.
- Pathway terms: triage, reassessment, EMS handoff, referral, admission, discharge, boarding.
- Evidence terms: troponin timing, stroke window, sepsis screening, PE risk, trauma primary survey.
- Simulation terms: ACS simulation, stroke escalation, sepsis deterioration, trauma bay, respiratory distress.

Search results should be grouped by domain and ranked by ED context:

1. Exact complaint or workflow match.
2. Current patient journey state match.
3. High-risk or alert match.
4. Calculator/protocol relevance.
5. Recent use or pinned local protocol.

## Required Search Result Card

Each result card must show:

- Title.
- Domain.
- One-sentence summary.
- Matched reason.
- Related workflow.
- Related calculators.
- Source state.
- Human-review reminder.
- Primary action.

Example:

```js
{
  knowledgeId: 'knowledge-chest-pain-acs-pathway',
  title: 'ACS / Chest Pain Pathway',
  domain: 'protocol',
  complaintTags: ['chest pain', 'chest pressure', 'ACS concern'],
  workflowIds: ['ed-workflow-chest-pain'],
  aliases: ['ACS', 'troponin', 'ECG review', 'HEART'],
  summary: 'Complaint-specific pathway for HEART review, ECG/troponin timing, and cardiology criteria.',
  sourceState: 'configured',
  reviewRequirement: 'Clinician review required before diagnosis, treatment, disposition, or referral action.',
  launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-chest-pain',
}
```

## Canonical ED Knowledge Collections

The first version should index these canonical collections:

| Collection | Required Content |
| --- | --- |
| Chest Pain | ACS/chest pain protocol, ECG/troponin evidence, HEART, GRACE ACS, TIMI, ACS workflow, chest pain simulation. |
| Stroke | Stroke window workflow, imaging escalation pathway, NIHSS, ABCD2, neurology criteria, stroke escalation simulation. |
| Sepsis | Sepsis pathway, lactate/culture workflow, qSOFA, NEWS2, SOFA, Shock Index, sepsis deterioration simulation. |
| Trauma | Trauma primary survey, ATLS context, massive transfusion review, Shock Index, Revised Trauma Score, trauma bay simulation. |
| Respiratory Distress | Respiratory protocol, PE evaluation, oxygen escalation, NEWS2, Wells PE, PERC, ROX, respiratory distress simulation. |
| Abdominal Pain | Abdominal pain pathway, GI bleed pathway, pancreatitis pathway, surgical abdomen criteria, GI/liver/pancreatitis calculators. |
| Behavioral Health | Behavioral health safety pathway, suicide risk review, substance use screening, PHQ-9, GAD-7, AUDIT-C, C-SSRS workflow. |
| Discharge | Discharge readiness pathway, return precautions checklist, follow-up checklist, documentation integrity, discharge summary drafting. |
| Referral | Consult/referral pathway, specialty handoff criteria, transfer checklist, missing data checklist, referral routing workflow. |
| Admission | Admission readiness pathway, bed request workflow, boarding escalation, handoff checklist, capacity management policy. |

## Quick Filters

The knowledge page must include quick filters for:

- Protocols.
- Calculators.
- Pathways.
- Simulations.
- Evidence.
- Workflows.
- Current patient journey stage.
- High-risk only.
- Local-approved only.
- Recently used.
- Pinned ED protocols.

Filters should refine search results without hiding the search bar.

## Context-Aware Entry Points

The knowledge layer should be reachable from:

- `/workspace/emergency/triage`
- `/workspace/emergency/evidence`
- `/workspace/emergency/whiteboard`
- `/workspace/emergency/command-center`
- `/workspace/emergency/waiting-room`
- `/workspace/emergency/director`
- `/workspace/emergency/charge-nurse`

Entry context should prefill or bias search:

| Entry Context | Search Bias |
| --- | --- |
| Triage | Complaint, vitals, acuity, calculators, triage protocols. |
| Whiteboard | Patient column, wait state, alerts, workflow. |
| Command Center | Current bottleneck, critical alert, recommended action. |
| Waiting Room | Reassessment, wait over target, high-risk waiting patients. |
| Director View | Leadership KPI, throughput, boarding, EMS offload. |
| Charge Nurse View | Waiting patients, room availability, device availability, critical alerts. |

## Safety And Governance

- Every result must show source state: demo, configured, local-approved, live, or stale.
- Local protocols must be clearly distinguished from generic demo protocols.
- Evidence summaries must include citation/source metadata when available.
- AI-generated summaries must include reasoning and review requirement.
- The layer must not present guidance as an autonomous clinical decision.
- The layer must not imply orders, diagnosis, treatment, disposition, referral, admission, or discharge are executed automatically.

## Analytics

Track adoption and usefulness through:

- Search queries.
- Zero-result queries.
- Protocol retrievals.
- Calculator launches.
- Workflow launches.
- Evidence opens.
- Simulation opens.
- Result-to-action conversion.
- Pinned/local protocol usage.

These events should feed Emergency Analytics and Automation ROI without scoring autonomous clinical quality.

## Acceptance

Clinicians find guidance instantly.

The `/workspace/emergency/knowledge` route centralizes ED protocols, calculators, pathways, simulations, evidence, and workflows in a search-first design with clear source state and human-review boundaries.
