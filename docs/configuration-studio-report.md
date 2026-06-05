# Configuration Studio Report

## Route

Configuration Studio is available at `/configuration-studio`.

The route is registered as an authenticated application route and renders `ConfigurationStudioPage`. If no organization is active, the page directs the user to onboarding so an organization can be created before tenant configuration is saved.

## Admin Scope

Configuration saves are organization-scoped and require administrator access. The frontend persists changes through:

- `ProductCatalogApi.updateOrganizationConfiguration(organizationId, payload)`
- `PATCH /api/organizations/:organizationId/configuration`

The backend delegates to `OrganizationsService.updateConfiguration`, which calls `assertAdmin` before updating organization settings or branding.

## Configurable Areas

The Configuration Studio covers the requested admin configuration domains:

- Navigation: hidden navigation IDs and primary landing route.
- Workspaces: `workspaceDefaults` in the backend configuration contract for organization-level workspace defaults.
- Packs: selected product configuration resolves a packaging preview of packs, assets, routes, and services; pack administration remains linked through `/asset-packs`.
- Permissions: `permissionsOverrides` in the backend configuration contract for organization-scoped permission customization.
- Branding: accent color and persisted organization branding updates.
- AI agents: enabled AI agent IDs.
- Dashboards: `dashboardLayout` in the backend configuration contract for dashboard-level customization.

## Current UI Behavior

The Configuration Studio page now lets admins edit:

- Hidden navigation IDs.
- Primary landing route.
- Workspace defaults as validated JSON.
- Direct enabled asset pack IDs through pack chips.
- Accent color.
- Display name.
- Logo URL.
- Enabled AI agent IDs.
- Enabled products.
- Permission overrides as validated JSON.
- Dashboard layout as validated JSON.

It also shows a packaging preview for selected products:

- Selected product count.
- Selected pack count.
- Selected asset count.
- Product-to-pack, route, and backend service details.

The page includes shortcuts to manage packs and asset lifecycle settings.

## Data Model

The update payload supports the broader tenant configuration model:

- `navigation`
- `branding`
- `workspaceDefaults`
- `enabledAgentIds`
- `enabledProductIds`
- `enabledPackIds`
- `dashboardLayout`
- `permissionsOverrides`
- `integrationsRequested`

Organization settings preserve both a normalized top-level projection and a nested `configuration` object so downstream contexts can consume the same configuration without losing the original payload shape.

## Verification

Targeted verification completed successfully:

- `cd backend && npm test -- src/modules/organizations/organizations.service.spec.ts`
- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx`

Coverage includes the backend configuration projection, direct pack selections, and the expanded frontend save payload across navigation, workspaces, packs, permissions, branding, AI agents, and dashboards.
