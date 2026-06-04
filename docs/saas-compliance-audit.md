# SaaS Architecture Compliance Audit

Generated: 2026-06-04 (regenerate with `npm run saas-compliance-audit:write-docs`)

## Charter reference

**Note:** `CARE_DROID_SAAS_ARCHITECTURE_CHARTER.md` was **not found** in the repository root or `docs/`. This audit applies the charter checklist from the audit request and aligns with [asset-based-platform-migration-report.md](./asset-based-platform-migration-report.md) and [caredroid-platform-transformation-roadmap.md](./caredroid-platform-transformation-roadmap.md).

### Charter rules verified

1. **Everything is an asset** — Every shipped surface maps to a canonical `platform_assets` row (or explicit product/integration asset type).
2. **Every asset belongs to a pack** — `packIds` must be non-empty on the asset record and match `asset_packs.assetIds`.
3. **Every asset can be assigned to a tenant** — Asset is reachable via `organization_entitlements` through at least one pack with `organizationTypes`.
4. **Every asset can be assigned to a workspace** — Workspace can scope the asset via `enabledToolIds`, `LEGACY_TOOL_ID_ALIASES`, or `workspaceTags`.
5. **Every asset can be assigned to a role** — Role profile or `intendedRoles` / `roleProfiles` on the asset supports entitlement filtering.
6. **Every asset has governance metadata** — `governance` JSON includes clinical risk, human review, audit, and validation status.
7. **Every asset has lifecycle status** — `lifecycle` on platform asset (`draft|active|deprecated|admin_only`) or inventory `lifecycleState`.

## Executive summary

| Metric | Count |
|--------|------:|
| Surfaces audited | 316 |
| User-facing registry tools | 291 |
| Seeded `platform_assets` | 59 |
| Fully charter-compliant (strict) | 39 |
| Rows with ≥1 violation | 277 |
| Registry tools without platform asset row | 254 |
| Seeded assets without pack | 8 AI agents + 0 other |

### Compliance posture

CareDroid runs a **dual registry**: 291 user-facing tools in `toolInventory.js` vs 59 rows in `platform_assets` seed. The charter target is single asset identity with pack, tenant, workspace, role, governance, and lifecycle on every surface. **Current state: partial** — pack-seeded assets meet governance/lifecycle in DB; the majority of registry tools are inventory-only and fail strict asset + pack + governance rules.

## Violations by charter rule

### Everything is an asset (264 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Platform Analytics** (`—`, /platform-analytics) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Integration Marketplace** (`—`, /integrations-marketplace) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Product Catalog** (`—`, /products) — No `platform_assets` seed row; only `toolInventory.js` projection
- **User Welcome** (`—`, /welcome) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Asset Pack Marketplace** (`—`, /asset-packs) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Configuration Studio** (`—`, /configuration-studio) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Organization Dashboard** (`—`, /organization) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Organization Onboarding** (`—`, /onboarding) — No `platform_assets` seed row; only `toolInventory.js` projection
- **3D Viewer** (`medical-3d-viewer`, /3d-viewer) — No `platform_assets` seed row; only `toolInventory.js` projection
- **A-a Gradient** (`aa-gradient`, /tools/calculators/aa-gradient) — No `platform_assets` seed row; only `toolInventory.js` projection
- **ABCD² score** (`abcd2`, /tools/calculators/abcd2) — No `platform_assets` seed row; only `toolInventory.js` projection
- **ACS Workflow Assistant** (`acs-workflow-assistant`, /tools/cardiology/acs-workflow-assistant) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Adjusted Body Weight** (`adjusted-body-weight`, /tools/calculators/adjusted-body-weight) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Artifacts** (`ai-artifacts`, /artifacts) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Command Center** (`ai-command-center`, /ai-command-center) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Cost Optimization** (`ai-cost-optimization`, /costs) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Evaluation** (`ai-evaluation`, /ai/evaluation) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Gateway** (`ai-gateway`, /assistant) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Governance** (`ai-governance`, /ai-governance) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Memory** (`ai-memory`, /ai-memory) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Run Audit Timeline** (`ai-run-audit-timeline`, /audit/ai) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Tool Calling** (`ai-tool-calling`, /assistant) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AI Training Pipeline** (`ai-training`, /training) — No `platform_assets` seed row; only `toolInventory.js` projection
- **AKI Staging Assistant** (`aki-staging-assistant`, /tools/nephrology/aki-staging-assistant) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Ambient Clinical Scribe** (`ambient-scribe`, /tools/ambient-scribe) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Anion Gap** (`anion-gap`, /tools/calculators/anion-gap) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Antibiotic Guide** (`antibiotic-guide`, /tools/diagnosis) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Anticoagulation Protocol Plugin** (`plugin-anticoagulation-protocol`, /protocols) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Apgar score** (`apgar-score`, /tools/calculators/apgar-score) — No `platform_assets` seed row; only `toolInventory.js` projection
- **APRI** (`apri`, /tools/calculators/apri) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Arrhythmia Risk Classifier** (`arrhythmia-risk-classifier`, /tools/cardiology/arrhythmia-risk-classifier) — No `platform_assets` seed row; only `toolInventory.js` projection
- **ASCVD 10-year risk** (`ascvd-risk`, /tools/calculators/ascvd-risk) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Asthma Exacerbation Assistant** (`asthma-exacerbation-assistant`, /tools/pulmonology/asthma-exacerbation-assistant) — No `platform_assets` seed row; only `toolInventory.js` projection
- **Asthma Severity Score** (`asthma-severity-score`, /tools/calculators/asthma-severity-score) — No `platform_assets` seed row; only `toolInventory.js` projection

- … and 229 more

### Every asset belongs to a pack (8 violations)

- **clinical AI** (`agent-clinical`, /assistant?agent=agent-clinical) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **education AI** (`agent-education`, /assistant?agent=agent-education) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **emergency AI** (`agent-emergency`, /assistant?agent=agent-emergency) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **fleet AI** (`agent-fleet`, /assistant?agent=agent-fleet) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **governance AI** (`agent-governance`, /assistant?agent=agent-governance) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **lab AI** (`agent-lab`, /assistant?agent=agent-lab) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **operations AI** (`agent-operations`, /assistant?agent=agent-operations) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)
- **research AI** (`agent-research`, /assistant?agent=agent-research) — Seeded asset has empty `packIds` (not listed in any `SEED_ASSET_PACKS.assetIds`)


