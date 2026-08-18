import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  describe('HEAL-325: cross-tenant proposal access', () => {
    // get()/approve()/reject()/execute()/rollback (transition()) previously
    // took only a proposalId, with no organizationId check against the
    // caller -- unlike list(), which correctly filters. Any authenticated
    // user holding USE_AI_CHAT could read or transition another
    // organization's pending clinical-AI action proposal by guessing/
    // obtaining its UUID.
    function createOrgAProposal() {
      return service.create({
        organizationId: 'org-a',
        originatingRequestId: 'req-tenant',
        correlationId: 'corr-tenant',
        toolName: 'prepare_triage_handoff_draft',
        expectedEffect: 'Draft handoff',
        previewSummary: 'Draft only',
        riskLevel: 'moderate',
        dataWillChange: ['draft'],
        rollbackCapable: true,
        reversibleWindowMs: 60_000,
      });
    }

    it('get() rejects a caller from a different organization', () => {
      const p = createOrgAProposal();
      expect(() => service.get(p.proposalId, 'org-b')).toThrow(NotFoundException);
      expect(service.get(p.proposalId, 'org-a').proposalId).toBe(p.proposalId);
    });

    it('approve()/reject()/execute() all reject a cross-organization caller', () => {
      const p = createOrgAProposal();
      expect(() => service.approve(p.proposalId, 'attacker', 'org-b')).toThrow(NotFoundException);
      expect(() => service.reject(p.proposalId, 'no', 'org-b')).toThrow(NotFoundException);
      expect(() => service.execute(p.proposalId, {}, 'org-b')).toThrow(NotFoundException);
      // The proposal must be untouched -- still 'proposed', not silently
      // approved/executed by the rejected cross-org calls above.
      expect(service.get(p.proposalId, 'org-a').state).toBe('proposed');
    });

    it('rollback (transition to rolled_back) rejects a cross-organization caller', () => {
      const p = createOrgAProposal();
      service.approve(p.proposalId, 'user-1', 'org-a');
      service.execute(p.proposalId, { written: false }, 'org-a');
      expect(() => service.transition(p.proposalId, 'rolled_back', undefined, 'org-b')).toThrow(
        NotFoundException,
      );
      expect(service.get(p.proposalId, 'org-a').state).toBe('completed');
    });

    it('stays accessible with no organizationId filter (backward compatible, matches list()\'s permissive-when-unset semantics)', () => {
      const p = createOrgAProposal();
      expect(service.get(p.proposalId).proposalId).toBe(p.proposalId);
      expect(service.approve(p.proposalId, 'user-1').state).toBe('approved');
    });
  });
});
