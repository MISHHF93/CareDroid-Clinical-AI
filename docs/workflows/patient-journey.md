# CareDroid Workflow Documentation

**Generated:** 2026-06-28  
**Source:** Reverse-engineered from `src/pages/emergency/`, `src/services/`, `src/store/emergencyStore.ts`

---

## Workflow 1: Patient Arrival (Walk-in)

**Mission:** Get a walk-in patient from front door to triage queue in under 3 minutes.

```
PATIENT ARRIVES AT FRONT DESK
          │
          ▼
RECEPTION WORKSPACE (/emergency/reception)
  Registration Clerk opens "Register walk-in"
  ─────────────────────────────────────────
  1. Capture chief complaint (free text)
  2. Capture demographics (name, DOB, sex, phone)
  3. System creates Patient record (state: Registration)
  4. Patient card appears in "Recent arrivals" rail
          │
          ▼
SMART INTAKE (/emergency/intake or embedded)
  1. Chief complaint structured with AI classification
  2. Additional symptoms, allergies, medications (optional)
  3. AI suggests acuity level (nurse reviews, not auto-assigned)
  4. Patient moves to Verification queue
          │
          ▼
VERIFICATION QUEUE
  Clerk or Nurse verifies identity (ID scan or manual)
  Patient moves to Pretriage queue
          │
          ▼
PRETRIAGE QUEUE
  Awaiting Triage Nurse pickup
  Patient state: Waiting
          │
          ▼
TRIAGE QUEUES (/emergency/queues)
  Triage Nurse assigns:
  - Acuity level (P1–P5)
  - Vitals (HR, BP, RR, SpO2, Temp, GCS)
  - NEWS2 score (auto-calculated)
  Patient state moves to: Triage → Waiting (or Assessment if direct)
          │
          ▼
WHITEBOARD (/emergency/whiteboard)
  Patient card visible to all clinical roles
  Charge Nurse assigns room / provider
```

**Key Services:**
- `src/services/receptionHandoff.ts` — `completeIntakeHandoff()`
- `src/services/queueAssignment.ts` — `matchesWhiteboardQueueFilter()`
- `src/store/emergencyStore.ts` — patient state mutations

**Time Target:** Arrival → Pretriage queue < 3 minutes

---

## Workflow 2: EMS Pre-Arrival

**Mission:** Prepare the ED for an inbound ambulance before it arrives.

```
EMS DISPATCH NOTIFICATION RECEIVED
          │
          ▼
EMS PIPELINE (/emergency/ems)
  Unit card appears (status: Inbound)
  ─────────────────────────────────
  ETA countdown visible (live timer)
  Unit details: unitId, crew, estimated condition
          │
          ▼
BAY PREPARATION
  Charge Nurse or Clerk presses "Prepare Bay"
  Bay assignment logged
  Status → BayAssigned
          │
          ▼
AMBULANCE ARRIVES
  Staff confirms arrival in EMS Pipeline
  EmsOffloadTimer starts (target: ≤15 minutes)
  Status → Arrived
          │
          ▼
EMS HANDOFF
  Paramedic transfers patient
  EMS Handoff checklist completed
  Offload timer stops when handoff acknowledged
          │
          ▼
PATIENT CONVERSION
  Clerk or Nurse "Convert EMS to Patient"
  Patient record created from EMS unit data
  ─────────────────────────────────────────
  If Registration Clerk role → navigates to Reception for verification
  If other role → Patient appears on whiteboard (EMS filter)
          │
          ▼
NORMAL PATIENT JOURNEY (continue from Walk-in Workflow Step: Triage)
```

**Attention Signals:**
- `EmsAttentionStrip` on whiteboard when inbound arrivals detected
- `EmsOffloadAggregateStrip` when offload delays exceed threshold
- Orange/red badge when any unit exceeds 15-minute offload target

**Key Services:**
- `src/services/patientArrivalBackendSync.ts`
- `src/store/emergencyStore.ts` — `emsArrivals`, `prepareEMSBay()`
- `src/components/ems/EmsOffloadTrackerPanel.tsx`

**Socket:** `backend/src/api/ems.socket.ts` for real-time unit status

---

## Workflow 3: Triage & Acuity Assignment

**Mission:** Assess every patient and assign acuity within the triage time standard.

