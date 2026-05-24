# Theme Color System Revamp

## 1. Current Theme Issues

- Dark mode used navy/blue-green as large-area layout color instead of a true black/near-black app background.
- Light mode inherited blue-tinted panels and gradient treatments that made the app feel visually heavy.
- Some dashboard, chat, auth, tools, chart, fleet, and IoT styles used hardcoded medical-blue/green colors that could ignore theme changes.
- Recharts visuals needed token-aware chart colors, axis labels, grid lines, and tooltip surfaces.

## 2. New Token System

The normalized source of truth is `src/styles/theme-tokens.css`, bridged through `src/styles/theme-legacy-bridge.css`.

Core semantic tokens:

- `--app-bg`
- `--app-surface-0`
- `--app-surface-1`
- `--app-surface-2`
- `--app-surface-muted`
- `--app-surface-elevated`
- `--app-fg`
- `--app-fg-muted`
- `--app-panel-border`
- `--app-accent-interactive`
- `--app-accent-hover`
- `--app-success`
- `--app-warning`
- `--app-danger`
- `--app-info`
- `--app-focus`
- `--app-chart-1` through `--app-chart-6`

## 3. Light Mode Palette

- Root background: `#fbfbfc`
- Primary surface: `#ffffff`
- Muted surface: `#f4f6f8`
- Text: `#0f172a`
- Borders: neutral slate transparency
- Primary action accent: controlled clinical blue
- Success/warning/danger: semantic colors only for state and clinical emphasis

## 4. Dark Mode Palette

- Root background: `#050505`
- Primary surface: `#101114`
- Muted surface: `#17191d`
- Elevated surface: `#1d2026`
- Text: near-white
- Borders: low-luminance neutral gray
- Accent: cyan/blue/green only for interactive, chart, or semantic state accents

## 5. Accent Color Policy

- Blue/cyan is used for primary actions, selected states, links, chart series, and small UI highlights.
- Green is reserved for success/healthy signals.
- Yellow/orange is reserved for warnings.
- Red is reserved for danger/error/critical states.
- Large layout containers should use neutral surfaces, not accent backgrounds.

## 6. Blue Usage Policy

Medical blue is no longer a full-layout color. It should not appear as dominant page chrome, full-screen gradients, or large panels. Use `--app-accent-interactive` for action and focus affordances only.

## 7. Accessibility Considerations

- Focus rings now use `--app-focus`.
- Forms inherit tokenized input background, border, text, and placeholder colors.
- Chart axes, grid lines, tooltips, legends, and empty/error/loading states use semantic tokens.
- Warning/danger/success cards use color-mix overlays on neutral surfaces rather than saturated blocks.

## 8. OLED/Battery Considerations

- Dark mode root background is near-black (`#050505`).
- Large dark-mode surfaces use charcoal neutrals instead of bright saturated panels.
- Body mesh accents are subtle and low-luminance.
- Blue/cyan/green is constrained to smaller UI elements.

## 9. Files Changed

- `src/styles/theme-tokens.css`
- `src/styles/theme-legacy-bridge.css`
- `src/contexts/ThemeContext.jsx`
- `src/layout/AppShell.css`
- `src/layout/AuthShell.css`
- `src/components/Sidebar.css`
- `src/components/QuickCommandLauncher.css`
- `src/components/dashboard/DashboardVisualizations.jsx`
- `src/components/dashboard/DashboardVisualizations.css`
- `src/pages/Auth.css`
- `src/pages/Dashboard.css`
- `src/pages/CommandDashboard.css`
- `src/pages/MedicalIotDashboard.css`
- `src/pages/tools/ToolsOverview.css`
- `src/pages/fleet/fleetUxShared.css`

## 10. Tests Added

- `src/contexts/ThemeContext.test.jsx`
- `src/styles/themeColorSystem.test.js`

These verify global theme persistence, system default behavior, neutral root palettes, semantic aliases, chart theme tokens, and removal of legacy dominant medical-blue/green backgrounds from key layout surfaces.

## 11. Remaining Risks

- Some older feature pages may still contain localized hardcoded colors for badges, charts, or rare state panels. The legacy bridge still protects many of them, but future cleanup should migrate every touched page to `--app-*` tokens directly.
- Chart contrast should be visually reviewed with real browser rendering because SVG text and tooltip rendering can vary by browser.
- If design wants pure black instead of near-black, `--app-bg` can move from `#050505` to `#000000` without changing component CSS.
