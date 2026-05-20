# Android device QA matrix

**Generated from:** `src/data/androidDeviceQaMatrix.js`

## Devices

| ID | Device | Portrait | Landscape |
| --- | --- | --- | --- |
| pixel-7 | Google Pixel 7 | 412×915 | 915×412 |
| pixel-7-pro | Google Pixel 7 Pro | 412×892 | 892×412 |
| samsung-galaxy-s | Samsung Galaxy S (S24 class) | 360×780 | 780×360 |
| samsung-galaxy-a | Samsung Galaxy A (A54 class) | 384×854 | 854×384 |
| oneplus | OnePlus (11 class) | 412×919 | 919×412 |
| motorola | Motorola Edge class | 393×873 | 873×393 |
| tablet | Android tablet (10" class) | 800×1280 | 1280×800 |

## Scenarios

| ID | Category | Description |
| --- | --- | --- |
| routes | routes | Routes render without overflow |
| calculators | calculators | Calculator forms + reset visible |
| catalog | catalog | Catalog search, chips, launch |
| sidebar | sidebar | Drawer open/close + backdrop |
| backend | backend | Stubbed API calls succeed |
| landscape | landscape | Landscape orientation layout |
| touch | touch | Touch targets ≥44px |

## Route pages (overflow grid)

| Page ID | Path |
| --- | --- |
| dashboard | `/dashboard` |
| tools-catalog | `/tools/catalog` |
| calculators-hub | `/tools/calculators` |
| tier-a-qsofa | `/tools/calculators/qsofa` |
| tier-a-has-bled | `/tools/calculators/has-bled` |
| tier-b-wells-pe | `/tools/calculators` |

**Overflow cells:** 84 (devices × portrait/landscape × routes)

**Interaction smoke:** Pixel 7, Galaxy A, Tablet — sidebar, catalog, calculators, backend, touch.

## Run

```bash
npm run qa:android
npm run test:e2e:android
```

## Registry spot-check

- HAS-BLED registry: `has-bled`
- Catalog: `/tools/catalog`

