import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  EntitlementAccessState,
  getEntitlementRuleForAsset,
  subscriptionMeetsRequirement,
} from '../../config/entitlements.config';
import { FeatureFlagState } from '../../config/featureFlags.config';
import { SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { SubscriptionLifecycleState } from '../subscriptions/subscription-lifecycle.engine';
import { UserRole } from '../users/entities/user.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { OrganizationMembershipRole } from '../organizations/entities/organization-membership.entity';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import {
  EntitlementStatus,
  PlatformAssetLifecycle,
  PricingTier,
} from './enums/platform-asset.enums';
import { FeatureFlagService } from './feature-flag.service';
import { AutomationAuditService } from '../automation-audit/automation-audit.service';
import { AutomationAuditStatus } from '../automation-audit/entities/automation-audit-event.entity';

export interface EntitlementDecisionInput {
  assetId: string;
  asset?: Partial<PlatformAsset> | null;
  organization?: Partial<Organization> | null;
  organizationId?: string | null;
  userRole?: UserRole | string;
  subscriptionPlan?: SubscriptionTier | string;
  subscriptionLifecycleState?: SubscriptionLifecycleState | string | null;
  entitledAssetIds?: string[];
  entitledPackIds?: string[];
  strictEntitlements?: boolean;
  userId?: string | null;
  workspaceId?: string | null;
}

export interface EntitlementDecision {
  assetId: string;
  state: EntitlementAccessState | FeatureFlagState;
  rolloutState: FeatureFlagState;
  isVisible: boolean;
  isLaunchable: boolean;
  reason: string;
  requiredPlan?: string;
  requiredPacks?: string[];
  featureFlagId?: string;
}

@Injectable()
export class EntitlementService {
  constructor(
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
    private readonly featureFlagService: FeatureFlagService,
    @Optional() private readonly automationAuditService?: AutomationAuditService,
  ) {}

  async getEnabledPackIdsForOrganization(organizationId?: string | null): Promise<string[]> {
    if (!organizationId) return [];
    const rows = await this.entitlementRepository.find({
      where: { organizationId, status: EntitlementStatus.ENABLED },
    });
    return rows.map((row) => row.packId);
  }

  async resolveEntitledAssetIdsForPacks(packIds: string[]): Promise<string[]> {
    if (!packIds.length) return [];
    const packs = await this.packRepository.find({ where: { id: In(packIds) } });
    const ids = new Set<string>();
    packs.forEach((pack) => pack.assetIds?.forEach((assetId) => ids.add(assetId)));
    return [...ids];
  }

  async resolveDecision(input: EntitlementDecisionInput): Promise<EntitlementDecision> {
    const entitledPackIds =
      input.entitledPackIds ||
      (await this.getEnabledPackIdsForOrganization(input.organizationId || input.organization?.id));
    const entitledAssetIds =
      input.entitledAssetIds || (await this.resolveEntitledAssetIdsForPacks(entitledPackIds));
    return this.resolveDecisionFromContext({
      ...input,
      entitledAssetIds,
      entitledPackIds,
    });
  }

