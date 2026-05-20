# Mobile navigation audit (Android / compact shell)

**Date:** 2026-05-19  
**Breakpoint:** `max-width: 900px` (`COMPACT_MEDIA_QUERY`)

---

## Acceptance

**Sidebar never blocks calculator content** on phones and tablets: main column is full width; drawer is off-canvas until opened.

---

## Architecture

| Layer | Behavior |
|-------|----------|
| **CSS (≤900px)** | Sidebar `translate3d(-100%)`, `pointer-events: none`, `clip-path` when closed; main `margin-left: 0` even before React hydrates |
| **React** | `app-shell--compact`, `sidebar--open`, backdrop, `useDrawerFocus`, close on route change |
| **A11y** | `role="dialog"`, focus trap, `inert` + `aria-hidden` when closed, `aria-current="page"` on active nav |

---

## Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Sidebar width audited (280 / 70 desktop; drawer `min(280px, 88vw)`) | Pass — `design-tokens.css`, `breakpoints.js` |
| 2 | Mobile drawer (off-canvas) | Pass — `Sidebar.css` `@media (max-width: 900px)` |
| 3 | Drawer closes (backdrop, X, Escape, route change, menu toggle) | Pass — `AppShell.jsx`, `Sidebar.jsx` |
| 4 | Content shift (no inset on compact) | Pass — CSS fallback + `--app-main-inset: 0` |
| 5 | Sidebar scroll | Pass — `.sidebar-content` `overflow-y: auto` |
| 6 | Long labels wrap | Pass — `overflow-wrap: anywhere` on nav/tool labels |
| 7 | Active routes visible | Pass — `.active` + `scrollIntoView` when drawer opens |
| 8 | Focus trapping | Pass — `useDrawerFocus` + visible focusable filter |
| 9 | Keyboard accessibility | Pass — Tab cycle, Enter/Space on section toggles |
| 10 | No content under nav chrome | Pass — `padding-top: var(--app-compact-content-offset-top)` on `.app-shell-page-body` |

---

## Verification

```bash
npm run test -- --run src/components/Sidebar.responsive.test.js src/components/Sidebar.mobileRender.test.jsx src/layout/AppShell.layout.test.js
npm run test:responsive-regression
```
