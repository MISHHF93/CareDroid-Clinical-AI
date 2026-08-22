import {
  ApprovalWorkflowService,
  GovernanceAuditService,
  GovernanceController,
  ModelRegistryService,
  RiskClassificationService,
} from './governance.module';

describe('GovernanceController.getSummary', () => {
  // Regression guard: the handler used to return the WHOLE platformGovernance.getSummary()
  // result (which already has its own status/readiness/counts/generatedAt) re-nested under
  // this response's own `readiness` key, so the frontend's apiData.readiness.blocked read
  // was always undefined and silently fell back to rendering the raw status enum
  // ('blocked_until_configured') instead of a human label. readiness here must be the flat
  // { criticality, blocked, blockers } object, not the whole summary again.
  it('returns a flat readiness object, not the whole summary re-nested under readiness', async () => {
    const fakePlatformGovernance = {
      getSummary: async () => ({
        status: 'blocked_until_configured',
        generatedAt: '2026-08-12T00:00:00.000Z',
        readiness: {
          criticality: 'P0',
          blocked: true,
          blockers: ['clinical_governance_policy_required'],
        },
        counts: { policies: 0 },
      }),
    };

    const controller = new GovernanceController(
      new ModelRegistryService(),
      new ApprovalWorkflowService(),
      new RiskClassificationService(),
      new GovernanceAuditService(),
      fakePlatformGovernance as never,
    );

    const result = await controller.getSummary();

    expect(result.status).toBe('blocked_until_configured');
    expect(result.readiness).toEqual({
      criticality: 'P0',
      blocked: true,
      blockers: ['clinical_governance_policy_required'],
    });
    expect((result.readiness as { readiness?: unknown }).readiness).toBeUndefined();
  });
});

describe('ModelRegistryService.listModels — real registry, not fabricated placeholders', () => {
  // Previously this returned 3 hardcoded, entirely fictional models ("Clinical Draft
  // Composer", "Synthetic Validation Runner") with made-up status/approval state. The real,
  // governed registry (data/model-registry/entries/*.json, validated by
  // scripts/validate-model-registry.mjs) existed on disk the whole time -- this pins that
  // the service now actually reads it instead of returning fiction.
  it('serves the real 5-entry model registry from disk, including real measured accuracy for the trained classifiers', () => {
    const service = new ModelRegistryService();
    const models = service.listModels();

    expect(models.length).toBe(5);
    expect(models.map((m) => m.modelName)).not.toEqual(
      expect.arrayContaining(['Clinical Draft Composer', 'Synthetic Validation Runner']),
    );

    const claude = models.find((m) => m.modelId === 'mdl-claude-sonnet-4-6-v1');
    expect(claude).toBeDefined();
    expect(claude?.provider).toBe('anthropic');
    expect(claude?.status).toBe('approved');
    expect(claude?.outOfScopeUse).toEqual(
      expect.arrayContaining(['Autonomous diagnosis or prescription']),
    );

    const unifiedNode = models.find((m) => m.modelId === 'mdl-unified-ai-node-v1');
    expect(unifiedNode).toBeDefined();
    // Real measured accuracy, not a fabricated number -- must survive unchanged from the
    // registry file (this is the "never fabricate" guarantee this fix exists for).
    expect(
      (unifiedNode?.performanceMeasures as { nlu?: { reportedAccuracy?: number } })?.nlu
        ?.reportedAccuracy,
    ).toBe(1.0);
    expect(
      (unifiedNode?.performanceMeasures as { artifactRouter?: { reportedAccuracy?: number } })
        ?.artifactRouter?.reportedAccuracy,
    ).toBe(0.9645);
  });
});

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