```
PATIENT IN PRETRIAGE QUEUE
          │
          ▼
TRIAGE NURSE opens patient from Queue screen
  (/emergency/queues?queue=pretriage)
          │
          ▼
ASSESSMENT
  Nurse records:
  - Vital signs (HR, BP, RR, SpO2, Temperature, GCS)
  - Primary complaint detail
  - Acuity level (P1–P5 / Canadian Triage Scale)
  - Any escalation flags
          │
          ▼
AI TRIAGE ASSIST (AiTriageAssistPanel)
  Panel suggests:
  - Relevant calculators (NEWS2, qSOFA, MEWS)
  - Red flag warnings from chief complaint
  - Recommended next steps
  (Nurse reviews — AI does not assign acuity)
          │
          ▼
ACUITY ASSIGNED
  Patient state: Triage → Waiting
  Priority badge visible on whiteboard card
          │
          ▼
HIGH PRIORITY PATH (P1/P2)
  CriticalAlertBanner fires if P1 or high-risk flags present
  Patient flagged: HighRisk, DeteriorationRisk, SepsisAlert, etc.
  Charge Nurse and Physicians notified
          │
          ▼
STANDARD PATH (P3–P5)
  Patient enters Waiting state
  Reassessment timer starts (interval per acuity)
  Monitoring continues via ReassessmentAttentionStrip
```

**Reassessment Intervals:**
- P1: Continuous monitoring
- P2: Every 15 minutes
- P3: Every 30 minutes
- P4: Every 60 minutes
- P5: Every 120 minutes

---

## Workflow 4: Three-Minute Response Loop

**Mission:** From the moment a critical condition is detected, clinical action must begin within 3 minutes.

```
CRITICAL TRIGGER DETECTED
(One of:)
- Patient flags: SepsisAlert, StrokeCode, DeteriorationRisk
- Vital breach: Critical NEWS2, qSOFA ≥ 2, SpO2 < 90%
- EMS pre-notification: "Code" arrival
- Reassessment timer breach
- Bottleneck registry: Critical severity alert
          │
          ▼
ALERT GENERATED
  CriticalAlertBanner displays at top of Whiteboard
  Alert count badge increments
  Bottleneck registry logs alert (severity: critical)
          │
          ▼
CHARGE NURSE / PHYSICIAN RESPONDS (< 3 min target)
  Opens patient card from whiteboard
  Reviews clinical data, flags, vitals
  AI Copilot provides:
  - Patient summary
  - Relevant score (NEWS2, qSOFA, HEART)
  - Suggested next step
          │
          ▼
ACTION TAKEN
  One of:
  - Orders placed (assessment queue)
  - Room / resuscitation bay assigned
  - Specialist referral opened
  - Escalation acknowledged
          │
          ▼
ALERT ACKNOWLEDGED
  Bottleneck status: active → acknowledged
  Timer stops
  Audit record created
```

**Components:**
- `src/components/emergency/CriticalAlertBanner.tsx`
- `src/store/emergencyStore.ts` — `alerts`, `unacknowledgedCriticalAlertCount`
- `src/features/whiteboard/` — 3-minute response loop UI
- `src/components/copilot/DiagnosticSafetyDashboard.tsx`

---

## Workflow 5: Reassessment

**Mission:** No patient waits more than their acuity-defined interval without a nursing check.

```
TIMER STARTS AT TRIAGE
          │
          ▼ (timer elapses)
REASSESSMENT DUE
  Patient flagged: ReassessmentDue
  WhiteboardCard shows breach indicator
  ReassessmentAttentionStrip appears on whiteboard
          │
          ▼
NURSE OPENS REASSESSMENT
  From: whiteboard filter "Reassess"
  Or: /emergency/reassessment
  Or: Reassess drawer (keyboard shortcut R)
          │
          ▼
REASSESSMENT COMPLETED
  New vitals recorded
  Clinical notes updated
  Flag cleared: ReassessmentDue
  Timer resets for next interval
          │
          ▼
ESCALATION OPTION
  If patient deteriorated → raise acuity
  If new concerning symptoms → add flag
  If critical → trigger Three-Minute Response Loop
```

---

## Workflow 6: Capacity Management

**Mission:** Maintain situational awareness of ED capacity and prevent boarding.

