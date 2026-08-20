import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

jest.mock('stripe');

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let _auditService: AuditService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    stripeCustomerId: 'cus_test123',
  };

  const mockSubscription = {
    id: '1',
    userId: '1',
    tier: SubscriptionTier.FREE,
    status: SubscriptionStatus.ACTIVE,
    stripeSubscriptionId: 'sub_test123',
    stripeCustomerId: 'cus_test123',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
  };

  const mockSubscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'stripe.secretKey': 'sk_test_123',
        'stripe.successUrl': 'https://app.example.com/billing/success',
        'stripe.cancelUrl': 'https://app.example.com/billing/cancel',
      };
      return values[key];
    }),
  };

  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
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
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    _auditService = module.get<AuditService>(AuditService);

    // Mock the getPriceIdForTier method
    jest.spyOn(service as any, 'getPriceIdForTier').mockReturnValue('price_test123');
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Stripe
    (service as any).stripe = mockStripe;

    // Mock the getPriceIdForTier method
    jest.spyOn(service as any, 'getPriceIdForTier').mockReturnValue('price_test123');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session for existing customer', async () => {
      const userId = '1';
      const tier = SubscriptionTier.PROFESSIONAL;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      });

      const result = await service.createCheckoutSession(userId, tier);

      expect(result).toEqual({
        sessionId: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should create customer and checkout session for new user', async () => {
      const userId = '1';
      const tier = SubscriptionTier.PROFESSIONAL;
      const userWithoutCustomer = { ...mockUser, stripeCustomerId: null };

      mockUserRepository.findOne.mockResolvedValue(userWithoutCustomer);
      mockStripe.customers.create.mockResolvedValue({
        id: 'cus_new123',
      });
      mockUserRepository.save.mockResolvedValue({
        ...userWithoutCustomer,
        stripeCustomerId: 'cus_new123',
      });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      });

      const result = await service.createCheckoutSession(userId, tier);

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: userWithoutCustomer.email,
        metadata: { userId },
      });
      expect(result).toHaveProperty('sessionId');
    });

    it('should throw error when user not found', async () => {
      const userId = 'nonexistent';
      const tier = SubscriptionTier.PROFESSIONAL;

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.createCheckoutSession(userId, tier)).rejects.toThrow('User not found');
    });

    it('should throw ServiceUnavailableException when Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.createCheckoutSession('1', SubscriptionTier.PROFESSIONAL),
      ).rejects.toThrow('Payment processing is not configured.');
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      const userId = '1';
      const returnUrl = 'https://app.example.com/billing';

      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test123',
      });

      const result = await service.createCustomerPortalSession(userId, returnUrl);

      expect(result).toEqual({
        url: 'https://billing.stripe.com/session/test123',
      });
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: mockSubscription.stripeCustomerId,
        return_url: returnUrl,
      });
    });

    it("HEAL-247: records an audit log entry, matching createCheckoutSession's audit trail", async () => {
      const userId = '1';
      mockSubscriptionRepository.findOne.mockResolvedValue(mockSubscription);
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        id: 'bps_test123',
        url: 'https://billing.stripe.com/session/test123',
      });

      await service.createCustomerPortalSession(userId, 'https://app.example.com/billing');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          resource: 'billing_portal_session',
          metadata: expect.objectContaining({ sessionId: 'bps_test123' }),
        }),
      );
    });

    it('should throw error when user has no stripe customer ID', async () => {
      const userId = '1';

      mockSubscriptionRepository.findOne.mockResolvedValue(null);

      await expect(service.createCustomerPortalSession(userId)).rejects.toThrow(
        'No active subscription found',
      );
    });

    it('should throw ServiceUnavailableException when Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(service.createCustomerPortalSession('1')).rejects.toThrow(
        'Payment processing is not configured.',
      );
    });
  });

  describe('handleWebhook', () => {
    it('should handle checkout.session.completed event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test123',
            customer: 'cus_test123',
            subscription: 'sub_test123',
            metadata: {
              userId: '1',
              tier: SubscriptionTier.PROFESSIONAL,
            },
          },
        },
      } as any as Stripe.Event;

      mockSubscriptionRepository.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(mockSubscription);
      jest.spyOn(service as any, 'handleCheckoutCompleted').mockResolvedValue(undefined);

      await service.handleWebhook(event);

      expect((service as any).handleCheckoutCompleted).toHaveBeenCalledWith(event.data.object);
    });

    it('should handle customer.subscription.updated event', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            cancel_at_period_end: false,
          },
        },
      } as Stripe.Event;

      jest.spyOn(service as any, 'handleSubscriptionUpdated').mockResolvedValue(undefined);

      await service.handleWebhook(event);

      expect((service as any).handleSubscriptionUpdated).toHaveBeenCalledWith(event.data.object);
    });

    it('should handle unknown event type gracefully', async () => {
      const event = {
        type: 'unknown.event.type',
        data: { object: {} },
      } as any as Stripe.Event;

      // Should not throw
      await expect(service.handleWebhook(event)).resolves.not.toThrow();
    });
  });

  describe('private methods', () => {
    it('should handle checkout completed for new subscription', async () => {
      const session = {
        customer: 'cus_test123',
        subscription: 'sub_test123',
        metadata: {
          userId: '1',
          tier: SubscriptionTier.PROFESSIONAL,
        },
      } as any as Stripe.Checkout.Session;

      mockSubscriptionRepository.findOne.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockReturnValue(mockSubscription);
      mockSubscriptionRepository.save.mockResolvedValue(mockSubscription);

      await (service as any).handleCheckoutCompleted(session);

      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith({
        userId: session.metadata!.userId,
        tier: session.metadata!.tier,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should update existing subscription on checkout completed', async () => {
      const session = {
        customer: 'cus_test123',
        subscription: 'sub_test123',
        metadata: {
          userId: '1',
          tier: SubscriptionTier.PROFESSIONAL,
        },
      } as any as Stripe.Checkout.Session;

      const existingSubscription = { ...mockSubscription, status: SubscriptionStatus.INCOMPLETE };
      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockSubscriptionRepository.save.mockResolvedValue({
        ...existingSubscription,
        status: SubscriptionStatus.ACTIVE,
      });

      await (service as any).handleCheckoutCompleted(session);

      expect(mockSubscriptionRepository.save).toHaveBeenCalledWith({
        ...existingSubscription,
        status: SubscriptionStatus.ACTIVE,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
      });
    });

    it('should map Stripe status correctly', () => {
      expect((service as any).mapStripeStatus('active')).toBe(SubscriptionStatus.ACTIVE);
      expect((service as any).mapStripeStatus('canceled')).toBe(SubscriptionStatus.CANCELED);
      expect((service as any).mapStripeStatus('incomplete')).toBe(SubscriptionStatus.INCOMPLETE);
      expect((service as any).mapStripeStatus('past_due')).toBe(SubscriptionStatus.PAST_DUE);
      expect((service as any).mapStripeStatus('unknown')).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  describe('subscription lifecycle operations', () => {
    it('upgrades subscriptions through a valid upgrade path', async () => {
      const existingSubscription = {
        ...mockSubscription,
        tier: SubscriptionTier.STARTER,
        status: SubscriptionStatus.ACTIVE,
        metadata: {},
      };
      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockSubscriptionRepository.save.mockImplementation(async (row) => row);

      const result = await service.upgradeSubscription(
        '1',
        SubscriptionTier.PROFESSIONAL,
        'need simulation access',
      );

      expect(mockSubscriptionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: SubscriptionTier.PROFESSIONAL,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          metadata: expect.objectContaining({
            lifecycleLastAction: 'upgrade',
            lifecycleLastReason: 'need simulation access',
          }),
        }),
      );
      expect(result.lifecycle.statusLabel).toBe('Active');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'subscription_lifecycle',
          metadata: expect.objectContaining({ action: 'upgrade' }),
        }),
      );
    });

    it('downgrades subscriptions through a valid downgrade path', async () => {
      const existingSubscription = {
        ...mockSubscription,
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        metadata: {},
      };
      mockSubscriptionRepository.findOne.mockResolvedValue(existingSubscription);
      mockSubscriptionRepository.save.mockImplementation(async (row) => row);

      const result = await service.downgradeSubscription('1', SubscriptionTier.PROFESSIONAL);

      expect(result.subscription.tier).toBe(SubscriptionTier.PROFESSIONAL);
      expect(result.lifecycle.plan.id).toBe(SubscriptionTier.PROFESSIONAL);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ action: 'downgrade' }),
        }),
      );
    });

    it('rejects invalid upgrade paths', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(service.upgradeSubscription('1', SubscriptionTier.STARTER)).rejects.toThrow(
        'Requested tier is not a valid upgrade path.',
      );
    });

    it('converts active trials to a paid plan', async () => {
      const existingTrial = {
        ...mockSubscription,
        tier: SubscriptionTier.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        trialStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        metadata: {},
      };
      mockSubscriptionRepository.findOne.mockResolvedValue(existingTrial);
      mockSubscriptionRepository.save.mockImplementation(async (row) => row);

      const result = await service.convertTrial(
        '1',
        SubscriptionTier.STARTER,
        'customer converted',
      );

      expect(result.subscription).toEqual(
        expect.objectContaining({
          tier: SubscriptionTier.STARTER,
          status: SubscriptionStatus.ACTIVE,
          trialStart: null,
          trialEnd: null,
          metadata: expect.objectContaining({
            lifecycleLastAction: 'trial-conversion',
          }),
        }),
      );
      expect(result.lifecycle.isTrial).toBe(false);
    });

    it('resolves lifecycle entitlements for plan-gated features', async () => {
      mockSubscriptionRepository.findOne.mockResolvedValue({
        ...mockSubscription,
        tier: SubscriptionTier.ENTERPRISE,
        status: SubscriptionStatus.SUSPENDED,
      });

      const decision = await service.resolveEntitlement(
        '1',
        SubscriptionTier.PROFESSIONAL,
        'simulation-suite',
      );

      expect(decision).toMatchObject({
        featureId: 'simulation-suite',
        isEntitled: false,
        statusLabel: 'Suspended',
        reason: 'subscription-suspended',
      });
    });
  });
});
