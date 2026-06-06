import { Subscription, SubscriptionStatus, SubscriptionTier } from './entities/subscription.entity';
import {
  getSubscriptionPlanDefinition,
  normalizeSubscriptionTier,
} from './subscription-plans.config';

export enum SubscriptionLifecycleState {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

export type SubscriptionMovement = 'upgrade' | 'downgrade' | 'same-plan';

export const SUPPORTED_SAAS_TIERS = Object.freeze([
  SubscriptionTier.TRIAL,
  SubscriptionTier.STARTER,
  SubscriptionTier.PROFESSIONAL,
  SubscriptionTier.ENTERPRISE,
  SubscriptionTier.ACADEMIC,
  SubscriptionTier.GOVERNMENT,
]);

const PLAN_RANK: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 1,
  [SubscriptionTier.TRIAL]: 0,
  [SubscriptionTier.STARTER]: 1,
  [SubscriptionTier.PROFESSIONAL]: 2,
  [SubscriptionTier.ACADEMIC]: 2,
  [SubscriptionTier.INSTITUTIONAL]: 3,
  [SubscriptionTier.ENTERPRISE]: 3,
  [SubscriptionTier.GOVERNMENT]: 3,
};

const STATUS_LABELS: Record<SubscriptionLifecycleState, string> = {
  [SubscriptionLifecycleState.ACTIVE]: 'Active',
  [SubscriptionLifecycleState.SUSPENDED]: 'Suspended',
  [SubscriptionLifecycleState.EXPIRED]: 'Expired',
  [SubscriptionLifecycleState.CANCELLED]: 'Cancelled',
  [SubscriptionLifecycleState.PENDING]: 'Pending',
};

export function lifecycleStatusLabel(state: SubscriptionLifecycleState) {
  return STATUS_LABELS[state] || STATUS_LABELS[SubscriptionLifecycleState.PENDING];
}

export function normalizeLifecycleState(
  subscription?: Partial<Subscription> | null,
  now = new Date(),
): SubscriptionLifecycleState {
  const status = subscription?.status;
  const trialEnd = subscription?.trialEnd ? new Date(subscription.trialEnd) : null;
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const tier = subscription?.tier;

  if (
    status === SubscriptionStatus.CANCELED ||
    status === SubscriptionStatus.CANCELLED ||
    subscription?.canceledAt
  ) {
    return SubscriptionLifecycleState.CANCELLED;
  }

  if (status === SubscriptionStatus.SUSPENDED || status === SubscriptionStatus.PAST_DUE) {
    return SubscriptionLifecycleState.SUSPENDED;
  }

  if (
    status === SubscriptionStatus.EXPIRED ||
    status === SubscriptionStatus.INCOMPLETE_EXPIRED ||
    (tier === SubscriptionTier.TRIAL && trialEnd && trialEnd.getTime() < now.getTime()) ||
    (periodEnd && periodEnd.getTime() < now.getTime() && status !== SubscriptionStatus.ACTIVE)
  ) {
    return SubscriptionLifecycleState.EXPIRED;
  }

  if (status === SubscriptionStatus.PENDING || status === SubscriptionStatus.INCOMPLETE) {
    return SubscriptionLifecycleState.PENDING;
  }

  return SubscriptionLifecycleState.ACTIVE;
}

export function subscriptionPlanRank(tier?: SubscriptionTier | string | null) {
  return PLAN_RANK[normalizeSubscriptionTier(tier) as SubscriptionTier] ?? 0;
}

export function classifySubscriptionMovement(
  currentTier?: SubscriptionTier | string | null,
  targetTier?: SubscriptionTier | string | null,
): SubscriptionMovement {
  const currentRank = subscriptionPlanRank(currentTier);
  const targetRank = subscriptionPlanRank(targetTier);
  if (targetRank > currentRank) return 'upgrade';
  if (targetRank < currentRank) return 'downgrade';
  return 'same-plan';
}

export function isSupportedSaasTier(tier?: SubscriptionTier | string | null) {
  return SUPPORTED_SAAS_TIERS.includes(normalizeSubscriptionTier(tier) as SubscriptionTier);
}

export function canUpgradeSubscription(
  currentTier?: SubscriptionTier | string | null,
  targetTier?: SubscriptionTier | string | null,
) {
  const current = normalizeSubscriptionTier(currentTier);
  const target = normalizeSubscriptionTier(targetTier);
  if (!isSupportedSaasTier(target) || target === SubscriptionTier.TRIAL) return false;
  return subscriptionPlanRank(target) > subscriptionPlanRank(current);
}

export function canDowngradeSubscription(
  currentTier?: SubscriptionTier | string | null,
  targetTier?: SubscriptionTier | string | null,
) {
  const current = normalizeSubscriptionTier(currentTier);
  const target = normalizeSubscriptionTier(targetTier);
  if (!isSupportedSaasTier(target) || target === SubscriptionTier.TRIAL) return false;
  return subscriptionPlanRank(target) < subscriptionPlanRank(current);
}

export function resolveLifecycleEntitlement(input: {
  subscription?: Partial<Subscription> | null;
  currentTier?: SubscriptionTier | string | null;
  requiredTier?: SubscriptionTier | string | null;
  now?: Date;
}) {
  const state = normalizeLifecycleState(input.subscription, input.now);
  const plan = normalizeSubscriptionTier(input.currentTier || input.subscription?.tier);
  const requiredPlan = normalizeSubscriptionTier(input.requiredTier);
  const lifecycleAllowsPaidAccess = state === SubscriptionLifecycleState.ACTIVE;
  const planAllowsAccess = subscriptionPlanRank(plan) >= subscriptionPlanRank(requiredPlan);
  const isEntitled = lifecycleAllowsPaidAccess && planAllowsAccess;

  return {
    state,
    statusLabel: lifecycleStatusLabel(state),
    plan,
    planName: getSubscriptionPlanDefinition(plan).name,
    requiredPlan,
    requiredPlanName: getSubscriptionPlanDefinition(requiredPlan).name,
    isEntitled,
    reason: !lifecycleAllowsPaidAccess
      ? `subscription-${state}`
      : planAllowsAccess
        ? 'entitled'
        : 'plan-upgrade-required',
  };
}

export function buildLifecycleSummary(
  subscription?: Partial<Subscription> | null,
  now = new Date(),
) {
  const state = normalizeLifecycleState(subscription, now);
  const tier = normalizeSubscriptionTier(subscription?.tier);
  const plan = getSubscriptionPlanDefinition(tier);
  return {
    tier,
    plan,
    state,
    status: state,
    statusLabel: lifecycleStatusLabel(state),
    isTrial: tier === SubscriptionTier.TRIAL,
    isActive: state === SubscriptionLifecycleState.ACTIVE,
    canUsePaidEntitlements: state === SubscriptionLifecycleState.ACTIVE,
    trial: {
      startsAt: subscription?.trialStart || null,
      endsAt: subscription?.trialEnd || null,
    },
    period: {
      startsAt: subscription?.currentPeriodStart || null,
      endsAt: subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
      canceledAt: subscription?.canceledAt || null,
    },
    supportedPlans: SUPPORTED_SAAS_TIERS.map((supportedTier) =>
      getSubscriptionPlanDefinition(supportedTier),
    ),
  };
}
