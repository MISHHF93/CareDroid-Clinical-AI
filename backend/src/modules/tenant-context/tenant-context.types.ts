import { SubscriptionTier } from '../subscriptions/entities/subscription.entity';
import { UserRole } from '../users/entities/user.entity';

export interface TenantContext {
  organizationId: string;
  organizationName?: string;
  workspaceId: string;
  workspaceName?: string;
  userId: string;
  role: UserRole | string;
  subscriptionPlan: SubscriptionTier | string;
  organizationRole?: string;
  workspaceRole?: string;
  workspacePermissions?: string[];
  source: 'resolved' | 'headers';
  isDemoTenant: false;
}

export interface TenantContextRequest {
  user?: any;
  tenantContext?: TenantContext;
  tenantScope?: TenantScope;
  headers?: Record<string, string | string[] | undefined>;
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  method?: string;
  originalUrl?: string;
  url?: string;
  path?: string;
}

export type TenantScopeLevel = 'tenant' | 'organization' | 'workspace';

export type TenantAdminScope = 'organization' | 'workspace' | 'any';

export interface TenantScopePolicy {
  level: TenantScopeLevel;
  requireOrganizationId?: boolean;
  requireWorkspaceId?: boolean;
  permissions?: string[];
  admin?: boolean | TenantAdminScope;
}

export interface TenantScope {
  organizationId?: string;
  workspaceId?: string;
  source?: 'params' | 'query' | 'body' | 'headers' | 'tenantContext';
}

export const TENANT_HEADER_NAMES = Object.freeze({
  organizationId: 'x-caredroid-organization-id',
  workspaceId: 'x-caredroid-workspace-id',
  userId: 'x-caredroid-user-id',
  role: 'x-caredroid-role',
  subscriptionPlan: 'x-caredroid-subscription-plan',
  source: 'x-caredroid-tenant-source',
});
