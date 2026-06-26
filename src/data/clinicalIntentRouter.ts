import { REGISTRY } from './clinicalToolIdContract';

export const COMPLAINT_FIRST_NAVIGATION_STEPS = Object.freeze([
  'Complaint',
  'Workflow',
  'Calculators',
  'Protocols',
  'Referrals',
  'AI Copilot',
]);

function joinLabels(items = [] as any[], fallback = 'Human-reviewed step') {
  if (!items.length) return fallback;
  return items.map((item) => item.label || item).join(', ');
}

function buildComplaintNavigationFlow(route) {
  return Object.freeze([
    Object.freeze({ step: 'Complaint', label: route.complaint }),
    Object.freeze({ step: 'Workflow', label: route.workflows?.[0] || 'Complaint workflow' }),
    Object.freeze({ step: 'Calculators', label: joinLabels(route.calculators, 'No calculator required before clinician review') }),
    Object.freeze({ step: 'Protocols', label: joinLabels(route.protocols, 'Protocol review') }),
    Object.freeze({ step: 'Referrals', label: joinLabels(route.referrals, 'Referral review if indicated') }),
    Object.freeze({ step: 'AI Copilot', label: 'ED AI Copilot explains the complaint-specific pathway' }),
  ]);
}

function freezeRoute(route) {
  const calculators = Object.freeze((route.calculators || []).map((calculator) => Object.freeze(calculator)));
  const protocols = Object.freeze(route.protocols || []);
  const workflows = Object.freeze(route.workflows || []);
  const referrals = Object.freeze(route.referrals || []);
  const routeWithFrozenFields = {
    ...route,
    aliases: Object.freeze(route.aliases || []),
    calculators,
    protocols,
    workflows,
    simulations: Object.freeze(route.simulations || []),
    referrals,
  };

  return Object.freeze({
    ...routeWithFrozenFields,
    navigationMode: 'complaint-first',
    navigationSteps: COMPLAINT_FIRST_NAVIGATION_STEPS,
    navigationFlow: buildComplaintNavigationFlow(routeWithFrozenFields),
  });
}

