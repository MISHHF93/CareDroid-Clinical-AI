# Patient Journey Performance Report

**Generated:** 2026-07-24T04:40:17.338Z
**Stack:** backend :3350 · frontend :5190
**Auth:** 3350 (39ms)
**Patients simulated:** 6
**Overall grade:** **C** — Fair — investigate slow/failing steps

## Platform probes

| Check | OK | Status | ms |
|-------|----|--------|-----|
| Backend /health (:3350) | yes | 200 | 7 |
| Backend GET /api/emergency/patients (unauth probe) | yes | 401 | 2 |
| Frontend proxy /health (:5190) | no | 0 | 2 |
| Frontend / (:5190) | no | 0 | 1 |
| GET /api/emergency/patients (auth) | yes | 200 | 27 |
| GET /api/emergency/reception/snapshot (auth) | yes | 200 | 33 |

## Latency summary (per full patient journey)

| Metric | Value |
|--------|-------|
| Pass rate | 100.0% (6/6) |
| Avg total | 1659 ms |
| p50 | 1650 ms |
| p95 | 2102 ms |
| Max | 2102 ms |

## Step latency averages

| Step | Avg ms | Failures |
|------|--------|----------|
| create_intake | 295 | 0 |
| ocr_create | 344 | 0 |
| ocr_review_firstName | 40 | 0 |
| ocr_review_lastName | 28 | 0 |
| ocr_review_dateOfBirth | 29 | 0 |
| ocr_review_sex | 26 | 0 |
| ocr_apply | 146 | 0 |
| reception_handoff | 663 | 0 |
| reception_escalation | 426 | 0 |
| ocr_review_healthCardNumber | 22 | 0 |

## Persona results (as if real arrivals)

| # | Persona | Pass | Total ms | Create | Handoff | Escalate |
|---|---------|------|----------|--------|---------|----------|
| 1 | Walk-in chest pain (return visit risk) | PASS | 1951 | ok | ok | ok |
| 2 | Parent with febrile child | PASS | 1069 | ok | ok | — |
| 3 | Shortness of breath — Spanish speaker | PASS | 1650 | ok | ok | — |
| 4 | Unknown / unresponsive at entrance | PASS | 2060 | ok | ok | ok |
| 5 | Minor ankle injury | PASS | 1120 | ok | ok | — |
| 6 | Transfer-style arrival (staff-created) | PASS | 2102 | ok | ok | ok |

## Narrative (what the platform experienced)

We simulated **6 ED arrivals** as a registration clerk: from chest pain and stroke transfer to a Spanish-speaking SOB walk-in, a febrile child, a minor ankle injury, a psych crisis, and an unknown crash at the door.

Each “patient” triggered the same APIs the desk uses: **create intake → optional OCR review/apply → reception handoff → optional escalation**. The stack **responded like a working front door** with average journey latency **1659 ms**.

## Recommendation

Platform responds but latency or intermittent failures need attention on create/handoff/OCR/auth. Re-run after checking Nest logs and JWT permissions (READ_PHI/WRITE_PHI).

