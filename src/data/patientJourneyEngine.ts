export const PATIENT_JOURNEY_STATES = Object.freeze([
  Object.freeze({
    id: 'arrival',
    label: 'Arrival',
    description: 'Door, EMS handoff, walk-in, virtual ED, or transfer entry event.',
    targetMinutes: 5,
  }),
  Object.freeze({
    id: 'registration',
    label: 'Registration',
    description: 'Identity, encounter, source, payer, consent, and intake capture.',
    targetMinutes: 10,
  }),
  Object.freeze({
    id: 'triage',
    label: 'Triage',
    description: 'Vitals, chief complaint, acuity, red flags, and calculator routing.',
    targetMinutes: 15,
  }),
  Object.freeze({
    id: 'waiting',
    label: 'Waiting',
    description: 'Patients waiting for assessment, orders, results, reassessment, or disposition movement.',
    targetMinutes: 30,
  }),
  Object.freeze({
    id: 'assessment',
    label: 'Assessment',
    description: 'Clinician assessment, differential support, protocols, and evidence review.',
    targetMinutes: 45,
  }),
  Object.freeze({
    id: 'orders',
    label: 'Orders',
    description: 'Diagnostics, medications, treatments, and protocol-linked order context.',
    targetMinutes: 30,
  }),
  Object.freeze({
    id: 'results',
    label: 'Results',
    description: 'Lab, imaging, device, and external result review.',
    targetMinutes: 60,
  }),
  Object.freeze({
    id: 'reassessment',
    label: 'Reassessment',
    description: 'Clinical reassessment after treatment, results, monitoring changes, or new risk signals.',
    targetMinutes: 30,
  }),
  Object.freeze({
    id: 'disposition',
    label: 'Disposition',
    description: 'Referral, consult, observation, transfer, admission, discharge, or follow-up routing.',
    targetMinutes: 45,
  }),
  Object.freeze({
    id: 'admission',
    label: 'Admission',
    description: 'Admission handoff, bed assignment, prior authorization support, and inpatient transition.',
    targetMinutes: 60,
  }),
  Object.freeze({
    id: 'discharge',
    label: 'Discharge',
    description: 'Discharge instructions, summary drafting, medication context, and release readiness.',
    targetMinutes: 45,
  }),
  Object.freeze({
    id: 'follow-up',
    label: 'Follow-up',
    description: 'Post-ED referrals, callbacks, education, authorizations, and care continuity.',
    targetMinutes: 120,
  }),
]);

export const PATIENT_JOURNEY_STATE_IDS = Object.freeze(PATIENT_JOURNEY_STATES.map((state) => state.id));

export const PATIENT_JOURNEY_STATE_BY_ID = Object.freeze(
  Object.fromEntries(PATIENT_JOURNEY_STATES.map((state) => [state.id, state]))
);

const STATE_ALIASES = Object.freeze({
  patient: 'arrival',
  'clinical-assessment': 'assessment',
  'clinical assessment': 'assessment',
  reassess: 'reassessment',
  'discharge-admission': 'discharge',
  'discharge/admission': 'discharge',
  followup: 'follow-up',
  'follow up': 'follow-up',
  follow_up: 'follow-up',
});

export const DEFAULT_JOURNEY_STATE_LOAD = Object.freeze({
  arrival: Object.freeze({ activePatients: 4, waitingPatients: 2, medianMinutes: 7, highRiskPatients: 1 }),
  registration: Object.freeze({ activePatients: 7, waitingPatients: 3, medianMinutes: 12, highRiskPatients: 0 }),
  triage: Object.freeze({ activePatients: 9, waitingPatients: 5, medianMinutes: 18, highRiskPatients: 4 }),
  waiting: Object.freeze({ activePatients: 18, waitingPatients: 12, medianMinutes: 46, highRiskPatients: 3 }),
  assessment: Object.freeze({ activePatients: 11, waitingPatients: 4, medianMinutes: 38, highRiskPatients: 4 }),
  orders: Object.freeze({ activePatients: 8, waitingPatients: 3, medianMinutes: 26, highRiskPatients: 1 }),
  results: Object.freeze({ activePatients: 10, waitingPatients: 6, medianMinutes: 68, highRiskPatients: 2 }),
  reassessment: Object.freeze({ activePatients: 6, waitingPatients: 3, medianMinutes: 34, highRiskPatients: 2 }),
  disposition: Object.freeze({ activePatients: 8, waitingPatients: 5, medianMinutes: 55, highRiskPatients: 1 }),
  admission: Object.freeze({ activePatients: 5, waitingPatients: 4, medianMinutes: 80, highRiskPatients: 1 }),
  discharge: Object.freeze({ activePatients: 6, waitingPatients: 2, medianMinutes: 40, highRiskPatients: 0 }),
  'follow-up': Object.freeze({ activePatients: 3, waitingPatients: 1, medianMinutes: 95, highRiskPatients: 0 }),
});

