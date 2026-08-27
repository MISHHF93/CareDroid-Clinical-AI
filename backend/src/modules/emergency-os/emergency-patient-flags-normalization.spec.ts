import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService.createPatient — flags normalization', () => {
  it('stores a plain string[] as-is (the common, correct case)', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Amy',
      lastName: 'Rivera',
      flags: ['HighRisk', 'EMSArrival'],
    });

    expect(patient.flags).toEqual(['HighRisk', 'EMSArrival']);
  });

  it("extracts .type from object-shaped flags — the real shape Smart Intake's vertical-slice flow sends", () => {
    const { service } = makeService();

    // Matches src/data/smartIntakeVerticalSlice.ts's createFlag() output exactly:
    // { type, reason, severity, detectedAt }.
    const patient = service.createPatient({
      firstName: 'Jordan',
      lastName: 'Lee',
      flags: [
        {
          type: 'HighRisk',
          reason: 'Smart Intake assigned P1 priority.',
          severity: 'Critical',
          detectedAt: '2026-07-25T10:00:00.000Z',
        },
        {
          type: 'ReassessmentDue',
          reason: 'Requires reassessment after triage.',
          severity: 'Warning',
          detectedAt: '2026-07-25T10:00:00.000Z',
        },
      ] as any,
    });

    expect(patient.flags).toEqual(['HighRisk', 'ReassessmentDue']);
    // Every stored entry must be a real string — none of the original objects
    // (or their metadata) leak through, since downstream code does
    // `flags.includes(PatientFlag.X)`, which silently never matches an object.
    for (const flag of patient.flags) {
      expect(typeof flag).toBe('string');
    }
  });

  it('handles a mix of string and object entries in the same array', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Sam',
      lastName: 'Okafor',
      flags: [
        'EMSArrival',
        { type: 'SepsisAlert', reason: 'qSOFA positive', severity: 'Critical', detectedAt: 'x' },
      ] as any,
    });

    expect(patient.flags).toEqual(['EMSArrival', 'SepsisAlert']);
  });

  it('drops unrecognizable entries rather than storing garbage', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Priya',
      lastName: 'Nair',
      flags: ['HighRisk', null, undefined, 42, { noTypeField: true }] as any,
    });

    expect(patient.flags).toEqual(['HighRisk']);
  });

  it('deduplicates flags that resolve to the same string from different sources', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Chen',
      lastName: 'Wu',
      flags: [
        'HighRisk',
        { type: 'HighRisk', reason: 'dup', severity: 'Critical', detectedAt: 'x' },
      ] as any,
    });

    expect(patient.flags).toEqual(['HighRisk']);
  });

  it('still defaults to ["HighRisk"] for P1/P2 priority when no flags are given at all', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'No',
      lastName: 'Flags',
      priority: 'P1',
    });

    expect(patient.flags).toEqual(['HighRisk']);
  });

  it('stores an empty array as an empty array, not the P1/P2 default (matches pre-fix behavior)', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Empty',
      lastName: 'Flags',
      priority: 'P1',
      flags: [],
    });

    expect(patient.flags).toEqual([]);
  });
});

describe('EmergencyPatientService.escalatePatient — flags match the frontend canonical set', () => {
  it('adds HighRisk/DeteriorationRisk/ReassessmentDue, not the orphaned "Escalated" string (MB-P0-6 follow-up)', () => {
    const { service } = makeService();
    const patient = service.createPatient({
      firstName: 'Escalation',
      lastName: 'Target',
      flags: [],
    });

    const updated = service.escalatePatient(patient.id, 'staff-charge-nurse');

    // 'Escalated' is not a recognized frontend PatientFlag (src/types/
    // emergency.ts) -- it rendered no badge and drove no queue/reassessment
    // logic. The frontend's own local escalation (buildEscalatePatientPatch)
    // already adds these 3 real flags; the backend must match so a reload
    // doesn't silently drop real escalation signal.
    expect(updated.flags).toEqual(
      expect.arrayContaining(['HighRisk', 'DeteriorationRisk', 'ReassessmentDue']),
    );
    expect(updated.flags).not.toContain('Escalated');
  });

  it('does not duplicate escalation flags already present on the patient', () => {
    const { service } = makeService();
    const patient = service.createPatient({
      firstName: 'Already',
      lastName: 'HighRisk',
      flags: ['HighRisk'],
    });

    const updated = service.escalatePatient(patient.id, 'staff-charge-nurse');

    expect(updated.flags.filter((flag) => flag === 'HighRisk')).toHaveLength(1);
    expect(updated.flags).toEqual(
      expect.arrayContaining(['HighRisk', 'DeteriorationRisk', 'ReassessmentDue']),
    );
  });

  // Regression coverage for the 2026-08-27 fix: escalatePatient's dispatched
  // alert was a pure broadcast with no intended-recipient at all -- any of
  // the ~15 roles with ALERT_ACKNOWLEDGE permission could acknowledge it with
  // no way to tell whether the physician it was really for ever saw it.
  it("dispatches the escalation alert with ownerRole: physician, matching this action's real clinical meaning", () => {
    const { service } = makeService();
    const patient = service.createPatient({
      firstName: 'Needs',
      lastName: 'PhysicianReview',
      flags: [],
    });

    service.escalatePatient(patient.id, 'staff-charge-nurse');

    const alerts = service.listAlerts();
    const escalationAlert = alerts.find((alert) => alert.patientId === patient.id);
    expect(escalationAlert).toBeDefined();
    expect(escalationAlert?.ownerRole).toBe('physician');
  });
});
