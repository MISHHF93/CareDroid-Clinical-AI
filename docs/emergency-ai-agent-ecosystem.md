# Emergency AI Agent Ecosystem

## Goal

Define a modular Emergency OS AI architecture with specialized agents routed through one Emergency Copilot.

Specialized agents:

- Triage Agent.
- Flow Agent.
- Referral Agent.
- Documentation Agent.
- Protocol Agent.
- Simulation Coach.
- Operations Agent.

Users should experience one AI entry point: `Emergency Copilot`. The specialized agents operate behind that entry point so the architecture is understandable, modular, and safe.

## Core Rule

All Emergency AI requests route through one Copilot.

```js
export const EmergencyCopilotRouter = Object.freeze({
  copilotId: 'emergency-ai-copilot',
  title: 'Emergency Copilot',
  routingModel: 'single-entry-specialized-agents',
  agents: [
    'triage-agent',
    'flow-agent',
    'referral-agent',
    'documentation-agent',
    'protocol-agent',
    'simulation-coach',
    'operations-agent',
  ],
});
```

The Copilot owns:

- User conversation.
- Intent detection.
- Agent routing.
- Context assembly.
- Safety boundary enforcement.
- Response formatting.
- Human-review reminders.
- Analytics events.

Specialized agents own domain reasoning only. They do not talk to users directly as separate products.

## Safety Boundary

Every agent output is workflow guidance for human review.

Agents must not:

- Diagnose.
- Order treatment.
- Determine acuity autonomously.
- Admit or discharge.
- Submit referrals.
- Transfer patients.
- Escalate without human review.
- Assign staff.
- Control rooms, beds, devices, or resources.
- Replace legal EHR documentation.

## Shared Agent Contract

Each agent must use this shape:

```js
{
  agentId: string,
  title: string,
  routedThrough: 'emergency-ai-copilot',
  purpose: string,
  primaryInputs: string[],
  primaryOutputs: string[],
  relatedWorkflows: string[],
  relatedRoutes: string[],
  requiredKnowledge: string[],
  requiredAutomations: string[],
  safetyBoundary: string,
}
```

## Agent Registry

