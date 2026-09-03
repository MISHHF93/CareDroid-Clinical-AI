import { describe, expect, it } from 'vitest';
import {
  PATIENT_JOURNEY_STATE_IDS,
  getJourneyBottlenecks,
  getJourneyMetrics,
  getJourneyRecommendations,
  getPatientJourney,
  transitionPatientState,
} from './patientJourneyEngine';

const sampleAutomations = Object.freeze([
  Object.freeze({
    automationId: 'triage-review',
    title: 'Triage Review',
    journeyStages: ['arrival', 'registration', 'triage', 'waiting'],
    riskLevel: 'high',
    humanReviewRequired: true,
  }),
  Object.freeze({
    automationId: 'discharge-review',
    title: 'Discharge Review',
    patientJourneyStates: ['disposition', 'discharge', 'follow-up'],
    riskLevel: 'medium',
    humanReviewRequired: true,
  }),
]);

describe('PatientJourneyEngine', () => {
  it('defines the canonical Emergency patient journey states in order', () => {
    expect(PATIENT_JOURNEY_STATE_IDS).toEqual([
      'arrival',
      'registration',
      'triage',
      'waiting',
      'assessment',
      'orders',
      'results',
      'reassessment',
      'disposition',
      'admission',
      'discharge',
      'follow-up',
    ]);
  });

  it('transitions patient state without mutating prior journey history', () => {
    const journey = transitionPatientState(
      { patientId: 'ED-1', currentState: 'triage', history: [] },
      'assessment',
      { transitionedAt: '2026-06-08T12:00:00.000Z', actor: 'triage-nurse' },
    );

    expect(journey).toEqual(
      expect.objectContaining({
        patientId: 'ED-1',
        previousState: 'triage',
        currentState: 'assessment',
        currentStateLabel: 'Assessment',
      }),
    );
    expect(journey.history).toEqual([
      expect.objectContaining({
        from: 'triage',
        to: 'assessment',
        actor: 'triage-nurse',
      }),
    ]);
  });

  it('returns journey state automation coverage and progress', () => {
    const journey = getPatientJourney({
      currentState: 'results',
      history: [{ to: 'triage' }],
      automations: sampleAutomations,
    });

    expect(journey.find((state) => state.id === 'triage')).toEqual(
      expect.objectContaining({
        status: 'complete',
        automationCount: 1,
      }),
    );
    const resultsState = journey.find((state) => state.id === 'results');
    if (!resultsState) throw new Error('expected results state in journey');
    expect(resultsState.status).toBe('current');

    const followUpState = journey.find((state) => state.id === 'follow-up');
    if (!followUpState) throw new Error('expected follow-up state in journey');
    expect(followUpState.automationCount).toBe(1);
  });

  it('summarizes bottlenecks, metrics, and recommendations', () => {
    const stateLoad = {
      waiting: { activePatients: 18, waitingPatients: 12, medianMinutes: 50, highRiskPatients: 3 },
      results: { activePatients: 9, waitingPatients: 6, medianMinutes: 75, highRiskPatients: 1 },
    };

    const bottlenecks = getJourneyBottlenecks({ stateLoad });
    const metrics = getJourneyMetrics({ automations: sampleAutomations, stateLoad });
    const recommendations = getJourneyRecommendations({
      automations: sampleAutomations,
      stateLoad,
    });

    expect(bottlenecks.map((bottleneck) => bottleneck.stateId)).toEqual(
      expect.arrayContaining(['waiting', 'results']),
    );
    expect(metrics).toEqual(
      expect.objectContaining({
        totalStates: 12,
        bottleneckCount: bottlenecks.length,
        automationCount: 2,
      }),
    );
    expect(recommendations.map((recommendation) => recommendation.stateId)).toEqual(
      expect.arrayContaining(['waiting', 'assessment']),
    );
  });
});
