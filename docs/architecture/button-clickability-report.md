# Button Clickability Report

Generated: 2026-06-12

## Scope
Audited active Emergency OS buttons, cards, tabs, drawer triggers, modal triggers, dropdown-like menus, command actions, and quick actions for missing handlers, stale destinations, and disconnected routes.

## Findings

| File path | UI element name | Source page/component | Intended destination/action | Current status | Fix applied | Remaining issue |
|---|---|---|---|---|---|---|
| `src/layout/AppShell.jsx` | Emergency nav rail items | `AppShell` | Navigate to active Emergency OS routes | working | None | None |
| `src/layout/AppShell.jsx` | Header capacity badge | `CapacityBadge` | Open capacity detail panel | working | None | None |
| `src/layout/AppShell.jsx` | Header reassessment badge | `ReassessmentBadge` | Open reassessment drawer | working | None | None |
| `src/layout/AppShell.jsx` | Header alert bell | `AlertDrawer` trigger | Open alert drawer | working | None | None |
| `src/layout/AppShell.jsx` | Staff avatar | `StaffAvatar` | Open workload panel | working | None | None |
| `src/layout/AppShell.jsx` | End Shift and Open Summary | `ShiftControls` | End current shift, then open handoff analytics | fixed | Calls `endShift()` before navigating to `/emergency/analytics?handoff=1` | None |
| `src/layout/AppShell.jsx` | Command palette calculator commands | `executeCommand` | Open calculator workflow with optional patient context | fixed | Routes `OPEN_CALCULATOR` to `/emergency/copilot?tool=...` | None |
| `src/layout/AppShell.jsx` | `ed:open-calculator` event | AppShell event listener | Open calculator workflow with optional patient context | fixed | Routes event to `/emergency/copilot?tool=...` | None |
| `src/layout/AppShell.jsx` | `ed:open-clinical-tools` event | AppShell event listener | Open Copilot clinical workflow hub | fixed | Routes event to `/emergency/copilot` | None |
| `src/components/PatientCard.jsx` | Run Score | Patient detail | Open patient-linked clinical tool workflow | fixed | Navigates to `/emergency/copilot?patientId=...&complaint=...` | None |
| `src/components/PatientCard.jsx` | Quick HEART/qSOFA/NIHSS buttons | Patient detail score launcher | Open inline score modal | working | None | Limited to three bedside score modals by design |
| `src/components/PatientCard.jsx` | Pediatric drug calculator | Patient detail pediatric action | Open pediatric dosing drawer/modal | working | None | None |
| `src/components/PatientCard.jsx` | New Order | Patient detail | Backend-gated order placement | intentionally disabled | None | Needs backend order endpoint before enabling |
| `src/components/PatientCard.jsx` | Staff assignment edit | Patient detail | Open staff selector when permitted | feature-flagged/permission-gated | None | Non-permitted role state remains manual review for clearer disabled affordance |
| `src/pages/emergency/SmartIntake.jsx` | Link to Existing Patient | Smart Intake final action | Record reviewed link action | fixed | Added click handler and selected-candidate gating | Backend persistence remains optional runtime risk |
| `src/pages/emergency/SmartIntake.jsx` | Create New Patient | Smart Intake final action | Record reviewed create action | fixed | Added click handler | Backend persistence remains optional runtime risk |
| `src/pages/emergency/SmartIntake.jsx` | Continue as Unknown Patient | Smart Intake final action | Record unknown-patient intake action | fixed | Added click handler | Backend persistence remains optional runtime risk |
| `src/pages/emergency/SmartIntake.jsx` | Send to Triage | Smart Intake final action | Record triage handoff action | fixed | Added click handler | Backend persistence remains optional runtime risk |
| `src/pages/emergency/SmartIntake.jsx` | Extracted field Edit | Smart Intake field review | Mark field as staff override | working | None | Label may need future inline edit modal if real editing is required |
| `src/components/EMSPipeline.jsx` | Diversion Status | EMS backend visibility | Display diversion state | fixed | Converted fake button to read-only status | None |
| `src/components/QueueIntelligencePanel.jsx` | Collapse button | Queue panel | Collapse/expand queue panel | fixed | Standalone route now owns collapsed state | None |
| `src/components/ReferralPanel.jsx` | Referral row View | Referral list | Select linked patient | needs manual review | None | Disable or explain rows whose patient no longer exists |
| `src/pages/settings/FeatureManagement.jsx` | Enable All Core | Settings feature actions | Inform that core features are always enabled | intentionally disabled/manual review | None | Consider rendering as status text |
| `src/pages/settings/FeatureManagement.jsx` | Reset to Defaults | Settings feature actions | Reset current tier overrides | working | None | Copy could be clearer |

## Summary
Safe broken/no-op controls were fixed. Remaining manual-review items are either permission/backend gated or need product decisions before changing behavior.
