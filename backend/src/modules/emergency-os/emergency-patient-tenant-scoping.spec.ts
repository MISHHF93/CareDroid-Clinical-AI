import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService — organization tenant scoping (Emergency-OS Tenant Scoping Gap)', () => {
  // Every id-keyed read/mutation used to operate with zero organization
  // scoping -- any caller could read or PATCH any hospital's patient by id.
  // Patients with no `organizationId` (every pre-migration row, since no
  // reliable backfill signal exists) are treated as legacy/unscoped and stay
  // visible to every org until reconciled; a patient with a REAL org never
  // becomes visible to, or mutable by, a different real org.

  it('createPatient stamps the caller-resolved organizationId, overriding anything on the input body', () => {
    const { service } = makeService();
    const patient = service.createPatient(
      { firstName: 'Org', lastName: 'A', organizationId: 'org-spoofed' } as any,
      'org-a',
    );
    expect(patient.organizationId).toBe('org-a');
  });

  it('listPatients(organizationId) includes own-org and legacy/unscoped rows, excludes a different org', () => {
    const { service } = makeService();
    const before = service.listPatients().length;
    service.createPatient({ firstName: 'Own', lastName: 'Org' } as any, 'org-a');
    service.createPatient({ firstName: 'Other', lastName: 'Org' } as any, 'org-b');

    const scoped = service.listPatients('org-a');
    expect(scoped.some((p) => p.firstName === 'Own')).toBe(true);
    expect(scoped.some((p) => p.firstName === 'Other')).toBe(false);
    // Fixture-seeded demo patients carry no organizationId -- legacy/unscoped,
    // so they remain visible under any org's filter.
    expect(scoped.length).toBeGreaterThanOrEqual(before);
  });

  it('listPatients() with no organizationId argument is unfiltered (preserves existing internal-caller behavior)', () => {
    const { service } = makeService();
    service.createPatient({ firstName: 'Org', lastName: 'A' } as any, 'org-a');
    service.createPatient({ firstName: 'Org', lastName: 'B' } as any, 'org-b');

    const unscoped = service.listPatients();
    expect(unscoped.some((p) => p.firstName === 'Org' && p.lastName === 'A')).toBe(true);
    expect(unscoped.some((p) => p.firstName === 'Org' && p.lastName === 'B')).toBe(true);
  });

  it('getPatient hides a different org\'s patient and returns undefined, same as a genuinely missing id', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(service.getPatient(patient.id, 'org-b')).toBeUndefined();
    expect(service.getPatient(patient.id, 'org-a')).toBeDefined();
    expect(service.getPatient(patient.id)).toBeDefined();
  });

  it('updatePatient rejects a cross-org id with the same not-found error shape as a missing id (no existence leak)', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.updatePatient(patient.id, { priority: 'P1' }, 'org-b')).toThrow(
      /not found/i,
    );
    expect(() => service.updatePatient('genuinely-missing-id', { priority: 'P1' }, 'org-b')).toThrow(
      /not found/i,
    );
    expect(service.updatePatient(patient.id, { priority: 'P1' }, 'org-a').priority).toBe('P1');
  });

  it('assignStaffToPatient rejects a cross-org id and succeeds for the owning org', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() =>
      service.assignStaffToPatient(patient.id, 'staff-1', 'actor', 'org-b'),
    ).toThrow(/not found/i);
    expect(
      service.assignStaffToPatient(patient.id, 'staff-1', 'actor', 'org-a').assignedStaffId,
    ).toBe('staff-1');
  });

  it('escalatePatient rejects a cross-org id, and the resulting alert inherits the patient\'s own organizationId', () => {
    const { service } = makeService();
    const patient = service.createPatient({ firstName: 'Cross', lastName: 'Org' } as any, 'org-a');

    expect(() => service.escalatePatient(patient.id, 'actor', 'org-b')).toThrow(/not found/i);

    service.escalatePatient(patient.id, 'actor', 'org-a');
    const alert = service
      .listAlerts()
      .find((candidate) => candidate.patientId === patient.id);
    expect(alert?.organizationId).toBe('org-a');
  });

  it('createPatient refuses to shadow-create a second row when a client-supplied id collides with a different org\'s patient', () => {
    const { service } = makeService();
    const existing = service.createPatient(
      { id: 'shared-id', firstName: 'Original' } as any,
      'org-a',
    );

    expect(() =>
      service.createPatient({ id: 'shared-id', firstName: 'Impersonator' } as any, 'org-b'),
    ).toThrow(/already in use/i);
    expect(service.getPatient(existing.id, 'org-a')?.firstName).toBe('Original');
  });
});
