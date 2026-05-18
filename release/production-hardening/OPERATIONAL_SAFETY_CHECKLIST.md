# Operational safety checklist — Fleet & dispatch release

**Purpose:** Verify fleet/dispatch tools do not imply autonomous vehicle control or live system modification.

---

## Fleet pages (Tier A)

- [ ] **Fleet Command** (`/fleet/command`): “Decision support only” visible; no auto-assign controls.
- [ ] **Route Optimizer**: Suggested stop order only; does not dispatch drivers or modify live routes.
- [ ] **Predictive Maintenance**: Inspection windows suggested; does not auto-schedule shop work.

---

## Dispatch intelligence (Tier B chat)

- [ ] `dispatch-ai` chat seed states **STEP 0 — no authority** to assign vehicles or change live ETAs.
- [ ] Recommendations labeled **options for human review** / dispatcher approval.
- [ ] Imminent harm / 911 scenarios prioritize escalation over chat completion.
- [ ] `resolveCatalogLaunch('dispatch-ai').orchestratorTool === null` (no POST executor).

---

## Backend / API

- [ ] POST `/tools/dispatch-ai/execute` (if attempted) returns `UNSUPPORTED_TOOL`, not silent success.
- [ ] Audit logs for unsupported tools include `status: unsupported` metadata.

---

## NLU & recommendations

- [ ] Fleet NLU profiles in `clinicalIntentTools` include human-approval guardrails after normalization.
- [ ] Cost-tracking / recommendation phantom fleet ids do not open nonexistent fleet executors.

---

## Operational sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Dispatch / fleet product owner | | | |
| Engineering on-call delegate | | | |

---

## Automated verification

```bash
npx vitest run src/data/dispatchAiWiring.test.js src/data/prFleetConsistency.test.js src/data/e2eToolValidationMatrix.test.js
```

- [ ] Fleet rows in E2E matrix: `fleet-A`, `fleet-B` tiers pass `runMatrixValidation()`.
