import { WorkspacePermissionsService, WorkspacePermission } from './workspace-permissions.service';
import { UserRole } from '../users/entities/user.entity';
import { Permission } from '../auth/enums/permission.enum';

describe('WorkspacePermissionsService', () => {
  const service = new WorkspacePermissionsService();

  it('combines global role permissions with workspace membership permissions', () => {
    const permissions = service.getEffectivePermissions({
      userRole: UserRole.PHYSICIAN,
      membershipRole: 'dispatcher',
      explicitPermissions: ['CUSTOM_WORKSPACE_PERMISSION'],
    });

    expect(permissions).toContain(Permission.USE_AI_CHAT);
    expect(permissions).toContain(WorkspacePermission.ACCESS_FLEET);
    expect(permissions).toContain('CUSTOM_WORKSPACE_PERMISSION');
  });

  it('checks tool access against workspace tool availability', () => {
    const canAccess = service.canAccessTool({
      toolId: 'drug-check',
      enabledToolIds: ['drug-check'],
      effectivePermissions: [WorkspacePermission.ACCESS_TOOLS],
    });
    const cannotAccess = service.canAccessTool({
      toolId: 'fleet-dashboard',
      enabledToolIds: ['drug-check'],
      effectivePermissions: [WorkspacePermission.ACCESS_TOOLS],
    });

    expect(canAccess).toBe(true);
    expect(cannotAccess).toBe(false);
  });
});
