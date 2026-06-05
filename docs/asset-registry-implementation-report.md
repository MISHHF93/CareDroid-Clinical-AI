# CareDroid Asset Registry Implementation Report

Generated: 2026-06-05

## Executive Summary

CareDroid now treats `platform_assets` as the backend source of truth for registered platform capabilities. The implementation upgrades the existing `platform-assets` module with a canonical registry schema, runtime metadata validation, `AssetRegistryService`, registry projections for existing APIs, and an expanded seed catalog that migrates current dashboards, workflows, protocols, simulations, AI agents, maps, IoT/fleet modules, reports, integrations, plugins, and templates into asset rows.

This closes the gap documented in `docs/asset-based-platform-migration-report.md`, where the full tool inventory remained outside the backend registry.

## Registry Contract

Required metadata for every registered asset:

| Field | Purpose |
|---|---|
| `assetId` | Canonical asset identifier, mapped from stored `PlatformAsset.id`. |
| `title` | User-facing asset name. |
| `type` | Canonical registry type: calculator, clinical-tool, dashboard, workflow, protocol, simulation, AI agent, map, IoT module, fleet module, report, integration, template. |
| `category` | Product/catalog grouping. |
| `route` | Launch or review route. |
| `organizationTypes` | Organization segments where the asset applies. |
| `workspaceTags` | Workspace/module placement tags. |
| `intendedRoles` | Primary roles the asset is intended for. |
| `lifecycleStatus` | Registry lifecycle, mapped from stored `lifecycle`. |
| `subscriptionTier` | Subscription tier, mapped from stored `pricingTier`. |
| `riskLevel` | Registry risk classification. |
| `demoStatus` | Demo/live status. |

Compatibility mappings preserve existing persisted names:

| Stored field/value | Registry projection |
|---|---|
| `id` | `assetId` |
| `assetType` | `type` |
| `ai_agent` | `AI agent` |
| `iot` | `IoT module` |
| `fleet` | `fleet module` |
| `lifecycle` | `lifecycleStatus` |
| `pricingTier` | `subscriptionTier` |

## Implemented Components

| Component | Purpose |
|---|---|
| `backend/src/modules/platform-assets/asset-registry.schema.ts` | Defines canonical registry types, required fields, validation, normalization, and projection helpers. |
| `backend/src/modules/platform-assets/asset-registry.service.ts` | Centralizes registry list/get/update behavior and projects stored assets into canonical metadata. |
| `backend/src/modules/platform-assets/platform-assets.service.ts` | Delegates asset list/get/lifecycle operations to `AssetRegistryService` while preserving existing method names. |
| `backend/src/modules/platform-assets/platform-assets.seed.service.ts` | Persists complete metadata and backfills missing registry rows/pack memberships into existing databases. |
| `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` | Expands registry seed data from pack assets plus migrated catalogs. |

## Migrated Inventory

The seed catalog now covers the existing pack assets and migrated capability sources:

| Source | Registered asset coverage |
|---|---|
| Platform asset packs | Core clinical tools, calculators, dashboards, maps, AI agents, IoT, fleet, governance, simulation, and product pack assets. |
| Platform dashboards | Command center, assistant, device fleet, fleet map, timeline, workflows, asset library, system health. |
| Platform systems | Interoperability, patient workspace, documentation AI, governance, privacy, regulatory, validation, review, audit, and operations capabilities. |
| Protocol pathway library | Sepsis, ACS, stroke, trauma, DKA, respiratory failure, pediatric fever pathways. |
| Simulation catalog | 16 demo-ready medical simulation scenarios. |
| Workflow automation builder | NEWS2 escalation, offline device maintenance, abnormal potassium workflow. |
| Plugin registry | Calculator, protocol, simulation, dashboard, workflow, and AI extension plugin assets. |
| Templates | Discharge summary, SOAP note, referral letter, and prior authorization templates. |

## Validation Rules

Registry validation enforces:

- All required fields are present.
- `assetId` uses lowercase registry ID syntax.
- `route` starts with `/`.
- `organizationTypes`, `workspaceTags`, and `intendedRoles` are non-empty arrays.
- Type, lifecycle, subscription tier, risk level, and demo/live status values are supported.
- Seed IDs are unique.

## Verification

Focused backend verification passed:

```bash
cd backend
npm test -- src/modules/platform-assets/asset-registry.service.spec.ts src/modules/platform-assets/platform-assets.service.spec.ts
```

Result: 2 test suites passed, 10 tests passed.

## Follow-Up Considerations

The registry now owns backend asset metadata and current API projections. Frontend compatibility catalogs such as `src/data/toolInventory.js` can be moved incrementally to consume `/api/platform/assets` projections as individual surfaces are retired from local fallback data.
