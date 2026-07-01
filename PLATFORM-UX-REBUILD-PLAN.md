# Platform UX Rebuild Plan

**Date:** 2026-07-01  
**Goal:** Align shell chrome, page layout, clinical design language, and missing platform elements (AI Copilot) across all ED routes. Fix header/page title mismatches and dimension drift.

---

## Architecture (single source of truth)

| Layer | Owner | Responsibility |
|-------|-------|----------------|
| Utility bar | `Header.tsx` | Clock, status, create, search, account — no page titles |
| Route identity | `ShellRouteTab.tsx` + `RouteChromeContext` | Permanent upper tab; pages register via `useRouteChromeRegistration` |
| Page gutters | `layout-engine.css` | `--app-layout-page-gutter-*`; pages must not duplicate horizontal padding |
| Clinical canvas | `clinical-page-*.css` (4 layers) | Warm cards, operational flow, route-family sweep |
| Copilot | `SidebarChromeControls` + `CopilotPanel` | Session dock in sidebar; panel opens on toggle (C) |

### Canonical dimensions

| Token | Value |
|-------|-------|
| `--cdl-sidebar-width` | 232px |
| `--cdl-header-height` | 52px |
| `--cdl-route-tab-height` | 44px |
| `--cdl-chrome-stack-height` | header + route tab + alarm dock estimate |

---

## 10 Platform Scans

### Scan 1 — Design language layer order
**Command:** `npm run test:run -- src/styles/designLanguageFit.test.ts`  
**Pass criteria:** CDL tokens load in correct order; no brutal `box-shadow: none` regressions.

### Scan 2 — Clinical page sweep coverage
**Command:** `npm run test:run -- src/styles/clinicalPageSweep.test.ts`  
**Pass criteria:** All major route families styled; router registers core emergency pages including Copilot.

### Scan 3 — Visual consistency sweep
**Command:** `npm run test:run -- src/styles/visualConsistencySweep.test.ts`  
**Pass criteria:** Cards/panels use `--cdl-clinical-shadow-rest`; no flat brutalist overrides.

### Scan 4 — Shell chrome dimension contract
**Command:** `npm run test:run -- src/styles/platformShellDimension.test.ts`  
**Pass criteria:** Header height tokens aligned (52px stack); scroll-padding uses chrome stack height.

### Scan 5 — Navigation + Copilot visibility
**Command:** `npm run test:run -- src/config/unified-navigation.config.test.ts src/hooks/useCopilotChromeAccess.test.ts`  
**Pass criteria:** Physician nav includes `copilot`; session copilot chrome enabled for allowed roles.

### Scan 6 — App shell wiring
**Command:** `npm run test:run -- src/layout/AppShell.navigation.test.tsx`  
**Pass criteria:** `CopilotPanel`, `ShellRouteTab`, `RouteChromeProvider` present in shell.

### Scan 7 — Emergency route smoke
**Command:** `npm run test:run -- src/pages/emergency/emergencyPagesSmoke.test.tsx`  
**Pass criteria:** All lazy route exports including `CopilotRoute` resolve.

### Scan 8 — Backend route registry
**Command:** `npm run test:run -- backend/src/api/routes-registry.spec.ts` (if backend deps installed)  
**Pass criteria:** `/api/copilot` routes registered.

### Scan 9 — Frontend production build
**Command:** `npm run build`  
**Pass criteria:** Vite build completes without errors.

### Scan 10 — Git hygiene
**Command:** `git status` + stage only `src/`, `backend/`, `qa/`, root plan — exclude `terminals/`, `agent-tools/`  
**Pass criteria:** Clean commit message; push to `origin/main`.

---

## Fix DAG (execution order)

```
1. Align shell dimension tokens (design-tokens ↔ shell-header-polish ↔ layout-engine)
2. Extend clinicalPageSweep + add platformShellDimension.test.ts
3. Ensure CopilotRoute in router sweep + copilot route family in clinical-page-sweep.css
4. Verify SidebarChromeControls renders for all non-reception roles
5. Run scans 1–9
6. Commit + push (scan 10)
```

---

## Known mismatch root causes

1. **Duplicate page headers** — in-page `cd-page-header` fighting `ShellRouteTab`; suppressed via `shell-header-polish.css` + `suppressHeader` on `EmergencyRoutePage`.
2. **Token drift** — `--app-shell-header-height: 56px` vs `--cdl-header-height: 52px` breaks scroll-padding alignment.
3. **Copilot "missing"** — docked panel requires toggle (sidebar Copilot group or `C` key); hidden on reception desk by policy; floating launch only when session copilot chrome is off.
4. **Pages without route chrome** — non-`EmergencyRoutePage` routes fall back to `EMERGENCY_OS_PAGE_TITLES` in AppShell; register chrome or wrap in `EmergencyRoutePage`.

---

## QA artifacts

Responsive screenshots: `qa/shell-ux-audit/responsive/` (full + `previews/` at 1280×720)  
Capture command: `npm run build && npm run preview -- --port 4173 --strictPort` then `QA_BASE_URL=http://localhost:4173 npm run qa:shell-responsive`  
Dev server: `http://localhost:8000` · Preview: `http://localhost:4173`

---

## Status log

| Scan | Status | Notes |
|------|--------|-------|
| 1 | pass | designLanguageFit — 13/13 |
| 2 | pass | clinicalPageSweep — 5/5 (incl. CopilotRoute) |
| 3 | pass | visualConsistencySweep — 4/4 |
| 4 | pass | platformShellDimension — 5/5 |
| 5 | pass | unified-navigation + useCopilotChromeAccess — 14/14 |
| 6 | pass | AppShell.navigation — 8/8 |
| 7 | pass | emergencyPagesSmoke — 4/4 |
| 8 | skip | backend spec not run in this pass |
| 9 | pass | `npm run build` — 21.75s |
| 10 | pass | commit `2ed49443` pushed to origin/main |