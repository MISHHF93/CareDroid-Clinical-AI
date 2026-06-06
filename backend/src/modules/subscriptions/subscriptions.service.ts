import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import {
  normalizeSubscriptionTier,
  getSubscriptionPlanDefinition,
  SUBSCRIPTION_PLAN_DEFINITIONS,
  UsageEventType,
} from './subscription-plans.config';
import { UsageMeteringService } from './usage-metering.service';
import {
  buildLifecycleSummary,
  canDowngradeSubscription,
  canUpgradeSubscription,
  classifySubscriptionMovement,
  resolveLifecycleEntitlement,
  SubscriptionLifecycleState,
} from './subscription-lifecycle.engine';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe: Stripe | null;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Optional() private readonly usageMeteringService?: UsageMeteringService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      this.logger.warn('Stripe secret key not configured. Payment features will be disabled.');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async createCheckoutSession(
    userId: string,
    tier: SubscriptionTier,
    successUrl?: string,
    cancelUrl?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionRepository.findOne({ where: { userId } });

    // Create or get Stripe customer
    let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    // Get price ID for tier
    const priceId = this.getPriceIdForTier(tier);
    if (!priceId) {
      throw new BadRequestException('Invalid subscription tier');
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || this.configService.get<string>('stripe.successUrl'),
      cancel_url: cancelUrl || this.configService.get<string>('stripe.cancelUrl'),
      metadata: {
        userId: user.id,
        tier,
      },
    });

    // Audit log
    await this.auditService.log({
      userId: user.id,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'checkout_session',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: { tier, sessionId: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createCustomerPortalSession(userId: string, returnUrl?: string) {
    const subscription = await this.subscriptionRepository.findOne({ where: { userId } });
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl || this.configService.get<string>('stripe.successUrl'),
    });

    return { url: session.url };
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const tier = (session.metadata?.tier as SubscriptionTier) || SubscriptionTier.FREE;

    let subscription = await this.subscriptionRepository.findOne({ where: { userId } });

    if (subscription) {
      subscription.stripeCustomerId = session.customer as string;
      subscription.stripeSubscriptionId = session.subscription as string;
      subscription.tier = tier;
      subscription.status = SubscriptionStatus.ACTIVE;
    } else {
      subscription = this.subscriptionRepository.create({
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        tier,
        status: SubscriptionStatus.ACTIVE,
      });
    }

    await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      userId,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'subscription',
      ipAddress: '0.0.0.0',
      userAgent: 'stripe_webhook',
      metadata: { tier, status: 'checkout_completed' },
    });
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    subscription.status = this.mapStripeStatus(stripeSubscription.status);
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    if (stripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }

    await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      userId: subscription.userId,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'subscription',
      ipAddress: '0.0.0.0',
      userAgent: 'stripe_webhook',
      metadata: { status: subscription.status },
    });
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.CANCELED;
    subscription.tier = SubscriptionTier.FREE;
    subscription.canceledAt = new Date();

    await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      userId: subscription.userId,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'subscription',
      ipAddress: '0.0.0.0',
      userAgent: 'stripe_webhook',
      metadata: { status: 'canceled' },
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepository.save(subscription);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!subscription) return;

    subscription.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepository.save(subscription);

    await this.auditService.log({
      userId: subscription.userId,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'subscription',
      ipAddress: '0.0.0.0',
      userAgent: 'stripe_webhook',
      metadata: { status: 'past_due', invoiceId: invoice.id },
    });
  }

  private getPriceIdForTier(tier: SubscriptionTier): string | null {
    switch (tier) {
      case SubscriptionTier.FREE:
      case SubscriptionTier.TRIAL:
      case SubscriptionTier.STARTER:
        return this.configService.get<string>('stripe.plans.free.priceId');
      case SubscriptionTier.PROFESSIONAL:
        return this.configService.get<string>('stripe.plans.professional.priceId');
      case SubscriptionTier.INSTITUTIONAL:
      case SubscriptionTier.ENTERPRISE:
        return this.configService.get<string>('stripe.plans.institutional.priceId');
      case SubscriptionTier.ACADEMIC:
        return (
          this.configService.get<string>('stripe.plans.academic.priceId') ||
          this.configService.get<string>('stripe.plans.professional.priceId')
        );
      case SubscriptionTier.GOVERNMENT:
        return (
          this.configService.get<string>('stripe.plans.government.priceId') ||
          this.configService.get<string>('stripe.plans.institutional.priceId')
        );
      default:
        return null;
    }
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'incomplete':
        return SubscriptionStatus.INCOMPLETE;
      case 'incomplete_expired':
        return SubscriptionStatus.INCOMPLETE_EXPIRED;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  async getSubscriptionPlans() {
    return SUBSCRIPTION_PLAN_DEFINITIONS.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.priceMonthly,
      priceMonthly: plan.priceMonthly,
      features: plan.features,
      limits: plan.limits,
    }));
  }

  async getUserSubscription(userId: string) {
    return this.subscriptionRepository.findOne({ where: { userId } });
  }

  async getSubscriptionLifecycle(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    return {
      subscription,
      lifecycle: buildLifecycleSummary(subscription),
    };
  }

  async resolveEntitlement(userId: string, requiredTier: SubscriptionTier, featureId?: string) {
    const subscription = await this.getUserSubscription(userId);
    return {
      featureId: featureId || null,
      ...resolveLifecycleEntitlement({
        subscription,
        currentTier: subscription?.tier,
        requiredTier,
      }),
    };
  }

  async upgradeSubscription(userId: string, targetTier: SubscriptionTier, reason?: string) {
    const subscription = await this.ensureLifecycleSubscription(userId);
    if (!canUpgradeSubscription(subscription.tier, targetTier)) {
      throw new BadRequestException('Requested tier is not a valid upgrade path.');
    }
    return this.applyPlanTransition(subscription, targetTier, 'upgrade', reason);
  }

  async downgradeSubscription(userId: string, targetTier: SubscriptionTier, reason?: string) {
    const subscription = await this.ensureLifecycleSubscription(userId);
    if (!canDowngradeSubscription(subscription.tier, targetTier)) {
      throw new BadRequestException('Requested tier is not a valid downgrade path.');
    }
    return this.applyPlanTransition(subscription, targetTier, 'downgrade', reason);
  }

  async convertTrial(userId: string, targetTier: SubscriptionTier, reason?: string) {
    const subscription = await this.ensureLifecycleSubscription(userId);
    const lifecycle = buildLifecycleSummary(subscription);
    const normalizedTarget = normalizeSubscriptionTier(targetTier);
    if (normalizedTarget === SubscriptionTier.TRIAL) {
      throw new BadRequestException('Trial conversion requires a paid or contracted target plan.');
    }
    if (!lifecycle.isTrial) {
      throw new BadRequestException('Only trial subscriptions can be converted.');
    }
    if (
      lifecycle.state !== SubscriptionLifecycleState.ACTIVE &&
      lifecycle.state !== SubscriptionLifecycleState.PENDING
    ) {
      throw new BadRequestException('Trial must be active or pending before conversion.');
    }

    subscription.tier = normalizedTarget;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.trialStart = null;
    subscription.trialEnd = null;
    subscription.metadata = {
      ...(subscription.metadata || {}),
      lifecycleLastAction: 'trial-conversion',
      lifecycleLastReason: reason || null,
      lifecycleLastChangedAt: new Date().toISOString(),
    };

    const saved = await this.subscriptionRepository.save(subscription);
    await this.logLifecycleChange(userId, 'trial-conversion', normalizedTarget, reason);
    return {
      subscription: saved,
      lifecycle: buildLifecycleSummary(saved),
    };
  }

  async getBillingOverview(userId: string, tenantContext?: any) {
    const subscription = await this.getUserSubscription(userId);
    const currentPlan = getSubscriptionPlanDefinition(
      tenantContext?.subscriptionPlan || subscription?.tier,
    );
    const usageSummary =
      tenantContext?.organizationId && this.usageMeteringService
        ? await this.usageMeteringService.getUsageSummary({
            organizationId: tenantContext.organizationId,
            subscriptionPlan: currentPlan.id,
          })
        : null;

    return {
      organizationId: tenantContext?.organizationId || null,
      workspaceId: tenantContext?.workspaceId || null,
      currentSubscription: subscription,
      lifecycle: buildLifecycleSummary(subscription),
      currentPlan,
      plans: await this.getSubscriptionPlans(),
      usageSummary,
      status: subscription?.status || 'active',
      period: {
        start: subscription?.currentPeriodStart || usageSummary?.period?.start || null,
        end: subscription?.currentPeriodEnd || usageSummary?.period?.end || null,
      },
    };
  }

  async getUsageSummary(tenantContext: any, period = 'month') {
    if (!tenantContext?.organizationId || !this.usageMeteringService) {
      return {
        organizationId: tenantContext?.organizationId || null,
        period,
        plan: getSubscriptionPlanDefinition(tenantContext?.subscriptionPlan),
        totals: [],
        activeUsers: 0,
        breakdowns: {
          byWorkspace: [],
          byAsset: [],
          byRole: [],
          byEventType: [],
        },
        recentEvents: [],
      };
    }

    return this.usageMeteringService.getUsageSummary({
      organizationId: tenantContext.organizationId,
      period,
      subscriptionPlan: tenantContext.subscriptionPlan,
    });
  }

  async getUsageMeteringFramework(tenantContext: any, period = 'month') {
    if (!tenantContext?.organizationId || !this.usageMeteringService) {
      return {
        organizationId: tenantContext?.organizationId || null,
        period,
        storage: {
          source: 'usage_events',
          billingSeparated: true,
        },
        meters: [],
        categories: {
          engagement: [],
          platform: [],
          integrations: [],
        },
        billingReadiness: {
          currentBilling: 'unavailable without an organization context',
          futureBillingCandidates: [],
          retainedDimensions: [],
        },
        breakdowns: {
          byWorkspace: [],
          byAsset: [],
          byRole: [],
          byMeter: [],
          bySource: [],
          byIntegration: [],
        },
        recentEvents: [],
      };
    }

    return this.usageMeteringService.getUsageMeteringFramework({
      organizationId: tenantContext.organizationId,
      period,
    });
  }

  async recordUsageEvent(tenantContext: any, dto: any) {
    if (!this.usageMeteringService) return null;
    return this.usageMeteringService.recordFromTenantContext(tenantContext, dto.eventType, {
      workspaceId: dto.workspaceId,
      assetId: dto.assetId,
      meterId: dto.meterId,
      source: dto.source,
      idempotencyKey: dto.idempotencyKey,
      quantity: dto.quantity,
      unit: dto.unit,
      metadata: dto.metadata,
    });
  }

  async recordAiUsageFromQuery(query: {
    organizationId?: string | null;
    workspaceId?: string | null;
    userId?: string | null;
    userRole?: string | null;
    subscriptionPlan?: string | null;
    assetId?: string | null;
    model?: string | null;
    totalTokens?: number;
    cost?: number;
  }) {
    if (!this.usageMeteringService) return null;
    return this.usageMeteringService.recordUsage({
      organizationId: query.organizationId,
      workspaceId: query.workspaceId,
      userId: query.userId,
      userRole: query.userRole,
      subscriptionPlan: query.subscriptionPlan,
      assetId: query.assetId,
      eventType: UsageEventType.AI_CALL,
      quantity: 1,
      metadata: {
        model: query.model,
        totalTokens: query.totalTokens,
        cost: query.cost,
      },
    });
  }

  private async ensureLifecycleSubscription(userId: string) {
    const existing = await this.getUserSubscription(userId);
    if (existing) return existing;

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);
    const subscription = this.subscriptionRepository.create({
      userId,
      tier: SubscriptionTier.TRIAL,
      status: SubscriptionStatus.ACTIVE,
      trialStart: now,
      trialEnd,
      metadata: {
        lifecycleCreatedBy: 'subscription-lifecycle-engine',
      },
    });
    return this.subscriptionRepository.save(subscription);
  }

  private async applyPlanTransition(
    subscription: Subscription,
    targetTier: SubscriptionTier,
    expectedMovement: 'upgrade' | 'downgrade',
    reason?: string,
  ) {
    const normalizedTarget = normalizeSubscriptionTier(targetTier);
    const movement = classifySubscriptionMovement(subscription.tier, normalizedTarget);
    if (movement !== expectedMovement) {
      throw new BadRequestException(`Requested tier is not a ${expectedMovement}.`);
    }

    subscription.tier = normalizedTarget;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelAtPeriodEnd = false;
    subscription.metadata = {
      ...(subscription.metadata || {}),
      lifecycleLastAction: expectedMovement,
      lifecycleLastReason: reason || null,
      lifecycleLastChangedAt: new Date().toISOString(),
    };

    const saved = await this.subscriptionRepository.save(subscription);
    await this.logLifecycleChange(subscription.userId, expectedMovement, normalizedTarget, reason);
    return {
      subscription: saved,
      lifecycle: buildLifecycleSummary(saved),
    };
  }

  private async logLifecycleChange(
    userId: string,
    action: string,
    targetTier: SubscriptionTier,
    reason?: string,
  ) {
    await this.auditService.log({
      userId,
      action: AuditAction.SUBSCRIPTION_CHANGE,
      resource: 'subscription_lifecycle',
      ipAddress: '0.0.0.0',
      userAgent: 'system',
      metadata: { action, targetTier, reason: reason || null },
    });
  }
}
