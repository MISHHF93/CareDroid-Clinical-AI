# Accessibility Report

Target: WCAG AA

Status after fixes: 100/100 shared accessibility audit checks passing

## Scope

Validated the authenticated application shell and shared UI foundations that affect every route:

- Keyboard navigation: skip links, drawer keyboard handling, Escape close behavior, focus restoration, and programmatic main focus.
- Screen readers: landmarks, navigation labels, icon-only buttons, status indicators, and non-text controls.
- Contrast: theme foreground, contrast, and focus tokens for light and dark themes.
- Focus indicators: visible keyboard focus rings for global controls and sidebar navigation.
- Tab order: no positive tab index values in audited shared sources; route content follows DOM order.
- Touch targets: 44px minimum shared target size for primary controls, sidebar navigation, and form controls.

## Findings Fixed

- Added a visible-on-focus `Skip to main content` link before authenticated navigation and made `main#main-content` programmatically focusable with `tabIndex={-1}`.
- Added explicit accessible names for collapsed sidebar navigation items, new chat, advanced navigation, notifications, and sign out controls so icon-only states do not rely on `title`.
- Added a screen-reader status label to the sidebar health indicator.
- Strengthened global `:focus-visible` treatment to use a 3px high-contrast outline plus offset and focus shadow.
- Added AA focus ring tokens for dark and light themes.
- Raised sidebar touch targets from compact 38px/28px controls to the shared 44px minimum.
- Added a global `.sr-only` utility and touch-action baseline for shared interactive controls.

## WCAG AA Coverage

- 2.1.1 Keyboard: shared navigation controls remain keyboard operable.
- 2.1.2 No Keyboard Trap: compact drawer keeps Escape close and focus restoration.
- 2.4.1 Bypass Blocks: authenticated shell now exposes a skip link to main content.
- 2.4.3 Focus Order: shared sources avoid positive tab index values.
- 2.4.7 Focus Visible: global and sidebar focus indicators are visible and non-color-only.
- 1.3.1 Info and Relationships: landmarks, navigation groups, and status indicators expose semantic labels.
- 1.4.3 Contrast Minimum: foreground and contrast tokens are documented in the audit model.
- 1.4.11 Non-text Contrast: focus rings and interactive borders use contrast-aware tokens.
- 2.5.5 Target Size: shared primary controls and sidebar controls use the 44px minimum target token.

## Automated Checks

Added `src/data/accessibilityAudit.js` and `src/data/accessibilityAudit.test.js` to validate keyboard navigation, screen-reader labels, contrast tokens, focus indicators, tab-order risk, and touch target floors. Updated `src/layout/AppShell.layout.test.js` to lock the skip link and main focus target behavior.

## Residual Risk

This pass covers shared shell and cross-route foundations. Individual feature pages can still introduce page-specific issues such as low-contrast custom badges, unlabeled chart controls, or unusual focus order; those should be covered by route-level checks as each page evolves.