```
CAPACITY MONITOR (continuous, 15s refresh)
          │
          ├── Score: 0–100
          ├── Band: Green / Yellow / Orange / Red
          └── Thresholds checked
          │
          ▼
CAPACITY BANDS
  Green  (0–60):  Normal operations
  Yellow (60–75): Begin contingency monitoring
  Orange (75–90): Activate surge protocols
  Red    (90+):   CapacityCrisisMode activates
          │
          ▼ (if Red)
CAPACITY CRISIS MODE
  CapacityCrisisMode component activates on whiteboard
  Shows: available beds, boarding count, EMS delays
  Charge Nurse reviews boarding options
          │
          ▼
BOARDING MANAGEMENT (/emergency/boarding)
  Patients admitted but physically still in ED
  Target: Clear boarding within 2 hours of admission decision
  Actions: Expedite transport, contact inpatient unit
          │
          ▼
CAPACITY RECOVERED
  Band returns to Green/Yellow
  CapacityCrisisMode deactivates
```

**Key Metrics on Whiteboard:**
- `capacity.score`, `capacity.band`, `capacity.updatedAt`
- `boardingMetrics.count`, `boardingMetrics.avgDurationMinutes`

---

## Workflow 7: Referral Management

**Mission:** Track specialist referrals from request to completion without dropping the handoff.

```
REFERRAL CREATED
  Physician opens Referral panel from patient card
  Or: /emergency/referrals?patientId=X&new=1
  ─────────────────────────────────────────
  Captures: specialist, urgency, reason, patient
  Status: Pending
          │
          ▼
REFERRAL ACCEPTED
  Specialist (or coordinator) accepts
  Status: Accepted
  ReferralAttentionStrip updates on whiteboard
          │
          ▼
MONITORING
  Referral pending > threshold → Status: Delayed
  ReferralAttentionStrip flags delayed referrals
  Whiteboard queue filter: "referral" shows patients with active referrals
          │
          ▼
REFERRAL COMPLETED
  Patient seen by specialist
  Status: Completed / Closed
  Removed from attention strip
```

---

## Workflow 8: Discharge

**Mission:** Complete the patient journey and clear the patient from the active board.

```
PHYSICIAN DECISION: DISCHARGE
          │
          ▼
DISPOSITION SET
  Patient card disposition: Discharge
  Status updated: Admission → Discharge
          │
          ▼
DISCHARGE PROCESS
  Discharge instructions (optional)
  Follow-up arrangements
  Medication reconciliation
          │
          ▼
PATIENT DEPARTS
  Patient state: Discharge
  Patient filtered OFF whiteboard (discharged patients hidden by default)
  Bed status: Available
  Capacity score updated
          │
          ▼
SHIFT SUMMARY CAPTURE
  /emergency/shift tracks discharge count
  Analytics updated: patient LOS, throughput
```

---

## Workflow 9: Shift Handoff

**Mission:** Transfer operational responsibility between outgoing and incoming shift without information loss.

```
END OF SHIFT APPROACHING
          │
          ▼
SHIFT SUMMARY (/emergency/shift)
  Auto-builds from current store state:
  - Total patients seen
  - Outstanding tasks
  - Pending referrals
  - Boarding patients
  - Active alerts
  - EMS offload status
          │
          ▼
HANDOFF STRIP (whiteboard)
  OperationalHandoffDomainBar shows:
  - Patient summary domains
  - EMS, Referral, Reassessment metrics
  Incoming charge nurse reviews
          │
          ▼
HANDOFF CONFIRMED
  Outgoing shift signs off
  Incoming shift takes primary responsibility
  Audit log records handoff event
```

---

## Workflow 10: Self-Arrival Check-In

**Mission:** Reduce front-desk congestion by allowing low-acuity patients to self-register.

```
PATIENT ARRIVES (self-service)
/emergency/self-arrival (public URL, no auth required)
          │
          ▼
SELF CHECK-IN FORM
  Patient enters:
  - Name
  - Date of birth
  - Chief complaint (structured)
  - Contact number
          │
          ▼
RECORD CREATED
  Patient appears in Reception workspace
  Marked as "Self-arrival" source
  Clerk verifies and moves to standard intake flow
```

---

## Workflow 11: Demo/Walkthrough

**Mission:** Allow evaluators and new staff to walk through the full ED workflow with sample data.

```
HELP HUB → PROCESS TAB → Demo walkthrough A–K
          │
          ▼
Steps A–K map to:
  A. Reception login as Registration Clerk
  B. Register a walk-in patient
  C. Complete intake (chief complaint)
  D. Verify and hand off to pretriage
  E. Switch to Triage Nurse → assign acuity
  F. Switch to Charge Nurse → whiteboard view
  G. Review EMS inbound
  H. Open Copilot → patient summary
  I. Use clinical calculator (NEWS2/qSOFA)
  J. Review capacity and boarding
  K. View analytics and shift summary
```
