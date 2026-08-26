import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { hasPermission } from '../auth/config/role-permissions.config';
import { Permission } from '../auth/enums/permission.enum';
import { User, UserRole } from '../users/entities/user.entity';
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
  private readonly logger = new Logger(OrganizationOnboardingService.name);
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

    // dto.defaultRoleProfileId ends up in profile.roleProfileId -- the SAME
    // global, non-org-scoped column AuthorizationGuard reads for every
    // permission check platform-wide (hasSaasProfilePermission), not just
    // within the organization being created here. Any authenticated user
    // (including UserRole.STUDENT) could otherwise onboard a throwaway org
    // with defaultRoleProfileId: 'administrator' and silently grant their own
    // account READ_PHI/VIEW_AUDIT_LOGS/MANAGE_USERS/VIEW_GOVERNANCE with no
    // admin involvement -- the same class of bug already gated on the
    // dedicated PATCH platform/me/role-profile and PATCH /profile/me
    // endpoints. Mirror that same canAssignRole gate here; unlike those
    // dedicated endpoints, silently drop the field rather than throwing, so
    // an unprivileged user's onboarding wizard still completes (they still
    // get a role-appropriate default via TenantProvisioningService's own
    // fallback).
    const canAssignRole =
      user.role != null &&
      (user.role === UserRole.ADMIN ||
        hasPermission(user.role, Permission.MANAGE_ROLES) ||
        hasPermission(user.role, Permission.MANAGE_USERS));
    const authorizedDefaultRoleProfileId = canAssignRole ? dto.defaultRoleProfileId : undefined;
    if (dto.defaultRoleProfileId && !canAssignRole) {
      this.logger.warn(
        `[OrganizationOnboarding] Ignored defaultRoleProfileId '${dto.defaultRoleProfileId}' requested by user ${user.id} -- role profile assignment requires MANAGE_ROLES/MANAGE_USERS or ADMIN.`,
      );
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

    // HEAL: the findOne() check above only closes the common case -- two
    // near-simultaneous onboarding submissions for the same slug (a
    // double-submit, or two admins racing to claim the same name) could
    // both pass it before either insert commits, and the loser's .save()
    // would throw an unhandled unique-constraint QueryFailedError (500)
    // against the entity's `slug` column (`unique: true`) instead of the
    // clean "slug already exists" rejection above. orIgnore() relies on
    // that same unique constraint to make the losing insert a silent
    // no-op; the read-back then finds whichever row actually won, so the
    // loser gets the same BadRequestException as the pre-check. Same
    // pattern as integration-hub.service.ts's HEAL-347.32 fix.
    const candidate = this.organizationRepository.create({
      // id is @PrimaryGeneratedColumn('uuid') -- pre-assigned so the
      // winner-check below has a value to compare against.
      id: randomUUID(),
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
    });

    await this.organizationRepository
      .createQueryBuilder()
      .insert()
      .into(Organization)
      .values(candidate as any)
      .orIgnore()
      .execute();
    const org = await this.organizationRepository.findOneOrFail({ where: { slug: dto.slug } });
    if (org.id !== candidate.id) {
      throw new BadRequestException(`Organization slug already exists: ${dto.slug}`);
    }

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
      } catch (error) {
        this.logger.warn(
          `[OrganizationOnboarding] Failed to install pack ${packId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (authorizedDefaultRoleProfileId) {
      await this.platformAssetsService.updateUserRoleProfile(
        user.id,
        authorizedDefaultRoleProfileId,
      );
    }

    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    if (profile) {
      profile.organizationId = org.id;
      await this.profileRepository.save(profile);
    }

    const workspaces: Array<Awaited<ReturnType<WorkspacesService['createWorkspace']>>> = [];
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
      } catch (error) {
        this.logger.warn(
          `[OrganizationOnboarding] Failed to create workspace ${ws.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const provisioning = this.tenantProvisioningService
      ? await this.tenantProvisioningService.provisionOrganization(user, org, {
          workspaceSetups: dto.workspaceSetups,
          packIds,
          enabledProductIds,
          integrationSlugs: dto.integrationSlugs,
          defaultRoleProfileId: authorizedDefaultRoleProfileId,
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
      roleProfileId: authorizedDefaultRoleProfileId || null,
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
