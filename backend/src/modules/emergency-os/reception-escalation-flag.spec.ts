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
    dispatchOperationalAlert: jest.fn(() => ({ id: 'alert-1', createdAt: new Date().toISOString() })),
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
      expect.stringContaining('Failed to set Escalated flag'),
      expect.anything(),
    );
    warnSpy.mockRestore();
  });
});
