import { describe, expect, it, vi, beforeEach } from 'vitest';

const recordAutomationFailureMock = vi.fn();
const reportApiErrorMock = vi.fn();

vi.mock('./automationAuditLogger', () => ({
  recordAutomationFailure: (...args: unknown[]) => recordAutomationFailureMock(...args),
}));
vi.mock('./apiErrorHandling', () => ({
  reportApiError: (...args: unknown[]) => reportApiErrorMock(...args),
}));

import { reportEmsHandoffSyncFailure } from './emsHandoffSyncFailure';

describe('reportEmsHandoffSyncFailure', () => {
  beforeEach(() => {
    recordAutomationFailureMock.mockClear();
    reportApiErrorMock.mockClear();
  });

  it('records the miss to the automation audit trail with the real endpoint and error', () => {
    const error = new Error('network down');
    reportEmsHandoffSyncFailure({
      arrivalId: 'ems-1',
      patientId: 'p-1',
      unitName: 'Medic 7',
      error,
    });

    expect(recordAutomationFailureMock).toHaveBeenCalledTimes(1);
    const call = recordAutomationFailureMock.mock.calls[0][0];
    expect(call.backendEndpoint).toBe('/api/emergency/ems/handoff');
    expect(call.toolCalled).toBe('ems-handoff-persist');
    expect(call.error).toBe(error);
    expect(call.aiInvolvement).toEqual({
      involved: false,
      summary: 'Rules-only handoff persistence.',
    });
    expect(call.conditionsEvaluated[0].label).toContain('ems-1');
    expect(call.conditionsEvaluated[0].label).toContain('p-1');
    expect(call.conditionsEvaluated[0].result).toBe(false);
  });

  it('notes when no patient is linked yet, without throwing', () => {
    reportEmsHandoffSyncFailure({ arrivalId: 'ems-2', error: new Error('timeout') });

    const call = recordAutomationFailureMock.mock.calls[0][0];
    expect(call.conditionsEvaluated[0].label).toContain('no linked patient yet');
  });

  it('surfaces a non-blocking system alert naming the unit, with the real error attached', () => {
    const error = new Error('500');
    reportEmsHandoffSyncFailure({ arrivalId: 'ems-3', unitName: 'Medic 12', error });

    expect(reportApiErrorMock).toHaveBeenCalledTimes(1);
    const call = reportApiErrorMock.mock.calls[0][0];
    expect(call.title).toBe('EMS handoff not journaled');
    expect(call.message).toContain('Medic 12');
    expect(call.severity).toBe('Warning');
    expect(call.endpoint).toBe('/api/emergency/ems/handoff');
    expect(call.error).toBe(error);
  });

  it('falls back to the arrival id in the alert message when no unit name is known', () => {
    reportEmsHandoffSyncFailure({ arrivalId: 'ems-4', error: new Error('boom') });

    const call = reportApiErrorMock.mock.calls[0][0];
    expect(call.message).toContain('ems-4');
  });
});
