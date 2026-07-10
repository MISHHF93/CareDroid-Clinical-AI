import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CustomerPortalDto } from './dto/customer-portal.dto';
import { RecordUsageEventDto } from './dto/record-usage-event.dto';
import {
  ResolveSubscriptionEntitlementDto,
  SubscriptionPlanTransitionDto,
} from './dto/subscription-lifecycle.dto';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Permission } from '../auth/enums/permission.enum';
import { OrganizationScoped, TenantScoped } from '../tenant-context/tenant-scope.decorator';
import { TenantIsolationGuard } from '../tenant-context/tenant-isolation.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  private stripe: Stripe;

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecret = this.configService.get<string>('stripe.secretKey');
    this.stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16',
    });
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of subscription plans' })
  async getPlans() {
    return this.subscriptionsService.getSubscriptionPlans();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get Stripe public configuration' })
  @ApiResponse({ status: 200, description: 'Stripe publishable key' })
  async getStripeConfig() {
    const publishableKey = this.configService.get<string>('stripe.publishableKey') || '';
    return { publishableKey };
  }

  @Post('create-checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout session for subscription' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  async createCheckoutSession(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    return this.subscriptionsService.createCheckoutSession(
      req.user.id,
      dto.tier,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Post('portal')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create customer portal session' })
  @ApiResponse({ status: 200, description: 'Portal session created' })
  async createPortalSession(@Req() req: any, @Body() dto: CustomerPortalDto) {
    return this.subscriptionsService.createCustomerPortalSession(req.user.id, dto.returnUrl);
  }

  @Get('current')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiResponse({ status: 200, description: 'Current subscription' })
  async getCurrentSubscription(@Req() req: any) {
    return this.subscriptionsService.getUserSubscription(req.user.id);
  }

  @Get('lifecycle')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription lifecycle and SaaS state' })
  async getLifecycle(@Req() req: any) {
    return this.subscriptionsService.getSubscriptionLifecycle(req.user.id);
  }

  @Post('entitlements/resolve')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve subscription lifecycle entitlement for a plan-gated feature' })
  async resolveEntitlement(@Req() req: any, @Body() dto: ResolveSubscriptionEntitlementDto) {
    return this.subscriptionsService.resolveEntitlement(
      req.user.id,
      dto.requiredTier,
      dto.featureId,
    );
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.MANAGE_SUBSCRIPTIONS] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade current subscription through the SaaS lifecycle engine' })
  async upgrade(@Req() req: any, @Body() dto: SubscriptionPlanTransitionDto) {
    return this.subscriptionsService.upgradeSubscription(req.user.id, dto.targetTier, dto.reason);
  }

  @Post('downgrade')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.MANAGE_SUBSCRIPTIONS] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Downgrade current subscription through the SaaS lifecycle engine' })
  async downgrade(@Req() req: any, @Body() dto: SubscriptionPlanTransitionDto) {
    return this.subscriptionsService.downgradeSubscription(req.user.id, dto.targetTier, dto.reason);
  }

  @Post('trial/convert')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.MANAGE_SUBSCRIPTIONS] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Convert a trial subscription to a paid or contracted plan' })
  async convertTrial(@Req() req: any, @Body() dto: SubscriptionPlanTransitionDto) {
    return this.subscriptionsService.convertTrial(req.user.id, dto.targetTier, dto.reason);
  }

  @Get('billing')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.MANAGE_SUBSCRIPTIONS] })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get organization billing overview and current usage against plan limits',
  })
  async getBillingOverview(@Req() req: any) {
    return this.subscriptionsService.getBillingOverview(req.user.id, req.tenantContext);
  }

  @Get('usage')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.VIEW_ANALYTICS] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization usage summary by workspace, asset, role, and period' })
  async getUsageSummary(@Req() req: any, @Query('period') period?: string) {
    return this.subscriptionsService.getUsageSummary(req.tenantContext, period || 'month');
  }

  @Get('usage/metering')
  @UseGuards(AuthGuard('jwt'), TenantIsolationGuard)
  @OrganizationScoped({ admin: 'organization', permissions: [Permission.VIEW_ANALYTICS] })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get billing-neutral usage metering framework summary' })
  async getUsageMeteringFramework(@Req() req: any, @Query('period') period?: string) {
    return this.subscriptionsService.getUsageMeteringFramework(
      req.tenantContext,
      period || 'month',
    );
  }

  @Post('usage/events')
  @UseGuards(AuthGuard('jwt'))
  @TenantScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record a frontend-visible usage event such as a tool launch' })
  async recordUsageEvent(@Req() req: any, @Body() dto: RecordUsageEventDto) {
    const usageEvent = await this.subscriptionsService.recordUsageEvent(req.tenantContext, dto);
    return { ok: true, id: usageEvent?.id || null };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    try {
      const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
      event = this.stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err) {
      console.error(
        'Webhook signature verification failed:',
        err instanceof Error ? err.message : String(err),
      );
      return { error: 'Webhook signature verification failed' };
    }

    await this.subscriptionsService.handleWebhook(event);

    return { received: true };
  }
}
