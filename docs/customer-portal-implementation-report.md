# Customer Portal Implementation Report

## Goal

Every organization should have a dedicated customer portal at `/customer-portal` where authorized users can manage their CareDroid deployment from one place.

## Scope

The portal is implemented as an authenticated, tenant-scoped React page that reuses existing CareDroid organization, tenant, user identity, subscription, and platform asset context. It does not introduce a parallel tenant model or fetch unscoped organization lists.

Required portal areas:

- Subscription overview
- Enabled products
- Enabled asset packs
- Organization profile
- Workspaces
- Users
- Integrations
- Invoices placeholder
- Support requests
- Release notes

## Data Sources

- Tenant scope comes from `TenantContextProvider` and `TenantRequired`.
- Organization and tenant engine data comes from `OrganizationContextProvider`.
- Platform entitlements, enabled products, enabled asset packs, workspace state, and role profile context come from `UserIdentityContext`.
- Organization administration details come from the existing organization-scoped tenant administration endpoint, `GET /api/organizations/:organizationId/tenant-admin`.
- Subscription and billing portal actions reuse the existing subscription API helpers.

## Security And Isolation Rules

- The route is authenticated and rendered inside `TenantRequired`.
- The portal resolves the current organization from tenant/user identity context before requesting organization administration data.
- The tenant administration request uses the current organization id only; it does not enumerate organizations.
- Backend organization scoping remains authoritative through the existing `OrganizationScoped` route and tenant context assertion.
- UI actions are role aware: administrative management links and write-oriented calls are only presented to users with appropriate management permissions or organization owner/admin roles.
- Users without admin permissions still get a read-oriented deployment overview for their own tenant.

## Implementation Notes

- Add a new `CustomerPortalPage` under `src/pages/customer-portal/`.
- Register `/customer-portal` in `App.jsx`, `routes.config.js`, and account navigation.
- Add a small frontend API wrapper for the organization-scoped tenant administration read model.
- Reuse existing commercial and organization visual patterns where possible, with portal-specific layout CSS for dense overview sections.
- Keep invoices as an explicit placeholder because invoice retrieval is not currently exposed as a first-class frontend API.
- Keep support requests local to the portal UI for now, showing the organization-aware request context that would be sent to support once a support API exists.
- Keep release notes as static portal content until a release-notes service is available.

## Acceptance Mapping

The customer can manage their CareDroid deployment from one place because `/customer-portal` consolidates subscription status, billing portal access, enabled products and packs, organization profile, workspace/user/integration visibility, invoice status, support request context, and release notes behind a single tenant-scoped route.
