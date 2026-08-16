import { Logger } from '@nestjs/common';
import { WorkflowActionLogService } from './emergency-os.services';
import { WorkflowActionLogEntry } from './entities/workflow-action-log-entry.entity';

/**
 * Cycle 92 — durability for WorkflowActionLogService, the shared log behind
 * ~18 call sites including EMS handoff completion. Proves: record() writes
 * through to the journal without breaking its synchronous contract; a fresh
 * instance rehydrates prior entries on restart (matching IX16's own
 * restart-survival pattern); journal failures never surface to callers; a
 * corrupt row is skipped, not fatal; no journal = explicit in-memory mode.
 */

function createJournalMock() {
  const rows: WorkflowActionLogEntry[] = [];
  return {
    rows,
    save: jest.fn(async (row: WorkflowActionLogEntry) => {
      const existingIndex = rows.findIndex((r) => r.id === row.id);
      if (existingIndex >= 0) rows[existingIndex] = { ...row };
      else rows.push({ ...row });
      return { ...row };
    }),
    find: jest.fn(async (options?: { order?: unknown; take?: number }) => {
      const copy = [...rows]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((row) => ({ ...row }));
      return options?.take ? copy.slice(0, options.take) : copy;
    }),
  };
}

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('WorkflowActionLogService — durability', () => {
  it('record() writes through to the journal with the right shape', async () => {
    const journal = createJournalMock();
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);

    const log = service.record({
      type: 'patient_escalated',
      summary: 'Patient escalated for immediate review',
      patientId: 'patient-1',
      actorStaffId: 'staff-1',
      metadata: { tenantId: 'org-1' },
    });
    await flushAsync();

    expect(journal.save).toHaveBeenCalledTimes(1);
    expect(journal.rows).toHaveLength(1);
    expect(journal.rows[0]).toMatchObject({
      id: log.id,
      tenantId: 'org-1',
      patientId: 'patient-1',
      type: 'patient_escalated',
      timestamp: log.timestamp,
    });
    expect(JSON.parse(journal.rows[0].payload)).toMatchObject({
      id: log.id,
      type: 'patient_escalated',
      patientId: 'patient-1',
    });
  });

  it('a fresh instance rehydrates prior logs from the journal on restart', async () => {
    const journal = createJournalMock();
    const first = new WorkflowActionLogService(undefined, undefined, journal as any);

    first.record({ type: 'boarding_started', summary: 'Boarding started', patientId: 'p-1' });
    first.record({ type: 'referral_created', summary: 'Referral created', patientId: 'p-2' });
    await flushAsync();

    const second = new WorkflowActionLogService(undefined, undefined, journal as any);
    await second.onModuleInit();

    const rehydrated = second.listLogs();
    expect(rehydrated).toHaveLength(2);
    expect(rehydrated.map((l) => l.type).sort()).toEqual(['boarding_started', 'referral_created']);
  });

  it('rehydration requests only the newest WORKFLOW_LOG_BUFFER_LIMIT rows, matching the in-memory eviction policy', async () => {
    const journal = createJournalMock();
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);
    await service.onModuleInit();

    expect(journal.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { timestamp: 'DESC' }, take: 500 }),
    );
  });

  it('a journal write failure never breaks the synchronous record() contract', async () => {
    const journal = createJournalMock();
    journal.save.mockRejectedValue(new Error('db down'));
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);

    const log = service.record({
      type: 'clinician_assigned',
      summary: 'Assigned',
      patientId: 'p-1',
    });
    await flushAsync();

    expect(log.type).toBe('clinician_assigned');
    expect(service.listLogs()).toHaveLength(1);
  });

  it('HEAL-252: a journal write failure is actually logged, not silently discarded', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const journal = createJournalMock();
    journal.save.mockRejectedValue(new Error('db down'));
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);

    service.record({ type: 'clinician_assigned', summary: 'Assigned', patientId: 'p-1' });
    await flushAsync();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to persist workflow action log'),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it('a journal unavailable at rehydration time does not crash startup', async () => {
    const journal = createJournalMock();
    journal.find.mockRejectedValue(new Error('migrations not run yet'));
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.listLogs()).toEqual([]);
  });

  it('a corrupt stored payload is skipped at rehydration, not fatal', async () => {
    const journal = createJournalMock();
    journal.rows.push({
      id: 'workflow-corrupt-1',
      tenantId: 'org-1',
      patientId: null,
      type: 'patient_note_added',
      timestamp: new Date().toISOString(),
      payload: '{not valid json',
    });
    const service = new WorkflowActionLogService(undefined, undefined, journal as any);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.listLogs()).toEqual([]);
  });

  it('without a journal repository the log still works in-memory only (test/dev mode)', () => {
    const service = new WorkflowActionLogService();
    const log = service.record({
      type: 'staff_assigned',
      summary: 'Staff assigned',
      patientId: 'p-1',
    });

    expect(log.type).toBe('staff_assigned');
    expect(service.listLogs()).toHaveLength(1);
  });
});