export const CLINICAL_INTENT_ROUTES = Object.freeze([
  freezeRoute({
    routeId: 'chief-complaint-chest-pain',
    complaint: 'Chest Pain',
    aliases: ['chest pain', 'chest pressure', 'acs concern', 'possible acs', 'cardiac chest pain'],
    calculators: [{ id: REGISTRY.heartScore, label: 'HEART' }],
    protocols: ['ACS/chest pain pathway', 'ECG and troponin review'],
    workflows: ['ACS Workflow'],
    simulations: ['ACS chest pain simulation'],
    referrals: ['Cardiology Referral'],
    guidance:
      'Route chest pain to HEART review, ACS workflow guidance, and cardiology referral criteria for clinician review.',
    safetyStatement:
      'This route supports workflow guidance only. It does not diagnose ACS or make autonomous referral decisions.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-stroke-symptoms',
    complaint: 'Stroke Symptoms',
    aliases: ['stroke symptoms', 'stroke concern', 'weakness', 'facial droop', 'slurred speech', 'neuro deficit'],
    calculators: [{ id: REGISTRY.nihss, label: 'NIHSS' }],
    protocols: ['stroke window workflow', 'imaging escalation pathway'],
    workflows: ['Stroke Workflow'],
    simulations: ['stroke escalation simulation'],
    referrals: ['Neurology referral criteria'],
    guidance:
      'Route stroke symptoms to NIHSS review and stroke workflow guidance for time-sensitive clinician review.',
    safetyStatement:
      'This route supports stroke workflow guidance only. It does not diagnose stroke or determine treatment eligibility.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-sepsis-concern',
    complaint: 'Sepsis Concern',
    aliases: ['sepsis concern', 'possible sepsis', 'infection', 'fever hypotension', 'tachypnea infection'],
    calculators: [
      { id: REGISTRY.qsofa, label: 'qSOFA' },
      { id: REGISTRY.news2, label: 'NEWS2' },
    ],
    protocols: ['sepsis pathway', 'lactate/culture workflow'],
    workflows: ['Sepsis Workflow'],
    simulations: ['sepsis deterioration simulation'],
    referrals: ['Clinician escalation review'],
    guidance:
      'Route sepsis concern to qSOFA, NEWS2, and sepsis workflow guidance for clinician escalation review.',
    safetyStatement:
      'This route supports sepsis workflow guidance only. It does not diagnose sepsis or order treatment.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-trauma',
    complaint: 'Trauma',
    aliases: ['trauma', 'trauma activation', 'mvc', 'fall injury', 'penetrating trauma', 'blunt trauma'],
    calculators: [
      { id: REGISTRY.shockIndex, label: 'Shock Index' },
      { id: REGISTRY.revisedTraumaScore, label: 'Revised Trauma Score' },
    ],
    protocols: ['Trauma Pathway', 'trauma primary survey', 'massive transfusion review'],
    workflows: ['Trauma Pathway'],
    simulations: ['trauma bay team simulation'],
    referrals: ['Trauma surgery review'],
    guidance:
      'Route trauma presentations to trauma pathway guidance, shock review, and trauma team preparation for clinician review.',
    safetyStatement:
      'This route supports trauma workflow guidance only. It does not diagnose injuries or make autonomous activation decisions.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-shortness-of-breath',
    complaint: 'Shortness of Breath',
    aliases: ['shortness of breath', 'sob', 'dyspnea', 'respiratory distress', 'pe concern'],
    calculators: [{ id: REGISTRY.wellsPe, label: 'Wells PE' }],
    protocols: ['Respiratory Protocol', 'PE evaluation pathway'],
    workflows: ['Respiratory Workflow'],
    simulations: ['respiratory distress simulation'],
    referrals: ['Respiratory escalation review'],
    guidance:
      'Route shortness of breath to Wells PE review and respiratory protocol guidance for clinician review.',
    safetyStatement:
      'This route supports respiratory workflow guidance only. It does not diagnose PE or determine disposition.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-abdominal-pain',
    complaint: 'Abdominal Pain',
    aliases: ['abdominal pain', 'belly pain', 'gi bleed', 'pancreatitis', 'surgical abdomen', 'vomiting'],
    calculators: [
      { id: REGISTRY.ransonCriteria, label: 'Ranson Criteria' },
      { id: REGISTRY.bisapScore, label: 'BISAP' },
      { id: REGISTRY.glasgowBlatchfordScore, label: 'Glasgow-Blatchford' },
    ],
    protocols: ['Abdominal Pain Pathway', 'GI bleed and pancreatitis review', 'surgical abdomen red flag review'],
    workflows: ['Abdominal Pain Workflow'],
    simulations: ['abdominal pain escalation simulation'],
    referrals: ['Surgery or GI referral review'],
    guidance:
      'Route abdominal pain to abdominal pain workflow guidance, GI/surgical red flag review, and indicated calculator prompts for clinician review.',
    safetyStatement:
      'This route supports abdominal pain workflow guidance only. It does not diagnose surgical abdomen, GI bleeding, or pancreatitis.',
  }),
  freezeRoute({
    routeId: 'chief-complaint-psychiatric-crisis',
    complaint: 'Psychiatric Crisis',
    aliases: [
      'psychiatric crisis',
      'behavioral health crisis',
      'suicidal ideation',
      'self harm',
      'self-harm',
      'agitation',
      'psychosis',
    ],
    calculators: [
      { id: REGISTRY.columbiaSuicideSeverityWorkflow, label: 'C-SSRS' },
      { id: REGISTRY.phq9, label: 'PHQ-9' },
      { id: REGISTRY.gad7, label: 'GAD-7' },
    ],
    protocols: ['Behavioral health safety pathway', 'suicide risk and observation protocol'],
    workflows: ['Psychiatric Crisis Workflow'],
    simulations: ['behavioral health safety simulation'],
    referrals: ['Psychiatry or crisis team referral'],
    guidance:
      'Route psychiatric crisis to behavioral health safety workflow, suicide risk screening, observation context, and psychiatry or crisis team referral review.',
    safetyStatement:
      'This route supports psychiatric crisis workflow guidance only. It does not diagnose, determine capacity, or replace emergency safety assessment.',
  }),
]);

function normalizeComplaintText(complaint = '') {
  return String(complaint).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function routeClinicalIntent(complaint = '') {
  const normalized = normalizeComplaintText(complaint);
  if (!normalized) return null;

  const route = CLINICAL_INTENT_ROUTES.find((candidate) =>
    candidate.aliases.some((alias) => {
      const normalizedAlias = normalizeComplaintText(alias);
      return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
    })
  );

  if (!route) return null;

  return Object.freeze({
    ...route,
    routingMode: 'workflow-guidance',
    navigationMode: 'complaint-first',
    navigationSteps: COMPLAINT_FIRST_NAVIGATION_STEPS,
    outputs: Object.freeze({
      complaint: route.complaint,
      workflow: route.workflows[0] || null,
      calculators: route.calculators,
      protocols: route.protocols,
      workflows: route.workflows,
      referrals: route.referrals,
      aiCopilot: 'ED AI Copilot',
      simulations: route.simulations,
    }),
  });
}

export const ClinicalIntentRouter = Object.freeze({
  getRoutes() {
    return CLINICAL_INTENT_ROUTES;
  },
  routeComplaint: routeClinicalIntent,
});

export default ClinicalIntentRouter;
