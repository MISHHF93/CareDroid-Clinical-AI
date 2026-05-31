# Navigation Mismatch Fix Report

## Root Cause

The authenticated app shell rendered two navigation systems in compact layouts:

- `Sidebar` stayed mounted as the canonical compact drawer.
- `AppShell` also rendered `app-shell-bottom-nav` whenever the viewport matched compact mode.

When the drawer/sidebar was visible, the bottom tab bar remained visible too, duplicating destinations like Tools, Ops, Profile, and Settings. `AppShell.css` also reserved bottom padding for the tab bar, leaving unnecessary bottom space even when the sidebar/drawer was the intended navigation surface.

## Components Changed

- `src/layout/AppShell.jsx`
  - Removed the compact bottom navigation render path.
  - Removed the unused bottom-nav click handler and mobile bottom-nav imports.
  - Kept `Sidebar` as the single authenticated navigation component.

- `src/layout/AppShell.css`
  - Removed `.app-shell-bottom-nav` styles and item styles.
  - Removed compact page-body padding reserved for `--app-bottom-nav-height`.
  - Kept top compact chrome spacing for the menu and command buttons.
  - Kept conversation pages free of bottom tab-bar padding.

- `src/components/QuickCommandLauncher.css`
  - Moved the mobile quick command panel to the safe-area bottom instead of positioning it above a removed bottom nav.

- `src/config/navigation.config.js`
  - Updated the module comment to reflect sidebar/drawer and quick command ownership.

- `src/data/segmentInventory.js`
  - Updated the mobile shell segment description to remove bottom nav ownership.

## Final Navigation Rules

- Desktop and wide tablet layouts use the fixed left `Sidebar`.
- Compact/tablet/mobile layouts use the same `Sidebar` as an off-canvas drawer.
- `BottomNav` / bottom tab bar is disabled in authenticated app shell layouts.
- `Sidebar` and bottom navigation are never visible at the same time.
- Tools, Ops, Profile, and Settings are exposed through one navigation surface at a time.

## Responsive Behavior

- Desktop: sidebar visible, main content inset by sidebar width, no bottom nav.
- Tablet/compact: sidebar is closed as a drawer by default, opened by the menu button, no bottom nav.
- Phone: drawer sidebar is the only primary navigation surface, no bottom nav.
- Main content keeps its vertical scrollport and no longer reserves phantom bottom-tab space.
- Quick Command on mobile anchors to the safe-area bottom and does not depend on bottom-nav height.

## Tests Added/Updated

- `src/layout/AppShell.navigation.test.jsx`
  - Desktop: sidebar visible, bottom nav hidden.
  - Tablet: drawer mode available, bottom nav hidden.
  - Mobile: one drawer navigation surface, no duplicate Tools/Ops/Profile/Settings buttons.
  - `/dashboard` shell content renders without a bottom tab bar when sidebar exists.

- `src/layout/AppShell.layout.test.js`
  - Static contract that `AppShell` uses sidebar/drawer as the only authenticated navigation system.

- `src/test/mobileScrolling.contract.test.js`
  - Removed the obsolete bottom-nav fit contract and asserts no bottom-nav CSS remains.

- `src/styles/compactUxFlattening.test.js`
  - Updated Quick Command expectations to use safe-area bottom positioning.

