import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState } from '../../types/emergency';
import {
  REASSESSMENT_WORKFLOW_ARTIFACTS,
  buildReassessmentAttentionStripMetrics,
  countReassessmentAttentionPatients,
  patientMatchesReassessmentAttention,
  shouldShowReassessmentAttentionStrip,
} from './reassessmentVisibilityModel';

describe('reassessmentVisibilityModel', () => {
  it('catalogs existing reassessment workflow artifacts', () => {
    const ids = REASSESSMENT_WORKFLOW_ARTIFACTS.map((entry) => entry.id);
    expect(ids).toContain('drawer');
    expect(ids).toContain('patient-card');
    expect(ids).toContain('header-badge');
  });

  it('matches reassessment attention patients', () => {
    expect(
      patientMatchesReassessmentAttention({
        state: PatientState.Assessment,
        flags: [PatientFlag.ReassessmentDue],
      }),
    ).toBe(true);
    expect(
      patientMatchesReassessmentAttention({
        state: PatientState.Discharge,
        flags: [PatientFlag.ReassessmentDue],
      }),
    ).toBe(false);
  });

  it('builds attention strip metrics when patients need reassessment', () => {
    const patients = [
      { state: PatientState.Waiting, flags: [PatientFlag.ReassessmentDue] },
      { state: PatientState.Assessment, flags: [PatientFlag.DeteriorationRisk] },
    ];
    expect(countReassessmentAttentionPatients(patients)).toBe(2);
    const metrics = buildReassessmentAttentionStripMetrics(patients);
    expect(metrics[0].whiteboardAction).toBe('open-reassessment');
    expect(metrics.some((metric) => metric.whiteboardAction === 'filter-reassess')).toBe(true);
  });

  it('hides attention strip in display mode', () => {
    expect(shouldShowReassessmentAttentionStrip({ displayMode: true, attentionCount: 3 })).toBe(false);
    expect(shouldShowReassessmentAttentionStrip({ displayMode: false, attentionCount: 2 })).toBe(true);
  });
});
