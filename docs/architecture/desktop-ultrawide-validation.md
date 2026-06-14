# Desktop Ultrawide Validation

## Viewports

Target validation widths:

- 1280px
- 1440px
- 1536px
- 1920px
- 2560px
- 3840px

## Expected Behavior

- Desktop: full operational density is preserved for whiteboard, EMS rows, referral rows, analytics cards, and settings sections.
- 1536px: mission-control sections use stable three-column layout when space allows.
- 1920px: whiteboard patient grid expands card minimums for readable density.
- 2560px: command-center padding increases without stretching cards beyond readable proportions.
- 3840px: base Emergency OS typography scales upward through clamp/media rules for command-center readability.

## Print

Print support is practical rather than exhaustive. The Emergency OS utility layer hides shell chrome, overlays, drawers, command palette, and copilot so the active content can print without fixed viewport shells.

## Manual QA Needed

- Confirm command-center displays show additional existing metrics through natural grid expansion rather than duplicated or newly invented widgets.
- Confirm charts in analytics remain readable and do not overlap at 1920px and 2560px.
- Confirm operating room/command displays can use browser zoom without clipped headers or cards.
