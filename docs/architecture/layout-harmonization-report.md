# Layout Harmonization Report

Date: 2026-06-14

## Decision

The active Emergency OS remains inside the single `src/components/AppShell.tsx` route shell from `src/App.jsx`. This pass did not redesign the shell or add page shells.

## Active Layout Pattern

| Requirement | Result |
| --- | --- |
| One active AppShell | `src/App.jsx` wraps protected routes in one `RootLayout` with `AppShell` and `Outlet`. |
| Active pages inside AppShell | Whiteboard, Patients, EMS, Intake, Queues, Reassessment, Capacity, Boarding, Referrals, Copilot, Tools, Analytics, and Settings render under `RootLayout`. |
| No duplicate router | Canonical routes stay in `routes.config.js`; route aliases redirect into the same tree. |
| Consistent page headers | `AppShell.tsx` derives route title/subtitle for active Emergency OS pages. |
| Consistent card/grid/list patterns | Existing pages retain their established card/list CSS; Settings runtime status cards use the existing `emergency-settings__cards` pattern. |
| Modal/drawer consistency | Patient detail, Copilot, EMS broadcast, reassessment drawer, and command palette remain shell-hosted. |

## Harmonization Applied

- Settings now uses existing Settings section/card styles to render Integration Hub and Provincial Health runtime status.
- No nested dashboard or second shell was introduced for connector surfaces.
- Backend capability status now aligns with active route-level UI so reports and inventory reflect mounted pages.

## Responsive/Layout Observations

| Area | Current state | Action |
| --- | --- | --- |
| AppShell | Active shell already centralizes header/sidebar/content. | Preserved. |
| Sidebar | Pilot-visible navigation derives from unified navigation and uses existing mobile "more" sheet behavior. | Preserved. |
| Whiteboard/card visual QA | Existing screenshots are present under `qa/patient-card-visual-qa/`. | Left as evidence; no screenshot churn. |
| Settings sections | Existing section/card pattern supports added runtime status cards. | Reused for safe wiring. |
| Legacy dashboards | Many dashboard components exist outside the active Emergency OS route list. | Left in place and documented; no risky route/shell moves. |

## Known Layout Risks

- Full browser visual validation was not completed in this pass; command validation is pending.
- Existing CSS may still contain route-specific responsive debt. The pass avoided broad CSS rewrites to preserve visual QA artifacts and existing user edits.
- Horizontal overflow must be verified with screenshot or browser automation in a later focused QA pass.