```js
export const EmergencyAIAgentRegistry = Object.freeze([
  Object.freeze({
    agentId: 'triage-agent',
    title: 'Triage Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Convert arrival mode, chief complaint, vitals, risk flags, and selected calculators into a review-ready triage guidance summary.',
    primaryInputs: [
      'arrival mode',
      'chief complaint',
      'vitals',
      'age/risk flags',
      'selected calculators',
      'waiting room state',
      'ED patient journey stage',
    ],
    primaryOutputs: [
      'calculator recommendations',
      'risk context',
      'red flag summary',
      'triage workflow suggestion',
      'clinician review prompt',
    ],
    relatedWorkflows: [
      'ed-workflow-chest-pain',
      'ed-workflow-stroke',
      'ed-workflow-sepsis',
      'ed-workflow-trauma',
      'ed-workflow-respiratory-distress',
      'ed-workflow-abdominal-pain',
      'ed-workflow-behavioral-health',
    ],
    relatedRoutes: [
      '/workspace/emergency/triage',
      '/workspace/emergency/waiting-room',
      '/workspace/emergency/whiteboard',
    ],
    requiredKnowledge: ['calculators', 'protocols', 'pathways', 'workflows'],
    requiredAutomations: ['emergency-automated-triage-matrix', 'emergency-rag-evidence-retrieval'],
    safetyBoundary:
      'Supports triage review only. Does not assign acuity, diagnose, order treatment, or determine disposition.',
  }),
  Object.freeze({
    agentId: 'flow-agent',
    title: 'Flow Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Summarize ED patient flow, bottlenecks, queues, wait times, reassessment needs, throughput, and next review points.',
    primaryInputs: [
      'patient journey state',
      'whiteboard column load',
      'waiting room pressure',
      'queue age',
      'door-to-doctor KPI',
      'length-of-stay KPI',
      'boarding state',
    ],
    primaryOutputs: [
      'flow bottleneck summary',
      'queue risk summary',
      'throughput context',
      'next review suggestion',
      'drilldown route recommendation',
    ],
    relatedWorkflows: [
      'ed-workflow-discharge',
      'ed-workflow-admission',
      'ed-workflow-referral',
    ],
    relatedRoutes: [
      '/workspace/emergency/whiteboard',
      '/workspace/emergency/throughput',
      '/workspace/emergency/director',
      '/workspace/emergency/charge-nurse',
    ],
    requiredKnowledge: ['workflows', 'pathways', 'evidence'],
    requiredAutomations: ['emergency-escalation-engine', 'emergency-discharge-summary-drafting'],
    safetyBoundary:
      'Supports flow visibility only. Does not move patients, assign rooms, admit, discharge, or trigger diversion.',
  }),
  Object.freeze({
    agentId: 'referral-agent',
    title: 'Referral Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Prepare review-ready referral, consult, transfer, specialty, and follow-up guidance from ED assessment and disposition context.',
    primaryInputs: [
      'assessment summary',
      'results summary',
      'service line',
      'disposition dependency',
      'capacity context',
      'missing data',
      'handoff facts',
    ],
    primaryOutputs: [
      'referral queue context',
      'consult draft outline',
      'missing data checklist',
      'handoff summary',
      'review prompt',
    ],
    relatedWorkflows: ['ed-workflow-referral', 'ed-workflow-admission', 'ed-workflow-discharge'],
    relatedRoutes: [
      '/workspace/emergency/referrals',
      '/workspace/emergency/documentation',
      '/workspace/emergency/knowledge',
    ],
    requiredKnowledge: ['protocols', 'pathways', 'workflows', 'evidence'],
    requiredAutomations: ['emergency-referral-routing', 'emergency-documentation-integrity'],
    safetyBoundary:
      'Supports referral preparation only. Does not send referrals, transfer patients, contact services, or determine disposition.',
  }),
  Object.freeze({
    agentId: 'documentation-agent',
    title: 'Documentation Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Identify documentation gaps and prepare review-required ED summaries, discharge drafts, admission handoff drafts, and source-fact checklists.',
    primaryInputs: [
      'verified ED timeline',
      'triage facts',
      'assessment facts',
      'orders/results context',
      'disposition plan',
      'medication/follow-up context',
      'source state',
    ],
    primaryOutputs: [
      'documentation gap list',
      'source-fact checklist',
      'discharge summary draft outline',
      'admission handoff draft outline',
      'review task',
    ],
    relatedWorkflows: ['ed-workflow-discharge', 'ed-workflow-admission', 'ed-workflow-referral'],
    relatedRoutes: [
      '/workspace/emergency/documentation',
      '/workspace/emergency/whiteboard',
      '/workspace/emergency/charge-nurse',
    ],
    requiredKnowledge: ['workflows', 'pathways', 'protocols'],
    requiredAutomations: ['emergency-documentation-integrity', 'emergency-discharge-summary-drafting'],
    safetyBoundary:
      'Supports documentation drafting only. Does not sign, export, bill, submit, or replace clinician documentation.',
  }),
  Object.freeze({
    agentId: 'protocol-agent',
    title: 'Protocol Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Retrieve complaint-specific protocols, calculators, pathways, evidence, and workflow links from the Emergency Knowledge Layer.',
    primaryInputs: [
      'chief complaint',
      'workflowId',
      'vitals or risk context',
      'patient journey stage',
      'local protocol source state',
      'clinician question',
    ],
    primaryOutputs: [
      'matched protocols',
      'related calculators',
      'evidence summary',
      'pathway links',
      'workflow launch suggestions',
      'source state and review reminder',
    ],
    relatedWorkflows: [
      'ed-workflow-chest-pain',
      'ed-workflow-stroke',
      'ed-workflow-sepsis',
      'ed-workflow-trauma',
      'ed-workflow-respiratory-distress',
      'ed-workflow-abdominal-pain',
      'ed-workflow-behavioral-health',
    ],
    relatedRoutes: [
      '/workspace/emergency/knowledge',
      '/workspace/emergency/evidence',
      '/workspace/emergency/triage',
    ],
    requiredKnowledge: ['protocols', 'calculators', 'pathways', 'evidence', 'workflows'],
    requiredAutomations: ['emergency-rag-evidence-retrieval'],
    safetyBoundary:
      'Supports protocol retrieval only. Does not select treatment, make diagnosis, place orders, or determine disposition.',
  }),
  Object.freeze({
    agentId: 'simulation-coach',
    title: 'Simulation Coach',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Map ED workflow gaps, protocol drift, missed calculators, and high-risk presentations into simulation practice and debrief prompts.',
    primaryInputs: [
      'workflow gap',
      'protocol gap',
      'calculator utilization',
      'role',
      'competency objective',
      'simulation history',
      'ED scenario context',
    ],
    primaryOutputs: [
      'recommended simulation',
      'practice objective',
      'debrief prompt',
      'role-based coaching notes',
      'completion metric suggestion',
    ],
    relatedWorkflows: [
      'ed-workflow-chest-pain',
      'ed-workflow-stroke',
      'ed-workflow-sepsis',
      'ed-workflow-trauma',
      'ed-workflow-respiratory-distress',
    ],
    relatedRoutes: [
      '/workspace/emergency/simulations',
      '/workspace/emergency/knowledge',
      '/workspace/emergency/analytics',
    ],
    requiredKnowledge: ['simulations', 'protocols', 'pathways', 'workflows'],
    requiredAutomations: ['emergency-simulation-academy'],
    safetyBoundary:
      'Supports training only. Does not credential users, certify competency, or replace educator review.',
  }),
  Object.freeze({
    agentId: 'operations-agent',
    title: 'Operations Agent',
    routedThrough: 'emergency-ai-copilot',
    purpose:
      'Summarize ED operational pressure across staffing, rooms, devices, EMS offload, boarding, alerts, and resource constraints.',
    primaryInputs: [
      'staffing pressure',
      'room availability',
      'device availability',
      'EMS offload status',
      'boarding status',
      'critical alerts',
      'resource board state',
      'director/charge nurse dashboard context',
    ],
    primaryOutputs: [
      'operations pressure summary',
      'resource constraint summary',
      'alert explanation',
      'leadership review prompt',
      'drilldown route recommendation',
    ],
    relatedWorkflows: ['ed-workflow-admission', 'ed-workflow-discharge', 'ed-workflow-referral'],
    relatedRoutes: [
      '/workspace/emergency/director',
      '/workspace/emergency/charge-nurse',
      '/workspace/emergency/resources',
      '/workspace/emergency/escalations',
      '/workspace/emergency/ems',
    ],
    requiredKnowledge: ['workflows', 'pathways', 'evidence'],
    requiredAutomations: [
      'emergency-escalation-engine',
      'emergency-resource-board',
      'emergency-medical-iot-monitoring',
      'emergency-surge-staffing',
    ],
    safetyBoundary:
      'Supports operational review only. Does not assign staff, control resources, divert ambulances, admit, discharge, or escalate autonomously.',
  }),
]);
```

