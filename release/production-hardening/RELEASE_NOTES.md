# Release notes — Clinical tool production hardening

**Release type:** Production hardening (no new clinical calculators)  
**Recommended deploy order:** Backend → Frontend  
**Database migrations:** None

---

## For clinicians and operators

### What improved

- **Tool catalog** is easier to search and correctly labels chat-assisted vs form-based calculators.
- **Chat launches** open with the right guided prompts (including PHQ-9 safety steps and dispatch human-approval framing).
- **Tool pages** show a clear decision-support disclaimer.
- **Drug, lab, and SOFA tools** that use the backend executor resolve reliably; legacy drug-checker IDs still work.

### What did not change

- CareDroid remains **decision support only** — not a diagnostic device or autonomous dispatch system.
- Only **three** server-side clinical executors exist: SOFA score, drug interactions, and lab interpretation.
- Dispatch AI and most calculators still run as **guided chat** or **in-browser forms**, not new backend automations.

---

## For engineering and support

### Highlights

| Capability | Detail |
|------------|--------|
| ID contract | Single source: `clinicalToolIdContract.js` |
| Launch | `resolveCatalogLaunch()` in `clinicalCatalogWiring.js` |
| Executors | `sofa-calculator`, `drug-interactions`, `lab-interpreter` |
| Errors | `ToolExecutionErrorCode` on failed tool POSTs |
| E2E matrix | `e2eToolValidationMatrix.js` — 38 registry tools documented |

### Breaking changes

**None** for supported registry tool IDs. Legacy alias `drug-interaction-checker` is explicitly supported via backend alias map.

### Deprecations

- Routing NLU phrases to phantom tool pages (removed from alias map; documented in discovery only).

---

## Verification after deploy

1. Open **Tools → Catalog** — search “PHQ-9”, “Wells PE”, “dispatch”.
2. Run drug interaction check with two medications.
3. Confirm invalid URL `/tools/not-real` shows tool-area fallback.
4. Optional: `npx vitest run src/data/e2eToolValidationMatrix.test.js` in staging CI.

---

## Support references

- Full PR narrative: `release/production-hardening/PR_BODY.md`
- Manual QA: `release/production-hardening/MANUAL_QA_CHECKLIST.md`
- Regression gates: `release/production-hardening/REGRESSION_CHECKLIST.md` (from `src/data/e2eRegressionChecklist.js`)

---

## Known issues / limitations

- Dispatch AI cannot be invoked via POST tool executor (by design).
- Hub-only scores (e.g. APACHE-II, CURB-65) require calculators hub + chat.
- AI-generated chat content still requires clinician review.
