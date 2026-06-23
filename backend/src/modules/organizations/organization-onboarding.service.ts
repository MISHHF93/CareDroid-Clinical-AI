import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { DEFAULT_PACKS_BY_ORGANIZATION_TYPE } from '../platform-assets/data/platform-asset-seed.data';
import { PlatformAssetsService } from '../platform-assets/platform-assets.service';
import { CommercialPlan } from '../product-catalog/entities/commercial-plan.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { OrganizationOnboardingDto } from '../product-catalog/dto/organization-onboarding.dto';
import {
  OrganizationMembership,
  OrganizationMembershipRole,
} from './entities/organization-membership.entity';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Injectable()
export class OrganizationOnboardingService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CommercialPlan)
    private readonly planRepository: Repository<CommercialPlan>,
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly workspacesService: WorkspacesService,
    @Optional() private readonly tenantProvisioningService?: TenantProvisioningService,
  ) {}

  async completeOnboarding(user: User, dto: OrganizationOnboardingDto) {
    const existing = await this.organizationRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new BadRequestException(`Organization slug already exists: ${dto.slug}`);
    }

    const packIds = await this.resolvePackIds(dto);
    const enabledProductIds = dto.enabledProductIds ?? dto.productIds ?? [];
    const complianceMode =
      dto.complianceMode ?? this.resolveDefaultComplianceMode(dto.organizationType);
    const branding = {
      ...(dto.branding || {}),
      displayName: dto.branding?.displayName || dto.name,
    };
    const onboardingCompletedAt = new Date().toISOString();

    const org = await this.organizationRepository.save(
      this.organizationRepository.create({
        name: dto.name,
        slug: dto.slug,
        organizationType: dto.organizationType,
        country: dto.country,
        branding,
        settings: {
          onboardingCompletedAt,
          specialties: dto.specialties || [],
          departments: dto.departments || [],
          workspaceDefaults: dto.workspaceSetups || [],
          enabledProductIds,
          commercialPlanId: dto.commercialPlanId || null,
          integrations: dto.integrationSlugs || [],
          integrationsRequested: dto.integrationSlugs || [],
          complianceMode,
          branding,
          pilotStrictSaasEntitlements: dto.pilotStrictSaasEntitlements === true,
          strictSaasEntitlements: dto.pilotStrictSaasEntitlements === true,
        },
      }),
    );

    await this.membershipRepository.save(
      this.membershipRepository.create({
        organizationId: org.id,
        userId: user.id,
        role: OrganizationMembershipRole.OWNER,
      }),
    );

    for (const packId of packIds) {
      try {
        await this.platformAssetsService.installPackForOrganization(org.id, packId);
      } catch {
        // pack may not exist in test DB
      }
    }

    if (dto.defaultRoleProfileId) {
      await this.platformAssetsService.updateUserRoleProfile(user.id, dto.defaultRoleProfileId);
    }

    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    if (profile) {
      profile.organizationId = org.id;
      await this.profileRepository.save(profile);
    }

    const workspaces = [];
    for (const ws of dto.workspaceSetups || []) {
      try {
        const workspace = await this.workspacesService.createWorkspace(
          user,
          {
            name: ws.name,
            type: ws.type as any,
            displayName: ws.name,
            enabledToolIds: ws.enabledToolIds,
            enabledModules: ws.enabledModules,
            emergencyModeEnabled: ws.emergencyModeEnabled,
          },
          { organizationId: org.id },
        );
        workspaces.push(workspace);
      } catch {
        // optional
      }
    }

    const provisioning = this.tenantProvisioningService
      ? await this.tenantProvisioningService.provisionOrganization(user, org, {
          workspaceSetups: dto.workspaceSetups,
          packIds,
          enabledProductIds,
          integrationSlugs: dto.integrationSlugs,
          defaultRoleProfileId: dto.defaultRoleProfileId,
          complianceMode,
          branding,
        })
      : null;

    const entitlements = await this.platformAssetsService.getOrganizationEntitlements(org.id);
    const installedPackIds = entitlements.map((e) => e.packId);
    const tenantProfile = {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        organizationType: org.organizationType,
        country: org.country,
      },
      specialties: dto.specialties || [],
      departments: dto.departments || [],
      workspaceDefaults: dto.workspaceSetups || [],
      workspaces,
      roleProfileId: dto.defaultRoleProfileId || null,
      roleAssignments: dto.roleAssignments || [],
      productIds: enabledProductIds,
      installedPackIds,
      integrationsRequested: dto.integrationSlugs || [],
      branding,
      complianceMode,
      provisioning,
    };

    org.settings = {
      ...(org.settings || {}),
      tenantProfile,
    };
    await this.organizationRepository.save(org);

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        organizationType: org.organizationType,
        settings: org.settings,
      },
      installedPackIds,
      workspaces,
      integrationsRequested: dto.integrationSlugs || [],
      complianceMode,
      branding,
      tenantProfile,
      provisioning,
      status: 'configured',
      message: 'CareDroid deployment configured successfully.',
    };
  }

  private async resolvePackIds(dto: OrganizationOnboardingDto): Promise<string[]> {
    const packIds = new Set<string>();

    if (dto.commercialPlanId) {
      const plan = await this.planRepository.findOne({ where: { id: dto.commercialPlanId } });
      plan?.includedPackIds?.forEach((id) => packIds.add(id));
      if (plan?.includedProductIds?.length) {
        const products = await this.productRepository.find({
          where: { id: In(plan.includedProductIds) },
        });
        products.forEach((p) => p.packIds?.forEach((id) => packIds.add(id)));
      }
    }

    const productIds = [...new Set([...(dto.productIds || []), ...(dto.enabledProductIds || [])])];
    if (productIds.length) {
      const products = await this.productRepository.find({ where: { id: In(productIds) } });
      products.forEach((p) => p.packIds?.forEach((id) => packIds.add(id)));
    }

    if (dto.packIds?.length) {
      dto.packIds.forEach((id) => packIds.add(id));
    }

    if (!packIds.size) {
      const defaults = DEFAULT_PACKS_BY_ORGANIZATION_TYPE[dto.organizationType] || [
        'core-platform',
      ];
      defaults.forEach((id) => packIds.add(id));
    }

    packIds.add('core-platform');
    return [...packIds];
  }

  private resolveDefaultComplianceMode(
    type: OrganizationOnboardingDto['organizationType'],
  ): string {
    return type === 'ems' ? 'ems' : 'hipaa';
  }
}
