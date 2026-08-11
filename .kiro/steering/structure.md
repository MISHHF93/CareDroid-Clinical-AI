# Project Structure

## Organization Philosophy

**This structure accreted; it was not designed.** 1,069 of 1,130 commits landed in four months
under agent-assisted development, across three unreconciled product identities. `src/` has ~36
top-level directories, several of which are parallel implementations of the same concern.

The practical consequence for anyone adding code:

> **Find the live implementation before you write. Do not assume, and never add a third.**

The last four months of engineering were spent making the system's parts agree with each other
(79 HEAL ledger entries; 38 duplicate findings; 432 orphan findings). Adding a parallel anything
re-opens that work.

## The parallel-directory hazard

These pairs coexist. Neither name reliably indicates which is live — check imports at the callsite:

| Parallel set | File counts |
|---|---|
| `src/layout/` vs `src/layouts/` | 3 vs 5 |
| `src/routes/` vs `src/routing/` | 4 vs 22 |
| `src/app/` vs `src/shell/` | 14 vs 4 |
| `src/lib/` vs root `lib/` | 28 vs 130 |

Route path strings are additionally defined in **three competing places** (33 overlapping strings),
and there are **three competing workspace models**.

**Rule — parallel switches are this codebase's core pathology.** Before adding a config, a mode
gate, a route source, a workspace model, or a directory: search for the existing one and extend it.
This applies to test configs too (4 Vitest, 8 Playwright already).

## Directory Patterns

### Domain engines
**Location**: `src/engine/`
**Purpose**: Derived ED state — capacity, crowding, triage, patient journey, reassessment.
**Shape**: pure inner function + store-reading shell. Prefer the pure core (see `tech.md`).
**Example**: `capacityEngine.ts` → delegates to `lib/emergency-os/logic.ts`

### Pure domain logic
**Location**: `lib/` (root, 130 files)
**Purpose**: Framework-free logic — takes explicit inputs, returns values, reads no global state.
**Example**: `lib/emergency-os/logic.ts:calculateEmergencyOsCapacity(...)`

### State
**Location**: `src/store/`
**Purpose**: Zustand stores. `emergencyStore.ts` is 6,406 lines and is the ED system of record.
**Rule**: write **through** its existing actions; do not refactor its internals.

### Domain configuration
**Location**: `src/config/`
**Purpose**: Frozen config objects and models that encode product/domain rules, each with a
co-located test. **Example**: `caredroidProduct.config.ts`, `productionReadinessModel.ts`

### Fixtures / scenarios
**Location**: `src/data/`
**Purpose**: Seed and scenario state. `edScenarioFixtures.ts:buildSrcEmergencyScenarioState()` is
the parameterized seam for loading a cohort into the store.

### Simulation (new, greenfield)
**Location**: `src/sim/`
**Purpose**: DES kernel, policies, cohort loading, adapters. **Isolated by design** — it is the one
tree with no legacy, so keep it clean: internally consistent, no parallel constructs, no
`Math.random()`.

### Backend
**Location**: `backend/src/modules/` (71 modules)
**Purpose**: NestJS feature modules. Out of scope for simulation work.

## Naming Conventions

- **React components**: `PascalCase.tsx` — `AppShell.tsx`, `CapacityCrisisMode.tsx`
- **Everything else**: `camelCase.ts` — `capacityEngine.ts`, `emergencyStore.ts`
- **Config**: `<name>.config.ts` for frozen config objects; `<name>Model.ts` for derived models
- **Engines**: `<domain>Engine.ts`
- **Tests**: co-located, `<subject>.<facet>.test.ts` — add a facet, don't grow a file
- **Backend specs**: `<subject>.spec.ts` (NestJS convention)

## Import Organization

**Relative imports are the actual convention.** Path aliases are configured but effectively unused:

| Style | Occurrences in `src/` |
|---|---|
| `from '../…'` | ~4,467 |
| `from './…'` | ~3,421 |
| `from '@/…'` | 2 |
| `from '@lib…'` | 3 |
| `from '@store…'` | 0 |

```typescript
import { calculateEmergencyOsCapacity } from '../../lib/emergency-os/logic'  // dominant
import type { Patient } from '../types/emergency'
```

Do **not** launch an alias migration as a side effect of feature work — that is a 7,000-import
change. Match the surrounding file. Within a new isolated tree like `src/sim/`, relative-within-tree
is consistent and preferred.

The `../` count exceeding `./` reflects deep cross-directory reaching. New code should minimise it by
keeping a feature's files together rather than by adding aliases.

## Code Organization Principles

1. **Pure core, impure shell.** Business logic takes explicit inputs. Store and clock access lives
   in a thin wrapper. This is what makes the engines testable and simulatable.
2. **Additive over invasive.** Prefer a new isolated module that consumes existing seams over
   refactoring a large shared file — especially `emergencyStore.ts`.
3. **Reuse the seam.** Cohort injection, simulation-mode gating, and store mutation all have
   existing entry points. Use them.
4. **One behaviour per test file**, co-located, faceted name.
5. **No fabricated data.** The repo declines to invent terminology codes it has not licensed
   (`src/data/clinicalTerminology/terminologyProviders.ts`) and declines to state metrics no script
   produced. Preserve both refusals.

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
