# Outcome-Based Product Catalog

## Summary

The `/products` catalog now leads with outcomes instead of starting from tools or product names. Each outcome card traces the commercial and implementation path:

Outcome -> Product -> Asset Packs -> Assets

Product detail pages, asset pack pages, buyer/stakeholder metadata, department mappings, onboarding, and existing route registration remain intact.

## Outcome Sources

Outcome mappings are derived from existing catalog data:

- `Product.outcomes`
- `Product.expectedOutcomes`
- linked `AssetPack.expectedOutcomes`
- legacy pack `salesMetadata.outcomes`
- product `packIds` and pack `assetIds`

No separate outcome table is required. The product catalog service builds deterministic outcome projections from seeded products, packs, and assets.

## Normalized Outcome Labels

The catalog normalizes existing operational and clinical outcome phrases into buyer-facing outcome labels, including:

- Reduce triage time
- Improve sepsis detection
- Improve protocol adherence
- Improve simulation readiness
- Improve asset visibility
- Improve device uptime

Examples:

- Faster risk stratification maps to Reduce triage time.
- Sepsis bundle support maps to Improve sepsis detection.
- ACS pathway adherence and audit readiness map to Improve protocol adherence.
- Competency tracking, scenario completion, and simulation training map to Improve simulation readiness.
- Capacity visibility and operations command center map to Improve asset visibility.
- Device uptime and maintenance visibility map to Improve device uptime.

## API Projection

`ProductCatalogService.getProductBuilderGraph()` now returns `outcomeMappings` for each product graph. Each mapping contains:

- `outcome`
- `product`
- `packs`
- `assets`

This keeps `/products` backed by the same product builder API while giving the UI an outcome-first graph to render.

## `/products` UI

The product index renders outcome cards first. Each card shows:

- outcome label,
- linked product name,
- linked asset packs,
- linked assets,
- buyer/stakeholder context when available,
- navigation to the product detail page.

The product detail route remains product-centric for implementation review and deployment.

## Verification

Completed checks:

- `cd backend && npm test -- src/modules/product-catalog/product-catalog.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx src/routing/canonicalRouteRedirects.test.js`

The backend test verifies Outcome -> Product -> Asset Packs -> Assets projections. The frontend test verifies `/products` renders outcome-first catalog cards with linked products, packs, and assets.
