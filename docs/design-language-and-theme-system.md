# CareDroid Design Language And Theme System

## 1. Current Issues

CareDroid already has a custom CSS-variable theme system, not Tailwind. Theme bootstrapping is split between `src/theme-init.js`, `src/contexts/ThemeContext.jsx`, `src/styles/theme-tokens.css`, `src/styles/design-tokens.css`, `src/styles/theme-legacy-bridge.css`, and `src/styles/theme-surfaces.css`.

The audit found these high-priority issues:

- Hardcoded colors remain in shared controls, badges, tool pages, calculators, catalog rows, maps, chat surfaces, and older operational pages.
- Hardcoded spacing and typography appear in inline styles and legacy CSS, especially tools, diagnosis pages, Settings, citations, and dense catalog views.
- Card styles vary between `.card`, page-specific panels, dashboard cards, tool cards, calculator cards, modals, drawers, and legacy `theme-surfaces.css` overrides.
- Button styles are split between global `.btn-*`, `components/ui/button.css`, auth CSS, tools CSS, and page-specific action buttons.
- Forms vary across `Input`, native inputs, calculator inputs, lab fields, select controls, and inline form sections.
- Badge/chip/status treatments are inconsistent, with category colors, severity colors, and catalog badges often using one-off hex values.
- Alert/warning styles use several independent palettes across clinical alerts, calculators, lab results, emergency banners, and cost alerts.
- Dark mode is broadly supported, but older hardcoded translucent white/neon green styles can produce mismatched contrast.
- Light mode is improved, but some areas still inherit dark-first treatments, gradients, or saturated accent panels.
- Blue/cyan/green are overused as layout decoration in older pages; they should be controlled accents.
- Some dense cards and tables have weak hierarchy, especially catalog/source audit, calculators, fleet details, and map overlays.
- Clickability is not always visible. Tool cards were clickable `div`s, and some actions relied on hover-only affordance.
- Boundaries vary. Some cards have heavy borders, some rely on shadows, and some legacy panels are normalized only by `theme-surfaces.css`.
- Text overflow risk remains in catalog rows, tables, map labels, calculator result cards, and long clinical tool names.

## 2. Design Principles

CareDroid should feel like an AI clinical command center: modern, calm, neutral, readable, and operationally precise.

Principles:

- Clarity over decoration.
- Clinical confidence.
- AI-first workflow.
- Low cognitive load.
- Visible state and feedback.
- Consistent surfaces.
- Responsive by default.
- No hidden interaction.

## 3. Token System

Author new UI with `--app-*` tokens. Legacy aliases such as `--panel-bg`, `--text-color`, `--primary-color`, and `--accent-green` remain only as compatibility bridges.

Core color tokens:

- `--app-background`
- `--app-surface`
- `--app-surface-raised`
- `--app-surface-muted`
- `--app-border`
- `--app-border-strong`
- `--app-text-primary`
- `--app-text-secondary`
- `--app-text-muted`
- `--app-accent-action`
- `--app-accent-hover`
- `--app-success`
- `--app-warning`
- `--app-danger`
- `--app-info`

Typography tokens:

- `--app-type-display`
- `--app-type-heading`
- `--app-type-subheading`
- `--app-type-body`
- `--app-type-small`
- `--app-type-caption`
- `--app-type-mono`

Spacing tokens:

- `--app-space-xs`
- `--app-space-sm`
- `--app-space-md`
- `--app-space-lg`
- `--app-space-xl`
- `--app-space-2xl`

Radius tokens:

- `--app-radius-sm`
- `--app-radius-md`
- `--app-radius-lg`
- `--app-radius-xl`
- `--app-radius-2xl`

Elevation tokens:

- `--app-elevation-none`
- `--app-elevation-subtle`
- `--app-elevation-card`
- `--app-elevation-overlay`

Status tokens:

- `--app-status-online`
- `--app-status-offline`
- `--app-status-degraded`
- `--app-status-demo`
- `--app-status-unsupported`
- `--app-status-critical`

## 4. Light Palette

Light mode should use a white or near-white background, neutral surfaces, dark text, subtle borders, and accent color only for action or emphasis.

Current direction:

- Background: `#fbfbfc`
- Primary surface: `#ffffff`
- Muted surface: `#f4f6f8`
- Text: `#0f172a`
- Borders: neutral slate transparency
- Primary action accent: controlled clinical blue
- State colors: green, amber, red, and info blue only for semantic status

## 5. Dark Palette

Dark mode should use black or near-black backgrounds, neutral charcoal surfaces, light text, muted borders, and small controlled accents. Avoid large blue backgrounds.

Current direction:

- Background: `#050505`
- Primary surface: `#101114`
- Muted surface: `#17191d`
- Raised surface: `#1d2026`
- Text: near-white
- Borders: low-luminance neutral gray
- Accent: cyan/blue/green only for actions, focus, charts, and state

## 6. Component Standards

Canonical primitives now exist or are defined as migration targets:

