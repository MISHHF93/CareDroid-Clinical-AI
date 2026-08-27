import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmergencyPatientService, WorkflowActionLogService } from './emergency-os.services';

/**
 * EmergencyPatientService.reconcilePatientIdentity -- the LIVE (default)
 * TypeORM patient-domain path's identity-reconciliation workflow, added to
 * close the gap where src/services/provisionalIdentityIntake.ts (frontend)
 * can create an "Unknown Patient"/"Temporary Patient"/"Identity Pending"
 * record with PatientFlag.IdentityPending set, but nothing on this path
 * ever cleared it, regenerated the MRN, or linked the provisional record to
 * a confirmed real identity. Design precedent: the off-by-default Mongoose/
 * MPI path's SmartIntakeService.reconcileUnknown() (backend/src/services/
 * smart-intake.service.ts) -- no code ported directly (different entity
 * shape), same design intent.
 */
describe('EmergencyPatientService.reconcilePatientIdentity', () => {
  let module: TestingModule;
  let service: EmergencyPatientService;
  let workflowLogService: WorkflowActionLogService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowActionLogService, EmergencyPatientService],
    }).compile();

    service = module.get<EmergencyPatientService>(EmergencyPatientService);
    workflowLogService = module.get<WorkflowActionLogService>(WorkflowActionLogService);
  });

  function createProvisionalPatient(overrides: Record<string, unknown> = {}) {
    return service.createPatient(
      {
        firstName: 'Unknown',
        lastName: 'Patient',
        mrn: 'TEMP-UNK-483920',
        dob: '',
        sex: 'Other',
        chiefComplaint: 'Unknown identity — clinical care priority',
        flags: ['IdentityPending', 'HighRisk'],
        ...overrides,
      },
      'org-a',
    );
  }

  it('rejects a genuinely unknown patientId with a not-found error', () => {
    expect(() =>
      service.reconcilePatientIdentity(
        'does-not-exist',
        { firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01', sex: 'F' },
        { staffId: 'clerk-1', name: 'Pat Clerk' },
        'org-a',
      ),
    ).toThrow(NotFoundException);
  });

  it('rejects a cross-org patient with the same not-found error shape as a missing id (no existence leak)', () => {
    const patient = createProvisionalPatient();

    expect(() =>
      service.reconcilePatientIdentity(
        patient.id,
        { firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01', sex: 'F' },
        { staffId: 'clerk-1', name: 'Pat Clerk' },
        'org-b',
      ),
    ).toThrow(NotFoundException);
  });

  it('rejects a patient with no PatientFlag.IdentityPending set -- this is not a general demographics edit', () => {
    const patient = service.createPatient(
      { firstName: 'Regular', lastName: 'Patient', mrn: 'ED-100200', flags: [] },
      'org-a',
    );

    expect(() =>
      service.reconcilePatientIdentity(
        patient.id,
        { firstName: 'Jane', lastName: 'Doe', dob: '1990-01-01', sex: 'F' },
        { staffId: 'clerk-1', name: 'Pat Clerk' },
        'org-a',
      ),
    ).toThrow(ConflictException);
  });

  it('confirms the identity: applies the new demographics, clears IdentityPending, keeps other flags', () => {
    const patient = createProvisionalPatient();

    const updated = service.reconcilePatientIdentity(
      patient.id,
      { firstName: 'Jane', lastName: 'Doe', dob: '1990-05-14', sex: 'F', mrn: 'ED-777001' },
      { staffId: 'clerk-1', name: 'Pat Clerk' },
      'org-a',
    );

    expect(updated.firstName).toBe('Jane');
    expect(updated.lastName).toBe('Doe');
    expect(updated.dob).toBe('1990-05-14');
    expect(updated.sex).toBe('F');
    expect(updated.mrn).toBe('ED-777001');
    expect(updated.flags).not.toContain('IdentityPending');
    // A pre-existing, unrelated flag must survive -- this only clears the
    // one flag it exists to resolve.
    expect(updated.flags).toContain('HighRisk');
  });

  it('auto-generates a new real MRN when none is supplied (autoGenerateMrn defaults on)', () => {
    const patient = createProvisionalPatient();

    const updated = service.reconcilePatientIdentity(
      patient.id,
      { firstName: 'Jane', lastName: 'Doe', dob: '1990-05-14', sex: 'F' },
      { staffId: 'clerk-1', name: 'Pat Clerk' },
      'org-a',
    );

    expect(updated.mrn).not.toBe('TEMP-UNK-483920');
    expect(updated.mrn).toMatch(/^ED-\d{6}$/);
  });

  it('preserves provenance: the old provisional identity is not silently discarded -- it survives on the chart as a note', () => {
    const patient = createProvisionalPatient();

    const updated = service.reconcilePatientIdentity(
      patient.id,
      { firstName: 'Jane', lastName: 'Doe', dob: '1990-05-14', sex: 'F', mrn: 'ED-777001' },
      { staffId: 'clerk-1', name: 'Pat Clerk' },
      'org-a',
    );

    const provenanceNote = updated.notes.find(
      (note) => note.text.includes('Unknown Patient') && note.text.includes('TEMP-UNK-483920'),
    );
    expect(provenanceNote).toBeDefined();
    expect(provenanceNote!.text).toContain('Jane Doe');
    expect(provenanceNote!.text).toContain('ED-777001');
    expect(provenanceNote!.authorId).toBe('clerk-1');
  });

  it('writes a durable, actor+timestamp audit trail entry via WorkflowActionLogService capturing old -> new identity', () => {
    const patient = createProvisionalPatient();
    const recordSpy = jest.spyOn(workflowLogService, 'record');

    service.reconcilePatientIdentity(
      patient.id,
      { firstName: 'Jane', lastName: 'Doe', dob: '1990-05-14', sex: 'F', mrn: 'ED-777001' },
      { staffId: 'clerk-9', name: 'Casey Clerk' },
      'org-a',
    );

    const call = recordSpy.mock.calls.find(
      ([entry]) => entry.type === 'patient_identity_reconciled',
    );
    expect(call).toBeDefined();
    const [entry] = call as [any];
    expect(entry.actorStaffId).toBe('clerk-9');
    expect(entry.actorName).toBe('Casey Clerk');
    expect(entry.patientId).toBe(patient.id);
    expect(typeof entry.timestamp).toBe('string');
    expect(entry.metadata.previousFirstName).toBe('Unknown');
    expect(entry.metadata.previousLastName).toBe('Patient');
    expect(entry.metadata.previousMrn).toBe('TEMP-UNK-483920');
    expect(entry.metadata.confirmedFirstName).toBe('Jane');
    expect(entry.metadata.confirmedLastName).toBe('Doe');
    expect(entry.metadata.confirmedMrn).toBe('ED-777001');
    expect(entry.metadata.autoGeneratedMrn).toBe(false);

    const logs = workflowLogService.listLogs(patient.id);
    expect(logs.some((log) => log.type === 'patient_identity_reconciled')).toBe(true);
  });

  it('never infers or auto-fills the confirmed identity -- every field comes only from the explicit caller input', () => {
    const patient = createProvisionalPatient({ firstName: 'Unknown', lastName: 'Patient' });

    const updated = service.reconcilePatientIdentity(
      patient.id,
      { firstName: 'Explicit', lastName: 'Caller', dob: '2000-01-01', sex: 'M', mrn: 'ED-555555' },
      { staffId: 'clerk-1' },
      'org-a',
    );

    // The result is exactly and only what was explicitly supplied -- no
    // fuzzy-match, no reuse of any other patient's data, no silent default
    // beyond what the caller passed.
    expect(updated.firstName).toBe('Explicit');
    expect(updated.lastName).toBe('Caller');
    expect(updated.dob).toBe('2000-01-01');
    expect(updated.sex).toBe('M');
    expect(updated.mrn).toBe('ED-555555');
  });
});
