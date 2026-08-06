# CareDroid Interaction & Execution-Path Engineering Report

**Date:** 2026-07-11  
**Mode:** Professor Mode — Full Interaction and Execution-Path Repair  
**Status:** Phase 0 tooling complete · Static BROKEN = 0 · Runtime harness ready · ED critical repairs applied  

---

## 1. Executive summary

CareDroid already had strong inventories (clickable map, tool render/execute matrix, orphan detection, command-palette and error-recovery audits). This work closed the two largest gaps:

1. **Static dead-control scanner** (`scripts/scan-interaction-inventory.mjs`)  
2. **Playwright interaction-execution harness** (`e2e/interaction-execution.spec.mjs`)

Repairs focused on real disconnected controls (notably **Clinical Alerts Export** and **Ambient Scribe copy-forward**) and a shared **disabled-reason** contract on the design-system `Button`.

Static inventory now reports **0 BROKEN** controls across 563 TSX/JSX files (1192 classified controls).

---

## 2. Interaction inventory summary

| Metric | Value |
|--------|------:|
| Files scanned | 563 |
| Controls classified | 1192 |
| **LIVE** | 1189 |
| **DISABLED_REASONED** | 1 |
| **NEEDS_REVIEW** | 2 |
| **BROKEN** | **0** |
| ED-focused BROKEN | **0** |

Generated artifact: `qa/interaction-inventory.json`  
Regenerate: `npm run interaction:scan`

### Classification rules

| Class | Meaning |
|-------|---------|
| LIVE | Handler, navigation, submit, prop-forwarding primitive, or keyboard handler found |
| DISABLED_REASONED | Always-disabled with `title` / `aria-describedby` / `data-disabled-reason` |
| NEEDS_REVIEW | Design-system `<Button>` without local `onClick` (often nested under `<Link>`) |
| BROKEN | Interactive native control with no execution binding (must be 0) |

---

## 3. Broken controls found & root causes

| Control | File | Root cause | Resolution |
|---------|------|------------|------------|
| Alert **Export** | `src/pages/ClinicalAlertsPage.tsx` | Visible button, no `onClick` | Wired client-side JSON export + role/read-only guards + status feedback |
| Ambient Scribe **Ready for clinician copy-forward** | `src/pages/tools/AmbientScribe.tsx` | Button only gated by checkbox; no action | Implemented clipboard copy of reviewed draft + `aria-live` status; disabled reason when unchecked |
| Scanner false positives | Multiple | Narrow window, body text matching “disabled”, primitives, Link-wrapped Buttons, test fixtures | Scanner hardened (wider window + lookback, opening-tag attrs only, skip tests/main, primitives LIVE, capital Button → NEEDS_REVIEW) |

Historical intentional items (from prior clickable-map report):

| Control | Disposition |
|---------|-------------|
| Whiteboard **New Order** | DISABLED until order API exists (verify reason still present where rendered) |
| MoH data lookup | Must not surface as functional tool |
| EMS Diversion | Read-only status (formerly no-op button) |

---

## 4. Files modified / created

### Created

| Path | Purpose |
|------|---------|
| `src/data/interactionInventoryModel.ts` | Classification model |
| `src/data/interactionInventory.test.ts` | Unit tests for classifier |
| `scripts/scan-interaction-inventory.mjs` | Static inventory scanner |
| `e2e/interaction-execution.helpers.mjs` | Auth, control collection, outcome delta |
| `e2e/interaction-execution.spec.mjs` | ED route interaction suite |
| `playwright.interaction.config.ts` | Playwright config for interaction suite |
| `qa/interaction-inventory.json` | Generated inventory |
| `docs/INTERACTION_EXECUTION_REPORT.md` | This report |

### Modified

| Path | Change |
|------|--------|
| `src/components/ui/button.tsx` | `disabledReason`, loading `aria-busy`, accessible description, `data-disabled-reason` |
| `src/pages/ClinicalAlertsPage.tsx` | Export handler + feedback |
| `src/pages/tools/AmbientScribe.tsx` | Copy-forward execution path + status |
| `package.json` | `interaction:scan`, `interaction:test`, `test:e2e:interaction` |

---

## 5. Workflows repaired