  resolveDecisionFromContext(input: EntitlementDecisionInput): EntitlementDecision {
    const assetId = input.assetId;
    const rule = getEntitlementRuleForAsset(assetId);
    const featureFlagId =
      rule?.featureFlagId || this.featureFlagService.getFeatureFlagForAsset(assetId)?.id;
    const rolloutState = this.featureFlagService.resolveState(
      featureFlagId,
      input.organization?.settings as Record<string, any>,
    );

    const base = {
      assetId,
      rolloutState,
      featureFlagId,
      requiredPlan: rule?.requiredPlan,
      requiredPacks: rule?.requiredPackIds || [],
    };

    if (rolloutState === FeatureFlagState.DISABLED) {
      return {
        ...base,
        state: EntitlementAccessState.DISABLED,
        isVisible: false,
        isLaunchable: false,
        reason: 'feature-disabled',
      };
    }
    if (rolloutState === FeatureFlagState.LOCKED) {
      return {
        ...base,
        state: EntitlementAccessState.LOCKED,
        isVisible: true,
        isLaunchable: false,
        reason: 'feature-locked',
      };
    }
    if (rolloutState === FeatureFlagState.SUBSCRIPTION_REQUIRED) {
      return {
        ...base,
        state: EntitlementAccessState.SUBSCRIPTION_REQUIRED,
        isVisible: true,
        isLaunchable: false,
        reason: 'feature-subscription-required',
      };
    }

    if (input.asset?.lifecycle === PlatformAssetLifecycle.ARCHIVED) {
      return {
        ...base,
        state: EntitlementAccessState.DISABLED,
        isVisible: false,
        isLaunchable: false,
        reason: 'asset-archived',
      };
    }

    if (input.asset?.lifecycle === PlatformAssetLifecycle.DRAFT) {
      return {
        ...base,
        state: EntitlementAccessState.DISABLED,
        isVisible: false,
        isLaunchable: false,
        reason: 'asset-draft',
      };
    }

    if (!this.isAllowedRole(input.asset, input.userRole)) {
      return {
        ...base,
        state: EntitlementAccessState.DISABLED,
        isVisible: false,
        isLaunchable: false,
        reason: 'role-hidden',
      };
    }

    const adminOnly =
      rule?.adminOnly ||
      rolloutState === FeatureFlagState.ADMIN_ONLY ||
      this.isAdminOnlyAsset(input.asset);
    if (adminOnly && !this.isAdminRole(input.userRole)) {
      return {
        ...base,
        state: EntitlementAccessState.ADMIN_ONLY,
        isVisible: true,
        isLaunchable: false,
        reason: 'admin-only',
      };
    }

    if (
      input.subscriptionLifecycleState &&
      input.subscriptionLifecycleState !== SubscriptionLifecycleState.ACTIVE
    ) {
      return {
        ...base,
        state: EntitlementAccessState.SUBSCRIPTION_REQUIRED,
        isVisible: true,
        isLaunchable: false,
        reason: `subscription-${input.subscriptionLifecycleState}`,
      };
    }

    const currentPlan = input.subscriptionPlan || SubscriptionTier.FREE;
    const requiredPlan = rule?.requiredPlan || this.planForPricingTier(input.asset?.pricingTier);
    if (!subscriptionMeetsRequirement(currentPlan, requiredPlan)) {
      return {
        ...base,
        requiredPlan,
        state: EntitlementAccessState.SUBSCRIPTION_REQUIRED,
        isVisible: true,
        isLaunchable: false,
        reason: 'subscription-required',
      };
    }

    const entitled = new Set(input.entitledAssetIds || []);
    const entitledPacks = new Set(input.entitledPackIds || []);
    const requiredPacks = rule?.requiredPackIds || input.asset?.packIds || [];
    const hasOrganization = Boolean(input.organizationId || input.organization?.id);
    const missingPack = requiredPacks.find((packId) => !entitledPacks.has(packId));
    const strict = Boolean(input.strictEntitlements);

    if (hasOrganization && ((strict && !entitled.has(assetId)) || missingPack)) {
      return {
        ...base,
        requiredPacks,
        state: EntitlementAccessState.LOCKED,
        isVisible: true,
        isLaunchable: false,
        reason: missingPack ? 'pack-required' : 'asset-not-entitled',
      };
    }

    const state =
      input.asset?.lifecycle === PlatformAssetLifecycle.BETA
        ? FeatureFlagState.BETA
        : rolloutState === FeatureFlagState.BETA || rolloutState === FeatureFlagState.EXPERIMENTAL
          ? rolloutState
          : EntitlementAccessState.ALLOWED;

    return {
      ...base,
      state,
      isVisible: true,
      isLaunchable: true,
      reason:
        input.asset?.lifecycle === PlatformAssetLifecycle.BETA
          ? 'asset-beta'
          : rolloutState === state
            ? `rollout-${state}`
            : 'allowed',
    };
  }

