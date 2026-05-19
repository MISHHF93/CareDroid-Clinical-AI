# Release notes — Production hardening (clinical tools)

**Release title:** Production hardening: tool routing, catalog wiring, NLU sync, and safety validation  
**Audience:** Engineering, clinical ops, QA, release managers  
**Compatibility:** Frontend + backend deploy together recommended; no database migration.

---

## What’s new

CareDroid’s clinical and fleet tools now share a **single wiring contract** from sidebar registry → catalog → routes → chat launch → backend executors. This release is infrastructure and safety focused: clearer navigation, reliable catalog launches, and audit-friendly tests—not new clinical scoring algorithms.

### For clinicians and operators

- **Full tool catalog** (`/tools/catalog`) with search, tier labels, and safer chat launches.
- **Clearer disclaimers** on catalog, lab interpreter, and SOFA calculator—decision support only, not diagnosis or autonomous orders.
- **Fleet tools** explicitly labeled as operational decision support; dispatch AI does not auto-assign vehicles or routes.

### For engineering and ops

- **35 registry tools** documented in an E2E validation matrix with automated drift detection.
- **NLU alias sync** tests keep chat routing aligned with backend intent patterns.
- **Three backend executors** only: SOFA score, drug interactions, lab interpreter—with structured errors for everything else.
- **CLI reports** for matrix, alias sync, and safety compliance before production promotion.

---

## Improvements

| Area | Benefit |
|------|---------|
| Routing | All calculator paths generated from one definition; unknown `/tools/*` paths show a helpful fallback page |
| Launch | Unknown or mistyped tool IDs get guarded chat seeds instead of empty launches |
| Catalog | Alias search, executor vs NLU-intent badges, decision-support banner |
| Safety | Automated checks for crisis copy, PE/ACS language, fleet human-approval, dosing boundaries |
| Backend | Executor catalog API, request contracts, audit trail on tool execution |

---

## Breaking changes

**None** for end users. API consumers should note:

- `GET /tools/catalog/executors` is **new** (authenticated).
- Unsupported POST tool ids return structured `UNSUPPORTED_TOOL` (not generic 500).

---

## Upgrade / deploy notes

1. Deploy backend and frontend (order flexible; no schema change).
2. Run smoke: `docs/e2e-manual-qa-checklist.md` (minimum: catalog, Tier C tools, fleet disclaimers).
3. Archive CI/report output: `npm run e2e-matrix:report`, `npm run alias-sync:report`, `npm run safety-compliance:report`.

---

## Known limitations

- Most tools are **chat- or form-only**; only three support POST execution.
- Phantom/roadmap tool IDs may appear in source scan but are not launchable.
- Full visual regression still requires manual or Playwright QA.

---

## Documentation

| Topic | Location |
|-------|----------|
| Tool inventory matrix | `docs/e2e-tool-validation-matrix.md` |
| Executor mapping | `docs/clinical-tool-executors.md` |
| Safety compliance | `docs/clinical-safety-compliance.md` |
| Manual QA | `docs/e2e-manual-qa-checklist.md` |
| Regression gates | `docs/e2e-regression-checklist.md` |
| PR detail | `docs/release/PRODUCTION_HARDENING_PR.md` |

---

## Support

For wiring drift after deploy, re-run:

```bash
npm run test:e2e-matrix
npm run test:alias-sync
npm run test:safety-compliance
```

Escalate clinical copy concerns to the safety checklist owners before hotfixing strings without clinical review.
