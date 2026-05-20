# Android device QA report

**Date:** 2026-05-19

| Metric | Value |
| --- | ---: |
| Devices | 7 |
| Scenarios | 7 |
| Overflow cells | 98 |
| Interaction tests | 21 |
| First-run failures | 6 (timeouts + touch) |
| After fixes | Interaction smoke **pass** |

**Status:** PASS (with documented cold-start retries on first full matrix run)

## Coverage map

| Task | Automated check |
|------|-----------------|
| 1. Routes | 98 overflow cells (7 devices × 2 orientations × 7 routes) |
| 2. Calculators | HAS-BLED reset + 3 calculator paths on Pixel 7 |
| 3. Catalog | Search, category chip, launch button (Pixel 7, Galaxy A, tablet) |
| 4. Sidebar | Drawer open → backdrop close |
| 5. Backend | `GET /api/tools` on catalog mount (stubbed) |
| 6. Landscape | HAS-BLED overflow + reset on 3 devices |
| 7. Touch | Menu, search, chips ≥44px |

## Devices

See [ANDROID_QA_MATRIX.md](./ANDROID_QA_MATRIX.md).

## Artifacts

- [ANDROID_QA_MATRIX.md](./ANDROID_QA_MATRIX.md)
- [ANDROID_QA_FAILURES.json](./ANDROID_QA_FAILURES.json)
- [ANDROID_QA_FIXES.md](./ANDROID_QA_FIXES.md)
- `qa/playwright-android-report.json` (after `npm run qa:android`)

## Manual follow-up (real hardware)

Run Capacitor build on physical Pixel 7 / Galaxy / tablet for WebView-specific issues (keyboard, safe areas, back gesture). Automated suite uses Chromium device metrics + touch emulation.
