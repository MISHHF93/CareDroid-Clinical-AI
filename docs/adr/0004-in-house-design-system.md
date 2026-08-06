# ADR-0004: No third-party UI component library — in-house primitives

- **Status:** Accepted (implemented)
- **Date:** undated in source; inferred from current `package.json` dependencies and `src/components/primitives/`

## Context

Most React SPAs of this scope adopt a component library (MUI, Chakra, Radix/shadcn, Ant Design) to get accessible primitives, theming, and consistent interaction patterns without building them from scratch. CareDroid's `package.json` `dependencies` contain none of these — no MUI, Chakra, Radix, or shadcn.

## Decision

Build and maintain an in-house set of primitives (`src/components/primitives/`: `Text`, `Icon`, `Button`, `IconButton`, `Badge`, `Input`, `Textarea`, `Checkbox`, `Switch`, `Avatar`, `Spinner`, `Skeleton`, `Divider`) and layout components (`src/components/layout/`: `Stack`, `Grid`, `Cluster`, `Inline`, `Center`, `Spacer`, `SplitLayout`, `PageContainer` — an earlier `Box` component was removed as a dead barrel re-export in a later cleanup cycle), styled via Tailwind with CSS-custom-property-backed semantic tokens (`src/styles/design-system.css`, `src/config/theme.tokens.ts`) rather than a fixed color palette baked into `tailwind.config.ts`.

## Consequences

- **Full control over bundle size and interaction behavior** — no library-imposed defaults to fight, and `vite.config.ts`'s fine-grained manual chunk-splitting (by calculator specialty, vendor group) is easier to reason about without a large component-library bundle in the mix. A dedicated `bundleBudget.test.ts` enforces this discipline.
- **Higher maintenance cost for accessibility and edge-case interaction states** — a mature library like Radix ships years of accessibility hardening; an in-house primitive set has to earn that the hard way, one component at a time.
- **Theming is centralized but currently single-mode** — the CSS-variable approach makes a future dark mode technically straightforward to add, but as of this writing `THEME_CONFIG.standardTheme` is hardcoded to `'light'` and `setPreference()` is a no-op. This is a direct consequence of the in-house approach not yet including a second theme, not a limitation of the architecture itself.
- **New contributors need onboarding to the in-house primitive set** rather than being able to rely on familiarity with a well-known library's docs.

## Alternatives considered

- Adopting Radix/shadcn for accessible unstyled primitives plus Tailwind for styling — would have reduced initial build cost and improved accessibility baseline, at the cost of a dependency and less granular control over the exact bundle-splitting strategy already in place. Not pursued; the in-house approach was already established by the time of this research pass.
