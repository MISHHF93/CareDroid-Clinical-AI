import { afterEach, describe, expect, it } from 'vitest';
import {
  approveProposal,
  clearActionProposalStoreForTests,
  createActionProposal,
  executeProposal,
  modifyProposalArguments,
  rejectProposal,
  rollbackProposal,
} from './actionProposalService';

describe('actionProposalService', () => {
  afterEach(() => {
    clearActionProposalStoreForTests();
  });

  it('creates proposals that require approval for moderate risk', () => {
    const proposal = createActionProposal({
      originatingRequestId: 'req-1',
      correlationId: 'corr-1',
      toolName: 'prepare_triage_handoff_draft',
      validatedArguments: { patientId: 'p1' },
      expectedEffect: 'Draft handoff note',
      riskLevel: 'moderate',
      requiredPermission: 'use_ai_chat',
      model: 'local',
      promptVersion: '1',
      previewSummary: 'Draft only',
      dataWillChange: ['draft_handoff_note'],
      rollbackCapable: true,
      reversibleWindowMs: 60_000,
    });
    expect(proposal.state).toBe('proposed');
    expect(proposal.requiresApproval).toBe(true);
  });

  it('rejects high-risk auto-approval', () => {
    expect(() =>
      createActionProposal({
        originatingRequestId: 'req-2',
        correlationId: 'corr-2',
        toolName: 'assign_triage',
        validatedArguments: {},
        expectedEffect: 'Assign triage',
        riskLevel: 'high',
        requiredPermission: 'write_phi',
        requiresApproval: false,
        model: 'local',
        promptVersion: '1',
        previewSummary: 'bad',
        dataWillChange: ['triage_level'],
      }),
    ).toThrow(/always require human approval/i);
  });

  it('supports preview modify → approve → execute → rollback', async () => {
    const proposal = createActionProposal({
      originatingRequestId: 'req-3',
      correlationId: 'corr-3',
      toolName: 'prepare_ems_handoff_draft',
      validatedArguments: { note: 'alpha' },
      expectedEffect: 'Draft EMS handoff',
      riskLevel: 'moderate',
      requiredPermission: 'use_ai_chat',
      model: 'local',
      promptVersion: '1',
      previewSummary: 'Draft only — no chart write',
      dataWillChange: ['draft_handoff_note'],
      rollbackCapable: true,
      reversibleWindowMs: 60_000,
    });

    const modified = modifyProposalArguments(proposal.proposalId, { note: 'beta' }, ['note']);
    expect(modified.validatedArguments.note).toBe('beta');
    expect(modified.state).toBe('reviewing');

    approveProposal(proposal.proposalId, 'user-1');
    const completed = await executeProposal(proposal.proposalId, async (p) => ({
      written: false,
      tool: p.toolName,
    }));
    expect(completed.state).toBe('completed');
    expect(completed.executionResult).toEqual({ written: false, tool: 'prepare_ems_handoff_draft' });

    const rolled = rollbackProposal(proposal.proposalId);
    expect(rolled.state).toBe('rolled_back');
  });

  it('blocks execution without approval when required', async () => {
    const proposal = createActionProposal({
      originatingRequestId: 'req-4',
      correlationId: 'corr-4',
      toolName: 'draft',
      validatedArguments: {},
      expectedEffect: 'x',
      riskLevel: 'moderate',
      requiredPermission: 'use_ai_chat',
      model: 'local',
      promptVersion: '1',
      previewSummary: 'x',
      dataWillChange: [],
    });
    await expect(executeProposal(proposal.proposalId, async () => ({}))).rejects.toThrow(
      /approval required/i,
    );
    rejectProposal(proposal.proposalId, 'not needed');
  });
});