function normalizeStateId(stateId) {
  if (!stateId || typeof stateId !== 'string') return '';
  const normalized = stateId.trim().toLowerCase().replace(/_/g, '-');
  return STATE_ALIASES[normalized] || normalized;
}

function getValidStateId(stateId) {
  const normalized = normalizeStateId(stateId);
  return PATIENT_JOURNEY_STATE_BY_ID[normalized] ? normalized : '';
}

function getAutomationJourneyStates(automation: any = {}) {
  const candidateStates =
    automation.patientJourneyStates || automation.journeyStages || automation.requiredWorkflows || [];

  return [...new Set(candidateStates.map(getValidStateId).filter(Boolean))];
}

function buildAutomationCoverage(automations = [] as any[]) {
  const coverage = Object.fromEntries(PATIENT_JOURNEY_STATE_IDS.map((stateId) => [stateId, [] as any[]]));

  for (const automation of automations) {
    for (const stateId of getAutomationJourneyStates(automation)) {
      (coverage as any)[stateId as string].push({
        automationId: automation.automationId,
        title: automation.title,
        riskLevel: automation.riskLevel,
        humanReviewRequired: Boolean(automation.humanReviewRequired),
      });
    }
  }

  return coverage;
}

function getProgressStatus(stateId, currentStateId, historyStateIds) {
  if (!currentStateId) {
    return historyStateIds.has(stateId) ? 'complete' : 'not-started';
  }

  if (stateId === currentStateId) return 'current';

  const stateIndex = PATIENT_JOURNEY_STATE_IDS.indexOf(stateId);
  const currentIndex = PATIENT_JOURNEY_STATE_IDS.indexOf(currentStateId);
  if (historyStateIds.has(stateId) || stateIndex < currentIndex) return 'complete';
  return 'upcoming';
}

function readHistoryStateId(event: any = {}) {
  return getValidStateId(event.to || event.stateId || event.currentState);
}

export function transitionPatientState(patientJourney: any = {}, nextStateId, options: any = {}) {
  const nextState = getValidStateId(nextStateId);
  if (!nextState) {
    throw new Error(`Unknown patient journey state: ${nextStateId}`);
  }

  const previousState = getValidStateId(patientJourney.currentState || options.currentState) || null;
  const transitionedAt = options.transitionedAt || new Date().toISOString();
  const transitionEvent = Object.freeze({
    from: previousState,
    to: nextState,
    at: transitionedAt,
    actor: options.actor || 'PatientJourneyEngine',
    reason: options.reason || '',
  });

  return Object.freeze({
    ...patientJourney,
    patientId: patientJourney.patientId || options.patientId || 'unknown-patient',
    previousState,
    currentState: nextState,
    currentStateLabel: PATIENT_JOURNEY_STATE_BY_ID[nextState].label,
    updatedAt: transitionedAt,
    history: Object.freeze([...(patientJourney.history || []), transitionEvent]),
  });
}

export function getPatientJourney(options: any = {}) {
  const currentStateId = getValidStateId(options.currentState);
  const historyStateIds = new Set((options.history || []).map(readHistoryStateId).filter(Boolean));
  const automationCoverage = buildAutomationCoverage(options.automations || []);
  const stateLoad = options.stateLoad || DEFAULT_JOURNEY_STATE_LOAD;

  return PATIENT_JOURNEY_STATES.map((state) =>
    Object.freeze({
      ...state,
      status: getProgressStatus(state.id, currentStateId, historyStateIds),
      metrics: {
        activePatients: stateLoad[state.id]?.activePatients || 0,
        waitingPatients: stateLoad[state.id]?.waitingPatients || 0,
        medianMinutes: stateLoad[state.id]?.medianMinutes || 0,
        highRiskPatients: stateLoad[state.id]?.highRiskPatients || 0,
        targetMinutes: state.targetMinutes,
      },
      automations: Object.freeze(automationCoverage[state.id]),
      automationCount: automationCoverage[state.id].length,
    })
  );
}

