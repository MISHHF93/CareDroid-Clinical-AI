# Department-to-Asset Mapping Engine Report

## Summary

The Department-to-Asset Mapping Engine adds department ownership as first-class platform asset metadata and exposes a `/departments` experience for viewing:

Department -> Asset Packs -> Assets -> Users

The implementation preserves the existing asset registry, pack marketplace, product catalog, organization context, and entitlement logic.

## Department Taxonomy

The canonical taxonomy is defined in `backend/src/modules/platform-assets/department-taxonomy.ts` and contains the 16 required departments:

- Emergency
- ICU
- Cardiology
- Neurology
- Pediatrics
- Surgery
- Laboratory
- Pharmacy
- Radiology
- Respiratory Therapy
- Biomedical Engineering
- Operations
- Fleet
- Administration
- Research
- Education

The helper also provides department ID normalization, department name lookup, and deterministic inference rules based on asset type, category, specialty, workspace tags, route, intended roles, and pack membership.

## Asset Metadata Contract

`PlatformAsset` now includes:

- `primaryDepartment`
- `secondaryDepartments`
- `recommendedRoles`
- `requiredPermissions`

Asset registry validation requires `primaryDepartment`, `recommendedRoles`, and `requiredPermissions` in registry projections. Validation also ensures department IDs belong to the canonical taxonomy.

## Seed Backfill

Seed normalization in `platform-asset-seed.data.ts` now assigns department metadata to every seeded asset. It derives:

- Primary and secondary departments from existing asset metadata and pack context.
- Recommended roles from `intendedRoles`, AI agent defaults, and pack target roles.
- Required permissions from permission policy plus sensible defaults by asset type.

The asset registry seed coverage test validates every seeded asset has department ownership, recommended roles, and required permissions.

## Backend Routes

The backend now exposes:

- `GET /api/platform/departments`
- `GET /api/platform/departments/:departmentId`

Both endpoints accept optional `organizationId`. When organization scope is present, the controller enforces tenant organization matching and membership before returning organization users.

`DepartmentAssetMappingService` builds the graph by loading platform assets, asset packs, role profiles, organization memberships, user profiles, and organization entitlements. All 16 departments are returned even when a department currently has zero mapped assets.

## Frontend Route

The `/departments` route is registered as a first-class authenticated route and added to canonical route configuration and the Solutions sidebar group.

The Departments page renders:

- Department summary cards.
- Selected department details.
- Mapped asset packs and entitlement state.
- Assets with primary/secondary departments, roles, permissions, route, and enabled state.
- Organization users matched by role profile, role, or specialty when organization context exists.

## Verification

Targeted verification completed successfully:

- `cd backend && npm test -- src/modules/platform-assets/department-asset-mapping.service.spec.ts src/modules/platform-assets/asset-registry.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/organization/DepartmentsPage.test.jsx src/services/platformAssetsApi.test.js src/routing/canonicalRouteRedirects.test.js`

All targeted backend and frontend checks passed.
