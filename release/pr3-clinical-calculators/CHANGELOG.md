# Changelog — PR3 clinical calculators

## [Unreleased] — PR3

### Added

- **Tier-B chat-assisted tools:** `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle` on calculators hub (`/tools/calculators`)
- Chat configs with STEP 0 emergency gates: `graceAcs.js`, `nihss.js`, `canadianCSpine.js`, `ottawaAnkle.js`
- Client scoring utils: `graceAcsCalculator.js`, `nihssCalculator.js`, `canadianCSpineCalculator.js`, `ottawaAnkleCalculator.js`
- Hub groups: cardiac (GRACE), neurology (NIHSS), trauma (CCR + Ottawa) via `chatAssistedHubGroups.js`
- NLU: `clinicalIntentToolCatalog` profiles, `NLU_TO_REGISTRY_ID`, backend `tool.patterns.ts` + disambiguation helpers
- Discovery alias rows; catalog chat-only rows (`chatOnlyForm: true`, `backendExecutor: false`)
- **`resolveNavigationPathForLaunch`** — Tier-B hub launches navigate to `/dashboard` for visible guided chat
- Context-aware PR3 launch `aria-label`s on hub cards

### Tests

- `pr3TenAreaCoverage.test.js` — canonical ten-area audit matrix
- `pr3Comprehensive.test.js`, `pr3Coverage.test.js`, `pr3Consistency.test.js`, `pr3RegistrationAudit.test.js`, `pr3LaunchAudit.test.js`
- `pr3UxSafetyAccessibility.test.js`; per-tool `*Wiring.test.js` (×4)
- `pr3TestConstants.js`, `testHelpers/pr3CoverageMatrix.js`, `testHelpers/pr3TestFixtures.js`
- `clinicalCatalogLaunch.test.js` — launch + navigation path contracts
- `e2eToolValidationMatrix.js` — PR3 ids mapped to PR3 test suites

### Safety & accessibility

- Clinical decision-support wording; no diagnostic certainty or treatment/dosing in seeds
- `ensureChatSeedGuardrails`: `peAcs` (GRACE), `traumaStroke` (NIHSS, CCR, Ottawa)
- Keyboard-accessible hub cards; 44–48px touch targets; `prefers-reduced-motion`; safe-area padding on mobile

### Not changed

- Tier C executors (`sofa-calculator`, `drug-interactions`, `lab-interpreter`)
- Tier A calculator routes (PR1/PR2)
- Database schema; no new `registerTool()` handlers

### Deferred

- Tier C executors for GRACE / NIHSS / CCR / Ottawa (`TIER_ROADMAP.md`)
- Dedicated `/tools/calculators/{id}` forms (Tier A backlog)
