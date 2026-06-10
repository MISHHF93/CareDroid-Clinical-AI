# Emergency Workflow Registry

## Purpose

Create the canonical Emergency Department workflow registry for the Emergency OS.

This registry standardizes the ED workflows that start from chief complaint, operational status, disposition state, or handoff need. Each workflow has a stable `workflowId`, required clinical inputs, calculator set, protocol set, AI context, automation dependencies, and KPIs.

All workflow outputs remain workflow guidance for human review. The registry does not authorize autonomous diagnosis, orders, treatment, disposition, admission, discharge, referral, transfer, or escalation.

## Registry Contract

Every Emergency workflow must use this shape:

```js
{
  workflowId: string,
  title: string,
  triggers: string[],
  requiredCalculators: string[],
  requiredProtocols: string[],
  requiredAiContext: string[],
  requiredAutomations: string[],
  kpis: string[],
}
```

## EmergencyWorkflowRegistry

```js
export const EmergencyWorkflowRegistry = Object.freeze([
  Object.freeze({
    workflowId: 'ed-workflow-chest-pain',
    title: 'Chest Pain',
    triggers: [
      'Chest pain, chest pressure, ACS concern, possible ACS, abnormal ECG, elevated troponin, or cardiology review need.',
      'High-risk queue item with cardiac symptoms.',
      'EMS pre-arrival or triage intake identifies time-sensitive chest pain.',
    ],
    requiredCalculators: ['heart-score', 'grace-acs', 'timi-ua-nstemi'],
    requiredProtocols: ['ACS/chest pain pathway', 'ECG and troponin review', 'cardiology consult criteria'],
    requiredAiContext: [
      'chief complaint',
      'vitals',
      'arrival mode',
      'ECG status',
      'troponin timing',
      'risk factors',
      'selected calculators',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-documentation-integrity',
      'emergency-referral-routing',
    ],
    kpis: [
      'door-to-ECG time',
      'door-to-provider time',
      'troponin review time',
      'calculator completion rate',
      'protocol retrievals',
      'cardiology referral delay',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-stroke',
    title: 'Stroke',
    triggers: [
      'Stroke symptoms, facial droop, unilateral weakness, slurred speech, acute neurologic deficit, or stroke concern.',
      'EMS pre-alert or triage intake identifies possible stroke window.',
      'Critical alert requires neuro workflow review.',
    ],
    requiredCalculators: ['nihss', 'abcd2', 'gcs-calculator'],
    requiredProtocols: ['stroke window workflow', 'imaging escalation pathway', 'neurology referral criteria'],
    requiredAiContext: [
      'last known well',
      'neurologic symptoms',
      'NIHSS findings',
      'anticoagulant context',
      'glucose or mimic context when available',
      'imaging readiness',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-escalation-engine',
      'emergency-referral-routing',
      'emergency-documentation-integrity',
    ],
    kpis: [
      'door-to-triage time',
      'door-to-provider time',
      'stroke alert review time',
      'imaging readiness time',
      'NIHSS completion rate',
      'neurology referral delay',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-sepsis',
    title: 'Sepsis',
    triggers: [
      'Sepsis concern, infection with abnormal vitals, fever with hypotension, tachypnea, altered mentation, or deterioration watch.',
      'High-risk queue item has qSOFA, NEWS2, or Shock Index concern.',
      'Reassessment queue identifies worsening infection risk.',
    ],
    requiredCalculators: ['qsofa', 'news2', 'sofa-score', 'shock-index'],
    requiredProtocols: ['sepsis pathway', 'lactate/culture workflow', 'antibiotic review workflow'],
    requiredAiContext: [
      'infection source concern',
      'vitals',
      'mental status',
      'lactate and culture status',
      'fluid or antibiotic timing when available',
      'selected calculators',
      'reassessment state',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-escalation-engine',
      'emergency-documentation-integrity',
      'emergency-simulation-academy',
    ],
    kpis: [
      'door-to-triage time',
      'risk-profile generation time',
      'qSOFA completion rate',
      'NEWS2 completion rate',
      'reassessment interval compliance',
      'sepsis protocol retrievals',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-trauma',
    title: 'Trauma',
    triggers: [
      'Trauma activation, motor vehicle collision, fall injury, penetrating trauma, blunt trauma, shock concern, or trauma bay preparation.',
      'EMS pre-arrival identifies injury mechanism or hemodynamic instability.',
      'Critical alert or resource constraint affects trauma readiness.',
    ],
    requiredCalculators: ['shock-index', 'revised-trauma-score', 'gcs-calculator', 'canadian-c-spine', 'nexus-cspine'],
    requiredProtocols: ['Trauma Pathway', 'trauma primary survey', 'massive transfusion review', 'imaging decision support context'],
    requiredAiContext: [
      'mechanism of injury',
      'vitals',
      'airway or bleeding concern',
      'GCS or neuro status',
      'trauma bay readiness',
      'blood product or imaging readiness when available',
      'EMS handoff',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-resource-board',
      'emergency-escalation-engine',
      'emergency-documentation-integrity',
    ],
    kpis: [
      'EMS-to-room time',
      'trauma bay readiness time',
      'shock index review rate',
      'primary survey documentation completeness',
      'critical resource availability',
      'handoff completion time',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-respiratory-distress',
    title: 'Respiratory Distress',
    triggers: [
      'Shortness of breath, dyspnea, respiratory distress, PE concern, hypoxia, COPD/asthma exacerbation, or oxygen escalation review.',
      'Telemetry or vitals show worsening respiratory status.',
      'Reassessment queue identifies respiratory deterioration.',
    ],
    requiredCalculators: ['news2', 'wells-pe', 'perc', 'rox-index', 'pao2-fio2-ratio', 'aa-gradient'],
    requiredProtocols: ['Respiratory Protocol', 'PE evaluation pathway', 'oxygen escalation workflow', 'COPD/asthma exacerbation pathway'],
    requiredAiContext: [
      'respiratory symptoms',
      'vitals',
      'oxygen requirement',
      'SpO2 trend',
      'PE risk context',
      'ABG or imaging context when available',
      'selected calculators',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-medical-iot-monitoring',
      'emergency-escalation-engine',
      'emergency-documentation-integrity',
    ],
    kpis: [
      'door-to-triage time',
      'oxygen escalation review time',
      'NEWS2 completion rate',
      'PE calculator completion rate',
      'reassessment interval compliance',
      'respiratory protocol retrievals',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-abdominal-pain',
    title: 'Abdominal Pain',
    triggers: [
      'Abdominal pain, GI bleed concern, pancreatitis concern, liver disease concern, dehydration, vomiting, or abnormal abdominal labs.',
      'Triage intake flags severe pain, hypotension, bleeding, fever, pregnancy concern, or surgical review need.',
      'Results queue returns abnormal labs or imaging requiring disposition review.',
    ],
    requiredCalculators: [
      'ranson-criteria',
      'bisap-score',
      'glasgow-blatchford-score',
      'rockall-score',
      'meld',
      'child-pugh',
      'shock-index',
    ],
    requiredProtocols: [
      'abdominal pain pathway',
      'GI bleed pathway',
      'pancreatitis pathway',
      'surgical abdomen escalation criteria',
      'imaging and lab review pathway',
    ],
    requiredAiContext: [
      'pain location and severity',
      'vitals',
      'pregnancy status when applicable',
      'bleeding symptoms',
      'lab and imaging status',
      'surgical risk flags',
      'selected calculators',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-referral-routing',
      'emergency-documentation-integrity',
      'emergency-discharge-summary-drafting',
    ],
    kpis: [
      'door-to-provider time',
      'pain reassessment interval compliance',
      'lab-to-disposition review time',
      'imaging review delay',
      'surgical referral delay',
      'discharge readiness time',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-behavioral-health',
    title: 'Behavioral Health',
    triggers: [
      'Behavioral health presentation, suicidal ideation, self-harm concern, intoxication, agitation, psychiatric crisis, or safety watch need.',
      'Triage or reassessment identifies safety risk or need for behavioral health consultation.',
      'Disposition is blocked by placement, observation, sitter availability, or referral handoff.',
    ],
    requiredCalculators: ['phq9', 'gad7', 'audit-c', 'cage', 'columbia-suicide-severity-workflow'],
    requiredProtocols: [
      'behavioral health safety pathway',
      'suicide risk review pathway',
      'substance use screening pathway',
      'agitation and observation policy',
      'behavioral health referral criteria',
    ],
    requiredAiContext: [
      'presenting concern',
      'safety risk indicators',
      'screening results',
      'observation status',
      'intoxication or withdrawal context when available',
      'placement or consult status',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-automated-triage-matrix',
      'emergency-rag-evidence-retrieval',
      'emergency-escalation-engine',
      'emergency-referral-routing',
      'emergency-documentation-integrity',
    ],
    kpis: [
      'safety screen completion rate',
      'time-to-behavioral-health-review',
      'observation delay',
      'referral queue age',
      'boarding time',
      'documentation completeness',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-discharge',
    title: 'Discharge',
    triggers: [
      'Disposition selected as discharge, discharge candidate identified, patient instructions needed, follow-up missing, or discharge documentation draft requested.',
      'Results and reassessment are complete but patient remains in ED.',
      'Command center identifies discharge-ready throughput opportunity.',
    ],
    requiredCalculators: [],
    requiredProtocols: [
      'discharge readiness pathway',
      'return precautions checklist',
      'follow-up scheduling checklist',
      'medication reconciliation review',
      'patient instructions review',
    ],
    requiredAiContext: [
      'verified ED timeline',
      'diagnostic impression for human review',
      'results summary',
      'treatments and medications',
      'follow-up plan',
      'patient education needs',
      'barriers to discharge',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-discharge-summary-drafting',
      'emergency-documentation-integrity',
      'emergency-referral-routing',
      'emergency-kpi-layer',
    ],
    kpis: [
      'discharge candidate age',
      'discharge order-to-exit time',
      'documentation gap count',
      'follow-up completion rate',
      'discharge summary draft review time',
      'ED length of stay',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-referral',
    title: 'Referral',
    triggers: [
      'Consult need, specialty referral, transfer need, follow-up service, department notification, or missing handoff data.',
      'Assessment, results, or disposition creates external or internal referral dependency.',
      'Referral queue item exceeds target age.',
    ],
    requiredCalculators: [],
    requiredProtocols: [
      'consult and referral pathway',
      'transfer center checklist',
      'specialty handoff criteria',
      'missing data checklist',
      'secure messaging policy',
    ],
    requiredAiContext: [
      'assessment summary',
      'results summary',
      'service line',
      'disposition dependency',
      'capacity constraint',
      'handoff facts',
      'missing data',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-referral-routing',
      'emergency-documentation-integrity',
      'emergency-rag-evidence-retrieval',
      'emergency-kpi-layer',
    ],
    kpis: [
      'referral queue age',
      'consult draft review time',
      'missing data closure rate',
      'transfer review delay',
      'specialty response delay',
      'handoff completion rate',
    ],
  }),
  Object.freeze({
    workflowId: 'ed-workflow-admission',
    title: 'Admission',
    triggers: [
      'Admission decision pending, bed request needed, boarding risk, inpatient handoff needed, or disposition blocked by capacity.',
      'Results or reassessment indicates likely admission for human review.',
      'Command center identifies bed pressure or boarding delay.',
    ],
    requiredCalculators: ['news2', 'qsofa', 'sofa-score', 'bed-occupancy-calculator', 'staffing-ratio-calculator'],
    requiredProtocols: [
      'admission readiness pathway',
      'bed request workflow',
      'boarding escalation pathway',
      'inpatient handoff checklist',
      'capacity management policy',
    ],
    requiredAiContext: [
      'admission reason',
      'acuity and risk scores',
      'pending results',
      'bed request status',
      'boarding time',
      'inpatient service line',
      'handoff summary',
      'ED patient journey stage',
    ],
    requiredAutomations: [
      'emergency-referral-routing',
      'emergency-escalation-engine',
      'emergency-resource-board',
      'emergency-documentation-integrity',
      'emergency-kpi-layer',
    ],
    kpis: [
      'decision-to-admit time',
      'bed request age',
      'boarding time',
      'handoff completion rate',
      'pending result delay',
      'capacity escalation count',
    ],
  }),
]);
```

