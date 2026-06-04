# Asset-Based Platform Migration Report

## 1. Executive Summary

CareDroid has migrated from a **tool-centric catalog** (~227 registry tools) to an **asset-based, tenant-aware Healthcare-as-a-Service platform**. Existing routes, calculators, and launch contracts are preserved. Visibility and sales are driven by **organization → workspace → role → asset pack → asset** configuration, not code forks.

## 2. Why move from tool-centric to asset-based

Hospitals buy **outcomes and configured solutions**, not 270 sidebar entries. Multi-tenant SaaS requires per-tenant packs, permissions, and branding without separate deployments. The prior model exposed the full inventory to every user, with profile segmentation as recommendations only.

## 3. Organization model

- Entity: `Organization` with `organizationType`, `branding`, `settings`
- Membership: `OrganizationMembership` (owner, admin, member)
- User link: `UserProfile.organizationId`
- APIs: `GET/POST /api/organizations`, `GET /api/organizations/current`
- Default packs assigned by `organizationType` on create

## 4. Workspace model

- Backend workspaces remain authoritative (`enabledToolIds`, `enabledModules`)
- Legacy alias map bridges short ids (`calculators`) to asset ids
- Feature flag `VITE_SINGLE_WORKSPACE_MODEL` reduces local tool-filter workspace UX

## 5. User role model

- Global `UserRole` (physician, nurse, student, admin) for RBAC
- **Role profiles** (`RoleProfile` table): emergency physician, nurse, pharmacist, fleet operator, etc.
- `PATCH /api/platform/me/role-profile` sets active profile
- Profile drives recommendations and hidden/preferred assets

## 6. Asset registry model

- Table: `platform_assets` with governance, risk, backend/demo status, pack membership
- Seed catalog for pack members; full tool inventory remains in `toolInventory.js` (no duplicate registry)
- Frontend projection: `assetAccess.js` + `assetInventory.js`

## 7. Asset pack model

- Table: `asset_packs` with `targetRoles`, `salesMetadata`, `requiredDependencies`
- Entitlements: `organization_entitlements`
- 14 seeded packs including ED, ICU, cardiology, IoT, simulation, governance, digital twin, AI workflow
- Docs: [solution-packs.md](./solution-packs.md)

## 8. Permission / entitlement rules

Access states: `allowed`, `hidden`, `locked`, `restricted`, `requires-admin`, `requires-review`, `unsupported`, `demo-only`.

User can access when:

1. Organization enables pack containing asset (or no org → full catalog fallback)
2. Workspace allows asset (via `enabledToolIds` aliases)
3. Role profile does not hide asset
4. Global role satisfies asset policy / lifecycle
5. Asset lifecycle is active or demo-labeled

Backend: `AssetAccessService`  
Frontend: `resolveAssetAccessState()` in `assetAccess.js`

## 9. Frontend changes

| Surface | Change |
|---------|--------|
| `/tools` | Filters: Recommended, Workspace, Organization, Permitted, specialty filters; access badges |
| `/organization` | Organization dashboard |
| `/asset-packs` | Solution pack marketplace |
| `/settings/organization` | Tenant settings, role profile |
| `/platform-analytics` | Pack/adoption summary |
| Command dashboard | Asset-aware model + role recommendations |
| Digital twin | API-backed snapshot with fallback |
| UserIdentityContext | Loads `/api/platform/context` |

## 10. Backend changes

| Module | Purpose |
|--------|---------|
| `platform-assets` | Assets, packs, entitlements, context, access, recommendations, twin, analytics |
| `organizations` | Tenant CRUD, current org, default packs |

Key endpoints:

- `GET /api/platform/context`
- `GET /api/platform/users/me/assets`
- `GET /api/platform/users/me/recommendations`
- `POST /api/platform/users/me/pinned-assets`
- `POST /api/platform/users/me/hidden-assets`

## 11. AI assistant changes

- Six AI agent assets (clinical, operations, lab, fleet, education, research)
- `assetRecommendation.js` suggests tools by role/workspace
- `buildAssistantAssetContext()` for chat surfaces (integrate in Dashboard as needed)
- Default agent from role profile via platform context

## 12. Solution pack sales model

Packs carry `pricingTier` (core, standard, enterprise, addon) and optional `salesMetadata`. Billing integration remains optional; configuration-first deployment is supported today.

## 13. Governance model

Platform assets include `governance` JSON:

- `clinicalRiskLevel` (informational → high-risk)
- `requiresHumanReview`
- `auditRequired`
- `validationStatus`

Lifecycle admin: `/settings/organization/assets`

## 14. Analytics model

- `GET /api/platform/organizations/:id/analytics` — audit counts, pack adoption, top tools
- UI: `/platform-analytics`

## 15. Tests added

- `src/data/assetEntitlements.test.js`
- `src/data/assetAccess.test.js` (new)
- `backend/.../platform-assets.service.spec.ts`

## 16. Remaining risks

| Risk | Mitigation |
|------|------------|
| Partial DB asset seed vs full 227 tools | Frontend uses tool inventory as source of truth; DB enriches pack members |
| Existing DB without new columns | TypeORM `synchronize: true` in dev SQLite adds columns |
| RBAC drift | Continue consolidating on `/api/profile/me` effective permissions |
| PHI multi-tenancy | Document row-level isolation path; orgId on audit today |
| Pack seed not re-run on existing DB | Manual migration or reset SQLite for new packs |

## Related documents

- [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md)
- [solution-packs.md](./solution-packs.md)
