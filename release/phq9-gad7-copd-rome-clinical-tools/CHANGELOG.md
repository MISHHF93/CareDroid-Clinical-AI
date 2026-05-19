# Changelog — PHQ-9, GAD-7, COPD GOLD, Rome IV IBS

## [Unreleased]

### Added

#### Tier A — built-in calculator forms

- **PHQ-9** (`phq9`): `phq9Calculator.js`, `Phq9Calculator` UI, route `/tools/calculators/phq9`
- **GAD-7** (`gad7`): `gad7Calculator.js`, `Gad7Calculator` UI, route `/tools/calculators/gad7`
- Likert selects (0–3), severity interpretation, item breakdown, references
- PHQ-9 Question 9 safety escalation (threshold ≥ 1): critical severity, multi-layer alerts
- GAD-7 severe-range and moderate-range escalation messaging

#### Tier B — chat-assisted hub tools

- **COPD GOLD** (`copd-gold`): `chatAssistedCalculators/copdGold.js`, hub group `pulmonary-copd`
- **Rome IV IBS** (`rome-iv-ibs`): `chatAssistedCalculators/romeIvIbs.js`, hub group `gastrointestinal`
- STEP 0 urgent/alarm gates in chat seeds; A/B/E grouping (COPD) and criteria walkthrough (Rome)

#### Registry & catalog wiring

- `toolRegistry.js` entries for all four tools
- `clinicalIntentToolCatalog.js` profiles with safety-first `chatSeed`s
- `builtinUiCalculators` entries for PHQ-9 and GAD-7 only
- `NLU_TO_REGISTRY_ID` / discovery aliases (PR5, PR6, PR7 constants)
- Medical catalog rows: `chatOnlyForm` for Tier B; dedicated paths for Tier A
- `resolveCatalogLaunch` / `resolveNavigationPathForLaunch` (Tier B → `/dashboard`)

#### Backend NLU

- `tool.patterns.ts` entries: `phq9`, `gad7`, `copd-gold`, `rome-iv-ibs`
- Disambiguation: `preferPhq9`, `preferGad7`, `preferCopdGold`, `preferRomeIvIbs`

#### Accessibility

- Form labels, validation summary, `aria-describedby` on disclaimers
- Invalid field styling; results `aria-live` and focus management
- `chatAssistedLaunchAriaLabelForTool` urgency context for all four ids
- GAD-7 moderate-warning CSS parity with severe warnings

### Tests

- `clinicalToolsComprehensive.test.js` — 176 deterministic tests (10-area matrix)
- `parseToolPatterns.test.js` — parser / keyword extraction
- `phq9Wiring.test.js`, `gad7Wiring.test.js`, `copdGoldWiring.test.js`, `romeIvIbsWiring.test.js`
- `pr5Consistency.test.js`, `pr5Coverage.test.js`, `pr5UxSafetyAccessibility.test.js`
- `pr6Consistency.test.js`, `pr7Consistency.test.js`
- `wiringAuditConsistency.test.js`, `mentalHealthToolsUxAccessibility.test.js`
- `testHelpers/clinicalToolsTestFixtures.js`
- `e2eToolValidationMatrix.js` updated for all four registry ids

### Safety & compliance copy

- Screening-only language; no diagnosis or medication/inhaler recommendations in UI and seeds
- 988 / 911 crisis framing on mental health forms
- COPD: no inhaler selection; Rome: alarm-feature priority over criteria chat

### Not changed

- Database schema
- Tier C backend executors for these tools (`backendExecutable: false`)
- Existing PR1–PR4 calculator routes and executors

### Deferred

- Playwright E2E for live Q9 alert and hub chat flows
- Optional backend scoring APIs for PHQ-9 / GAD-7
- Non–U.S. crisis resource localization
- Dedicated `/tools/calculators/copd-gold` or `rome-iv-ibs` forms (remain Tier B by design)
