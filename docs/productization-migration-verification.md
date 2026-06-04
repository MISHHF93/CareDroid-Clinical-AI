# Productization Migration Verification

Use this checklist to confirm Prompts 31–40 are migrated (not only scaffolded).

## Backend

| Check | Expected | Verify |
|-------|----------|--------|
| Module registered | `ProductCatalogModule` in `app.module.ts` | `npm run build` in `backend/` |
| Product seed | 10 rows in `products` | `GET /api/products` (auth) |
| Commercial plans | 5 rows | `GET /api/commercial-plans` |
| Specialties | 10 rows | `GET /api/specialties` |
| Care pathways | 7 rows | `GET /api/care-pathways` |
| AI agents | 8 incl. `agent-emergency`, `agent-governance` | `GET /api/agents` |
| Pack → product map | JSON map | `GET /api/products/pack-map` |
| Org onboarding | Creates org + packs | `POST /api/organizations/onboarding` |
| Outcomes | Audit-derived metrics | `GET /api/organizations/:id/outcomes` |
| Configuration | PATCH settings | `PATCH /api/organizations/:id/configuration` |
| Pack install auth | Owner/admin only | Non-admin receives 403 |
| Catalog validation | Runs after seed | Backend logs on startup (warns if asset ids missing) |

## Frontend routes

| Route | Page |
|-------|------|
| `/products`, `/products/:slug` | Product catalog |
| `/plans` | Commercial plans |
| `/onboarding` | Organization wizard (7 steps) |
| `/welcome` | User welcome (formerly `/onboarding`) |
| `/specialties`, `/specialties/:slug` | Specialty marketplace |
| `/care-pathways`, `/care-pathways/:slug` | Care pathways |
| `/agents` | AI agent registry |
| `/maturity-assessment` | Maturity + product recommendations |
| `/outcomes` | Leadership outcomes |
| `/integrations-marketplace` | Integration browse/request |
| `/configuration-studio` | Tenant configuration |

## Wiring

| Check | Location |
|-------|----------|
| Solutions sidebar | `Sidebar.jsx` + `SOLUTIONS_SIDEBAR_NAV_ITEMS` when `commercialSurfaces` |
| Hidden nav applied | `organization.settings.navigation.hiddenNavIds` filters sidebar |
| Pack marketplace products | `PackMarketplace` shows “Part of {Product}” |
| Maturity stored on org | `POST /api/maturity-assessments` with `organizationId` |
| Feature flag | `VITE_COMMERCIAL_SURFACES` (default true) |

## Hierarchy invariant

```text
Product.packIds → AssetPack.assetIds → PlatformAsset.id
```

No duplicate rows in `platform_assets` for productization manifests.

## Out of scope (by design)

- Stripe org billing
- Full FHIR connector implementation
- `requiredDependencies` enforcement in entitlements (stretch)
- Replacing `toolInventory.js` with backend-only registry

## Quick smoke (local)

1. Start backend + frontend with auth.
2. Open `/products` — 10 suites listed.
3. Complete `/onboarding` — org created, redirect to `/organization`.
4. Open `/settings/organization/packs` — packs show parent product links.
5. Save config at `/configuration-studio` — hide a nav id, confirm sidebar updates after refresh.
