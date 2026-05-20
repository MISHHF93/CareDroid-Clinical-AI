# Tool render / execute matrix

Generated from `src/data/toolRenderExecuteMatrix.js`. Validation: **PASS**.

| Tool | Tier | Mode | Smoke path | POST | Chat seed | Local only |
|------|------|------|------------|------|-----------|------------|
| `abcd2` | A | local-calculator | `/tools/calculators/abcd2` | — | — | yes |
| `abg-interpreter` | clinical-page | chat-page | `/tools/lab-interpreter` | — | — | — |
| `acls-protocol` | clinical-page | chat-page | `/tools/protocols` | — | — | — |
| `antibiotic-guide` | clinical-page | chat-page | `/tools/diagnosis` | — | — | — |
| `apache2-calculator` | other | other | `/tools/calculators` | — | — | — |
| `apgar-score` | A | local-calculator | `/tools/calculators/apgar-score` | — | — | yes |
| `ascvd-risk` | A | local-calculator | `/tools/calculators/ascvd-risk` | — | — | yes |
| `atls-protocol` | clinical-page | chat-page | `/tools/protocols` | — | — | — |
| `audit-c` | A | local-calculator | `/tools/calculators/audit-c` | — | — | yes |
| `bisap-score` | A | local-calculator | `/tools/calculators/bisap-score` | — | — | yes |
| `bishop-score` | A | local-calculator | `/tools/calculators/bishop-score` | — | — | yes |
| `braden-scale` | A | local-calculator | `/tools/calculators/braden-scale` | — | — | yes |
| `calc-bmi` | A | local-calculator | `/tools/calculator/bmi` | — | — | yes |
| `calc-chads2vasc` | A | local-calculator | `/tools/calculator/chads2vasc` | — | — | yes |
| `calc-gfr` | A | local-calculator | `/tools/calculator/gfr` | — | — | yes |
| `calculators` | hub | hub | `/tools/calculators` | — | — | — |
| `canadian-c-spine` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `centor-mcisaac` | A | local-calculator | `/tools/calculators/centor-mcisaac` | — | — | yes |
| `child-pugh` | A | local-calculator | `/tools/calculators/child-pugh` | — | — | yes |
| `ckd-staging` | A | local-calculator | `/tools/calculators/ckd-staging` | — | — | yes |
| `copd-gold` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `curb65-calculator` | other | other | `/tools/calculators` | — | — | — |
| `diagnosis` | clinical-page | chat-page | `/tools/diagnosis` | — | — | — |
| `dispatch-ai` | fleet-B | chat-hub | `/tools/calculators` | — | yes | — |
| `dose-calculator` | other | other | `/tools/calculators` | — | — | — |
| `drug-check` | C | post-executor | `/tools/drug-checker` | yes | — | — |
| `fib4` | A | local-calculator | `/tools/calculators/fib4` | — | — | yes |
| `fleet-command` | fleet-A | fleet-local | `/fleet/command` | — | — | yes |
| `framingham-risk` | A | local-calculator | `/tools/calculators/framingham-risk` | — | — | yes |
| `gad7` | A | local-calculator | `/tools/calculators/gad7` | — | — | yes |
| `gcs-calculator` | other | other | `/tools/calculators` | — | — | — |
| `grace-acs` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `has-bled` | A | local-calculator | `/tools/calculators/has-bled` | — | — | yes |
| `heart-score` | A | local-calculator | `/tools/calculators/heart-score` | — | — | yes |
| `lab-interp` | C | post-executor | `/tools/lab-interpreter` | yes | — | — |
| `meld` | A | local-calculator | `/tools/calculators/meld` | — | — | yes |
| `meld-na` | A | local-calculator | `/tools/calculators/meld-na` | — | — | yes |
| `morse-fall-scale` | A | local-calculator | `/tools/calculators/morse-fall-scale` | — | — | yes |
| `news2` | A | local-calculator | `/tools/calculators/news2` | — | — | yes |
| `nexus-cspine` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `nihss` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `ottawa-ankle` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `pecarn-head` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `perc` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `phq9` | A | local-calculator | `/tools/calculators/phq9` | — | — | yes |
| `predictive-maintenance` | fleet-A | fleet-local | `/fleet/predictive-maintenance` | — | — | yes |
| `procedures` | clinical-page | chat-page | `/tools/procedures` | — | — | — |
| `protocols` | clinical-page | chat-page | `/tools/protocols` | — | — | — |
| `qsofa` | A | local-calculator | `/tools/calculators/qsofa` | — | — | yes |
| `ranson-criteria` | A | local-calculator | `/tools/calculators/ranson-criteria` | — | — | yes |
| `rome-iv-ibs` | B | chat-hub | `/tools/calculators` | — | yes | — |
| `route-optimizer` | fleet-A | fleet-local | `/fleet/route-optimizer` | — | — | yes |
| `sofa-score` | C | post-executor | `/tools/calculator/sofa` | yes | — | — |
| `stop-bang` | A | local-calculator | `/tools/calculators/stop-bang` | — | — | yes |
| `timi-ua-nstemi` | A | local-calculator | `/tools/calculators/timi-ua-nstemi` | — | — | yes |
| `wells-dvt-calculator` | other | other | `/tools/calculators` | — | — | — |
| `wells-pe` | B | chat-hub | `/tools/calculators` | — | yes | — |

## Checklist columns

- **routeRenders**: Route renders
- **nonEmpty**: Page non-empty
- **tierAForm**: Tier A form inputs
- **tierAResult**: Tier A result after valid input
- **tierBChatSeed**: Tier B chatSeed
- **tierCExecutor**: Tier C backend executor
- **apiGraceful**: API succeeds or graceful fail
- **catalogLaunch**: Catalog launch works
- **sidebarVisible**: Sidebar entry if visible
- **deepLink**: Direct deep link works

## Registered POST executors

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`
