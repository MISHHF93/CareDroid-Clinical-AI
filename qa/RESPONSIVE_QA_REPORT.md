# Responsive QA report

**Run:** 2026-05-19T15:57:56.072Z

## Summary

| Metric | Value |
| --- | --- |
| Matrix cells (expected) | 1116 |
| Executed tests | 1116 |
| Passed | 1107 |
| Failed | 9 |
| Skipped | 0 |
| Horizontal overflow failures | 0 |
| Layout (no page-level overflow) | **PASS** |
| Overall | **FAIL** |

### By browser

| Browser | Passed | Failed | Total | Status |
| --- | ---: | ---: | ---: | --- |
| Chrome | 278 | 1 | 279 | FAIL |
| Firefox | 276 | 3 | 279 | FAIL |
| Safari (WebKit) | 277 | 2 | 279 | FAIL |
| Edge | 276 | 3 | 279 | FAIL |

## Failures

### chromium — tier-a-ckd-staging @ 1024x768

```
[31mTest timeout of 120000ms exceeded.[39m
```

### firefox — tier-a-calc-bmi @ 1280x720

```
[31mTest timeout of 120000ms exceeded.[39m
```

### firefox — tier-a-ckd-staging @ 1024x768

```
[31mTest timeout of 120000ms exceeded.[39m
```

### firefox — tier-b-wells-pe @ 390x844

```
[31mTest timeout of 120000ms exceeded.[39m
```

### webkit — dashboard @ 320x568

```
[31mTest timeout of 120000ms exceeded.[39m
```

### webkit — tier-a-ckd-staging @ 1024x768

```
[31mTest timeout of 120000ms exceeded.[39m
```

### msedge — dashboard @ 320x568

```
[31mTest timeout of 90000ms exceeded.[39m
```

### msedge — tier-a-has-bled @ 414x896

```
[31mTest timeout of 90000ms exceeded.[39m
```

### msedge — tier-b-wells-pe @ 1280x720

```
[31mTest timeout of 90000ms exceeded.[39m
```

## Fixes applied

# Responsive QA — fixes applied

**Session:** 2026-05-19

## Harness

| Fix | File | Why |
| --- | --- | --- |
| Playwright `page.evaluate` single-arg payload | `e2e/responsive-qa.helpers.mjs` | Second argument broke overflow measurement for all cells |
| Allowlisted data-table scroll hosts | `e2e/responsive-qa.helpers.mjs` | Horizontal scroll only inside table/chart wrappers |
| Sequential browser runs + per-browser JSON | `scripts/run-responsive-qa.mjs` | Avoids Vite overload and cross-browser navigation timeouts |
| `waitForAppReady` waits for init + lazy `PageLoader` | `e2e/responsive-qa.helpers.mjs` | Stabilizes dashboard and calculator chunk loading |
| QA auth seed + API stubs in `beforeEach` | `e2e/responsive-qa.spec.mjs` | Prevents `/auth` redirects and hung `/api/tools` when backend is offline |
| Failure kind tagging (`overflow` vs `timeout`) | `scripts/run-responsive-qa.mjs` | Separates layout regressions from harness flakes in reports |
| QA workers default 2, test timeout 120s | `playwright.config.mjs` | Headroom for WebKit/Edge and heavy calculator routes |
| Vite bundle warmup in `beforeAll` | `e2e/responsive-qa.spec.mjs` | Avoids cold-start `goto` timeouts on dashboard |
| Dispatch assistant in matrix | `src/data/responsiveQaMatrix.js` | Covers `tier-b-dispatch-ai` on calculators hub |

## Layout / UX (validated by overflow checks)

| Area | Change |
| --- | --- |
| Fleet dashboards | Responsive `minmax` grids, `overflow-x: clip`, scrollable data tables |
| Clinical catalog | Stacked tables ≤640px, wrapping tool names and chips |
| Tier A calculators | Responsive grids, 44px touch targets, compact disclaimers on mobile |
| Admin analytics | Fluid titles and card grids |
| Global | `responsive-ux.css` typography, spacing, touch targets |


## Matrix reference

See [RESPONSIVE_QA_MATRIX.md](./RESPONSIVE_QA_MATRIX.md).
