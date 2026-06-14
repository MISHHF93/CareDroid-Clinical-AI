# Table Responsive Report

## Dense Views Reviewed

- Whiteboard list/table styles in `src/components/EmergencyWhiteboard.css`.
- EMS operational rows in `src/components/EMSPipeline.css`.
- Referral rows in `src/components/ReferralPanel.css`.
- Settings tables and audit table in `src/pages/emergency/EmergencySettings.css`.

## Fixes

- EMS rows collapse to a single-column card layout below 720px, with vitals in two columns and actions full-width.
- Referral rows collapse to one-column cards below 720px, with statuses, elapsed time, view actions, and workflow buttons aligned for touch.
- Settings audit table converts from a min-width table-like grid to stacked rows below 680px.
- Whiteboard active patient view uses responsive cards; older table styles keep intentional horizontal scrolling for dense desktop operations.

## Desktop Density Preserved

Desktop and command-center views keep operationally dense rows/grids. The responsive changes are scoped to tablet/phone breakpoints or utility classes that only affect active Emergency OS markup.

## Remaining Manual QA

- Confirm table semantics/read order for screen readers in the settings audit table after stacked visual presentation.
- Verify EMS/referral action order on 320px and 375px devices with realistic long unit names and department names.
