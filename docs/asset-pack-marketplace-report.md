# Asset Pack Marketplace Implementation Report

## Summary

The Asset Pack Marketplace is now implemented as the canonical `/asset-packs` experience. It uses organization-aware backend marketplace projections so users can review pack details, included assets, dependencies, enabled/disabled state, role mapping, modules, pricing tier, and organization type fit before enabling or disabling packs.

The previous settings entry point, `/settings/organization/packs`, remains available and renders the same marketplace component for compatibility.

## Marketplace Packs

The marketplace projection covers the requested pack catalog:

- Emergency Department Pack
- ICU Pack
- Cardiology Pack
- Laboratory Intelligence Pack
- Medical IoT Pack
- Fleet & EMS Pack
- Simulation & Training Pack
- Governance Pack
- Research Pack
- Digital Twin Pack

Seed data now labels the governance entry as `Governance Pack` while preserving the existing stable pack id, `governance-compliance-pack`.

## Backend Contract

New marketplace endpoints were added under the existing platform API:

- `GET /api/platform/marketplace/packs`
- `GET /api/platform/marketplace/packs/:packId`

Each marketplace pack includes:

- Pack metadata: `id`, `name`, `slug`, `description`, `pricingTier`, `organizationTypes`, `defaultModules`, and `salesMetadata`.
- Included assets: asset id, title, type, category, route, lifecycle, risk level, roles, and workspace tags.
- Dependencies: dependency id, name, enabled state, and entitlement status.
- Enabled state: `enabled`, `status`, and the matching entitlement row when present.
- Role mapping: matched role profiles using pack target roles and preferred assets.
- Warnings: missing dependencies, unpublished packs, and enabled dependent packs.

Pack enablement remains soft-state based through `OrganizationEntitlement`. Installing validates that the pack exists and is published, then returns dependency state. Removing preserves the entitlement row as disabled and returns dependent pack warnings.

## Frontend Flow

`/asset-packs` now renders `PackMarketplace` instead of the read-only builder page. The component calls `PlatformAssetsApi.listMarketplacePacks()` and renders:

- Enabled/disabled status badges.
- Dependency chips showing enabled or missing prerequisites.
- Included assets with route and type labels.
- Role mapping from backend role profile matches.
- Default modules, pricing tier, organization type tags, and product catalog links.
- Enable/disable actions using the existing install/remove APIs.

The commercial builder component remains available in code and its tests still pass, but it no longer owns the canonical `/asset-packs` route.

## Verification

Commands run:

```bash
cd backend
npm test -- src/modules/platform-assets/platform-assets.service.spec.ts src/modules/platform-assets/asset-registry.service.spec.ts src/modules/product-catalog/product-catalog.service.spec.ts src/modules/product-catalog/product-catalog.controller.spec.ts
npm run build
```

```bash
npm run test:run -- src/pages/commercial/CommercialPages.test.jsx src/services/productCatalogApi.test.js src/pages/organization/AssetPackMarketplace.test.jsx src/services/platformAssetsApi.test.js src/config/canonicalConfig.contract.test.js src/routing/canonicalRouteRedirects.test.js
```

Results:

- Backend platform asset, asset registry, and product catalog tests passed: 30 tests.
- Backend TypeScript build passed.
- Frontend marketplace, API, commercial builder, product catalog, and route contract tests passed: 38 tests.
- Edited files reported no linter errors.
