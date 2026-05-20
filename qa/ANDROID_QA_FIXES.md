# Android QA — fixes applied

**Run:** 2026-05-19

## Summary

| Area | Issue | Fix |
|------|-------|-----|
| **Routes** | Cold-start timeouts when parallel workers hit Vite | Warm routes in `beforeAll`; stub slow `/api/*` calls |
| **Backend** | Proxy `ECONNREFUSED` delayed shell ready | `installAndroidQaNetworkStubs` + shared stubs in `responsive-qa.helpers.mjs` |
| **Touch** | Category chips 40px wide | `min-width` + `min-height: 44px` on `.catalog-category-chip` |
| **Touch** | Menu button 40×40 | `app-shell-menu-btn` uses `--touch-target-min` (44px) |
| **Landscape** | Touch test on hub without reset button | Landscape test targets HAS-BLED route |
| **Catalog** | (pass) | Search, chips, launch — stacked rows from `catalog-mobile.css` |
| **Sidebar** | (pass) | Drawer open/close cycle on Pixel 7, Galaxy A, tablet |

## Files changed

- `src/data/androidDeviceQaMatrix.js` — device profiles + scenario list
- `e2e/android-device-qa.spec.mjs` — Playwright matrix
- `e2e/android-device-qa.helpers.mjs` — stubs, sidebar, catalog, touch helpers
- `e2e/responsive-qa.helpers.mjs` — additional API stubs
- `playwright.android.config.mjs` — Chromium + `hasTouch`
- `src/pages/tools/ClinicalToolCatalog.css` — chip touch targets
- `src/styles/catalog-mobile.css` — chip min-width
- `src/layout/AppShell.css` — 44px menu control
- `scripts/run-android-device-qa.mjs` — report generator
- `package.json` — `qa:android`, `test:e2e:android`

## Re-verify

```bash
npm run test:e2e:android -- --grep "\[touch\]|\[sidebar\]|\[catalog\]"
npm run qa:android
```
