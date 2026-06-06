# Subscription Entitlement Model

CareDroid subscription entitlements are resolved through a single commercial hierarchy:

```text
Plan -> Products -> Packs -> Assets
```

The canonical plans are:

- `starter`
- `professional`
- `enterprise`
- `academic`
- `government`

## Source Of Truth

`CommercialPlan` is the Plan model. Each plan defines directly included products and packs:

- `includedProductIds` points to sellable product bundles.
- `includedPackIds` grants packs directly.
- Product `packIds` expand plan products into asset packs.
- Pack `assetIds` expand packs into visible and launchable platform assets.

Organization plan reconciliation installs plan packs into `organization_entitlements` and stores the reconciled plan in organization settings:

- `organization.settings.commercialPlanId`
- `organization.settings.commercialPlanPackIds`
- `organization.settings.commercialPlanReconciledAt`

## Entitlement Resolution

The entitlement engine resolves a plan into a normalized graph:

1. Load the commercial plan.
2. Load products from `includedProductIds`.
3. Combine direct `includedPackIds` with product `packIds`.
4. Load packs and expand their `assetIds`.
5. Load platform assets for the resolved asset IDs.

At runtime, tenant-scoped access decisions also include:

- Organization enabled pack entitlements.
- User subscription tier from tenant context.
- Asset pricing tier and entitlement rules.
- Feature rollout state.
- Admin-only restrictions.
- Strict SaaS entitlement mode.

## Visibility Rules

User-facing catalog and platform asset responses only include assets that are both entitled and launchable for the current tenant context.

Filtered surfaces include:

- Product builder graphs.
- Product asset detail responses.
- Asset pack builder graphs.
- Platform asset list/detail endpoints.
- Asset dependency graph.
- Frontend tool and quick command launch surfaces.

Marketplace and administrative configuration surfaces may still show pack availability or administrative metadata so admins can install packs and manage lifecycle state. Runtime launch guards remain enforced even if a user deep-links directly to a route.

## API Behavior

Plan reconciliation:

- `PATCH /organizations/:organizationId/commercial-plan`
- Body: `commercialPlanId`, optional `disableRemovedPacks`
- Installs all packs resolved from the selected plan plus `core-platform`.
- Optionally disables packs no longer included in the selected plan.

Entitlement-filtered reads:

- `GET /products/builder?organizationId=...`
- `GET /products/:slug/builder?organizationId=...`
- `GET /products/:slug/assets?organizationId=...`
- `GET /asset-packs?organizationId=...`
- `GET /platform/assets`
- `GET /platform/assets/:assetId`
- `GET /dependency-graph?organizationId=...`

Frontend clients pass the active organization ID where supported and treat backend responses as authoritative. Local catalogs are used for presentation and launch routing only after platform entitlement context confirms access.
