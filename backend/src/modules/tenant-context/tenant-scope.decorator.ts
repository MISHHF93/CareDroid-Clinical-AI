import { SetMetadata } from '@nestjs/common';
import { TenantScopePolicy } from './tenant-context.types';

export const TENANT_SCOPE_KEY = 'tenantScope';
export const SKIP_TENANT_ISOLATION_KEY = 'skipTenantIsolation';

export const TenantScoped = (policy: Partial<TenantScopePolicy> = {}) =>
  SetMetadata(TENANT_SCOPE_KEY, {
    level: 'tenant',
    ...policy,
  } satisfies TenantScopePolicy);

export const OrganizationScoped = (policy: Partial<TenantScopePolicy> = {}) =>
  SetMetadata(TENANT_SCOPE_KEY, {
    level: 'organization',
    requireOrganizationId: true,
    ...policy,
  } satisfies TenantScopePolicy);

export const WorkspaceScoped = (policy: Partial<TenantScopePolicy> = {}) =>
  SetMetadata(TENANT_SCOPE_KEY, {
    level: 'workspace',
    requireOrganizationId: true,
    requireWorkspaceId: true,
    ...policy,
  } satisfies TenantScopePolicy);

export const SkipTenantIsolation = () => SetMetadata(SKIP_TENANT_ISOLATION_KEY, true);
