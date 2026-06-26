# CareDroid Codebase Mismatch Remediation Plan

**Purpose:** Inventory every major language/format split in the repo, explain why it is a mismatch, and define how to converge on **one CareDroid product** with **TypeScript for all application logic**.

**Related:** [TYPESCRIPT_UNIFICATION_PLAN.md](./TYPESCRIPT_UNIFICATION_PLAN.md) (Kotlin → TS mobile strategy)

**Audit date:** 2026-06-25

---

## 1. Executive summary

The repository is not one homogeneous codebase. It is a **stack of partially merged products** with duplicate trees, competing runtimes, and parallel implementations of the same concerns.

| Severity | Mismatch | Impact |
|----------|----------|--------|
| **P0** | Kotlin Compose Android app vs Capacitor web app | Two mobile products, different auth/chat/UI |
| **P0** | `engine/` (root) vs `src/engine/` — **different file hashes** | Silent logic drift, wrong engine version imported |
| **P1** | JavaScript/JSX (~74% of `src/` UI files) vs TypeScript target | No compile-time safety on most product code |
| **P1** | NestJS (TypeORM) + optional Mongoose legacy routes | Two backend API styles on same server |
| **P1** | `store/`, `frontend/`, `src/lib/ai/` shims vs canonical `src/` + `lib/` | Import confusion, duplicate mental models |
| **P2** | 286 CSS files + 3 global entry stylesheets | Design-token sprawl, hard-to-theme ED shell |
| **P2** | Vitest + Jest + Playwright | Three test runners, overlapping coverage |
| **P2** | `.ps1` + `.sh` duplicate scripts (Windows vs Unix) | Maintenance doubled for ops scripts |
| **P3** | Python ML microservices (`backend/ml-services/`) | Separate runtime; OK if bounded to ML only |
| **P3** | `mcp/` separate Node package | Auxiliary bridge — not product UI |
| **P3** | `package.android.json` vs root `package.json` | Two npm manifests, conflicting Android story |

**Target end state:**

```
Product logic:     TypeScript only (src/, lib/, backend/)
Presentation CSS:  Consolidated tokens + feature CSS (not removed — unified)
Mobile shell:      Capacitor (minimal Java/Kotlin Activity — no product Kotlin)
Ops scripts:       Node .mjs primary; one shell script per task for CI
ML (optional):     Python isolated behind HTTP — never duplicates TS business rules
```

---

## 2. Language & format inventory

Counts exclude `node_modules`, `dist`, `.git`, and Android build caches.

| Format | Approx. count | Role today | Target |
|--------|---------------|------------|--------|
| `.ts` | 1,188 | Backend, lib, partial frontend | **Keep — primary language** |
| `.js` | 822 | Legacy frontend, scripts, tests | **Migrate product code → `.ts`; keep tooling `.mjs`** |
| `.jsx` | 375 | Most React pages/components | **Migrate → `.tsx`** |
| `.tsx` | 127 | Newer React surfaces | **Expand to all UI** |
| `.css` | 287 | Global + per-component styles | **Consolidate tokens; co-locate feature CSS** |
| `.kt` | 74 | Native Android app (Compose) | **Remove product layer — see TS unification plan** |
| `.java` | 2 | Capacitor template tests only | **Keep minimal stubs** |
| `.py` | 15 | NLU / anomaly ML training & serving | **Keep in `ml-services/` only** |
| `.sh` | 15 | Ops / Android build scripts | **One canonical script per task; prefer `.mjs`** |
| `.ps1` | 8 | Windows duplicates of `.sh` | **Deprecate where `npm run` + `.mjs` suffices** |
| `.mjs` | 106 | Node tooling (audits, dev stack) | **Keep — canonical for repo automation** |
| `.json` | 195 | Config, manifests, fixtures | **Keep — single package story for app** |

### `src/` frontend split (product code only)

| Extension | Files | Share |
|-----------|------:|------:|
| `.js` | 818 | 57% |
| `.jsx` | 375 | 26% |
| `.ts` | 413 | 29%* |
| `.tsx` | 127 | 9% |

