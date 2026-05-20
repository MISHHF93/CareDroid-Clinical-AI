# PR: Mobile-first Android hardening and backend/frontend rendering recovery

**Branch:** _(your branch)_ · **Target:** `main` · **Type:** Production hardening (responsive UI, exposure audit, mobile performance, Android QA)

---

## 1. Summary

This PR restores reliable **mobile-first rendering** on phones and tablets (including **Pixel 7** at 412×915), fixes **navigation and catalog visibility** so clinical tools are discoverable and launchable, and adds a **production-grade backend ↔ frontend exposure layer** so no API call is orphaned and no backend route is undocumented.

**Outcomes:**

- Clinical tools render without horizontal clipping; launch buttons stay on-screen at 320–412px.
- Android-style **drawer navigation** does not block content when closed; route changes close the drawer.
- **Calculator hub and Tier A routes** stack forms, show reset/disclaimers, and pass smoke tests at 320px.
- **Catalog** shows medical tools, platform APIs, search/category filters, and wrapped descriptions.
- **Backend exposure** is inventoried, gated, and test-enforced (`0` unguarded phantom API calls).
- **Contract matrix** documents every tool’s route, NLU, executor, endpoint, and status.
- **Performance:** smaller initial JS bundle, deferred startup, lazy dashboard shell.
- **Android device QA** matrix for Pixel 7, Galaxy S/A, OnePlus, Motorola, and tablet (portrait + landscape).

---

## 2. Root cause

Several independent issues compounded into “broken on mobile” and “hidden backend” reports:

| Layer | Root cause |
|-------|------------|
| **Layout** | Desktop-first CSS (multi-column forms, sticky catalog action columns, wide tables) caused **horizontal overflow** and **clipped launch buttons** on viewports ≤900px. |
| **Navigation** | Compact drawer used transforms without **`pointer-events: none`** when closed; main column could retain inset; **500ms artificial auth splash** delayed first paint. |
| **Catalog** | Medical table used wide desktop layout; search/category chips did not wrap; platform API sections were easy to miss without expanded filters. |
| **Calculators** | Split grids and side-by-side labels at 320px pushed **reset** and disclaimers below the fold. |
| **Backend exposure** | Frontend called routes with **no Nest handler** (team, sync, share-results) without capability gates; **92 backend routes** had no single inventory; executor IDs could drift from registry. |
| **Performance** | `main.jsx` synchronously initialized Dexie, Firebase, analytics, and offline before paint; **Dashboard** was in the main chunk. |
| **Touch / a11y** | Menu (40px) and category chips (36px min-height) below **44px** Android guidance. |

---

## 3. Responsive fixes

- **`src/styles/mobile-first-layout.css`** — default single-column tool forms; two columns only from 1024px.
- **`src/styles/calculators-mobile-pr.css`** — stacked calculator layout ≤767px, 320px compaction (imported from `Calculators.jsx`).
- **`src/styles/catalog-mobile.css`** — stacked catalog card rows ≤900px; chip wrap; full-width actions at 320px.
- **Flipped desktop-first rules** in `Calculators.css`, `LabInterpreter.css`, `ToolPageLayout.css`, `DrugChecker.css` to mobile-first breakpoints.
- **`src/layout/breakpoints.js`** + **`src/styles/layout-breakpoints.css`** — shared phone/tablet widths (320–430, 768, 1024).
- **`src/styles/design-tokens.css`** — semantic spacing, typography, `--touch-target-min` (44px).
- **Catalog / tool pages:** `min-width: 0`, `overflow-wrap`, `content-visibility` on long scroll regions.

**Docs:** [docs/mobile-first-responsive-audit.md](../mobile-first-responsive-audit.md), [docs/design-tokens-audit.md](../design-tokens-audit.md)

---

## 4. Navigation fixes

- **`Sidebar.css` / `AppShell.css`:** Drawer `translate3d(-100%)` when closed; **`pointer-events: none`** until `.sidebar--open`; main `margin-left: 0` ≤900px.
- **`AppShell.jsx`:** Backdrop click, Escape, **route-change closes drawer**, focus trap via `useDrawerFocus.js`.
- **`inert` + `aria-hidden`** on closed compact drawer; mobile close control with `data-drawer-initial-focus`.
- **Menu button** sized to **44×44px** (`--touch-target-min`).

**Docs:** [docs/mobile-nav-audit.md](../mobile-nav-audit.md)

---

## 5. Calculator fixes

