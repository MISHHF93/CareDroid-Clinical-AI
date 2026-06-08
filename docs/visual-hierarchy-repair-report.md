# Visual Hierarchy Repair Report

## Goal

Users should instantly understand:

1. Where am I?
2. What should I do?
3. What is important?
4. What is secondary?

## Audit Areas

- Typography
- Spacing
- Colors
- Card hierarchy
- Action hierarchy

## Findings

### Typography

- **Finding:** The shared display/title scale was compressed, which made page heroes and card headings feel too similar on desktop.
- **Impact:** Users had weaker cues for page identity versus supporting content.
- **Repair type:** Strengthen page typography.

### Spacing

- **Finding:** The command dashboard hero used nearly the same compact padding as secondary panels.
- **Impact:** The first screen felt like a wall of similarly weighted surfaces.
- **Repair type:** Increase primary surface spacing.

### Colors

- **Finding:** Accent color appeared across navigation context, status links, action cards, and chips with similar intensity.
- **Impact:** Interactive, current-location, and operational status states competed.
- **Repair type:** Reserve strongest treatment for current page identity and primary action.

### Card Hierarchy

- **Finding:** Late visual consistency normalizers flattened heroes, panels, cards, widgets, and action surfaces into the same background, radius, and shadow tier.
- **Impact:** Important dashboard and shell surfaces lost semantic priority.
- **Repair type:** Add explicit hierarchy exceptions for shell identity and command dashboard surfaces.

### Action Hierarchy

- **Finding:** Dashboard entry cards all used the same styling, while utility links had similar pill treatment to context chips.
- **Impact:** Users could not instantly tell which action to take first.
- **Repair type:** Promote one primary action and demote secondary access.

## Repairs

- Added persistent shell page identity in `src/layout/AppShell.jsx` so authenticated users can see the current page/section in both desktop and compact shells.
- Styled `.app-shell-route-identity` in `src/layout/AppShell.css` as location context instead of a competing control.
- Expanded the shared display/title scale in `src/index.css` to restore separation between page titles and card headings.
- Promoted the command dashboard hero in `src/pages/CommandDashboard.css` with stronger spacing, type, and elevation.
- Made the Assistant launch card the only primary dashboard action in `src/pages/CommandDashboard.jsx` and `src/pages/CommandDashboard.css`.
- Demoted secondary dashboard links with a divider and quieter placement.
- Added explicit hierarchy overrides in `src/styles/visual-consistency.css` so global visual normalizers preserve the shell/dashboard priority model.
- Added regression coverage in `src/layout/AppShell.navigation.test.jsx` and `src/pages/CommandDashboard.test.jsx`.

## Verification

Passed:

- `npm test -- AppShell.navigation.test.jsx CommandDashboard.test.jsx`
- `npm test -- designTokens.test.js responsiveUx.test.js visualConsistencySweep.test.js mobileFirstLayout.test.js`
