# Clickability Validation Report

Generated: 2026-06-12

Scope: Prompt 5. Active Emergency OS pages and shell controls only.

## Fixes Applied

| Surface | Issue | Fix |
| --- | --- | --- |
| Command palette | Base `Flag [patient]` command could close/fall through with no visible action when no patient was resolved. | Added inline status guidance and stopped fall-through when no patient is found. |
| AppShell reassessment badge | Badge was clickable at count `0`, but the drawer had no visible content. | Badge is disabled at zero and titled `No reassessments due`. |
| Patient card staff avatar | Locked roles saw a button that did nothing. | Staff avatar button is disabled for roles without staff assignment permission and has an explanatory title. |
| Queue Intelligence | `Clear Filter` clicked with no effect when no filter was active. | Button is disabled when there is no active queue filter. |
| Referral form | `Auto-fill summary` produced an empty summary without feedback when no patient was selected. | Button now shows a form error until a patient is selected. |
| Referral board | `InfoRequested` referral status could be created but was not grouped on the board. | Added `InfoRequested` to the referral status groups and label map. |

## Checked OK

No active no-op controls were found after fixes in:

- AppShell nav/header/search/command palette
- Emergency Whiteboard
- New Patient Intake
- Patient detail quick actions
- EMS Pipeline
- Smart Intake final actions
- Queue Intelligence
- Reassessment route/drawer
- Capacity and Boarding
- Clinical Calculator Hub
- Emergency Analytics
- Emergency Settings

## Validation

- `npm run lint` passed.
- Focused route and workflow tests passed after updating the referral test to follow the required summary workflow.
