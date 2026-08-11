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

  it('MB-P0-6 addVitals: appends a new reading and applies the resulting flag set, matching what PatchEmergencyPatientDto now forwards through the controller', () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'Vitals',
      lastName: 'Test',
      priority: 'P3',
      vitals: [{ hr: 80, sbp: 118, dbp: 76, spo2: 98, recordedAt: 'x', recordedBy: 'nurse-1' }],
    });
    expect(created.vitals).toHaveLength(1);

    // Matches emergencyStore.ts's addVitals action: it sends the FULL
    // resulting vitals array (existing history + the new appended reading,
    // already computed by the frontend's own pipeline) and the FULL
    // resulting flags array (after the pipeline's own clear/re-add logic) --
    // not a delta. updatePatient's normalizePatientVitals REPLACES the
    // array wholesale, so sending only the new reading would silently
    // destroy prior history; this is why the frontend always sends the
    // complete array.
    const updated = service.updatePatient(created.id, {
      vitals: [
        ...created.vitals,
        { hr: 130, sbp: 82, dbp: 50, spo2: 89, recordedAt: 'y', recordedBy: 'nurse-2' },
      ],
      flags: ['HighRisk', 'ReassessmentDue'],
    });

    expect(updated.vitals).toHaveLength(2);
    expect(updated.vitals[1]).toMatchObject({ hr: 130, spo2: 89, recordedBy: 'nurse-2' });
    expect(updated.flags).toEqual(['HighRisk', 'ReassessmentDue']);
  });
});
