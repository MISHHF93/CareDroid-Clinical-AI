import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMembership,
} from '../organizations/entities/organization-membership.entity';
import {
  Subscription,
  SubscriptionTier,
} from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserWorkspaceState } from '../workspaces/entities/user-workspace-state.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipStatus,
} from '../workspaces/entities/workspace-membership.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TENANT_HEADER_NAMES, TenantContext } from './tenant-context.types';

@Injectable()
export class TenantContextService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly organizationMembershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMembership)
    private readonly workspaceMembershipRepository: Repository<WorkspaceMembership>,
    @InjectRepository(UserWorkspaceState)
    private readonly workspaceStateRepository: Repository<UserWorkspaceState>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  async resolveForRequest(user: User, headers: Record<string, any> = {}): Promise<TenantContext> {
    if (!user?.id) {
      throw new ForbiddenException('Authenticated user is required for tenant context.');
    }

    const profile =
      user.profile || (await this.profileRepository.findOne({ where: { userId: user.id } }));
    const subscriptionPlan = await this.resolveSubscriptionPlan(user);
    const requestedUserId = this.readHeader(headers, TENANT_HEADER_NAMES.userId);
    const requestedRole = this.readHeader(headers, TENANT_HEADER_NAMES.role);
    const requestedPlan = this.readHeader(headers, TENANT_HEADER_NAMES.subscriptionPlan);

    if (requestedUserId && requestedUserId !== user.id) {
      throw new ForbiddenException('Tenant user header does not match authenticated user.');
    }
    if (requestedRole && requestedRole !== user.role) {
      throw new ForbiddenException('Tenant role header does not match authenticated user.');
    }
    if (requestedPlan && requestedPlan !== subscriptionPlan) {
      throw new ForbiddenException('Tenant subscription header does not match user subscription.');
    }

    const requestedOrganizationId = this.readHeader(headers, TENANT_HEADER_NAMES.organizationId);
    const requestedWorkspaceId = this.readHeader(headers, TENANT_HEADER_NAMES.workspaceId);

    const organizationMembership = await this.resolveOrganizationMembership(
      user.id,
      requestedOrganizationId || profile?.organizationId,
    );
    const workspaceMembership = await this.resolveWorkspaceMembership(user.id, requestedWorkspaceId);

    const workspace = workspaceMembership?.workspace;
    const organizationId =
      requestedOrganizationId ||
      organizationMembership?.organizationId ||
      workspace?.organizationId ||
      profile?.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization context is required.');
    }

    const finalOrganizationMembership =
      organizationMembership ||
      (await this.organizationMembershipRepository.findOne({
        where: { userId: user.id, organizationId },
      }));
    if (!finalOrganizationMembership) {
      throw new ForbiddenException('Organization membership is required.');
    }

    if (workspace?.organizationId && workspace.organizationId !== organizationId) {
      throw new ForbiddenException('Workspace does not belong to the resolved organization.');
    }

    const finalWorkspaceMembership =
      workspaceMembership || (await this.resolveWorkspaceMembership(user.id));
    if (!finalWorkspaceMembership?.workspaceId) {
      throw new ForbiddenException('Workspace context is required.');
    }

    const finalWorkspace = finalWorkspaceMembership.workspace;
    if (finalWorkspace?.organizationId && finalWorkspace.organizationId !== organizationId) {
      throw new ForbiddenException('Workspace does not belong to the resolved organization.');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new ForbiddenException('Organization context is invalid.');
    }

    return {
      organizationId,
      organizationName: organization.name,
      organizationType: organization.organizationType,
      branding: organization.branding || {},
      workspaceId: finalWorkspaceMembership.workspaceId,
      workspaceName: finalWorkspace?.name,
      userId: user.id,
      role: user.role,
      subscriptionPlan,
      organizationRole: finalOrganizationMembership.role,
      workspaceRole: finalWorkspaceMembership.role,
      workspacePermissions: finalWorkspaceMembership.permissions || [],
      source: requestedOrganizationId || requestedWorkspaceId ? 'headers' : 'resolved',
      isDemoTenant: false,
    };
  }

  private async resolveSubscriptionPlan(user: User): Promise<string> {
    if (user.subscription?.tier) return user.subscription.tier;
    const subscription = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    return subscription?.tier || SubscriptionTier.FREE;
  }

  private async resolveOrganizationMembership(userId: string, preferredOrganizationId?: string) {
    if (preferredOrganizationId) {
      const membership = await this.organizationMembershipRepository.findOne({
        where: { userId, organizationId: preferredOrganizationId },
      });
      if (!membership) throw new ForbiddenException('Organization membership is required.');
      return membership;
    }

    return this.organizationMembershipRepository.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  private async resolveWorkspaceMembership(userId: string, preferredWorkspaceId?: string) {
    if (preferredWorkspaceId) {
      const membership = await this.workspaceMembershipRepository.findOne({
        where: {
          userId,
          workspaceId: preferredWorkspaceId,
          status: WorkspaceMembershipStatus.ACTIVE,
        },
        relations: ['workspace'],
      });
      if (!membership) throw new ForbiddenException('Workspace membership is required.');
      return membership;
    }

    const state = await this.workspaceStateRepository.findOne({ where: { userId } });
    if (state?.activeWorkspaceId) {
      const activeMembership = await this.workspaceMembershipRepository.findOne({
        where: {
          userId,
          workspaceId: state.activeWorkspaceId,
          status: WorkspaceMembershipStatus.ACTIVE,
        },
        relations: ['workspace'],
      });
      if (activeMembership) return activeMembership;
    }

    return this.workspaceMembershipRepository.findOne({
      where: { userId, status: WorkspaceMembershipStatus.ACTIVE },
      relations: ['workspace'],
      order: { createdAt: 'ASC' },
    });
  }

  private readHeader(headers: Record<string, any>, name: string): string {
    const value = headers?.[name] || headers?.[name.toLowerCase()];
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === 'string' ? raw.trim() : '';
  }
}
