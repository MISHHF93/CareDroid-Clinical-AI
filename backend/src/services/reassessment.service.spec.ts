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

// HEAL-347.54: getPatientsNeedingReassessment() (the query behind the
// still-live, still-mounted GET /emergency/reassessment/due route) had zero
// organizationId filtering -- returning every organization's overdue
// patients to any authenticated caller with READ_PHI. Fixed with the same
// own-org-or-legacy-null convention as HEAL-347.49/mpi.service.ts. A
// sibling `$or` key (org filter) would have silently overwritten the
// existing due-date `$or` clause in a naive object-spread fix -- these
// tests pin the actual query shape sent to Mongoose, not just that SOME
// filtering happened, to guard against that exact regression.
describe('ReassessmentService.getPatientsNeedingReassessment tenant scoping (HEAL-347.54)', () => {
  const service = new ReassessmentService();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("scopes the query to the caller's own organization (or legacy null) when organizationId is provided", async () => {
    const findSpy = jest.spyOn(Patient, 'find').mockResolvedValue([] as any);

    await service.getPatientsNeedingReassessment('org-1');

    expect(findSpy).toHaveBeenCalledTimes(1);
    const query = findSpy.mock.calls[0][0] as any;
    expect(query.current_state).toEqual({ $nin: ['DISCHARGE', 'ADMISSION'] });
    expect(Array.isArray(query.$and)).toBe(true);
    expect(query.$and).toHaveLength(2);
    // The due-date $or clause must survive intact -- not overwritten by the
    // org filter's own $or.
    expect(query.$and[0].$or).toEqual([
      { next_reassessment_due: { $lte: expect.any(Date) } },
      {
        dps_score: { $in: [1, 2] },
        last_reassessment: { $lt: expect.any(Date) },
      },
    ]);
    expect(query.$and[1]).toEqual({
      $or: [{ organizationId: 'org-1' }, { organizationId: null }],
    });
  });

  it('does not filter by organization when none is provided (internal/cron callers)', async () => {
    const findSpy = jest.spyOn(Patient, 'find').mockResolvedValue([] as any);

    await service.getPatientsNeedingReassessment();

    const query = findSpy.mock.calls[0][0] as any;
    expect(query.$and).toHaveLength(1);
  });
});

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
    expect(result.alerts.some((alert: string) => alert.includes('Hypertensive crisis'))).toBe(
      false,
    );
  });

  it('does not flag a normal BP reading as either extreme', async () => {
    const patient = buildFakePatient({ vitals: { bp: '120/80' } });
    jest.spyOn(Patient, 'findById').mockResolvedValue(patient as any);

    const result = await service.reassessPatient('patient-1', null, 'note', {}, 'nurse-1');

    expect(result.alerts.some((alert: string) => alert.includes('Hypotension'))).toBe(false);
    expect(result.alerts.some((alert: string) => alert.includes('Hypertensive crisis'))).toBe(
      false,
    );
  });
});