\*TypeScript file count overlaps with JS modules in hybrid folders; **~65% of UI remains JS/JSX**.

`tsconfig.frontend.json` only typechecks `.ts`/`.tsx` (`allowJs: true` but `include` excludes `.js`/`.jsx`). **Most of the app is invisible to `typecheck:frontend`.**

---

## 3. Mismatch catalog (what is wrong and how to fix it)

### 3.1 Mobile: Kotlin app inside the repo (P0)

**Found:** `android/app/src/main/kotlin/` — 74 Kotlin files, Jetpack Compose screens, Room DB, Retrofit API, Hilt DI. `MainActivity.kt` uses Compose **instead of WebView**.

**Also found:** Root `package.json` has `android-debug` → Capacitor sync to `dist/`, but **Capacitor is not what `MainActivity` runs today**.

**Fix:**

1. Replace Compose `MainActivity` with Capacitor `BridgeActivity` (see [TYPESCRIPT_UNIFICATION_PLAN.md](./TYPESCRIPT_UNIFICATION_PLAN.md)).
2. Quarantine/delete `ui/`, `viewmodel/`, `data/repository`, Room, Retrofit from Kotlin.
3. Retire `package.android.json` as a separate “native app” manifest — merge scripts into root `package.json`.
4. Keep only: manifest, resources, Gradle wrapper, Capacitor bridge (~minimal Java/Kotlin).

---

### 3.2 Duplicate engine trees with divergent code (P0)

**Found:**

| File | `engine/` (repo root) | `src/engine/` | Same content? |
|------|----------------------|---------------|---------------|
| `capacityEngine.ts` | ✓ | ✓ | **No** |
| `reassessmentEngine.ts` | ✓ | ✓ | **No** |
| `triageEngine.ts` | ✓ | ✓ | **No** |
| `alertEngine.ts` | ✓ | ✓ | **No** |
| `simulation.ts` | ✓ | ✓ | **No** |

**Imports:**

- `src/components/AppShell.tsx` → `../engine/` → **`src/engine/`**
- `src/layout/AppShell.jsx` (legacy) → `../../engine/` → **root `engine/`**
- `lib/patient-orchestration/` → `../../engine/` → **root `engine/`**

**Fix:**

1. Pick **one canonical tree:** `src/engine/` (under unified `src/`).
2. Diff root `engine/` vs `src/engine/`; merge best logic into `src/engine/`.
3. Update `lib/` imports to `@/engine/*` or `src/engine/*` via Vite alias.
4. Delete root `engine/` after grep shows zero imports.
5. Delete `src/layout/AppShell.jsx` (uses wrong engine path).
6. Add CI test: fail if `engine/` exists at repo root.

---

### 3.3 Duplicate folder shims (P1)

| Path | Status | Canonical target | Action |
|------|--------|------------------|--------|
| `store/` | Deprecated shim | `src/store/emergencyStore.ts` | Delete after import audit; keep `@store` alias |
| `frontend/` | Deprecated shim | `src/store`, `src/hooks` | Delete folder |
| `src/lib/ai/*` | Re-export wrappers | `lib/ai/*` | Remove wrappers; import `@lib/ai` everywhere |
| `src/lib/apiClient.ts` | Re-export | `src/services/apiClient.js` | Merge into `src/services/api.ts` |
| `src/layout/AppShell.jsx` | Legacy duplicate | `src/components/AppShell.tsx` | **Delete** |
| `src/layouts/AppShell.tsx` | Export barrel | `src/components/AppShell.tsx` | Keep until component moves |

---

### 3.4 JavaScript vs TypeScript (P1)

**Found:** Router still `src/app/router.jsx`; entry `src/main.jsx`; most pages `*.jsx`; services mix `.js` and `.ts`.

**Fix (ordered):**

1. `src/main.jsx` → `src/main.tsx`
2. `src/app/router.jsx` → `src/app/router.tsx`
3. `src/services/emergencyOsApi.js` + `apiClient.js` → `src/services/api.ts`
4. Migrate `pages/emergency/*` → `src/features/*/` as `.tsx`
5. Tighten `tsconfig.frontend.json`: `allowJs: false` when migration ≥95%
6. ESLint rule: block new `.jsx` under `src/features` and `src/app`

