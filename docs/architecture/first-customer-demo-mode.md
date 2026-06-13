# First Customer Demo Mode

First Customer Demo Mode is a deterministic local Emergency OS scenario for live sales and pilot walkthroughs. It represents a realistic 100-patient/day emergency clinic with a visible active census and no dependency on backend availability.

## How To Enable

Use either entry point:

- From the Emergency OS header, select `First Customer Demo Mode` from the scenario selector.
- From `Emergency OS Settings`, use `First Customer Demo Mode` > `Load Demo`.

The active shell store and richer Emergency OS store are both switched to the same scenario. This keeps the mounted whiteboard, API hook fallbacks, EMS pipeline, settings, analytics, and ED Copilot context aligned.

Use `Reset to Normal Day` in settings, or choose `Normal day` from the header selector, to return to the default scenario.

## What It Populates

The fixture is defined in `src/data/firstCustomerDemoMode.js` and registered through `src/data/edScenarioFixtures.js`.

It populates:

- Active whiteboard: 42 active patients across waiting, triage, assessment, orders, results, and admission.
- EMS inbound patients: 5 active EMS arrivals, including critical/high-acuity inbound and arrived handoff cases.
- Waiting queue: at least 16 waiting patients with long-wait pressure.
- High-risk waiting patients: at least 5 P1/P2 or high-risk flagged waiting patients.
- Reassessments due: at least 8 due reassessments for the reassessment route, drawer, and Copilot context.
- Capacity score: red/orange capacity pressure driven by room occupancy, boarders, reassessments, and EMS pressure.
- Boarders: at least 6 admission/pending-admission patients.
- Analytics KPIs: a 100-patient daily volume, hourly arrival curve, wait trend, top complaints, and operational KPIs.
- ED Copilot context: patient count, high-risk count, EMS inbound count, reassessment count, boarder count, capacity band/score, top risks, and a demo-data safety boundary.

## Validation Commands

Focused checks:

```bash
npm run test:run -- src/data/edScenarioFixtures.test.js store/emergencyStore.test.ts
```

Broader requested checks:

```bash
npm run typecheck:frontend
npm run lint
npm run build
```

## Boundaries

This mode is local fixture data only. It must not be treated as live clinical, operational, EHR, EMS, provincial, or analytics truth.

The implementation intentionally keeps the current split between the active `src/store/emergencyStore.ts` whiteboard store and the richer root `store/emergencyStore.ts`. It registers the same scenario in both rather than migrating stores globally.
