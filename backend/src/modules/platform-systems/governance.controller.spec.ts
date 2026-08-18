import { GovernanceController } from './governance.controller';

const mockReq = (organizationId = 'org-test') => ({ tenantContext: { organizationId } }) as any;

describe('GovernanceController', () => {
  const buildController = (governanceOverrides: Record<string, any> = {}) => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
      getAuditRunTimeline: jest.fn((runId: string) => ({ runId, timeline: [] })),
      getAuditIntegrityStatus: jest.fn(() => ({ status: 'demo_verified' })),
      getOperationsHealth: jest.fn(() => ({ status: 'demo_degraded_until_configured' })),
      getObservabilitySummary: jest.fn(() => ({ degradedMode: true })),
    };
    const platformGovernanceService = {
      evaluateGate: jest.fn((body: Record<string, unknown>) => ({ allowed: true, ...body })),
      listPrivacyRequests: jest.fn(() => [{ id: 'privacy-1' }]),
      reviewPrivacyRequest: jest.fn(() => ({ id: 'privacy-1', status: 'resolved' })),
      listPolicies: jest.fn(() => [{ id: 'policy-1' }]),
      createPolicy: jest.fn((body: Record<string, unknown>) => ({ id: 'policy-2', ...body })),
      updatePolicy: jest.fn((policyId: string, body: Record<string, unknown>) => ({
        id: policyId,
        ...body,
      })),
      approvePolicy: jest.fn((policyId: string) => ({ id: policyId, status: 'active' })),
      listReleaseGates: jest.fn(() => [{ id: 'gate-1' }]),
      createReleaseGate: jest.fn((body: Record<string, unknown>) => ({ id: 'gate-2', ...body })),
      decideReleaseGate: jest.fn((gateId: string) => ({ id: gateId, status: 'blocked' })),
      listSafetyFindings: jest.fn(() => [{ id: 'finding-1' }]),
      reviewSafetyFinding: jest.fn((findingId: string) => ({ id: findingId, status: 'resolved' })),
      recordObservabilityEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
      getPrivacyAccessLog: jest.fn((patientId?: string) => ({ patientId, accessLog: [] })),
      recentObservability: jest.fn(() => ({ status: 'synthetic_ready' })),
      ...governanceOverrides,
    };

    return {
      controller: new GovernanceController(
        platformSystemsService as any,
        platformGovernanceService as any,
      ),
      platformSystemsService,
      platformGovernanceService,
    };
  };

  it('routes privacy requests through the durable governance service', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(controller.getPrivacyRequests(mockReq())).resolves.toEqual([{ id: 'privacy-1' }]);

    expect(platformGovernanceService.listPrivacyRequests).toHaveBeenCalled();
  });

  it('uses gate evaluation for prompt security instead of a demo-only response', async () => {
    const { controller, platformGovernanceService } = buildController();

    await controller.evaluatePromptSecurity({
      runId: 'run-1',
      capabilityId: 'clinical-chat',
      prompt: 'hello',
    });

    expect(platformGovernanceService.evaluateGate).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        capabilityId: 'clinical-chat',
        prompt: 'hello',
        action: 'ai-security/evaluate',
      }),
    );
  });

  it('routes clinical governance policies, release gates, and safety findings through durable services', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(controller.getClinicalPolicies()).resolves.toEqual([{ id: 'policy-1' }]);
    await expect(
      controller.createClinicalPolicy({ capabilityId: 'clinical-governance' }),
    ).resolves.toEqual(expect.objectContaining({ id: 'policy-2' }));
    await expect(
      controller.approveClinicalPolicy('policy-1', { decision: 'approve' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'active' }));
    await expect(controller.getClinicalReleaseGates()).resolves.toEqual([{ id: 'gate-1' }]);
    await expect(
      controller.decideClinicalReleaseGate('gate-1', { decision: 'reject' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'blocked' }));
    await expect(controller.getGovernanceSafetyFindings()).resolves.toEqual([{ id: 'finding-1' }]);
    await expect(
      controller.reviewGovernanceSafetyFinding('finding-1', { decision: 'resolve' }),
    ).resolves.toEqual(expect.objectContaining({ status: 'resolved' }));

    expect(platformGovernanceService.listPolicies).toHaveBeenCalled();
    expect(platformGovernanceService.createPolicy).toHaveBeenCalled();
    expect(platformGovernanceService.approvePolicy).toHaveBeenCalledWith('policy-1', {
      decision: 'approve',
    });
    expect(platformGovernanceService.listReleaseGates).toHaveBeenCalled();
    expect(platformGovernanceService.decideReleaseGate).toHaveBeenCalledWith('gate-1', {
      decision: 'reject',
    });
    expect(platformGovernanceService.listSafetyFindings).toHaveBeenCalled();
    expect(platformGovernanceService.reviewSafetyFinding).toHaveBeenCalledWith('finding-1', {
      decision: 'resolve',
    });
  });

  it('opens a release gate when a validation run is created', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(
      controller.createValidationRun({
        runId: 'run-1',
        capabilityId: 'clinical-governance',
        changeType: 'prompt',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'release_gate_opened' }));

    expect(platformGovernanceService.createReleaseGate).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: 'clinical-governance',
        changeType: 'prompt',
        validationRunId: 'run-1',
      }),
    );
  });

  it('records audit timeline views but returns the audit timeline contract', async () => {
    const { controller, platformGovernanceService, platformSystemsService } = buildController();

    await expect(controller.getAuditRunTimeline('run-1', mockReq())).resolves.toEqual({
      runId: 'run-1',
      timeline: [],
    });

    expect(platformGovernanceService.recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: 'run-1',
        eventType: 'audit.ai_run.timeline_viewed',
      }),
    );
    expect(platformSystemsService.getAuditRunTimeline).toHaveBeenCalledWith('run-1');
  });

  it('falls back to demo contracts when a durable privacy review item is not found', async () => {
    const { controller, platformSystemsService } = buildController({
      reviewPrivacyRequest: jest.fn().mockResolvedValue(null),
    });

    await expect(
      controller.reviewPrivacyRequest('missing', { decision: 'reject' }, mockReq()),
    ).resolves.toEqual(expect.objectContaining({ capabilityId: 'privacy-center', id: 'missing' }));

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'privacy-center',
      'missing',
      expect.objectContaining({ decision: 'reject' }),
    );
  });
});
