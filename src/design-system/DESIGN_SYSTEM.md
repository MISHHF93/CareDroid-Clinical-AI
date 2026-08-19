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
3. `src/components/layout/*` + `src/components/primitives/*` — a third,
   undocumented `--cd-space-*` token namespace, separate from CDL v2's
   `--cdl-*`.
   `src/components/surfaces/Card.tsx` (`.cd-card`) was originally catalogued
   here too as a "competing `Card` implementation," but a Repository
   Readiness Scorecard re-audit (2026-08-06) found it had **zero real
   importers anywhere** — not competing, just dead. Deleted. The actual
   compact-card primitive real components build on is a *different*,
   previously-undocumented file: `src/components/ui/card.tsx` (`.card`/
   `.card-compact`) — it backs `DashboardCard`, `MetricCard`, and
   `StatusWidget` in `CareDroidPrimitives.tsx`, and is directly imported by
   11 more production files (mostly `src/pages/profile/*` and
   `src/pages/{Settings,BillingPage,UsagePage}.tsx`). It's the
   most-reused card-shaped primitive in the app and was missing from this
   registry entirely until this correction.

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
  reconcile `ui/card.tsx`'s `.card`/`.card-compact` classes with `.cdl-card`),
  tracked as an open roadmap item below rather than silently left implicit.

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
| `PatientCard` | exists, real usage | `src/components/PatientCard.tsx` — 2 production call sites |
| `DashboardCard` | exists, **zero real production usage** | `src/components/ui/CareDroidPrimitives.tsx` — defined but not actually imported by any page/feature component today (only its own definition file) |
| `AIRecommendationCard` | exists, real usage | `src/components/ai/AIRecommendationCard.tsx` (aliased as `AIChiefRecommendationCard`) — 2 production call sites |
| `ActionCard` | exists, different name, **zero real production usage** | `ActionProposalCard` — `src/components/ai/ActionProposalCard.tsx` (test-only today) |
| `StatCard` | **deleted** (2026-08-19, confirmed zero real importers) | `src/pages/emergency/index.tsx` and `src/pages/emergency/pulse/index.tsx` each define their own unrelated local `StatCard`-shaped tile under the same name, which was never this component |
| `Card` (base) | **deleted, was fully dead** | `src/components/surfaces/Card.tsx` (`.cd-card`) had zero real importers — removed 2026-08-06. The real base primitive in active use is the previously-undocumented `src/components/ui/card.tsx` (`.card`/`.card-compact`), separate again from `cdl-v2/cards.css` (`.cdl-card`) — three names for card-shaped surfaces, not two |
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

1. **Reconcile the two remaining `Card` implementations** (`ui/card.tsx`
   `.card`/`.card-compact` vs. `cdl-v2/cards.css` `.cdl-card`) — the single
   biggest source of future drift if left alone. (`surfaces/Card.tsx`
   `.cd-card`, previously tracked here as a third competing implementation,
   was confirmed fully dead and deleted 2026-08-06 — it was never actually
   competing for real usage.)
2. **Migrate `src/components/layout/*` primitives off `--cd-space-*` onto
   `--cdl-space-*`** so there's one spacing namespace, not two.
3. Build `WorkflowCard` / `EvidenceCard` / `TimelineCard` / `ClinicianCard`
   when each gets a real call site (see `components/index.ts` header).
4. Theme modes beyond light/dark (high-contrast, high-density, executive,
   presentation, accessibility) — see `THEME_GUIDELINES.md`, none exist yet.
5. Persona UX-profile coverage beyond the 11 roles with live UI today — see
   `HUMAN_PROFILES.md`.
