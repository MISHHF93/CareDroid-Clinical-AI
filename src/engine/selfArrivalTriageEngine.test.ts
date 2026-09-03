import { describe, expect, it } from 'vitest';
import { suggestSelfArrivalTriage } from './selfArrivalTriageEngine';
import { Priority } from '../types/emergency';

describe('selfArrivalTriageEngine', () => {
  it('suggests resus stream for critical complaint patterns', () => {
    const result = suggestSelfArrivalTriage({
      complaintText: 'major trauma polytrauma unstable',
      complaintCategory: 'Trauma',
      vitals: { spo2: 84, hr: 130 },
    });

    expect([Priority.P1, Priority.P2]).toContain(result.suggestedPriority);
    expect(result.streamingLane).toBe('resus');
    expect(result.humanReviewRequired).toBe(true);
  });

  it('maps lower acuity complaints toward minors or UTC lanes', () => {
    const result = suggestSelfArrivalTriage({
      complaintText: 'minor laceration to finger',
      complaintCategory: 'Minor injury',
    });

    expect(['minors', 'utc', 'fast-track']).toContain(result.streamingLane);
  });
});
