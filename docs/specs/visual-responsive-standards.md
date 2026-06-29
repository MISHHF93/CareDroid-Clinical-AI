# Visual Responsive Standards

CareDroid screens must remain readable, balanced, and non-crowded on phone, tablet, desktop, and wide command-center displays.

## Typography

- Body text should resolve to 15px minimum in app surfaces.
- Inputs should remain 16px or larger on mobile to avoid browser zoom.
- Headings use hierarchy, not viewport-width scaling.
- Text must wrap within its container; no critical label should require horizontal page scroll.

## Layout

- Pages use the shared AppShell and a max readable width.
- Page gutters increase from mobile to wide desktop.
- Repeated cards use responsive grids with `minmax(min(100%, ...), 1fr)`.
- Split layouts collapse to one column below tablet widths.

## Controls

- Touch targets are at least 44px high.
- Toolbars, filters, tabs, chips, and action rows wrap.
- Icon-only buttons should use familiar icons; text buttons must allow wrapping.

## Navigation

- Desktop navigation should be readable without truncating common labels.
- Tablet navigation may collapse to icons with tooltips.
- Mobile navigation uses a bottom bar with enough height for touch and labels.

## Help And Manual

- The Help/User Manual is a first-class route and navigation item.
- Manual content uses wider readable panels, larger body text, and responsive step layouts.

## Validation

- Run focused visual/responsive contract tests where available.
- Run `npm run typecheck:frontend`, `npm run lint`, and `npm run build` before shipping.
