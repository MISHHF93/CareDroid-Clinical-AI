# Tenant Administration Center

## Purpose

The Tenant Administration Center gives each organization a tenant-scoped control plane at `/tenant-admin`.
It lets organization admins manage customer configuration without code changes or redeploys.

## Route

- Frontend route: `/tenant-admin`
- Backend read API: `GET /api/organizations/:organizationId/tenant-admin`
- Backend update API: `PATCH /api/organizations/:organizationId/tenant-admin`

All backend calls are protected by JWT authentication and tenant isolation. Reads require organization membership.
Updates require organization admin or owner membership.

## Managed Areas

The center consolidates tenant administration into one model:

- Organization profile: name, type, country, tenant ID, compliance mode.
- Departments: tenant-selected department IDs stored in organization settings.
- Workspaces: workspace defaults, enabled tool IDs, default modules, and workspace-level configuration.
- Users: organization memberships with tenant role, role profile, specialty, and verification status.
- Roles: membership roles and platform role profiles.
- Permissions: permission catalog plus tenant-level `permissionsOverrides`.
- Branding: display name, primary color, accent color, and theme-ready branding state.
- Integrations: enabled, requested, available, and roadmap integration states.
- Subscriptions: current tier, status, source, and commercial plan metadata.

## No-Code Configuration Model

Tenant customization is persisted in organization settings and branding:

- `settings.departments`
- `settings.workspaceDefaults`
- `settings.integrations`
- `settings.integrationsRequested`
- `settings.permissionsOverrides`
- `settings.subscription`
- `branding.displayName`
- `branding.primaryColor`
- `branding.accentColor`

The frontend exposes list and JSON editors for departments, workspaces, integrations, and permission overrides.
Admins can alter customer configuration from the UI; the application reads the updated tenant engine on the next refresh.

## Tenant Scope

The route only operates on the active organization context. Tenant headers and backend tenant guards prevent a user from
reading or writing administration data for an organization outside the current tenant.

## Relationship To Existing Tools

The center complements existing pages:

- `/organization` remains the organization overview.
- `/departments` and `/service-lines` remain detailed commercial/asset mapping views.
- `/solution-builder` can generate deployment recommendations that feed tenant configuration.
- `/billing` remains subscription billing detail.

The Tenant Administration Center is the consolidated self-service surface for day-to-day organization administration.
