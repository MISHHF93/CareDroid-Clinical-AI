import { WorkflowActionLogService, EmergencyPatientService } from './emergency-os.services';
import type { CigProjectionFacade } from '../cig/cig-projection.facade';

describe('EmergencyPatientService CIG Mode B hooks (PR-5b)', () => {
  function buildService(cig?: Partial<CigProjectionFacade>) {
    const workflow = new WorkflowActionLogService();
    const afterBoardMutation = jest.fn().mockResolvedValue({
      ok: true,
      mode: 'B',
      tenantId: 'emergency-os-default',
      snapshotVersion: 1,
      nodeCount: 1,
      edgeCount: 0,
      durability: 'session',
      degraded: true,
      closedEdgeCount: 0,
      upsertedNodeCount: 1,
      upsertedEdgeCount: 0,
    });
    const facade = {
      afterBoardMutation,
      ...cig,
    } as unknown as CigProjectionFacade;

    const service = new EmergencyPatientService(
      workflow,
      undefined,
      undefined,
      undefined,
      undefined,
      facade,
    );
    return { service, afterBoardMutation };
  }

  it('projects after createPatient', async () => {
    const { service, afterBoardMutation } = buildService();
    const created = service.createPatient({
      firstName: 'Pat',
      lastName: 'One',
      state: 'Waiting',
      priority: 'P3',
      chiefComplaint: 'Test',
    });
    expect(created.id).toBeTruthy();
    await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    expect(afterBoardMutation).toHaveBeenCalled();
    const arg = afterBoardMutation.mock.calls[0][0];
    expect(arg.mode).toBe('B');
    expect(arg.sourceEventName).toBe('patient.created');
    expect(arg.producer).toBe('EmergencyPatientService');
    expect(arg.board.patients.some((p: { id: string }) => p.id === created.id)).toBe(true);
  });

  it('projects after movePatientToState and assignStaffToPatient', async () => {
    const { service, afterBoardMutation } = buildService();
    const created = service.createPatient({
      firstName: 'Pat',
      lastName: 'Two',
      state: 'Waiting',
      priority: 'P2',
    });
    afterBoardMutation.mockClear();

    service.movePatientToState(created.id, 'Assessment', { staffId: 's1' });
    await new Promise((r) => setImmediate(r));
    expect(afterBoardMutation).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEventName: 'patient.state.changed', mode: 'B' }),
    );

    afterBoardMutation.mockClear();
    service.assignStaffToPatient(created.id, 's2');
    await new Promise((r) => setImmediate(r));
    expect(afterBoardMutation).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEventName: 'patient.assigned', mode: 'B' }),
    );
  });

  it('projects after updatePatient', async () => {
    const { service, afterBoardMutation } = buildService();
    const created = service.createPatient({
      firstName: 'Pat',
      lastName: 'Three',
      state: 'Triage',
    });
    afterBoardMutation.mockClear();
    service.updatePatient(created.id, { roomId: 'r3' });
    await new Promise((r) => setImmediate(r));
    expect(afterBoardMutation).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEventName: 'patient.updated', mode: 'B' }),
    );
  });

  it('does not throw when CIG facade is absent', () => {
    const workflow = new WorkflowActionLogService();
    const service = new EmergencyPatientService(workflow);
    expect(() =>
      service.createPatient({ firstName: 'No', lastName: 'Cig', state: 'Arrival' }),
    ).not.toThrow();
  });

  it('does not throw when CIG facade rejects', async () => {
    const rejectFn = jest.fn().mockRejectedValue(new Error('db down'));
    const workflow = new WorkflowActionLogService();
    const service = new EmergencyPatientService(
      workflow,
      undefined,
      undefined,
      undefined,
      undefined,
      { afterBoardMutation: rejectFn } as unknown as CigProjectionFacade,
    );
    expect(() =>
      service.createPatient({ firstName: 'Fail', lastName: 'Soft', state: 'Waiting' }),
    ).not.toThrow();
    await new Promise((r) => setImmediate(r));
    expect(rejectFn).toHaveBeenCalled();
  });
});

