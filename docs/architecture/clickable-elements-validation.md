# Clickable Elements Validation

Date: 2026-06-13

## Shell Clickables

- Sidebar desktop links navigate to all active Emergency OS routes and use `aria-current="page"` for active state.
- Sidebar mobile links, Copilot button, More sheet, and More sheet close button are interactive. Copilot disables when the role cannot use Copilot.
- Header search button opens the existing command palette.
- Header capacity badge navigates to `/emergency/capacity` when route access allows it and disables otherwise.
- Header reassessment badge opens the reassessment drawer when attention count is present.
- Header alert button opens the alert drawer; alert drawer now has an explicit Close button.
- Header alert rows select the patient when a patient ID is available.
- Header workload control opens the staff workload panel for roles with workload reassignment permissions and disables otherwise.
- Command palette supports keyboard navigation, Escape close, outside-click close, patient selection, and all active Emergency OS route destinations.

## Page Clickables

- Whiteboard filter buttons update the visible patient set.
- Whiteboard Central Intake opens `QuickIntake` when the role can submit inputs and disables otherwise.
- Patient cards open the shared patient detail drawer. Timeline buttons select the same patient and expose the timeline inside the drawer.
- Patient detail drawer close button, tabs/toggles, calculators, staff/room assignment, escalation, discharge, notes, vitals, flags, and checklist controls either perform actions or disable by role.
- EMS Prepare Bay, Add to Whiteboard, and Handoff Complete buttons now expose explicit disabled titles when unavailable.
- Smart Intake step buttons, field decisions, candidate selection, and final workflow buttons are active or disabled by verification/role state.
- Referral New Referral/New Transfer buttons expose role-based disabled titles. Referral View disables when the patient record is unavailable.
- Referral form close, patient search results, form controls, save/send/request buttons, and status transition buttons are active or disabled by role/form requirements.
- Analytics chart cards are read-only; empty chart states are visible and not presented as clickable controls.
- Settings form controls, save buttons, demo seed controls, audit filters, and export action are active or disabled based on local data availability.

## Disabled And Coming-Soon Pattern

No active route intentionally renders dead clickable controls. Where permission, required form data, unavailable patient data, or backend state prevents action, controls are disabled and retain visible labels or titles.

## Remaining Manual Review

- Use a browser pass to test real pointer and keyboard behavior for modal stacking: command palette, QuickIntake, referral form, patient detail panel, reassessment drawer, and Copilot panel.
- Confirm screen-reader wording for disabled buttons in the active deployment role matrix.