## Workflow Index

| Workflow | `workflowId` | Primary Start Surface |
| --- | --- | --- |
| Chest Pain | `ed-workflow-chest-pain` | Triage, high-risk queue, EMS pre-arrival, evidence |
| Stroke | `ed-workflow-stroke` | Triage, critical alerts, EMS pre-arrival, evidence |
| Sepsis | `ed-workflow-sepsis` | Triage, high-risk queue, reassessment, evidence |
| Trauma | `ed-workflow-trauma` | EMS pre-arrival, triage, resource board, critical alerts |
| Respiratory Distress | `ed-workflow-respiratory-distress` | Triage, reassessment, telemetry/device alert, evidence |
| Abdominal Pain | `ed-workflow-abdominal-pain` | Triage, results queue, referral queue, discharge review |
| Behavioral Health | `ed-workflow-behavioral-health` | Triage, safety watch, referral queue, boarding review |
| Discharge | `ed-workflow-discharge` | Disposition queue, documentation, discharge candidates |
| Referral | `ed-workflow-referral` | Referral queue, consult review, transfer review |
| Admission | `ed-workflow-admission` | Disposition queue, bed pressure, boarding review |

## Standardization Rules

- `workflowId` is the stable identifier for routing, analytics, automation joins, and documentation.
- Required calculators must use canonical registry IDs from `clinicalToolIdContract.js`.
- Required protocols must be human-reviewed and may start as configured/demo protocol content.
- Required AI context must include enough ED state for explainable workflow guidance.
- Required automations must map back to Emergency OS automations or documented ED expansion modules.
- KPIs must be measurable from local/demo events first and live integrations later.
- A workflow may be visible before all integrations exist, but integration-dependent actions stay demo/roadmap until approved.
- Workflow output is guidance only; final decisions remain with the clinician or operational owner.

## Acceptance

All ED workflows are standardized.

The Emergency OS now has one canonical registry for Chest Pain, Stroke, Sepsis, Trauma, Respiratory Distress, Abdominal Pain, Behavioral Health, Discharge, Referral, and Admission workflows.