### Every asset can be assigned to a tenant (272 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — Cannot assign via org pack entitlement (no pack membership)
- **clinical AI** (`agent-clinical`, /assistant?agent=agent-clinical) — Cannot assign via org pack entitlement (no pack membership)
- **education AI** (`agent-education`, /assistant?agent=agent-education) — Cannot assign via org pack entitlement (no pack membership)
- **emergency AI** (`agent-emergency`, /assistant?agent=agent-emergency) — Cannot assign via org pack entitlement (no pack membership)
- **fleet AI** (`agent-fleet`, /assistant?agent=agent-fleet) — Cannot assign via org pack entitlement (no pack membership)
- **governance AI** (`agent-governance`, /assistant?agent=agent-governance) — Cannot assign via org pack entitlement (no pack membership)
- **lab AI** (`agent-lab`, /assistant?agent=agent-lab) — Cannot assign via org pack entitlement (no pack membership)
- **operations AI** (`agent-operations`, /assistant?agent=agent-operations) — Cannot assign via org pack entitlement (no pack membership)
- **research AI** (`agent-research`, /assistant?agent=agent-research) — Cannot assign via org pack entitlement (no pack membership)
- **Platform Analytics** (`—`, /platform-analytics) — Cannot assign via org pack entitlement (no pack membership)
- **Integration Marketplace** (`—`, /integrations-marketplace) — Cannot assign via org pack entitlement (no pack membership)
- **Product Catalog** (`—`, /products) — Cannot assign via org pack entitlement (no pack membership)
- **User Welcome** (`—`, /welcome) — Cannot assign via org pack entitlement (no pack membership)
- **Asset Pack Marketplace** (`—`, /asset-packs) — Cannot assign via org pack entitlement (no pack membership)
- **Configuration Studio** (`—`, /configuration-studio) — Cannot assign via org pack entitlement (no pack membership)
- **Organization Dashboard** (`—`, /organization) — Cannot assign via org pack entitlement (no pack membership)
- **Organization Onboarding** (`—`, /onboarding) — Cannot assign via org pack entitlement (no pack membership)
- **3D Viewer** (`medical-3d-viewer`, /3d-viewer) — Cannot assign via org pack entitlement (no pack membership)
- **A-a Gradient** (`aa-gradient`, /tools/calculators/aa-gradient) — Cannot assign via org pack entitlement (no pack membership)
- **ABCD² score** (`abcd2`, /tools/calculators/abcd2) — Cannot assign via org pack entitlement (no pack membership)
- **ACS Workflow Assistant** (`acs-workflow-assistant`, /tools/cardiology/acs-workflow-assistant) — Cannot assign via org pack entitlement (no pack membership)
- **Adjusted Body Weight** (`adjusted-body-weight`, /tools/calculators/adjusted-body-weight) — Cannot assign via org pack entitlement (no pack membership)
- **AI Artifacts** (`ai-artifacts`, /artifacts) — Cannot assign via org pack entitlement (no pack membership)
- **AI Command Center** (`ai-command-center`, /ai-command-center) — Cannot assign via org pack entitlement (no pack membership)
- **AI Cost Optimization** (`ai-cost-optimization`, /costs) — Cannot assign via org pack entitlement (no pack membership)
- **AI Evaluation** (`ai-evaluation`, /ai/evaluation) — Cannot assign via org pack entitlement (no pack membership)
- **AI Gateway** (`ai-gateway`, /assistant) — Cannot assign via org pack entitlement (no pack membership)
- **AI Governance** (`ai-governance`, /ai-governance) — Cannot assign via org pack entitlement (no pack membership)
- **AI Memory** (`ai-memory`, /ai-memory) — Cannot assign via org pack entitlement (no pack membership)
- **AI Run Audit Timeline** (`ai-run-audit-timeline`, /audit/ai) — Cannot assign via org pack entitlement (no pack membership)
- **AI Tool Calling** (`ai-tool-calling`, /assistant) — Cannot assign via org pack entitlement (no pack membership)
- **AI Training Pipeline** (`ai-training`, /training) — Cannot assign via org pack entitlement (no pack membership)
- **AKI Staging Assistant** (`aki-staging-assistant`, /tools/nephrology/aki-staging-assistant) — Cannot assign via org pack entitlement (no pack membership)
- **Ambient Clinical Scribe** (`ambient-scribe`, /tools/ambient-scribe) — Cannot assign via org pack entitlement (no pack membership)
- **Anion Gap** (`anion-gap`, /tools/calculators/anion-gap) — Cannot assign via org pack entitlement (no pack membership)

- … and 237 more

### Every asset can be assigned to a workspace (10 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — No workspace alias or asset id for `enabledToolIds` scoping
- **Platform Analytics** (`—`, /platform-analytics) — No workspace alias or asset id for `enabledToolIds` scoping
- **Integration Marketplace** (`—`, /integrations-marketplace) — No workspace alias or asset id for `enabledToolIds` scoping
- **Product Catalog** (`—`, /products) — No workspace alias or asset id for `enabledToolIds` scoping
- **User Welcome** (`—`, /welcome) — No workspace alias or asset id for `enabledToolIds` scoping
- **Asset Pack Marketplace** (`—`, /asset-packs) — No workspace alias or asset id for `enabledToolIds` scoping
- **Configuration Studio** (`—`, /configuration-studio) — No workspace alias or asset id for `enabledToolIds` scoping
- **Organization Dashboard** (`—`, /organization) — No workspace alias or asset id for `enabledToolIds` scoping
- **Organization Onboarding** (`—`, /onboarding) — No workspace alias or asset id for `enabledToolIds` scoping
- **Workflow Builder** (`—`, /workflows) — No workspace alias or asset id for `enabledToolIds` scoping


### Every asset can be assigned to a role (11 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Platform Analytics** (`—`, /platform-analytics) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Integration Marketplace** (`—`, /integrations-marketplace) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Product Catalog** (`—`, /products) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Command Dashboard** (`dashboard`, /dashboard) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Digital Twin** (`digital-twin`, /digital-twin) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Medical IoT Dashboard** (`medical-iot`, /medical-iot) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Laboratory Dashboard** (`laboratory`, /laboratory) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Hospital Map** (`hospital-map`, /hospital-map) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **User Welcome** (`—`, /welcome) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`
- **Workflow Builder** (`—`, /workflows) — Not in role profile `preferredAssetIds` and no explicit asset `roleProfiles`


