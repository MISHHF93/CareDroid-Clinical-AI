# Responsive QA matrix

Generated from `src/data/responsiveQaMatrix.js`. Total cells: **2392** (46 pages × 13 viewports × 4 browsers).

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
| 320x568 | 320×568 | Phone narrow (320) |
| 360x800 | 360×800 | Phone common (360) |
| 375x812 | 375×812 | Phone (375) |
| 390x844 | 390×844 | Phone tall (390) |
| 412x915 | 412×915 | Pixel 7 / 7 Pro (~412) |
| 430x932 | 430×932 | Phone large (430) |
| 480x960 | 480×960 | Phone extra large (480) |
| 600x960 | 600×960 | Small tablet / foldable (600) |
| 768x1024 | 768×1024 | Tablet portrait (768) |
| 1024x768 | 1024×768 | Tablet landscape (1024) |
| 1280x720 | 1280×720 | Desktop (1280) |
| 1440x900 | 1440×900 | Desktop (1440) |
| 1920x1080 | 1920×1080 | Desktop wide (1920) |

## Pages

| ID | Category | Path | Label |
| --- | --- | --- | --- |
| dashboard | core | `/dashboard` | Home / Dashboard |
| tools-overview | core | `/tools` | All Tools |
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
| tier-a-heart-score | tier-a | `/tools/calculators/heart-score` | Tier A: heart-score |
| tier-a-centor-mcisaac | tier-a | `/tools/calculators/centor-mcisaac` | Tier A: centor-mcisaac |
| tier-a-bishop-score | tier-a | `/tools/calculators/bishop-score` | Tier A: bishop-score |
| tier-a-apgar-score | tier-a | `/tools/calculators/apgar-score` | Tier A: apgar-score |
| tier-a-braden-scale | tier-a | `/tools/calculators/braden-scale` | Tier A: braden-scale |
| tier-a-morse-fall-scale | tier-a | `/tools/calculators/morse-fall-scale` | Tier A: morse-fall-scale |
| tier-a-ranson-criteria | tier-a | `/tools/calculators/ranson-criteria` | Tier A: ranson-criteria |
| tier-a-bisap-score | tier-a | `/tools/calculators/bisap-score` | Tier A: bisap-score |
| tier-a-fib4 | tier-a | `/tools/calculators/fib4` | Tier A: fib4 |
| tier-a-framingham-risk | tier-a | `/tools/calculators/framingham-risk` | Tier A: framingham-risk |
| tier-a-abcd2 | tier-a | `/tools/calculators/abcd2` | Tier A: abcd2 |
| tier-b-wells-pe | tier-b | `/tools/calculators` | Tier B launch: Wells PE |
| tier-b-perc | tier-b | `/tools/calculators` | Tier B launch: PERC |
| tier-b-grace-acs | tier-b | `/tools/calculators` | Tier B launch: GRACE ACS |
| tier-b-nihss | tier-b | `/tools/calculators` | Tier B launch: NIHSS |
| tier-b-canadian-c-spine | tier-b | `/tools/calculators` | Tier B launch: Canadian C-Spine |
| tier-b-ottawa-ankle | tier-b | `/tools/calculators` | Tier B launch: Ottawa Ankle |
| tier-b-copd-gold | tier-b | `/tools/calculators` | Tier B launch: COPD GOLD |
| tier-b-rome-iv-ibs | tier-b | `/tools/calculators` | Tier B launch: Rome IV IBS |
| tier-b-pecarn-head | tier-b | `/tools/calculators` | Tier B launch: PECARN head injury |
| tier-b-nexus-cspine | tier-b | `/tools/calculators` | Tier B launch: NEXUS C-Spine |
| tier-b-dispatch-ai | tier-b | `/tools/calculators` | Tier B launch: Dispatch Intelligence Assistant |
| fleet-command | fleet | `/fleet/command` | Fleet dashboard |
| fleet-route-optimizer | fleet | `/fleet/route-optimizer` | Route optimizer |
| fleet-predictive-maintenance | fleet | `/fleet/predictive-maintenance` | Predictive maintenance |

## Rules

- No horizontal scroll on `document` except inside designated data-table wrappers (`.catalog-table-wrap`, `.fleet-data-table-wrap`, `.logs-table-container`, `.tool-card-table-wrap`, `.cost-chart`).
- Small-screen failures are blocking.

