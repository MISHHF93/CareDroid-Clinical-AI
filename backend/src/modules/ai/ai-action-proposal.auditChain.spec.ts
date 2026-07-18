import { AiActionProposalService } from './ai-action-proposal.service';
import { AIActionProposalRecord } from './entities/ai-action-proposal-record.entity';
import { AIActionProposalAuditEntry } from './entities/ai-action-proposal-audit-entry.entity';

/**
 * Backend reliability roadmap item — hash-chain audit per proposal transition.
 * Proves: every create/transition/auto-expiry appends a correctly-chained
 * entry; verifyAuditChain accepts an untampered chain and detects a broken
 * one; chains are per-proposal and survive a process restart; a missing or
 * failing audit-log repository never breaks the synchronous workflow.
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

function createAuditLogMock() {
  const rows: AIActionProposalAuditEntry[] = [];
  return {
    rows,
    save: jest.fn(async (row: AIActionProposalAuditEntry) => {
      rows.push({ ...row });
      return { ...row };
    }),
    find: jest.fn(async (options?: { order?: Record<string, 'ASC' | 'DESC'> }) => {
      const copy = rows.map((row) => ({ ...row }));
      if (options?.order) {
        copy.sort((a, b) => {
          if (a.proposalId !== b.proposalId) return a.proposalId < b.proposalId ? -1 : 1;
          return a.sequenceIndex - b.sequenceIndex;
        });
      }
      return copy;
    }),
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

describe('AiActionProposalService — hash-chain audit', () => {
  it('creation appends a genesis entry, and each transition extends the chain correctly', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const service = new AiActionProposalService(journal as any, auditLog as any);

    const created = service.create(createInput);
    service.approve(created.proposalId, 'charge-nurse-7');
    service.transition(created.proposalId, 'executing');
    service.transition(created.proposalId, 'completed', { executionResult: { ok: true } });
    await flushAsync();

    const trail = service.getAuditTrail(created.proposalId);
    expect(trail).toHaveLength(4);

    expect(trail[0]).toMatchObject({
      sequenceIndex: 0,
      fromState: null,
      toState: 'proposed',
      previousHash: null,
    });
    expect(trail[1]).toMatchObject({
      sequenceIndex: 1,
      fromState: 'proposed',
      toState: 'approved',
      actorUserId: 'charge-nurse-7',
    });
    expect(trail[2]).toMatchObject({
      sequenceIndex: 2,
      fromState: 'approved',
      toState: 'executing',
    });
    expect(trail[3]).toMatchObject({
      sequenceIndex: 3,
      fromState: 'executing',
      toState: 'completed',
    });

    // Each entry's previousHash must equal the prior entry's own entryHash.
    for (let i = 1; i < trail.length; i++) {
      expect(trail[i].previousHash).toBe(trail[i - 1].entryHash);
    }
    // Every entry hash must be a real 64-char sha256 hex digest, and unique.
    const hashes = new Set(trail.map((e) => e.entryHash));
    expect(hashes.size).toBe(trail.length);
    for (const entry of trail) {
      expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('rejection records the reason in the chain, and the chain still verifies', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const service = new AiActionProposalService(journal as any, auditLog as any);

    const created = service.create(createInput);
    service.reject(created.proposalId, 'Not clinically indicated');
    await flushAsync();

    const trail = service.getAuditTrail(created.proposalId);
    expect(trail[1]).toMatchObject({
      toState: 'rejected',
      metadata: { rejectionReason: 'Not clinically indicated' },
    });

    const verification = service.verifyAuditChain(created.proposalId);
    expect(verification).toEqual({ valid: true, entryCount: 2 });
  });

  it('detects a tampered entry after a simulated restart, at the correct sequence index', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const first = new AiActionProposalService(journal as any, auditLog as any);

    const created = first.create(createInput);
    first.approve(created.proposalId, 'charge-nurse-7');
    first.transition(created.proposalId, 'executing');
    await flushAsync();

    // Simulate tampering directly on the durable rows, as an attacker with
    // DB write access (but not the ability to recompute every downstream
    // hash) might: silently change who approved it.
    const tamperedIndex = auditLog.rows.findIndex(
      (row) => row.proposalId === created.proposalId && row.sequenceIndex === 1,
    );
    auditLog.rows[tamperedIndex] = { ...auditLog.rows[tamperedIndex], actorUserId: 'someone-else' };

    // Restart: fresh service instance, hydrated from the (now-tampered) durable log.
    const second = new AiActionProposalService(journal as any, auditLog as any);
    await second.onModuleInit();

    const verification = second.verifyAuditChain(created.proposalId);
    expect(verification.valid).toBe(false);
    expect(verification.brokenAtSequenceIndex).toBe(1);
    expect(verification.entryCount).toBe(3);
  });

  it('a fresh instance rehydrates the exact same chain after a real restart — no tampering', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const first = new AiActionProposalService(journal as any, auditLog as any);

    const created = first.create(createInput);
    first.approve(created.proposalId, 'charge-nurse-7');
    await flushAsync();

    const second = new AiActionProposalService(journal as any, auditLog as any);
    await second.onModuleInit();

    expect(second.getAuditTrail(created.proposalId)).toEqual(
      first.getAuditTrail(created.proposalId),
    );
    expect(second.verifyAuditChain(created.proposalId)).toEqual({ valid: true, entryCount: 2 });
  });

  it('chains for different proposals never cross-contaminate', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const service = new AiActionProposalService(journal as any, auditLog as any);

    const a = service.create(createInput);
    const b = service.create({
      ...createInput,
      originatingRequestId: 'req-2',
      correlationId: 'corr-2',
    });
    service.approve(a.proposalId);
    service.approve(b.proposalId);
    service.transition(b.proposalId, 'executing');
    await flushAsync();

    expect(service.getAuditTrail(a.proposalId)).toHaveLength(2);
    expect(service.getAuditTrail(b.proposalId)).toHaveLength(3);
    expect(service.verifyAuditChain(a.proposalId)).toEqual({ valid: true, entryCount: 2 });
    expect(service.verifyAuditChain(b.proposalId)).toEqual({ valid: true, entryCount: 3 });
    // Sequence indices restart at 0 per proposal, and entry hashes differ
    // even for the identically-shaped genesis entry, since proposalId is
    // part of the hashed content.
    expect(service.getAuditTrail(a.proposalId)[0].entryHash).not.toBe(
      service.getAuditTrail(b.proposalId)[0].entryHash,
    );
  });

  it('auto-expiry is itself an audited transition', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    const service = new AiActionProposalService(journal as any, auditLog as any);

    const created = service.create({ ...createInput, expiresInMs: -1 });
    // Any read re-checks expiry lazily.
    service.get(created.proposalId);
    await flushAsync();

    const trail = service.getAuditTrail(created.proposalId);
    expect(trail).toHaveLength(2);
    expect(trail[1]).toMatchObject({ fromState: 'proposed', toState: 'expired' });
    expect(service.verifyAuditChain(created.proposalId)).toEqual({ valid: true, entryCount: 2 });
  });

  it('without an audit-log repository the chain still works in-memory (test/dev mode)', () => {
    const service = new AiActionProposalService();
    const created = service.create(createInput);
    service.approve(created.proposalId);

    const trail = service.getAuditTrail(created.proposalId);
    expect(trail).toHaveLength(2);
    expect(service.verifyAuditChain(created.proposalId)).toEqual({ valid: true, entryCount: 2 });
  });

  it('audit-log write failures never break the synchronous workflow', async () => {
    const journal = createJournalMock();
    const auditLog = createAuditLogMock();
    auditLog.save.mockRejectedValue(new Error('db down'));
    const service = new AiActionProposalService(journal as any, auditLog as any);

    const created = service.create(createInput);
    const approved = service.approve(created.proposalId);
    await flushAsync();

    expect(created.state).toBe('proposed');
    expect(approved.state).toBe('approved');
    // The in-memory trail is still correct even though every durable write failed.
    expect(service.getAuditTrail(created.proposalId)).toHaveLength(2);
    expect(service.verifyAuditChain(created.proposalId)).toEqual({ valid: true, entryCount: 2 });
  });

  it('an unknown proposal has an empty trail and a trivially valid (empty) chain', () => {
    const service = new AiActionProposalService();
    expect(service.getAuditTrail('does-not-exist')).toEqual([]);
    expect(service.verifyAuditChain('does-not-exist')).toEqual({ valid: true, entryCount: 0 });
  });
});
