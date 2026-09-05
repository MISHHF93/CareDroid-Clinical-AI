# Patient Journey Performance Report

**Generated:** 2026-09-05T05:25:47.265Z
**Stack:** backend :8000 · frontend :3000
**Auth:** 8000 (26ms)
**Patients simulated:** 6
**Overall grade:** **C** — Critical path completes but is slow — 2048ms average (every journey completed)

**Escalations:** 3/3 accepted by the API but only 0 actually delivered (0 recipient(s) configured). An accepted escalation that reaches nobody is not an escalation — configure an on-duty charge nurse email or INCIDENT_ESCALATION_EMAILS.

## Platform probes

| Check | OK | Status | ms |
|-------|----|--------|-----|
| Backend /health (:8000) | yes | 200 | 24 |
| Backend GET /api/emergency/patients (unauth probe) | yes | 401 | 3 |
| Frontend proxy /health (:3000) | no | 0 | 2 |
| Frontend / (:3000) | no | 0 | 1 |
| GET /api/emergency/patients (auth) | yes | 200 | 20 |
| GET /api/emergency/reception/snapshot (auth) | yes | 200 | 23 |

## Latency summary (per full patient journey)

| Metric | Value |
|--------|-------|
| Pass rate | 100.0% (6/6) |
| Avg total | 2048 ms |
| p50 | 1751 ms |
| p95 | 2885 ms |
| Max | 2885 ms |

## Step latency averages

| Step | Avg ms | Failures |
|------|--------|----------|
| create_intake | 353 | 0 |
| ocr_create | 636 | 0 |
| ocr_review_firstName | 185 | 0 |
| ocr_review_lastName | 22 | 0 |
| ocr_review_dateOfBirth | 25 | 0 |
| ocr_review_sex | 18 | 0 |
| ocr_apply | 153 | 0 |
| reception_handoff | 724 | 0 |
| reception_escalation | 294 | 0 |
| ocr_review_healthCardNumber | 25 | 0 |

## Persona results (as if real arrivals)

| # | Persona | Pass | Total ms | Create | Handoff | Escalate |
|---|---------|------|----------|--------|---------|----------|
| 1 | Walk-in chest pain (return visit risk) | PASS | 2412 | ok | ok | ok |
| 2 | Parent with febrile child | PASS | 1672 | ok | ok | — |
| 3 | Shortness of breath — Spanish speaker | PASS | 2502 | ok | ok | — |
| 4 | Unknown / unresponsive at entrance | PASS | 1064 | ok | ok | ok |
| 5 | Minor ankle injury | PASS | 1751 | ok | ok | — |
| 6 | Transfer-style arrival (staff-created) | PASS | 2885 | ok | ok | ok |

## Narrative (what the platform experienced)

We simulated **6 ED arrivals** as a registration clerk: from chest pain and stroke transfer to a Spanish-speaking SOB walk-in, a febrile child, a minor ankle injury, a psych crisis, and an unknown crash at the door.

Each “patient” triggered the same APIs the desk uses: **create intake → optional OCR review/apply → reception handoff → optional escalation**. The stack **responded like a working front door** with average journey latency **2048 ms**.

## Recommendation

Every journey completed; the grade is latency alone (2048ms average). Profile the slowest steps below against a production build — dev-mode module loading and a development database inflate these numbers — before treating this as a platform defect.

