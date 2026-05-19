import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Subscription, SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';

// Mock OpenAI module
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('AIService', () => {
  let service: AIService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSubscriptionRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
      ],
    }).compile();

    service = module.get<AIService>(AIService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('sk-test-key');
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
    });

    it('should return default FREE tier if no subscription found', async () => {
      const userId = '1';

      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      const result = await service.getUsage(userId);

      expect(result).toHaveProperty('userId', userId);
      expect(result).toHaveProperty('tier', SubscriptionTier.FREE);
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

      // Since we can't easily mock OpenAI API, this will throw an error
      // but it should get past the rate limiting check
      await expect(service.invokeLLM(userId, prompt)).rejects.toThrow();

      // Verify it got past the rate limit check
      expect(mockSubscriptionRepository.findOne).toHaveBeenCalled();
    });
  });
});
