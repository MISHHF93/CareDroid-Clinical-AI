# Mobile And Tablet Validation

## Viewports

Target validation widths:

- 320px
- 375px
- 390px
- 414px
- 640px
- 768px
- 1024px

## Inspection Results

- Whiteboard: phone uses stacked mission sections, two-column stats at phone widths, one-column patient cards, and horizontally scrollable filters.
- Patient cards: cards now grow from `min-height` instead of fixed height; mission actions wrap for 390px and below.
- Drawers: Patient Detail, Copilot, Reassessment, and Quick Intake use visual viewport-safe heights and bottom-nav offsets where applicable.
- EMS/referrals: operational rows collapse into card-like vertical layouts on phones.
- Forms: Smart Intake and Settings fields collapse to single-column sections on small screens.
- Header/sidebar: mobile bottom navigation remains in place, safe-area padding is respected, and the header lookup shrinks at 390px and below.

## Manual QA Needed

- Use browser device mode or Playwright responsive QA to confirm no unintended `document.body.scrollWidth > viewportWidth` at 320, 375, 390, and 414.
- Exercise keyboard focus through filters, patient cards, drawer close buttons, Quick Intake, referral actions, and settings controls.
- Confirm pinch/zoom and browser text zoom do not hide labels or controls.
- Confirm mobile Safari visual viewport behavior when the keyboard opens in Quick Intake and Copilot input.
