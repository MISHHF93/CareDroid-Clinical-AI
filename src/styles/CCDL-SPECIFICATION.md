# CareDroid Clinical Design Language (CCDL)

## Design Philosophy

### Core Principles

1. **Clarity Over Decoration** — Every visual element serves an operational purpose. No decorative gradients, shadows, or colors that do not communicate meaning.

2. **Calm Authority** — White backgrounds with restrained neutral borders create a calm, trustworthy environment. Color is reserved for actionable clinical states: danger, warning, information, success.

3. **Progressive Disclosure** — Information hierarchy reveals detail on demand. Primary actions are prominent; secondary actions are accessible but quieter; tertiary actions are contextual.

4. **Cognitive Load Reduction** — Following Hick's Law (fewer choices = faster decisions), Fitts's Law (larger targets = faster access), and Miller's Law (chunked information = better retention).

5. **Operational Awareness** — Like aviation operations centers, every screen communicates system status at a glance. Color, position, and typography create an instant mental model of what needs attention.

6. **Accessibility by Default** — WCAG 2.2 AA compliance is not optional. Every token, component, and interaction meets contrast requirements, keyboard navigation, and screen reader compatibility.

## Color System

### Design Principles

- **Semantic, not decorative**: Colors communicate meaning (danger, warning, info, success)
- **Neutral backgrounds**: White (#ffffff) and light slate (#f8fafc) for surfaces
- **Restrained accents**: Sky blue (#0ea5e9) only for interactive/brand elements
- **Strong colors reserved for states**: Red for danger, amber for warning, green for success

### Primary Palette (Slate Neutrals)

| Token | Value | Purpose |
|-------|-------|---------|
| `--cd-palette-white` | `0 0% 100%` | Pure white surfaces |
| `--cd-palette-slate-50` | `210 40% 98%` | Subtle background |
| `--cd-palette-slate-100` | `210 40% 96%` | Sunken surfaces |
| `--cd-palette-slate-200` | `214 32% 91%` | Default borders |
| `--cd-palette-slate-300` | `213 27% 84%` | Strong borders |
| `--cd-palette-slate-400` | `215 20% 65%` | Muted text |
| `--cd-palette-slate-500` | `215 16% 47%` | Secondary text |
| `--cd-palette-slate-600` | `215 19% 35%` | Emphasized text |
| `--cd-palette-slate-700` | `215 25% 27%` | Dark text |
| `--cd-palette-slate-800` | `217 33% 17%` | Dark mode surfaces |
| `--cd-palette-slate-900` | `222 47% 11%` | Dark mode base |

### Brand Palette (Sky Blue)

| Token | Value | Purpose |
|-------|-------|---------|
| `--cd-palette-sky-50` | `199 100% 97%` | Brand subtle background |
| `--cd-palette-sky-100` | `199 100% 93%` | Brand light background |
| `--cd-palette-sky-200` | `198 98% 85%` | Brand border |
| `--cd-palette-sky-300` | `199 89% 74%` | Brand accent |
| `--cd-palette-sky-400` | `200 85% 62%` | Brand interactive |
| `--cd-palette-sky-500` | `200 98% 48%` | Brand primary |
| `--cd-palette-sky-600` | `201 96% 40%` | Brand hover |
| `--cd-palette-sky-700` | `201 90% 32%` | Brand active |
| `--cd-palette-sky-800` | `201 84% 24%` | Brand dark |
| `--cd-palette-sky-900` | `202 80% 16%` | Brand darker |

### Semantic Status Colors

| Status | Background | Text | Border | Purpose |
|--------|------------|------|--------|---------|
| **Danger** | `#fef2f2` | `#b91c1c` | `rgba(239,68,68,0.35)` | Critical alerts, errors |
| **Warning** | `#fffbeb` | `#b45309` | `rgba(245,158,11,0.42)` | Caution states |
| **Info** | `#eff6ff` | `#1d4ed8` | `rgba(59,130,246,0.35)` | Informational |
| **Success** | `#f0fdf4` | `#15803d` | `rgba(34,197,94,0.35)` | Completed, healthy |

### Clinical Priority Colors (Acuity)

| Priority | Color | Background | Border |
|----------|-------|------------|--------|
| P1 (Resuscitation) | `#dc2626` | `#fef2f2` | `rgba(220,38,38,0.35)` |
| P2 (Emergency) | `#ea580c` | `#fff7ed` | `rgba(234,88,12,0.35)` |
| P3 (Urgent) | `#d97706` | `#fffbeb` | `rgba(217,119,6,0.35)` |
| P4 (Semi-urgent) | `#0284c7` | `#f0f9ff` | `rgba(2,132,199,0.35)` |
| P5 (Non-urgent) | `#64748b` | `#f8fafc` | `rgba(100,116,139,0.35)` |

## Typography System

### Font Stack

```css
--cd-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--cd-font-mono: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
```

### Type Scale (4px grid)

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-text-2xs` | `10px` | Micro labels, badges |
| `--cd-text-xs` | `11px` | Small metadata |
| `--cd-text-sm` | `13px` | Helper text, captions |
| `--cd-text-md` | `15px` | Body text (base) |
| `--cd-text-lg` | `17px` | Subheadings |
| `--cd-text-xl` | `20px` | Section headings |
| `--cd-text-2xl` | `24px` | Page headings |
| `--cd-text-3xl` | `30px` | Hero headings |
| `--cd-text-4xl` | `36px` | Display headings |

### Font Weights

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-font-regular` | `400` | Body text |
| `--cd-font-medium` | `500` | Emphasized text |
| `--cd-font-semibold` | `600` | Headings, buttons |
| `--cd-font-bold` | `700` | Strong emphasis |

### Line Heights

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-leading-tight` | `1.2` | Headings |
| `--cd-leading-snug` | `1.3` | Short text |
| `--cd-leading-normal` | `1.5` | Body text |
| `--cd-leading-relaxed` | `1.6` | Long-form content |

## Spacing System

### 8-Point Grid

All spacing values are multiples of 4px (half-step) or 8px (full-step).

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-space-0` | `0` | No spacing |
| `--cd-space-0-5` | `2px` | Micro gaps |
| `--cd-space-1` | `4px` | Tight gaps |
| `--cd-space-1-5` | `6px` | Small gaps |
| `--cd-space-2` | `8px` | Default gaps |
| `--cd-space-2-5` | `10px` | Compact padding |
| `--cd-space-3` | `12px` | Standard padding |
| `--cd-space-3-5` | `14px` | Medium padding |
| `--cd-space-4` | `16px` | Standard gaps |
| `--cd-space-5` | `20px` | Section gaps |
| `--cd-space-6` | `24px` | Large gaps |
| `--cd-space-7` | `28px` | XL gaps |
| `--cd-space-8` | `32px` | XXL gaps |
| `--cd-space-10` | `40px` | 3XL gaps |
| `--cd-space-12` | `48px` | 4XL gaps |
| `--cd-space-14` | `56px` | 5XL gaps |
| `--cd-space-16` | `64px` | 6XL gaps |

### Fluid Spacing

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-space-fluid-sm` | `clamp(8px, 1.5vw, 12px)` | Small responsive gaps |
| `--cd-space-fluid-md` | `clamp(12px, 2vw, 20px)` | Medium responsive gaps |
| `--cd-space-fluid-lg` | `clamp(16px, 2.5vw, 28px)` | Large responsive gaps |
| `--cd-space-fluid-xl` | `clamp(24px, 3.5vw, 40px)` | XL responsive gaps |
| `--cd-space-fluid-2xl` | `clamp(32px, 5vw, 64px)` | XXL responsive gaps |

## Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-radius-none` | `0` | No radius |
| `--cd-radius-xs` | `2px` | Micro elements |
| `--cd-radius-sm` | `4px` | Small elements |
| `--cd-radius-md` | `6px` | Default elements |
| `--cd-radius-lg` | `8px` | Cards, panels |
| `--cd-radius-xl` | `12px` | Large cards |
| `--cd-radius-2xl` | `16px` | Modals, dialogs |
| `--cd-radius-3xl` | `24px` | Hero panels |
| `--cd-radius-full` | `9999px` | Circles |
| `--cd-radius-pill` | `999px` | Pill buttons |

## Shadows

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-shadow-none` | `none` | No shadow |
| `--cd-shadow-xs` | `0 1px 2px hsl(222 47% 11% / .05)` | Subtle elevation |
| `--cd-shadow-sm` | `0 1px 3px hsl(222 47% 11% / .07), 0 1px 2px hsl(222 47% 11% / .04)` | Default elevation |
| `--cd-shadow-md` | `0 4px 6px hsl(222 47% 11% / .06), 0 2px 4px hsl(222 47% 11% / .04)` | Hover elevation |
| `--cd-shadow-lg` | `0 10px 15px hsl(222 47% 11% / .08), 0 4px 6px hsl(222 47% 11% / .04)` | Dropdown elevation |
| `--cd-shadow-xl` | `0 20px 25px hsl(222 47% 11% / .10), 0 8px 10px hsl(222 47% 11% / .04)` | Modal elevation |
| `--cd-shadow-focus` | `0 0 0 3px hsl(200 98% 48% / .35)` | Focus ring |
| `--cd-shadow-focus-danger` | `0 0 0 3px hsl(0 72% 51% / .30)` | Danger focus ring |

## Motion

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-duration-instant` | `0ms` | Immediate |
| `--cd-duration-fast` | `80ms` | Hover states |
| `--cd-duration-normal` | `150ms` | Standard transitions |
| `--cd-duration-slow` | `250ms` | Complex animations |
| `--cd-duration-slower` | `400ms` | Page transitions |
| `--cd-ease-standard` | `cubic-bezier(.4, 0, .2, 1)` | Standard easing |
| `--cd-ease-decelerate` | `cubic-bezier(0, 0, .2, 1)` | Entering elements |
| `--cd-ease-accelerate` | `cubic-bezier(.4, 0, 1, 1)` | Exiting elements |
| `--cd-ease-spring` | `cubic-bezier(.34, 1.56, .64, 1)` | Bouncy effects |

## Z-Index Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-z-base` | `0` | Default |
| `--cd-z-raised` | `10` | Raised elements |
| `--cd-z-dropdown` | `100` | Dropdowns, popovers |
| `--cd-z-sticky` | `200` | Sticky headers |
| `--cd-z-overlay` | `300` | Backdrops |
| `--cd-z-modal` | `400` | Modals |
| `--cd-z-popover` | `500` | Popovers |
| `--cd-z-toast` | `600` | Toast notifications |
| `--cd-z-tooltip` | `700` | Tooltips |

## Component Sizing

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-touch-min` | `44px` | Minimum touch target |
| `--cd-touch-comfortable` | `48px` | Comfortable touch target |
| `--cd-control-height-xs` | `24px` | Small controls |
| `--cd-control-height-sm` | `32px` | Default controls |
| `--cd-control-height-md` | `40px` | Medium controls |
| `--cd-control-height-lg` | `48px` | Large controls |
| `--cd-control-px-sm` | `10px` | Small horizontal padding |
| `--cd-control-px-md` | `14px` | Medium horizontal padding |
| `--cd-control-px-lg` | `18px` | Large horizontal padding |
| `--cd-icon-xs` | `12px` | Small icons |
| `--cd-icon-sm` | `16px` | Default icons |
| `--cd-icon-md` | `20px` | Medium icons |
| `--cd-icon-lg` | `24px` | Large icons |
| `--cd-icon-xl` | `32px` | XL icons |

## Layout

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-layout-gutter` | `clamp(12px, 2.5vw, 24px)` | Responsive gutters |
| `--cd-layout-max-content` | `72rem (1152px)` | Content max-width |
| `--cd-layout-max-wide` | `88rem (1408px)` | Wide content max-width |
| `--cd-layout-sidebar-width` | `240px` | Sidebar width |
| `--cd-layout-topbar-height` | `56px` | Top bar height |

## Breakpoints

| Token | Value | Use Case |
|-------|-------|----------|
| `--cd-bp-sm` | `480px` | Mobile landscape |
| `--cd-bp-md` | `768px` | Tablet |
| `--cd-bp-lg` | `1024px` | Desktop |
| `--cd-bp-xl` | `1280px` | Large desktop |
| `--cd-bp-2xl` | `1536px` | Ultrawide |

## Responsive Container Widths

| Breakpoint | Max Width | Columns | Gutter |
|------------|-----------|---------|--------|
| < 768px | 100% | 1 | 16px |
| 768-1024px | 100% | 2 | 20px |
| 1024-1280px | 1152px | 3 | 24px |
| 1280-1536px | 1408px | 4 | 24px |
| > 1536px | 1408px | 4 | 24px |

## Accessibility Requirements

### WCAG 2.2 AA Compliance

- **Normal text contrast**: 4.5:1 minimum
- **Large text contrast**: 3:1 minimum (18px+ or 14px+ bold)
- **Non-text contrast**: 3:1 minimum (UI components, icons)
- **Focus indicators**: Visible focus ring on all interactive elements
- **Target size**: 44px minimum for touch targets

### Semantic Color Usage

- Color is never the only indicator of meaning
- Icons, text labels, or patterns accompany color
- Status indicators use both color and shape/text

### Keyboard Navigation

- All interactive elements are focusable
- Focus order follows logical reading order
- Focus indicators are visible and high-contrast
- Escape closes modals and returns focus

### Screen Reader Compatibility

- Semantic HTML landmarks (header, nav, main, aside)
- ARIA labels on interactive elements
- Live regions for dynamic content
- Heading hierarchy (h1-h6)

## Implementation Strategy

### Token Namespace

All tokens use the `--cd-*` prefix. Legacy tokens (`--app-*`, `--medical-*`, `--semantic-*`) are bridged via `design-system-bridge.css`.

### CSS Architecture

1. **Primitives** (`tokens.css`): Raw palette values
2. **Semantic** (`tokens.css`): Named tokens for backgrounds, text, borders
3. **Components** (component CSS): Use semantic tokens, not raw values
4. **Pages** (page CSS): Use component tokens, not raw values

### Migration Rules

1. Replace all raw hex colors with token references
2. Replace all raw pixel spacing with token references
3. Replace all raw border-radius with token references
4. Remove all `!important` declarations (use proper specificity)
5. Remove all inline styles (use CSS classes)
6. Ensure all components use semantic tokens
