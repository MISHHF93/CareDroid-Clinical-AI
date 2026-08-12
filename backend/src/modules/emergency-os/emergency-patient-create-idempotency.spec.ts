import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService.createPatient — idempotency on retried id (patient onboarding consolidation)', () => {
  // createPatient() used to push() unconditionally regardless of whether `input.id`
  // already existed in this.patients. Real frontend callers (receptionIntakeOrchestrator.ts,
  // QuickIntake.tsx, emergencyStore.ts's fire-and-forget backend sync) always send the
  // client-generated id they already created locally -- so a network-level retry of the
  // exact same create request (timeout + retry, or a duplicate dispatch of the store
  // action) reached this method twice with the same id and produced two identical-id
  // entries on the in-memory board (which the whiteboard/queues read from), even though
  // the DB-side upsert kept only one row -- masking the duplication until the next restart.

  it('returns the existing record instead of creating a duplicate when the same id is submitted twice', () => {
    const { service, workflowLogService } = makeService();
    const first = service.createPatient({
      id: 'patient-retry-test',
      firstName: 'Priya',
      lastName: 'Nandakumar',
    } as any);

    const second = service.createPatient({
      id: 'patient-retry-test',
      firstName: 'Priya',
      lastName: 'Nandakumar',
    } as any);

    expect(second).toEqual(first);
    expect(service.listPatients().filter((p) => p.id === 'patient-retry-test')).toHaveLength(1);
    // Only the first call should have logged a creation event -- the retry is a no-op.
    expect(
      workflowLogService.record.mock.calls.filter(([entry]) => entry.type === 'patient_created'),
    ).toHaveLength(1);
  });

  it('still creates a genuinely new patient when no id or a fresh id is supplied', () => {
    const { service } = makeService();
    const before = service.listPatients().length;
    const first = service.createPatient({ firstName: 'A', lastName: 'One' } as any);
    const second = service.createPatient({ firstName: 'B', lastName: 'Two' } as any);

    expect(first.id).not.toBe(second.id);
    expect(service.listPatients()).toHaveLength(before + 2);
  });

  it('does not let a retry overwrite the existing record with different data from a second, differing call', () => {
    const { service } = makeService();
    const first = service.createPatient({ id: 'patient-fixed-id', firstName: 'Original' } as any);
    const second = service.createPatient({ id: 'patient-fixed-id', firstName: 'Different' } as any);

    expect(second.firstName).toBe('Original');
    expect(service.getPatient('patient-fixed-id')?.firstName).toBe('Original');
  });
});
