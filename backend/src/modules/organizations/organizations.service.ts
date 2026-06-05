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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
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
        branding: dto.branding || { displayName: dto.name },
        settings: dto.settings || {},
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
    if (dto.branding !== undefined) org.branding = dto.branding;
    if (dto.settings !== undefined) org.settings = { ...(org.settings || {}), ...dto.settings };

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

  async updateConfiguration(user: User, organizationId: string, config: Record<string, unknown>) {
    await this.assertAdmin(user.id, organizationId);
    const org = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organization not found');

    const current = (org.settings || {}) as Record<string, unknown>;
    org.settings = {
      ...current,
      configuration: {
        ...((current.configuration as Record<string, unknown>) || {}),
        ...config,
      },
      navigation: config.navigation ?? current.navigation,
      enabledAgentIds: config.enabledAgentIds ?? current.enabledAgentIds,
      dashboardLayout: config.dashboardLayout ?? current.dashboardLayout,
      permissionsOverrides: config.permissionsOverrides ?? current.permissionsOverrides,
      workspaceDefaults: config.workspaceDefaults ?? current.workspaceDefaults,
      integrationsRequested: config.integrationsRequested ?? current.integrationsRequested,
    };

    if (config.branding) {
      org.branding = { ...(org.branding || {}), ...(config.branding as object) };
    }

    await this.organizationRepository.save(org);
    return this.getForUser(user, org.id);
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
    return { integrationSlug, status: 'requested' };
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
      branding: org.branding,
      settings: org.settings,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
