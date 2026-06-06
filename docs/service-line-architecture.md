# Service Line Architecture

## Summary

Service Line Architecture adds a layer above department-to-asset mapping so CareDroid can present clinical and operational offerings as:

Service Line -> Departments -> Asset Packs -> Assets

The implementation reuses the department taxonomy, department graph, asset packs, assets, and organization entitlement context rather than creating a separate inventory.

## Service-Line Taxonomy

The canonical service lines are:

- Emergency Medicine
- Critical Care
- Cardiology
- Neurology
- Pediatrics
- Surgery
- Laboratory Medicine
- Operations
- Education
- Research

## Service Line To Department Mapping

- Emergency Medicine -> Emergency
- Critical Care -> ICU, Respiratory Therapy, Pharmacy
- Cardiology -> Cardiology
- Neurology -> Neurology, Radiology
- Pediatrics -> Pediatrics
- Surgery -> Surgery, Radiology, Laboratory
- Laboratory Medicine -> Laboratory, Pharmacy
- Operations -> Operations, Fleet, Biomedical Engineering, Administration
- Education -> Education
- Research -> Research, Education

The mapping is validated against the canonical department taxonomy so service lines cannot reference unsupported departments.

## Backend Graph

`ServiceLineArchitectureService` uses the existing `DepartmentAssetMappingService` to build the service-line graph. Each service line includes:

- service-line identity and department IDs,
- department nodes,
- deduplicated asset packs,
- deduplicated assets,
- summary counts for departments, packs, assets, and users.

Organization-scoped requests preserve the existing department graph behavior for entitlement state and user context.

## API

The platform API exposes:

- `GET /api/platform/service-lines`
- `GET /api/platform/service-lines/:serviceLineId`

Both endpoints accept optional `organizationId` and reuse the same tenant and membership checks as department mappings.

## Frontend Route

The `/service-lines` route renders service-line summary cards and selected service-line details:

- departments in the service line,
- rolled-up asset packs,
- rolled-up assets,
- organization entitlement context when available.

The route is registered in canonical routes and navigation near Products, Asset Packs, and Departments.

## Verification

Completed checks:

- `cd backend && npm test -- src/modules/platform-assets/service-line-architecture.service.spec.ts src/modules/platform-assets/department-asset-mapping.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/organization/ServiceLinesPage.test.jsx src/services/platformAssetsApi.test.js src/routing/canonicalRouteRedirects.test.js`

All targeted backend and frontend checks passed.
