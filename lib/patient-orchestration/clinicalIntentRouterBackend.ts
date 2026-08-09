/**
 * Backend-safe complaint routing — mirrors src/data/clinicalIntentRouter.ts's own
 * CLINICAL_INTENT_ROUTES (renamed from .js at some point; this file's own header
 * comment was stale). Feeds a real, live path: EmergencyOsController's
 * GET /emergency/patients/:patientId/orchestration -> orchestration.service.ts's
 * buildPatientOrchestration() -> recommendTools.ts's buildPatientCardOrchestrationContext()
 * -> ClinicalIntentRouter.routeComplaint() here -- ultimately consumed by
 * CopilotPanel.tsx/PatientCardCopilot.tsx's tool recommendations via
 * usePatientOrchestration(). Not dead code (confirmed 2026-08-09 via full call-
 * graph trace, correcting an earlier "duplicate, needs deleting" assumption).
 *
 * The backend genuinely cannot import the canonical complaint-recognition
 * pipeline (src/data/clinicalTerminology/recognizeComplaint.ts + its
 * dependencies, including the safety-relevant src/services/highRiskComplaintFlags.ts)
 * -- backend/tsconfig.build.json only allows lib/ and src/types/. Unlike
 * src/data/clinicalIntentRouter.ts, which falls back to recognizeComplaint()
 * when its own alias list misses a phrasing, this backend mirror has no such
 * fallback, so it used to silently fail to route complaints the canonical
 * recognizer already knows (e.g. "heart attack", "chest tightness", "can't
 * breathe", "septic shock") -- a real recognition gap, not a hypothetical one,
 * for the live Copilot tool-recommendation surface (not a missed safety alert:
 * highRiskComplaintFlags.ts's own fast-flag detection is a separate, already-
 * correctly-firing mechanism this router doesn't gate). 2026-08-09: manually
 * synced these alias lists against HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS'
 * keyword regexes for the 5 concepts both registries cover, closing the
 * verified gap. This is a stopgap, not the canonical fix -- relocating the
 * shared recognition pipeline into lib/ (so this file could delegate to it
 * directly instead of a hand-synced mirror) remains the proper long-term fix,
 * deliberately deferred: it touches highRiskComplaintFlags.ts, which is
 * safety-relevant, and needs its own careful, dedicated round rather than a
 * rushed multi-file relocation.
 */

export type ClinicalIntentRoute = {
  routeId: string;
  complaint: string;
  aliases: readonly string[];
  calculators: ReadonlyArray<{ id: string; label?: string }>;
  protocols: readonly string[];
  workflows: readonly string[];
  referrals: readonly string[];
  guidance?: string;
  safetyStatement?: string;
};

