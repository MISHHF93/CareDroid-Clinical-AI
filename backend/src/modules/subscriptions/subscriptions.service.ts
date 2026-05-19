import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, SubscriptionTier, SubscriptionStatus } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

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
        return this.configService.get<string>('stripe.plans.free.priceId');
      case SubscriptionTier.PROFESSIONAL:
        return this.configService.get<string>('stripe.plans.professional.priceId');
      case SubscriptionTier.INSTITUTIONAL:
        return this.configService.get<string>('stripe.plans.institutional.priceId');
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
    return [
      {
        id: 'free',
        name: this.configService.get<string>('stripe.plans.free.name'),
        price: this.configService.get<number>('stripe.plans.free.price'),
        features: this.configService.get<string[]>('stripe.plans.free.features'),
      },
      {
        id: 'professional',
        name: this.configService.get<string>('stripe.plans.professional.name'),
        price: this.configService.get<number>('stripe.plans.professional.price'),
        features: this.configService.get<string[]>('stripe.plans.professional.features'),
      },
      {
        id: 'institutional',
        name: this.configService.get<string>('stripe.plans.institutional.name'),
        price: this.configService.get<number>('stripe.plans.institutional.price'),
        features: this.configService.get<string[]>('stripe.plans.institutional.features'),
      },
    ];
  }

  async getUserSubscription(userId: string) {
    return this.subscriptionRepository.findOne({ where: { userId } });
  }
}
