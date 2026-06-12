# Frontend Backend Alignment Report

Generated: 2026-06-12T02:34:02.555Z

Scanned 2209 text/code files. Resolved 5609 relative import edges. Found 282 backend endpoint declarations and 1239 frontend API references.

| Module |UI Route |Route |Sidebar |Command Palette |Search |Live Backend Data |Backend Endpoints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Emergency Whiteboard | /emergency/whiteboard | yes | yes | yes | yes | partial | /api/patients/*, /api/platform-systems/* |
| Patient Journey Engine | /emergency/patients | yes | yes | yes | yes | partial | /api/patients/:id/timeline |
| EMS Intake | /emergency/ems | yes | yes | yes | yes | backend-route-unconsumed | /api/ems/incoming, /api/ems/alert, /api/ems/status/:emsUnitId, /api/ems/arrive/:emsUnitId |
| Smart Intake | /emergency/intake | yes | yes | yes | yes | conditional | /api/emergency/intake/sessions, /api/emergency/intake/:id/* |
| Queue Intelligence | /emergency/queues | yes | yes | yes | yes | client-derived | /api/emergency/queues/analytics |
| Reassessment Engine | /emergency/reassessment | yes | yes | yes | yes | backend-route-unconsumed | /api/reassessment/due, /api/reassessment/:patientId/reassess |
| Capacity Intelligence | /emergency/capacity | yes | yes | yes | yes | mixed | /api/capacity/dashboard, /api/emergency/capacity/history |
| Boarding Intelligence | /emergency/boarding | yes | yes | yes | yes | client-derived | /api/emergency/analytics |
| Referral Intelligence | /emergency/referrals | yes | yes | yes | yes | client-derived | /api/emergency/referrals |
| ED Copilot | /emergency/copilot | yes | yes | yes | yes | mixed | /api/copilot/query, /api/chat/message |
| Analytics | /emergency/analytics | yes | yes | yes | yes | client-fallback | /api/emergency/analytics, /api/emergency/capacity/history, /api/emergency/queues/analytics |

## Alignment Findings

- Active frontend reachability is complete across direct routes, sidebar, command palette, and search after this pass.
- Backend persistence is uneven: Smart Intake has the strongest backend chain, while queues, boarding, referrals, and analytics rely on local store derivations/fallbacks.
- Conditional backend mounting via `ENABLE_MONGOOSE_EMERGENCY_OS=true` means Emergency OS backend endpoints are not guaranteed in default runtime.
