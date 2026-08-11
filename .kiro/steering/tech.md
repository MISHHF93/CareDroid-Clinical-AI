# Technology Stack

## Architecture

Single repository, two independently-built trees:

- **Frontend** — React 18 SPA built by Vite, state in a large Zustand store. This is where the ED
  state model and the domain engines live, and therefore where simulation work lands.
- **Backend** — NestJS service (`backend/`, 71 modules, own `package.json` and `node_modules`).

They are **separate npm installs**. `npm ci` is required in the root *and* in `backend/`.

Domain logic follows a consistent shape worth preserving: **a pure inner function wrapped in a
store-reading shell.** `calculateCapacity()` takes no arguments and reads the global store, but
delegates to `calculateEmergencyOsCapacity(...)` in `lib/emergency-os/logic.ts`, which takes
explicit inputs and is pure. **Prefer the pure core; avoid the shell.** This is what makes the
engines testable and clock-injectable.

## Core Technologies

- **Language**: TypeScript 5.7
- **Runtime**: Node `>=20.19.0 <25`, npm `>=10`, ESM throughout (`"type": "module"`)
- **Frontend**: React 18.2 · Vite 7 · React Router 7 · Zustand 5 · Tailwind · Recharts · Zod 4
- **Backend**: NestJS

## Key Libraries

Only the ones that shape how code gets written:

- **Zustand** — single large `emergencyStore`. Mutate through its existing actions
  (`setPatients`, `addPatient`, `movePatientToState`); do not reach into internals.
- **Zod** — runtime validation at boundaries; pair with inferred TS types rather than hand-writing both.
- **Recharts** — charting; see the `dataviz` skill before adding any new chart.

## Development Standards

### Type Safety

`strict: true` — **but `noImplicitAny: false`**. Implicit `any` is tolerated by the compiler and is
common in older code. New code should still annotate; do not add implicit `any` deliberately, and do
not mass-fix existing ones as a side effect of unrelated work.

Path aliases (declared in **both** `vite.config.ts` and `tsconfig.frontend.json` — keep them in sync):

| Alias | Maps to |
|---|---|
| `@/*` | `./src/*` |
| `@lib/*` | `./lib/*` |
| `@store/*` | `./src/store/*` |

### Code Quality

ESLint 9 (flat config, `eslint.config.ts`) over `src`. Prettier 3, but note its script only covers
`{js,jsx,json,css}` — **`.ts`/`.tsx` are not auto-formatted**; match surrounding style by hand.

### Testing

- **Co-located** with the subject, never in a parallel test tree.
- **Faceted naming**: `<subject>.<facet>.test.ts` — e.g. `emergencyStore.workflowActions.test.ts`,
  `emergencyStore.kpiConsistency.characterization.test.ts`, `AppShell.receptionDensity.test.tsx`.
  One behaviour per file; add a new facet rather than growing an existing file.
- Vitest 4 (`jsdom`, globals on, setup `src/test/setup.ts`). ~976 frontend, ~208 backend specs.
- **4 Vitest configs and 8 Playwright configs** already exist. Reuse one; adding another compounds a
  known problem (see `structure.md` — parallel switches).

## Development Environment

### Required Tools

Node 20.19+, npm 10+. `node_modules` is **not currently installed in either tree** — `npm ci` at
root and in `backend/` is a prerequisite before any typecheck, test, or build.

### Common Commands

```bash
npm ci && (cd backend && npm ci)   # prerequisite — both trees

npm run dev                        # full stack (scripts/dev-stack.mjs)
npm run backend:dev                # backend only
npm run build                      # validate:assets + vite build

npm test                           # vitest (watch)
npm run test:integration           # vitest, integration config

npm run typecheck:frontend         # tsc --noEmit -p tsconfig.frontend.json
npm run lint                       # eslint src
npm run lint:all                   # frontend + backend
```

There is **no** root `typecheck` covering the backend — `typecheck:frontend` is frontend-only.

## Key Technical Decisions

### Determinism is a hard requirement

Nothing in the repo is currently reproducible — stochastic behaviour goes through bare
`Math.random()`, notably in `src/engine/simulation.ts`. **All stochastic draws in simulation code
must route through a seeded PRNG. No bare `Math.random()` in `src/sim/`.** Reproducibility is an
acceptance criterion, not a nicety: an unreproducible simulator cannot support interval estimates.

### Virtual clock, not wall clock

The engine math is largely clock-injectable already; **only the schedulers are not.**

- **Injectable, use as-is** — `runContinuousPatientFlowTick(now)`, `runEmergencyReassessment(now)`,
  `deriveCapacityCrisisState(input)`, `buildCrowdLevelSnapshot(input)`,
  `calculateEmergencyOsCapacity(...)` (pure), `suggestTriagePriority(input)` (pure),
  `journeyEngine`'s transition rules.
- **Avoid** — the no-arg store-reading wrappers (`calculateCapacity()`, `runCapacityIntelligence()`)
  and every `start*Engine()`, which are `setInterval`-based. Call the pure cores directly.

### Existing constructs to reuse, never duplicate

- A **simulation-mode gate** already exists (`isSimulationModeActive()`, `SimulationModeContext`).
- `src/engine/simulation.ts` is an unseeded wall-clock demo animator that writes to the same store on
  timers. **Stop it** via `stopEmergencySimulation()` before a run; do not extend it.
- Store hydration from `emergencyOsApi` will overwrite simulated state mid-run — gate it off.
- `addPatient(patient, { syncToBackend: false })` — always false in simulation paths.
- `backend/src/modules/simulation/` and `training/` are **stubs** returning hardcoded constants.
  They are the wrong layer for a DES; do not extend them.

---
_Document standards and patterns, not every dependency_