const ROUTES: readonly ClinicalIntentRoute[] = Object.freeze([
  {
    routeId: 'chief-complaint-chest-pain',
    complaint: 'Chest Pain',
    aliases: [
      'chest pain', 'chest pressure', 'acs concern', 'possible acs', 'cardiac chest pain',
      'pain in my chest', 'pain in the chest', 'pressure in my chest', 'pressure in the chest',
      'chest tightness', 'tight chest', 'angina', 'stemi', 'nstemi', 'myocardial infarction', 'heart attack',
    ],
    calculators: [{ id: 'heart-score', label: 'HEART' }],
    protocols: ['ACS/chest pain pathway', 'ECG and troponin review'],
    workflows: ['ACS Workflow'],
    referrals: ['Cardiology Referral'],
    guidance: 'Route chest pain to HEART review, ACS workflow guidance, and cardiology referral criteria for clinician review.',
    safetyStatement:
      'This route supports workflow guidance only. It does not diagnose ACS or make autonomous referral decisions.',
  },
  {
    routeId: 'chief-complaint-stroke-symptoms',
    complaint: 'Stroke Symptoms',
    aliases: [
      'stroke symptoms', 'stroke concern', 'weakness', 'facial droop', 'slurred speech', 'neuro deficit',
      'stroke', 'tia', 'aphasia', 'hemiparesis', 'weakness on one side',
      'neurologic deficit', 'neurological deficit', 'sudden vision loss', 'fast positive',
    ],
    calculators: [{ id: 'nihss', label: 'NIHSS' }],
    protocols: ['stroke window workflow', 'imaging escalation pathway'],
    workflows: ['Stroke Workflow'],
    referrals: ['Neurology referral criteria'],
    guidance: 'Route stroke symptoms to NIHSS review and stroke workflow guidance for time-sensitive clinician review.',
    safetyStatement:
      'This route supports stroke workflow guidance only. It does not diagnose stroke or determine treatment eligibility.',
  },
  {
    routeId: 'chief-complaint-sepsis-concern',
    complaint: 'Sepsis Concern',
    aliases: [
      'sepsis concern', 'possible sepsis', 'infection', 'fever hypotension', 'tachypnea infection',
      'sepsis', 'septic', 'septic shock', 'infection concern',
    ],
    calculators: [
      { id: 'qsofa', label: 'qSOFA' },
      { id: 'news2', label: 'NEWS2' },
    ],
    protocols: ['sepsis pathway', 'lactate/culture workflow'],
    workflows: ['Sepsis Workflow'],
    referrals: ['Clinician escalation review'],
    guidance: 'Route sepsis concern to qSOFA, NEWS2, and sepsis workflow guidance for clinician escalation review.',
    safetyStatement:
      'This route supports sepsis workflow guidance only. It does not diagnose sepsis or order treatment.',
  },
  {
    routeId: 'chief-complaint-trauma',
    complaint: 'Trauma',
    aliases: ['trauma', 'trauma activation', 'mvc', 'fall injury', 'penetrating trauma', 'blunt trauma'],
    calculators: [
      { id: 'shock-index', label: 'Shock Index' },
      { id: 'revised-trauma-score', label: 'Revised Trauma Score' },
    ],
    protocols: ['Trauma Pathway', 'trauma primary survey', 'massive transfusion review'],
    workflows: ['Trauma Pathway'],
    referrals: ['Trauma surgery review'],
    guidance:
      'Route trauma presentations to trauma pathway guidance, shock review, and trauma team preparation for clinician review.',
    safetyStatement:
      'This route supports trauma workflow guidance only. It does not diagnose injuries or make autonomous activation decisions.',
  },
  {
    routeId: 'chief-complaint-shortness-of-breath',
    complaint: 'Shortness of Breath',
    aliases: [
      'shortness of breath', 'sob', 'dyspnea', 'respiratory distress', 'pe concern',
      'short of breath', 'dyspnoea', 'breathing difficulty', 'difficulty breathing', 'trouble breathing',
      "can't breathe", 'cant breathe', 'cannot breathe', 'hypoxia', 'hypoxic',
    ],
    calculators: [{ id: 'wells-pe', label: 'Wells PE' }],
    protocols: ['Respiratory Protocol', 'PE evaluation pathway'],
    workflows: ['Respiratory Workflow'],
    referrals: ['Respiratory escalation review'],
    guidance: 'Route shortness of breath to Wells PE review and respiratory protocol guidance for clinician review.',
    safetyStatement:
      'This route supports respiratory workflow guidance only. It does not diagnose PE or determine disposition.',
  },
  {
    routeId: 'chief-complaint-abdominal-pain',
    complaint: 'Abdominal Pain',
    aliases: [
      'abdominal pain', 'belly pain', 'gi bleed', 'pancreatitis', 'surgical abdomen', 'vomiting',
      'severe abdominal pain', 'acute abdomen', 'ruptured appendix', 'ruptured aortic', 'ruptured ectopic', 'peritonitis',
    ],
    calculators: [
      { id: 'ranson-criteria', label: 'Ranson Criteria' },
      { id: 'bisap-score', label: 'BISAP' },
      { id: 'glasgow-blatchford-score', label: 'Glasgow-Blatchford' },
    ],
    protocols: ['Abdominal Pain Pathway', 'GI bleed and pancreatitis review', 'surgical abdomen red flag review'],
    workflows: ['Abdominal Pain Workflow'],
    referrals: ['Surgery or GI referral review'],
    guidance:
      'Route abdominal pain to abdominal pain workflow guidance, GI/surgical red flag review, and indicated calculator prompts for clinician review.',
    safetyStatement:
      'This route supports abdominal pain workflow guidance only. It does not diagnose surgical abdomen, GI bleeding, or pancreatitis.',
  },
  {
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
      { id: 'columbia-suicide-severity-workflow', label: 'C-SSRS' },
      { id: 'phq9', label: 'PHQ-9' },
      { id: 'gad7', label: 'GAD-7' },
    ],
    protocols: ['Behavioral health safety pathway', 'suicide risk and observation protocol'],
    workflows: ['Psychiatric Crisis Workflow'],
    referrals: ['Psychiatry or crisis team referral'],
    guidance:
      'Route psychiatric crisis to behavioral health safety workflow, suicide risk screening, observation context, and psychiatry or crisis team referral review.',
    safetyStatement:
      'This route supports psychiatric crisis workflow guidance only. It does not diagnose, determine capacity, or replace emergency safety assessment.',
  },
]);

function normalizeComplaintText(complaint = ''): string {
  return String(complaint).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export function routeClinicalIntent(complaint = ''): ClinicalIntentRoute | null {
  const normalized = normalizeComplaintText(complaint);
  if (!normalized) return null;

  const route = ROUTES.find((candidate) =>
    candidate.aliases.some((alias) => {
      const normalizedAlias = normalizeComplaintText(alias);
      return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
    }),
  );

  return route || null;
}

export const ClinicalIntentRouter = Object.freeze({
  getRoutes() {
    return ROUTES;
  },
  routeComplaint: routeClinicalIntent,
});