export function getJourneyBottlenecks(options: any = {}) {
  const stateLoad = options.stateLoad || DEFAULT_JOURNEY_STATE_LOAD;

  return PATIENT_JOURNEY_STATES.map((state) => {
    const metrics = stateLoad[state.id] || {};
    const medianMinutes = metrics.medianMinutes || 0;
    const waitingPatients = metrics.waitingPatients || 0;
    const activePatients = metrics.activePatients || 0;
    const highRiskPatients = metrics.highRiskPatients || 0;
    const overTargetMinutes = Math.max(0, medianMinutes - state.targetMinutes);
    const isBottleneck =
      overTargetMinutes > 0 || waitingPatients >= 5 || activePatients >= 10 || highRiskPatients >= 3;

    if (!isBottleneck) return null;

    return Object.freeze({
      stateId: state.id,
      label: state.label,
      severity: overTargetMinutes >= 20 || waitingPatients >= 10 || highRiskPatients >= 3 ? 'high' : 'medium',
      reason:
        overTargetMinutes > 0
          ? `${state.label} median time is ${overTargetMinutes} minutes over target.`
          : `${state.label} has elevated queue pressure.`,
      metrics: Object.freeze({
        activePatients,
        waitingPatients,
        medianMinutes,
        highRiskPatients,
        targetMinutes: state.targetMinutes,
        overTargetMinutes,
      }),
    });
  }).filter((bottleneck): bottleneck is NonNullable<typeof bottleneck> => bottleneck !== null);
}

export function getJourneyMetrics(options: any = {}) {
  const automations = options.automations || [];
  const journey = getPatientJourney(options);
  const bottlenecks = getJourneyBottlenecks(options);
  const statesWithAutomation = journey.filter((state) => state.automationCount > 0).length;
  const activePatients = journey.reduce((sum, state) => sum + state.metrics.activePatients, 0);
  const waitingPatients = journey.reduce((sum, state) => sum + state.metrics.waitingPatients, 0);
  const highRiskPatients = journey.reduce((sum, state) => sum + state.metrics.highRiskPatients, 0);

  return Object.freeze({
    totalStates: PATIENT_JOURNEY_STATES.length,
    activePatients,
    waitingPatients,
    highRiskPatients,
    bottleneckCount: bottlenecks.length,
    automationCount: automations.length,
    statesWithAutomation,
    automationCoveragePercent: Math.round((statesWithAutomation / PATIENT_JOURNEY_STATES.length) * 100),
  });
}

export function getJourneyRecommendations(options: any = {}) {
  const journey = getPatientJourney(options);
  const bottlenecks = getJourneyBottlenecks(options);
  const recommendations: any[] = bottlenecks.map((bottleneck: any) =>
    Object.freeze({
      id: `${bottleneck.stateId}-flow-review`,
      stateId: bottleneck.stateId,
      title: `Review ${bottleneck.label} flow`,
      priority: bottleneck.severity,
      rationale: bottleneck.reason,
      action: `Open ${bottleneck.label.toLowerCase()} queue and route attached automations for human review.`,
    })
  );

  for (const state of journey.filter((item) => item.automationCount === 0)) {
    recommendations.push(
      Object.freeze({
        id: `${state.id}-automation-coverage`,
        stateId: state.id,
        title: `Add automation coverage for ${state.label}`,
        priority: 'medium',
        rationale: `${state.label} has no attached CareDroid automation.`,
        action: 'Attach at least one review-bound automation to this journey state.',
      })
    );
  }

  return Object.freeze(recommendations);
}

export const PatientJourneyEngine = Object.freeze({
  states: PATIENT_JOURNEY_STATES,
  stateIds: PATIENT_JOURNEY_STATE_IDS,
  transitionPatientState,
  getPatientJourney,
  getJourneyBottlenecks,
  getJourneyMetrics,
  getJourneyRecommendations,
});

export default PatientJourneyEngine;
