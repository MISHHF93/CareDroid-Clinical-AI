# Role Permission Map

Canonical permissions live in `src/lib/users/permissions.ts`; canonical role mappings live in `src/lib/users/canonicalAccess.ts`.

| Role | Primary scope |
| --- | --- |
| Reception Clerk | patient create/read/update, alert read/acknowledge, staff read |
| Triage Nurse | patient create/update, triage create/update, alert acknowledge/escalate, AI request |
| Charge Nurse | triage, staff assignment, patient assignment, alerts, AI review/override |
| Registered Nurse | assigned patient updates, reassessment, alerts, AI request |
| Emergency Physician | patient update/assign/discharge, orders, alerts, AI review/override |
| Specialist | consult patient view/update, orders, medication/lab/imaging review, AI review |
| Paramedic | EMS patient creation/read, alert acknowledgement |
| Patient Flow Coordinator | patient assignment, staff assignment, analytics, escalation |
| Lab Technician | lab/order read, lab alert acknowledgement |
| Radiology Technician | imaging/order read, imaging alert acknowledgement |
| Pharmacist | medication review, alert acknowledgement/escalation |
| Hospital Administrator | analytics, reports, staff, users, settings, audit |
| IT Administrator | settings, users, AI configure, audit, metadata-only patient posture |
| Quality & Safety Officer | audit, reports, alerts, analytics, AI review |
| Demo Observer | read-only patient, alert, analytics, and manual access |

All route guards, nav filters, AI routing, alert ownership, and patient mutation checks should call helpers from `canonicalAccess.ts`.
