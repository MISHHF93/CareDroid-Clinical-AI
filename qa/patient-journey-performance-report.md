# Patient Journey Performance Report

**Generated:** 2026-08-04T01:39:22.614Z
**Stack:** backend :3350 · frontend :5190
**Auth:** 3350 (300ms)
**Patients simulated:** 6
**Overall grade:** **F** — Fail — platform not responding as an ED front door

## Platform probes

| Check | OK | Status | ms |
|-------|----|--------|-----|
| Backend /health (:3350) | yes | 200 | 31 |
| Backend GET /api/emergency/patients (unauth probe) | yes | 401 | 15 |
| Frontend proxy /health (:5190) | no | 0 | 1 |
| Frontend / (:5190) | no | 0 | 1 |
| GET /api/emergency/patients (auth) | yes | 200 | 42 |
| GET /api/emergency/reception/snapshot (auth) | yes | 200 | 69 |

## Latency summary (per full patient journey)

| Metric | Value |
|--------|-------|
| Pass rate | 16.7% (1/6) |
| Avg total | 536 ms |
| p50 | 252 ms |
| p95 | 1689 ms |
| Max | 1689 ms |

## Step latency averages

| Step | Avg ms | Failures |
|------|--------|----------|
| create_intake | 99 | 5 |
| ocr_create | 46 | 0 |
| ocr_review_firstName | 33 | 0 |
| ocr_review_lastName | 33 | 0 |
| ocr_review_dateOfBirth | 33 | 0 |
| ocr_review_sex | 35 | 0 |
| ocr_apply | 36 | 0 |
| reception_handoff | 216 | 5 |
| reception_escalation | 135 | 2 |
| ocr_review_healthCardNumber | 31 | 0 |

## Persona results (as if real arrivals)

| # | Persona | Pass | Total ms | Create | Handoff | Escalate |
|---|---------|------|----------|--------|---------|----------|
| 1 | Walk-in chest pain (return visit risk) | FAIL | 350 | fail | fail | fail |
| 2 | Parent with febrile child | FAIL | 252 | fail | fail | — |
| 3 | Shortness of breath — Spanish speaker | FAIL | 191 | fail | fail | — |
| 4 | Unknown / unresponsive at entrance | PASS | 1689 | ok | ok | ok |
| 5 | Minor ankle injury | FAIL | 517 | fail | fail | — |
| 6 | Transfer-style arrival (staff-created) | FAIL | 214 | fail | fail | fail |

## Narrative (what the platform experienced)

We simulated **6 ED arrivals** as a registration clerk: from chest pain and stroke transfer to a Spanish-speaking SOB walk-in, a febrile child, a minor ankle injury, a psych crisis, and an unknown crash at the door.

Each “patient” triggered the same APIs the desk uses: **create intake → optional OCR review/apply → reception handoff → optional escalation**. The stack **struggled on critical path steps** with average journey latency **536 ms**.

### Failures

- **walkin-chest-pain-1** / `create_intake`: HTTP 409
- **walkin-chest-pain-1** / `reception_handoff`: HTTP 500
- **walkin-chest-pain-1** / `reception_escalation`: HTTP 500
- **walkin-pediatric-fever-2** / `create_intake`: HTTP 409
- **walkin-pediatric-fever-2** / `reception_handoff`: HTTP 500
- **walkin-spanish-sob-3** / `create_intake`: HTTP 409
- **walkin-spanish-sob-3** / `reception_handoff`: HTTP 500
- **walkin-ankle-5** / `create_intake`: HTTP 409
- **walkin-ankle-5** / `reception_handoff`: HTTP 500
- **ems-style-transfer-6** / `create_intake`: HTTP 409
- **ems-style-transfer-6** / `reception_handoff`: HTTP 500
- **ems-style-transfer-6** / `reception_escalation`: HTTP 500

## Recommendation

Stabilize backend reachability, auth/dev-session, and PHI permissions before pilot. Use RECEPTION_HANDOFF.md golden path against a healthy stack.

