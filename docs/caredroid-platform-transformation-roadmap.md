# CareDroid Platform Transformation Roadmap

Status: active implementation roadmap  
Scope: asset-based healthcare operating system — organization profiles, role profiles, asset registry, solution packs, entitlements, and org-scoped navigation  
Non-goal: this document does not claim capabilities are fully production-hardened unless noted in phase status

## Related documents

- [CareDroid Next-Generation Roadmap](./caredroid-next-generation-roadmap.md) — clinical intelligence and inventory-first expansion
- [Platform Systems Expansion Plan](./platform-systems-expansion-plan.md) — interoperability, patient workspace, governance packs
- [User Profile + Workspace System](./user-profile-workspace-system.md) — operational identity and workspace APIs
- [User Profile Tool Segmentation](./user-profile-tool-segmentation.md) — frontend role/org recommendation graph

---

## 1. Current State

### Tool-centric catalog

CareDroid exposes ~227 registry tools through a disciplined static pipeline:

`clinicalToolIdContract.js` → `toolRegistry.js` → `toolInventory.js` → `registryToolLaunch.js` → SPA routes.

Most tools are frontend-local or chat-assisted; only three POST executors are registered (`sofa-calculator`, `drug-interactions`, `lab-interpreter`). This honesty is a strength for migration.

### Organization and tenancy

- `Organization` exists in TypeORM (`backend/src/modules/workspaces/entities/organization.entity.ts`) with name, slug, branding — **no public CRUD API** before this transformation.
- Users store `institution` as a string on `UserProfile`, not a foreign key to an organization.
- Audit and governance entities may carry `organizationId`, but queries are not consistently tenant-scoped.

### Workspace fragmentation

Three concepts coexist:

1. Backend operational workspaces (`/api/workspaces`, `enabledToolIds`, `enabledModules`)
2. UX care workspaces (`workspaceArchitecture.js`, workspace home)
3. Local tool-filter workspaces (`WorkspaceContext.jsx`, localStorage)

### Packs and assets

- Medical expansion packs and platform system packs are **documentation and static ID groupings**, not installable entitlements.
- `buildAssetRegistry()` in `platformOperatingSystem.js` projects demo artifacts only.
- `ArtifactsModule` stores knowledge artifacts; `AssetRegistryService` is a small static list unrelated to tool inventory.

### Role and permissions

- Global `UserRole` (physician, nurse, student, admin) with ~80 permissions enforced on backend controllers.
- Profile roles in `profileToolSegmentation.js` drive Discover recommendations but not server-side catalog filtering.
- Workspace `effectivePermissions` are returned by API but primary nav and `PermissionGate` mostly use global role.

---

## 2. Target State

### Layer model (CareDroid OS)

```text
CareDroid OS (Layer 1 — Core Platform)
  Authentication, profiles, assistant, dashboard, search, notifications,
  audit, security, governance, analytics

Organization Profile (Layer 2)
  hospital | clinic | EMS | university | research | telehealth | LTC | home_care

Role Profile (Layer 3)
  emergency physician | nurse | pharmacist | fleet manager | …

Workspace (Layer 4)
  personal | hospital | emergency | fleet | research | admin (backend-authoritative)

Asset Packs (Layer 5)
  Emergency Medicine | Laboratory Intelligence | Hospital Operations | …

Platform Assets (Layer 6)
  tool | calculator | protocol | simulation | workflow | dashboard | map | ai_agent

Tools (execution layer)
  Existing routes, calculators, chat launches — unchanged
```

### Acceptance criteria

1. **Configuration without code forks** — EMS vs hospital org types receive different default packs and entitled asset sets via API/DB only.
2. **Role-aware UX** — Role profile changes Discover, dashboard widgets, and entitled assets without redeploy.
3. **Tools remain functional** — Direct URLs and launch contracts work; entitlements hide from catalog, not block deep links for admins unless policy requires.
4. **Pack install** — Admin enables a pack; member asset IDs appear in entitlement projection.
5. **Workspace enforcement** — `enabledToolIds` / asset aliases enforced on launch paths in UI.

---

## 3. Asset Model

### Platform asset types

| `assetType` | Source today |
|-------------|----------------|
| `tool` | `toolRegistry` / inventory rows |
| `calculator` | Tier A calculators, hub slugs |
| `protocol` | Protocols, emergency workflows |
| `simulation` | Medical simulation suite |
| `workflow` | Workflow builder, automation |
| `dashboard` | Command, lab, fleet, operations dashboards |
| `map` | Hospital map, live map |
| `ai_agent` | Clinical, operations, lab, fleet, education, research agents |
| `plugin` | `pluginRegistry` entries |

### Fields

| Field | Purpose |
|-------|---------|
| `id` | Canonical registry id where applicable |
| `assetType` | Type discriminator |
| `category` | UI grouping |
| `route`, `launchType` | Navigation / launch |
| `permissionPolicy` | RBAC JSON |
| `organizationTypes` | Empty = all org types |
| `roleProfiles` | Empty = all role profiles |
| `specialties` | Optional filter |
| `lifecycle` | `draft` \| `beta` \| `active` \| `deprecated` \| `archived` |
| `pricingTier` | `core` \| `standard` \| `enterprise` \| `addon` |
| `packIds` | Denormalized pack membership |
| `dependencies` | Required asset ids |

