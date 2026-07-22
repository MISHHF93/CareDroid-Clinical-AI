# CareDroid Enterprise Design System (CEDS)

**Status as of Cycle 148 (2026-07-22). This is a living document — update it in the
same commit as any change to tokens, themes, or the component registry below.**

## Why this package looks the way it does

Before writing this package, an investigation found the repo already had **three
overlapping token/component systems**:

1. `src/styles/design-system.css` + `src/layout/designTokens.ts` — the older,
   still-loaded system (~70 CSS files under `src/styles/`), self-described as
   "the single canonical stylesheet entry" but explicitly being retired.
2. `src/styles/cdl-v2/` ("CDL v2" — Clinical Design Language) — the newer,
   actively-developed, dual-theme (light/dark), contract-tested system. ~30
   commits of investment: token scale, AA-verified light/dark color pairs,
   card contracts, badge/pill tone system, composition rules.
3. `src/components/layout/*` + `src/components/primitives/*` +
   `src/components/surfaces/Card.tsx` — a third, undocumented `--cd-space-*`
   token namespace, with its **own competing `Card` implementation**
   (`.cd-card`) separate from CDL v2's `.cdl-card`.

Building a brand-new `/design-system` token set from scratch, as first
requested, would have created a **fourth** parallel system — the opposite of
"one cohesive enterprise design language." Instead:

- **`src/styles/cdl-v2/*.css` is the single source of truth for token
  values.** This package (`src/design-system/tokens/*.ts`) is a **typed
  mirror**, not a second definition — `cdlTokenMirror.contract.test.ts` fails
  the build if the two drift apart.
- **`src/design-system/components/index.ts` re-exports the real, already-
  shipped components** under the requested CEDS names instead of duplicating
  them.
- The `src/components/layout/*` (`--cd-*`) vs. `cdl-v2` (`--cdl-*`) split is a
  **known, real gap** — not addressed by this package. It needs its own
  migration cycle (retire `--cd-*`, move `layout/*` primitives onto `--cdl-*`,
  merge `surfaces/Card.tsx` into `.cdl-card`), tracked as an open roadmap item
  below rather than silently left implicit.

## Token layer (`tokens/`)

| Module | Mirrors | Notes |
|---|---|---|
| `spacing.ts` | `tokens.css` `--cdl-space-*` (4px grid) | Also defines `CDL_CARD_DIMENSIONS` — see below |
| `typography.ts` | `tokens.css` `--cdl-text-*`/`--cdl-font-*` | |
| `radius.ts` | `tokens.css` `--cdl-radius-*` | |
| `elevations.ts` | `tokens.css` `--cdl-elev-*` | Values differ light vs. dark — use `cdlElevationVar()`, never a literal shadow string |
| `motion.ts` | `tokens.css` `--cdl-duration-*`/easing | |
| `colors.ts` | `theme.css` semantic tone roles | **Exports var-name references, not hex** — a hardcoded hex would be wrong in one of the two themes |
| `icons.ts` | `src/navigation/iconRegistry.ts` + `icon.css` sizes | Re-exports the existing registry; does not define a second icon set |

Import the barrel: `import { CDL_SPACING_PX, cdlColorVar, ... } from 'src/design-system/tokens/design-tokens'`.

### Primary workflow card contract (new this cycle)

The requested card-dimension standard (320–400px width, ≥220px height,
16–24px padding, 12–16px radius) **did not exist anywhere in the repo**
before this cycle. Added as real tokens in `tokens.css`
(`--cdl-card-min-width` etc.) plus an opt-in `.cdl-card--workflow` modifier
in `cards.css` — opt-in so it doesn't silently resize the dozens of existing
`.cdl-card` surfaces already shipped and visually verified. New card-shaped
UI should add `cdl-card--workflow` alongside `.cdl-card`; existing cards
migrate on their own schedule, not as a side effect of this cycle.

## Component registry (`components/index.ts`)

| Requested name | Status | Real implementation |
|---|---|---|
| `PatientCard` | exists | `src/components/PatientCard.tsx` |
| `DashboardCard` | exists | `src/components/ui/CareDroidPrimitives.tsx` |
| `AIRecommendationCard` | exists | `src/components/ai/AIRecommendationCard.tsx` (aliased as `AIChiefRecommendationCard`) |
| `ActionCard` | exists, different name | `ActionProposalCard` — `src/components/ai/ActionProposalCard.tsx` |
| `StatCard` | exists | `src/components/data-display/StatCard.tsx` |
| `Card` (base) | exists, **duplicated** | `src/components/surfaces/Card.tsx` (`.cd-card`) **and** `cdl-v2/cards.css` (`.cdl-card`) — unify before adding more card variants |
| `AlertCard` | **deleted** (Cycle 146, confirmed zero importers) | use `src/alarm/{AlarmBanner,AlarmKpi,AlarmRail}` — the real, live equivalent |
| `ClinicianCard` | **does not exist** | no live call site yet — see roadmap |
| `WorkflowCard` | **does not exist** | only `acknowledgeWorkflowCard`/`dismissWorkflowCard` functions exist (`InteractiveAIWorkspace.tsx`), no component |
| `EvidenceCard` | **does not exist** | `CitationCard` (closest prior art) was deleted as dead code, Cycle 146 |
| `TimelineCard` | **does not exist** | no live call site yet — see roadmap |

**The 4 missing components are intentionally not stubbed.** This repo has
twice had to delete an entire speculative component scaffold
(`src/domain/*`, `src/features/*Feature.tsx`) that was built ahead of real
usage and never wired to a route. Build each of the 4 when a real screen
needs it, using `.cdl-card--workflow` + `tokens/design-tokens.ts` as the
shape contract, not before.

## Roadmap (open, prioritized)

1. **Unify the two `Card` implementations** (`surfaces/Card.tsx` `.cd-card`
   vs. `cdl-v2/cards.css` `.cdl-card`) — the single biggest source of future
   drift if left alone.
2. **Migrate `src/components/layout/*` primitives off `--cd-space-*` onto
   `--cdl-space-*`** so there's one spacing namespace, not two.
3. Build `WorkflowCard` / `EvidenceCard` / `TimelineCard` / `ClinicianCard`
   when each gets a real call site (see `components/index.ts` header).
4. Theme modes beyond light/dark (high-contrast, high-density, executive,
   presentation, accessibility) — see `THEME_GUIDELINES.md`, none exist yet.
5. Persona UX-profile coverage beyond the 11 roles with live UI today — see
   `HUMAN_PROFILES.md`.