- **PR1–PR5 mobile CSS** — labels and controls stack; reset buttons remain visible at 320px.
- **PR8 batch calculators** (HEART, Centor, Bishop, Apgar, Braden, Morse Fall, Ranson, BISAP, FIB-4, Framingham) — client-side Tier A, wired in registry, routes, hub manifest, NLU patterns.
- **Responsive tests:** `Calculators.responsive.test.js`, `Calculators.formSmoke.test.jsx`, `pr1Pr5CalculatorMobile.test.js`.
- **Routes:** `CALCULATOR_ROUTE_DEFS` + legacy `/tools/calculator/*` aliases preserved.

---

## 6. Catalog fixes

- **`ClinicalToolCatalog.jsx`:** Expanded category quick filters (interpreter, reference, AI, data, **All APIs**); platform vs legacy section visibility; tool descriptions in medical rows; `hideEmpty` only on category empty (not failed search).
- **`catalogSearch.js`:** Broader `launchable` detection (`pagePath`, `chatOnRequest`); category filters for interpreter/protocol/reference/apis.
- **`catalog-mobile.css` + `ClinicalToolCatalog.css`:** Sticky actions only ≥901px; chip **min-width/min-height 44px**.
- **Tests:** `ClinicalToolCatalog.launchButtons.test.jsx`, `clinicalToolCatalog.mobile.test.js`, responsive contracts.

---

## 7. Backend exposure fixes

| Artifact | Purpose |
|----------|---------|
| `src/data/backendHttpRouteInventory.js` | 92 Nest routes |
| `src/data/frontendApiCallsInventory.js` | 53 frontend calls with capability keys |
| `src/config/backendApiCapabilities.js` | Gates phantom routes (`toolsShareResults`, `teamManagement`, etc.) |
| `src/data/backendFrontendExposure.js` | Scan: wired / gated-stub / unguarded |
| `src/data/backendRouteExposurePolicy.js` | Every backend-only route has exposure strategy |
| `src/data/backendOrphanAudit.js` | Controller scan ↔ inventory parity |
| `backendControllerRouteScan.js` | Parses `*.controller.ts` |

**Regenerate:** `npm run exposure:write-docs` → [docs/backend-exposure-report.md](../backend-exposure-report.md), [docs/orphaned-backend-functions.md](../orphaned-backend-functions.md), [docs/endpoint-to-frontend-matrix.md](../endpoint-to-frontend-matrix.md)

**Executors (POST):** `sofa-calculator`, `drug-interactions`, `lab-interpreter` — drift-synced with `tool-orchestrator.registry.ts`.

**Docs:** [docs/production-backend-frontend-audit.md](../production-backend-frontend-audit.md)

---

## 8. Contract matrix

- **`src/data/backendFrontendToolContract.js`** — 17-column extended matrix.
- **`src/data/toolContractMatrix.js`** — simplified matrix: ID, route, component, catalog, registry, NLU, executor, endpoint, DTO, API client, **status** (`fully wired` \| `frontend-only` \| `backend-only` \| `broken` \| `planned`).

**Regenerate:** `npm run contract:write-docs` → [docs/tool-contract-matrix.md](../tool-contract-matrix.md), [docs/backend-frontend-tool-contract.md](../backend-frontend-tool-contract.md)

**Known documented gaps:** `tools-share-results` (broken), `dispatch-ai` (NLU-only badge), `procedures` (registry-only NLU gap).

---

## 9. Performance improvements

| Change | Impact |
|--------|--------|
| **Lazy** `Dashboard`, `Profile`, `Settings` | Smaller initial route chunk |
| **`deferStartupTasks.js`** | Analytics, Sentry, offline/Dexie, push after idle |
| **`vite.config.js` manualChunks** | `dashboard`, `calculators`, `clinical-catalog`, `vendor-idb`, `vendor-firebase` |
| **`React.memo(ToolCard)`** | Fewer chat re-renders |
| **`scheduleIdleWork`** for NLU recommendations | Better INP on dashboard |
| **`mobile-performance.css`** | Loader min-height (CLS); `content-visibility`; `touch-action: manipulation` |
| **Initial `index` bundle** | ~245 KB → ~118 KB JS (gzip ~67 → ~34 KB) per production build |

**Docs:** [docs/mobile-performance-audit.md](../mobile-performance-audit.md)

---

## 10. Accessibility improvements

- **Touch targets:** 44px menu, catalog chips, calculator actions (design tokens).
- **Drawer:** `aria-expanded`, `aria-controls`, focus trap, `inert` when closed.
- **Catalog:** `aria-label` on search/filter; launch buttons with visible labels.
- **Images:** `loading="lazy"`, `decoding="async"`, explicit dimensions (avatar, 2FA QR).
- **`prefers-reduced-motion`** — reduced spinner animation in `mobile-performance.css`.
- **Sidebar:** `aria-current` on active nav; keyboard-accessible tool rows.

---

## 11. Testing

### Required CI / pre-merge commands

