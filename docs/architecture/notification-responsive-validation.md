# Notification Responsive Validation

## Desktop

- Header bell remains in the existing AppShell header topbar.
- Panel is aligned to the header, width-limited to `min(440px, calc(100vw - 24px))`.
- Panel uses a max height based on viewport height with internal list scrolling.
- No overlay is added, so primary Emergency OS workflows remain visible and reachable after closing the panel.
- z-index uses the existing popover token.

## Tablet

- At `max-width: 1024px`, panel width is constrained to the viewport and height is limited to `calc(100dvh - 104px)`.
- Header density and operational strip behavior are preserved.
- Touch targets inherit the existing mobile/touch media rules.

## Phone

- At `max-width: 768px`, the panel becomes a fixed bottom sheet with safe-area padding.
- At `max-width: 390px`, the panel expands to fullscreen, avoiding clipped dropdown behavior on narrow phones.
- Notification actions become a two-column grid, then a single-column grid on very narrow screens.
- Buttons use the existing `--touch-target-min` token.

## Ultrawide And Command Center

- At `min-width: 1920px`, the panel stays compact at `420px` wide and `min(580px, 58dvh)` max height.
- Header summary badges remain compact, including the existing central `ALR` count and the normalized unread notification badge.

## Overflow And Stacking

- Panel body uses internal scrolling with `overscroll-behavior: contain`.
- Panel shell has `overflow: hidden`; only the list scrolls.
- Badge positioning is adjusted on mobile to stay inside the 44px touch target.
- The panel uses existing z-index tokens: `--z-popover` on desktop/tablet and `--z-drawer` on phone.

## Theme Compatibility

- Surface, border, text, status, focus, radius, touch target, and z-index values are token-backed with existing CareDroid fallbacks.
- Severity styling uses status/info/warning/critical tokens rather than new random palette values.
