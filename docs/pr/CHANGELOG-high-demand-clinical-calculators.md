# Changelog — High-demand clinical calculators and workflow tools

## [Unreleased]

### Added

#### Tier A — built-in calculator forms (PR8 batch + PR10)

- **HEART Score** (`heart-score`): `heartScoreCalculator.js`, PR8 UI, route `/tools/calculators/heart-score`
- **Centor / McIsaac** (`centor-mcisaac`): strep pharyngitis CDS, PR8 UI
- **Bishop Score** (`bishop-score`): `bishopScoreCalculator.js`, cervical readiness dimensions
- **Apgar Score** (`apgar-score`): `apgarScoreCalculator.js`, 1- and 5-minute dual assessment
- **Braden Scale** (`braden-scale`): `bradenScaleCalculator.js`, pressure-injury risk
- **Morse Fall Scale** (`morse-fall-scale`): `morseFallScaleCalculator.js`, inpatient fall risk
- **Ranson Criteria** (`ranson-criteria`): pancreatitis severity (educational/historical)
- **BISAP Score** (`bisap-score`): `bisapScoreCalculator.js`, acute pancreatitis stratification
- **FIB-4 Index** (`fib4`): `fib4Calculator.js`, hepatic fibrosis screening from labs
- **Framingham Risk** (`framingham-risk`): cardiovascular risk communication
- **ABCD² Score** (`abcd2`): `abcd2Calculator.js` + `abcd2Calculator.jsx`, route `/tools/calculators/abcd2`

#### Tier B — chat-assisted trauma hub (PR9)

- **PECARN Head Injury Rule** (`pecarn-head`): `chatAssistedCalculators/pecarnHead.js`, hub group `trauma`
- **NEXUS C-Spine Rule** (`nexus-cspine`): `chatAssistedCalculators/nexusCSpine.js`, hub group `trauma`
- Shared trauma hub disclaimer: imaging CDS only; unstable patients need urgent evaluation

#### Registry, catalog, and discovery

- `PR8_TIER_A_CALCULATOR_REGISTRY_IDS`, `PR9_TIER_B_CHAT_CALCULATOR_IDS`, `PR10_TIER_A_CALCULATOR_REGISTRY_IDS` in `clinicalToolIdContract.js`
- `toolRegistry.js` entries with sidebar paths and icons
- `clinicalIntentToolCatalog.js` profiles with STEP 0 `chatSeed`s
- `builtinUiCalculators` + `Calculators.jsx` switch cases for all Tier-A slugs
- `NLU_TO_REGISTRY_ID` expansions (e.g. `morse-fall` → `morse-fall-scale`, `bisap` → `bisap-score`, `apgar` → `apgar-score`, `fib-4` → `fib4`)
- `sourceCodeToolDiscovery.js` rows including `nexus-criteria`, `abcd2-score`, `tia-stroke-risk`
- `clinicalToolAliasSync.js` audited pairs for PR8/9/10
- `responsiveQaMatrix.js` paths for all Tier-A calculators including `abcd2`

#### Backend NLU

- `tool.patterns.ts` blocks for all new registry ids
- `tool-orchestrator.registry.ts` id registration (routing only; no new POST executors)
- Jest specs: `tool-patterns-heart-score`, `abcd2`, `pecarn-head`, `nexus-cspine`, `hospital-scales`, `fib4-bisap`, `obstetric-scales`

### Changed

- **Interpretation outputs:** `riskCategory` + human-readable `riskCategoryLabel` on scored tools
- **Copy tone:** Non-directive clinical language; institutional protocol deferral
- **Trauma hub:** PECARN and NEXUS grouped under `trauma` (not imaging-only subgroup)

### Safety & compliance copy

- Exported disclaimers per util module attached to UI results
- ABCD²: emergency stroke pathway language before scoring
- PECARN / NEXUS: STEP 0 stops for instability, GCS, neuro emergency
- Hospital scales: nursing screening-only framing
- FIB-4 / BISAP: lab-based CDS without treatment mandates

### Accessibility

- Fieldset/legend grouping; `aria-labelledby`, `aria-describedby`, `aria-live` on results
- Labeled calculate/reset buttons; Apgar minute-specific labels and validation messages
- Mobile QA matrix entries for responsive regression

### Tests

- `newClinicalToolsWiringAudit.test.js` — 142 cross-layer tests
- `newClinicalToolsAuditConstants.js` — audit spec source of truth
- `pr8BatchWiring.test.js` — ten PR8 Tier-A tools
- Per-tool: `heartScoreWiring`, `abcd2Wiring`, `hospitalScalesWiring`, `fib4BisapWiring`, `obstetricScalesWiring`, `pecarnHeadWiring`, `nexusCSpineWiring`
- Calculator unit tests for util modules listed above

### Fixed

- `responsiveQaMatrix`: missing `abcd2` path (blocked `buildResponsiveQaPages()`)
- Discovery: `nexus-criteria` alias row for `nexus-cspine`
- Audit spec: trauma hub `groupId` aligned to `trauma`

### Not changed

- Database schema
- Tier C `registerTool()` POST executors for these calculators (`backendExecutable: false`)
- Existing PR1–PR7 calculator routes and behavior

### Deferred

- Playwright E2E for live trauma chat flows and ABCD² stroke-gate UX
- Optional backend scoring APIs (server-side HEART/ABCD² computation)
- Localization of disclaimers and STEP 0 crisis language
- Dedicated Tier-A forms for PECARN/NEXUS (remain Tier B by design)
- Automated imaging order integration
