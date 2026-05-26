import { ApprovalWorkflowService, RiskClassificationService } from './governance.module';

describe('Governance services', () => {
  it('classifies PHI and side-effecting clinical actions as high risk', () => {
    const service = new RiskClassificationService();

    const result = service.classify({
      capabilityId: 'order-set-ai',
      action: 'writeback order recommendation',
      phiAccessed: true,
    });

    expect(result).toMatchObject({
      level: 'high',
      category: 'high_risk_cds',
      requiresHumanApproval: true,
      capabilityId: 'order-set-ai',
    });
    expect(result.rationale).toEqual(
      expect.arrayContaining([
        'Uses or may expose PHI',
        'Requested side-effecting clinical action',
      ]),
    );
  });

  it('builds approval workflow state for high-risk governed actions', () => {
    const service = new ApprovalWorkflowService();

    const approval = service.requiresApproval({
      riskLevel: 'high',
      phiAccessed: true,
      sideEffecting: true,
    });
    const panel = service.getClinicalReviewPanel();

    expect(approval.required).toBe(true);
    expect(approval.reasons).toEqual(
      expect.arrayContaining(['high_risk_capability', 'phi_access', 'side_effecting_action']),
    );
    expect(panel.queue.length).toBeGreaterThan(0);
    expect(panel.pending).toBeGreaterThanOrEqual(1);
  });
});
