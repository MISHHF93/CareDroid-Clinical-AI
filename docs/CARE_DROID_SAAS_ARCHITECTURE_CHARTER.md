# CareDroid SaaS Architecture Charter

**Status:** Canonical reference for compliance audits (`saas-compliance-audit.md`)  
**Version:** 1.0 (2026-06-04)

## Principles

CareDroid is a **multi-tenant healthcare operating system**. Configuration (organization type, packs, role profiles, workspace tool lists) replaces code forks. Clinical tools remain launchable by URL; entitlements control **visibility and recommendations**, not silent removal of governed deep links without policy.

## Rules (verified by `npm run saas-compliance-audit:write-docs`)

1. **Everything is an asset** — Every user-facing surface maps to a canonical `platform_assets` row (or an explicit integration/commercial asset type documented in seed).
2. **Every asset belongs to a pack** — `packIds` non-empty; membership reflected in `asset_packs.assetIds`.
3. **Every asset can be assigned to a tenant** — Reachable via `organization_entitlements` through packs with `organizationTypes`.
4. **Every asset can be assigned to a workspace** — Scoped via `enabledToolIds`, `LEGACY_TOOL_ID_ALIASES`, or workspace tags.
5. **Every asset can be assigned to a role** — `role_profiles`, pack `targetRoles`, and/or asset `intendedRoles`.
6. **Every asset has governance metadata** — `governance` JSON: clinical risk, human review, audit expectations, validation status.
7. **Every asset has lifecycle status** — `lifecycle`: `draft` | `beta` | `active` | `deprecated` | `archived` (or inventory `lifecycleState` during migration).

## Layer model

```text
Product (commercial) → Solution pack → Platform asset → Tool execution (route / executor / chat)
Organization → Entitlements → Workspace ∩ Role profile → Effective catalog
```

## Non-goals

- This charter does not claim PHI production readiness or FDA clearance.
- Inventory-only tools (`toolInventory.js`) are **migration debt** until backfilled to `platform_assets`.

## Related

- [asset-based-platform-migration-report.md](./asset-based-platform-migration-report.md)
- [final-saas-migration-execution-plan.md](./final-saas-migration-execution-plan.md)
- [closure-audit-sequence.md](./closure-audit-sequence.md)