### Lifecycle rules

- `draft` — visible to org admins in lifecycle UI only
- `active` — eligible for entitlements
- `deprecated` — hidden from Discover; deep links may show deprecation banner
- admin-only access — controlled through permission policy, governance metadata, feature flags, or entitlement rules

---

## 4. Organization Model

### Organization types

`hospital`, `academic_medical_center`, `clinic`, `ems`, `research_institute`, `health_system`, `long_term_care`, `home_care`, `telehealth`, `university`

### Organization record

- `id`, `name`, `slug`, `organizationType`, `country`, `branding`, `settings` (JSON)
- Default pack slugs assigned on create from `organizationType`
- Workspaces link via `organizationId`

### Membership

`OrganizationMembership`: `userId`, `organizationId`, `role` (`owner` \| `admin` \| `member`), optional `roleProfileId`

### User linkage

`UserProfile.organizationId` FK; `institution` string retained for display fallback

---

## 5. Role Model

### Three layers

1. **Global `UserRole`** — PHI, governance, clinical tool permissions (backend `role-permissions.config.ts`)
2. **Workspace membership role** — `owner`, `admin`, `clinician`, `nurse`, … + `effectivePermissions`
3. **Role profile** — Product UX role (`emergency physician`, `pharmacist`, …) mapping to asset filters, default dashboard, AI agent defaults

### Permission merge order

```text
global role permissions
  ∩ workspace effectivePermissions
  ∩ organization entitled assets (packs)
  ∩ role profile asset filter
  ∩ asset permissionPolicy
  ∩ lifecycle (draft, beta, active, deprecated, archived)
```

---

## 6. Revenue Model

| Tier | Includes |
|------|----------|
| **Core platform** | Auth, assistant, core calculators, dashboard, search (Layer 1) |
| **Standard packs** | Specialty calculator packs, documentation pack |
| **Enterprise packs** | Hospital Operations, Digital Twin, Fleet, Laboratory Intelligence |
| **Add-ons** | Named AI agents, advanced analytics, interoperability connectors |

Commercial billing (Stripe) is **Phase 4 optional**; `pricingTier` on packs supports future entitlements without blocking configuration-first deployment.

---

## 7. Migration Plan

### Principles

1. **Inventory-first** — `toolInventory.js` remains source of launch metadata; backend assets are entitlements + metadata overlay.
2. **Dual-read** — If platform API unavailable, fall back to full inventory + `profileToolSegmentation` (same as workspace fallback).
3. **Additive packs** — New orgs get type defaults; existing users keep personal workspaces until linked to an org.
4. **Alias map** — Legacy workspace `enabledToolIds` (`calculators`, `drug-check`) map to asset ids via `LEGACY_TOOL_ID_ALIASES`.

### Feature flags

| Flag | Purpose |
|------|---------|
| `platform-entitlements` | Filter catalog by org/pack entitlements |
| `single-workspace-model` | Hide local `WorkspaceContext` tool filter in sidebar |

### Rollback

Disable `platform-entitlements` to restore full catalog visibility without DB migration rollback.

---

## 8. Implementation Phases

### Phase 1 — Foundation (in progress)

- `PlatformAssetsModule`: entities, seed, read APIs
- `OrganizationsModule`: CRUD, membership, default packs
- `RoleProfile` seed aligned with `PROFILE_ROLES`
- `GET /api/platform/context` for entitlements
- Frontend `platformAssetsApi.js`, `assetEntitlements.js`, inventory filter

### Phase 2 — Entitlements drive visibility

- Organization settings UI
- Sidebar single workspace model (flagged)
- Launch path checks for workspace `enabledToolIds`

### Phase 3 — Org product surfaces

- Organization dashboard, pack marketplace, lifecycle admin
- Organization analytics API

### Phase 4 — Enterprise

- AI agent marketplace routing in assistant
- Hospital Digital Twin API (org-scoped)
- Billing hooks (optional)

### Phase 5 — Productization

- `ProductCatalogModule`: products, commercial plans, specialties, care pathways, integrations catalog
- Organization onboarding wizard (`POST /api/organizations/onboarding`, `/onboarding`)
- Maturity assessment and outcome tracking APIs
- Configuration studio (`PATCH /api/organizations/:id/configuration`)
- Frontend: `/products`, `/specialties`, `/care-pathways`, `/agents`, `/outcomes`, `/integrations-marketplace`, `/configuration-studio`

---

## Phase status tracker

| Component | Status |
|-----------|--------|
| Roadmap document | Shipped |
| Platform assets module | Shipped |
| Organizations API | Shipped |
| Role profiles | Shipped |
| Entitlement projection (frontend) | Shipped |
| Organization UI surfaces | Shipped |
| Workspace consolidation | Shipped (feature-flagged) |
| Digital Twin API | Shipped |
| AI agent registry | Shipped |
| Organization analytics | Shipped |
| Product catalog & commercial plans | Shipped |
| Organization onboarding wizard | Shipped |
| Specialty & pathway marketplaces | Shipped |
| Maturity assessment | Shipped |
| Outcomes dashboard | Shipped |
| Integration marketplace | Shipped |
| Configuration studio | Shipped |
