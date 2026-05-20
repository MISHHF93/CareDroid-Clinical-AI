# Responsive QA matrix

Generated from `src/data/responsiveQaMatrix.js`. Total cells: **1408** (32 pages × 11 viewports × 4 browsers).

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
| 320x568 | 320×568 | Android narrow (320) |
| 360x800 | 360×800 | Galaxy / common Android (360) |
| 384x854 | 384×854 | Android mid (384) |
| 390x844 | 390×844 | Android tall (390) |
| 412x915 | 412×915 | Pixel 7 / 7 Pro CSS viewport (~412) |
| 430x932 | 430×932 | Large phone Android (430) |
| 480x854 | 480×854 | Android phablet (480) |
| 600x960 | 600×960 | Small tablet / fold cover (600) |
| 768x1024 | 768×1024 | Tablet portrait (768) |
| 1024x768 | 1024×768 | Tablet landscape |
| 1280x720 | 1280×720 | HD laptop |

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