### Every asset has governance metadata (264 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — Governance only exists on DB seed template, not on inventory record
- **Platform Analytics** (`—`, /platform-analytics) — Governance only exists on DB seed template, not on inventory record
- **Integration Marketplace** (`—`, /integrations-marketplace) — Governance only exists on DB seed template, not on inventory record
- **Product Catalog** (`—`, /products) — Governance only exists on DB seed template, not on inventory record
- **User Welcome** (`—`, /welcome) — Governance only exists on DB seed template, not on inventory record
- **Asset Pack Marketplace** (`—`, /asset-packs) — Governance only exists on DB seed template, not on inventory record
- **Configuration Studio** (`—`, /configuration-studio) — Governance only exists on DB seed template, not on inventory record
- **Organization Dashboard** (`—`, /organization) — Governance only exists on DB seed template, not on inventory record
- **Organization Onboarding** (`—`, /onboarding) — Governance only exists on DB seed template, not on inventory record
- **3D Viewer** (`medical-3d-viewer`, /3d-viewer) — Governance only exists on DB seed template, not on inventory record
- **A-a Gradient** (`aa-gradient`, /tools/calculators/aa-gradient) — Governance only exists on DB seed template, not on inventory record
- **ABCD² score** (`abcd2`, /tools/calculators/abcd2) — Governance only exists on DB seed template, not on inventory record
- **ACS Workflow Assistant** (`acs-workflow-assistant`, /tools/cardiology/acs-workflow-assistant) — Governance only exists on DB seed template, not on inventory record
- **Adjusted Body Weight** (`adjusted-body-weight`, /tools/calculators/adjusted-body-weight) — Governance only exists on DB seed template, not on inventory record
- **AI Artifacts** (`ai-artifacts`, /artifacts) — Governance only exists on DB seed template, not on inventory record
- **AI Command Center** (`ai-command-center`, /ai-command-center) — Governance only exists on DB seed template, not on inventory record
- **AI Cost Optimization** (`ai-cost-optimization`, /costs) — Governance only exists on DB seed template, not on inventory record
- **AI Evaluation** (`ai-evaluation`, /ai/evaluation) — Governance only exists on DB seed template, not on inventory record
- **AI Gateway** (`ai-gateway`, /assistant) — Governance only exists on DB seed template, not on inventory record
- **AI Governance** (`ai-governance`, /ai-governance) — Governance only exists on DB seed template, not on inventory record
- **AI Memory** (`ai-memory`, /ai-memory) — Governance only exists on DB seed template, not on inventory record
- **AI Run Audit Timeline** (`ai-run-audit-timeline`, /audit/ai) — Governance only exists on DB seed template, not on inventory record
- **AI Tool Calling** (`ai-tool-calling`, /assistant) — Governance only exists on DB seed template, not on inventory record
- **AI Training Pipeline** (`ai-training`, /training) — Governance only exists on DB seed template, not on inventory record
- **AKI Staging Assistant** (`aki-staging-assistant`, /tools/nephrology/aki-staging-assistant) — Governance only exists on DB seed template, not on inventory record
- **Ambient Clinical Scribe** (`ambient-scribe`, /tools/ambient-scribe) — Governance only exists on DB seed template, not on inventory record
- **Anion Gap** (`anion-gap`, /tools/calculators/anion-gap) — Governance only exists on DB seed template, not on inventory record
- **Antibiotic Guide** (`antibiotic-guide`, /tools/diagnosis) — Governance only exists on DB seed template, not on inventory record
- **Anticoagulation Protocol Plugin** (`plugin-anticoagulation-protocol`, /protocols) — Governance only exists on DB seed template, not on inventory record
- **Apgar score** (`apgar-score`, /tools/calculators/apgar-score) — Governance only exists on DB seed template, not on inventory record
- **APRI** (`apri`, /tools/calculators/apri) — Governance only exists on DB seed template, not on inventory record
- **Arrhythmia Risk Classifier** (`arrhythmia-risk-classifier`, /tools/cardiology/arrhythmia-risk-classifier) — Governance only exists on DB seed template, not on inventory record
- **ASCVD 10-year risk** (`ascvd-risk`, /tools/calculators/ascvd-risk) — Governance only exists on DB seed template, not on inventory record
- **Asthma Exacerbation Assistant** (`asthma-exacerbation-assistant`, /tools/pulmonology/asthma-exacerbation-assistant) — Governance only exists on DB seed template, not on inventory record
- **Asthma Severity Score** (`asthma-severity-score`, /tools/calculators/asthma-severity-score) — Governance only exists on DB seed template, not on inventory record

- … and 229 more

### Every asset has lifecycle status (10 violations)

- **3D Medical Viewer** (`—`, /3d-viewer) — No platform `lifecycle` or inventory `lifecycleState`
- **Platform Analytics** (`—`, /platform-analytics) — No platform `lifecycle` or inventory `lifecycleState`
- **Integration Marketplace** (`—`, /integrations-marketplace) — No platform `lifecycle` or inventory `lifecycleState`
- **Product Catalog** (`—`, /products) — No platform `lifecycle` or inventory `lifecycleState`
- **User Welcome** (`—`, /welcome) — No platform `lifecycle` or inventory `lifecycleState`
- **Asset Pack Marketplace** (`—`, /asset-packs) — No platform `lifecycle` or inventory `lifecycleState`
- **Configuration Studio** (`—`, /configuration-studio) — No platform `lifecycle` or inventory `lifecycleState`
- **Organization Dashboard** (`—`, /organization) — No platform `lifecycle` or inventory `lifecycleState`
- **Organization Onboarding** (`—`, /onboarding) — No platform `lifecycle` or inventory `lifecycleState`
- **Workflow Builder** (`—`, /workflows) — No platform `lifecycle` or inventory `lifecycleState`


## Critical structural violations

| ID | Severity | Description | Remediation |
|----|----------|-------------|-------------|
| STRUCT-001 | **Critical** | Dual registry: `toolInventory.js` is launch source of truth; `platform_assets` covers ~20% of user-facing tools | Backfill `SEED_PLATFORM_ASSETS` from canonical inventory or generate assets on deploy |
| STRUCT-002 | **High** | Eight AI agents seeded without `packIds` (not in any pack `assetIds`) | Add agents to `core-platform` and/or `ai-workflow-pack` `assetIds` |
| STRUCT-003 | **High** | Commercial surfaces (`/products`, `/integrations-marketplace`) use `product-catalog` entities, not `platform_assets` | Register `assetType: integration` / product wrapper assets with packs |
| STRUCT-004 | **Medium** | Inventory lifecycle (`beta`, `experimental`) ≠ platform lifecycle enum (`draft`, `active`, `deprecated`, `admin_only`) | Map inventory states into platform asset lifecycle on sync |
| STRUCT-005 | **Medium** | Seeded assets use empty `roleProfiles` / `workspaceTags` (implicit “all”) — compliant for assignment API but weak for explicit policy | Populate `roleProfiles` and `workspaceTags` per pack `targetRoles` / `defaultModules` |
| STRUCT-006 | **Low** | `assetInventory.js` projection sets `packIds: []` for all tools | Derive packIds from entitlements API or seed map |
| STRUCT-007 | **Low** | `/assistant?agent=` query not consumed in `Dashboard.jsx` | Wire agent asset id to assistant session context |

## Seeded platform assets (DB) — pack membership

Assets in `SEED_PLATFORM_ASSETS` without pack assignment:

- `agent-clinical` — clinical AI
- `agent-education` — education AI
- `agent-emergency` — emergency AI
- `agent-fleet` — fleet AI
- `agent-governance` — governance AI
- `agent-lab` — lab AI
- `agent-operations` — operations AI
- `agent-research` — research AI

## Full compliance matrix