**Do not migrate to TS:** one-off audit scripts in `scripts/*.mjs` (stay ESM JavaScript).

---

### 3.5 Backend dual persistence & API layers (P1)

**Found:**

| Layer | Technology | Notes |
|-------|------------|-------|
| Primary NestJS | TypeORM + SQLite (dev) / PostgreSQL (prod) | Canonical for SaaS |
| Legacy emergency routes | Mongoose + `registerAllRoutes()` when `ENABLE_MONGOOSE_EMERGENCY_OS` | Parallel `/api/*` and `/api/emergency/*` |
| SQLite files | `caredroid.dev.sqlite` at **root and** `backend/` | Duplicate local DB artifacts |

**Fix:**

1. Single write path: `backend/src/modules/emergency-os/` (TypeORM entities).
2. Gate Mongoose bootstrap behind feature flag; default **off**; document removal date.
3. Add `.gitignore` entries for `*.sqlite` at repo root; keep one dev DB path under `backend/`.
4. One OpenAPI/Swagger surface — no Retrofit mirror in Kotlin (removed with mobile unification).

---

### 3.6 CSS & styling sprawl (P2)

**Found:**

- **286** `.css` files in `src/` (40 under `components/`, 26 global `styles/`, rest per-page/per-feature).
- Multiple global entry files referenced historically: `index.css`, `globals.css`, `styles/index.css`, plus normalization layers in `main` (some since simplified).
- Parallel themes: `medical-*-layer.css`, `theme-legacy-bridge.css`, `emergency-tokens.css`, component-level overrides.

**Fix:**

1. **Single global entry:** `src/styles/globals.css` imports token layers only.
2. Token source of truth: `src/styles/design-tokens.css` + `src/styles/emergency-tokens.css`.
3. Deprecate `theme-legacy-bridge.css` after component migration.
4. Co-locate feature CSS under `src/features/<name>/` (already started with `DisplayShell.css`).
5. Run existing `normalize:medical` scripts once, then freeze — no new normalization layers.
6. Reduce `main.tsx` to **one** CSS import chain.

**CSS is not eliminated** — it is **unified**. TypeScript does not replace CSS for layout.

---

### 3.7 Shell scripts: `.sh` vs `.ps1` duplicates (P2)

**Found:** Pairs such as:

- `scripts/check-ports.sh` + `scripts/check-ports.ps1`
- `scripts/verify-single-instance.sh` + `.ps1`
- `scripts/audit-and-clean.sh` + `.ps1`
- Root/Android: `build-android-apk.sh`, `build-android.ps1`, `android/build-release.sh`, etc.

**Fix:**

1. **Canonical automation:** `npm run <task>` → `scripts/*.mjs` (cross-platform Node).
2. Keep **one** shell script per task only where Node cannot replace (e.g. `gradlew`, Docker).
3. Mark `.ps1` duplicates deprecated; README documents `npm.cmd` on Windows (per project convention).
4. Consolidate Android build to: `npm run android-debug` (Capacitor) — retire parallel `package.android.json` Gradle-only flow.

---

### 3.8 Python ML services (P3 — bounded keep)

**Found:** `backend/ml-services/nlu/` and `anomaly-detection/` — training, evaluation, Flask/FastAPI-style apps, `setup.sh`/`setup.ps1`.

**Policy:**

- Python is **allowed only** for offline training and optional ML inference microservices.
- **No product business rules in Python** that are not also expressed in TypeScript (NestJS) or documented as ML-only.
- NestJS calls ML via HTTP — already the pattern to preserve.
- Do not port NLU training scripts to TypeScript; **do** ensure API contracts are defined in `backend/src` TypeScript types.

---

### 3.9 Test runner fragmentation (P2)

**Found:**

| Runner | Scope |
|--------|-------|
| **Vitest** | Primary frontend unit/integration (`src/`) |
| **Jest** | `tests/integration`, backend uses Jest |
| **Playwright** | E2E responsive/Android/production smoke |

