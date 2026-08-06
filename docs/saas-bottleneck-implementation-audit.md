# SaaS Bottleneck Implementation Audit

Generated: 2026-08-06T19:39:56.470Z

## Purpose

This scanner checks whether the implementation matches the architecture plan in `docs/saas-bottleneck-architecture-plan.md`.

## Summary

- Score: **61 / 100**
- Passing checks: **8 / 14**
- Partial checks: **1**
- Failing checks: **5**

## Checks

| Phase | Check | Status | Evidence | Next step |
| --- | --- | --- | --- | --- |
| Phase 0 | SaaS bottleneck architecture plan exists | **FAIL** | `docs/saas-bottleneck-architecture-plan.md` | Keep this focused plan linked from future implementation tickets. |
| Phase 1 | Seeded platform assets are fully packaged | **FAIL** | 68/69 seeded assets compliant; 1 violations | Fix seeded asset pack/specialty/role/org mappings before expanding strict rollout. |
| Phase 1 | All user-facing inventory tools are platform assets | **PARTIAL** | 245 frontend-mounted registry tools await backend seed rows; 0 lack mounted projection | Promote high-value mounted projection rows into backend `platform_assets` when they need entitlement enforcement, billing, or marketplace ownership. |
| Phase 2 | Backend strict SaaS entitlement mode is implemented | **FAIL** | `PlatformAssetsService.resolveEntitledAssetIds` supports strict organization behavior | Keep fallback behavior feature-flagged and disabled for strict org tenants. |
| Phase 2 | Onboarding workspaces are backend authoritative and org-linked | **FAIL** | `WorkspacesService.createWorkspace` accepts organization scope; onboarding sends supported workspace type and enabled tool IDs | Migrate remaining localStorage workspace filters behind compatibility mode. |
| Phase 2 | Organization-scoped platform reads enforce membership | **PASS** | `platform-assets.controller.ts` checks organization membership for entitlements, analytics, and digital twin reads | Extend the same assertion pattern to new organization-scoped endpoints. |
| Phase 3 | Asset lifecycle changes require platform admin role | **PASS** | `PATCH /platform/assets/:assetId/lifecycle` checks `UserRole.ADMIN` | Add audit logging when lifecycle state changes. |
| Phase 3 | Frontend access projection honors strict entitlements and workspace scope | **PASS** | `assetEntitlements.ts` and `assetAccess.ts` expose strict and workspace-restricted access behavior | Route more commercial/product launch actions through the same access projection. |
| Phase 3 | Registry launch path checks entitlement and workspace scope | **PASS** | `registryToolLaunch.js` gates launch through `resolveRegistryToolLaunchAccess` / `resolveAssetAccessState` and redirects denied launches | Audit direct `navigate(asset.route)` product surfaces and replace bypasses. |
| Phase 4 | Products and commercial plans map to packs | **PASS** | `Product` and `CommercialPlan` entities include pack/product/tier mappings | Reconcile future billing events into organization entitlements. |
| Phase 4 | Role profiles feed platform context and segmentation | **PASS** | `RoleProfile` stores preferred/hidden assets and defaults; platform context returns role profile/default agent | Make role profile authoritative across every recommendation and dashboard surface. |
| Phase 4 | User profile compiler unifies routes, tools, and launch policy | **FAIL** | `userProfileCompiler.ts`, `profilePackTaxonomy.ts`, `useCompiledUserProfile`, and registry pack metadata in `toolInventory.js` | Route remaining direct launch bypasses through `compileUserProfile` / `isToolAllowedForCompiledProfile`. |
| Phase 4 | SaaS catalog has explicit segregation and curated required tools | **PASS** | `user-profile-catalog.data.json` includes assignable org types, entitlement packs, and profile-specific required tools | Keep backend `saas-profile-rbac.config.ts` pack IDs aligned with frontend taxonomy. |
| Phase 5 | Strict entitlement and workspace behavior has targeted tests | **PASS** | Frontend asset tests and backend platform asset service spec cover strict and workspace behavior | Add controller tests for organization membership checks and lifecycle admin checks. |

## Phase View

### Phase 0

- **FAIL:** SaaS bottleneck architecture plan exists

### Phase 1

- **FAIL:** Seeded platform assets are fully packaged
- **PARTIAL:** All user-facing inventory tools are platform assets

### Phase 2

- **FAIL:** Backend strict SaaS entitlement mode is implemented
- **FAIL:** Onboarding workspaces are backend authoritative and org-linked
- **PASS:** Organization-scoped platform reads enforce membership

### Phase 3

- **PASS:** Asset lifecycle changes require platform admin role
- **PASS:** Frontend access projection honors strict entitlements and workspace scope
- **PASS:** Registry launch path checks entitlement and workspace scope

### Phase 4

- **PASS:** Products and commercial plans map to packs
- **PASS:** Role profiles feed platform context and segmentation
- **FAIL:** User profile compiler unifies routes, tools, and launch policy
- **PASS:** SaaS catalog has explicit segregation and curated required tools

### Phase 5

- **PASS:** Strict entitlement and workspace behavior has targeted tests

## Interpretation

- `PASS` means the scanner found concrete implementation evidence for the plan item.
- `PARTIAL` means the capability exists but is not complete enough to claim the full plan is implemented.
- `FAIL` means expected implementation evidence was not found in the current tree.

## Regenerate

```bash
npm run saas-bottleneck-audit:write-docs
```
