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
    save: jest.fn((query) => Promise.resolve({ id: 'query-1', ...query })),
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
