import { REGISTRY } from './clinicalToolIdContract';

export const EMERGENCY_KNOWLEDGE_DOMAINS = Object.freeze([
  'protocol',
  'calculator',
  'pathway',
  'simulation',
  'evidence',
  'workflow',
]);

export const EMERGENCY_KNOWLEDGE_ITEMS = Object.freeze([
  Object.freeze({
    knowledgeId: 'knowledge-chest-pain',
    title: 'Chest Pain / ACS Guidance',
    domain: 'protocol',
    complaintTags: ['chest pain', 'chest pressure', 'acs concern'],
    workflowIds: ['ed-workflow-chest-pain'],
    aliases: ['HEART', 'GRACE ACS', 'TIMI', 'ECG', 'troponin'],
    summary:
      'ACS/chest pain pathway with ECG, troponin timing, HEART, GRACE, TIMI, and cardiology referral criteria.',
    sourceState: 'configured',
    relatedCalculators: [REGISTRY.heartScore, REGISTRY.graceAcs, REGISTRY.timiUaNstemi],
    launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-chest-pain',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-stroke',
    title: 'Stroke Window Guidance',
    domain: 'pathway',
    complaintTags: ['stroke symptoms', 'facial droop', 'weakness', 'slurred speech'],
    workflowIds: ['ed-workflow-stroke'],
    aliases: ['NIHSS', 'ABCD2', 'imaging escalation', 'neurology'],
    summary:
      'Stroke pathway with last-known-well context, NIHSS review, imaging readiness, and neurology criteria.',
    sourceState: 'configured',
    relatedCalculators: [REGISTRY.nihss, REGISTRY.abcd2],
    launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-stroke',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-sepsis',
    title: 'Sepsis Workflow Guidance',
    domain: 'workflow',
    complaintTags: ['sepsis concern', 'infection', 'fever', 'hypotension'],
    workflowIds: ['ed-workflow-sepsis'],
    aliases: ['qSOFA', 'NEWS2', 'SOFA', 'Shock Index', 'lactate'],
    summary:
      'Sepsis pathway with qSOFA, NEWS2, SOFA, Shock Index, lactate/culture workflow, and reassessment prompts.',
    sourceState: 'configured',
    relatedCalculators: [REGISTRY.qsofa, REGISTRY.news2, REGISTRY.sofaScore, REGISTRY.shockIndex],
    launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-sepsis',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-trauma',
    title: 'Trauma Pathway',
    domain: 'protocol',
    complaintTags: ['trauma', 'mvc', 'fall injury', 'penetrating trauma'],
    workflowIds: ['ed-workflow-trauma'],
    aliases: ['Shock Index', 'Revised Trauma Score', 'GCS', 'ATLS'],
    summary:
      'Trauma primary survey context with hemodynamic risk, trauma scoring, and surgical review criteria.',
    sourceState: 'configured',
    relatedCalculators: [REGISTRY.shockIndex, REGISTRY.revisedTraumaScore, REGISTRY.gcsCalculator],
    launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-trauma',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-respiratory',
    title: 'Respiratory Distress Guidance',
    domain: 'pathway',
    complaintTags: ['shortness of breath', 'dyspnea', 'respiratory distress', 'pe concern'],
    workflowIds: ['ed-workflow-respiratory-distress'],
    aliases: ['Wells PE', 'PERC', 'ROX', 'NEWS2', 'oxygen escalation'],
    summary:
      'Respiratory and PE pathway with oxygen escalation, Wells PE, PERC, NEWS2, and respiratory reassessment context.',
    sourceState: 'configured',
    relatedCalculators: [REGISTRY.news2, REGISTRY.wellsPe, REGISTRY.perc, REGISTRY.roxIndex],
    launchTarget: '/workspace/emergency/evidence?workflow=ed-workflow-respiratory-distress',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-abdominal-pain',
    title: 'Abdominal Pain Pathways',
    domain: 'pathway',
    complaintTags: ['abdominal pain', 'gi bleed', 'pancreatitis', 'vomiting'],
    workflowIds: ['ed-workflow-abdominal-pain'],
    aliases: ['Ranson', 'BISAP', 'Glasgow-Blatchford', 'Rockall', 'MELD'],
    summary:
      'Abdominal pain, GI bleed, pancreatitis, surgical abdomen, lab, and imaging review guidance.',
    sourceState: 'demo',
    relatedCalculators: [
      REGISTRY.ransonCriteria,
      REGISTRY.bisapScore,
      REGISTRY.glasgowBlatchfordScore,
      REGISTRY.rockallScore,
    ],
    launchTarget: '/workspace/emergency/knowledge?query=abdominal-pain',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-behavioral-health',
    title: 'Behavioral Health Safety Review',
    domain: 'protocol',
    complaintTags: ['behavioral health', 'suicidal ideation', 'self-harm', 'psychiatric crisis'],
    workflowIds: ['ed-workflow-behavioral-health'],
    aliases: ['PHQ-9', 'GAD-7', 'AUDIT-C', 'C-SSRS'],
    summary:
      'Behavioral health safety pathway with screening tools, observation context, and referral criteria.',
    sourceState: 'demo',
    relatedCalculators: [
      REGISTRY.phq9,
      REGISTRY.gad7,
      REGISTRY.auditC,
      REGISTRY.columbiaSuicideSeverityWorkflow,
    ],
    launchTarget: '/workspace/emergency/knowledge?query=behavioral-health',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-discharge',
    title: 'Discharge Readiness',
    domain: 'workflow',
    complaintTags: ['discharge', 'follow-up', 'instructions'],
    workflowIds: ['ed-workflow-discharge'],
    aliases: ['return precautions', 'follow-up checklist', 'discharge summary'],
    summary:
      'Discharge readiness workflow with instructions, follow-up, medication context, and documentation review.',
    sourceState: 'demo',
    relatedCalculators: [],
    launchTarget: '/workspace/emergency/documentation',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-referral',
    title: 'Referral And Consult Routing',
    domain: 'workflow',
    complaintTags: ['referral', 'consult', 'transfer', 'specialty'],
    workflowIds: ['ed-workflow-referral'],
    aliases: [
      'cardiology',
      'neurology',
      'psychiatry',
      'internal medicine',
      'surgery',
      'ICU',
      'laboratory',
    ],
    summary:
      'Consult, transfer, specialty, and follow-up referral workflow with missing-data and handoff checks.',
    sourceState: 'demo',
    relatedCalculators: [],
    launchTarget: '/workspace/emergency/referrals',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-admission',
    title: 'Admission And Boarding Readiness',
    domain: 'workflow',
    complaintTags: ['admission', 'boarding', 'bed request', 'handoff'],
    workflowIds: ['ed-workflow-admission'],
    aliases: ['bed pressure', 'capacity', 'boarding escalation'],
    summary:
      'Admission readiness, bed request, boarding escalation, and inpatient handoff guidance.',
    sourceState: 'demo',
    relatedCalculators: [REGISTRY.news2, REGISTRY.qsofa, REGISTRY.bedOccupancyCalculator],
    launchTarget: '/workspace/emergency/boarding',
  }),
  Object.freeze({
    knowledgeId: 'knowledge-simulation',
    title: 'ED Simulation Scenarios',
    domain: 'simulation',
    complaintTags: ['simulation', 'training', 'debrief'],
    workflowIds: ['ed-workflow-sepsis', 'ed-workflow-stroke', 'ed-workflow-trauma'],
    aliases: ['sepsis deterioration', 'stroke escalation', 'trauma bay', 'respiratory distress'],
    summary:
      'Simulation scenarios for sepsis surge, stroke surge, trauma bay, EMS overload, and boarding crisis training.',
    sourceState: 'demo',
    relatedCalculators: [],
    launchTarget: '/workspace/emergency/simulations',
  }),
]);

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

