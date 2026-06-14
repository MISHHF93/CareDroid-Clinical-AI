# Responsive Report

Date: 2026-06-13

## Active Responsive Layer

The active responsive normalization layer is `src/styles/emergency-responsive.css`. It adapts the current AppShell, whiteboard, route pages, tables, cards, mission-control panels, command surfaces, and mobile navigation without replacing the shell or router.

## Supported Viewports

- Phone: bottom/mobile navigation, wrapped controls, full-width intake actions, horizontal filter scrolling.
- Tablet: compact whiteboard grids, drawer/panel behavior, wrapped mission cards.
- Laptop/desktop: sidebar plus header, operational metric strip, responsive whiteboard cards.
- Ultrawide/command center: wider card minimums and increased padding through breakpoint tokens.

## Motion

Motion tokens are centralized in `src/styles/theme-tokens.css`. Reduced motion collapses durations and lift distances through `prefers-reduced-motion`.

## Remaining Manual Review

Run Chromium visual QA on real device widths for header truncation, whiteboard density, referral form overflow, and command palette fit. No destructive layout changes were made in this pass.
