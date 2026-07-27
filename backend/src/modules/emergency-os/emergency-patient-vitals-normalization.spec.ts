import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService.createPatient — vitals normalization', () => {
  it('passes canonical sbp/dbp through unchanged', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Amy',
      lastName: 'Rivera',
      vitals: [
        {
          hr: 88,
          sbp: 120,
          dbp: 80,
          spo2: 98,
          recordedAt: '2026-07-25T10:00:00.000Z',
          recordedBy: 'nurse-1',
        },
      ],
    });

    expect(patient.vitals[0].sbp).toBe(120);
    expect(patient.vitals[0].dbp).toBe(80);
    expect(patient.vitals[0].recordedBy).toBe('nurse-1');
  });

  it("maps bpSystolic/bpDiastolic to sbp/dbp — the real shape Smart Intake's vertical-slice flow sends", () => {
    const { service } = makeService();

    // Matches src/data/smartIntakeVerticalSlice.ts's normalizeSmartIntakeVitals()
    // output exactly: hr/bpSystolic/bpDiastolic/spo2/temp/rr/gcs/pain/recordedAt,
    // with no recordedBy at all.
    const patient = service.createPatient({
      firstName: 'Jordan',
      lastName: 'Lee',
      vitals: [
        {
          hr: 128,
          bpSystolic: 144,
          bpDiastolic: 92,
          spo2: 97,
          temp: 36.8,
          recordedAt: '2026-07-25T10:00:00.000Z',
        },
      ] as any,
    });

    expect(patient.vitals[0].sbp).toBe(144);
    expect(patient.vitals[0].dbp).toBe(92);
    // hr/spo2/temp must survive the normalization untouched.
    expect(patient.vitals[0].hr).toBe(128);
    expect(patient.vitals[0].spo2).toBe(97);
    expect(patient.vitals[0].temp).toBe(36.8);
  });

  it('defaults recordedBy to the assigned staff id when the caller omits it', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Sam',
      lastName: 'Okafor',
      assignedStaffId: 'staff-42',
      vitals: [
        { hr: 80, bpSystolic: 118, bpDiastolic: 76, recordedAt: '2026-07-25T10:00:00.000Z' } as any,
      ],
    });

    expect(patient.vitals[0].recordedBy).toBe('staff-42');
  });

  it('defaults recordedBy to "intake" when no staff is assigned either', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'No',
      lastName: 'Staff',
      vitals: [{ hr: 80 } as any],
    });

    expect(patient.vitals[0].recordedBy).toBe('intake');
  });

  it('treats a null bpSystolic/bpDiastolic (empty form field) as genuinely absent, not zero or null', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Empty',
      lastName: 'Vitals',
      vitals: [{ hr: 80, bpSystolic: null, bpDiastolic: null, recordedAt: 'x' } as any],
    });

    expect(patient.vitals[0].sbp).toBeUndefined();
    expect(patient.vitals[0].dbp).toBeUndefined();
  });

  it('accepts a single non-array vitals object the same way the pre-fix code did', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Single',
      lastName: 'Vital',
      vitals: { hr: 90, sbp: 110, dbp: 70, recordedAt: 'x', recordedBy: 'y' } as any,
    });

    expect(patient.vitals).toHaveLength(1);
    expect(patient.vitals[0].sbp).toBe(110);
  });

  it('normalizes every entry in a multi-vitals array independently', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'Multi',
      lastName: 'Vitals',
      vitals: [
        { hr: 80, sbp: 120, dbp: 80, recordedAt: 't1', recordedBy: 'nurse-1' },
        { hr: 95, bpSystolic: 150, bpDiastolic: 95, recordedAt: 't2' },
      ] as any,
    });

    expect(patient.vitals).toHaveLength(2);
    expect(patient.vitals[0].sbp).toBe(120);
    expect(patient.vitals[0].recordedBy).toBe('nurse-1');
    expect(patient.vitals[1].sbp).toBe(150);
    expect(patient.vitals[1].recordedBy).toBe('intake');
  });

  it('stores an empty vitals array as empty, not a fabricated entry', () => {
    const { service } = makeService();

    const patient = service.createPatient({
      firstName: 'No',
      lastName: 'Vitals',
      vitals: [],
    });

    expect(patient.vitals).toEqual([]);
  });
});