| Workflow | Before | After |
|----------|--------|-------|
| Clinical alert export | Decorative export button | Permission-checked JSON download + status notice |
| Ambient scribe copy-forward | Disabled-only CTA with no outcome when enabled | Clipboard copy of structured draft; polite live status; explicit disabled reason |
| Shared buttons | No standard disabled explanation | `disabledReason` prop pattern for intentional non-availability |

---

## 6. Tests added

| Test | Result |
|------|--------|
| `src/data/interactionInventory.test.ts` (7 tests) | **PASS** |
| `npm run interaction:scan` | **PASS** (0 BROKEN) |

### Runtime harness (ready; run with stack up)

```bash
npm run dev:fullstack
npm run test:e2e:interaction
```

Harness covers ED routes:

- `/emergency/whiteboard`, `/reception`, `/ems`, `/command-center`, `/alerts`, `/tools`, `/dispatch`, `/settings`

Asserts: shell load, pageerror free, control discovery, click attempts, outcome taxonomy (navigation / dialog / live-region / network / DOM delta), writes `qa/interaction-execution-report.json`.

---

## 7. Execution paths verified (static)

| Path | Status |
|------|--------|
| Buttons/Links with onClick/to/href | LIVE via static binding |
| Prop-forwarding Button/IconButton primitives | LIVE (parent supplies handler) |
| Role=button with onClick/onKeyDown (maps, cards) | LIVE (lookback window) |
| Clinical alert ack | Pre-existing lifecycle orchestrator (unchanged; still wired) |
| Clinical alert export | **Repaired** |
| Ambient scribe generate + copy-forward | Generate pre-existing; copy-forward **repaired** |
| FeatureGate “Enable in Settings” | LIVE Link navigation |

---

## 8. Intentionally disabled / unavailable capabilities

| Capability | How users see it | Notes |
|------------|------------------|-------|
| Order entry (New Order) | Disabled / not shipped as live order API | Do not present fake success |
| Backend clinical alerts API | Demo capability flag | `ApiStateBanner` + local sample data |
| Features behind FeatureGate | Hidden or placeholder with Settings link | Prefer Settings enable CTA |
| Clipboard in restricted browsers | Status message when copy fails | Manual copy fallback messaging |
| Sentinel EMS (when flag off) | Degraded/unavailable messaging | Not fake live tracking |

---

## 9. Remaining blockers / next steps

1. **Run Playwright interaction suite** against a live `dev-stack` and triage any `no-observable-outcome` rows (stricten over time).  
2. **NEEDS_REVIEW (2)** — confirm capital `<Button>` inside `<Link>` patterns remain intentional; convert to Link-styled controls if desired.  
3. **Orphan scanner** still App.jsx-era in places — refresh against `src/app/router.tsx` (separate from dead-button scan).  
4. **Feature-flag UX** — for ED-critical flags, prefer locked chips over silent hide (product decision).  
5. **New Order** — keep DISABLED_REASONED until Nest order endpoint exists.  
6. Expand crawler allowlist to fleet/ops/admin after ED is green in CI.  
7. Wire CI: `interaction:scan` fail on BROKEN > 0; periodic `test:e2e:interaction`.

---

## 10. Exact validation results (this session)

```
node scripts/scan-interaction-inventory.mjs
  → Controls: 1192 | LIVE 1189 | DISABLED_REASONED 1 | NEEDS_REVIEW 2 | BROKEN 0

node node_modules/vitest/vitest.mjs run src/data/interactionInventory.test.ts
  → 7 passed

Prior Sentinel pure engines (related platform health, earlier session)
  → lib/sentinel + src/services/sentinel 20 passed
```

Playwright interaction suite: **authored**; execute with stack running (`npm run test:e2e:interaction`).

---

## 11. How to re-run the repair loop

```bash
# 1. Static inventory (fail if BROKEN returns)
npm run interaction:scan
npm run interaction:test

# 2. Tool launch / route regressions
npm run test:tool-render-smoke

# 3. Runtime click harness (requires app + backend)
npm run dev:fullstack
npm run test:e2e:interaction

# 4. Optional a11y / canonical routes
npm run test:e2e:a11y
```

---

## 12. Conclusion

CareDroid now has a **repeatable interaction quality system**: classify every control, keep BROKEN at zero, exercise ED surfaces in Playwright, and document intentional unavailability with accessible reasons. Critical disconnected actions (alert export, ambient scribe copy-forward) are repaired with real outcomes—not placeholders. Remaining work is runtime CI expansion and product decisions on locked-feature messaging and order-entry enablement.
