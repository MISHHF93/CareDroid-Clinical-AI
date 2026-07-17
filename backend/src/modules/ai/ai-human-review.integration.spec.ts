import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIQuery } from './entities/ai-query.entity';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { MetricsService } from '../metrics/metrics.service';
import { PlatformGovernanceService, PlatformGovernanceStatus } from '../platform-governance';
import { unifiedAIClient } from '../../../../lib/ai/serverClient';

/**
 * AI7 (reinstated Cy76 — this spec was lost in the Cy74-75 consolidation
 * rewrite): prove — through the real PlatformGovernanceService, not a mock of
 * it — that a successful AI query flagged as requiring human review ends as a
 * PERSISTED review-item row in needs_review status. Other coverage asserts
 * each half separately (AIService → mocked governance; governance → repo);
 * this spec joins the path.
 */

function repoStub() {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((input: Record<string, unknown>) => ({ ...input })),
    save: jest.fn(async (row: Record<string, unknown>) => ({ id: 'row-1', ...row })),
  };
}

describe('AI high-risk output → persisted human-review record (integration)', () => {
  let service: AIService;
  const persistedReviewItems: Array<Record<string, any>> = [];

  const reviewItemsRepo = {
    ...repoStub(),
    save: jest.fn(async (row: Record<string, unknown>) => {
      const saved = { id: `review-${persistedReviewItems.length + 1}`, ...row };
      persistedReviewItems.push(saved);
      return saved;
    }),
  };

  const mockAiQueryRepository = {
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((query: Record<string, unknown>) => query),
    save: jest.fn((query: Record<string, unknown>) =>
      Promise.resolve({ id: 'query-hr-1', ...query }),
    ),
  };

  beforeEach(async () => {
    persistedReviewItems.length = 0;
    jest.clearAllMocks();

    // Real governance service, in-memory persistence for review items.
    const governanceService = new PlatformGovernanceService(
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      reviewItemsRepo as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      repoStub() as any,
      undefined,
      undefined,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
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
            }),
          },
        },
        { provide: getRepositoryToken(AIQuery), useValue: mockAiQueryRepository },
        {
          provide: getRepositoryToken(Subscription),
          useValue: { findOne: jest.fn().mockResolvedValue({ tier: SubscriptionTier.FREE }) },
        },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: MetricsService, useValue: { recordOpenaiCost: jest.fn() } },
        { provide: PlatformGovernanceService, useValue: governanceService },
      ],
    }).compile();

    service = module.get(AIService);
    jest.spyOn(service as any, 'getUsageToday').mockResolvedValue(0);
    jest.spyOn(unifiedAIClient, 'request').mockResolvedValue({
      ok: true,
      status: 200,
      content: 'High-risk clinical recommendation requiring review.',
      data: {},
      toolCalls: [],
      usage: {
        inputTokens: 60,
        outputTokens: 30,
        totalTokens: 90,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
      requestType: 'COPILOT_CHAT',
    } as any);
  });

  it('persists a needs_review governance row for a high-risk successful query', async () => {
    await service.invokeLLM('user-hr-1', 'Assess sepsis risk and recommend escalation', {
      organizationId: '11111111-1111-1111-1111-111111111111',
      workspaceId: '22222222-2222-2222-2222-222222222222',
      agentId: 'triage-agent',
      feature: 'assistant',
      aiFoundation: {
        runId: 'run-hr-1',
        capabilityId: 'clinical-assistant',
        requiresHumanReview: true,
      },
      routePlan: {
        safetyPlan: { requiresHumanReview: true },
      },
    });

    expect(persistedReviewItems).toHaveLength(1);
    const row = persistedReviewItems[0];
    expect(row.status).toBe(PlatformGovernanceStatus.NEEDS_REVIEW);
    expect(row.organizationId).toBe('11111111-1111-1111-1111-111111111111');
    expect(row.runId).toBe('run-hr-1');
    expect(row.payload).toMatchObject({
      sourceType: 'ai_query',
      sourceId: 'query-hr-1',
      workspaceId: '22222222-2222-2222-2222-222222222222',
      reason: expect.stringContaining('human review'),
    });
  });

  it('does not create a review row when the output does not require review', async () => {
    await service.invokeLLM('user-hr-1', 'Summarize current queue status', {
      organizationId: '11111111-1111-1111-1111-111111111111',
      aiFoundation: { runId: 'run-hr-2', requiresHumanReview: false },
    });

    expect(persistedReviewItems).toHaveLength(0);
  });
});
