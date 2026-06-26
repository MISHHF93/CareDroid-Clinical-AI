import { REGISTRY } from './clinicalToolIdContract';
import {
  COMPLAINT_FIRST_NAVIGATION_STEPS,
  CLINICAL_INTENT_ROUTES,
  routeClinicalIntent,
} from './clinicalIntentRouter';
import { PATIENT_JOURNEY_STATES } from './patientJourneyEngine';

export const EMERGENCY_WORKSPACE_ID = 'emergency';

export const EMERGENCY_PATIENT_JOURNEY = PATIENT_JOURNEY_STATES;

export const EMERGENCY_JOURNEY_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_PATIENT_JOURNEY.map((stage) => [stage.id, stage]))
);

export const EMERGENCY_DASHBOARD_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'waiting-room',
    label: 'Waiting Room',
    value: 18,
    helper: '7 untriaged, 3 EMS inbound',
    severity: 'high',
    journeyStages: ['arrival', 'registration', 'triage'],
  }),
  Object.freeze({
    id: 'active-patients',
    label: 'Active Patients',
    value: 42,
    helper: '11 in assessment, 8 pending results',
    severity: 'medium',
    journeyStages: ['assessment', 'orders', 'results', 'reassessment'],
  }),
  Object.freeze({
    id: 'high-risk-patients',
    label: 'High-Risk Patients',
    value: 6,
    helper: 'NEWS2/qSOFA/Shock Index review',
    severity: 'critical',
    journeyStages: ['triage', 'waiting', 'assessment'],
  }),
  Object.freeze({
    id: 'critical-alerts',
    label: 'Critical Alerts',
    value: 4,
    helper: 'Stroke window, sepsis concern, trauma bay',
    severity: 'critical',
    journeyStages: ['triage', 'assessment', 'results', 'reassessment'],
  }),
  Object.freeze({
    id: 'device-alerts',
    label: 'Device Alerts',
    value: 5,
    helper: 'Telemetry stale or monitor disconnected',
    severity: 'high',
    journeyStages: ['triage', 'assessment', 'results'],
  }),
  Object.freeze({
    id: 'staffing-status',
    label: 'Staffing Status',
    value: 'Surge watch',
    helper: '2 triage nurses, 1 attending gap',
    severity: 'high',
    journeyStages: ['arrival', 'triage', 'disposition'],
  }),
  Object.freeze({
    id: 'referral-queue',
    label: 'Referral Queue',
    value: 9,
    helper: '4 consult drafts need review',
    severity: 'medium',
    journeyStages: ['assessment', 'results', 'disposition', 'follow-up'],
  }),
  Object.freeze({
    id: 'documentation-queue',
    label: 'Documentation Queue',
    value: 14,
    helper: '7 discharge drafts, 3 integrity gaps',
    severity: 'medium',
    journeyStages: ['assessment', 'results', 'admission', 'discharge'],
  }),
]);

export const EMERGENCY_COMMAND_CENTER_WIDGETS = Object.freeze([
  Object.freeze({
    id: 'current-patients',
    label: 'Current Patients',
    value: 42,
    helper: '11 assessment, 8 results pending, 9 disposition ready',
    severity: 'medium',
    targetSurface: 'patients',
    primaryAction: Object.freeze({
      label: 'Open patient flow',
      actionType: 'route',
      target: '/workspace/emergency/patients',
    }),
    secondaryAction: Object.freeze({
      label: 'Summarize flow bottlenecks',
      actionType: 'assistant',
      prompt: 'Summarize ED patient flow bottlenecks across assessment, results, disposition, and admission/discharge queues.',
    }),
    supportingDetail: 'Keeps the whole ED census tied to the flow model instead of isolated task lists.',
  }),
  Object.freeze({
    id: 'waiting-room',
    label: 'Waiting Room',
    value: 18,
    helper: '7 untriaged, 3 EMS inbound, 2 waiting over target',
    severity: 'high',
    targetSurface: 'triage',
    primaryAction: Object.freeze({
      label: 'Start triage review',
      actionType: 'route',
      target: '/workspace/emergency/triage',
    }),
    secondaryAction: Object.freeze({
      label: 'Ask assistant for queue priorities',
      actionType: 'assistant',
      prompt: 'Prioritize waiting ED patients by triage risk, wait time, EMS inbound status, and clinician review needs.',
    }),
    supportingDetail: 'Use this queue to pull the next patient into triage without leaving the dashboard.',
  }),
  Object.freeze({
    id: 'high-risk-queue',
    label: 'High Risk Queue',
    value: 6,
    helper: 'NEWS2, qSOFA, HEART, Wells, and Shock Index flags',
    severity: 'critical',
    targetSurface: 'triage',
    primaryAction: Object.freeze({
      label: 'Open complaint workflow',
      actionType: 'route',
      target: '/workspace/emergency/triage',
    }),
    secondaryAction: Object.freeze({
      label: 'Review high-risk summary',
      actionType: 'assistant',
      prompt: 'Summarize high-risk ED queue items and recommend clinician-review next steps without making autonomous decisions.',
    }),
    supportingDetail: 'Centralizes calculator-triggered risk review for clinician confirmation.',
  }),
  Object.freeze({
    id: 'ems-arrivals',
    label: 'EMS Arrivals',
    value: 3,
    helper: '2 handoff summaries pending, 1 offload risk',
    severity: 'high',
    targetSurface: 'pre-arrival',
    primaryAction: Object.freeze({
      label: 'Review EMS handoffs',
      actionType: 'route',
      target: '/workspace/emergency/pre-arrival',
    }),
    secondaryAction: Object.freeze({
      label: 'Summarize offload risk',
      actionType: 'assistant',
      prompt: 'Summarize inbound EMS arrivals, handoff readiness, offload risk, and receiving ED preparation steps for human review.',
    }),
    supportingDetail: 'Connects pre-hospital context to ED readiness before the patient reaches the department.',
  }),
  Object.freeze({
    id: 'referral-queue',
    label: 'Referral Queue',
    value: 9,
    helper: '4 consult drafts, 3 department notifications, 2 transfer reviews',
    severity: 'medium',
    targetSurface: 'referrals',
    primaryAction: Object.freeze({
      label: 'Open referral queue',
      actionType: 'route',
      target: '/workspace/emergency/referrals',
    }),
    secondaryAction: Object.freeze({
      label: 'Prioritize referrals',
      actionType: 'assistant',
      prompt: 'Prioritize ED referral and consult queue items by waiting time, disposition dependency, service line, and missing handoff information.',
    }),
    supportingDetail: 'Reduces coordination delays across ED, specialty, transfer, and follow-up queues.',
  }),
  Object.freeze({
    id: 'bed-pressure',
    label: 'Bed Pressure',
    value: 'Boarding watch',
    helper: '6 pending admissions, 4 waiting beds, 2 delay flags',
    severity: 'critical',
    targetSurface: 'flow',
    primaryAction: Object.freeze({
      label: 'Review bed flow',
      actionType: 'route',
      target: '/workspace/emergency/flow',
    }),
    secondaryAction: Object.freeze({
      label: 'Summarize boarding pressure',
      actionType: 'assistant',
      prompt: 'Summarize ED bed pressure, pending admissions, boarding delays, and disposition bottlenecks without making autonomous operational decisions.',
    }),
    supportingDetail: 'Makes boarding and admission bottlenecks visible from the command center.',
  }),
  Object.freeze({
    id: 'equipment-status',
    label: 'Equipment Status',
    value: 5,
    helper: 'Telemetry gap, pumps, monitors, wheelchair availability',
    severity: 'high',
    targetSurface: 'iot',
    primaryAction: Object.freeze({
      label: 'Open equipment status',
      actionType: 'route',
      target: '/workspace/emergency/iot',
    }),
    secondaryAction: Object.freeze({
      label: 'Review equipment constraints',
      actionType: 'assistant',
      prompt: 'Summarize ED equipment constraints, telemetry gaps, battery risk, and maintenance prompts that may affect patient flow.',
    }),
    supportingDetail: 'Tracks operational equipment constraints that can slow assessment, monitoring, and discharge.',
  }),
  Object.freeze({
    id: 'staffing-pressure',
    label: 'Staffing Pressure',
    value: 'Surge watch',
    helper: '2 triage nurses, 1 attending gap, 90-minute peak forecast',
    severity: 'high',
    targetSurface: 'analytics',
    primaryAction: Object.freeze({
      label: 'Open surge analytics',
      actionType: 'route',
      target: '/workspace/emergency/analytics',
    }),
    secondaryAction: Object.freeze({
      label: 'Forecast staffing pressure',
      actionType: 'assistant',
      prompt: 'Summarize current ED staffing pressure, expected arrivals, queue load, and review-required surge actions.',
    }),
    supportingDetail: 'Surfaces operational pressure before the department becomes fully reactive.',
  }),
  Object.freeze({
    id: 'flow-alerts',
    label: 'Alerts',
    value: 4,
    helper: 'Stroke window, sepsis concern, trauma bay, device disconnect',
    severity: 'critical',
    targetSurface: 'alerts',
    primaryAction: Object.freeze({
      label: 'Review critical alerts',
      actionType: 'route',
      target: '/workspace/emergency/alerts',
    }),
    secondaryAction: Object.freeze({
      label: 'Open escalation guidance',
      actionType: 'assistant',
      prompt: 'Review ED critical alerts and provide escalation guidance for human confirmation.',
    }),
    supportingDetail: 'Combines clinical, operational, and device alerts into one escalation view.',
  }),
]);

export const EMERGENCY_TRIAGE_ORCHESTRATOR = Object.freeze({
  id: 'emergency-triage-orchestrator',
  label: 'Triage Orchestrator',
  inputs: Object.freeze(['Vitals', 'Chief Complaint', 'Intake Data']),
  calculatorSequence: Object.freeze([
    Object.freeze({
      id: REGISTRY.qsofa,
      label: 'qSOFA',
      trigger: 'Sepsis concern, infection, hypotension, tachypnea, altered mentation.',
    }),
    Object.freeze({
      id: REGISTRY.news2,
      label: 'NEWS2',
      trigger: 'Any abnormal vital signs or deterioration watch.',
    }),
    Object.freeze({
      id: REGISTRY.heartScore,
      label: 'HEART',
      trigger: 'Chest pain or ACS concern.',
    }),
    Object.freeze({
      id: REGISTRY.wellsPe,
      label: 'Wells PE',
      trigger: 'Shortness of breath, pleuritic pain, PE concern, tachycardia, hemoptysis.',
    }),
    Object.freeze({
      id: REGISTRY.wellsDvtCalculator,
      label: 'Wells DVT',
      trigger: 'Unilateral leg swelling, DVT concern, VTE pathway context.',
    }),
    Object.freeze({
      id: REGISTRY.shockIndex,
      label: 'Shock Index',
      trigger: 'Trauma, bleeding concern, hypotension, tachycardia, hemodynamic instability.',
    }),
  ]),
  outputs: Object.freeze([
    'risk profile',
    'complaint-specific workflow path',
    'surfaced calculator prompts',
    'red flag summary',
    'clinician review queue item',
  ]),
  dynamicRiskBundleEngine: Object.freeze({
    engineId: 'dynamic-risk-bundle-engine',
    inputSchema: Object.freeze(['chief complaint', 'age', 'vitals', 'risk factors']),
    outputSchema: Object.freeze(['Risk Bundle', 'Emergency Risk Profile']),
    displayRule: 'Display one consolidated Emergency Risk Profile instead of disconnected calculators.',
  }),
  safetyStatement:
    'The triage orchestrator generates risk profiles and review prompts only. It does not make autonomous diagnoses, disposition decisions, or treatment decisions.',
});

