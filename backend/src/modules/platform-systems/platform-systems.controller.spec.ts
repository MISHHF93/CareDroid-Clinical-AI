import { PlatformSystemsController } from './platform-systems.controller';

describe('PlatformSystemsController', () => {
  const buildController = (governanceOverrides: Record<string, any> = {}) => {
    const platformSystemsService = {
      demo: jest.fn((capabilityId: string, id?: string, payload?: Record<string, unknown>) => ({
        capabilityId,
        id,
        payload,
        status: 'demo_review_required',
      })),
      getSourceProvenance: jest.fn((sourceId: string) => ({ sourceId, fallback: true })),
      getAuditRunTimeline: jest.fn((runId: string) => ({ runId, timeline: [] })),
      getAuditIntegrityStatus: jest.fn(() => ({ status: 'demo_verified' })),
      getOperationsHealth: jest.fn(() => ({ status: 'demo_degraded_until_configured' })),
      getObservabilitySummary: jest.fn(() => ({ degradedMode: true })),
    };
    const platformGovernanceService = {
      getPatientSourceData: jest.fn((patientId: string) => ({ patientId, sources: [] })),
      evaluateGate: jest.fn((body: Record<string, unknown>) => ({ allowed: true, ...body })),
      listPrivacyRequests: jest.fn(() => [{ id: 'privacy-1' }]),
      reviewPrivacyRequest: jest.fn(() => ({ id: 'privacy-1', status: 'resolved' })),
      recordObservabilityEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
      getPrivacyAccessLog: jest.fn((patientId?: string) => ({ patientId, accessLog: [] })),
      recentObservability: jest.fn(() => ({ status: 'synthetic_ready' })),
      ...governanceOverrides,
    };

    return {
      controller: new PlatformSystemsController(
        platformSystemsService as any,
        platformGovernanceService as any,
      ),
      platformSystemsService,
      platformGovernanceService,
    };
  };

  it('routes patient source data and privacy requests through durable governance services', async () => {
    const { controller, platformGovernanceService } = buildController();

    await expect(controller.getPatientSourceData('patient-1')).resolves.toEqual({
      patientId: 'patient-1',
      sources: [],
    });
    await expect(controller.getPrivacyRequests()).resolves.toEqual([{ id: 'privacy-1' }]);

    expect(platformGovernanceService.getPatientSourceData).toHaveBeenCalledWith('patient-1');
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

  it('records audit timeline views but returns the audit timeline contract', async () => {
    const { controller, platformGovernanceService, platformSystemsService } = buildController();

    await expect(controller.getAuditRunTimeline('run-1')).resolves.toEqual({
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
      controller.reviewPrivacyRequest('missing', { decision: 'reject' }),
    ).resolves.toEqual(expect.objectContaining({ capabilityId: 'privacy-center', id: 'missing' }));

    expect(platformSystemsService.demo).toHaveBeenCalledWith(
      'privacy-center',
      'missing',
      expect.objectContaining({ decision: 'reject' }),
    );
  });
});
