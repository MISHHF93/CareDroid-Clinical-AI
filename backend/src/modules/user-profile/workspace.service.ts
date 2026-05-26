import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly workspacesService: WorkspacesService) {}

  async getWorkspaceState(user: User) {
    return this.workspacesService.getActiveWorkspaceState(user);
  }

  async listWorkspaces(user: User) {
    return this.workspacesService.listForUser(user);
  }

  async switchWorkspace(
    user: User,
    workspaceId: string,
    ipAddress = '0.0.0.0',
    userAgent = 'system',
  ) {
    return this.workspacesService.setActiveWorkspace(user, workspaceId, ipAddress, userAgent);
  }
}