| Feature | Route | Inventory ID | Asset ID | Pack | Platform asset? | Lifecycle | Governance | Violations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3D Medical Viewer | /3d-viewer | 3d-viewer | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |
| clinical AI | /assistant?agent=agent-clinical | agent-clinical | agent-clinical | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| education AI | /assistant?agent=agent-education | agent-education | agent-education | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| emergency AI | /assistant?agent=agent-emergency | agent-emergency | agent-emergency | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| fleet AI | /assistant?agent=agent-fleet | agent-fleet | agent-fleet | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| governance AI | /assistant?agent=agent-governance | agent-governance | agent-governance | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| lab AI | /assistant?agent=agent-lab | agent-lab | agent-lab | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| operations AI | /assistant?agent=agent-operations | agent-operations | agent-operations | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| research AI | /assistant?agent=agent-research | agent-research | agent-research | — | Yes | active | Complete (seed template) | asset-in-pack; tenant-assignable |
| Platform Analytics | /platform-analytics | platform-analytics | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |
| Integration Marketplace | /integrations-marketplace | integrations-marketplace | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |
| Product Catalog | /products | products-catalog | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |
| Command Dashboard | /dashboard | dashboard | dashboard | core-platform | Yes | active | Complete (seed template) | role-assignable |
| Digital Twin | /digital-twin | digital-twin | digital-twin | hospital-operations, digital-twin-pack | Yes | active | Complete (seed template) | role-assignable |
| Fleet Command | /fleet/command | fleet-dashboard | fleet-dashboard | hospital-operations | Yes | active | Complete (seed template) | — |
| Medical IoT Dashboard | /medical-iot | medical-iot | medical-iot | medical-iot-pack | Yes | active | Complete (seed template) | role-assignable |
| Laboratory Dashboard | /laboratory | laboratory | laboratory | laboratory-intelligence | Yes | active | Complete (seed template) | role-assignable |
| Hospital Map | /hospital-map | hospital-map | hospital-map | emergency-medicine, hospital-operations, emergency-department-pack, digital-twin-pack | Yes | active | Complete (seed template) | role-assignable |
| User Welcome | /welcome | welcome | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |
| Asset Pack Marketplace | /asset-packs | asset-packs-marketplace | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; governance-metadata; lifecycle-status |
| Configuration Studio | /configuration-studio | configuration-studio | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; governance-metadata; lifecycle-status |
| Organization Dashboard | /organization | organization-dashboard | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; governance-metadata; lifecycle-status |
| Organization Onboarding | /onboarding | onboarding-wizard | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; governance-metadata; lifecycle-status |
| Simulation Suite | /simulation | simulation-suite | simulation-suite | emergency-medicine, emergency-department-pack, simulation-training-pack | Yes | active | Complete (seed template) | — |
| 3D Viewer | /3d-viewer | medical-3d-viewer | medical-3d-viewer | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| A-a Gradient | /tools/calculators/aa-gradient | aa-gradient | aa-gradient | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ABCD² score | /tools/calculators/abcd2 | abcd2 | abcd2 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ABG Interpreter | /tools/lab-interpreter | abg-interpreter | abg-interpreter | laboratory-intelligence | Yes | experimental | Complete (seed template) | — |
| ACLS Protocol | /protocols | acls-protocol | acls-protocol | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| ACS Workflow Assistant | /tools/cardiology/acs-workflow-assistant | acs-workflow-assistant | acs-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Adjusted Body Weight | /tools/calculators/adjusted-body-weight | adjusted-body-weight | adjusted-body-weight | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Artifacts | /artifacts | ai-artifacts | ai-artifacts | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Command Center | /ai-command-center | ai-command-center | ai-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Cost Optimization | /costs | ai-cost-optimization | ai-cost-optimization | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Evaluation | /ai/evaluation | ai-evaluation | ai-evaluation | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Explainability | /tools/ai-explainability | ai-explainability | ai-explainability | governance-compliance-pack | Yes | active | Complete (seed template) | — |
| AI Gateway | /assistant | ai-gateway | ai-gateway | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Governance | /ai-governance | ai-governance | ai-governance | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Memory | /ai-memory | ai-memory | ai-memory | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Run Audit Timeline | /audit/ai | ai-run-audit-timeline | ai-run-audit-timeline | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Tool Calling | /assistant | ai-tool-calling | ai-tool-calling | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AI Training Pipeline | /training | ai-training | ai-training | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AKI Staging Assistant | /tools/nephrology/aki-staging-assistant | aki-staging-assistant | aki-staging-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| All calculators | /tools/calculators | calculators | calculators | core-platform | Yes | active | Complete (seed template) | — |
| Ambient Clinical Scribe | /tools/ambient-scribe | ambient-scribe | ambient-scribe | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Anion Gap | /tools/calculators/anion-gap | anion-gap | anion-gap | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Antibiotic Guide | /tools/diagnosis | antibiotic-guide | antibiotic-guide | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Anticoagulation Protocol Plugin | /protocols | plugin-anticoagulation-protocol | plugin-anticoagulation-protocol | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| APACHE-II | /tools/calculators/apache-ii | apache2-calculator | apache2-calculator | emergency-medicine, emergency-department-pack, icu-pack | Yes | experimental | Complete (seed template) | — |
| Apgar score | /tools/calculators/apgar-score | apgar-score | apgar-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| APRI | /tools/calculators/apri | apri | apri | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Arrhythmia Risk Classifier | /tools/cardiology/arrhythmia-risk-classifier | arrhythmia-risk-classifier | arrhythmia-risk-classifier | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ASCVD 10-year risk | /tools/calculators/ascvd-risk | ascvd-risk | ascvd-risk | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Asset Tracking Dashboard | /hospital-map | asset-tracking-dashboard | asset-tracking-dashboard | hospital-operations, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Asthma Exacerbation Assistant | /tools/pulmonology/asthma-exacerbation-assistant | asthma-exacerbation-assistant | asthma-exacerbation-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Asthma Severity Score | /tools/calculators/asthma-severity-score | asthma-severity-score | asthma-severity-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ATLS Protocol | /protocols | atls-protocol | atls-protocol | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| Atrial Fibrillation Assistant | /tools/cardiology/atrial-fibrillation-assistant | atrial-fibrillation-assistant | atrial-fibrillation-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Audit Trail AI | /tools/audit-trail-ai | audit-trail-ai | audit-trail-ai | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Audit Trail Spine | /audit | audit-trail-spine | audit-trail-spine | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| AUDIT-C | /tools/calculators/audit-c | audit-c | audit-c | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Bed Occupancy Calculator | /tools/calculators/bed-occupancy-calculator | bed-occupancy-calculator | bed-occupancy-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Behavioral Analytics Dashboard | /tools/psychiatry/behavioral-analytics-dashboard | behavioral-analytics-dashboard | behavioral-analytics-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Bias Finding Review | /governance/equity/findings | bias-finding-review | bias-finding-review | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| BISAP score | /tools/calculators/bisap-score | bisap-score | bisap-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Bishop score | /tools/calculators/bishop-score | bishop-score | bishop-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| BMI | /tools/calculators/bmi | calc-bmi | calc-bmi | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| BODE Index | /tools/calculators/bode-index | bode-index | bode-index | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Body Surface Area | /tools/calculators/bsa | bsa | bsa | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Braden scale | /tools/calculators/braden-scale | braden-scale | braden-scale | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| BUN/Creatinine Ratio | /tools/calculators/bun-creatinine-ratio | bun-creatinine-ratio | bun-creatinine-ratio | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CAGE | /tools/calculators/cage | cage | cage | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Calculator Recommendation AI | /tools/calculator-recommender | calculator-recommender-ai | calculator-recommender-ai | laboratory-intelligence | Yes | experimental | Complete (seed template) | — |
| Canadian C-Spine Rule | /tools/calculators | canadian-c-spine | canadian-c-spine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Capacity Command Dashboard Plugin | /operations-center | plugin-capacity-command-dashboard | plugin-capacity-command-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Capacity Prediction Engine | /hospital-map | capacity-prediction-engine | capacity-prediction-engine | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Cardiac Telemetry Analyzer | /tools/cardiology/cardiac-telemetry-analyzer | cardiac-telemetry-analyzer | cardiac-telemetry-analyzer | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Cardiology Command Center | /tools/cardiology/cardiology-command-center | cardiology-command-center | cardiology-command-center | cardiology-pack | Yes | experimental | Complete (seed template) | — |
| Care Plan View | /patients/:patientId/care-plan | care-plan-view | care-plan-view | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Centor / McIsaac | /tools/calculators/centor-mcisaac | centor-mcisaac | centor-mcisaac | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CHA₂DS₂-VASc | /tools/calculators/chads2vasc | calc-chads2vasc | calc-chads2vasc | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CHADS2 | /tools/calculators/chads2 | chads2 | chads2 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Child-Pugh | /tools/calculators/child-pugh | child-pugh | child-pugh | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Cirrhosis Monitoring Engine | /tools/gastroenterology/cirrhosis-monitoring-engine | cirrhosis-monitoring-engine | cirrhosis-monitoring-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CKD Progression Predictor | /tools/nephrology/ckd-progression-predictor | ckd-progression-predictor | ckd-progression-predictor | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CKD staging (KDIGO) | /tools/calculators/ckd-staging | ckd-staging | ckd-staging | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Audit | /tools/clinical-audit | clinical-audit | clinical-audit | laboratory-intelligence, governance-compliance-pack | Yes | admin-only | Complete (seed template) | — |
| Clinical Decision Support Engine | /clinical-decision-support | clinical-decision-support | clinical-decision-support | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Dictation | /tools/clinical-dictation | clinical-dictation | clinical-dictation | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Documentation Assistant | /documentation | clinical-documentation-assistant | clinical-documentation-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Event AI | /patients/:patientId/events | clinical-event-ai | clinical-event-ai | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Governance | /governance/clinical | clinical-governance | clinical-governance | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Knowledge Graph | /knowledge-graph | clinical-knowledge-graph | clinical-knowledge-graph | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Reasoning Engine | /tools/clinical-reasoning-engine | clinical-reasoning-engine | clinical-reasoning-engine | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Release Gates | /governance/clinical/release-gates | clinical-release-gates | clinical-release-gates | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Safety Audit | /governance/clinical-safety | clinical-safety-audit | clinical-safety-audit | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Clinical Safety Findings | /governance/clinical/safety-findings | clinical-safety-findings | clinical-safety-findings | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Cognitive Screening Assistant | /tools/psychiatry/cognitive-screening-assistant | cognitive-screening-assistant | cognitive-screening-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Columbia Suicide Severity Workflow | /tools/calculators/columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Competency Platform | /competencies | competency-platform | competency-platform | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Consent Center | /patients/:patientId/consent | consent-center | consent-center | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Consent Manager | /governance/consent | consent-manager | consent-manager | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Continuous Glucose Command Center | /tools/endocrine/continuous-glucose-command-center | continuous-glucose-command-center | continuous-glucose-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| COPD GOLD | /tools/calculators | copd-gold | copd-gold | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| COPD GOLD Assessment | /tools/calculators/copd-gold-assessment | copd-gold-assessment | copd-gold-assessment | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| COPD Workflow Assistant | /tools/pulmonology/copd-workflow-assistant | copd-workflow-assistant | copd-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Corrected Calcium | /tools/calculators/corrected-calcium | corrected-calcium | corrected-calcium | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Corrected Sodium | /tools/calculators/corrected-sodium | corrected-sodium | corrected-sodium | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Cost Optimization Control Plane | /governance/costs | cost-optimization-control-plane | cost-optimization-control-plane | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Creatinine Clearance (Cockcroft-Gault) | /tools/calculators/creatinine-clearance-cg | creatinine-clearance-cg | creatinine-clearance-cg | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Credentialing Platform | /credentials | credentialing-platform | credentialing-platform | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Crisis Escalation Audit Log | /tools/psychiatry/crisis-escalation-audit-log | crisis-escalation-audit-log | crisis-escalation-audit-log | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| CURB-65 | /tools/calculators/curb-65 | curb65-calculator | curb65-calculator | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| Deployment Observability | /operations/observability | deployment-observability | deployment-observability | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Device Battery Intelligence | /medical-iot | device-battery-intelligence | device-battery-intelligence | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Device Fleet Management | /devices | device-fleet-management | device-fleet-management | hospital-operations, medical-iot-pack | Yes | beta | Complete (seed template) | — |
| Device Maintenance | /devices | device-maintenance | device-maintenance | hospital-operations, medical-iot-pack | Yes | beta | Complete (seed template) | — |
| Device Recommendation Assistant | /tools/calculators | device-recommendation-assistant | device-recommendation-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Diabetes Care Assistant | /tools/endocrine/diabetes-care-assistant | diabetes-care-assistant | diabetes-care-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Diagnosis Assistant | /tools/diagnosis | diagnosis | diagnosis | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Dialysis Readiness Helper | /tools/nephrology/dialysis-readiness-helper | dialysis-readiness-helper | dialysis-readiness-helper | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Dialysis Utilization Tracker | /tools/nephrology/dialysis-utilization-tracker | dialysis-utilization-tracker | dialysis-utilization-tracker | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Differential Diagnosis Assistant | /tools/differential-ai | differential-ai | differential-ai | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Digital Operations Center | /operations-center | digital-operations-center | digital-operations-center | hospital-operations, digital-twin-pack | Yes | experimental | Complete (seed template) | — |
| Discharge Summary AI | /tools/discharge-summary-ai | discharge-summary-ai | discharge-summary-ai | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Discharge Workflow Plugin | /assistant | plugin-discharge-workflow | plugin-discharge-workflow | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Dispatch Intelligence | /tools/calculators | dispatch-ai | dispatch-ai | — | No | deprecated | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| DKA Pathway Assistant | /tools/endocrine/dka-pathway-assistant | dka-pathway-assistant | dka-pathway-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Drug Checker | /tools/drug-checker | drug-check | drug-check | core-platform | Yes | active | Complete (seed template) | — |
| Duke Treadmill Score | /tools/calculators/duke-treadmill-score | duke-treadmill-score | duke-treadmill-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ECG Interpretation Assistant | /tools/cardiology/ecg-interpretation-assistant | ecg-interpretation-assistant | ecg-interpretation-assistant | cardiology-pack | Yes | experimental | Complete (seed template) | — |
| ECG Trend Engine | /tools/cardiology/ecg-trend-engine | ecg-trend-engine | ecg-trend-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| EEG Trend Dashboard | /tools/neurology/eeg-trend-dashboard | eeg-trend-dashboard | eeg-trend-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| eGFR (CKD-EPI) | /tools/calculators/gfr | calc-gfr | calc-gfr | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| eGFR CKD-EPI 2021 | /tools/calculators/egfr-ckd-epi | egfr-ckd-epi | egfr-ckd-epi | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| EHR Patient Import | /patients/import | ehr-patient-import | ehr-patient-import | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Electrolyte Disorder Assistant | /tools/nephrology/electrolyte-disorder-assistant | electrolyte-disorder-assistant | electrolyte-disorder-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Electrolyte Trend Engine | /tools/nephrology/electrolyte-trend-engine | electrolyte-trend-engine | electrolyte-trend-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Endocrine Monitoring System | /tools/endocrine/endocrine-monitoring-system | endocrine-monitoring-system | endocrine-monitoring-system | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Endoscopy Workflow Assistant | /tools/gastroenterology/endoscopy-workflow-assistant | endoscopy-workflow-assistant | endoscopy-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Epworth Sleepiness Scale | /tools/calculators/epworth-sleepiness-scale | epworth-sleepiness-scale | epworth-sleepiness-scale | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Equity Monitoring | /governance/equity | equity-monitoring | equity-monitoring | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| FeNa | /tools/calculators/fena | fena | fena | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Fenton Growth Chart Helper | /tools/calculators/fenton-growth-chart-helper | fenton-growth-chart-helper | fenton-growth-chart-helper | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| FeUrea | /tools/calculators/feurea | feurea | feurea | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| FHIR Connector | /integrations/fhir | fhir-connector | fhir-connector | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| FIB-4 | /tools/calculators/fib4 | fib4 | fib4 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Fleet Command | /fleet/command | fleet-command | fleet-command | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Fleet Live Map | /fleet/map | fleet-live-map | fleet-live-map | hospital-operations | Yes | active | Complete (seed template) | — |
| Fluid Balance Monitor | /tools/nephrology/fluid-balance-monitor | fluid-balance-monitor | fluid-balance-monitor | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Fluid Resuscitation Calculator Plugin | /tools/catalog | plugin-fluid-resuscitation-calculator | plugin-fluid-resuscitation-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| FOUR Score | /tools/calculators/four-score | four-score | four-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Framingham CHD risk | /tools/calculators/framingham-risk | framingham-risk | framingham-risk | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Free Water Deficit | /tools/calculators/free-water-deficit | free-water-deficit | free-water-deficit | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| GAD-7 | /tools/calculators/gad7 | gad7 | gad7 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Gestational Age Calculator | /tools/calculators/gestational-age-calculator | gestational-age-calculator | gestational-age-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| GI Bleed Workflow Assistant | /tools/gastroenterology/gi-bleed-workflow-assistant | gi-bleed-workflow-assistant | gi-bleed-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| GI Command Center | /tools/gastroenterology/gi-command-center | gi-command-center | gi-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| GI Surveillance Dashboard | /tools/gastroenterology/gi-surveillance-dashboard | gi-surveillance-dashboard | gi-surveillance-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Glasgow Coma Scale (GCS) | /tools/calculators/gcs | gcs-calculator | gcs-calculator | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| Glasgow-Blatchford Score | /tools/calculators/glasgow-blatchford-score | glasgow-blatchford-score | glasgow-blatchford-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Glucose Telemetry Dashboard | /tools/endocrine/glucose-telemetry-dashboard | glucose-telemetry-dashboard | glucose-telemetry-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| GRACE ACS Risk | /tools/calculators | grace-acs | grace-acs | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Growth Trend Analytics | /tools/pediatrics-obgyn/growth-trend-analytics | growth-trend-analytics | growth-trend-analytics | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Guideline Copilot AI Extension | /assistant | plugin-guideline-copilot-extension | plugin-guideline-copilot-extension | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Guideline Retrieval + Evidence Engine | /tools/guideline-rag | guideline-rag | guideline-rag | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| HAS-BLED | /tools/calculators/has-bled | has-bled | has-bled | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| HCM Sudden Death Risk | /tools/calculators/hcm-sudden-death-risk | hcm-sudden-death-risk | hcm-sudden-death-risk | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Headache Red Flag Assistant | /tools/neurology/headache-red-flag-assistant | headache-red-flag-assistant | headache-red-flag-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Heart Failure Assistant | /tools/cardiology/heart-failure-assistant | heart-failure-assistant | heart-failure-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Heart Failure Staging Helper | /tools/calculators/heart-failure-staging | heart-failure-staging | heart-failure-staging | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| HEART score | /tools/calculators/heart-score | heart-score | heart-score | emergency-medicine, emergency-department-pack, cardiology-pack | Yes | experimental | Complete (seed template) | — |
| Hepatic Trend Analytics | /tools/gastroenterology/hepatic-trend-analytics | hepatic-trend-analytics | hepatic-trend-analytics | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| HL7 Bridge | /integrations/hl7 | hl7-bridge | hl7-bridge | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| HOMA-IR | /tools/calculators/homa-ir | homa-ir | homa-ir | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Hospital Command Assistant | /tools/calculators | hospital-command-assistant | hospital-command-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Hospital Map | /hospital-map | hospital-map | hospital-map | emergency-medicine, hospital-operations, emergency-department-pack, digital-twin-pack | Yes | beta | Complete (seed template) | — |
| Hospital Operations Cockpit | /hospital-map | hospital-operations-cockpit | hospital-operations-cockpit | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Hospital Operations Command | /hospital-map | hospital-operations-command | hospital-operations-command | hospital-operations | Yes | beta | Complete (seed template) | — |
| Human Review Queue | /review | human-review-queue | human-review-queue | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Hunt-Hess Scale | /tools/calculators/hunt-hess-scale | hunt-hess-scale | hunt-hess-scale | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| ICH Score | /tools/calculators/ich-score | ich-score | ich-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Ideal Body Weight | /tools/calculators/ideal-body-weight | ideal-body-weight | ideal-body-weight | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Incident Command Center | /hospital-map | incident-command-center | incident-command-center | hospital-operations | Yes | beta | Complete (seed template) | — |
| Insulin Trend Engine | /tools/endocrine/insulin-trend-engine | insulin-trend-engine | insulin-trend-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Intelligent Order Set Assistant | /tools/order-set-ai | order-set-ai | order-set-ai | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Intended Use Registry | /governance/regulatory/intended-use | intended-use-registry | intended-use-registry | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Kidney Failure Risk Equation | /tools/calculators/kfre | kfre | kfre | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Lab Interpreter | /tools/lab-interpreter | lab-interp | lab-interp | core-platform, laboratory-intelligence, icu-pack | Yes | active | Complete (seed template) | — |
| Lab Result Import | /patients/:patientId/labs/import | lab-result-import | lab-result-import | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Laboratory Dashboard | /laboratory | laboratory-dashboard | laboratory-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Live Tracking Map | /live-map | live-tracking-map | live-tracking-map | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Liver Disease Assistant | /tools/gastroenterology/liver-disease-assistant | liver-disease-assistant | liver-disease-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| LLM Security | /security | ai-security | ai-security | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Maddrey Discriminant Function | /tools/calculators/maddrey-discriminant-function | maddrey-discriminant-function | maddrey-discriminant-function | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Maternal Monitoring Dashboard | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | maternal-monitoring-dashboard | maternal-monitoring-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MDQ | /tools/calculators/mdq | mdq | mdq | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Medical IoT Dashboard | /medical-iot | medical-iot-dashboard | medical-iot-dashboard | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Medical Simulation Suite | /simulation | simulation-suite | simulation-suite | emergency-medicine, emergency-department-pack, simulation-training-pack | Yes | experimental | Complete (seed template) | — |
| Medication Dose Calculator | /tools/calculators | dose-calculator | dose-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Medication List Import | /patients/:patientId/medications/import | medication-list-import | medication-list-import | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MELD | /tools/calculators/meld | meld | meld | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MELD-Na | /tools/calculators/meld-na | meld-na | meld-na | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Mental Health Screening Assistant | /tools/psychiatry/mental-health-screening-assistant | mental-health-screening-assistant | mental-health-screening-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Metabolic Analytics | /tools/endocrine/metabolic-analytics | metabolic-analytics | metabolic-analytics | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Metabolic Syndrome Assistant | /tools/endocrine/metabolic-syndrome-assistant | metabolic-syndrome-assistant | metabolic-syndrome-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MEWS | /tools/calculators/mews | mews | mews | emergency-medicine, emergency-department-pack, icu-pack | Yes | experimental | Complete (seed template) | — |
| MMSE | /tools/calculators/mmse | mmse | mmse | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MoCA Placeholder Workflow | /tools/calculators/moca-placeholder-workflow | moca-placeholder-workflow | moca-placeholder-workflow | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Model Access Policy | /governance/ai-security/model-access | model-access-policy | model-access-policy | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Model Usage Dashboard | /governance/model-usage | model-usage-dashboard | model-usage-dashboard | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Modified Rankin Scale | /tools/calculators/modified-rankin-scale | modified-rankin-scale | modified-rankin-scale | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| MoE Router | /assistant | moe-router | moe-router | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Morse Fall Scale | /tools/calculators/morse-fall-scale | morse-fall-scale | morse-fall-scale | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neonatal Assessment Assistant | /tools/pediatrics-obgyn/neonatal-assessment-assistant | neonatal-assessment-assistant | neonatal-assessment-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neonatal Bilirubin Risk Helper | /tools/calculators/neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neonatal Dashboard | /tools/pediatrics-obgyn/neonatal-dashboard | neonatal-dashboard | neonatal-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neuro Exam Assistant | /tools/neurology/neuro-exam-assistant | neuro-exam-assistant | neuro-exam-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neuro Monitoring Engine | /tools/neurology/neuro-monitoring-engine | neuro-monitoring-engine | neuro-monitoring-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neuro Telemetry Dashboard | /tools/neurology/neuro-telemetry-dashboard | neuro-telemetry-dashboard | neuro-telemetry-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Neurology Timeline AI | /tools/neurology/neurology-timeline-ai | neurology-timeline-ai | neurology-timeline-ai | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| NEWS2 | /tools/calculators/news2 | news2 | news2 | emergency-medicine, emergency-department-pack, icu-pack | Yes | experimental | Complete (seed template) | — |
| NEXUS C-Spine Rule | /tools/calculators | nexus-cspine | nexus-cspine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| NIH Stroke Scale (NIHSS) | /tools/calculators | nihss | nihss | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| NIHSS Summary View | /tools/calculators/nihss-summary-view | nihss-summary-view | nihss-summary-view | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| OB Triage Assistant | /tools/pediatrics-obgyn/ob-triage-assistant | ob-triage-assistant | ob-triage-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Observation And Vitals Import | /patients/:patientId/observations/import | observation-vitals-import | observation-vitals-import | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Operations Incident Center | /operations/incidents | operations-incident-center | operations-incident-center | — | No | admin-only | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Osmolal Gap | /tools/calculators/osmolal-gap | osmolal-gap | osmolal-gap | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Ottawa Ankle Rule | /tools/calculators | ottawa-ankle | ottawa-ankle | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Oxygen Escalation Helper | /tools/pulmonology/oxygen-escalation-helper | oxygen-escalation-helper | oxygen-escalation-helper | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pancreatitis Workflow Assistant | /tools/gastroenterology/pancreatitis-workflow-assistant | pancreatitis-workflow-assistant | pancreatitis-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| PaO2/FiO2 Ratio | /tools/calculators/pao2-fio2-ratio | pao2-fio2-ratio | pao2-fio2-ratio | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Patient Summary AI | /tools/patient-summary-ai | patient-summary-ai | patient-summary-ai | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Patient Timeline AI | /tools/timeline-ai | timeline-ai | timeline-ai | — | No | active | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Patient Workspace | /patients/:patientId/workspace | patient-workspace | patient-workspace | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| PCL-5 | /tools/calculators/pcl5 | pcl5 | pcl5 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| PECARN Head Injury Rule | /tools/calculators | pecarn-head | pecarn-head | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric BP Percentile | /tools/calculators/pediatric-bp-percentile | pediatric-bp-percentile | pediatric-bp-percentile | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric Code Simulation Plugin | /simulation | plugin-pediatric-code-simulation | plugin-pediatric-code-simulation | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric Command Center | /tools/pediatrics-obgyn/pediatric-command-center | pediatric-command-center | pediatric-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric Dose Safety Checker | /tools/calculators/pediatric-dose-safety-checker | pediatric-dose-safety-checker | pediatric-dose-safety-checker | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric GCS | /tools/calculators/pediatric-gcs | pediatric-gcs | pediatric-gcs | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pediatric Sepsis Assistant | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | pediatric-sepsis-assistant | pediatric-sepsis-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| PERC | /tools/calculators | perc | perc | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Perinatal Risk Dashboard | /tools/pediatrics-obgyn/perinatal-risk-dashboard | perinatal-risk-dashboard | perinatal-risk-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| PEWS | /tools/calculators/pews | pews | pews | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| PHQ-9 | /tools/calculators/phq9 | phq9 | phq9 | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pneumonia Severity Index | /tools/calculators/pneumonia-severity-index | pneumonia-severity-index | pneumonia-severity-index | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Population Screening Dashboard | /tools/psychiatry/population-screening-dashboard | population-screening-dashboard | population-screening-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Predictive Analytics Dashboard | /predictive-analytics | predictive-analytics-dashboard | predictive-analytics-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Predictive Maintenance Engine | /fleet/predictive-maintenance | predictive-maintenance | predictive-maintenance | hospital-operations | Yes | experimental | Complete (seed template) | — |
| Pregnancy Due Date Calculator | /tools/calculators/pregnancy-due-date-calculator | pregnancy-due-date-calculator | pregnancy-due-date-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pregnancy Workflow Assistant | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | pregnancy-workflow-assistant | pregnancy-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Prior Authorization AI | /tools/prior-auth-ai | prior-auth-ai | prior-auth-ai | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Privacy Center | /governance/privacy | privacy-center | privacy-center | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Procedure Guide | /tools/procedures | procedures | procedures | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Prompt Firewall | /governance/ai-security/prompt-firewall | prompt-firewall | prompt-firewall | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Protocol and Clinical Pathway Library | /protocols | protocols | protocols | core-platform, emergency-medicine, emergency-department-pack, icu-pack | Yes | experimental | Complete (seed template) | — |
| Psychiatry Monitoring Dashboard | /tools/psychiatry/psychiatry-monitoring-dashboard | psychiatry-monitoring-dashboard | psychiatry-monitoring-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Pulmonary Trend Engine | /tools/pulmonology/pulmonary-trend-engine | pulmonary-trend-engine | pulmonary-trend-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| qSOFA (quick SOFA) | /tools/calculators/qsofa | qsofa | qsofa | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| RAG Evidence Engine | /tools/guideline-rag | ai-rag | ai-rag | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Ranson criteria | /tools/calculators/ranson-criteria | ranson-criteria | ranson-criteria | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| RASS | /tools/calculators/rass | rass | rass | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Referral AI | /tools/referral-ai | referral-ai | referral-ai | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Regulatory Classification | /governance/regulatory | regulatory-classification | regulatory-classification | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Remote Cardiology Monitoring Dashboard | /tools/cardiology/remote-cardiology-monitoring-dashboard | remote-cardiology-monitoring-dashboard | remote-cardiology-monitoring-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Renal Monitoring Dashboard | /tools/nephrology/renal-monitoring-dashboard | renal-monitoring-dashboard | renal-monitoring-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Research and Evidence Hub | /research | research-evidence-hub | research-evidence-hub | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Resource Allocation Assistant | /tools/calculators | resource-allocation-assistant | resource-allocation-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Resource Utilization Index | /tools/calculators/resource-utilization-index | resource-utilization-index | resource-utilization-index | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Respiratory Command Center | /tools/pulmonology/respiratory-command-center | respiratory-command-center | respiratory-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Respiratory Telemetry Dashboard | /tools/pulmonology/respiratory-telemetry-dashboard | respiratory-telemetry-dashboard | respiratory-telemetry-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Revised Trauma Score | /tools/calculators/revised-trauma-score | revised-trauma-score | revised-trauma-score | emergency-medicine, emergency-department-pack | Yes | experimental | Complete (seed template) | — |
| Reynolds Risk Score Helper | /tools/calculators/reynolds-risk-score | reynolds-risk-score | reynolds-risk-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Risk Score History | /patients/:patientId/risk-history | risk-score-history | risk-score-history | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Rockall Score | /tools/calculators/rockall-score | rockall-score | rockall-score | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Rome IV IBS | /tools/calculators | rome-iv-ibs | rome-iv-ibs | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Route Optimization Engine | /fleet/route-optimizer | route-optimizer | route-optimizer | hospital-operations | Yes | experimental | Complete (seed template) | — |
| ROX Index | /tools/calculators/rox-index | rox-index | rox-index | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Screening Trend Engine | /tools/psychiatry/screening-trend-engine | screening-trend-engine | screening-trend-engine | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Seizure Assistant | /tools/neurology/seizure-assistant | seizure-assistant | seizure-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Serum Osmolality | /tools/calculators/serum-osmolality | serum-osmolality | serum-osmolality | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Shock Index | /tools/calculators/shock-index | shock-index | shock-index | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Simulation Competency Dashboard | /simulation/outcomes | competency-dashboard | competency-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Simulation Debrief Dashboard | /simulation/sepsis-deterioration | debrief-dashboard | debrief-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Simulation Outcomes | /simulation/outcomes | simulation-outcomes | simulation-outcomes | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Simulation Scenario Player | /simulation/sepsis-deterioration | scenario-player | scenario-player | emergency-medicine, emergency-department-pack, simulation-training-pack | Yes | experimental | Complete (seed template) | — |
| Sleep Apnea Analytics | /tools/pulmonology/sleep-apnea-analytics | sleep-apnea-analytics | sleep-apnea-analytics | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| SOAP Builder | /tools/soap-builder | soap-builder | soap-builder | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| SOFA Score | /tools/calculators/sofa | sofa-score | sofa-score | emergency-medicine, emergency-department-pack, icu-pack | Yes | active | Complete (seed template) | — |
| Source Provenance | /integrations/source-provenance | source-provenance | source-provenance | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Staffing Ratio Calculator | /tools/calculators/staffing-ratio-calculator | staffing-ratio-calculator | staffing-ratio-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| STEMI Pathway Assistant | /tools/cardiology/stemi-pathway-assistant | stemi-pathway-assistant | stemi-pathway-assistant | cardiology-pack | Yes | experimental | Complete (seed template) | — |
| STOP-Bang | /tools/calculators/stop-bang | stop-bang | stop-bang | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Stroke Command Center | /tools/neurology/stroke-command-center | stroke-command-center | stroke-command-center | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Stroke Workflow Assistant | /tools/neurology/stroke-workflow-assistant | stroke-workflow-assistant | stroke-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Substance Use Screening Assistant | /tools/psychiatry/substance-use-screening-assistant | substance-use-screening-assistant | substance-use-screening-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Suicide Risk Workflow Assistant | /tools/psychiatry/suicide-risk-workflow-assistant | suicide-risk-workflow-assistant | suicide-risk-workflow-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Synthetic Patient Lab | /governance/validation/synthetic-patients | synthetic-patient-lab | synthetic-patient-lab | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Telemetry Monitoring Center | /hospital-map | telemetry-monitoring | telemetry-monitoring | hospital-operations, medical-iot-pack | Yes | beta | Complete (seed template) | — |
| Thyroid Disorder Assistant | /tools/endocrine/thyroid-disorder-assistant | thyroid-disorder-assistant | thyroid-disorder-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Timeline Live | /patients/:patientId/timeline | timeline-live | timeline-live | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| TIMI (UA/NSTEMI) | /tools/calculators/timi-ua-nstemi | timi-ua-nstemi | timi-ua-nstemi | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Turnaround Time Calculator | /tools/calculators/turnaround-time-calculator | turnaround-time-calculator | turnaround-time-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Validation Sandbox | /governance/validation | validation-sandbox | validation-sandbox | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Ventilator Monitoring Dashboard | /tools/pulmonology/ventilator-monitoring-dashboard | ventilator-monitoring-dashboard | ventilator-monitoring-dashboard | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Ventilator Support Assistant | /tools/pulmonology/ventilator-support-assistant | ventilator-support-assistant | ventilator-support-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Vertigo HINTS Assistant | /tools/neurology/vertigo-hints-assistant | vertigo-hints-assistant | vertigo-hints-assistant | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Waist-to-Hip Ratio | /tools/calculators/waist-hip-ratio | waist-hip-ratio | waist-hip-ratio | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Wells DVT | /tools/calculators | wells-dvt-calculator | wells-dvt-calculator | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Wells PE | /tools/calculators | wells-pe | wells-pe | — | No | experimental | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Why Engine | /tools/why-engine | why-engine | why-engine | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Workflow Builder AI | /tools/workflow-builder-ai | workflow-builder-ai | workflow-builder-ai | — | No | beta | Missing / partial | everything-is-asset; tenant-assignable; governance-metadata |
| Workflow Builder | /workflows | workflows | — | — | No | — | Missing / partial | everything-is-asset; tenant-assignable; workspace-assignable; role-assignable; governance-metadata; lifecycle-status |

## Appendix: Evidence sources

| Source | Role in audit |
|--------|----------------|
| `backend/src/modules/platform-assets/data/platform-asset-seed.data.ts` | Pack membership, role profiles, legacy workspace aliases |
| `backend/src/modules/platform-assets/entities/platform-asset.entity.ts` | Asset schema (governance, lifecycle, packIds) |
| `backend/src/modules/platform-assets/platform-assets.seed.service.ts` | Governance template applied on seed |
| `src/data/toolInventory.js` | Canonical tool registry and lifecycleState |
| `src/data/profileToolSegmentation.js` | Role visibility heuristics |
| `src/data/assetInventory.js` | Frontend projection (packIds often empty) |
| `docs/feature-coverage-matrix.md` | Related coverage audit |

