import { Logger } from '@nestjs/common';
import { ReceptionWorkspaceService } from './emergency-os.services';

// HEAL-255: raiseEscalation's "Escalated" patient-flag update was wrapped
// in a try/catch that discarded the failure completely silently. The
// alert/workflow-log/realtime broadcast already fired by this point, so
// the escalation itself isn't lost -- but the patient board would
// silently fail to show the "Escalated" visual indicator with zero trace
// of why, unlike escalatePatient's own durable-sync failure handling
// (HEAL-250) in this same file.

function buildPatientServiceMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getPatient: jest.fn(() => ({
      id: 'patient-1',
      firstName: 'Test',
      lastName: 'Patient',
      flags: [],
    })),
    updatePatient: jest.fn(() => {
      throw new Error('patient evicted from board mid-request');
    }),
    dispatchOperationalAlert: jest.fn(() => ({
      id: 'alert-1',
      createdAt: new Date().toISOString(),
    })),
    ...overrides,
  };
}

describe('ReceptionWorkspaceService.raiseEscalation Escalated-flag failure (HEAL-255)', () => {
  it('logs a warning when setting the Escalated flag fails, instead of discarding it silently', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const patientService = buildPatientServiceMock();
    const workflowLogService = { record: jest.fn() };
    const service = new ReceptionWorkspaceService(
      patientService as any,
      {} as any,
      {} as any,
      workflowLogService as any,
    );

    expect(() =>
      service.raiseEscalation({ patientId: 'patient-1', actorName: 'Nurse Test' }),
    ).not.toThrow();

    expect(patientService.dispatchOperationalAlert).toHaveBeenCalled();
    expect(workflowLogService.record).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to set escalation flags'),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });
});

// Regression coverage for the 2026-08-27 fix: raiseEscalation wrote a
// literal 'Escalated' string into patient.flags -- not a member of the
// frontend PatientFlag enum (src/types/emergency.ts), so the durable
// backend-truth patient record never actually showed an escalation
// indicator on reload, even though the alert/workflow-log both fired
// correctly. Now writes the same canonical flag set the frontend's own
// applyClinicalEscalationFlags (receptionEscalationWorkflow.ts) uses,
// gated the same way: only clinical reasons flag the patient at all.
describe('ReceptionWorkspaceService.raiseEscalation patient flags (2026-08-27)', () => {
  it('writes real, frontend-recognized PatientFlag values for a clinical reason, not the bogus "Escalated" string', () => {
    const patientService = buildPatientServiceMock({
      updatePatient: jest.fn((patientId, patch) => ({ id: patientId, ...patch })),
    });
    const workflowLogService = { record: jest.fn() };
    const service = new ReceptionWorkspaceService(
      patientService as any,
      {} as any,
      {} as any,
      workflowLogService as any,
    );

    service.raiseEscalation({
      patientId: 'patient-1',
      actorName: 'Nurse Test',
      reasonId: 'worsening-symptoms',
    });

    expect(patientService.updatePatient).toHaveBeenCalledWith(
      'patient-1',
      expect.objectContaining({ flags: expect.arrayContaining(['HighRisk', 'ReassessmentDue']) }),
      undefined,
    );
    const [, patch] = (patientService.updatePatient as jest.Mock).mock.calls[0];
    expect(patch.flags).not.toContain('Escalated');
  });

  it("adds DeteriorationRisk too for collapse-distress, matching the frontend's own extra flag for that specific reason", () => {
    const patientService = buildPatientServiceMock({
      updatePatient: jest.fn((patientId, patch) => ({ id: patientId, ...patch })),
    });
    const service = new ReceptionWorkspaceService(
      patientService as any,
      {} as any,
      {} as any,
      { record: jest.fn() } as any,
    );

    service.raiseEscalation({
      patientId: 'patient-1',
      actorName: 'Nurse Test',
      reasonId: 'collapse-distress',
    });

    const [, patch] = (patientService.updatePatient as jest.Mock).mock.calls[0];
    expect(patch.flags).toEqual(
      expect.arrayContaining(['HighRisk', 'DeteriorationRisk', 'ReassessmentDue']),
    );
  });

  it("does NOT flag the patient at all for an administrative reason, matching the frontend's CLINICAL_REASONS gate", () => {
    const patientService = buildPatientServiceMock({
      updatePatient: jest.fn((patientId, patch) => ({ id: patientId, ...patch })),
    });
    const service = new ReceptionWorkspaceService(
      patientService as any,
      {} as any,
      {} as any,
      { record: jest.fn() } as any,
    );

    service.raiseEscalation({
      patientId: 'patient-1',
      actorName: 'Nurse Test',
      reasonId: 'duplicate-registration',
    });

    expect(patientService.updatePatient).not.toHaveBeenCalled();
  });

  it('does not re-add flags the patient already has', () => {
    const patientService = buildPatientServiceMock({
      getPatient: jest.fn(() => ({
        id: 'patient-1',
        firstName: 'Test',
        lastName: 'Patient',
        flags: ['HighRisk', 'ReassessmentDue'],
      })),
      updatePatient: jest.fn((patientId, patch) => ({ id: patientId, ...patch })),
    });
    const service = new ReceptionWorkspaceService(
      patientService as any,
      {} as any,
      {} as any,
      { record: jest.fn() } as any,
    );

    service.raiseEscalation({
      patientId: 'patient-1',
      actorName: 'Nurse Test',
      reasonId: 'worsening-symptoms',
    });

    expect(patientService.updatePatient).not.toHaveBeenCalled();
  });
});
