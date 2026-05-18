# Changelog — PR3 clinical calculators

## [Unreleased] — PR3

### Added

- **Tier-B chat-assisted tools** on calculators hub: `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`
- Chat configs: `graceAcs.js`, `nihss.js`, `canadianCSpine.js`, `ottawaAnkle.js` with STEP 0 emergency gates
- Client scoring utils: `graceAcsCalculator.js`, `nihssCalculator.js`, `canadianCSpineCalculator.js`, `ottawaAnkleCalculator.js`
- Hub groups: cardiac (GRACE), neurology (NIHSS), trauma (CCR + Ottawa)
- NLU profiles, `NLU_TO_REGISTRY_ID` aliases, and backend `tool.patterns.ts` entries with disambiguation helpers
- Discovery alias rows and catalog chat-only rows (`chatOnlyForm: true`, hub `pagePath`)
- Context-aware launch `aria-label`s for PR3 hub cards
- Vitest: `pr3Comprehensive.test.js`, `pr3RegistrationAudit.test.js`, `pr3Consistency.test.js`, `pr3Coverage.test.js`, `pr3UxSafetyAccessibility.test.js`, per-tool `*Wiring.test.js`, `pr3TestConstants.js`, `pr3TestFixtures.js`

### Safety & accessibility

- Clinical decision-support wording; no diagnostic certainty or treatment/dosing in seeds
- `ensureChatSeedGuardrails` profiles for ACS (`peAcs`) and trauma/stroke (`traumaStroke`)
- Keyboard-accessible hub cards; mobile touch targets; `prefers-reduced-motion` support

### Not changed

- Tier C executors (`sofa-calculator`, `drug-interactions`, `lab-interpreter`)
- Tier A calculator routes (PR1/PR2)
- Database schema or orchestrator `registerTool()` handlers

### Deferred

- Tier C executors for GRACE / NIHSS / CCR / Ottawa (see `TIER_ROADMAP.md`)
- Dedicated `/tools/calculators/{id}` forms (Tier A candidate backlog)