function matchesQuery(item, query) {
  const normalized = normalize(query);
  if (!normalized) return true;
  return [
    item.title,
    item.domain,
    item.summary,
    ...(item.complaintTags || []),
    ...(item.workflowIds || []),
    ...(item.aliases || []),
    ...(item.relatedCalculators || []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

export const EmergencyKnowledgeLayer = Object.freeze({
  route: '/workspace/emergency/knowledge',
  title: 'Emergency Knowledge Layer',
  domains: EMERGENCY_KNOWLEDGE_DOMAINS,
  items: EMERGENCY_KNOWLEDGE_ITEMS,
  quickFilters: Object.freeze([
    'Protocols',
    'Calculators',
    'Pathways',
    'Simulations',
    'Evidence',
    'Workflows',
    'High-risk only',
    'Recently used',
  ]),
  search(query = '') {
    return Object.freeze(EMERGENCY_KNOWLEDGE_ITEMS.filter((item) => matchesQuery(item, query)));
  },
  getDashboard(query = '') {
    const results = this.search(query);
    return Object.freeze({
      route: this.route,
      title: this.title,
      design: 'search-first',
      query,
      results,
      resultCount: results.length,
      domains: this.domains,
      quickFilters: this.quickFilters,
      sourceState: 'Configured/demo ED knowledge · local protocol approval pending',
      safetyStatement:
        'Knowledge results are clinical guidance for human review. They do not diagnose, order treatment, determine disposition, or autonomously escalate.',
    });
  },
});

export const getEmergencyKnowledgeDashboard =
  EmergencyKnowledgeLayer.getDashboard.bind(EmergencyKnowledgeLayer);

export default EmergencyKnowledgeLayer;
