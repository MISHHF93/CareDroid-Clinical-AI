# Production hardening — release package

Artifacts for PR **Production hardening: tool routing, catalog wiring, NLU sync, and safety validation**.

| Artifact | Use |
|----------|-----|
| [PRODUCTION_HARDENING_PR.md](./PRODUCTION_HARDENING_PR.md) | Full PR description (17 sections) — paste into GitHub PR body |
| [CHANGELOG.md](./CHANGELOG.md) | Changelog for reviewers and release tags |
| [RELEASE_NOTES.md](./RELEASE_NOTES.md) | User-facing / ops release notes |
| [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md) | Engineering review sign-off |
| [CLINICAL_SAFETY_CHECKLIST.md](./CLINICAL_SAFETY_CHECKLIST.md) | Clinical safety gate |
| [OPERATIONAL_SAFETY_CHECKLIST.md](./OPERATIONAL_SAFETY_CHECKLIST.md) | Fleet / dispatch safety gate |

**Supporting docs (repo root `docs/`):**

- `e2e-tool-validation-matrix.md` — tool inventory table
- `clinical-tool-executors.md` — POST executor mapping
- `clinical-safety-compliance.md` — guardrail automation
- `e2e-manual-qa-checklist.md` / `e2e-regression-checklist.md` — QA runbooks

**Pre-merge commands:**

```bash
npm run build
npm run test:e2e-matrix
npm run test:catalog-launch
npm run test:alias-sync
npm run test:executor-mapping
npm run test:safety-compliance
```

**Create PR (after commit & push):**

```bash
gh pr create --title "Production hardening: tool routing, catalog wiring, NLU sync, and safety validation" --body-file docs/release/PRODUCTION_HARDENING_PR.md
```