**Fix:**

1. Frontend: **Vitest only** for `src/`.
2. Backend: **Jest only** for `backend/` (NestJS convention — keep).
3. Cross-stack: Playwright E2E — keep.
4. Remove root-level `jest` usage for frontend tests over time.
5. Drop `test-runner.py` at repo root if unused (audit → delete or document).

---

### 3.10 Config & routing duplication (P1)

**Found:**

| Concern | Files | Issue |
|---------|-------|-------|
| Routes | `src/app/router.jsx`, `src/config/routes.config.js` | Router not typed; 1900+ line JSX table |
| Navigation | `navigation.config.js` + `unified-navigation.config.ts` | Two nav registries |
| Packages | `package.json`, `package.android.json`, `backend/package.json`, `mcp/package.json` | Four npm manifests |

**Fix:**

1. Routes: `routes.config.ts` + `router.tsx` only; extension redirects in `edApplication.config.ts` (done).
2. Navigation: deprecate `navigation.config.js`; single `unified-navigation.config.ts`.
3. Packages: root `package.json` owns web + Capacitor Android; `backend/package.json` stays; `mcp/package.json` stays auxiliary; **delete `package.android.json`** after script merge.

---

### 3.11 Orphan & quarantine artifacts (P2)

| Artifact | Action |
|----------|--------|
| `.tmp-original-app.jsx` | Delete |
| `src/features/future-modules/_review/` | Move to `src/_quarantine/` or delete if unused |
| `agent-tools/*.txt` | Gitignore or move out of repo |
| `terminals/*.txt` | Dev session logs — gitignore |
| Duplicate `caredroid*.sqlite` at root | Delete + gitignore |

---

### 3.12 Docker & compose files (P3)

**Found:** `docker-compose.yml`, `docker-compose.app.yml`, `docker-compose.ml.yml`

**Fix:** Document one command per environment in README:

- App only: `compose:app`
- App + ML: `compose:app:ml`
- Deprecate overlapping `docker-compose.yml` if redundant (merge or README table).

---

## 4. Resolution policy by format

| Format | Verdict |
|--------|---------|
| **TypeScript** | Required for all product logic (frontend, backend, shared `lib/`) |
| **JavaScript `.mjs`** | Allowed for `scripts/`, Vite config, Playwright config |
| **JavaScript `.js` in `src/`** | Legacy — migrate, do not add new files |
| **JSX** | Legacy — migrate to TSX |
| **CSS** | Keep — consolidate under tokens + `features/*/styles` |
| **Kotlin** | Remove product code; Capacitor shell only |
| **Java** | Capacitor test stubs only |
| **Python** | `backend/ml-services/` only |
| **Shell `.sh`** | Minimal — prefer `npm run` + `.mjs` |
| **PowerShell `.ps1`** | Deprecate duplicates |
| **JSON** | Config/manifests — reduce duplicate package stories |
| **SQL** | Migrations via TypeORM in `backend/` only |

---

## 5. Phased remediation roadmap

### Phase 0 — Stop the bleeding (week 1)

- [ ] Freeze new Kotlin UI features.
- [ ] Freeze new files in root `engine/`.
- [ ] Freeze new `.jsx` in `src/app` and `src/features`.
- [ ] Add CI grep gate: fail on new imports from `store/` or `frontend/` (except shims).

### Phase 1 — Collapse critical duplicates (week 1–2)

- [ ] Merge `engine/` → `src/engine/`; delete root `engine/`.
- [ ] Delete `src/layout/AppShell.jsx`.
- [ ] Capacitor `MainActivity` (per TS unification plan).
- [ ] Remove `package.android.json` scripts into root `package.json`.

### Phase 2 — TypeScript convergence (week 2–6)

- [ ] `router.tsx`, `main.tsx`, `services/api.ts`.
- [ ] `features/` migration for emergency surfaces.
- [ ] Remove `src/lib/ai` re-export shims → `@lib/ai` imports.
- [ ] Delete `frontend/`, root `store/` shims.