## Routing Model

Emergency Copilot should route by user intent and active workspace context.

| User Intent | Primary Agent | Supporting Agents |
| --- | --- | --- |
| Chief complaint, vitals, calculator recommendation, acuity context | Triage Agent | Protocol Agent, Flow Agent |
| Queue, waiting, whiteboard, throughput, bottleneck | Flow Agent | Operations Agent |
| Consult, transfer, specialty, follow-up, handoff | Referral Agent | Documentation Agent, Protocol Agent |
| Discharge summary, admission handoff, missing facts, chart gap | Documentation Agent | Referral Agent, Protocol Agent |
| Protocol, pathway, evidence, calculator, guidance search | Protocol Agent | Triage Agent |
| Simulation, practice, debrief, competency gap | Simulation Coach | Protocol Agent |
| Staffing, rooms, devices, EMS offload, boarding, critical alerts | Operations Agent | Flow Agent |

## Copilot Response Contract

Every routed response should include:

```js
{
  copilotId: 'emergency-ai-copilot',
  routedAgentId: string,
  userIntent: string,
  sourceContext: string[],
  recommendationType: 'workflow-guidance' | 'knowledge-retrieval' | 'documentation-support' | 'operations-review' | 'simulation-coaching',
  output: string,
  reasoning: string[],
  reviewRequirement: string,
  prohibitedActionsReminder: string,
  suggestedDrilldowns: string[],
}
```

## Shared Context Sources

The Copilot can assemble context from:

- Emergency Workflow Registry.
- Emergency Knowledge Layer.
- Emergency Digital Whiteboard.
- Waiting Room Intelligence.
- Reassessment Queue.
- Emergency KPI Layer.
- Automation ROI Engine.
- Emergency Resource Board.
- Emergency Escalation Engine.
- EMS Offload Command Center.
- Emergency Simulation Scenarios.

Context must be labeled by source state: demo, manual, configured, local-approved, live, mixed, stale, or unavailable.

## Modularity Rules

- Add new ED AI capability as a specialized agent only when it has a distinct purpose, inputs, outputs, and safety boundary.
- Do not expose specialized agents as separate top-level products.
- Do not duplicate agent responsibilities.
- Route all user-facing AI through Emergency Copilot.
- Keep agent outputs structured enough for analytics and audit.
- Track agent usage through Emergency Analytics and Automation ROI where applicable.

## Acceptance

AI architecture becomes understandable and modular.

The Emergency OS has one user-facing Emergency Copilot and seven specialized internal agents: Triage Agent, Flow Agent, Referral Agent, Documentation Agent, Protocol Agent, Simulation Coach, and Operations Agent.
