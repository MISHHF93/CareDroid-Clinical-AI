# Asset Dependency Graph

## Overview

The Asset Dependency Graph adds a dedicated `/dependency-graph` route for understanding how sellable platform offerings are wired across the product catalog, asset packs, assets, frontend routes, backend services, and integrations.

The existing `/dependency-map` developer wiring page remains unchanged. The new graph is asset-centric and uses persisted catalog data as the source of truth.

## Graph Model

Each dependency chain follows this shape:

```text
Product -> Asset Pack -> Asset -> Route -> Backend Service -> Integration
```

The backend projection is built from existing entities:

- `Product.packIds` and `Product.highlightAssetIds`
- `AssetPack.assetIds` and `AssetPack.requiredDependencies`
- `PlatformAsset.route`, `PlatformAsset.dependencies`, `PlatformAsset.backendStatus`, and `PlatformAsset.packIds`
- `IntegrationOffering.linkedAssetId`, `IntegrationOffering.category`, and `IntegrationOffering.status`

Direct product-highlighted assets are included even when they are not part of a product pack.

## Backend API

`AssetDependencyGraphService` builds the graph and detects dependency issues. The service is registered in the product catalog module and exposed through:

```text
GET /api/dependency-graph
```

The response includes:

- `chains`: product-to-integration dependency rows
- `issues`: detected dependency problems
- `issueCounts`: counts by issue type
- `summary`: aggregate counts for products, packs, assets, chains, routes, backend services, integrations, and issues
- `generatedAt`: projection timestamp

## Issue Detection

The graph detects:

- `missing-dependency`: a product references a missing pack, a product highlights a missing asset, a pack references a missing asset, a pack requires a missing dependency, or an asset depends on a missing asset.
- `duplicate-dependency`: repeated pack, asset, required dependency, or asset dependency IDs within the same scope.
- `orphan-asset`: an asset exists in the registry but is not linked by any product or asset pack.

## Frontend Route

The frontend adds `ProductCatalogApi.getAssetDependencyGraph()` and a new `/dependency-graph` page.

The page renders:

- summary cards for products, packs, assets, routes, backend services, and integrations
- issue count cards and an issue-type filter
- product-to-integration chain cards showing Product, Asset Pack, Asset, Route, Backend Service, and Integration stages

The route is registered in `App.jsx`, `routes.config.js`, and advanced navigation.

## Verification

Targeted verification passed:

- `cd backend && npm test -- src/modules/product-catalog/asset-dependency-graph.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/DependencyGraph.test.jsx src/services/productCatalogApi.test.js src/routing/canonicalRouteRedirects.test.js src/test/routePagesSmoke.test.jsx src/navigation/primaryNavigation.test.js src/components/Sidebar.toolsNavigation.test.js`