  async assertLaunchAllowed(input: EntitlementDecisionInput): Promise<EntitlementDecision> {
    const decision = await this.resolveDecision(input);
    if (!decision.isLaunchable) {
      await this.recordBlockedLaunch(input, decision);
      throw new ForbiddenException(
        `Feature access denied: ${decision.reason}${decision.requiredPlan ? ` (${decision.requiredPlan})` : ''}`,
      );
    }
    return decision;
  }

  private async recordBlockedLaunch(
    input: EntitlementDecisionInput,
    decision: EntitlementDecision,
  ) {
    if (!this.automationAuditService) return;

    try {
      await this.automationAuditService.createEvent(
        {
          triggerFired: 'Asset launch requested',
          conditionsEvaluated: [
            {
              label: `rollout:${decision.rolloutState}`,
              result: decision.reason !== 'feature-disabled',
            },
            { label: `entitlement:${decision.reason}`, result: false },
          ],
          actionSelected: 'Launch asset',
          user: {
            id: input.userId || 'system',
            name: input.userId || 'System',
          },
          tenant: {
            id: input.organizationId || input.organization?.id || 'unknown-tenant',
            name: input.organization?.name || input.organizationId || 'Unknown tenant',
          },
          workspace: {
            id: input.workspaceId || 'unknown-workspace',
            name: input.workspaceId || 'Unknown workspace',
          },
          aiInvolvement: {
            involved: input.assetId.startsWith('agent-') || input.assetId.includes('ai'),
            summary: 'Entitlement gate blocked the asset launch before execution.',
          },
          toolCalled: input.assetId,
          backendEndpoint: '/api/platform-assets/entitlements',
          status: AutomationAuditStatus.BLOCKED,
          reason: decision.reason,
          timestamp: new Date().toISOString(),
          reviewer: {
            required: true,
            name: 'Entitlement administrator',
          },
        },
        {
          organizationId: input.organizationId || input.organization?.id,
          workspaceId: input.workspaceId,
        },
        {
          id: input.userId || undefined,
        },
      );
    } catch {
      // Access denial must not depend on secondary audit persistence.
    }
  }

  private planForPricingTier(tier?: string): SubscriptionTier {
    if (tier === PricingTier.ENTERPRISE || tier === PricingTier.ADDON) {
      return SubscriptionTier.INSTITUTIONAL;
    }
    if (tier === PricingTier.STANDARD) return SubscriptionTier.PROFESSIONAL;
    return SubscriptionTier.FREE;
  }

  private isAdminRole(role?: string) {
    return [
      UserRole.ADMIN,
      OrganizationMembershipRole.ADMIN,
      OrganizationMembershipRole.OWNER,
    ].includes(role as UserRole | OrganizationMembershipRole);
  }

  private isAllowedRole(asset?: Partial<PlatformAsset> | null, role?: string) {
    const permissionPolicy = asset?.permissionPolicy || {};
    const allowedRoles = Array.isArray((permissionPolicy as any).allowedRoles)
      ? ((permissionPolicy as any).allowedRoles as string[])
      : [];
    if (!allowedRoles.length || !role) return true;
    const normalizedRole = role.toLowerCase();
    return allowedRoles.map((item) => item.toLowerCase()).includes(normalizedRole);
  }

  private isAdminOnlyAsset(asset?: Partial<PlatformAsset> | null) {
    const governance = asset?.governance || {};
    const permissionPolicy = asset?.permissionPolicy || {};
    return (
      governance.adminOnly === true ||
      governance.visibility === 'admin-only' ||
      governance.audience === 'admin-only' ||
      permissionPolicy.adminOnly === true
    );
  }
}