```bash
npm run lint
npm run build
npm run test:run

# Exposure & contract
npm run test:backend-exposure          # 48 tests
npm run test:contract-matrix           # 16+ tests

# Responsive & tools
npm run test:responsive-regression     # 135 tests
npm run test:catalog-launch
npm run test:tool-render-smoke

# Mobile performance contracts
npm run test:mobile-performance        # 9 tests

# Android matrix (unit)
npm run test:run -- src/data/androidDeviceQaMatrix.test.js

# Optional E2E (dev server)
npm run test:e2e:android -- --grep "\[touch\]|\[sidebar\]|\[catalog\]"
npm run qa:android                     # full ~105 Playwright cells
```

### Acceptance mapping

| Criterion | Verification |
|-----------|--------------|
| Pixel 7 works | Viewport 412×915 in `responsiveQaMatrix` + `ANDROID_QA_DEVICES` |
| Android screens work | `qa:android` overflow + interaction smoke |
| Calculators visible | `Calculators.formSmoke` + mobile CSS + Android calculator tests |
| Backend exposed correctly | `test:backend-exposure` + exposure docs |
| No clipped screens | Overflow detection in Playwright + responsive tests |
| No hidden tools | Catalog launch tests + visibility matrix / contract |
| Tests pass | Gates above |

---

## 12. QA matrix

| Matrix | Location | Scope |
|--------|----------|--------|
| **Android devices** | [qa/ANDROID_QA_MATRIX.md](../../qa/ANDROID_QA_MATRIX.md) | Pixel 7/Pro, Galaxy S/A, OnePlus, Motorola, tablet |
| **Responsive overflow** | [qa/RESPONSIVE_QA_MATRIX.md](../../qa/RESPONSIVE_QA_MATRIX.md) | Pages × viewports × browsers |
| **Tool contract** | [docs/tool-contract-matrix.md](../tool-contract-matrix.md) | Per-tool wiring status |
| **Backend exposure** | [docs/backend-exposure-report.md](../backend-exposure-report.md) | API inventory |
| **Manual QA** | [docs/pr/QA_CHECKLIST.md](./QA_CHECKLIST.md) | Sample tools @ 390px |

**Android scenarios:** routes, calculators, catalog, sidebar, backend stubs, landscape, touch (≥44px).

---

## 13. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Lazy route flash on slow networks | Medium | Low | `PageLoader` with full-viewport min-height; `lazyWithRetry` reload on chunk error |
| Deferred startup delays analytics/offline | Low | Low | Idle callback + 3s timeout fallback; features degrade gracefully |
| Catalog API down | Medium | Medium | Static catalog rows; `fetchBackendClinicalTools` error state; gated phantom APIs |
| False sense of “all tools have POST executors” | Low | High | Contract matrix + executor drift tests; only 3 registered executors |
| Playwright cold-start flakes | Medium | Low | Route warm-up, API stubs, retries=1 |
| Capacitor WebView differences | Medium | Medium | Manual device pass recommended post-merge |
| Large calculators chunk | Low | Low | Route-only load; not on dashboard first paint |

---

## 14. Rollback plan

1. **Revert merge commit** on `main` if catastrophic UI regression.
2. **Partial rollback** (if isolated):
   - CSS only: revert `catalog-mobile.css`, `calculators-mobile-pr.css`, `mobile-first-layout.css` imports from `main.jsx` / page entry points.
   - Performance: revert `main.jsx` defer + `App.jsx` lazy dashboard (restore sync imports).
   - Exposure gates: revert `backendApiCapabilities.js` only if phantom calls must reach network (not recommended).
3. **Verify rollback:** `npm run build && npm run test:responsive-regression && npm run test:backend-exposure`.
4. **Deploy:** Redeploy previous frontend artifact from last green build; backend unchanged unless registry/pattern commits included—revert `tool-orchestrator.registry.ts` / `tool.patterns.ts` if NLU routing regresses.

**Monitoring post-deploy:** Check client error rate, LCP on `/dashboard`, catalog launch clicks, and `POST /api/tools/*/execute` success for SOFA / drug / lab tools.

---

## Reviewer focus

1. Open **`/tools/catalog`** on 412px width — confirm launch buttons visible without horizontal scroll.
2. Open **`/tools/calculators/has-bled`** — reset visible without scrolling sideways.
3. Toggle **hamburger menu** — content clickable when drawer closed.
4. Run **`npm run test:backend-exposure`** and **`npm run test:responsive-regression`** locally.

---

## Related documentation

- [README.md](../../README.md) — links to matrices and audit docs
- [RESPONSIVE_UI_HARDENING.md](./RESPONSIVE_UI_HARDENING.md)
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md)
