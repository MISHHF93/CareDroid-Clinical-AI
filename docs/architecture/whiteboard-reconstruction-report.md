# Whiteboard Reconstruction Report

Generated: 2026-06-14

## Current Whiteboard Source

The mounted Whiteboard route is `/emergency/whiteboard`. `src/components/EmergencyWhiteboard.jsx` is a compatibility export into `src/pages/emergency/index.tsx`, so there is one active whiteboard implementation.

## Existing Coverage

- Waiting patients: visible in stats, filters, patient cards, queues, and central-node summary
- Triaged patients: visible through `PatientState.Triage`, queue rows, patient cards, and Smart Intake vertical-slice movement
- Reassessment due: visible in stats, mission tasks, patient cards, drawer, and route
- EMS arrivals: visible in mission cards, EMS route, EMS pressure badge, and conversion actions
- Referrals: visible through mission action, Referral route, header metric, and new Queue row
- Pending admissions/boarders: visible in Boarding route, capacity, patient cards, and header metric
- Capacity status: visible in Whiteboard stats, header, Capacity route, and central node
- Alerts: visible through Header alert drawer, patient card flags, and central-node active alert count

## Safe Wiring Applied

The Queues route now keeps backend queue rows but supplements missing journey queues from existing store data:

- `Referral`: active referrals mapped back to patient records
- `Discharge`: patients in `PatientState.Disposition`, representing discharge-ready work before final `Discharge`

The central node queue contract now includes `referral`, `discharge`, and `reassessment` rows so operational snapshots reflect these bottlenecks.

## Not Changed

No alternate dashboard, routing system, AppShell, navigation model, or backend API convention was created. The Whiteboard layout was not redesigned; the pass only connected existing journey data into existing mission-control surfaces.
