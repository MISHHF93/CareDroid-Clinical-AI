import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service, workflowLogService };
}

describe('EmergencyPatientService.updatePatient — flags/vitals normalization', () => {
  it('normalizes object-shaped flags patched through PATCH /api/patients/:patientId the same way createPatient does', () => {
    const { service } = makeService();
    const created = service.createPatient({ firstName: 'Amy', lastName: 'Rivera', priority: 'P3' });

    const updated = service.updatePatient(created.id, {
      // Matches SmartIntake.tsx's vertical-slice createFlag() output shape.
      flags: [
        {
          type: 'ReassessmentDue',
          reason: 'NEWS2 escalation',
          severity: 'Critical',
          detectedAt: 'x',
        },
      ] as any,
    });

    expect(updated.flags).toEqual(['ReassessmentDue']);
  });

  it('leaves a plain string[] flags patch unchanged (the real, common ReceptionWorkspaceService.escalate case)', () => {
    const { service } = makeService();
    const created = service.createPatient({ firstName: 'Sam', lastName: 'Lee', priority: 'P2' });
    expect(created.flags).toEqual(['HighRisk']);

    const updated = service.updatePatient(created.id, {
      flags: [...created.flags, 'Escalated'],
    });

    expect(updated.flags).toEqual(['HighRisk', 'Escalated']);
  });

  it('maps bpSystolic/bpDiastolic to sbp/dbp when vitals are patched directly, not just at creation', () => {
    const { service } = makeService();
    const created = service.createPatient({ firstName: 'Jordan', lastName: 'Okafor' });

    const updated = service.updatePatient(created.id, {
      vitals: [
        {
          hr: 132,
          bpSystolic: 88,
          bpDiastolic: 54,
          spo2: 94,
          recordedAt: '2026-07-27T00:00:00.000Z',
        },
      ] as any,
    });

    expect(updated.vitals[0].sbp).toBe(88);
    expect(updated.vitals[0].dbp).toBe(54);
    expect(updated.vitals[0].hr).toBe(132);
  });

  it("defaults a patched vitals entry's recordedBy to the patient's own assignedStaffId when the patch omits it", () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'No',
      lastName: 'Override',
      assignedStaffId: 'staff-9',
    });

    const updated = service.updatePatient(created.id, {
      vitals: [{ hr: 80, sbp: 110, dbp: 70, recordedAt: 'x' }] as any,
    });

    expect(updated.vitals[0].recordedBy).toBe('staff-9');
  });

  it('leaves flags/vitals completely untouched when a patch omits them entirely (the common roomId/demographics-only patch case)', () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'Demo',
      lastName: 'Graphics',
      priority: 'P1',
      vitals: [{ hr: 90, sbp: 120, dbp: 80, recordedAt: 'x', recordedBy: 'nurse-1' }],
    });

    const updated = service.updatePatient(created.id, { roomId: 'r3' });

    expect(updated.roomId).toBe('r3');
    expect(updated.flags).toEqual(created.flags);
    expect(updated.vitals).toEqual(created.vitals);
  });

  it('treats an explicitly-empty flags patch as clearing flags, not as "no patch given"', () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'Clear',
      lastName: 'Flags',
      priority: 'P1',
    });
    expect(created.flags).toEqual(['HighRisk']);

    const updated = service.updatePatient(created.id, { flags: [] });

    expect(updated.flags).toEqual([]);
  });
});
