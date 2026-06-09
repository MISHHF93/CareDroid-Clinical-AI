import { REGISTRY } from './clinicalToolIdContract';

function freezeRoute(route) {
  return Object.freeze({
    ...route,
    aliases: Object.freeze(route.aliases || []),
    calculators: Object.freeze((route.calculators || []).map((calculator) => Object.freeze(calculator))),
    protocols: Object.freeze(route.protocols || []),
    workflows: Object.freeze(route.workflows || []),
    simulations: Object.freeze(route.simulations || []),
    referrals: Object.freeze(route.referrals || []),
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
    outputs: Object.freeze({
      calculators: route.calculators,
      protocols: route.protocols,
      workflows: route.workflows,
      simulations: route.simulations,
      referrals: route.referrals,
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
