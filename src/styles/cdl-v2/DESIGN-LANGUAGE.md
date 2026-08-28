# CareDroid Clinical Design Language 2.1

CareDroid should feel like a calm clinical command surface: decisive under pressure,
quiet when the department is stable, and explicit when human attention is required.

## Product signature

- **The sidebar follows the theme, not a fixed brand color**: white in light mode,
  black in dark mode (`--cdl-sidebar-bg`). A fixed navy sidebar was tried first but
  measured almost no brightness gap against a dark canvas (~3pp vs an 85pp gap in
  light mode), so "structural chrome" barely read as separate from the rest of the
  shell in dark theme. Every sidebar ink/state token (`--cdl-shell-sidebar-*`) flips
  with it — see `cdl-v2/refresh.css`.
- **Clinical teal** identifies interaction, progress, and the active workspace.
- **White working surfaces** keep forms, patient context, and dense operational data
  legible.
- **Soft blue-grey canvas** separates the application frame from working panels
  without adding decorative boxes.
- **Semantic colors are reserved** for clinical or operational meaning: red for
  critical, orange for urgent, amber for warning, green for complete/healthy, blue
  for information, and violet for AI assistance.

## Experience principles

1. **Calm command** — hierarchy should be obvious before color is noticed.
2. **One screen, one decision** — the current route and primary action lead; secondary
   controls recede.
3. **Signal has a budget** — saturated colors, animation, and elevation appear only
   where they explain state or affordance.
4. **Human authority stays visible** — AI surfaces use the AI tone and state their
   review boundary; they never impersonate a clinical decision.
5. **Density follows the task** — touch targets remain safe while operational tables
   and rails use compact internal rhythm.
6. **Status is redundant** — text/icon/shape accompanies color.

## Foundation

The source of truth is `src/styles/cdl-v2/`.

| Role              | Token family                              | Contract                                  |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| Canvas and panels | `--cdl-surface-*`                         | Page, card, muted, inset, elevated        |
| Type              | `--cdl-font-*`, `--cdl-text-*`            | System-first sans; mono only for IDs/time |
| Rhythm            | `--cdl-space-*`                           | Four-pixel base grid                      |
| Shape             | `--cdl-radius-*`                          | 10px controls, 14px panels, full pills    |
| Depth             | `--cdl-elev-*`                            | Levels 0–4 only                           |
| Interaction       | `--cdl-brand-*`                           | Teal action and active state              |
| Clinical state    | `--cdl-critical/urgent/warning/info/ok-*` | Paired foreground, background, border     |
| AI                | `--cdl-ai-*`                              | Distinct violet family                    |
| Operations        | `--cdl-ops-*`                             | Live operational state                    |

`compat.css` translates legacy namespaces while migration continues. New component
CSS must consume `--cdl-*` directly. `refresh.css` is the current visible authority
for the shared shell and primitives and is intentionally imported after the app graph.

## Layout anatomy

1. **Sidebar (252px / 64px collapsed)** — product identity, grouped navigation,
   utilities. Background follows the theme (white/black); stays stable across routes.
2. **Utility bar (60px)** — live status, operational search, primary create action,
   theme/operations/account controls.
3. **Route identity band (72px)** — breadcrumb, route title, concise description,
   and up to three route actions.
4. **Canvas** — blue-grey page surface with white leaf panels. Pages own content
   composition; the shell owns scrolling.
5. **Context rails** — optional compact status rows below route identity. They should
   never compete with the route title.

On phone widths the sidebar becomes a bottom navigation bar, the search control owns
the utility bar, and route descriptions may clamp to two lines.

## Typography

- Display and UI: `--cdl-font-sans`.
- Identifiers, timers, MRNs, and tabular technical values: `--cdl-font-mono`.
- Page title: 24–34px, bold, tight tracking.
- Section title: 18–21px, semibold.
- Body: 15px with 1.5 line height.
- Metadata: 12–13px; 10–11px is limited to uppercase micro-labels and badges.
- Inputs render at 16px on mobile to avoid browser zoom.

## Component grammar

- **Buttons:** one primary action per decision zone. Primary uses solid teal; secondary
  uses a white surface; ghost is text-led. Destructive actions never use brand color.
- **Inputs:** 44px default height, visible label, 10px radius, one teal focus ring.
- **Cards:** leaf surfaces only, 14px radius, one border, level-1 depth. Nested cards
  flatten into muted zones.
- **Pills:** status or compact filters only. Form actions do not become pills.
- **Tables:** quiet header band, hairline rows, tabular numbers, sticky headers where
  local scrolling exists.
- **Alarms:** use `src/alarm/` components and `data-severity`; never invent a new red
  banner.
- **AI:** violet tone plus provenance/review language; teal remains ordinary product
  interaction.

## Accessibility and verification

- WCAG 2.2 AA contrast.
- 44px minimum touch targets on mobile and safety-critical actions.
- Visible `:focus-visible` state on every interactive element.
- Reduced-motion paths must preserve meaning.
- Keyboard order follows visual order; overlays return focus.
- Verify the login screen, shell, `/dev/design-system`, reception, whiteboard, and one
  data-heavy route at desktop, tablet, and phone widths before shipping a visual wave.

## Migration rule

Do not add another visual namespace or global normalization layer. Extend the existing
CDL token/component contract, migrate the consuming component, and remove the legacy
exception once it has no callers.
