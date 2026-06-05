import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { PlatformAssetsService } from './platform-assets.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PlatformContextService {
  constructor(
    private readonly platformAssetsService: PlatformAssetsService,
    private readonly workspacesService: WorkspacesService,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
  ) {}

  async getContextForUser(user: User) {
    const profile = await this.profileRepository.findOne({ where: { userId: user.id } });
    let organization: Organization | null = null;
    let membership: OrganizationMembership | null = null;

    if (profile?.organizationId) {
      organization = await this.organizationRepository.findOne({
        where: { id: profile.organizationId },
      });
      membership = await this.membershipRepository.findOne({
        where: { organizationId: profile.organizationId, userId: user.id },
      });
    }

    const workspaceState = await this.workspacesService.listForUser(user);
    const activeWorkspace = workspaceState.workspaces.find(
      (w: { id: string }) => w.id === workspaceState.activeWorkspaceId,
    );
    const enabledToolIds = activeWorkspace?.settings?.enabledToolIds || [];

    const entitledPackIds = organization
      ? (await this.platformAssetsService.getOrganizationEntitlements(organization.id)).map(
          (row) => row.packId,
        )
      : [];

    const entitledAssetIds = await this.platformAssetsService.resolveEntitledAssetIds({
      organizationId: organization?.id,
      roleProfileId: profile?.roleProfileId,
      workspaceEnabledToolIds: enabledToolIds,
    });

    const roleProfile = profile?.roleProfileId
      ? await this.platformAssetsService.getRoleProfile(profile.roleProfileId).catch(() => null)
      : null;

    const packs = organization
      ? await this.platformAssetsService.listPacks({
          organizationType: organization.organizationType,
          publishedOnly: true,
        })
      : await this.platformAssetsService.listPacks({ publishedOnly: true });

    const aiAgents = await this.platformAssetsService.listAssets({ assetType: 'ai_agent' });
    const entitledAgents = aiAgents.filter((agent) => entitledAssetIds.includes(agent.id));

    return {
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            organizationType: organization.organizationType,
            branding: organization.branding,
            settings: organization.settings,
          }
        : null,
      membership: membership
        ? {
            role: membership.role,
            roleProfileId: membership.roleProfileId,
          }
        : null,
      roleProfile,
      entitledPackIds,
      entitledAssetIds,
      entitledPacks: packs.filter((pack) => entitledPackIds.includes(pack.id)),
      availablePacks: packs,
      aiAgents: entitledAgents,
      defaultAiAgentId:
        roleProfile?.defaultAiAgentId ||
        entitledAgents[0]?.id ||
        'agent-clinical',
      workspace: workspaceState,
      legacyToolAliases: enabledToolIds,
      strictSaasEntitlements: this.platformAssetsService.isStrictSaasEntitlementsEnabled(),
    };
  }
}
