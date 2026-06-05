import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { Organization } from '../workspaces/entities/organization.entity';
import { UserWorkspaceState } from '../workspaces/entities/user-workspace-state.entity';
import { WorkspaceMembership } from '../workspaces/entities/workspace-membership.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TenantContextController } from './tenant-context.controller';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { TenantScopeInterceptor } from './tenant-scope.interceptor';
import { TenantContextService } from './tenant-context.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserProfile,
      Organization,
      OrganizationMembership,
      Workspace,
      WorkspaceMembership,
      UserWorkspaceState,
      Subscription,
    ]),
  ],
  controllers: [TenantContextController],
  providers: [
    TenantContextService,
    TenantIsolationGuard,
    {
      provide: APP_GUARD,
      useClass: TenantIsolationGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantScopeInterceptor,
    },
  ],
  exports: [TenantContextService, TenantIsolationGuard],
})
export class TenantContextModule {}
