# UX Normalization + Backend Wiring Audit

## 1) Executive Summary
CareDroid Clinical AI already contains a mostly-flat canonical route topology with explicit legacy redirects and route inventory hardening. This pass focuses on: (a) enforcing inventory synchronization across frontend catalogs and backend intent patterns, (b) validating canonical launch paths for all clinical intent tools, and (c) documenting compact UX expectations and responsive constraints without removing any shipped feature.

## 2) UX Simplification Changes
- Kept canonical launch behavior centered on `/dashboard`, `/assistant`, `/tools`, `/tools/calculators`, and fleet/map/IoT routes.
- Preserved legacy redirects for historical paths while routing users to canonical destinations.
- Confirmed chat-assisted tool launch behavior remains intact for hub-only or fallback tools.

## 3) Flattened Layout Overview
- Primary shells:
  - Public shell for onboarding/legal/auth entry.
  - Auth shell for auth callback/sign-in flows.
  - App shell for all authenticated work areas.
- Canonical surfaces:
  - Dashboard + Assistant + Tools + Fleet + Maps + Medical IoT.
- Route flattening strategy:
  - Dedicated calculator routes remain under `/tools/calculators/:slug`.
  - Legacy calculator routes are redirected to canonical calculator slugs.

## 4) Backend-Frontend Wiring Audit
Validated synchronization between:
- Frontend clinical intent catalog (`clinicalIntentToolCatalog.js`)
- Frontend tool catalog index (`medicalToolsCatalogIndex.js`)
- Frontend source-discovery inventory (`sourceCodeToolDiscovery.js`)
- Catalog launch resolver (`clinicalCatalogWiring.js`)
- Backend intent patterns (`backend ... /tool.patterns.ts`)

## 5) Route Consolidation
- Canonical paths are retained and treated as source-of-truth.
- Legacy aliases continue to redirect and are not treated as independent product surfaces.
- Calculator routing is canonicalized around one slug route family (`/tools/calculators/:slug`).

## 6) Inventory Synchronization
Added `src/data/inventorySynchronization.audit.test.js` to enforce:
- Every clinical intent tool id resolves to a launch plan.
- Every clinical intent tool id is present in catalog + source-discovery + backend patterns.
- Every sidebar tool id is represented by catalog/discovery surfaces.

## 7) AI Assistant Integration
- Chat-seeded launches remain preserved through catalog launch resolution.
- Hub and chat-assisted tools continue to open in Assistant where appropriate.

## 8) Responsive Layout Validation
Project already includes responsive route and layout tests spanning compact/mobile/tablet/desktop classes. Existing suites continue to validate route render stability, sidebar responsiveness, and compact UX expectations.

## 9) Tests Added
- `src/data/inventorySynchronization.audit.test.js`

## 10) Remaining Risks
- Some source-discovery aliases/phantom references are intentionally retained for audit visibility and compatibility.
- Full pixel-level visual normalization across every route still depends on continued Playwright responsive QA in CI and human UX review cycles.
