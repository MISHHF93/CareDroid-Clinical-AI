import { ReassessmentService } from './reassessment.service';
import { UnifiedPatient as Patient } from '../models/unified-patient.model';

// HEAL-254: reassessPatient's abnormal-vitals alert trigger checked BP only
// for hypotension (<90), unlike the deterioration-risk check in
// deterioration-prediction-v3.service.ts (HEAL-253) and the vitals-alert
// pipeline (HEAL-237) -- a hypertensive-emergency reading previously
// triggered no reassessment alert at all, however extreme.

function buildFakePatient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    dps_score: 3,
    reassessment_history: [],
    alerts: [],
    vitals: {},
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ReassessmentService.reassessPatient abnormal-vitals alerts (HEAL-254)', () => {
  const service = new ReassessmentService();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('flags a hypertensive-crisis BP reading, not just hypotension', async () => {
    const patient = buildFakePatient({ vitals: { bp: '220/110' } });
    jest.spyOn(Patient, 'findById').mockResolvedValue(patient as any);

    const result = await service.reassessPatient('patient-1', null, 'note', {}, 'nurse-1');

    expect(result.alerts.some((alert: string) => alert.includes('Hypertensive crisis'))).toBe(true);
  });

  it('still flags hypotension as before', async () => {
    const patient = buildFakePatient({ vitals: { bp: '80/50' } });
    jest.spyOn(Patient, 'findById').mockResolvedValue(patient as any);

    const result = await service.reassessPatient('patient-1', null, 'note', {}, 'nurse-1');

    expect(result.alerts.some((alert: string) => alert.includes('Hypotension'))).toBe(true);
    expect(result.alerts.some((alert: string) => alert.includes('Hypertensive crisis'))).toBe(false);
  });

  it('does not flag a normal BP reading as either extreme', async () => {
    const patient = buildFakePatient({ vitals: { bp: '120/80' } });
    jest.spyOn(Patient, 'findById').mockResolvedValue(patient as any);

    const result = await service.reassessPatient('patient-1', null, 'note', {}, 'nurse-1');

    expect(result.alerts.some((alert: string) => alert.includes('Hypotension'))).toBe(false);
    expect(result.alerts.some((alert: string) => alert.includes('Hypertensive crisis'))).toBe(false);
  });
});
