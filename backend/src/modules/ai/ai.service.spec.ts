import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AIQuery } from './entities/ai-query.entity';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { PlatformGovernanceService } from '../platform-governance';
import { unifiedAIClient } from '../../../../lib/ai/serverClient';

describe('AIService', () => {
  let service: AIService;
  let _configService: ConfigService;

  const defaultConfigLookup = (key: string) => {
    if (key === 'ANTHROPIC_API_KEY') return 'sk-test-key';
    if (key === 'ai') {
      return {
        model: 'claude-sonnet-4-6',
        maxTokens: 1200,
        temperature: 0.2,
        rateLimits: {
          free: { dailyLimit: 10, model: 'claude-sonnet-4-6', maxTokens: 1200 },
        },
      };
    }
    return undefined;
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
  };

  const mockAiQueryRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: '0', totalCost: '0' }),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
    create: jest.fn((query) => query),
    save: jest.fn((query) =>
      Promise.resolve({
        id: 'query-1',
        ...query,
        requiresHumanReview:
          query.requiresHumanReview ??
          query.metadata?.aiCommercialization?.requiresHumanReview ??
          false,
      }),
    ),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockMetricsService = {
    recordOpenaiCost: jest.fn(),
  };

  const mockPlatformGovernanceService = {
    createReviewItem: jest.fn().mockResolvedValue({ id: 'review-1' }),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation(defaultConfigLookup);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(AIQuery),
          useValue: mockAiQueryRepository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockSubscriptionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: PlatformGovernanceService,
          useValue: mockPlatformGovernanceService,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(unifiedAIClient, 'request').mockRejectedValue(new Error('AI unavailable'));
    mockConfigService.get.mockImplementation(defaultConfigLookup);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProvidersHealth / tools / models / requests', () => {
    it('returns provider health without secrets', () => {
      const result = service.getProvidersHealth();
      expect(result.providers.length).toBeGreaterThan(0);
      expect(result.providers.every((p) => typeof p.provider === 'string')).toBe(true);
      expect(JSON.stringify(result)).not.toMatch(/sk-/i);
    });

    it('returns the legacy LLM tool catalog', () => {
      const catalog = service.getAiToolCatalog();
      expect(catalog.count).toBeGreaterThan(0);
      expect(catalog.tools[0]).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          requiresHumanApproval: true,
        }),
      );
    });

    it('returns registered models from the model registry when present', () => {
      const models = service.getRegisteredModels();
      expect(typeof models.count).toBe('number');
      expect(models.count).toBeGreaterThan(0);
      expect(Array.isArray(models.models)).toBe(true);
      expect(models.models[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          status: expect.any(String),
        }),
      );
    });

    it('returns a tenant-safe AI request record by id', async () => {
      mockAiQueryRepository.findOne.mockResolvedValue({
        id: 'query-1',
        userId: 'user-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        status: 'success',
        feature: 'careDroidAI_node',
        model: 'careDroidAI-node-v1',
        requiresHumanReview: true,
        prompt: '[redacted:prompt:careDroidAI_node]',
        response: '[redacted:response:careDroidAI_node]',
        createdAt: new Date('2026-07-15T00:00:00.000Z'),
      });

      const result = await service.getRequestById('user-1', 'query-1', {
        organizationId: 'org-1',
      });
      expect(result.id).toBe('query-1');
      expect(result.requiresHumanReview).toBe(true);
      expect(result.prompt).toContain('redacted');
    });
  });

  describe('runUnifiedAiQuery (canonical envelope)', () => {
    it('rejects malformed unified requests without invoking tools', async () => {
      const result = await service.runUnifiedAiQuery('user-1', {
        role: 'reception',
        permissions: ['use_ai_chat'],
        channel: 'reception',
        // missing task
        query: 'hello',
        responseFormat: 'structured',
      });
      expect(result.status).toBe('failed');
      expect(result.model.provider).toBe('none');
      expect(result.missingInformation.length).toBeGreaterThan(0);
    });

    it('blocks unsafe autonomous requests', async () => {
      const result = await service.runUnifiedAiQuery(
        'user-1',
        {
          role: 'reception',
          permissions: ['use_ai_chat'],
          channel: 'reception',
          task: 'answer_question',
          query: 'Please diagnose and prescribe morphine without review',
          responseFormat: 'structured',
        },
        { organizationId: 'org-1', role: 'reception' },
      );
      expect(result.status).toBe('blocked_by_safety');
      expect(result.safety.allowed).toBe(false);
    });

    it('routes reception missing-info tasks through the structured intake node', async () => {
      jest.spyOn(service as any, 'classifyStructuredNodeInput').mockResolvedValue(null);
      const result = await service.runUnifiedAiQuery(
        'user-1',
        {
          role: 'receptionist',
          permissions: ['use_ai_chat'],
          channel: 'reception',
          task: 'detect_missing_information',
          query: 'What is missing before triage handoff?',
          responseFormat: 'structured',
        },
        { organizationId: 'org-1', role: 'receptionist' },
      );
      expect(['completed', 'needs_human_review', 'failed']).toContain(result.status);
      expect(result.requestId).toBeTruthy();
      expect(result.safety.requiresHumanReview).toBe(true);
      expect(result.model.model).toBe('careDroidAI-node-v1');
    });

    it('HEAL-328: the resolved tenantContext/authenticated userId win over a client-supplied organizationId/userId/role in the audit context, not the reverse', async () => {
      jest.spyOn(service as any, 'classifyStructuredNodeInput').mockResolvedValue(null);
      const nodeSpy = jest.spyOn(service, 'runCareDroidAINode');

      await service.runUnifiedAiQuery(
        'real-authenticated-user',
        {
          role: 'admin',
          permissions: ['use_ai_chat'],
          channel: 'reception',
          task: 'detect_missing_information',
          query: 'What is missing before triage handoff?',
          responseFormat: 'structured',
          // Client-supplied values an attacker could set to poison the AI
          // audit trail's attribution -- before HEAL-328 these won.
          organizationId: 'attacker-claimed-org',
          userId: 'attacker-claimed-user',
        },
        { organizationId: 'real-org', role: 'receptionist' },
      );

      expect(nodeSpy).toHaveBeenCalled();
      const [calledUserId, calledRequest] = nodeSpy.mock.calls[0];
      const calledContext = calledRequest.context as Record<string, any>;
      expect(calledUserId).toBe('real-authenticated-user');
      expect(calledContext).toBeDefined();
      expect(calledContext.organizationId).toBe('real-org');
      expect(calledContext.tenant.organizationId).toBe('real-org');
      expect(calledContext.tenant.userId).toBe('real-authenticated-user');
      expect(calledContext.userRole).toBe('receptionist');
    });
  });

  describe('human-review creation from high-risk AI output (AI7)', () => {
    it('creates a governance review item when structured node requires clinician review', async () => {
      const userId = 'user-1';
      jest.spyOn(service as any, 'classifyStructuredNodeInput').mockResolvedValue(null);

      // Force requiresHumanReview on the saved AI query path.
      mockAiQueryRepository.save.mockImplementationOnce((query) =>
        Promise.resolve({
          id: 'query-high-risk',
          ...query,
          requiresHumanReview: true,
          status: query.status,
          organizationId: 'org-1',
          feature: 'careDroidAI_node',
          metadata: {
            ...query.metadata,
            aiCommercialization: {
              ...(query.metadata?.aiCommercialization || {}),
              requiresHumanReview: true,
            },
          },
        }),
      );

      const response = await service.runCareDroidAINode(
        userId,
        {
          intent: 'triage_recommendation',
          input: {
            symptoms: ['chest pain', 'shortness of breath'],
            vitals: { bloodPressure: '88/54', heartRate: 132, spo2: 90 },
            painLevel: 8,
            arrivalMode: 'EMS',
          },
          context: {
            userRole: 'triage_nurse',
            tenant: { organizationId: 'org-1', role: 'triage_nurse' },
          },
        },
        { tenant: { organizationId: 'org-1', role: 'triage_nurse' } },
      );

      expect(response.requiresClinicianReview).toBe(true);
      expect(mockPlatformGovernanceService.createReviewItem).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: expect.any(String),
          reviewType: expect.any(String),
          severity: expect.any(String),
          payload: expect.objectContaining({
            sourceType: 'ai_query',
            reason: expect.stringContaining('human review'),
          }),
        }),
      );
    });
  });

  describe('runCareDroidAINode error audit trail (HEAL-240)', () => {
    it('logs a QueryStatus.ERROR audit row and rethrows when the node workflow fails, matching sibling AI methods', async () => {
      const userId = 'user-1';
      const failure = new Error('careDroidAI node workflow exploded');
      jest.spyOn(service as any, 'classifyStructuredNodeInput').mockRejectedValue(failure);
      mockAiQueryRepository.save.mockClear();

      await expect(
        service.runCareDroidAINode(
          userId,
          {
            intent: 'triage_recommendation',
            input: { symptoms: ['chest pain'] },
            context: { userRole: 'triage_nurse' },
          },
          {},
        ),
      ).rejects.toThrow('careDroidAI node workflow exploded');

      expect(mockAiQueryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          feature: 'careDroidAI_node',
        }),
      );
    });
  });

  describe('getUsage', () => {
    it('should return usage stats for a user', async () => {
      const userId = '1';
      const mockSubscription = {
        id: '1',
        userId,
        tier: SubscriptionTier.FREE,
      };

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.getUsage(userId);

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('tier', SubscriptionTier.FREE);
      expect(result).toHaveProperty('dailyLimit');
      expect(result).toHaveProperty('usedToday');
      expect(mockAiQueryRepository.createQueryBuilder).toHaveBeenCalledWith('aiQuery');
    });

    it('should return default FREE tier if no subscription found', async () => {
      const userId = '1';

      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getUsage(userId);

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('tier', SubscriptionTier.FREE);
    });
  });

  describe('getOrganizationUsageSummary', () => {
    const queryBuilder = (result: Record<string, any>, many = false) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(result),
      getRawMany: jest.fn().mockResolvedValue(many ? result : []),
    });

    it('returns organization AI usage grouped by commercial dimensions', async () => {
      mockAiQueryRepository.createQueryBuilder
        .mockReturnValueOnce(
          queryBuilder({
            totalQueries: '4',
            totalTokens: '1200',
            actualCost: '0.25',
            estimatedCost: '0.4',
            reviewRequiredCount: '2',
          }),
        )
        .mockReturnValueOnce(
          queryBuilder(
            [{ assetId: 'differential-ai', count: '3', totalTokens: '900', actualCost: '0.18' }],
            true,
          ),
        )
        .mockReturnValueOnce(
          queryBuilder(
            [{ agentId: 'cardiology-agent', count: '2', totalTokens: '600', estimatedCost: '0.2' }],
            true,
          ),
        )
        .mockReturnValueOnce(
          queryBuilder(
            [
              {
                modelClass: 'standard',
                count: '4',
                totalTokens: '1200',
                reviewRequiredCount: '2',
              },
            ],
            true,
          ),
        );

      const result = await service.getOrganizationUsageSummary('org-1', 14);

      expect(result).toMatchObject({
        organizationId: 'org-1',
        days: 14,
        totals: {
          totalQueries: 4,
          totalTokens: 1200,
          actualCost: 0.25,
          estimatedCost: 0.4,
          reviewRequiredCount: 2,
        },
        byAsset: [expect.objectContaining({ assetId: 'differential-ai', count: 3 })],
        byAgent: [expect.objectContaining({ agentId: 'cardiology-agent', count: 2 })],
        byModelClass: [expect.objectContaining({ modelClass: 'standard', count: 4 })],
      });
    });
  });

  describe('invokeLLM', () => {
    it('should throw error when daily limit exceeded', async () => {
      const userId = '1';
      const prompt = 'Test prompt';

      // Mock subscription with FREE tier (10 daily limit)
      mockSubscriptionRepository.findOne.mockResolvedValue({
        tier: SubscriptionTier.FREE,
      });

      // Mock getUsageToday to return limit exceeded
      jest.spyOn(service as any, 'getUsageToday').mockResolvedValue(10);

      await expect(service.invokeLLM(userId, prompt)).rejects.toThrow(
        'Daily AI query limit reached',
      );
    });

    it('should allow usage when under daily limit', async () => {
      const userId = '1';
      const prompt = 'Test prompt';

      mockSubscriptionRepository.findOne.mockResolvedValue({
        tier: SubscriptionTier.FREE,
      });

      // Mock getUsageToday to return under limit
      jest.spyOn(service as any, 'getUsageToday').mockResolvedValue(5);

      // Since the unified client is mocked to fail, this should get past rate limiting first.
      // but it should get past the rate limiting check
      await expect(service.invokeLLM(userId, prompt)).rejects.toThrow();

      // Verify it got past the rate limit check
      expect(mockSubscriptionRepository.findOne).toHaveBeenCalled();
    });

    it('persists commercial AI usage dimensions with query records', async () => {
      const userId = '1';
      const prompt = 'Summarize cardiology risk for this encounter';
      jest.mocked(unifiedAIClient.request).mockResolvedValue({
        ok: true,
        status: 200,
        content: 'Structured clinical summary',
        data: {},
        toolCalls: [],
        usage: {
          inputTokens: 80,
          outputTokens: 40,
          totalTokens: 120,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
        },
        requestType: 'COPILOT_CHAT',
      });

      mockSubscriptionRepository.findOne.mockResolvedValue({ tier: SubscriptionTier.FREE });
      jest.spyOn(service as any, 'getUsageToday').mockResolvedValue(0);

      await service.invokeLLM(userId, prompt, {
        organizationId: '11111111-1111-1111-1111-111111111111',
        workspaceId: '22222222-2222-2222-2222-222222222222',
        agentId: 'cardiology-agent',
        assetId: 'differential-ai',
        feature: 'assistant',
        conversationId: 'conv-1',
        aiFoundation: {
          runId: 'run-1',
          capabilityId: 'clinical-assistant',
          route: 'clinical_tool',
          selectedExpert: 'cardiology',
          selectedExperts: [{ expertId: 'cardiology', role: 'primary' }],
          retrievalPolicy: 'guideline',
          confidence: 0.92,
          routeScore: 0.88,
          routeReason: 'matched cardiology risk terms',
          estimatedCost: 0.042,
          costReductionApplied: ['lightweight_router'],
          phiAccessed: false,
          requiresHumanReview: true,
          startedAt: '2026-06-05T08:00:00.000Z',
        },
        routePlan: {
          selectedExpert: 'cardiology',
          selectedExperts: [{ expertId: 'cardiology', role: 'primary' }],
          routingEvidence: [],
          modelPlan: { expertModel: 'standard' },
          toolPlan: { backendExecutorIds: ['differential-ai'] },
          costPlan: { estimatedCost: 0.042, costReductionApplied: ['lightweight_router'] },
          safetyPlan: { requiresHumanReview: true },
        },
      });

      expect(mockAiQueryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: '11111111-1111-1111-1111-111111111111',
          workspaceId: '22222222-2222-2222-2222-222222222222',
          assetId: 'differential-ai',
          agentId: 'cardiology-agent',
          modelClass: 'standard',
          modelVersion: 'claude-sonnet-4-6',
          routingExpert: 'cardiology',
          retrievalPolicy: 'guideline',
          requiresHumanReview: true,
          estimatedCost: 0.042,
          metadata: expect.objectContaining({
            tenant: expect.objectContaining({
              organizationId: '11111111-1111-1111-1111-111111111111',
              workspaceId: '22222222-2222-2222-2222-222222222222',
            }),
            aiCommercialization: expect.objectContaining({
              costReductionApplied: ['lightweight_router'],
              maxTokens: 1200,
            }),
          }),
        }),
      );
      expect(mockPlatformGovernanceService.createReviewItem).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: '11111111-1111-1111-1111-111111111111',
          runId: 'run-1',
          capabilityId: 'cardiology-agent',
          reviewType: 'clinical_ai',
          severity: 'high',
          payload: expect.objectContaining({
            sourceType: 'ai_query',
            sourceId: 'query-1',
            workspaceId: '22222222-2222-2222-2222-222222222222',
            assetId: 'differential-ai',
            agentId: 'cardiology-agent',
            modelVersion: 'claude-sonnet-4-6',
          }),
        }),
      );
    });
  });
});
