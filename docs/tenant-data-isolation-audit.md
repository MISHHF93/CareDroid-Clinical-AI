# Tenant Data Isolation Audit

## Goal

Verify that CareDroid's tenant-aware architecture prevents data leakage across organizations, users, workspaces, assets, analytics, and audit logs.

## Audit Surface

The audit is exposed as a tenant-admin report at:

- Backend: `GET /api/tenant/isolation-audit`
- Frontend: Settings → `Tenant Data Isolation Audit`

The endpoint returns the resolved tenant context, global controls, domain-level controls, evidence references, and residual risks. Cross-tenant read and write access are reported as blocked.

## Tenant Boundary Model

CareDroid uses a layered tenant boundary:

- `TenantContextInterceptor` resolves the current organization, workspace, user, role, plan, and permissions.
- `TenantIsolationGuard` rejects mismatches between the resolved tenant context and tenant identifiers supplied through route params, query strings, request bodies, or tenant headers.
- `OrganizationScoped` requires an organization boundary for organization-level routes.
- `WorkspaceScoped` requires both organization and workspace boundaries for workspace-level routes.
- Admin-scoped routes require organization or workspace admin membership before mutation.

Bootstrap routes are explicitly limited to current-user discovery or tenant creation flows.

## Domain Findings

| Domain | Boundary | Status | Enforcement |
| --- | --- | --- | --- |
| Organizations | `organizationId` | Bootstrap-scoped | Specific organization reads and writes require `OrganizationScoped`; list/current/create/onboarding remain current-user bootstrap flows. |
| Users | Authenticated `userId` plus organization membership | Enforced | Profile routes use `req.user.id` server-side and reject spoofed tenant/user headers. |
| Workspaces | `workspaceId` within `organizationId` | Bootstrap-scoped | Workspace-specific APIs require `WorkspaceScoped`; active workspace resolution requires active membership. |
| Assets | Organization entitlement plus tenant context | Enforced | Asset availability is tenant-scoped and entitlement-filtered before frontend delivery. |
| Analytics | `organizationId` and `workspaceId` on events | Enforced with caveat | Protected metrics are filtered by tenant organization; telemetry ingestion can accept unscoped events, so clients should send tenant metadata when available. |
| Audit logs | `organizationId` plus current user | Enforced | Administrative audit reads, PHI reads, action/date filters, statistics, and self-audit views are filtered by tenant organization or current user. |

## Leak Prevention Rules

1. Route handlers must never trust caller-supplied tenant identifiers without the tenant guard.
2. Organization-specific routes must use `OrganizationScoped`.
3. Workspace-specific routes must use `WorkspaceScoped`.
4. Services that read durable tenant data must include the resolved organization or workspace identifier in repository queries.
5. User self-service APIs must derive `userId` from authentication state, not request bodies or query strings.
6. Audit and analytics summaries must aggregate only within the resolved tenant organization.
7. Public or bootstrap routes must return only current-user records, public configuration, or newly created tenant records.

## Implemented Hardening

- Analytics events now persist `organizationId` and `workspaceId` when tenant context or event metadata is present.
- Protected analytics metrics now pass `req.tenantContext.organizationId` into `AnalyticsService`.
- Audit-log read paths now accept and apply an `organizationId` filter.
- Offline audit sync stamps records with the resolved organization and workspace.
- The tenant isolation audit endpoint summarizes the current control posture for the six required domains.

## Residual Watch Items

- Analytics ingestion remains available for client telemetry and may receive unscoped events. This does not allow cross-tenant reads, but scoped clients should provide organization/workspace metadata.
- Audit integrity verification remains global because the hash chain is intentionally system-wide.
- Bootstrap organization and workspace flows must continue to be reviewed when changed because they run before a full tenant context is established.

## Verification

Automated tests cover:

- Tenant guard rejection of cross-organization and cross-workspace requests.
- Tenant data isolation report contents for organizations, users, workspaces, assets, analytics, and audit logs.
- Organization-filtered audit log reads.
- Organization-filtered analytics metrics.
- Frontend API and settings rendering for the tenant isolation audit report.
