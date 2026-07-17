import { AiActionProposalService } from './ai-action-proposal.service';
import { AIActionProposalRecord } from './entities/ai-action-proposal-record.entity';

/**
 * IX16 — durable write-through journal for server-side proposals.
 * Proves: every mutation persists; a fresh service instance (process restart)
 * hydrates the same proposals with their exact state; journal failures never
 * break the synchronous workflow; no journal = explicit in-memory mode.
 */

function createJournalMock() {
  const rows = new Map<string, AIActionProposalRecord>();
  return {
    rows,
    save: jest.fn(async (row: AIActionProposalRecord) => {
      rows.set(row.proposalId, { ...row });
      return { ...row };
    }),
    find: jest.fn(async () => [...rows.values()].map((row) => ({ ...row }))),
  };
}

const createInput = {
  organizationId: 'org-1',
  originatingRequestId: 'req-1',
  correlationId: 'corr-1',
  toolName: 'prepare_triage_handoff_draft',
  expectedEffect: 'Draft handoff',
  previewSummary: 'Draft only',
  riskLevel: 'moderate' as const,
  dataWillChange: ['draft'],
};

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('AiActionProposalService — durable journal (IX16)', () => {
  it('write-throughs create and every transition to the journal', async () => {
    const journal = createJournalMock();
    const service = new AiActionProposalService(journal as any);

    const created = service.create(createInput);
    service.approve(created.proposalId, 'charge-nurse-7');
    await flushAsync();

    expect(journal.save).toHaveBeenCalled();
    const row = journal.rows.get(created.proposalId);
    expect(row).toBeTruthy();
    expect(row?.state).toBe('approved');
    expect(row?.organizationId).toBe('org-1');
    const payload = JSON.parse(String(row?.payload));
    expect(payload.toolName).toBe('prepare_triage_handoff_draft');
    expect(payload.ownerUserId).toBe('charge-nurse-7');
  });

  it('a fresh service instance hydrates prior proposals — restart survival', async () => {
    const journal = createJournalMock();
    const first = new AiActionProposalService(journal as any);
    const created = first.create(createInput);
    first.approve(created.proposalId, 'charge-nurse-7');
    await flushAsync();

    // Simulated restart: new instance, same journal.
    const second = new AiActionProposalService(journal as any);
    await second.onModuleInit();

    const rehydrated = second.get(created.proposalId);
    expect(rehydrated.state).toBe('approved');
    expect(rehydrated.expectedEffect).toBe('Draft handoff');
    expect(second.list({ organizationId: 'org-1' })).toHaveLength(1);
  });

  it('journal failures never break the synchronous workflow', async () => {
    const journal = createJournalMock();
    journal.save.mockRejectedValue(new Error('db down'));
    const service = new AiActionProposalService(journal as any);

    const created = service.create(createInput);
    const approved = service.approve(created.proposalId);
    await flushAsync();

    expect(created.state).toBe('proposed');
    expect(approved.state).toBe('approved');
    expect(service.get(created.proposalId).state).toBe('approved');
  });

  it('corrupt journal rows are skipped at hydration, not fatal', async () => {
    const journal = createJournalMock();
    journal.rows.set('bad-row', {
      proposalId: 'bad-row',
      organizationId: null,
      state: 'proposed',
      updatedAt: new Date().toISOString(),
      payload: '{not valid json',
    } as AIActionProposalRecord);

    const service = new AiActionProposalService(journal as any);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.list()).toHaveLength(0);
  });

  it('without a journal the service stays explicitly in-memory (test/dev mode)', () => {
    const service = new AiActionProposalService();
    const created = service.create(createInput);
    expect(service.get(created.proposalId).state).toBe('proposed');
  });
});
