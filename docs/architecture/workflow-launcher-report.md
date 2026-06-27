# Workflow Launcher Report

Generated: 2026-06-12

## Scope
Audited active Emergency OS workflow launchers across command palette, patient cards, EMS, intake, queue, reassessment, capacity, referrals, Copilot, analytics, and settings.

## Launcher Status

| File path | UI element name | Source page/component | Intended destination/action | Current status | Fix applied | Remaining issue |
|---|---|---|---|---|---|---|
| `src/config/commandPalette.config.js` | Open Whiteboard command | Command palette registry | `/emergency/whiteboard` | working | None | None |
| `src/config/commandPalette.config.js` | Open Patients command | Command palette registry | `/emergency/patients` | working | None | None |
| `src/config/commandPalette.config.js` | Open EMS command | Command palette registry | `/emergency/ems` | working | None | None |
| `src/config/commandPalette.config.js` | Open Smart Intake command | Command palette registry | `/emergency/intake` | working | None | None |
| `src/config/commandPalette.config.js` | Open Queues command | Command palette registry | `/emergency/queues` | working | None | None |
| `src/config/commandPalette.config.js` | Open Reassessment command | Command palette registry | `/emergency/reassessment` | working | None | None |
| `src/config/commandPalette.config.js` | Open Capacity command | Command palette registry | `/emergency/capacity` | working | None | None |
| `src/config/commandPalette.config.js` | Open Boarding command | Command palette registry | `/emergency/boarding` | working | None | None |
| `src/config/commandPalette.config.js` | Open Referrals command | Command palette registry | `/emergency/referrals` | working | None | None |
| `src/config/commandPalette.config.js` | Open ED Copilot command | Command palette registry | `/emergency/copilot` | working | Opens the active Copilot support route | None |
| `src/config/commandPalette.config.js` | Open Medical Tools command | Command palette registry | `/emergency/tools` | working | Opens the active Medical Tools route | None |
| `src/config/commandPalette.config.js` | Open Analytics command | Command palette registry | `/emergency/analytics` | working | None | None |
| `src/config/commandPalette.config.js` | Open Settings command | Command palette registry | `/emergency/settings` | working | None | None |
| `src/components/CommandPalette.jsx` | Run calculator dynamic command | Command palette | Open patient/context-aware calculator workflow | fixed | AppShell launch handler now targets `/emergency/tools?source=calculators&filter=calculator` | None |
| `src/components/CommandPalette.jsx` | Drug reference dynamic command | Command palette | Open embedded drug reference or pediatric dosing | fixed | Drug metadata now targets Copilot; pediatric remains AppShell modal | None |
| `src/components/ChatInterface.jsx` | NLU calculator launcher | ED Copilot chat | Dispatch `ed:open-calculator` | fixed | AppShell event handler now opens `/emergency/tools?source=calculators&filter=calculator&open=...` | None |
| `src/components/PatientCard.jsx` | Run Score | Patient detail | Open patient-linked calculator workflow | fixed | Rewired to `/emergency/tools` with patient/calculator context | None |
| `src/components/PatientCard.jsx` | Protocol launch | Patient complaint suggestions | Record protocol launch event | working | None | Some complaint categories need additional calculator chips |
| `src/pages/emergency/SmartIntake.jsx` | Start Intake | Smart Intake | Try backend session, fall back to local demo | working | None | Optional backend route can be unavailable by environment |
| `src/pages/emergency/SmartIntake.jsx` | Final intake actions | Smart Intake | Link/create/unknown/triage workflow confirmation | fixed | Added handlers and status updates | Backend persistence remains manual review |
| `src/components/EMSPipeline.jsx` | Convert arrival to patient | EMS arrival timer/workflow | Store conversion when ETA expires | working | None | None |
| `src/components/EMSPipeline.jsx` | Complete handoff | EMS handoff row | Mark EMS arrival complete | working | None | None |
| `src/components/QueueIntelligencePanel.jsx` | Queue row | Queue panel | Set active queue filter | working | None | None |
| `src/components/QueueIntelligencePanel.jsx` | Collapse | Queue panel | Collapse/expand queue panel | fixed | Standalone route now provides state setter | None |
| `src/components/ReassessmentDrawer.jsx` | Reassessment drawer actions | Reassessment workflow | Open/close and complete/snooze reminders | working | None | None |
| `src/components/ReferralPanel.jsx` | New referral flow | Referral workflow | Create referral from patient context | working | None | Missing-patient row view is manual review |
| `src/pages/emergency/EmergencyAnalytics.jsx` | Analytics cards | Analytics route | Render operational metrics | working | None | None |
| `src/pages/emergency/EmergencySettings.jsx` | Settings controls | Settings route | Update emergency thresholds/preferences | working | None | Some feature management copy remains manual review |

## Summary
Launcher connectivity now centers on the active Emergency OS route tree. Calculator launchers converge on `/emergency/tools` with calculator query parameters, chat-assisted guidance converges on `/emergency/copilot`, and common inline score actions can still use existing patient-detail modals.
