import { describe, expect, it } from 'vitest';
import {
  buildAcceptedTriageAssist,
  isTriageAssistPendingReview,
  mapStreamingLaneToQueueDestination,
} from './triageAssistSignOff';
import { PatientState, Priority, type Patient } from '../types/emergency';

const patient = {
  id: 'p1',
  state: PatientState.Waiting,
  triagePending: true,
  source: 'Self-arrival',
  triageAssist: {
    suggestedPriority: Priority.P3,
    suggestedQueue: 'minors',
    rationale: ['Self-arrival complaint parsed.'],
    confidence: 'medium' as const,
    ruleTriggered: 'self-arrival-triage',
    disclaimers: ['Human review required.'],
    requiresHumanReview: true as const,
    generatedAt: new Date().toISOString(),
    source: 'rules' as const,
  },
} as Patient;

describe('triageAssistSignOff', () => {
  it('detects pending self-arrival triage review', () => {
    expect(isTriageAssistPendingReview(patient)).toBe(true);
  });

  it('maps streaming lanes to queue destinations', () => {
    expect(mapStreamingLaneToQueueDestination('minors')).toBe('waiting-room');
    expect(mapStreamingLaneToQueueDestination('resus')).toBe('triage-queue');
    expect(mapStreamingLaneToQueueDestination('fast-track')).toBe('rapid-review');
  });

  it('records nurse overrides in accepted assist envelope', () => {
    const accepted = buildAcceptedTriageAssist(patient.triageAssist!, {
      priority: Priority.P2,
      streamingLane: 'majors',
    });
    expect(accepted.suggestedPriority).toBe(Priority.P2);
    expect(accepted.suggestedQueue).toBe('majors');
    expect(accepted.acceptedAt).toBeTruthy();
  });
});
