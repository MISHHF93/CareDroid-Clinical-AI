import { Injectable } from '@nestjs/common';
import { TenantContext } from './tenant-context.types';

type IsolationAuditStatus = 'enforced' | 'enforced_with_caveat' | 'bootstrap_scoped';

type IsolationAuditDomain = {
  id: string;
  name: string;
  status: IsolationAuditStatus;
  tenantBoundary: string;
  accessPattern: string;
  controls: string[];
  evidence: string[];
  residualRisk: string;
};

@Injectable()
export class TenantDataIsolationAuditService {
  getAuditReport(tenantContext: TenantContext) {
    const domains = this.getDomains();
    const enforced = domains.filter((domain) => domain.status === 'enforced').length;
    const caveats = domains.filter((domain) => domain.status === 'enforced_with_caveat').length;
    const bootstrapScoped = domains.filter((domain) => domain.status === 'bootstrap_scoped').length;

    return {
      status: caveats === 0 ? 'tenant_isolated' : 'tenant_isolated_with_caveats',
      generatedAt: new Date().toISOString(),
      tenant: {
        organizationId: tenantContext.organizationId,
        workspaceId: tenantContext.workspaceId,
        source: tenantContext.source,
        role: tenantContext.role,
        organizationRole: tenantContext.organizationRole,
        workspaceRole: tenantContext.workspaceRole,
      },
      summary: {
        auditedDomains: domains.length,
        enforced,
        enforcedWithCaveat: caveats,
        bootstrapScoped,
        crossTenantReadAllowed: false,
        crossTenantWriteAllowed: false,
      },
      globalControls: [
        'TenantContextInterceptor resolves organization and workspace context from authenticated membership.',
        'TenantIsolationGuard rejects organizationId and workspaceId mismatches from params, query, body, or tenant headers.',
        'OrganizationScoped and WorkspaceScoped decorators require explicit tenant identifiers for sensitive routes.',
        'Admin-scoped tenant operations require organization or workspace admin membership.',
        'Bootstrap routes are explicitly listed and limited to onboarding or current-user tenant discovery.',
      ],
      domains,
    };
  }

  private getDomains(): IsolationAuditDomain[] {
    return [
      {
        id: 'organizations',
        name: 'Organizations',
        status: 'bootstrap_scoped',
        tenantBoundary: 'organizationId',
        accessPattern: 'Current-user membership list for bootstrap, OrganizationScoped for organization records.',
        controls: [
          'Organization routes that read or mutate a specific organization require OrganizationScoped.',
          'Controller-level assertions reject requested organization IDs that differ from tenant context.',
          'Tenant administration updates require organization admin scope.',
        ],
        evidence: [
          'OrganizationsController.getOne',
          'OrganizationsController.getTenantAdministration',
          'TenantIsolationGuard organization mismatch rejection',
        ],
        residualRisk:
          'List/current/create/onboarding are bootstrap-scoped and must continue to return only current-user memberships or newly created tenant records.',
      },
      {
        id: 'users',
        name: 'Users',
        status: 'enforced',
        tenantBoundary: 'authenticated userId plus resolved organization membership',
        accessPattern: 'Self-service profile routes use the authenticated user ID, not caller-supplied IDs.',
        controls: [
          'Profile reads and updates resolve req.user.id server-side.',
          'Tenant context rejects spoofed user, role, plan, organization, or workspace headers.',
          'AuthorizationGuard enforces profile write permissions for PHI-sensitive updates.',
        ],
        evidence: [
          'UsersController.getProfile',
          'UsersController.updateProfile',
          'TenantContextService.resolveForRequest',
        ],
        residualRisk: 'No cross-user read endpoint is exposed in the user controller.',
      },
      {
        id: 'workspaces',
        name: 'Workspaces',
        status: 'bootstrap_scoped',
        tenantBoundary: 'workspaceId inside organizationId',
        accessPattern: 'Current-user workspace discovery, WorkspaceScoped for workspace-specific records.',
        controls: [
          'Workspace-specific routes require WorkspaceScoped.',
          'Workspace membership must be active before a workspace can become tenant context.',
          'Controller assertions reject workspace IDs that differ from tenant context.',
          'Workspace management routes require workspace admin permission.',
        ],
        evidence: [
          'WorkspacesController.workspaceContext',
          'WorkspacesController.members',
          'TenantContextService.resolveWorkspaceMembership',
        ],
        residualRisk:
          'Workspace list and active-workspace switch are bootstrap-scoped but remain membership-bound in WorkspacesService.',
      },
      {
        id: 'assets',
        name: 'Assets',
        status: 'enforced',
        tenantBoundary: 'organization entitlement and workspace tenant context',
        accessPattern: 'Tenant-scoped platform catalog with organization-scoped entitlement and analytics surfaces.',
        controls: [
          'Platform asset controller is TenantScoped by default.',
          'Organization asset mapping, customer success, and value-tracking routes require OrganizationScoped.',
          'Entitlement-aware services filter asset visibility before frontend delivery.',
        ],
        evidence: [
          'PlatformAssetsController',
          'DepartmentAssetMappingService',
          'CustomerSuccessService',
        ],
        residualRisk:
          'Global catalog metadata can be shared, but tenant-visible availability is resolved through entitlements and organization context.',
      },
      {
        id: 'analytics',
        name: 'Analytics',
        status: 'enforced_with_caveat',
        tenantBoundary: 'organizationId and workspaceId on analytics events',
        accessPattern: 'Protected analytics metrics are filtered by resolved tenant organization.',
        controls: [
          'Analytics metrics require authentication and VIEW_ANALYTICS permission.',
          'Metrics reads pass req.tenantContext.organizationId into AnalyticsService.',
          'Analytics events store organizationId and workspaceId when tenant context or event metadata is present.',
        ],
        evidence: [
          'AnalyticsController.getMetrics',
          'AnalyticsService.getEventMetrics',
          'AnalyticsEvent.organizationId',
        ],
        residualRisk:
          'Unauthenticated telemetry ingestion can record unscoped events; protected tenant reads exclude other organizations and should prefer scoped client metadata.',
      },
      {
        id: 'audit-logs',
        name: 'Audit Logs',
        status: 'enforced',
        tenantBoundary: 'organizationId plus current user for self audit views',
        accessPattern: 'Audit log reads and statistics are filtered by resolved tenant organization.',
        controls: [
          'Audit log endpoints require authentication and audit permissions for administrative views.',
          'User audit views are constrained to req.user.id.',
          'Log, PHI, action, date-range, and statistics reads include organizationId filters.',
          'Offline audit sync stamps organizationId and workspaceId from tenant context.',
        ],
        evidence: [
          'AuditController.getLogs',
          'AuditController.getMyLogs',
          'AuditService.findByDateRange',
          'AuditService.findPhiAccess',
        ],
        residualRisk: 'Integrity verification remains global because hash-chain validation spans all audit logs.',
      },
    ];
  }
}