- AppShell: locked root, local page scroll, neutral chrome, visible current route.
- Sidebar: neutral rail, clear active state, 44px mobile targets, no inline color mutation.
- Header/PageHeader: one primary title, optional eyebrow, concise description, right-aligned actions.
- SectionHeader: small title plus optional description and action row.
- Card, MetricCard, ToolCard, CalculatorCard, DashboardPanel: neutral surface, subtle border, consistent radius, local text wrapping, explicit hover/focus if clickable.
- Button/IconButton: tokenized action, secondary, ghost, danger, and success variants with visible focus and disabled states.
- Input, Select, Checkbox, Toggle: 16px mobile input font, tokenized border/background, label association, error description.
- Badge: neutral by default; accent, success, warning, danger, info only for semantic meaning.
- Alert: neutral surface with semantic border/fill, visible role, optional action.
- EmptyState, LoadingState, ErrorState, UnsupportedState: compact, readable, action-oriented, no blank UI.
- ChatMessage, ChatInput, ContextPanel: AI-first layout, clear assistant/user distinction, visible context boundaries.
- Table: local horizontal scroll, sticky or clear header where practical, no body overflow.
- ChartContainer: tokenized axes, legend, tooltip, and responsive sizing.
- MapPanel: neutral container, local map overflow/resize, accessible controls.
- Drawer/Modal: tokenized overlay, panel, dividers, close controls, local scrolling.

## 7. Page Application Plan

Phase 1 applies to global tokens and shared primitives. This pass normalized token aliases, fixed missing font tokens, added semantic spacing/radius/elevation/status aliases, tokenized shared Button/Card/Input/Modal/Drawer/Spinner styles, and reduced hardcoded accent leakage in tools/calculators.

Next page priorities:

- Auth: keep `AuthShell` as the canonical unauthenticated surface; migrate remaining auth-specific buttons and messages to shared primitives.
- Main dashboard: standardize dashboard cards and panels around the Card/DashboardPanel contract.
- AI assistant/chat: replace legacy neon chat bubbles and inline loading styles with ChatMessage and ChatInput contracts.
- `/tools`: complete ToolCard migration and remove remaining inline styles in AI tool empty/loading states.
- `/tools/calculators`: continue migrating result cards, warning boxes, and form fields to calculator card/input contracts.
- Calculator detail pages: enforce local scroll, tokenized result state colors, and 16px mobile inputs.
- Developer Catalog / Source Audit: replace hardcoded category/status badge colors with Badge tones and local table scrolling.
- Fleet dashboards: align status colors to status tokens and keep dense tables locally scrollable.
- Medical IoT dashboards: keep tokenized panels and move device status chips to status tokens.
- Map pages: wrap maps in MapPanel, keep controls tappable, and avoid clipped marker labels at intermediate widths.
- Backend error/fallback pages: replace inline red/monospace fallback UI with tokenized ErrorState when React can render.

## 8. Accessibility Notes

Requirements:

- Color contrast must hold in both themes.
- Focus rings must use `--app-focus` or `--app-accent-action`.
- Keyboard users must be able to activate clickable cards.
- Touch targets should be at least 44px, with 48px for primary mobile controls.
- Disabled states must be visible and not only opacity-based where meaning matters.
- Inputs need labels or screen-reader labels plus error descriptions.
- Alerts should use `role="alert"` for urgent danger/warning and `role="status"` for passive info/success.
- Motion should respect `prefers-reduced-motion`.

## 9. Responsive Rules

Validate at 320px, 360px, 390px, 412px, 430px, 768px, 1024px, 1280px, and 1440px+.

Rules:

- No text outside cards.
- No horizontal body overflow.
- Cards wrap before they squeeze content.
- Tables scroll locally.
- Charts resize inside their containers.
- Maps resize or scroll locally without clipping controls.
- Buttons remain tappable.
- Forms stack on mobile.

## 10. Migration Phases

Phase 1: Theme tokens and global CSS variables.

Phase 2: Core components: Card, Button, Input, Badge, Alert, PageHeader.

Phase 3: App shell, sidebar, auth page, and `/tools`.

Phase 4: Calculators, dashboards, charts, maps, and AI chat.

Phase 5: Tests, documentation, visual QA, and removal of broad legacy overrides.

## 11. Test Plan

Automated coverage should include:

- Theme toggle persistence and DOM theme application.
- Major pages rendering in light mode.
- Major pages rendering in dark mode.
- No critical page crashes after theme switch.
- `/tools` cards using standardized tokenized structure and keyboard activation.
- Calculator forms using standardized card/input patterns.
- Auth page using canonical theme tokens.
- Dashboard panels using standard cards.
- Mobile layout smoke tests.
- No user-facing blank UI.

Recommended commands:

```powershell
npm run lint
npm run typecheck:frontend
npm run test:run -- src/contexts/ThemeContext.test.jsx src/styles/themeColorSystem.test.js src/styles/designTokens.test.js src/test/routePagesSmoke.test.jsx src/pages/tools/Calculators.formSmoke.test.jsx src/pages/CommandDashboard.test.jsx
npm run test:responsive-regression
npm run build
```

## 12. Remaining Risks

- `theme-surfaces.css` still uses broad compatibility normalization and should shrink as components migrate.
- Several AI tool pages still use inline styles for loading and empty states.
- Developer Catalog and Source Audit still have many hardcoded status/category colors.
- Lab interpreter, drug checker, clinical alerts, and emergency components still need full semantic status migration.
- Maps need browser-level visual QA because jsdom cannot catch marker clipping or intermediate-width overflow.
- Full visual acceptance still requires manual review across representative clinical data density.
