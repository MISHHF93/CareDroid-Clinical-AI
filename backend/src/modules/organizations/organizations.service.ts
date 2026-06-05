import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
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

    await this.assignDefaultPacks(org.id, org.organizationType);
    await this.linkUserToOrganization(user.id, org.id);

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

  async updateOrganizationSettings(user: User, organizationId: string, updates: Record<string, unknown>) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    if (updates.name && typeof updates.name === 'string') org.name = updates.name;
    if (updates.organizationType && Object.values(OrganizationType).includes(updates.organizationType as any)) {
      org.organizationType = updates.organizationType as OrganizationType;
      await this.assignDefaultPacks(org.id, org.organizationType);
    }
    if (updates.country !== undefined && typeof updates.country === 'string') org.country = updates.country;

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

  private async buildOrganizationEngine(user: User, org: Organization): Promise<OrganizationEngineModel> {
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
        complianceMode: String(settings.complianceMode || this.defaultComplianceMode(org.organizationType)),
        workspaceDefaults: Array.isArray(settings.workspaceDefaults) ? settings.workspaceDefaults : [],
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
      logoUrl: (branding.logoUrl as string) || null,
      primaryColor: (branding.primaryColor as string) || null,
      accentColor: (branding.accentColor as string) || null,
      theme: (branding.theme as string) || 'system',
    };
  }

  private normalizeSettings(input: unknown, organizationType: OrganizationType): Record<string, any> {
    const settings = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
    return {
      complianceMode: settings.complianceMode || this.defaultComplianceMode(organizationType),
      departments: Array.isArray(settings.departments) ? settings.departments : [],
      specialties: Array.isArray(settings.specialties) ? settings.specialties : [],
      workspaceDefaults: Array.isArray(settings.workspaceDefaults) ? settings.workspaceDefaults : [],
      enabledProductIds: Array.isArray(settings.enabledProductIds) ? settings.enabledProductIds : [],
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
      commercialPlanId: settings.commercialPlanId || settings.subscription?.commercialPlanId || null,
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
        commercialPlanId: settings.commercialPlanId || settingsSubscription.commercialPlanId || null,
        currentPeriodEnd: subscription.currentPeriodEnd,
      };
    }
    if (settingsSubscription.tier || settings.commercialPlanId) {
      return {
        tier: settingsSubscription.tier || settings.commercialPlanId || SubscriptionTier.FREE,
        status: settingsSubscription.status || SubscriptionStatus.ACTIVE,
        source: 'organization-settings' as const,
        commercialPlanId: settings.commercialPlanId || settingsSubscription.commercialPlanId || null,
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

  private async resolveIntegrationModels(settings: Record<string, any>): Promise<IntegrationModel[]> {
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
    if (type === OrganizationType.UNIVERSITY || type === OrganizationType.RESEARCH_INSTITUTE || type === OrganizationType.RESEARCH_CENTER) {
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
      products.forEach((product) => product.packIds?.forEach((packId) => productPackIds.add(packId)));
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
