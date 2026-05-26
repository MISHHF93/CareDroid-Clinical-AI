import { Injectable } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import { Permission } from '../auth/enums/permission.enum';
import { getEffectivePermissions } from '../auth/config/role-permissions.config';

export enum WorkspacePermission {
  SWITCH_WORKSPACE = 'SWITCH_WORKSPACE',
  VIEW_WORKSPACE = 'VIEW_WORKSPACE',
  MANAGE_WORKSPACE = 'MANAGE_WORKSPACE',
  MANAGE_WORKSPACE_MEMBERS = 'MANAGE_WORKSPACE_MEMBERS',
  ACCESS_DASHBOARD = 'ACCESS_DASHBOARD',
  ACCESS_TOOLS = 'ACCESS_TOOLS',
  ACCESS_FLEET = 'ACCESS_FLEET',
  ACCESS_MEDICAL_IOT = 'ACCESS_MEDICAL_IOT',
  ACCESS_HOSPITAL_MAPS = 'ACCESS_HOSPITAL_MAPS',
  ACCESS_RESEARCH = 'ACCESS_RESEARCH',
  MANAGE_PERSONALIZATION = 'MANAGE_PERSONALIZATION',
  VIEW_WORKSPACE_AUDIT = 'VIEW_WORKSPACE_AUDIT',
}

const WORKSPACE_ROLE_PERMISSIONS: Record<string, WorkspacePermission[]> = {
  owner: Object.values(WorkspacePermission),
  admin: Object.values(WorkspacePermission),
  clinician: [
    WorkspacePermission.SWITCH_WORKSPACE,
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.ACCESS_DASHBOARD,
    WorkspacePermission.ACCESS_TOOLS,
    WorkspacePermission.ACCESS_HOSPITAL_MAPS,
    WorkspacePermission.ACCESS_MEDICAL_IOT,
    WorkspacePermission.MANAGE_PERSONALIZATION,
  ],
  nurse: [
    WorkspacePermission.SWITCH_WORKSPACE,
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.ACCESS_DASHBOARD,
    WorkspacePermission.ACCESS_TOOLS,
    WorkspacePermission.ACCESS_HOSPITAL_MAPS,
    WorkspacePermission.ACCESS_MEDICAL_IOT,
  ],
  dispatcher: [
    WorkspacePermission.SWITCH_WORKSPACE,
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.ACCESS_DASHBOARD,
    WorkspacePermission.ACCESS_FLEET,
  ],
  researcher: [
    WorkspacePermission.SWITCH_WORKSPACE,
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.ACCESS_DASHBOARD,
    WorkspacePermission.ACCESS_RESEARCH,
    WorkspacePermission.MANAGE_PERSONALIZATION,
  ],
  viewer: [
    WorkspacePermission.SWITCH_WORKSPACE,
    WorkspacePermission.VIEW_WORKSPACE,
    WorkspacePermission.ACCESS_DASHBOARD,
  ],
};

@Injectable()
export class WorkspacePermissionsService {
  getWorkspaceRolePermissions(role = 'viewer'): string[] {
    return WORKSPACE_ROLE_PERMISSIONS[role] || WORKSPACE_ROLE_PERMISSIONS.viewer;
  }

  getEffectivePermissions(params: {
    userRole?: UserRole;
    membershipRole?: string;
    explicitPermissions?: string[];
  }): string[] {
    const globalPermissions = params.userRole
      ? getEffectivePermissions(params.userRole).map((permission: Permission) => permission)
      : [];
    const workspacePermissions = this.getWorkspaceRolePermissions(params.membershipRole);
    return [
      ...new Set([
        ...globalPermissions,
        ...workspacePermissions,
        ...(params.explicitPermissions || []),
      ]),
    ];
  }

  canAccessTool(params: {
    toolId: string;
    enabledToolIds?: string[];
    effectivePermissions: string[];
  }): boolean {
    if (params.enabledToolIds?.length && !params.enabledToolIds.includes(params.toolId)) {
      return false;
    }
    return params.effectivePermissions.includes(WorkspacePermission.ACCESS_TOOLS);
  }
}
