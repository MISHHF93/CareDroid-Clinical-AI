import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformAssetsModule } from '../platform-assets/platform-assets.module';
import { Organization } from './entities/organization.entity';
import { UserWorkspaceState } from './entities/user-workspace-state.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { WorkspaceMembership } from './entities/workspace-membership.entity';
import { Workspace } from './entities/workspace.entity';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Workspace,
      WorkspaceMembership,
      WorkspaceInvitation,
      UserWorkspaceState,
    ]),
    AuditModule,
    PermissionsModule,
    forwardRef(() => PlatformAssetsModule),
  ],
  controllers: [WorkspacesController, WorkspaceInvitationsController],
  providers: [WorkspacesService, WorkspaceContextService],
  exports: [WorkspacesService, WorkspaceContextService],
})
export class WorkspacesModule {}