export const DYNAMIC_RISK_BUNDLE_RULES = Object.freeze([
  Object.freeze({
    complaint: 'Chest Pain',
    aliases: Object.freeze(['chest pain', 'chest pressure', 'acs']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.heartScore, label: 'HEART', reason: 'ACS risk workflow context' }),
      Object.freeze({ id: REGISTRY.shockIndex, label: 'Shock Index', reason: 'Hemodynamic instability screen' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Stroke Symptoms',
    aliases: Object.freeze(['stroke', 'stroke symptoms', 'facial droop', 'slurred speech', 'neuro deficit']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.nihss, label: 'NIHSS', reason: 'Stroke deficit severity context' }),
      Object.freeze({ id: REGISTRY.gcsCalculator, label: 'GCS', reason: 'Consciousness and neurologic handoff context' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Sepsis Concern',
    aliases: Object.freeze(['sepsis', 'sepsis concern', 'infection', 'fever hypotension']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.qsofa, label: 'qSOFA', reason: 'Sepsis screening context' }),
      Object.freeze({ id: REGISTRY.news2, label: 'NEWS2', reason: 'Physiologic deterioration context' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Shortness of Breath',
    aliases: Object.freeze(['shortness of breath', 'sob', 'dyspnea', 'respiratory distress']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.news2, label: 'NEWS2', reason: 'Respiratory deterioration context' }),
      Object.freeze({ id: REGISTRY.wellsPe, label: 'Wells PE', reason: 'PE workflow context when clinically appropriate' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Trauma',
    aliases: Object.freeze(['trauma', 'mvc', 'fall injury', 'penetrating trauma']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.shockIndex, label: 'Shock Index', reason: 'Hemodynamic instability screen' }),
      Object.freeze({ id: REGISTRY.gcsCalculator, label: 'GCS', reason: 'Trauma neurologic handoff context' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Abdominal Pain',
    aliases: Object.freeze(['abdominal pain', 'belly pain', 'gi bleed', 'pancreatitis']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.bisapScore, label: 'BISAP', reason: 'Pancreatitis severity context when suspected' }),
      Object.freeze({ id: REGISTRY.glasgowBlatchfordScore, label: 'Glasgow-Blatchford', reason: 'GI bleed workflow context when suspected' }),
    ]),
  }),
  Object.freeze({
    complaint: 'Psychiatric Crisis',
    aliases: Object.freeze(['psychiatric crisis', 'behavioral health crisis', 'suicidal ideation', 'self harm']),
    calculators: Object.freeze([
      Object.freeze({ id: REGISTRY.columbiaSuicideSeverityWorkflow, label: 'C-SSRS', reason: 'Suicide risk workflow context' }),
      Object.freeze({ id: REGISTRY.phq9, label: 'PHQ-9', reason: 'Depression screening context when appropriate' }),
    ]),
  }),
]);

function findDynamicRiskBundleRule(chiefComplaint = '') {
  const normalized = normalizeComplaintText(chiefComplaint);
  if (!normalized) return null;

  return (
    DYNAMIC_RISK_BUNDLE_RULES.find((rule) =>
      rule.aliases.some((alias) => {
        const normalizedAlias = normalizeComplaintText(alias);
        return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
      })
    ) || null
  );
}

function buildRiskFlags({ age, vitals, riskFactors, matchedComplaint }) {
  const numericAge = Number.parseInt(age, 10);
  const vitalsText = String(vitals || '').toLowerCase();
  const riskText = String(riskFactors || '').toLowerCase();
  const flags = [
    matchedComplaint
      ? `${matchedComplaint} bundle selected from chief complaint.`
      : 'No supported complaint bundle matched; use manual clinician review.',
  ];

  if (Number.isFinite(numericAge) && numericAge >= 65) {
    flags.push('Age 65+ increases reassessment priority.');
  }
  if (/bp\s*(\d{2})\/|sbp\s*(\d{2})|hypotension|shock|hr\s*(1[2-9][0-9]|[2-9][0-9]{2})/.test(vitalsText)) {
    flags.push('Hemodynamic concern detected from vitals text.');
  }
  if (/rr\s*(2[4-9]|[3-9][0-9])|spo2\s*(8[0-9]|9[0-2])|hypoxia|respiratory distress/.test(vitalsText)) {
    flags.push('Respiratory concern detected from vitals text.');
  }
  if (/fever|temp\s*(3[89]|4[0-9])|infection|sepsis/.test(vitalsText) || /immun|infection|sepsis/.test(riskText)) {
    flags.push('Infection or immunosuppression concern detected.');
  }
  if (/anticoag|pregnan|stroke|trauma|self[-\s]?harm|suicid|chest pain|pe/.test(riskText)) {
    flags.push('Risk factors should be preserved in handoff and clinician review.');
  }

  return Object.freeze(flags);
}

function profileSeverity(flags = [] as any[]) {
  if (flags.length >= 4) return 'critical review';
  if (flags.length >= 3) return 'high review';
  return 'standard review';
}

export function buildDynamicRiskBundle({
  chiefComplaint = '',
  age = '',
  vitals = '',
  riskFactors = '',
}: any = {}) {
  const routedComplaint = routeEmergencyChiefComplaint(chiefComplaint);
  const matchedRule = findDynamicRiskBundleRule(routedComplaint?.complaint || chiefComplaint);
  const matchedComplaint = matchedRule?.complaint || routedComplaint?.complaint || null;
  const calculators = Object.freeze(
    (matchedRule?.calculators || routedComplaint?.calculators || []).map((calculator) =>
      Object.freeze({
        ...calculator,
        reviewStatus: 'clinician review required',
      })
    )
  );
  const flags = buildRiskFlags({ age, vitals, riskFactors, matchedComplaint });
  const workflow = routedComplaint?.workflows?.[0] || (matchedComplaint ? `${matchedComplaint} Workflow` : 'Manual clinician review');

  return Object.freeze({
    engineId: 'dynamic-risk-bundle-engine',
    title: 'Dynamic Risk Bundle Engine',
    input: Object.freeze({
      chiefComplaint,
      age,
      vitals,
      riskFactors,
    }),
    outputType: 'Risk Bundle',
    matchedComplaint,
    workflow,
    riskBundle: calculators,
    emergencyRiskProfile: Object.freeze({
      title: 'Emergency Risk Profile',
      consolidated: true,
      severity: profileSeverity(flags as any),
      complaint: matchedComplaint || 'Unmatched complaint',
      summary: `${matchedComplaint || 'Unmatched complaint'} risk profile from complaint, age, vitals, and risk factors.`,
      calculators,
      flags,
      noDisconnectedCalculators: true,
      reviewRequirement: 'Clinician review is required before triage, diagnosis, orders, disposition, referral, or escalation.',
    }),
    safetyStatement:
      'Dynamic Risk Bundle Engine creates one consolidated Emergency Risk Profile. It does not diagnose, score autonomously, order treatment, or determine disposition.',
  });
}

export const EMERGENCY_RAG_COMPLAINT_CONTEXT = Object.freeze([
  Object.freeze({
    complaint: 'Chest Pain',
    protocols: ['ACS/chest pain pathway', 'ECG and troponin review', 'cardiology consult criteria'],
    evidence: ['ACS risk stratification', 'troponin timing evidence', 'ECG red flag evidence'],
    recommendedCalculators: [REGISTRY.heartScore, REGISTRY.graceAcs],
    workflows: ['chest pain pathway', 'documentation integrity', 'referral routing'],
    simulations: ['ACS chest pain simulation', 'handoff documentation drill'],
  }),
  Object.freeze({
    complaint: 'Stroke Symptoms',
    protocols: ['stroke window workflow', 'imaging escalation pathway', 'neurology referral criteria'],
    evidence: ['stroke time-window evidence', 'NIHSS interpretation support', 'thrombolysis safety context'],
    recommendedCalculators: [REGISTRY.nihss, REGISTRY.news2],
    workflows: ['stroke pathway', 'referral routing', 'documentation integrity'],
    simulations: ['stroke escalation simulation', 'time-critical handoff drill'],
  }),
  Object.freeze({
    complaint: 'Sepsis Concern',
    protocols: ['sepsis pathway', 'lactate/culture workflow', 'antibiotic review workflow'],
    evidence: ['sepsis screening evidence', 'early warning score context', 'source control workflow context'],
    recommendedCalculators: [REGISTRY.qsofa, REGISTRY.news2, REGISTRY.sofaScore],
    workflows: ['automated triage matrix', 'RAG evidence retrieval', 'surge staffing'],
    simulations: ['sepsis deterioration simulation', 'shock escalation drill'],
  }),
  Object.freeze({
    complaint: 'Trauma',
    protocols: ['trauma primary survey', 'ATLS workflow context', 'massive transfusion review'],
    evidence: ['trauma acuity evidence', 'hemodynamic risk context', 'imaging decision support context'],
    recommendedCalculators: [REGISTRY.shockIndex, REGISTRY.revisedTraumaScore],
    workflows: ['automated triage matrix', 'surge staffing', 'medical IoT monitoring'],
    simulations: ['trauma bay team simulation', 'shock index drill'],
  }),
  Object.freeze({
    complaint: 'Shortness of Breath',
    protocols: ['respiratory distress pathway', 'PE evaluation pathway', 'oxygen escalation workflow'],
    evidence: ['PE risk evidence', 'oxygen escalation context', 'NEWS2 respiratory risk context'],
    recommendedCalculators: [REGISTRY.news2, REGISTRY.wellsPe, REGISTRY.perc],
    workflows: ['RAG evidence retrieval', 'medical IoT monitoring', 'referral routing'],
    simulations: ['respiratory distress simulation', 'PE risk workflow simulation'],
  }),
  Object.freeze({
    complaint: 'Abdominal Pain',
    protocols: ['abdominal pain pathway', 'GI bleed and pancreatitis review', 'surgical abdomen red flag review'],
    evidence: ['GI bleed risk evidence', 'pancreatitis severity evidence', 'surgical abdomen red flag context'],
    recommendedCalculators: [REGISTRY.ransonCriteria, REGISTRY.bisapScore, REGISTRY.glasgowBlatchfordScore],
    workflows: ['abdominal pain workflow', 'referral routing', 'documentation integrity'],
    simulations: ['abdominal pain escalation simulation', 'GI bleed handoff drill'],
  }),
  Object.freeze({
    complaint: 'Psychiatric Crisis',
    protocols: ['behavioral health safety pathway', 'suicide risk and observation protocol', 'crisis referral criteria'],
    evidence: ['suicide risk screening context', 'agitation safety pathway', 'behavioral health observation evidence'],
    recommendedCalculators: [REGISTRY.columbiaSuicideSeverityWorkflow, REGISTRY.phq9, REGISTRY.gad7],
    workflows: ['psychiatric crisis workflow', 'safety observation review', 'referral routing'],
    simulations: ['behavioral health safety simulation', 'crisis handoff drill'],
  }),
]);

export const EMERGENCY_CHIEF_COMPLAINT_ROUTES = CLINICAL_INTENT_ROUTES;

export const EMERGENCY_AI_COPILOT = Object.freeze({
  copilotId: 'emergency-ai-copilot',
  title: 'ED AI Copilot',
  role:
    'Converts complaint, vitals, and workspace context into explainable ED workflow guidance with calculators surfaced automatically inside the pathway.',
  inputSchema: Object.freeze(['complaint', 'vitals', 'workspaceContext', 'surfacedCalculators']),
  outputSchema: Object.freeze([
    'complaint',
    'workflow',
    'surfacedCalculators',
    'protocols',
    'referrals',
    'aiCopilot',
    'escalationSuggestions',
    'reasoning',
  ]),
  safetyBoundary:
    'Workflow guidance only. No autonomous diagnosis, disposition, treatment, orders, or escalation decisions.',
  reasoningRequirement:
    'Always explain which complaint route, vitals context, workspace context, and automatically surfaced calculators informed each recommendation.',
  reviewRequirement: 'Clinician review is required for every Copilot output.',
});

export const EMERGENCY_ANALYTICS_EVENTS = Object.freeze([
  'assessments_completed',
  'calculators_used',
  'protocol_retrievals',
  'workflow_launches',
  'ai_requests',
  'simulation_completion',
]);

export const EMERGENCY_ANALYTICS_MVP = Object.freeze({
  route: '/workspace/emergency/analytics',
  title: 'Emergency Analytics MVP',
  goal: 'Provide measurable value by showing ED adoption, workflow lift, and ROI from the first pilot.',
  trackedEvents: EMERGENCY_ANALYTICS_EVENTS,
  metrics: Object.freeze([
    Object.freeze({
      id: 'assessments_completed',
      label: 'Assessments completed',
      value: 68,
      unit: 'review-ready assessments',
      helper: 'Completed triage or reassessment workflows that generated a clinician-reviewable risk profile.',
      roiSignal: 'Shows that the ED team is moving patient review work into the workspace.',
    }),
    Object.freeze({
      id: 'calculators_used',
      label: 'Calculators used',
      value: 41,
      unit: 'calculator launches',
      helper: 'qSOFA, NEWS2, HEART, Wells, Shock Index, NIHSS, and other ED calculators launched in context.',
      roiSignal: 'Shows standardization of risk review instead of ad hoc tool hunting.',
    }),
    Object.freeze({
      id: 'protocol_retrievals',
      label: 'Protocol retrievals',
      value: 27,
      unit: 'protocol lookups',
      helper: 'Complaint-specific protocol and evidence retrievals from the ED evidence surface.',
      roiSignal: 'Shows faster access to local pathways and evidence during time-sensitive presentations.',
    }),
    Object.freeze({
      id: 'workflow_launches',
      label: 'Workflow launches',
      value: 34,
      unit: 'workflow starts',
      helper: 'Command center, triage, evidence, automation, and route-specific workflow launches.',
      roiSignal: 'Shows the workspace is becoming the operating layer for ED next steps.',
    }),
    Object.freeze({
      id: 'ai_requests',
      label: 'AI requests',
      value: 22,
      unit: 'review-required requests',
      helper: 'ED Copilot or Assistant requests sent with emergency workspace context.',
      roiSignal: 'Shows demand for explainable guidance while preserving human review.',
    }),
    Object.freeze({
      id: 'simulation_completion',
      label: 'Simulation completion',
      value: 6,
      unit: 'completed simulations',
      helper: 'ED simulation practice, debrief, or academy completions.',
      roiSignal: 'Shows clinical gaps turning into completed practice and training activity.',
    }),
  ]),
  roiSummary: Object.freeze({
    adoption: 'Six pilot signals show whether clinicians repeatedly use the ED workspace for assessment, calculators, protocols, workflows, AI guidance, and simulation.',
    valueProof:
      'Assessments, calculator launches, protocol retrievals, workflow launches, and AI requests demonstrate time saved from fewer disconnected lookups and more standardized review paths.',
    expansion:
      'Strong protocol, AI, workflow, or simulation adoption supports add-on conversations for Documentation Integrity, Referral Routing, and Simulation Academy.',
    dataPosture: 'Runs on local/demo pilot events now and can later swap to integrated event feeds without changing the route contract.',
  }),
  humanReviewStatement:
    'Analytics prove usage and workflow value. They do not score autonomous clinical quality, diagnosis, treatment, disposition, or escalation decisions.',
});

export const EMERGENCY_DEMO_DATA_LABELS = Object.freeze({
  dataLabel: 'Demo data',
  tenantLabel: 'Demo tenant',
  integrationLabel: 'No live integration',
});

export const EMERGENCY_DEMO_TENANT = Object.freeze({
  tenantId: 'emergency-demo-tenant',
  tenantName: 'CareDroid Demo Hospital',
  workspaceId: EMERGENCY_WORKSPACE_ID,
  workspaceRoute: '/workspace/emergency/demo',
  mode: 'demo',
  dataPosture: 'Demo/local data only. No live EHR, ADT, telemetry, protocol, or analytics integration is connected.',
  safetyPosture:
    'Emergency Demo Mode is for product evaluation. All sample clinical outputs remain workflow guidance for human review.',
  labels: EMERGENCY_DEMO_DATA_LABELS,
  samplePatients: Object.freeze([
    Object.freeze({
      id: 'ED-DEMO-001',
      displayName: 'Demo Patient A',
      chiefComplaint: 'Chest pain',
      state: 'triage',
      acuity: 'High-risk review',
      location: 'Waiting room',
      summary: 'Chest pressure with HEART review ready for clinician confirmation.',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'ED-DEMO-002',
      displayName: 'Demo Patient B',
      chiefComplaint: 'Stroke symptoms',
      state: 'assessment',
      acuity: 'Time-sensitive protocol',
      location: 'Assessment bay',
      summary: 'Facial droop sample patient with NIHSS and stroke protocol retrieval attached.',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'ED-DEMO-003',
      displayName: 'Demo Patient C',
      chiefComplaint: 'Sepsis concern',
      state: 'results',
      acuity: 'Critical alert',
      location: 'Results pending',
      summary: 'Fever and hypotension sample patient with qSOFA, NEWS2, and sepsis pathway prompts.',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'ED-DEMO-004',
      displayName: 'Demo Patient D',
      chiefComplaint: 'Shortness of breath',
      state: 'disposition',
      acuity: 'Protocol review',
      location: 'Disposition queue',
      summary: 'Dyspnea sample patient with Wells PE and respiratory protocol context.',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
  ]),
  sampleAlerts: Object.freeze([
    Object.freeze({
      id: 'demo-alert-stroke-window',
      label: 'Stroke window review',
      severity: 'critical',
      detail: 'Demo alert for time-sensitive stroke protocol review.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-alert-sepsis-risk',
      label: 'Sepsis risk review',
      severity: 'critical',
      detail: 'Demo alert for qSOFA, NEWS2, lactate workflow, and clinician escalation review.',
      targetRoute: '/workspace/emergency/triage',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-alert-documentation-gap',
      label: 'Documentation gap',
      severity: 'medium',
      detail: 'Demo alert for missing triage facts before discharge/admission handoff.',
      targetRoute: '/workspace/emergency/documentation',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
  ]),
  sampleWorkflows: Object.freeze([
    Object.freeze({
      id: 'demo-workflow-triage-review',
      label: 'Triage review',
      detail: 'Open chief complaint, vitals, calculators, and clinician-review risk profile.',
      targetRoute: '/workspace/emergency/triage',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-workflow-protocol-retrieval',
      label: 'Protocol retrieval',
      detail: 'Retrieve complaint-specific protocols, evidence, calculators, workflows, and simulations.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-workflow-ai-copilot',
      label: 'AI Copilot request',
      detail: 'Ask ED Copilot for explainable workflow guidance with demo complaint and vitals context.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-workflow-analytics-review',
      label: 'Analytics review',
      detail: 'Review adoption and ROI signals from sample Emergency Analytics MVP events.',
      targetRoute: '/workspace/emergency/analytics',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
  ]),
  sampleProtocols: Object.freeze([
    Object.freeze({
      id: 'demo-protocol-chest-pain',
      complaint: 'Chest Pain',
      protocol: 'ACS/chest pain pathway',
      summary: 'Demo protocol card for HEART review, ECG/troponin workflow, and cardiology criteria.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-protocol-stroke',
      complaint: 'Stroke Symptoms',
      protocol: 'Stroke window workflow',
      summary: 'Demo protocol card for NIHSS, imaging escalation, and neurology review criteria.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-protocol-sepsis',
      complaint: 'Sepsis Concern',
      protocol: 'Sepsis pathway',
      summary: 'Demo protocol card for qSOFA, NEWS2, lactate/culture workflow, and escalation review.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-protocol-trauma',
      complaint: 'Trauma',
      protocol: 'Trauma primary survey',
      summary: 'Demo protocol card for trauma bay workflow, Shock Index, and ATLS context.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
    Object.freeze({
      id: 'demo-protocol-respiratory',
      complaint: 'Shortness of Breath',
      protocol: 'Respiratory distress pathway',
      summary: 'Demo protocol card for Wells PE, NEWS2, oxygen escalation, and respiratory review.',
      targetRoute: '/workspace/emergency/evidence',
      ...EMERGENCY_DEMO_DATA_LABELS,
    }),
  ]),
  sampleAnalytics: Object.freeze(
    EMERGENCY_ANALYTICS_MVP.metrics.map((metric) =>
      Object.freeze({
        ...metric,
        ...EMERGENCY_DEMO_DATA_LABELS,
      })
    )
  ),
});

export const EMERGENCY_ROI_ESTIMATOR = Object.freeze({
  route: '/workspace/emergency/roi',
  title: 'ED ROI Estimator',
  goal: 'Estimate CareDroid value for sales discovery, onboarding, and pilot planning.',
  inputFields: Object.freeze([
    Object.freeze({
      id: 'annualEdVolume',
      label: 'Annual ED volume',
      defaultValue: 42000,
      helper: 'Total emergency department visits per year.',
    }),
    Object.freeze({
      id: 'physicianCount',
      label: 'Physician count',
      defaultValue: 32,
      helper: 'Emergency physicians, advanced practice clinicians, or attending-equivalent users in scope.',
    }),
    Object.freeze({
      id: 'nursingCount',
      label: 'Nursing count',
      defaultValue: 88,
      helper: 'ED nurses and triage nurses in scope for onboarding.',
    }),
    Object.freeze({
      id: 'averageAssessmentsPerDay',
      label: 'Average assessments/day',
      defaultValue: 115,
      helper: 'Average triage, reassessment, or clinician-review assessments completed per day.',
    }),
  ]),
  assumptions: Object.freeze({
    minutesSavedPerAssessment: 4,
    workflowCoverageRate: 0.35,
    minutesSavedPerWorkflowLaunch: 2,
    baselineEfficiencyLift: 12,
    maxEfficiencyLift: 32,
  }),
  outputDefinitions: Object.freeze([
    Object.freeze({
      id: 'estimatedTimeSaved',
      label: 'Estimated time saved',
      helper: 'Projected annual hours saved from standardized assessment, calculator routing, protocol retrieval, workflow launch, and Copilot guidance.',
    }),
    Object.freeze({
      id: 'workflowEfficiency',
      label: 'Workflow efficiency',
      helper: 'Estimated efficiency lift from moving repeated ED work into CareDroid.',
    }),
    Object.freeze({
      id: 'adoptionPotential',
      label: 'Adoption potential',
      helper: 'Simple sales/onboarding signal based on volume, staff reach, and daily assessment load.',
    }),
  ]),
  disclaimer:
    'ROI output is a planning estimate for sales and onboarding. It is not a clinical quality claim, guaranteed financial return, or autonomous care decision.',
});

export const EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT = Object.freeze({
  route: '/workspace/emergency/deployment',
  title: 'First Customer Deployment Blueprint',
  goal: 'Deploy CareDroid for the first ED customer with minimal operational risk.',
  principle:
    'Start with standalone CareDroid, keep every clinical output human-reviewed, and add integrations only after the buyer sees value.',
  minimumSellableCapabilities: Object.freeze([
    'Patient Journey Engine',
    'Queue Intelligence',
    'ED Copilot',
    'Referral Intelligence',
    'EMS Intelligence',
    'Analytics',
  ]),
  rolloutPlans: Object.freeze([
    Object.freeze({
      id: '30-day-pilot',
      label: '30-day pilot plan',
      outcome:
        'Staff can walk through patient flow, queue pressure, Copilot guidance, referrals, EMS handoffs, and basic analytics without integrations.',
      focus: Object.freeze(['demo tenant', 'patient journey', 'queues', 'Copilot', 'referrals', 'EMS', 'analytics']),
    }),
    Object.freeze({
      id: '60-day-rollout',
      label: '60-day rollout plan',
      outcome:
        'The ED has validated workflows, tuned thresholds, role-specific views, and measurable adoption for a department-level operating review.',
      focus: Object.freeze(['workflow validation', 'threshold tuning', 'role views', 'weekly analytics review', 'source-state labels']),
    }),
    Object.freeze({
      id: '90-day-expansion',
      label: '90-day expansion plan',
      outcome:
        'The customer can justify continued ED-only use or expansion based on throughput, coordination, referral, EMS, and analytics value.',
      focus: Object.freeze(['read-only feeds', 'KPI rollups', 'escalations', 'resource visibility', 'ROI review']),
    }),
  ]),
  phases: Object.freeze([
    Object.freeze({
      id: 'phase-1-standalone-emergency-workspace',
      phase: 'Phase 1',
      title: 'Standalone CareDroid',
      description:
        'Demonstrate the Emergency Whiteboard, triage flow, calculators, sample patients, sample alerts, onboarding, ROI estimator, and safety messaging with demo/local data.',
      operationalRisk: 'Minimal',
      integrationRequirement: 'No integrations required',
      acceptance:
        'Prospect can experience CareDroid without EHR writeback, order placement, disposition automation, or live patient identity dependency.',
    }),
    Object.freeze({
      id: 'phase-2-protocol-library',
      phase: 'Phase 2',
      title: 'Protocol Library',
      description:
        'Add configured chest pain, stroke symptoms, sepsis concern, trauma, and shortness of breath protocols with approved local pathway notes.',
      operationalRisk: 'Low',
      integrationRequirement: 'Configured protocol content only',
      acceptance:
        'Clinicians can retrieve approved protocol guidance while continuing to verify local policy and make all clinical decisions.',
    }),
    Object.freeze({
      id: 'phase-3-ai-copilot',
      phase: 'Phase 3',
      title: 'AI Copilot',
      description:
        'Enable complaint-aware workflow guidance, calculator recommendations, protocol summaries, next-step suggestions, reasoning, and safety boundaries.',
      operationalRisk: 'Low with human review',
      integrationRequirement: 'No EHR writeback required',
      acceptance:
        'Copilot supports workflow guidance only and does not diagnose, order treatment, determine disposition, or autonomously escalate.',
    }),
    Object.freeze({
      id: 'phase-4-analytics',
      phase: 'Phase 4',
      title: 'Analytics',
      description:
        'Track assessments completed, calculators used, protocol retrievals, workflow launches, AI requests, and simulation completion.',
      operationalRisk: 'Minimal',
      integrationRequirement: 'Demo/local or CareDroid event data',
      acceptance:
        'Analytics demonstrate adoption, workflow efficiency, and ROI potential without claiming autonomous clinical quality outcomes.',
    }),
    Object.freeze({
      id: 'phase-5-optional-integrations',
      phase: 'Phase 5',
      title: 'Optional Integrations',
      description:
        'Add ADT, encounter, EHR documentation, protocol sync, referral, device telemetry, staffing, or LMS integrations one at a time after standalone value is proven.',
      operationalRisk: 'Scoped by integration',
      integrationRequirement: 'Customer-approved integration scope',
      acceptance:
        'No live writeback or hospital-wide rollout is required until governance, testing, and customer approval are complete.',
    }),
  ]),
  acceptance:
    'CareDroid can be demonstrated, piloted, and sold without requiring a full hospital-wide deployment.',
});

export const EMERGENCY_OS_IMPLEMENTATION_SUMMARY = Object.freeze({
  route: '/workspace/emergency/implementation',
  title: 'CareDroid MVP Implementation Summary',
  purpose:
    'Document and display what has been implemented for the ED OS MVP, what markdown plan each capability satisfies, and which live integrations remain intentionally out of scope.',
  sourceDocument: 'docs/emergency-os-mvp-implementation-summary.md',
  implementationPosture:
    'Frontend/demo deterministic ED operating system with clearly labeled local data and no live hospital integration requirement.',
  coverage: Object.freeze([
    Object.freeze({
      doc: 'door-to-doctor-intelligence.md',
      capability: 'Door-to-Doctor Intelligence',
      route: '/workspace/emergency/throughput',
      service: 'DoorToDoctorIntelligenceService',
      acceptance: 'Leadership can monitor throughput.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'waiting-room-intelligence.md',
      capability: 'Waiting Room Intelligence',
      route: '/workspace/emergency/waiting-room',
      service: 'WaitingRoomIntelligenceService',
      acceptance: 'Waiting room pressure becomes visible.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'reassessment-automation.md',
      capability: 'Reassessment Queue',
      route: '/workspace/emergency/waiting-room',
      service: 'ReassessmentAutomationService',
      acceptance: 'Patients do not disappear into the waiting room.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'ems-offload-command-center.md',
      capability: 'EMS Offload Command Center',
      route: '/workspace/emergency/ems',
      service: 'EmsOffloadCommandCenterService',
      acceptance: 'EMS pressure becomes measurable.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'emergency-resource-board.md',
      capability: 'Emergency Resource Board',
      route: '/workspace/emergency/resources',
      service: 'EmergencyResourceBoardService',
      acceptance: 'Staff can understand resource availability.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'emergency-escalation-engine.md',
      capability: 'Emergency Escalation Engine',
      route: '/workspace/emergency/escalations',
      service: 'EmergencyEscalationEngineService',
      acceptance: 'Operational issues are surfaced early.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'emergency-kpi-layer.md',
      capability: 'Emergency KPI Layer',
      route: '/workspace/emergency/analytics',
      service: 'EmergencyKPILayerService',
      acceptance: 'All metrics originate from one source.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'emergency-simulation-scenarios.md',
      capability: 'Emergency Simulation Scenarios',
      route: '/workspace/emergency/simulations',
      service: 'EmergencySimulationScenariosService',
      acceptance: 'Training mirrors real operational problems.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'emergency-demo-environment.md',
      capability: 'Emergency Demo Environment',
      route: '/workspace/emergency/demo',
      service: 'EmergencyDemoEnvironmentService',
      acceptance: 'Prospects can experience ED OS without integrations.',
      status: 'implemented',
    }),
    Object.freeze({
      doc: 'first-customer-path.md',
      capability: 'First Customer Path',
      route: '/workspace/emergency/deployment',
      service: 'EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT',
      acceptance: 'CareDroid can be piloted by an Emergency Department without requiring hospital-wide deployment.',
      status: 'implemented',
    }),
  ]),
  minimumSellableCapabilities: EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.minimumSellableCapabilities,
  verification: Object.freeze({
    testCommand:
      'npm run test:run -- src/services/emergencyOsMvpServices.test.js src/services/workspaceDataPipelineService.test.js src/services/emergencyOperatingSystemService.test.js src/pages/WorkspaceHome.test.jsx src/components/QuickCommandLauncher.test.jsx src/data/searchFirstDiscovery.test.js src/data/platformOperatingSystem.test.js src/pages/profile/ProfileWorkspaces.test.jsx src/data/workspaceArchitecture.test.js',
    testFiles: 9,
    tests: 69,
    status: 'passing',
    lintStatus: 'No linter errors on edited files',
  }),
  frozenModules: Object.freeze([
    'Research Feature',
    'Education Feature',
    'Governance Feature',
    'Fleet Feature',
    'Medical IoT Feature',
    'Laboratory Feature',
  ]),
  intentionalBoundaries: Object.freeze([
    'No live EHR or ADT ingestion in the MVP.',
    'No EMS CAD feed integration in the MVP.',
    'No live bed board, staffing, or device telemetry integration in the MVP.',
    'No autonomous diagnosis, orders, disposition, or escalation.',
    'No stored simulation debrief engine yet.',
  ]),
});

export const EMERGENCY_FLOW_STAGES = Object.freeze([
  'Arrival',
  'Triage',
  'Assessment',
  'Orders',
  'Results',
  'Disposition',
  'Admission/Discharge',
]);

export const EMERGENCY_FLOW_MARKET_PAINS = Object.freeze([
  'Too many patients',
  'Too few clinicians',
  'Too much coordination',
  'Too many handoffs',
  'Too much waiting',
  'Too much cognitive load',
]);

export const EMERGENCY_FLOW_VALUE_DRIVERS = Object.freeze([
  Object.freeze({
    id: 'throughput',
    title: 'Throughput',
    description: 'Move patients safely from arrival through disposition with fewer avoidable waits.',
    proofSignals: Object.freeze(['arrival-to-triage time', 'assessment wait', 'disposition delay']),
  }),
  Object.freeze({
    id: 'capacity',
    title: 'Capacity',
    description: 'Expose bed, room, staff, equipment, and vehicle bottlenecks before they stall the ED.',
    proofSignals: Object.freeze(['bed pressure', 'boarding delay', 'equipment delay']),
  }),
  Object.freeze({
    id: 'coordination',
    title: 'Coordination',
    description: 'Reduce repeated handoffs across EMS, ED, specialty services, laboratory, and discharge teams.',
    proofSignals: Object.freeze(['handoff delay', 'referral queue age', 'workflow launches']),
  }),
  Object.freeze({
    id: 'cognitive-load',
    title: 'Cognitive Load',
    description: 'Help clinicians see the next reviewable workflow without autonomous clinical or operational decisions.',
    proofSignals: Object.freeze(['AI requests', 'review prompts', 'protocol retrievals']),
  }),
]);

export const EMERGENCY_FLOW_OPERATING_PRINCIPLES = Object.freeze([
  'Do not build isolated calculators or tools.',
  'Map every automation, workflow, analytics event, whiteboard widget, AI capability, and package into the ED patient flow.',
  'Keep every clinical, operational, handoff, referral, discharge, and escalation action under human review.',
  'Demonstrate value without requiring a full hospital-wide deployment or live writeback.',
]);

export const EMERGENCY_FLOW_FIRST_CUSTOMER_READINESS = Object.freeze({
  sellableNow:
    'Emergency Flow Starter can be demonstrated and piloted with standalone ED command center, dynamic triage, discharge acceleration, ED Copilot, analytics, and demo/local data.',
  buyerProof:
    'Lead first-customer conversations with throughput, capacity, coordination, and cognitive-load proof instead of calculator volume alone.',
  noIntegrationPosture:
    'Standalone demo and pilot remain usable without ADT, EHR, EMS CAD, device telemetry, staffing, or bed-management integrations.',
  pilotScope: Object.freeze([
    'One ED site',
    'Manual/demo intake and command-center data',
    'Human-reviewed workflows only',
    'Analytics for adoption, time saved, bottlenecks, and ROI potential',
  ]),
  buyerPersonas: Object.freeze(['ED Director', 'COO', 'EMS Organization', 'Hospital Operations']),
});

export const EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS = Object.freeze([
  Object.freeze({
    id: 'pre-hospital-intelligence',
    title: 'Pre-Hospital Intelligence',
    buyerPain: 'Receiving hospitals need earlier risk and arrival context before the patient reaches the ED.',
    flowStages: ['Arrival', 'Triage'],
    capabilities: ['qSOFA', 'NEWS2', 'stroke screening', 'STEMI workflow support', 'trauma workflow support', 'sepsis workflow support'],
    workflows: ['EMS risk capture', 'receiving hospital pre-alert', 'pre-arrival calculator routing'],
    analyticsEvents: ['ems_prealert_created', 'prearrival_risk_profile_generated'],
    dashboardWidget: 'EMS arrivals',
    aiAgent: 'pre-hospital-flow-agent',
    packageTier: 'professional',
  }),
  Object.freeze({
    id: 'ems-to-ed-handoff',
    title: 'EMS-to-ED Handoff',
    buyerPain: 'Paramedics repeat stories, wait for offload, and hand over unstructured information.',
    flowStages: ['Arrival', 'Triage', 'Assessment'],
    capabilities: ['paramedic report parsing', 'structured intake', 'handoff summary', 'arrival-ready queue'],
    workflows: ['structured EMS intake', 'handoff summary review', 'offload delay tracking'],
    analyticsEvents: ['handoff_summary_created', 'ems_offload_delay_flagged'],
    dashboardWidget: 'EMS handoff queue',
    aiAgent: 'ems-handoff-summarizer',
    packageTier: 'professional',
  }),
  Object.freeze({
    id: 'dynamic-triage-orchestrator',
    title: 'Dynamic Triage',
    buyerPain: 'Triage teams need to turn complaint, vitals, arrival mode, age, and risk factors into consistent workflow routing.',
    flowStages: ['Arrival', 'Triage', 'Assessment'],
    capabilities: ['risk profile', 'calculator recommendations', 'suggested workflow', 'human review queue'],
    workflows: ['risk profile generation', 'calculator sequence routing', 'clinician triage review'],
    analyticsEvents: ['triage_risk_profile_created', 'calculator_sequence_launched'],
    dashboardWidget: 'High-risk queue',
    aiAgent: 'dynamic-triage-agent',
    packageTier: 'starter',
    flagship: true,
  }),
  Object.freeze({
    id: 'bed-flow-intelligence',
    title: 'Bed Flow Intelligence',
    buyerPain: 'Admissions, boarding, and bed delays create overcrowding and block ED throughput.',
    flowStages: ['Results', 'Disposition', 'Admission/Discharge'],
    capabilities: ['pending admission tracking', 'bed wait queue', 'boarding delay detection', 'bottleneck summary'],
    workflows: ['admission bottleneck review', 'boarding escalation summary', 'bed request status review'],
    analyticsEvents: ['pending_admission_created', 'boarding_delay_detected'],
    dashboardWidget: 'Bed pressure',
    aiAgent: 'bed-flow-analyst',
    packageTier: 'professional',
  }),
  Object.freeze({
    id: 'referral-automation',
    title: 'Referral Automation',
    buyerPain: 'Consults and referrals move through calls, waits, paperwork, and unclear ownership.',
    flowStages: ['Assessment', 'Results', 'Disposition'],
    capabilities: ['AI classification', 'referral queue', 'department queue', 'notification', 'handoff draft'],
    workflows: ['referral classification', 'department queue routing', 'consult draft review'],
    analyticsEvents: ['referral_queue_item_created', 'department_notification_prepared'],
    dashboardWidget: 'Referral queue',
    aiAgent: 'referral-routing-agent',
    packageTier: 'professional',
  }),
  Object.freeze({
    id: 'discharge-acceleration',
    title: 'Discharge Acceleration',
    buyerPain: 'Discharge candidates wait on instructions, follow-up, care plans, and documentation review.',
    flowStages: ['Results', 'Disposition', 'Admission/Discharge'],
    capabilities: ['discharge readiness', 'instruction draft', 'follow-up checklist', 'care plan review'],
    workflows: ['discharge candidate review', 'instructions drafting', 'follow-up gap check'],
    analyticsEvents: ['discharge_candidate_identified', 'discharge_packet_drafted'],
    dashboardWidget: 'Discharge readiness',
    aiAgent: 'discharge-acceleration-agent',
    packageTier: 'starter',
  }),
  Object.freeze({
    id: 'equipment-intelligence',
    title: 'Equipment Intelligence',
    buyerPain: 'Busy EDs need visibility into pumps, telemetry, crash carts, monitors, wheelchairs, and maintenance status.',
    flowStages: ['Arrival', 'Assessment', 'Orders', 'Results'],
    capabilities: ['equipment location', 'status', 'battery', 'maintenance', 'availability'],
    workflows: ['equipment availability review', 'battery risk alert', 'maintenance dispatch prompt'],
    analyticsEvents: ['equipment_status_changed', 'equipment_delay_flagged'],
    dashboardWidget: 'Equipment status',
    aiAgent: 'equipment-flow-agent',
    packageTier: 'enterprise',
  }),
  Object.freeze({
    id: 'surge-prediction',
    title: 'Surge Prediction',
    buyerPain: 'Executives and charge teams need earlier warning of arrivals, occupancy, wait times, and staffing pressure.',
    flowStages: ['Arrival', 'Triage', 'Assessment', 'Disposition'],
    capabilities: ['arrival forecast', 'occupancy forecast', 'wait-time forecast', 'staffing pressure forecast'],
    workflows: ['surge watch creation', 'staffing pressure review', 'capacity forecast briefing'],
    analyticsEvents: ['surge_risk_forecasted', 'staffing_pressure_detected'],
    dashboardWidget: 'Surge prediction',
    aiAgent: 'surge-forecasting-agent',
    packageTier: 'enterprise',
  }),
  Object.freeze({
    id: 'ed-copilot',
    title: 'ED Copilot',
    buyerPain: 'Clinicians need workspace-aware help that reduces cognitive load without making autonomous decisions.',
    flowStages: ['Triage', 'Assessment', 'Orders', 'Results', 'Disposition'],
    capabilities: ['scores', 'protocols', 'workflows', 'references', 'next steps', 'reasoning'],
    workflows: ['copilot request', 'reasoning review', 'workflow guidance confirmation'],
    analyticsEvents: ['ed_copilot_request_created', 'copilot_guidance_reviewed'],
    dashboardWidget: 'Copilot activity',
    aiAgent: 'emergency-copilot',
    packageTier: 'starter',
  }),
  Object.freeze({
    id: 'ed-command-center',
    title: 'ED Command Center',
    buyerPain: 'ED directors need one screen for current patients, waiting room, high-risk queue, EMS arrivals, beds, equipment, staffing, and alerts.',
    flowStages: ['Arrival', 'Triage', 'Assessment', 'Orders', 'Results', 'Disposition', 'Admission/Discharge'],
    capabilities: ['current patients', 'waiting room', 'high-risk queue', 'EMS arrivals', 'bed pressure', 'equipment status', 'staffing pressure', 'alerts'],
    workflows: ['command center review', 'bottleneck triage', 'queue escalation review'],
    analyticsEvents: ['command_center_reviewed', 'bottleneck_review_created'],
    dashboardWidget: 'ED command center',
    aiAgent: 'ed-flow-command-agent',
    packageTier: 'starter',
  }),
]);

export const EMERGENCY_FLOW_AUTOMATION_REGISTRY = Object.freeze(
  EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.map((solution) =>
    Object.freeze({
      automationId: `flow-${solution.id}`,
      solutionId: solution.id,
      title: solution.title,
      trigger: `${solution.title} signal changes in the Emergency Flow Intelligence model.`,
      inputs: Object.freeze(['patient flow state', 'workspace context', 'role', 'queue status']),
      outputs: Object.freeze(['flow insight', 'workflow recommendation', 'human review item']),
      flowStages: Object.freeze(solution.flowStages),
      humanReviewRequirement: 'Required before clinical, operational, referral, discharge, or escalation action.',
      packageTier: solution.packageTier,
    })
  )
);

export const EMERGENCY_FLOW_WORKFLOW_REGISTRY = Object.freeze(
  EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.flatMap((solution) =>
    solution.workflows.map((workflow) =>
      Object.freeze({
        workflowId: `${solution.id}:${workflow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        solutionId: solution.id,
        label: workflow,
        flowStages: Object.freeze(solution.flowStages),
        launchSurface: solution.id === 'ed-command-center' ? 'dashboard' : 'workspace',
        reviewRequired: true,
      })
    )
  )
);

export const EMERGENCY_FLOW_ANALYTICS_MODEL = Object.freeze({
  categories: Object.freeze(['throughput', 'capacity', 'coordination', 'cognitive load', 'adoption']),
  events: Object.freeze(
    EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.flatMap((solution) =>
      solution.analyticsEvents.map((eventId) =>
        Object.freeze({
          eventId,
          solutionId: solution.id,
          label: eventId.replace(/_/g, ' '),
          flowStages: Object.freeze(solution.flowStages),
        })
      )
    )
  ),
  outcomeMetrics: Object.freeze([
    'arrival-to-triage time',
    'assessment wait',
    'orders-to-results delay',
    'disposition delay',
    'boarding pressure',
    'handoff delay',
    'workflow launches',
    'AI requests',
  ]),
});

export const EMERGENCY_FLOW_DASHBOARD_MODEL = Object.freeze({
  title: 'ED Command Center',
  widgets: Object.freeze(
    EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.map((solution) =>
      Object.freeze({
        widgetId: `widget-${solution.id}`,
        label: solution.dashboardWidget,
        solutionId: solution.id,
        flowStages: Object.freeze(solution.flowStages),
        visibility: 'command-center',
      })
    )
  ),
});

export const EMERGENCY_FLOW_AI_MODEL = Object.freeze({
  safetyBoundary:
    'AI reduces cognitive load through workflow guidance only. It never makes autonomous diagnosis, treatment, order, disposition, offload, referral, or escalation decisions.',
  agents: Object.freeze(
    EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.map((solution) =>
      Object.freeze({
        agentId: solution.aiAgent,
        solutionId: solution.id,
        role: `Support ${solution.title} with explainable flow guidance.`,
        inputs: Object.freeze(['complaint', 'vitals', 'flow state', 'workspace context']),
        outputs: Object.freeze(['risk context', 'workflow recommendation', 'reasoning', 'review prompt']),
      })
    )
  ),
});

export const EMERGENCY_FLOW_SAAS_PACKAGING_MODEL = Object.freeze({
  productName: 'Emergency Flow Intelligence Platform',
  buyerPersonas: Object.freeze(['ED Director', 'COO', 'EMS Organization', 'Hospital Operations']),
  firstCustomerReadiness: EMERGENCY_FLOW_FIRST_CUSTOMER_READINESS,
  packages: Object.freeze([
    Object.freeze({
      packageId: 'flow-starter',
      title: 'Emergency Flow Starter',
      solutionIds: Object.freeze(
        EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.filter((solution) => solution.packageTier === 'starter').map(
          (solution) => solution.id
        )
      ),
      positioning: 'Standalone ED command center, dynamic triage, discharge acceleration, and ED Copilot.',
    }),
    Object.freeze({
      packageId: 'flow-professional',
      title: 'Emergency Flow Professional',
      solutionIds: Object.freeze(
        EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.filter((solution) =>
          ['starter', 'professional'].includes(solution.packageTier)
        ).map((solution) => solution.id)
      ),
      positioning: 'Adds pre-hospital intelligence, EMS handoff, bed flow, and referral coordination.',
    }),
    Object.freeze({
      packageId: 'flow-enterprise',
      title: 'Emergency Flow Enterprise',
      solutionIds: Object.freeze(EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS.map((solution) => solution.id)),
      positioning: 'Adds equipment intelligence, surge prediction, and optional integrations.',
    }),
  ]),
});

export const EMERGENCY_FLOW_INTELLIGENCE_PLATFORM = Object.freeze({
  route: '/workspace/emergency/flow',
  title: 'Emergency Flow Intelligence Platform',
  positioning:
    'A sellable ED flow, capacity, coordination, and cognitive-load platform for ED directors, COOs, EMS organizations, and hospital operations teams.',
  primaryObjective: 'Reduce ED bottlenecks.',
  marketPains: EMERGENCY_FLOW_MARKET_PAINS,
  valueDrivers: EMERGENCY_FLOW_VALUE_DRIVERS,
  operatingPrinciples: EMERGENCY_FLOW_OPERATING_PRINCIPLES,
  firstCustomerReadiness: EMERGENCY_FLOW_FIRST_CUSTOMER_READINESS,
  integrationPosture:
    'Optional integrations can deepen the product, but the first ED customer can demo, pilot, and buy the platform without hospital-wide deployment.',
  patientFlow: EMERGENCY_FLOW_STAGES,
  solutions: EMERGENCY_FLOW_INTELLIGENCE_SOLUTIONS,
  automationRegistry: EMERGENCY_FLOW_AUTOMATION_REGISTRY,
  workflowRegistry: EMERGENCY_FLOW_WORKFLOW_REGISTRY,
  analyticsModel: EMERGENCY_FLOW_ANALYTICS_MODEL,
  dashboardModel: EMERGENCY_FLOW_DASHBOARD_MODEL,
  aiModel: EMERGENCY_FLOW_AI_MODEL,
  saasPackagingModel: EMERGENCY_FLOW_SAAS_PACKAGING_MODEL,
  acceptance:
    'CareDroid becomes a sellable Emergency Flow Intelligence solution rather than a collection of calculators.',
});

export const EMERGENCY_ONBOARDING_EXPERIENCE = Object.freeze({
  route: '/workspace/emergency/onboarding',
  title: 'CareDroid Onboarding',
  goal: 'Help a new hospital understand CareDroid in 10 minutes.',
  audience: 'ED directors, triage nurses, clinical informatics leads, operations leaders, and implementation teams.',
  sections: Object.freeze([
    Object.freeze({
      id: 'overview',
      label: 'CareDroid overview',
      duration: '1 minute',
      summary:
        'Orient the hospital to the Emergency Whiteboard, patient journey, human-review boundary, and CareDroid subpages.',
      outcome: 'The team understands that CareDroid is an operating environment, not a loose set of tools.',
      targetRoute: '/emergency/whiteboard',
    }),
    Object.freeze({
      id: 'calculators',
      label: 'Calculators',
      duration: '2 minutes',
      summary:
        'Show how qSOFA, NEWS2, HEART, Wells PE, Wells DVT, Shock Index, NIHSS, and related calculators launch from ED context.',
      outcome: 'The team sees calculator standardization from chief complaint, vitals, and triage context.',
      targetRoute: '/workspace/emergency/triage',
    }),
    Object.freeze({
      id: 'protocols',
      label: 'Protocols',
      duration: '2 minutes',
      summary:
        'Retrieve complaint-specific protocols and evidence for chest pain, stroke symptoms, sepsis concern, trauma, and shortness of breath.',
      outcome: 'The team sees faster protocol lookup with calculators, workflows, and simulations attached.',
      targetRoute: '/workspace/emergency/evidence',
    }),
    Object.freeze({
      id: 'ai-copilot',
      label: 'AI Copilot',
      duration: '2 minutes',
      summary:
        'Explain how ED Copilot turns complaint, vitals, workspace context, and automatically surfaced calculators into review-required workflow guidance.',
      outcome: 'The team understands explainability and that Copilot does not diagnose, order, disposition, or autonomously escalate.',
      targetRoute: '/workspace/emergency/evidence',
    }),
    Object.freeze({
      id: 'workflows',
      label: 'Workflows',
      duration: '2 minutes',
      summary:
        'Launch triage review, protocol guidance, automation queues, patient follow-up, and simulation practice from the Emergency Whiteboard.',
      outcome: 'The team sees how CareDroid turns guidance into coordinated next steps.',
      targetRoute: '/workspace/emergency/automations',
    }),
    Object.freeze({
      id: 'analytics',
      label: 'Analytics',
      duration: '1 minute',
      summary:
        'Review assessments completed, calculators used, protocol retrievals, workflow launches, AI requests, and simulation completion.',
      outcome: 'The team sees how adoption and ROI are measured from the first pilot.',
      targetRoute: '/workspace/emergency/analytics',
    }),
  ]),
  walkthrough: Object.freeze([
    Object.freeze({
      minute: '0-1',
      title: 'Open CareDroid',
      instruction: 'Start at the Emergency Whiteboard and explain the ED journey, operating queues, and human-review posture.',
      targetRoute: '/emergency/whiteboard',
    }),
    Object.freeze({
      minute: '1-3',
      title: 'Show calculators in triage',
      instruction: 'Open triage and demonstrate calculator selection from chief complaint and vitals context.',
      targetRoute: '/workspace/emergency/triage',
    }),
    Object.freeze({
      minute: '3-5',
      title: 'Retrieve protocols',
      instruction: 'Open evidence, choose a complaint, and show protocols, evidence, calculators, workflows, and simulations.',
      targetRoute: '/workspace/emergency/evidence',
    }),
    Object.freeze({
      minute: '5-7',
      title: 'Explain ED AI Copilot',
      instruction: 'Use Copilot guidance and call out reasoning, safety boundary, and clinician review requirement.',
      targetRoute: '/workspace/emergency/evidence',
    }),
    Object.freeze({
      minute: '7-9',
      title: 'Launch workflows',
      instruction: 'Open a command center or automation workflow to show how the workspace moves from guidance to action.',
      targetRoute: '/workspace/emergency/automations',
    }),
    Object.freeze({
      minute: '9-10',
      title: 'Close with analytics',
      instruction: 'Open analytics and connect adoption metrics to standardization, time savings, training lift, and expansion.',
      targetRoute: '/workspace/emergency/analytics',
    }),
  ]),
  takeaway:
    'A hospital should leave onboarding knowing what CareDroid does first, how clinicians stay in control, and how adoption is measured.',
});

export const ED_READINESS_CLASSIFICATIONS = Object.freeze({
  READY_TO_SELL: 'Ready to sell',
  NEEDS_WIRING: 'Needs wiring',
  NEEDS_INTEGRATION: 'Needs integration',
  FUTURE_ROADMAP: 'Future roadmap',
});

export const ED_BUYER_PERSONAS = Object.freeze({
  ED_DIRECTOR: 'ED Director',
  CHIEF_NURSING_OFFICER: 'Chief Nursing Officer',
  COO: 'COO',
  CLINICAL_INFORMATICS_LEAD: 'Clinical Informatics Lead',
});

export const EMERGENCY_AUTOMATION_MODULES = Object.freeze([
  Object.freeze({
    automationId: 'emergency-automated-triage-matrix',
    title: 'Automated Triage Matrix',
    description:
      'Turns arrival, vitals, chief complaint, and intake facts into a clinician-review triage risk profile.',
    type: 'Clinical',
    trigger: 'New ED arrival, EMS pre-arrival, or virtual ED intake with vitals and chief complaint.',
    inputs: ['patient identity', 'arrival source', 'vitals', 'chief complaint', 'intake data', 'red flags'],
    outputs: ['risk profile', 'calculator recommendations', 'triage queue item', 'clinician review prompt'],
    requiredAssets: [
      REGISTRY.qsofa,
      REGISTRY.news2,
      REGISTRY.heartScore,
      REGISTRY.wellsPe,
      REGISTRY.wellsDvtCalculator,
      REGISTRY.shockIndex,
    ],
    requiredAI: ['emergency-copilot', 'risk-profile-summarizer'],
    requiredIntegrations: ['EHR encounter feed', 'ADT', 'vitals monitor', 'triage queue'],
    humanReviewRequirement: 'Required before acuity, diagnosis, orders, or disposition are finalized.',
    workspaceVisibility: ['dashboard', 'triage', 'patients', 'automations', 'analytics'],
    journeyStages: ['arrival', 'registration', 'triage', 'waiting', 'assessment'],
    subscriptionTier: 'starter',
    riskLevel: 'high',
    status: 'active',
    actions: ['generate triage risk profile', 'recommend calculators', 'route to clinician review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Sell as a manual-intake triage calculator and risk-profile pilot with clinician review.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-referral-routing',
    title: 'Referral Routing',
    description:
      'Routes consult, transfer, specialty, and follow-up needs from assessment and results into a reviewable referral queue.',
    type: 'Administrative',
    trigger: 'Disposition, consult need, transfer need, or result-driven specialty follow-up identified.',
    inputs: ['assessment summary', 'results', 'diagnostic impression', 'service line', 'capacity constraints'],
    outputs: ['referral queue item', 'consult draft', 'missing data checklist', 'handoff summary'],
    requiredAssets: ['referral-ai', REGISTRY.patientSummaryAi, REGISTRY.timelineAi],
    requiredAI: ['referral-drafting-agent', 'missing-data-checker'],
    requiredIntegrations: ['EHR referrals', 'provider directory', 'transfer center', 'secure messaging'],
    humanReviewRequirement: 'Required before referral, transfer, or consult is sent.',
    workspaceVisibility: ['dashboard', 'referrals', 'patients', 'automations', 'analytics'],
    journeyStages: ['assessment', 'results', 'disposition', 'admission', 'follow-up'],
    subscriptionTier: 'professional',
    riskLevel: 'medium',
    status: 'active',
    actions: ['create referral queue item', 'draft referral summary', 'flag missing referral data'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.ED_DIRECTOR, ED_BUYER_PERSONAS.COO],
      firstCustomerNote:
        'Demo as a review queue and referral draft workflow; production needs provider directory, referral, transfer, and secure messaging integrations.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-surge-staffing',
    title: 'Surge Staffing',
    description:
      'Combines waiting room, acuity, active patients, disposition backlog, and staffing signals into surge watch recommendations.',
    type: 'Operational',
    trigger: 'Waiting room, triage backlog, high-risk count, or disposition queue crosses surge threshold.',
    inputs: ['waiting room count', 'triage volume', 'active patients', 'high-risk patients', 'staff schedule'],
    outputs: ['staffing status', 'surge watch alert', 'coverage gap summary', 'operations review prompt'],
    requiredAssets: [REGISTRY.staffingRatioCalculator, REGISTRY.capacityPredictionEngine],
    requiredAI: ['surge-forecasting-agent'],
    requiredIntegrations: ['staff scheduling', 'bed board', 'ADT', 'operations command'],
    humanReviewRequirement: 'Required for staffing changes, diversion posture, and operational escalation.',
    workspaceVisibility: ['dashboard', 'triage', 'analytics', 'automations'],
    journeyStages: ['arrival', 'triage', 'waiting', 'assessment', 'disposition', 'admission'],
    subscriptionTier: 'professional',
    riskLevel: 'medium',
    status: 'active',
    actions: ['update staffing status', 'create surge watch alert', 'recommend operations review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'partial',
      requiresEhrAccess: false,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.COO, ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER],
      firstCustomerNote:
        'Use demo/local queue and staffing data for discovery; production staffing recommendations require scheduling, bed board, and ADT feeds.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-simulation-academy',
    title: 'Simulation Academy',
    description:
      'Maps live ED patterns and gaps into emergency simulations for sepsis, stroke, trauma, chest pain, and respiratory distress.',
    type: 'Simulation',
    trigger: 'Simulation gap, protocol drift, missed calculator, or high-risk presentation pattern detected.',
    inputs: ['patient pattern', 'protocol gap', 'calculator utilization', 'role', 'competency objective'],
    outputs: ['recommended simulation', 'practice assignment', 'debrief prompt', 'completion metric'],
    requiredAssets: [REGISTRY.simulationSuite, REGISTRY.scenarioPlayer, REGISTRY.simulationOutcomes],
    requiredAI: ['simulation-coach', 'debrief-summarizer'],
    requiredIntegrations: ['learning management system', 'competency records'],
    humanReviewRequirement: 'Required for credentialing credit and competency sign-off.',
    workspaceVisibility: ['dashboard', 'simulations', 'automations', 'analytics'],
    journeyStages: ['triage', 'assessment', 'reassessment', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'low',
    status: 'active',
    actions: ['recommend simulation', 'create practice assignment', 'prepare debrief prompt'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER, ED_BUYER_PERSONAS.ED_DIRECTOR],
      firstCustomerNote:
        'Sell as a standalone ED simulation and debrief starter for sepsis, stroke, trauma, chest pain, and dyspnea.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-medical-iot-monitoring',
    title: 'Medical IoT Monitoring',
    description:
      'Brings ED device telemetry, monitor freshness, battery, and disconnection signals into the patient journey.',
    type: 'Medical IoT',
    trigger: 'Device alert, telemetry gap, monitor disconnect, stale vitals, or battery warning.',
    inputs: ['device assignment', 'telemetry stream', 'last-seen time', 'battery state', 'patient location'],
    outputs: ['device alert', 'telemetry freshness summary', 'biomedical review task', 'patient risk context'],
    requiredAssets: [REGISTRY.medicalIotDashboard, REGISTRY.telemetryMonitoring, REGISTRY.deviceFleetManagement],
    requiredAI: ['device-telemetry-agent'],
    requiredIntegrations: ['medical device feed', 'biomedical ticketing', 'patient monitor integration'],
    humanReviewRequirement: 'Required when device state may affect patient monitoring or care escalation.',
    workspaceVisibility: ['dashboard', 'iot', 'patients', 'automations', 'analytics'],
    journeyStages: ['triage', 'assessment', 'results', 'reassessment'],
    subscriptionTier: 'professional',
    riskLevel: 'high',
    status: 'active',
    actions: ['create device alert', 'summarize telemetry gap', 'route biomedical review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION,
      standaloneViability: 'no',
      requiresEhrAccess: false,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.COO,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Keep in discovery unless device telemetry, monitor assignment, and biomedical workflow feeds are available.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-documentation-integrity',
    title: 'Documentation Integrity',
    description:
      'Checks ED documentation completeness across intake, assessment, orders, results, disposition, and discharge/admission.',
    type: 'Governance',
    trigger: 'Missing triage facts, unsigned draft, inconsistent result reference, or disposition documentation gap.',
    inputs: ['encounter data', 'triage facts', 'orders', 'results', 'notes', 'disposition plan'],
    outputs: ['documentation queue item', 'integrity gap list', 'review-required draft', 'audit trace'],
    requiredAssets: [REGISTRY.clinicalDocumentationAssistant, REGISTRY.ambientScribe, REGISTRY.clinicalAudit],
    requiredAI: ['documentation-integrity-agent', 'source-fact-checker'],
    requiredIntegrations: ['EHR notes', 'orders/results feed', 'audit logs'],
    humanReviewRequirement: 'Required before documentation is signed, exported, billed, or sent.',
    workspaceVisibility: ['dashboard', 'documentation', 'patients', 'automations', 'analytics'],
    journeyStages: ['registration', 'assessment', 'orders', 'results', 'reassessment', 'disposition', 'admission', 'discharge'],
    subscriptionTier: 'starter',
    riskLevel: 'high',
    status: 'active',
    actions: ['create documentation queue item', 'flag integrity gaps', 'prepare review draft'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Demo with pasted or manually verified encounter facts; production needs notes, orders/results, and audit feeds.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-rag-evidence-retrieval',
    title: 'RAG Evidence Retrieval',
    description:
      'Surfaces ED protocols, evidence, calculators, workflows, and simulations from complaint-specific context.',
    type: 'Research',
    trigger: 'Chief complaint entered for chest pain, stroke symptoms, sepsis concern, trauma, or shortness of breath.',
    inputs: ['chief complaint', 'risk profile', 'journey stage', 'local protocol context', 'clinician question'],
    outputs: ['protocols', 'evidence cards', 'calculator recommendations', 'workflow recommendations', 'simulation links'],
    requiredAssets: [REGISTRY.guidelineRag, REGISTRY.calculatorRecommenderAi, REGISTRY.aiExplainability],
    requiredAI: ['emergency-rag-router', 'citation-grounded-answerer'],
    requiredIntegrations: ['guideline store', 'local protocol library', 'clinical intelligence API'],
    humanReviewRequirement: 'Required before protocol selection, orders, diagnosis, or disposition action.',
    workspaceVisibility: ['dashboard', 'triage', 'evidence', 'patients', 'automations', 'analytics'],
    journeyStages: ['triage', 'assessment', 'orders', 'results', 'reassessment', 'disposition'],
    subscriptionTier: 'starter',
    riskLevel: 'medium',
    status: 'active',
    actions: ['surface protocols', 'recommend calculators', 'link relevant workflows and simulations'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
      standaloneViability: 'yes',
      requiresEhrAccess: false,
      requiresIntegration: false,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Sell as a complaint-specific ED evidence companion using configured protocols and clinician review.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-virtual-ed',
    title: 'Virtual ED',
    description:
      'Connects remote intake and virtual ED presentations to the same arrival, registration, triage, and review workflow.',
    type: 'Clinical',
    trigger: 'Virtual ED visit, telehealth intake, remote EMS consult, or pre-arrival patient submission.',
    inputs: ['virtual intake', 'reported symptoms', 'available vitals', 'location', 'callback/contact state'],
    outputs: ['virtual triage packet', 'risk review prompt', 'routing recommendation', 'arrival handoff'],
    requiredAssets: [REGISTRY.patientSummaryAi, REGISTRY.guidelineRag, REGISTRY.news2],
    requiredAI: ['virtual-ed-intake-agent', 'risk-summary-agent'],
    requiredIntegrations: ['telehealth platform', 'patient portal', 'EMS handoff', 'EHR encounter feed'],
    humanReviewRequirement: 'Required before escalation, disposition, referral, or ED arrival routing.',
    workspaceVisibility: ['dashboard', 'triage', 'patients', 'automations', 'analytics'],
    journeyStages: ['arrival', 'registration', 'triage', 'waiting', 'assessment', 'disposition'],
    subscriptionTier: 'professional',
    riskLevel: 'high',
    status: 'active',
    actions: ['create virtual triage packet', 'summarize risk context', 'route clinician review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.ED_DIRECTOR, ED_BUYER_PERSONAS.COO],
      firstCustomerNote:
        'Roadmap until telehealth, patient portal, EMS handoff, identity, and encounter creation paths are selected.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-discharge-summary-drafting',
    title: 'Discharge Summary Drafting',
    description:
      'Drafts ED discharge/admission summaries from verified events, results, treatments, medication context, and follow-up plans.',
    type: 'Administrative',
    trigger: 'Disposition selected, discharge/admission ready, or documentation draft requested.',
    inputs: ['verified ED timeline', 'results', 'orders', 'treatments', 'medications', 'follow-up plan'],
    outputs: ['discharge summary draft', 'admission handoff draft', 'missing data checklist', 'review task'],
    requiredAssets: ['discharge-summary-ai', REGISTRY.patientSummaryAi, REGISTRY.timelineAi],
    requiredAI: ['discharge-drafting-agent', 'source-fact-checker'],
    requiredIntegrations: ['EHR documentation', 'medication reconciliation', 'orders/results feed'],
    humanReviewRequirement: 'Required before signature, patient release, admission handoff, or export.',
    workspaceVisibility: ['dashboard', 'documentation', 'patients', 'automations', 'analytics'],
    journeyStages: ['results', 'reassessment', 'disposition', 'admission', 'discharge', 'follow-up'],
    subscriptionTier: 'starter',
    riskLevel: 'medium',
    status: 'active',
    actions: ['draft discharge summary', 'flag missing discharge data', 'route documentation review'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [
        ED_BUYER_PERSONAS.ED_DIRECTOR,
        ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
        ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
      ],
      firstCustomerNote:
        'Demo with verified timeline and result facts; production needs EHR documentation and medication reconciliation sources.',
    }),
  }),
  Object.freeze({
    automationId: 'emergency-prior-authorization',
    title: 'Prior Authorization',
    description:
      'Prepares payer authorization packets for ED-linked admission, imaging, transfer, durable equipment, or follow-up services.',
    type: 'Administrative',
    trigger: 'Payer-sensitive disposition, admission, transfer, advanced imaging, or follow-up service identified.',
    inputs: ['payer', 'policy criteria', 'diagnosis context', 'orders/results', 'disposition plan'],
    outputs: ['prior authorization packet draft', 'evidence checklist', 'policy citation summary', 'review task'],
    requiredAssets: ['prior-auth-ai', REGISTRY.guidelineRag, REGISTRY.aiExplainability],
    requiredAI: ['prior-auth-drafting-agent', 'policy-evidence-matcher'],
    requiredIntegrations: ['payer policy API', 'EHR orders', 'document export queue'],
    humanReviewRequirement: 'Required before payer submission or external transmission.',
    workspaceVisibility: ['dashboard', 'documentation', 'referrals', 'automations', 'analytics'],
    journeyStages: ['disposition', 'admission', 'discharge', 'follow-up'],
    subscriptionTier: 'enterprise',
    riskLevel: 'medium',
    status: 'active',
    actions: ['draft prior authorization packet', 'compile policy evidence', 'route review before submission'],
    readiness: Object.freeze({
      classification: ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP,
      standaloneViability: 'partial',
      requiresEhrAccess: true,
      requiresIntegration: true,
      buyerPersonas: [ED_BUYER_PERSONAS.COO, ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD],
      firstCustomerNote:
        'Keep as enterprise roadmap unless payer policy, order, documentation, and export integrations are in scope.',
    }),
  }),
]);

export const EMERGENCY_AUTOMATION_MODULES_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_AUTOMATION_MODULES.map((automation) => [automation.automationId, automation]))
);

export const EMERGENCY_CORE_MVP_PACKAGE = Object.freeze({
  packageId: 'emergency-core-mvp',
  productId: 'emergency-core',
  title: 'Emergency Flow Starter',
  product: 'Emergency Flow Intelligence Platform',
  buyerPersonas: [
    ED_BUYER_PERSONAS.ED_DIRECTOR,
    ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
    ED_BUYER_PERSONAS.COO,
    ED_BUYER_PERSONAS.CLINICAL_INFORMATICS_LEAD,
  ],
  positioning:
    'Standalone ED operating system pilot for patient journey, queues, Copilot, referrals, EMS, and analytics.',
  implementationDependency: 'Low',
  ehrDependency: 'Not required for MVP pilot',
  integrationDependency: 'Not required for MVP pilot',
  billingMetric: 'Per ED site per month; optional clinician-seat expansion',
  trialPosture: '30-60 day pilot with manual/local data and no EHR writeback',
  humanReviewRequirement: 'Required for every clinical output',
  packageRule:
    'If a capability requires patient-specific EHR data, external workflow submission, device telemetry, payer policy access, telehealth intake, or staffing system integration, it is an add-on.',
  recommendation:
    'Lead first customer conversations with Emergency Flow Starter as a low-integration ED flow intelligence pilot.',
  upgradePath:
    'Add resource board, escalation engine, simulation scenarios, capacity command, device telemetry, staffing, governance, and enterprise reporting after the ED pilot proves value.',
  includedCapabilities: Object.freeze([
    Object.freeze({
      id: 'patient-journey-engine',
      label: 'Patient Journey Engine',
      type: 'operating-model',
      reason: 'Canonical ED patient journey from arrival through discharge/admission.',
      dependencyPosture: 'Standalone/demo or manual data',
    }),
    Object.freeze({
      id: 'queue-intelligence',
      label: 'Queue Intelligence',
      type: 'operating-model',
      reason: 'Makes waiting room, triage, provider, referral, admission, discharge, and reassessment queues visible.',
      dependencyPosture: 'Standalone/demo or manual data',
    }),
    Object.freeze({
      id: 'ed-copilot',
      label: 'ED Copilot',
      type: 'assistant',
      reason: 'Complaint-aware workflow guidance, protocol lookup, and next-step suggestions for human review.',
      dependencyPosture: 'Available with current assistant flow',
    }),
    Object.freeze({
      id: 'referral-intelligence',
      label: 'Referral Intelligence',
      type: 'operating-model',
      reason: 'Tracks consult, transfer, specialty, and follow-up referral visibility without hospital-wide rollout.',
      dependencyPosture: 'Standalone/demo or manual queue data',
    }),
    Object.freeze({
      id: 'ems-intelligence',
      label: 'EMS Intelligence',
      type: 'operating-model',
      reason: 'Tracks incoming arrivals, ETA, handoff status, and offload pressure.',
      dependencyPosture: 'Standalone/demo or manual EMS handoff data',
    }),
    Object.freeze({
      id: 'emergency-analytics',
      label: 'Analytics',
      type: 'analytics',
      reason: 'Shows adoption, queue pressure, referral delay, EMS offload, and journey throughput.',
      dependencyPosture: 'Local/demo pilot events',
    }),
    Object.freeze({
      id: REGISTRY.qsofa,
      label: 'qSOFA',
      type: 'calculator',
      reason: 'High-value sepsis screening calculator for triage standardization.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.news2,
      label: 'NEWS2',
      type: 'calculator',
      reason: 'Broad deterioration screening score for abnormal vitals.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.heartScore,
      label: 'HEART',
      type: 'calculator',
      reason: 'Chest pain triage and risk workflow support.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.wellsPe,
      label: 'Wells PE',
      type: 'calculator',
      reason: 'Pulmonary embolism risk workflow support.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.wellsDvtCalculator,
      label: 'Wells DVT',
      type: 'calculator',
      reason: 'DVT risk workflow support and VTE context.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: REGISTRY.shockIndex,
      label: 'Shock Index',
      type: 'calculator',
      reason: 'Simple hemodynamic risk signal for trauma, bleeding, and instability.',
      dependencyPosture: 'Standalone/manual input',
    }),
    Object.freeze({
      id: 'ai-assistant',
      label: 'AI Assistant',
      type: 'assistant',
      reason: 'Workspace-aware guidance and routing surface.',
      dependencyPosture: 'Available with current assistant flow',
    }),
    Object.freeze({
      id: 'protocol-retrieval',
      label: 'Protocol Retrieval',
      type: 'guidance',
      reason: 'Complaint-specific protocol and evidence surfacing.',
      dependencyPosture: 'Can start with configured/demo protocol content',
    }),
    Object.freeze({
      id: 'workflow-guidance',
      label: 'Workflow Guidance',
      type: 'guidance',
      reason: 'Routes clinicians to calculators, protocols, review steps, and next workflows.',
      dependencyPosture: 'Standalone guidance, no autonomous action',
    }),
    Object.freeze({
      id: 'workspace-dashboard',
      label: 'Emergency Whiteboard',
      type: 'whiteboard',
      reason: 'ED-specific whiteboard surface for the MVP story.',
      dependencyPosture: 'Can run with local/demo or manually loaded data',
    }),
  ]),
  includedAutomationIds: Object.freeze(['emergency-automated-triage-matrix']),
  includedAssetIds: Object.freeze([
    REGISTRY.qsofa,
    REGISTRY.news2,
    REGISTRY.heartScore,
    REGISTRY.wellsPe,
    REGISTRY.wellsDvtCalculator,
    REGISTRY.shockIndex,
    REGISTRY.guidelineRag,
  ]),
  includedWorkflowIds: Object.freeze(['protocol-retrieval', 'workflow-guidance']),
});

export const EMERGENCY_OPTIONAL_ADD_ONS = Object.freeze([
  Object.freeze({
    addOnId: 'documentation-integrity',
    title: 'Documentation Integrity',
    automationIds: ['emergency-documentation-integrity'],
    dependencyLevel: 'EHR notes, orders/results, and audit feeds',
    implementationDependency: 'Medium',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Expansion pilot after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'discharge-summary-drafting',
    title: 'Discharge Summary Drafting',
    automationIds: ['emergency-discharge-summary-drafting'],
    dependencyLevel: 'EHR documentation and medication reconciliation',
    implementationDependency: 'Medium',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Expansion pilot after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'referral-routing',
    title: 'Referral Routing',
    automationIds: ['emergency-referral-routing'],
    dependencyLevel: 'Provider directory, transfer center, referral workflow, secure messaging',
    implementationDependency: 'Medium',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Workflow expansion after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'surge-staffing',
    title: 'Surge Staffing',
    automationIds: ['emergency-surge-staffing'],
    dependencyLevel: 'Staff scheduling, bed board, ADT/census',
    implementationDependency: 'Medium',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Operational expansion after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'simulation-academy',
    title: 'Simulation Academy',
    automationIds: ['emergency-simulation-academy'],
    dependencyLevel: 'Standalone first, optional LMS integration',
    implementationDependency: 'Low',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Standalone training pilot after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'medical-iot-monitoring',
    title: 'Medical IoT Monitoring',
    automationIds: ['emergency-medical-iot-monitoring'],
    dependencyLevel: 'Device telemetry, monitor assignment, biomedical ticketing',
    implementationDependency: 'High',
    billingMetric: 'Feature add-on per ED site per month',
    trialPosture: 'Device integration pilot after Emergency Flow Starter acceptance',
    upgradeTier: 'professional',
  }),
  Object.freeze({
    addOnId: 'virtual-ed',
    title: 'Virtual ED',
    automationIds: ['emergency-virtual-ed'],
    dependencyLevel: 'Telehealth, patient portal, EMS handoff, identity, EHR encounter feed',
    implementationDependency: 'High',
    billingMetric: 'Enterprise feature add-on per ED site per month',
    trialPosture: 'Enterprise expansion after telehealth and identity scope are approved',
    upgradeTier: 'enterprise',
  }),
  Object.freeze({
    addOnId: 'prior-authorization',
    title: 'Prior Authorization',
    automationIds: ['emergency-prior-authorization'],
    dependencyLevel: 'Payer policy API, EHR orders, documentation export',
    implementationDependency: 'High',
    billingMetric: 'Enterprise feature add-on per ED site per month',
    trialPosture: 'Enterprise roadmap expansion after payer and documentation integrations',
    upgradeTier: 'enterprise',
  }),
]);

export const EMERGENCY_SOLUTION_PACKAGES = Object.freeze([
  Object.freeze({
    productId: 'emergency-core',
    title: 'Emergency Flow Starter',
    tier: 'starter',
    mvpPackageId: EMERGENCY_CORE_MVP_PACKAGE.packageId,
    includedCapabilityIds: EMERGENCY_CORE_MVP_PACKAGE.includedCapabilities.map(
      (capability) => capability.id
    ),
    automationIds: [...EMERGENCY_CORE_MVP_PACKAGE.includedAutomationIds],
    optionalAddOnIds: EMERGENCY_OPTIONAL_ADD_ONS.map((addOn) => addOn.addOnId),
  }),
  Object.freeze({
    productId: 'emergency-professional',
    title: 'Emergency Flow Professional',
    tier: 'professional',
    extendsProductId: 'emergency-core',
    automationIds: [
      'emergency-automated-triage-matrix',
      'emergency-referral-routing',
      'emergency-surge-staffing',
      'emergency-simulation-academy',
      'emergency-medical-iot-monitoring',
      'emergency-documentation-integrity',
      'emergency-rag-evidence-retrieval',
      'emergency-virtual-ed',
      'emergency-discharge-summary-drafting',
    ],
  }),
  Object.freeze({
    productId: 'emergency-enterprise',
    title: 'Emergency Flow Enterprise',
    tier: 'enterprise',
    extendsProductId: 'emergency-professional',
    automationIds: EMERGENCY_AUTOMATION_MODULES.map((automation) => automation.automationId),
  }),
]);

export const EMERGENCY_FASTEST_TO_MARKET_OFFERINGS = Object.freeze([
  Object.freeze({
    id: 'emergency-flow-starter',
    title: 'Emergency Flow Starter',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-automated-triage-matrix'],
    sellableNow: 'Manual vitals, chief complaint, intake data, flow-aware triage signals, and clinician-review risk profile.',
  }),
  Object.freeze({
    id: 'ed-evidence-companion',
    title: 'ED Evidence Companion',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-rag-evidence-retrieval'],
    sellableNow: 'Complaint-specific protocols, evidence, calculators, workflows, and simulations.',
  }),
  Object.freeze({
    id: 'simulation-academy-starter',
    title: 'Simulation Academy Starter',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['emergency-simulation-academy'],
    sellableNow: 'Standalone emergency scenarios, practice assignments, and debrief prompts.',
  }),
  Object.freeze({
    id: 'ed-command-whiteboard-pilot',
    title: 'ED Command Whiteboard Pilot',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    capabilityIds: ['waiting-room', 'active-patients', 'high-risk-patients', 'critical-alerts'],
    sellableNow: 'ED operating queues using demo/local or manually loaded data before live ADT/EHR feeds.',
  }),
  Object.freeze({
    id: 'documentation-readiness-demo',
    title: 'Documentation Readiness Demo',
    classification: ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING,
    capabilityIds: ['emergency-documentation-integrity', 'emergency-discharge-summary-drafting'],
    sellableNow: 'Review-required documentation gap and discharge draft workflow using verified pasted facts.',
  }),
]);

export const EMERGENCY_CUSTOMER_READINESS_CAPABILITIES = Object.freeze([
  Object.freeze({
    capabilityId: 'emergency-command-whiteboard',
    title: 'ED Command Whiteboard',
    classification: ED_READINESS_CLASSIFICATIONS.READY_TO_SELL,
    standaloneViability: 'yes',
    requiresEhrAccess: false,
    requiresIntegration: false,
    buyerPersonas: [
      ED_BUYER_PERSONAS.COO,
      ED_BUYER_PERSONAS.ED_DIRECTOR,
      ED_BUYER_PERSONAS.CHIEF_NURSING_OFFICER,
    ],
    firstCustomerNote:
      'Sell as a command-center pilot with local/demo or manually loaded ED queue data before live census integration.',
  }),
  ...EMERGENCY_AUTOMATION_MODULES.map((automation) =>
    Object.freeze({
      capabilityId: automation.automationId,
      title: automation.title,
      ...automation.readiness,
    })
  ),
]);

export function getEmergencyJourneyStage(stageId) {
  return EMERGENCY_JOURNEY_BY_ID[stageId] || null;
}

export function getEmergencyAutomationModules() {
  return EMERGENCY_AUTOMATION_MODULES;
}

export function summarizeEmergencyCustomerReadiness(
  capabilities = EMERGENCY_CUSTOMER_READINESS_CAPABILITIES
) {
  return Object.freeze({
    total: capabilities.length,
    readyToSell: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.READY_TO_SELL
    ).length,
    needsWiring: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.NEEDS_WIRING
    ).length,
    needsIntegration: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.NEEDS_INTEGRATION
    ).length,
    futureRoadmap: capabilities.filter(
      (capability) => capability.classification === ED_READINESS_CLASSIFICATIONS.FUTURE_ROADMAP
    ).length,
    standalone: capabilities.filter((capability) => capability.standaloneViability === 'yes').length,
    ehrRequired: capabilities.filter((capability) => capability.requiresEhrAccess).length,
    integrationRequired: capabilities.filter((capability) => capability.requiresIntegration).length,
  });
}

export function getEmergencyRagContextForComplaint(complaint = '') {
  const normalized = String(complaint).trim().toLowerCase();
  return (
    EMERGENCY_RAG_COMPLAINT_CONTEXT.find((context) =>
      context.complaint.toLowerCase().includes(normalized)
    ) ||
    EMERGENCY_RAG_COMPLAINT_CONTEXT.find((context) =>
      normalized.includes(context.complaint.toLowerCase())
    ) ||
    null
  );
}

function normalizeComplaintText(complaint = '') {
  return String(complaint).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function routeEmergencyChiefComplaint(complaint = '') {
  const route = routeClinicalIntent(complaint);
  if (!route) {
    return null;
  }

  return Object.freeze({
    ...route,
    matchedComplaint: complaint,
    ragContext: getEmergencyRagContextForComplaint(route.complaint),
    routingMode: 'complaint-first-workflow-guidance',
    navigationMode: 'complaint-first',
    navigationSteps: COMPLAINT_FIRST_NAVIGATION_STEPS,
  });
}

function normalizeSelectedCalculator(calculator) {
  if (!calculator) return null;
  if (typeof calculator === 'string') {
    return Object.freeze({
      id: normalizeComplaintText(calculator).replace(/\s+/g, '-'),
      label: calculator,
    });
  }
  const label = calculator.label || calculator.name || calculator.id;
  if (!label) return null;
  return Object.freeze({
    id: calculator.id || normalizeComplaintText(label).replace(/\s+/g, '-'),
    label,
  });
}

function uniqueCalculators(calculators = [] as any[]) {
  const seen = new Set();
  return Object.freeze(
    calculators
      .map(normalizeSelectedCalculator)
      .filter(Boolean)
      .filter((calculator) => {
        const key = calculator!.id || calculator!.label;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
  );
}

export function buildEmergencyCopilotGuidance(input: any = {}) {
  const complaint = String(input.complaint || '').trim();
  const vitals = String(input.vitals || input.vitalsSummary || '').trim();
  const workspaceContext = String(input.workspaceContext || 'CareDroid').trim();
  const surfacedCalculators = uniqueCalculators(input.surfacedCalculators || input.selectedCalculators || []);
  const routedComplaint = routeEmergencyChiefComplaint(complaint);
  const recommendedTools = uniqueCalculators([
    ...(routedComplaint?.calculators || []),
    ...surfacedCalculators,
  ]);
  const protocols = Object.freeze([...(routedComplaint?.protocols || [])]);
  const simulations = Object.freeze([
    ...(routedComplaint?.simulations || []),
    ...(routedComplaint?.ragContext?.simulations || []),
  ]);
  const escalationSuggestions = Object.freeze([
    routedComplaint
      ? `Review ${routedComplaint.complaint} escalation criteria with a clinician before any action.`
      : 'Use manual clinician review because no complaint route matched.',
    vitals
      ? 'Vitals were provided; verify whether any local escalation threshold applies before acting.'
      : 'Capture vitals before using calculator or escalation guidance.',
    'Do not diagnose, order treatment, determine disposition, or autonomously escalate from Copilot output.',
  ]);
  const nextWorkflowStep = routedComplaint
    ? `${routedComplaint.workflows[0]}: follow the complaint pathway, review surfaced calculators and protocols, then confirm the next step with a clinician.`
    : 'Manual clinician review: select a supported complaint route or continue standard ED assessment.';

  return Object.freeze({
    copilotId: EMERGENCY_AI_COPILOT.copilotId,
    inputs: Object.freeze({
      complaint,
      vitals,
      workspaceContext,
      surfacedCalculators,
    }),
    matchedRouteId: routedComplaint?.routeId || null,
    navigationMode: 'complaint-first',
    navigationSteps: COMPLAINT_FIRST_NAVIGATION_STEPS,
    navigationFlow: routedComplaint?.navigationFlow || Object.freeze([]),
    workflow: routedComplaint?.workflows?.[0] || null,
    referrals: Object.freeze([...(routedComplaint?.referrals || [])]),
    aiCopilot: EMERGENCY_AI_COPILOT.title,
    surfacedCalculators: recommendedTools,
    recommendedTools,
    protocols,
    nextWorkflowStep,
    simulations,
    escalationSuggestions,
    safetyBoundary: EMERGENCY_AI_COPILOT.safetyBoundary,
    reviewRequirement: EMERGENCY_AI_COPILOT.reviewRequirement,
    reasoning: Object.freeze([
      Object.freeze({
        output: 'recommendedTools',
        explanation: routedComplaint
          ? `${routedComplaint.complaint} matched a supported ED route, so calculators are surfaced automatically inside the complaint workflow.`
          : 'No complaint route matched, so no route-specific tools were added.',
      }),
      Object.freeze({
        output: 'protocols',
        explanation: routedComplaint
          ? `Protocols come from the matched ${routedComplaint.complaint} workflow route.`
          : 'Protocols require a supported complaint route or manual clinician selection.',
      }),
      Object.freeze({
        output: 'nextWorkflowStep',
        explanation: `Workspace context (${workspaceContext}) keeps the recommendation focused on ED workflow guidance.`,
      }),
      Object.freeze({
        output: 'simulations',
        explanation: routedComplaint?.ragContext?.simulations?.length
          ? 'Simulations come from complaint-specific ED context for training or practice support.'
          : 'No simulation was attached because the complaint route has no simulation context.',
      }),
      Object.freeze({
        output: 'escalationSuggestions',
        explanation: vitals
          ? 'Vitals context was provided, so escalation suggestions remind the user to verify local thresholds with a clinician.'
          : 'Vitals were not provided, so escalation suggestions ask the user to capture vitals first.',
      }),
    ]),
  });
}

function normalizeRoiNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function estimateEmergencyRoi(input: any = {}) {
  const defaults = Object.fromEntries(
    EMERGENCY_ROI_ESTIMATOR.inputFields.map((field) => [field.id, field.defaultValue])
  );
  const annualEdVolume = normalizeRoiNumber(input.annualEdVolume, defaults.annualEdVolume);
  const physicianCount = normalizeRoiNumber(input.physicianCount, defaults.physicianCount);
  const nursingCount = normalizeRoiNumber(input.nursingCount, defaults.nursingCount);
  const averageAssessmentsPerDay = normalizeRoiNumber(
    input.averageAssessmentsPerDay,
    defaults.averageAssessmentsPerDay
  );
  const clinicalStaff = physicianCount + nursingCount;
  const assumptions = EMERGENCY_ROI_ESTIMATOR.assumptions;
  const annualAssessmentHoursSaved =
    (averageAssessmentsPerDay * 365 * assumptions.minutesSavedPerAssessment) / 60;
  const annualWorkflowHoursSaved =
    (annualEdVolume * assumptions.workflowCoverageRate * assumptions.minutesSavedPerWorkflowLaunch) / 60;
  const estimatedTimeSavedHours = Math.round(annualAssessmentHoursSaved + annualWorkflowHoursSaved);
  const assessmentsPerClinicianPerDay = averageAssessmentsPerDay / Math.max(clinicalStaff, 1);
  const volumeLift = Math.min(10, annualEdVolume / 10000);
  const assessmentLoadLift = Math.min(8, assessmentsPerClinicianPerDay * 4);
  const staffReachLift = Math.min(2, clinicalStaff / 100);
  const workflowEfficiencyPercent = Math.round(
    Math.min(
      assumptions.maxEfficiencyLift,
      assumptions.baselineEfficiencyLift + volumeLift + assessmentLoadLift + staffReachLift
    )
  );
  const adoptionScore =
    (annualEdVolume >= 30000 ? 2 : annualEdVolume >= 15000 ? 1 : 0) +
    (clinicalStaff >= 75 ? 2 : clinicalStaff >= 35 ? 1 : 0) +
    (averageAssessmentsPerDay >= 90 ? 2 : averageAssessmentsPerDay >= 40 ? 1 : 0);
  const adoptionPotential = adoptionScore >= 5 ? 'High' : adoptionScore >= 3 ? 'Medium' : 'Low';

  return Object.freeze({
    inputs: Object.freeze({
      annualEdVolume,
      physicianCount,
      nursingCount,
      averageAssessmentsPerDay,
      clinicalStaff,
    }),
    outputs: Object.freeze({
      estimatedTimeSavedHours,
      workflowEfficiencyPercent,
      adoptionPotential,
    }),
    summary: Object.freeze({
      estimatedTimeSaved: `${estimatedTimeSavedHours.toLocaleString()} hours/year`,
      workflowEfficiency: `${workflowEfficiencyPercent}% efficiency lift`,
      adoptionPotential,
    }),
    assumptions,
    disclaimer: EMERGENCY_ROI_ESTIMATOR.disclaimer,
  });
}
