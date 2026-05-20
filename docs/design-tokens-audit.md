# Design tokens audit

**Date:** 2026-05-19  
**Strategy:** Extend existing primitives in `index.css` and `theme-tokens.css`; centralize semantics in `design-tokens.css`.

---

## Summary

| Category | Tokens | Source |
|----------|--------|--------|
| Spacing | `--space-xs` … `--space-xl` (+ fluid variants) | `design-tokens.css` → `index.css` scale |
| Typography | `--text-heading`, `--text-body`, `--text-caption` | `clamp()` primitives + semantic aliases |
| Breakpoints | mobile / tablet / desktop / wide + phone QA widths | `design-tokens.css`, `designTokens.js` |
| Touch | `--touch-target-min` (44px), `--touch-target-comfortable` (48px) | `design-tokens.css` |

**Acceptance:** Responsive spacing, type, breakpoints, and touch targets are defined once and referenced from tool CSS; magic `44px` / duplicate `clamp()` blocks removed from high-traffic clinical surfaces.

---

## Token map

### Spacing

| Semantic | Maps to | Typical use |
|----------|---------|-------------|
| `xs` | `--space-2` (8px) | Tight gaps, chip padding |
| `sm` | `--space-3` (12px) | Field spacing, inline gaps |
| `md` | `--space-4` (16px) | Card gaps, default padding |
| `lg` | `--space-6` (24px) | Section spacing |
| `xl` | `--space-8` (48px) | Large section breaks |

Fluid: `--space-*-fluid` for viewport-aware layout (see `index.css` `--space-fluid-*`).

### Typography

| Semantic | CSS variable | Notes |
|----------|--------------|-------|
| heading | `--text-heading` | Panel titles, section headers |
| body | `--text-body` | Default UI copy |
| caption | `--text-caption` | Disclaimers, meta, compact callouts |

Utilities: `.type-heading`, `.type-body`, `.type-caption`.

Legacy aliases preserved: `--app-type-title`, `--app-type-heading`, etc.

### Breakpoints

| Tier | Range (px) | CSS reference |
|------|------------|---------------|
| mobile | 0–767 | `--bp-tier-mobile-max` |
| tablet | 768–1279 | `--bp-tier-tablet` |
| desktop | 1280–1919 | `--bp-tier-desktop` |
| wide | 1920+ | `--bp-tier-wide` |

Phone QA widths: 320, 360, 375, 390, 412, 430 (`--bp-phone-*`).

JS: `DESIGN_BREAKPOINTS`, `DESIGN_MEDIA_QUERIES` in `src/layout/designTokens.js`.

### Touch targets (accessibility)

- **Minimum:** `44×44px` — `--touch-target-min` (WCAG 2.5.5 Target Size)
- **Comfortable primary:** `48px` — `--touch-target-comfortable`
- **iOS input zoom guard:** `--text-input-min: 16px` on mobile form controls

Global enforcement: `responsive-ux.css` `@media (max-width: 640px)`.

---

## Load order

1. `index.css` — numeric primitives (`--space-1` … `--font-36`, fluid type)
2. **`design-tokens.css`** — semantic layer
3. `theme-tokens.css` — palette only
4. `layout-breakpoints.css`, `responsive-ux.css`, `layout-visibility.css`, `mobile-first-layout.css`

---

## Migrations (this pass)

| File | Change |
|------|--------|
| `Calculators.css` | `44px`/`48px` → touch tokens; page padding token |
| `ClinicalToolCatalog.css` | Touch tokens; title/page padding tokens |
| `ToolsOverview.css` | Touch tokens; display/heading type tokens |
| `ToolPageLayout.css` | Touch tokens; title/body type tokens |
| `LabInterpreter.css` | Comfortable touch token |
| `Sidebar.css` | Touch token for one hardcoded control |
| `responsive-ux.css` | Removed duplicate `:root` tokens; uses design tokens |
| `mobile-first-layout.css` | Breakpoint/shell vars moved to design tokens |

---

## Remaining hardcoded values (safe backlog)

Fleet pages, Auth, NotificationPreferences, and older analytics CSS may still use literal `px`. Replace opportunistically when touching those files; grep for `min-height: 44px` outside `design-tokens.css` to find stragglers.

---

## Verification

```bash
npm run test -- --run src/styles/designTokens.test.js src/styles/responsiveUx.test.js src/styles/mobileFirstLayout.test.js
npm run test:responsive-regression
```
