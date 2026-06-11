import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission, PermissionMetadata } from '../auth/enums/permission.enum';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import {
  FeatureFlagService,
  FeatureFlagUpdateInput,
} from '../platform-assets/feature-flag.service';
import { DEFAULT_PACKS_BY_ORGANIZATION_TYPE } from '../platform-assets/data/platform-asset-seed.data';
import { OrganizationType } from '../platform-assets/enums/platform-asset.enums';
import { IntegrationOffering } from '../product-catalog/entities/integration-offering.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { IntegrationStatus } from '../product-catalog/enums/product-catalog.enums';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
} from '../subscriptions/entities/subscription.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  BrandingModel,
  IntegrationModel,
  OrganizationEngineModel,
  SUPPORTED_ORGANIZATION_TYPES,
} from './organization-engine.models';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from './entities/organization-membership.entity';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(IntegrationOffering)
    private readonly integrationRepository: Repository<IntegrationOffering>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly platformAssetsService: PlatformAssetsService,
    @Optional() private readonly featureFlagService?: FeatureFlagService,
    @Optional() private readonly tenantProvisioningService?: TenantProvisioningService,
  ) {}

  async getCurrentForUser(user: User) {
    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    if (!profile?.organizationId) {
      return {
        organization: null,
        message: 'No organization linked. Create one in organization settings.',
      };
    }
    return this.getForUser(user, profile.organizationId);
  }

  async getCurrentEngineForUser(user: User) {
    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    if (!profile?.organizationId) {
      return {
        organization: null,
        engine: null,
        supportedOrganizationTypes: SUPPORTED_ORGANIZATION_TYPES,
        message: 'No organization linked. Create one in organization settings.',
      };
    }
    return this.getEngineForUser(user, profile.organizationId);
  }

  async listForUser(userId: string) {
    const memberships = await this.membershipRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) return [];
    const orgs = await this.organizationRepository.find({ where: { id: In(orgIds) } });
    return orgs.map((org) => ({
      ...this.serializeOrganization(org),
      membership: memberships.find((m) => m.organizationId === org.id),
    }));
  }

  async getForUser(user: User, organizationId: string) {
    await this.assertMember(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const entitlements =
      await this.platformAssetsService.getOrganizationEntitlements(organizationId);
    return {
      ...this.serializeOrganization(org),
      entitlements,
      engine: await this.buildOrganizationEngine(user, org),
    };
  }

  async getEngineForUser(user: User, organizationId: string) {
    await this.assertMember(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    return this.buildOrganizationEngine(user, org);
  }

  async getPublicWhiteLabel(tenantId: string) {
    const normalizedTenantId = String(tenantId || '').trim();
    if (!normalizedTenantId) throw new NotFoundException('Tenant not found');
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalizedTenantId,
      );
    const org = await this.organizationRepository.findOne({
      where: isUuid
        ? [{ id: normalizedTenantId }, { slug: normalizedTenantId }]
        : { slug: normalizedTenantId },
    });
    if (!org) throw new NotFoundException('Tenant not found');
    const settings = this.normalizeSettings(org.settings, org.organizationType);
    const branding = this.normalizeBranding(org.branding || settings.branding, org.name);
    return {
      tenantId: org.slug,
      organizationId: org.id,
      organizationName: org.name,
      organizationType: org.organizationType,
      branding,
    };
  }

  async create(user: User, dto: CreateOrganizationDto) {
    const existing = await this.organizationRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException(`Organization slug already exists: ${dto.slug}`);
    }

    const org = await this.organizationRepository.save(
      this.organizationRepository.create({
        name: dto.name,
        slug: dto.slug,
        organizationType: dto.organizationType,
        country: dto.country,
        branding: this.normalizeBranding(dto.branding, dto.name),
        settings: this.normalizeSettings(dto.settings, dto.organizationType),
      }),
    );

    await this.membershipRepository.save(
      this.membershipRepository.create({
        organizationId: org.id,
        userId: user.id,
        role: OrganizationMembershipRole.OWNER,
      }),
    );

    await this.linkUserToOrganization(user.id, org.id);
    if (this.tenantProvisioningService) {
      await this.tenantProvisioningService.provisionOrganization(user, org, {
        branding: dto.branding,
      });
    } else {
      await this.assignDefaultPacks(org.id, org.organizationType);
    }

    return this.getForUser(user, org.id);
  }

  async update(user: User, organizationId: string, dto: UpdateOrganizationDto) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.name !== undefined) org.name = dto.name;
    if (dto.organizationType !== undefined) {
      org.organizationType = dto.organizationType;
      await this.assignDefaultPacks(org.id, org.organizationType);
    }
    if (dto.country !== undefined) org.country = dto.country;
    if (dto.branding !== undefined) org.branding = this.normalizeBranding(dto.branding, org.name);
    if (dto.settings !== undefined) {
      org.settings = this.normalizeSettings(
        { ...(org.settings || {}), ...dto.settings },
        org.organizationType,
      );
    }

    await this.organizationRepository.save(org);
    return this.getForUser(user, org.id);
  }

  async setUserRoleProfile(userId: string, roleProfileId: string) {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('User profile not found');
    profile.roleProfileId = roleProfileId;
    await this.profileRepository.save(profile);
    return { roleProfileId };
  }

  private async assignDefaultPacks(organizationId: string, organizationType: OrganizationType) {
    const packIds = DEFAULT_PACKS_BY_ORGANIZATION_TYPE[organizationType] || ['core-platform'];
    for (const packId of packIds) {
      try {
        await this.platformAssetsService.installPackForOrganization(organizationId, packId);
      } catch {
        // pack may not be seeded yet during tests
      }
    }
  }

  private async linkUserToOrganization(userId: string, organizationId: string) {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) return;
    profile.organizationId = organizationId;
    await this.profileRepository.save(profile);
  }

  async assertMemberForUser(userId: string, organizationId: string) {
    return this.assertMember(userId, organizationId);
  }

  async assertAdminForUser(userId: string, organizationId: string) {
    return this.assertAdmin(userId, organizationId);
  }

  async updateConfiguration(user: User, organizationId: string, config: Record<string, unknown>) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const current = (org.settings || {}) as Record<string, unknown>;
    const assignment = await this.resolveConfigurationPackAssignment(config);
    org.settings = {
      ...current,
      configuration: {
        ...((current.configuration as Record<string, unknown>) || {}),
        ...config,
      },
      navigation: config.navigation ?? current.navigation,
      enabledAgentIds: config.enabledAgentIds ?? current.enabledAgentIds,
      enabledProductIds: config.enabledProductIds ?? current.enabledProductIds,
      enabledPackIds: config.enabledPackIds ?? current.enabledPackIds,
      assignedProductPackIds: assignment.productPackIds.length
        ? assignment.productPackIds
        : current.assignedProductPackIds,
      resolvedPackIds: assignment.resolvedPackIds.length
        ? assignment.resolvedPackIds
        : current.resolvedPackIds,
      productAssignmentUpdatedAt: assignment.resolvedPackIds.length
        ? new Date().toISOString()
        : current.productAssignmentUpdatedAt,
      dashboardLayout: config.dashboardLayout ?? current.dashboardLayout,
      permissionsOverrides: config.permissionsOverrides ?? current.permissionsOverrides,
      workspaceDefaults: config.workspaceDefaults ?? current.workspaceDefaults,
      integrationsRequested: config.integrationsRequested ?? current.integrationsRequested,
    };

    if (config.branding) {
      org.branding = { ...(org.branding || {}), ...(config.branding as object) };
    }

    await this.organizationRepository.save(org);
    await this.installAssignedPacks(organizationId, assignment.resolvedPackIds);
    return this.getForUser(user, org.id);
  }

  async updateOrganizationSettings(
    user: User,
    organizationId: string,
    updates: Record<string, unknown>,
  ) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    if (updates.name && typeof updates.name === 'string') org.name = updates.name;
    if (
      updates.organizationType &&
      Object.values(OrganizationType).includes(updates.organizationType as any)
    ) {
      org.organizationType = updates.organizationType as OrganizationType;
      await this.assignDefaultPacks(org.id, org.organizationType);
    }
    if (updates.country !== undefined && typeof updates.country === 'string')
      org.country = updates.country;

    org.branding = this.normalizeBranding(
      {
        ...(org.branding || {}),
        ...((updates.branding as Record<string, unknown>) || {}),
      },
      org.name,
    );
    org.settings = this.normalizeSettings(
      {
        ...(org.settings || {}),
        ...((updates.settings as Record<string, unknown>) || {}),
        subscription: updates.subscription ?? (org.settings || {}).subscription,
        integrations: updates.integrations ?? (org.settings || {}).integrations,
      },
      org.organizationType,
    );

    await this.organizationRepository.save(org);
    return this.buildOrganizationEngine(user, org);
  }

  async getTenantAdministration(user: User, organizationId: string) {
    await this.assertMember(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const [engine, memberships, roleProfiles] = await Promise.all([
      this.buildOrganizationEngine(user, org),
      this.membershipRepository.find({
        where: { organizationId },
        order: { createdAt: 'ASC' },
      }),
      this.platformAssetsService.listRoleProfiles().catch(() => []),
    ]);
    const userIds = memberships.map((membership) => membership.userId);
    const profiles = userIds.length
      ? await this.profileRepository.find({ where: { userId: In(userIds) } })
      : [];
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
    const settings = engine.settings as Record<string, any>;

    return {
      organizationId,
      profile: {
        ...engine.organization,
        tenantId: engine.tenant.tenantId,
        complianceMode: engine.tenant.complianceMode,
        isDemoTenant: engine.tenant.isDemoTenant,
      },
      departments: Array.isArray(settings.departments) ? settings.departments : [],
      workspaces: Array.isArray(settings.workspaceDefaults) ? settings.workspaceDefaults : [],
      users: memberships.map((membership) => {
        const profile = profileByUserId.get(membership.userId);
        return {
          membershipId: membership.id,
          userId: membership.userId,
          displayName: profile?.fullName || membership.userId,
          specialty: profile?.specialty || null,
          verified: Boolean(profile?.verified),
          membershipRole: membership.role,
          roleProfileId: membership.roleProfileId || profile?.roleProfileId || null,
          joinedAt: membership.createdAt,
        };
      }),
      roles: {
        membershipRoles: Object.values(OrganizationMembershipRole),
        roleProfiles: roleProfiles.map((profile) => ({
          id: profile.id,
          label: profile.label,
          intendedRoles: profile.intendedRoles || [],
          specialties: profile.specialties || [],
          requiredPermissions: profile.requiredPermissions || [],
          defaultDashboard: profile.defaultDashboard,
          defaultAiAgentId: profile.defaultAiAgentId,
        })),
      },
      permissions: {
        catalog: Object.values(Permission).map((permission) => ({
          id: permission,
          ...PermissionMetadata[permission],
        })),
        overrides: settings.permissionsOverrides || {},
      },
      branding: engine.branding,
      integrations: engine.integrations,
      subscriptions: {
        current: engine.subscription,
        settings: settings.subscription || {},
        commercialPlanId:
          settings.commercialPlanId || engine.subscription?.commercialPlanId || null,
      },
      noCodeConfiguration: {
        enabledProductIds: settings.enabledProductIds || [],
        enabledPackIds: settings.enabledPackIds || [],
        enabledAgentIds: settings.enabledAgentIds || [],
        navigation: settings.navigation || {},
        dashboardLayout: settings.dashboardLayout || {},
        integrationsRequested: settings.integrationsRequested || [],
      },
      supportedOrganizationTypes: engine.supportedOrganizationTypes,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateTenantAdministration(
    user: User,
    organizationId: string,
    updates: Record<string, unknown>,
  ) {
    await this.assertAdmin(user.id, organizationId);

    const settingsPatch: Record<string, unknown> = {
      ...(this.isRecord(updates.settings) ? updates.settings : {}),
    };
    const workspaceDefaults = updates.workspaceDefaults ?? updates.workspaces;
    for (const [sourceKey, targetKey] of [
      ['departments', 'departments'],
      ['integrations', 'integrations'],
      ['integrationsRequested', 'integrationsRequested'],
      ['enabledProductIds', 'enabledProductIds'],
      ['enabledPackIds', 'enabledPackIds'],
      ['enabledAgentIds', 'enabledAgentIds'],
    ] as const) {
      if (Array.isArray(updates[sourceKey])) {
        settingsPatch[targetKey] = this.uniqueStrings(updates[sourceKey] as unknown[]);
      }
    }
    if (Array.isArray(workspaceDefaults)) settingsPatch.workspaceDefaults = workspaceDefaults;
    if (this.isRecord(updates.permissionsOverrides)) {
      settingsPatch.permissionsOverrides = updates.permissionsOverrides;
    }
    if (this.isRecord(updates.navigation)) settingsPatch.navigation = updates.navigation;
    if (this.isRecord(updates.dashboardLayout))
      settingsPatch.dashboardLayout = updates.dashboardLayout;

    const organizationUpdates: Record<string, unknown> = {};
    for (const key of [
      'name',
      'organizationType',
      'country',
      'subscription',
      'integrations',
    ] as const) {
      if (updates[key] !== undefined) organizationUpdates[key] = updates[key];
    }
    if (this.isRecord(updates.branding)) organizationUpdates.branding = updates.branding;
    if (Object.keys(settingsPatch).length) organizationUpdates.settings = settingsPatch;

    await this.updateOrganizationSettings(user, organizationId, organizationUpdates);
    return this.getTenantAdministration(user, organizationId);
  }

  async getFeatureFlagAdministration(user: User, organizationId: string) {
    await this.assertMember(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const roleProfiles = await this.platformAssetsService.listRoleProfiles().catch(() => []);
    return this.getFeatureFlagService().buildManagementModel({
      organizationId,
      organizationName: org.name,
      settings: org.settings as Record<string, any>,
      workspaceDefaults: Array.isArray((org.settings as Record<string, any>)?.workspaceDefaults)
        ? (org.settings as Record<string, any>).workspaceDefaults
        : [],
      roleProfiles,
    });
  }

  async updateFeatureFlagAdministration(
    user: User,
    organizationId: string,
    update: FeatureFlagUpdateInput,
  ) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const currentSettings = (org.settings || {}) as Record<string, any>;
    let featureFlagPlatform: Record<string, any>;
    try {
      featureFlagPlatform = this.getFeatureFlagService().applyUpdate(currentSettings, {
        ...update,
        updatedBy: user.id,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Feature flag update failed',
      );
    }

    org.settings = {
      ...currentSettings,
      featureFlagPlatform,
      featureFlags: featureFlagPlatform,
      featureFlagOverrides: featureFlagPlatform.tenantFlags,
    };
    await this.organizationRepository.save(org);
    return this.getFeatureFlagAdministration(user, organizationId);
  }

  async getEmergencyFeatureSettings(user: User, organizationId: string) {
    await this.assertMember(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const settings = (org.settings || {}) as Record<string, any>;
    const emergencyOs = this.isRecord(settings.emergencyOs)
      ? (settings.emergencyOs as Record<string, any>)
      : {};
    const flags = this.recordOfBooleans(
      emergencyOs.featureFlags ||
        emergencyOs.featureFlagOverrides ||
        settings.emergencyFeatureFlags,
    );

    return {
      tier: this.resolveEmergencyFeatureTier(settings),
      flags,
      updatedAt: typeof emergencyOs.updatedAt === 'string' ? emergencyOs.updatedAt : null,
      updatedBy: typeof emergencyOs.updatedBy === 'string' ? emergencyOs.updatedBy : null,
    };
  }

  async updateEmergencyFeatureSetting(
    user: User,
    organizationId: string,
    input: {
      featureId?: string;
      enabled?: boolean;
      changedBy?: string;
      timestamp?: string;
    },
  ) {
    await this.assertAdmin(user.id, organizationId);
    const featureId = String(input.featureId || '').trim();
    if (!featureId) throw new BadRequestException('featureId is required');
    if (typeof input.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }

    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const settings = (org.settings || {}) as Record<string, any>;
    const emergencyOs = this.isRecord(settings.emergencyOs)
      ? (settings.emergencyOs as Record<string, any>)
      : {};
    const flags = {
      ...this.recordOfBooleans(
        emergencyOs.featureFlags ||
          emergencyOs.featureFlagOverrides ||
          settings.emergencyFeatureFlags,
      ),
      [featureId]: input.enabled,
    };
    const timestamp = input.timestamp || new Date().toISOString();
    const changedBy = input.changedBy || user.id;

    org.settings = {
      ...settings,
      emergencyFeatureFlags: flags,
      emergencyOs: {
        ...emergencyOs,
        featureFlags: flags,
        featureTier: this.resolveEmergencyFeatureTier(settings),
        updatedAt: timestamp,
        updatedBy: changedBy,
      },
    };
    await this.organizationRepository.save(org);

    return {
      tier: this.resolveEmergencyFeatureTier(org.settings as Record<string, any>),
      flags,
      updatedAt: timestamp,
      updatedBy: changedBy,
      changed: {
        featureId,
        enabled: input.enabled,
        changedBy,
        timestamp,
      },
    };
  }

  async requestIntegration(user: User, organizationId: string, integrationSlug: string) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const settings = (org.settings || {}) as Record<string, unknown>;
    const requested = new Set<string>((settings.integrationsRequested as string[]) || []);
    requested.add(integrationSlug);
    org.settings = { ...settings, integrationsRequested: [...requested] };
    await this.organizationRepository.save(org);
    return {
      integrationSlug,
      status: 'requested',
      engine: await this.buildOrganizationEngine(user, org),
    };
  }

  private uniqueStrings(values: unknown[]) {
    return [
      ...new Set(
        values
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .map((value) => value.trim()),
      ),
    ];
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  private recordOfBooleans(value: unknown): Record<string, boolean> {
    if (!this.isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => Boolean(key))
        .map(([key, enabled]) => [key, Boolean(enabled)]),
    );
  }

  private resolveEmergencyFeatureTier(settings: Record<string, any> = {}) {
    const emergencyOs = this.isRecord(settings.emergencyOs)
      ? (settings.emergencyOs as Record<string, any>)
      : {};
    const rawTier =
      emergencyOs.featureTier ||
      emergencyOs.tier ||
      settings.featureTier ||
      settings.tier ||
      settings.subscription?.tier ||
      settings.subscription?.planTier;
    const normalized = String(rawTier || '').toLowerCase();
    if (normalized === 'enterprise' || normalized === 'institutional') return 'enterprise';
    if (normalized === 'core' || normalized === 'free' || normalized === 'starter') return 'core';
    return 'professional';
  }

  private getFeatureFlagService() {
    return this.featureFlagService || new FeatureFlagService();
  }

  private async assertMember(userId: string, organizationId: string) {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId },
    });
    if (!membership) throw new ForbiddenException('Not a member of this organization');
    return membership;
  }

  private async assertAdmin(userId: string, organizationId: string) {
    const membership = await this.assertMember(userId, organizationId);
    if (
      membership.role !== OrganizationMembershipRole.ADMIN &&
      membership.role !== OrganizationMembershipRole.OWNER
    ) {
      throw new ForbiddenException('Organization admin access required');
    }
    return membership;
  }

  private serializeOrganization(org: Organization) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      organizationType: org.organizationType,
      country: org.country,
      branding: this.normalizeBranding(org.branding, org.name),
      settings: this.normalizeSettings(org.settings, org.organizationType),
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  private async buildOrganizationEngine(
    user: User,
    org: Organization,
  ): Promise<OrganizationEngineModel> {
    const settings = this.normalizeSettings(org.settings, org.organizationType);
    const branding = this.normalizeBranding(org.branding || settings.branding, org.name);
    const subscription = await this.resolveSubscriptionModel(user, settings);
    const integrations = await this.resolveIntegrationModels(settings);

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        organizationType: org.organizationType,
        country: org.country,
      },
      tenant: {
        tenantId: org.slug,
        organizationId: org.id,
        organizationType: org.organizationType,
        slug: org.slug,
        country: org.country,
        isDemoTenant: Boolean(settings.isDemoTenant),
        complianceMode: String(
          settings.complianceMode || this.defaultComplianceMode(org.organizationType),
        ),
        workspaceDefaults: Array.isArray(settings.workspaceDefaults)
          ? settings.workspaceDefaults
          : [],
      },
      branding,
      subscription,
      integrations,
      settings,
      supportedOrganizationTypes: SUPPORTED_ORGANIZATION_TYPES,
    };
  }

  private normalizeBranding(input: unknown, fallbackName: string): BrandingModel {
    const branding = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    return {
      displayName: String(branding.displayName || fallbackName || 'CareDroid Organization'),
      logoUrl: this.optionalString(branding.logoUrl),
      faviconUrl: this.optionalString(branding.faviconUrl),
      primaryColor: this.optionalString(branding.primaryColor),
      accentColor: this.optionalString(branding.accentColor),
      theme: this.optionalString(branding.theme) || 'system',
      loginTitle: this.optionalString(branding.loginTitle),
      loginSubtitle: this.optionalString(branding.loginSubtitle),
      loginBackgroundImageUrl: this.optionalString(branding.loginBackgroundImageUrl),
      dashboardTitle: this.optionalString(branding.dashboardTitle),
      dashboardSubtitle: this.optionalString(branding.dashboardSubtitle),
      dashboardLogoUrl: this.optionalString(branding.dashboardLogoUrl),
    };
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim().length ? value.trim() : null;
  }

  private normalizeSettings(
    input: unknown,
    organizationType: OrganizationType,
  ): Record<string, any> {
    const settings = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
    return {
      complianceMode: settings.complianceMode || this.defaultComplianceMode(organizationType),
      departments: Array.isArray(settings.departments) ? settings.departments : [],
      specialties: Array.isArray(settings.specialties) ? settings.specialties : [],
      workspaceDefaults: Array.isArray(settings.workspaceDefaults)
        ? settings.workspaceDefaults
        : [],
      enabledProductIds: Array.isArray(settings.enabledProductIds)
        ? settings.enabledProductIds
        : [],
      enabledPackIds: Array.isArray(settings.enabledPackIds) ? settings.enabledPackIds : [],
      assignedProductPackIds: Array.isArray(settings.assignedProductPackIds)
        ? settings.assignedProductPackIds
        : [],
      resolvedPackIds: Array.isArray(settings.resolvedPackIds) ? settings.resolvedPackIds : [],
      enabledAgentIds: Array.isArray(settings.enabledAgentIds) ? settings.enabledAgentIds : [],
      integrations: Array.isArray(settings.integrations) ? settings.integrations : [],
      integrationsRequested: Array.isArray(settings.integrationsRequested)
        ? settings.integrationsRequested
        : [],
      subscription: settings.subscription || {},
      branding: settings.branding || {},
      navigation: settings.navigation || {},
      dashboardLayout: settings.dashboardLayout || {},
      permissionsOverrides: settings.permissionsOverrides || {},
      commercialPlanId:
        settings.commercialPlanId || settings.subscription?.commercialPlanId || null,
      tenantProfile: settings.tenantProfile || null,
      ...settings,
    };
  }

  private async resolveSubscriptionModel(user: User, settings: Record<string, any>) {
    const subscription = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    const settingsSubscription = settings.subscription || {};
    if (subscription) {
      return {
        tier: subscription.tier,
        status: subscription.status,
        source: 'user-subscription' as const,
        commercialPlanId:
          settings.commercialPlanId || settingsSubscription.commercialPlanId || null,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }
    if (settingsSubscription.tier || settings.commercialPlanId) {
      return {
        tier: settingsSubscription.tier || settings.commercialPlanId || SubscriptionTier.FREE,
        status: settingsSubscription.status || SubscriptionStatus.ACTIVE,
        source: 'organization-settings' as const,
        commercialPlanId:
          settings.commercialPlanId || settingsSubscription.commercialPlanId || null,
        currentPeriodEnd: settingsSubscription.currentPeriodEnd || null,
      };
    }
    return {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      source: 'default' as const,
      commercialPlanId: null,
      currentPeriodEnd: null,
    };
  }

  private async resolveIntegrationModels(
    settings: Record<string, any>,
  ): Promise<IntegrationModel[]> {
    const offerings = await this.integrationRepository.find({ order: { sortOrder: 'ASC' } });
    const requested = new Set<string>(settings.integrationsRequested || []);
    const enabled = new Set<string>(settings.integrations || []);

    return offerings.map((offering) => {
      const status = enabled.has(offering.slug)
        ? 'enabled'
        : requested.has(offering.slug)
          ? 'requested'
          : offering.status === IntegrationStatus.AVAILABLE ||
              offering.status === IntegrationStatus.BETA
            ? 'available'
            : 'roadmap';
      return {
        slug: offering.slug,
        name: offering.name,
        category: offering.category,
        status,
        linkedAssetId: offering.linkedAssetId,
        docsUrl: offering.docsUrl,
      };
    });
  }

  private defaultComplianceMode(type: OrganizationType) {
    if (type === OrganizationType.EMS) return 'ems';
    if (
      type === OrganizationType.UNIVERSITY ||
      type === OrganizationType.RESEARCH_INSTITUTE ||
      type === OrganizationType.RESEARCH_CENTER
    ) {
      return 'research';
    }
    return 'hipaa';
  }

  private async resolveConfigurationPackAssignment(config: Record<string, unknown>) {
    const enabledProductIds = Array.isArray(config.enabledProductIds)
      ? config.enabledProductIds.filter((id): id is string => typeof id === 'string')
      : [];
    const directPackIds = Array.isArray(config.enabledPackIds)
      ? config.enabledPackIds.filter((id): id is string => typeof id === 'string')
      : [];

    if (!enabledProductIds.length && !directPackIds.length) {
      return { productPackIds: [], resolvedPackIds: [] };
    }

    const productPackIds = new Set<string>();
    if (enabledProductIds.length) {
      const products = await this.productRepository.find({ where: { id: In(enabledProductIds) } });
      products.forEach((product) =>
        product.packIds?.forEach((packId) => productPackIds.add(packId)),
      );
    }

    const resolvedPackIds = new Set<string>(['core-platform']);
    productPackIds.forEach((packId) => resolvedPackIds.add(packId));
    directPackIds.forEach((packId) => resolvedPackIds.add(packId));

    return {
      productPackIds: [...productPackIds],
      resolvedPackIds: [...resolvedPackIds],
    };
  }

  private async installAssignedPacks(organizationId: string, packIds: string[]) {
    for (const packId of packIds) {
      await this.platformAssetsService.installPackForOrganization(organizationId, packId);
    }
  }
}
