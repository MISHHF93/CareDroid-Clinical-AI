import { Module } from '@nestjs/common';
import { WorkspacePermissionsService } from './workspace-permissions.service';

@Module({
  providers: [WorkspacePermissionsService],
  exports: [WorkspacePermissionsService],
})
export class PermissionsModule {}
