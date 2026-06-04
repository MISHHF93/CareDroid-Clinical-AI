# CareDroid Commercial Plans

Revenue packaging maps **commercial plans → products → asset packs → platform assets**. No duplicate tool registry rows.

## Plans

| Plan ID | Name | Typical buyer |
|---------|------|----------------|
| `starter` | Starter | Small clinic / pilot |
| `professional` | Professional | Department deployment |
| `enterprise` | Enterprise | Health system |
| `academic` | Academic | University / GME |
| `government` | Government | Public sector |

## Hierarchy

```text
CommercialPlan.includedProductIds + includedPackIds
  → Product.packIds
    → AssetPack.assetIds
      → PlatformAsset (tools, dashboards, agents, simulations)
```

## APIs

- `GET /api/commercial-plans`
- `GET /api/commercial-plans/:id`
- `POST /api/organizations/onboarding` (optional `commercialPlanId`)

## Organization linkage

`Organization.settings.commercialPlanId` stores the selected plan. Pack installation uses existing entitlement APIs.

See [solution-packs.md](./solution-packs.md) for pack catalog and [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md) Phase 5.
