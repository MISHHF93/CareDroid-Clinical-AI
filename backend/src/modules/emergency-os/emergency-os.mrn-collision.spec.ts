import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';

/**
 * EmergencyPatientService.createPatient's MRN generation -- patients.mrn had
 * no @Index/@Unique at the DB level (see migration
 * 1772704400000-AddPatientsMrnUniqueIndex) and MRN was auto-generated as a
 * random 6-digit number with zero collision checking, so nothing stopped two
 * different patients (in the same org scope) from silently ending up with
 * the same MRN. createPatient() now retries generation (bounded, 5 attempts)
 * against the in-memory board -- the actual source of truth for reads (see
 * persistPatientToDatabase's own comment) -- before falling back to a
 * structurally-unique value if every attempt collides.
 */
describe('EmergencyPatientService.createPatient MRN collision safety', () => {
  let module: TestingModule;
  let service: EmergencyPatientService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService],
    }).compile();
    service = module.get<EmergencyPatientService>(EmergencyPatientService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Exact Math.random() fraction that makes `ED-${Math.floor(100000 + Math.random() * 900000)}` produce `ED-<sixDigitMrn>`. */
  function randomFractionFor(sixDigitMrn: number): number {
    return (sixDigitMrn - 100000) / 900000;
  }

  it('retries with a new MRN when the first randomly-generated candidate collides with an existing patient in the same org', () => {
    const existing = service.createPatient(
      {
        id: 'patient-existing',
        firstName: 'A',
        lastName: 'B',
        mrn: 'ED-123456',
        flags: [],
        timeline: [],
      },
      'org-a',
    );
    expect(existing.mrn).toBe('ED-123456');

    const randomSpy = jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(randomFractionFor(123456)) // 1st attempt collides with `existing`
      .mockReturnValueOnce(randomFractionFor(654321)); // 2nd attempt is free

    const created = service.createPatient(
      { id: 'patient-new', firstName: 'C', lastName: 'D', flags: [], timeline: [] },
      'org-a',
    );

    // >= 2, not exactly 2: createPatient's own workflow-log entry also
    // consumes a Math.random() call (its own id generation) unrelated to MRN
    // generation -- the count assertion only needs to prove a real retry
    // happened, not pin an incidental call elsewhere.
    expect(randomSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(created.mrn).toBe('ED-654321');
    expect(created.mrn).not.toBe(existing.mrn);
  });

  it('never collides across two different organizations reusing the same generated MRN (uniqueness is per-org, not global)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(randomFractionFor(300000));

    const patientOrgA = service.createPatient(
      { id: 'patient-org-a', firstName: 'A', lastName: 'A', flags: [], timeline: [] },
      'org-a',
    );
    const patientOrgB = service.createPatient(
      { id: 'patient-org-b', firstName: 'B', lastName: 'B', flags: [], timeline: [] },
      'org-b',
    );

    // Same generated MRN is fine across two different orgs -- neither
    // creation needed to retry, since MRN uniqueness only holds within an
    // org (or within the null-org legacy bucket), not globally.
    expect(patientOrgA.mrn).toBe('ED-300000');
    expect(patientOrgB.mrn).toBe('ED-300000');
  });

  it('falls back to a guaranteed-unique MRN after exhausting all retry attempts against a saturated org', () => {
    const existing = service.createPatient(
      {
        id: 'patient-saturate-existing',
        firstName: 'A',
        lastName: 'B',
        mrn: 'ED-500000',
        flags: [],
        timeline: [],
      },
      'org-saturate',
    );

    // Every attempt (all 5) collides with the one existing patient's MRN.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(randomFractionFor(500000));

    const created = service.createPatient(
      { id: 'patient-saturate-new', firstName: 'C', lastName: 'D', flags: [], timeline: [] },
      'org-saturate',
    );

    // 5 retry attempts + 1 more inside the timestamp-based fallback (plus any
    // incidental calls elsewhere, e.g. the workflow-log entry's own id).
    expect(randomSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(created.mrn).not.toBe(existing.mrn);
    expect(created.mrn).toMatch(/^ED-\d+-\d+$/);
  });

  it('confirms two patients can never end up with the same MRN across many auto-generated creates in the same org', () => {
    const created = Array.from({ length: 100 }, (_, index) =>
      service.createPatient(
        {
          id: `patient-bulk-${index}`,
          firstName: 'P',
          lastName: String(index),
          flags: [],
          timeline: [],
        },
        'org-bulk',
      ),
    );

    const mrns = created.map((patient) => patient.mrn);
    expect(new Set(mrns).size).toBe(mrns.length);
    expect(mrns.every((mrn) => /^ED-\d{6}$/.test(mrn))).toBe(true);
  });
});
