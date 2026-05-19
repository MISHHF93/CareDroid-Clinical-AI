# Responsive QA matrix

Generated from `src/data/responsiveQaMatrix.js`. Total cells: **1152** (32 pages × 9 viewports × 4 browsers).

## Browsers

| ID | Label |
| --- | --- |
| chromium | Chrome |
| firefox | Firefox |
| webkit | Safari (WebKit) |
| msedge | Edge |

## Viewports

| ID | Size | Label |
| --- | --- | --- |
| 320x568 | 320×568 | iPhone SE |
| 375x667 | 375×667 | iPhone 8 |
| 390x844 | 390×844 | iPhone 14 |
| 414x896 | 414×896 | iPhone 11 Pro Max |
| 768x1024 | 768×1024 | iPad portrait |
| 1024x768 | 1024×768 | iPad landscape |
| 1280x720 | 1280×720 | HD laptop |
| 1440x900 | 1440×900 | MacBook Air |
| 1920x1080 | 1920×1080 | Full HD |

## Pages

| ID | Category | Path | Label |
| --- | --- | --- | --- |
| dashboard | core | `/dashboard` | Home / Dashboard |
| tools-catalog | core | `/tools/catalog` | Clinical tool catalog |
| calculators-hub | core | `/tools/calculators` | Calculators hub (Tier B launch surface) |
| tier-a-sofa-score | tier-a | `/tools/calculator/sofa` | Tier A: sofa-score |
| tier-a-calc-gfr | tier-a | `/tools/calculator/gfr` | Tier A: calc-gfr |
| tier-a-calc-bmi | tier-a | `/tools/calculator/bmi` | Tier A: calc-bmi |
| tier-a-calc-chads2vasc | tier-a | `/tools/calculator/chads2vasc` | Tier A: calc-chads2vasc |
| tier-a-qsofa | tier-a | `/tools/calculators/qsofa` | Tier A: qsofa |
| tier-a-news2 | tier-a | `/tools/calculators/news2` | Tier A: news2 |
| tier-a-child-pugh | tier-a | `/tools/calculators/child-pugh` | Tier A: child-pugh |
| tier-a-has-bled | tier-a | `/tools/calculators/has-bled` | Tier A: has-bled |
| tier-a-meld | tier-a | `/tools/calculators/meld` | Tier A: meld |
| tier-a-meld-na | tier-a | `/tools/calculators/meld-na` | Tier A: meld-na |
| tier-a-timi-ua-nstemi | tier-a | `/tools/calculators/timi-ua-nstemi` | Tier A: timi-ua-nstemi |
| tier-a-ascvd-risk | tier-a | `/tools/calculators/ascvd-risk` | Tier A: ascvd-risk |
| tier-a-ckd-staging | tier-a | `/tools/calculators/ckd-staging` | Tier A: ckd-staging |
| tier-a-stop-bang | tier-a | `/tools/calculators/stop-bang` | Tier A: stop-bang |
| tier-a-audit-c | tier-a | `/tools/calculators/audit-c` | Tier A: audit-c |
| tier-a-phq9 | tier-a | `/tools/calculators/phq9` | Tier A: phq9 |
| tier-a-gad7 | tier-a | `/tools/calculators/gad7` | Tier A: gad7 |
| tier-b-wells-pe | tier-b | `/tools/calculators` | Tier B launch: Wells PE |
| tier-b-perc | tier-b | `/tools/calculators` | Tier B launch: PERC |
| tier-b-grace-acs | tier-b | `/tools/calculators` | Tier B launch: GRACE ACS |
| tier-b-nihss | tier-b | `/tools/calculators` | Tier B launch: NIHSS |
| tier-b-canadian-c-spine | tier-b | `/tools/calculators` | Tier B launch: Canadian C-Spine |
| tier-b-ottawa-ankle | tier-b | `/tools/calculators` | Tier B launch: Ottawa Ankle |
| tier-b-copd-gold | tier-b | `/tools/calculators` | Tier B launch: COPD GOLD |
| tier-b-rome-iv-ibs | tier-b | `/tools/calculators` | Tier B launch: Rome IV IBS |
| tier-b-dispatch-ai | tier-b | `/tools/calculators` | Tier B launch: Dispatch Intelligence Assistant |
| fleet-command | fleet | `/fleet/command` | Fleet dashboard |
| fleet-route-optimizer | fleet | `/fleet/route-optimizer` | Route optimizer |
| fleet-predictive-maintenance | fleet | `/fleet/predictive-maintenance` | Predictive maintenance |

## Rules

- No horizontal scroll on `document` except inside designated data-table wrappers (`.catalog-table-wrap`, `.fleet-data-table-wrap`, `.logs-table-container`, `.tool-card-table-wrap`, `.cost-chart`).
- Small-screen failures are blocking.

