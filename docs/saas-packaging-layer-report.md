# SaaS Packaging Layer Report

## Goal

The SaaS Packaging Layer packages CareDroid into sellable organization-scoped offerings while preserving existing tools, assets, packs, routes, specialty products, and workflows.

## Canonical Products

The six canonical sellable products are:

- Emergency Flow Intelligence Platform
- Hospital Operations Solution
- Medical IoT Solution
- Simulation & Training Solution
- Governance & Compliance Solution
- Research & Education Solution

Existing specialty products such as ICU, cardiology, laboratory, fleet, and digital twin remain available so no features are deleted.

## Packaging Graph

The backend product builder now exposes the full packaging graph:

- Product
- Asset packs
- Assets
- Roles
- Workspaces

Role and workspace mappings are derived from existing catalog metadata:

- Product target users.
- Pack target roles.
- Pack default modules.
- Asset intended roles and role profiles.
- Asset workspace tags.

The graph is available through the existing product builder APIs:

- `GET /api/products/builder`
- `GET /api/products/:slug/builder`
- `GET /api/products/:slug/assets`
- `GET /api/asset-packs`

## Organization Assignment

Configuration Studio product assignment now resolves products into pack entitlements:

- `enabledProductIds` stores assigned sellable products.
- `enabledPackIds` stores direct pack selections.
- `assignedProductPackIds` stores packs resolved from selected products.
- `resolvedPackIds` stores the full assigned pack set, including `core-platform`.

When administrators save Configuration Studio selections, the organization service installs the resolved packs through `PlatformAssetsService.installPackForOrganization`. This makes products assignable to organizations using the same entitlement layer that governs assets.

## Tenant-Aware Context

Platform context now exposes organization-aware packaging data:

- Assigned products.
- Assigned product IDs.
- Product-resolved pack IDs.
- Resolved pack IDs.
- Navigation settings.
- Branding.
- Dashboard layout.
- Workspace defaults.
- Entitled packs, assets, and AI agents.

This supports organization-aware dashboard, AI, navigation, tool visibility, and multi-tenant behavior without adding a parallel context model.

## Frontend

Product list and product detail pages now render role and workspace mappings in addition to packs, assets, routes, dashboards, AI workflows, and backend services.

Configuration Studio continues to assign products and packs, then refreshes platform context after save so navigation, AI, dashboard, and entitlement-aware surfaces can update from the organization context.

## Verification

Targeted verification completed successfully:

- `cd backend && npm test -- src/modules/product-catalog/product-catalog.service.spec.ts src/modules/organizations/organizations.service.spec.ts src/modules/platform-assets/platform-context.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx src/routing/canonicalRouteRedirects.test.js`