### Phase 3 — Backend single path (week 4–8)

- [ ] Default Mongoose emergency OS **off**.
- [ ] TypeORM entities for ED domain (tenant-scoped).
- [ ] Single SQLite dev path under `backend/`.

### Phase 4 — CSS & design system (week 4–6)

- [ ] One `globals.css` import chain in `main.tsx`.
- [ ] Retire `theme-legacy-bridge.css`.
- [ ] Document token usage in `src/styles/README` (optional short note in main README only).

### Phase 5 — Tooling hygiene (week 6–8)

- [ ] Replace `.ps1`/`.sh` pairs with `scripts/*.mjs` + npm scripts.
- [ ] Audit/delete orphans (`.tmp-original-app.jsx`, sqlite at root).
- [ ] Quarantine extension pages in router (fleet, cosmos) — bundle win.

### Phase 6 — Verification

- [ ] `npm run typecheck:frontend` covers ≥95% of `src/` product files.
- [ ] `npm run build` + `npm run android-debug` → ED whiteboard on device.
- [ ] No Kotlin Compose screens in startup path.
- [ ] `grep -r "from '../../engine'"` returns zero hits outside `src/engine`.

---

## 6. What we are NOT trying to eliminate

| Item | Why it stays |
|------|----------------|
| **CSS** | UI requires styles; we unify tokens, not delete CSS |
| **Python ML** | Training/inference ecosystem; isolated service |
| **Gradle / Android manifest** | APK packaging requires it |
| **Minimal Java/Kotlin Activity** | Capacitor Android requirement |
| **Playwright `.mjs` specs** | E2E standard |
| **`scripts/*.mjs` audits** | Cross-platform repo tooling |
| **Backend Jest** | NestJS ecosystem standard |

---

## 7. Success metrics

| Metric | Current (approx.) | Target |
|--------|-------------------|--------|
| Kotlin product `.kt` files | 74 | 0 (Capacitor shell only) |
| Root `engine/` duplicate files | 5+ divergent | 0 |
| `src/` JSX+JS share of UI | ~65% | <10% |
| `typecheck:frontend` coverage | TS/TSX only | All product `src/` |
| CSS global entry files | 3+ chains | 1 chain |
| npm app manifests | 2 (`package.json` + `package.android.json`) | 1 primary |
| Mobile apps shipped | 2 (Compose + Capacitor intent) | 1 (Capacitor TS bundle) |
| Backend write APIs for ED | TypeORM + optional Mongoose | TypeORM only |

---

## 8. Quick reference — canonical paths

| Concern | Canonical path |
|---------|----------------|
| Web entry | `src/main.tsx` (target; today `main.jsx`) |
| App root | `src/app/App.tsx` |
| Router | `src/app/router.tsx` (target; today `router.jsx`) |
| ED state | `src/store/emergencyStore.ts` |
| API facade | `src/services/api.ts` (target) |
| Shared AI/orchestration | `lib/` (`@lib/*`) |
| Clinical engines | `src/engine/` (after merge) |
| Domain types | `src/domain/types.ts` |
| Global styles | `src/styles/globals.css` |
| Backend | `backend/src/` (NestJS TypeScript) |
| Android shell | Capacitor `android/` wrapping `dist/` |
| ML (optional) | `backend/ml-services/` (Python) |

---

## 9. Immediate next five actions

1. **Diff and merge** `engine/` → `src/engine/`; delete root copy.
2. **Swap Android `MainActivity`** to Capacitor (stops Kotlin app inside app).
3. **Delete** `src/layout/AppShell.jsx` and `.tmp-original-app.jsx`.
4. **Convert** `src/app/router.jsx` → `router.tsx` (types for routes).
5. **Add CI check** blocking new imports from deprecated shims (`store/`, `frontend/`, root `engine/`).

---

*This document should be updated when each phase completes. Pair with [TYPESCRIPT_UNIFICATION_PLAN.md](./TYPESCRIPT_UNIFICATION_PLAN.md) for mobile-specific Kotlin retirement.*