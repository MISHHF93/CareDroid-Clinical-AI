# Operational Mission Control Map

Generated: 2026-06-14

## Mission Control Owner

The active mission-control surface is `/emergency/whiteboard`, rendered by `src/pages/emergency/index.tsx` through the single AppShell. The header also renders central operational context from `useCareDroidCentralNode({ realtime: true })`.

## Command Center Inputs

- Patients: `useEmergencyWhiteboard`, `useEmergencyPatients`, shared store hydration
- Queues: `useEmergencyQueues`, route-local queue synthesis, central-node queue health
- EMS: `useEMSIntake`, EMS store arrays, EMS conversion and handoff actions
- Reassessment: store flags, reassessment engine, reassessment route/drawer
- Referrals: store referrals, `ReferralPanel`, central-node pending referral metric
- Capacity: store capacity, capacity engine, `/api/emergency/capacity`
- Alerts: store alerts and central-node active alert count
- Settings: thresholds, enabled modules, screen modes, integration settings

## Command Center Outputs

- Whiteboard stats: total patients, waiting, high risk, capacity, reassessment due, EMS under 10 minutes, boarding, freshness
- Header strip: patients today, waiting, longest wait, EMS inbound, reassessments due, capacity score, boarders, referrals pending
- Patient cards: identity, complaint, acuity, wait, room, assigned clinician, vitals, risk flags, reassessment, EMS, boarding, referral/discharge actions
- Queue rows: waiting, triage, assessment/provider, orders, results, admission, referral, discharge-ready, reassessment
- Mission actions: Central Intake, Identity Review, Reassessment Tasks, New Referral, EMS bay preparation, EMS add-to-board

## Patient Safety Awareness

Safety is visible through high-risk priority bands, sepsis/deterioration flags, reassessment due flags, EMS critical indicators, capacity crisis mode, and Copilot safety text. The system presents review queues and next actions; it does not create autonomous clinical, identity, or disposition decisions.

## Operational Awareness

Operational awareness is centralized through capacity score, boarders, referrals pending, EMS pressure, waiting count, stale-sync status, queue breach status, and analytics. The active workflow reduces cognitive load by keeping key state in the header, whiteboard, and patient cards rather than creating separate command-center architecture.
