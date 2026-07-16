import { BadRequestException } from '@nestjs/common';
import { AiActionProposalService } from './ai-action-proposal.service';

describe('AiActionProposalService', () => {
  let service: AiActionProposalService;

  beforeEach(() => {
    service = new AiActionProposalService();
  });

  afterEach(() => {
    service.clearForTests();
  });

  it('creates moderate-risk proposals that require approval', () => {
    const p = service.create({
      organizationId: 'org-1',
      originatingRequestId: 'req-1',
      correlationId: 'corr-1',
      toolName: 'prepare_triage_handoff_draft',
      expectedEffect: 'Draft handoff',
      previewSummary: 'Draft only',
      riskLevel: 'moderate',
      dataWillChange: ['draft'],
      rollbackCapable: true,
      reversibleWindowMs: 60_000,
    });
    expect(p.state).toBe('proposed');
    expect(p.requiresApproval).toBe(true);
  });

  it('rejects high-risk without approval flag', () => {
    expect(() =>
      service.create({
        originatingRequestId: 'req-2',
        correlationId: 'corr-2',
        toolName: 'assign_triage',
        expectedEffect: 'Assign',
        previewSummary: 'bad',
        riskLevel: 'high',
        requiresApproval: false,
      }),
    ).toThrow(BadRequestException);
  });

  it('supports approve → execute → rollback', () => {
    const p = service.create({
      organizationId: 'org-1',
      originatingRequestId: 'req-3',
      correlationId: 'corr-3',
      toolName: 'prepare_ems_handoff_draft',
      expectedEffect: 'Draft EMS handoff',
      previewSummary: 'No chart write',
      riskLevel: 'moderate',
      rollbackCapable: true,
      reversibleWindowMs: 60_000,
    });
    service.approve(p.proposalId, 'user-1');
    const done = service.execute(p.proposalId, { written: false });
    expect(done.state).toBe('completed');
    const rolled = service.transition(p.proposalId, 'rolled_back');
    expect(rolled.state).toBe('rolled_back');
  });

  it('lists by organization', () => {
    service.create({
      organizationId: 'org-a',
      originatingRequestId: 'r1',
      correlationId: 'c1',
      toolName: 't',
      expectedEffect: 'e',
      previewSummary: 'p',
    });
    service.create({
      organizationId: 'org-b',
      originatingRequestId: 'r2',
      correlationId: 'c2',
      toolName: 't',
      expectedEffect: 'e',
      previewSummary: 'p',
    });
    expect(service.list({ organizationId: 'org-a' })).toHaveLength(1);
  });
});
