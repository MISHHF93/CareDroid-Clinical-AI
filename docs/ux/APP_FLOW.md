# CareDroid Clinical Intelligence Platform — Application Flow & User Journeys

**Document Version:** 2.2.0  
**Status:** Canonical Clinical Journey Specification  
**Author:** CareDroid Clinical Architecture & Product Working Group  

---

## 1. Master Application Flow Overview

CareDroid links pre-hospital telemetry, rapid ED triage, physician decision support, inpatient bed management, and operational analytics into an unbroken continuous care loop:

```mermaid
flowchart TD
    A[Patient Arrival: Walk-in / EMS Inbound] --> B{Entry Point}
    B -->|Walk-in| C[Self-Arrival Kiosk / Reception Desk]
    B -->|EMS Inbound| D[Ambulance Bay Pre-Arrival Telemetry]
    
    C --> E[Clinical Triage & Acuity Scoring]
    D --> E
    
    E --> F[Waiting Room / Active Tracking Whiteboard]
    F --> G[Physician Examination & Diagnostics]
    
    G --> H{Clinical Decision Support / AI Copilot}
    H -->|Pediatric Dosing Check| I[Safety Verified Order Entry]
    H -->|Risk Prediction / Sepsis Alert| J[Immediate Escalation / Resuscitation]
    
    I --> K{Disposition Decision}
    J --> K
    
    K -->|Admit to Inpatient| L[Bed Capacity & Surge Management]
    K -->|Discharge Home| M[Patient Education & Digital Discharge Summary]
    K -->|Transfer to Tertiary Care| N[Specialist Referral & Transport Coordination]
    
    L --> O[Continuous Shift Audit & Operational Analytics]
    M --> O
    N --> O
```

---

## 2. Core Clinical Journeys (Entry to Recovery)

### 2.1 Journey 1: Rapid Patient Triage & Acuity Assignment

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as Triage Nurse
    participant UI as Triage Workspace (/triage)
    participant Engine as Triage Decision Engine
    participant Store as Central Clinical Store
    participant Board as Whiteboard (/whiteboard)

    Nurse->>UI: Selects un-triaged patient from queue
    UI-->>Nurse: Displays Triage Form (Demographics + Chief Complaint)
    Nurse->>UI: Enters Vitals (HR, BP, SpO2, Temp, RR) & Chief Complaint
    UI->>Engine: Stream vitals for real-time risk scoring
    Engine-->>UI: Suggests CTAS Acuity Tier (e.g. Level 2 - Emergent) + Red Flag Alerts
    Nurse->>UI: Reviews, confirms or overrides acuity, adds nursing note
    Nurse->>UI: Clicks "Assign Acuity & Place in Pod"
    UI->>Store: Dispatches triage completion event
    Store->>Board: Instantly updates Pod Queue & Whiteboard
    UI-->>Nurse: Shows Success confirmation & auto-loads next waiting patient
```

#### State Transition Breakdown:
- **ENTRY:** Nurse accesses `/triage` or clicks "Start Triage" on `/reception`.
- **ACTION:** Nurse inputs patient vitals, selects primary symptoms, and confirms CTAS acuity score.
- **SYSTEM RESPONSE:** Clinical engine validates vitals against physiologic age-adjusted norms, highlights flags (e.g. `SpO2 < 90%` triggers immediate cyanosis alert).
- **SUCCESS:** Patient record is tagged with assigned CTAS level, estimated wait time counter starts, and patient appears in the assigned Pod on `/whiteboard`.
- **FAILURE:** Network disconnect or backend unavailable.
- **RECOVERY:** Local offline storage buffers the encounter in IndexedDB, UI displays "Offline Mode — Changes Stored Locally", and auto-syncs when WebSocket reconnects.

---

### 2.2 Journey 2: Emergency Physician Whiteboard & Clinical Decision Support

```mermaid
sequenceDiagram
    autonumber
    actor MD as Emergency Physician
    participant WB as Whiteboard (/whiteboard)
    participant Panel as Patient Detail Drawer
    participant Calc as Clinical Tools Engine
    participant Orders as Hospital Order System

    MD->>WB: Scans assigned Pod (Beds 1-8)
    MD->>WB: Clicks Bed 4 (Jane Doe, 4yo, Wheezing)
    WB-->>MD: Slides out Patient Detail Drawer (maintaining Pod context)
    MD->>Panel: Clicks "Pediatric Dosing Checker"
    Panel->>Calc: Queries weight-adjusted dosing guidelines
    Calc-->>MD: Shows Safe Amoxicillin Dosage (calculated from 16.5 kg)
    MD->>Panel: Accepts dosage & drafts electronic prescription
    Panel->>Orders: Submits signed medication order
    Orders-->>WB: Updates Bed 4 tag to "Meds Ordered"
```

#### State Transition Breakdown:
- **ENTRY:** Physician logs in to `/whiteboard` filtering by "My Patients" or "Pod A".
- **ACTION:** Physician clicks on patient card, opens Detail Drawer, clicks "Pediatric Dosing Checker".
- **SYSTEM RESPONSE:** System fetches verified patient weight (16.5 kg), prompts for medication, computes mg/kg/dose, flags max dose limits.
- **SUCCESS:** Verified dosage is copied into prescription order; audit log records clinical calculation parameters.
- **FAILURE:** Patient weight is missing or entered as zero.
- **RECOVERY:** UI alerts with warning banner "Patient Weight Required for Pediatric Calculation", highlights weight entry input with immediate focus.

---

### 2.3 Journey 3: Inbound EMS Ambulance Bay Pre-Arrival

```mermaid
sequenceDiagram
    autonumber
    actor EMS as Paramedic (En Route)
    participant Bay as EMS Gateway (/ems)
    actor Charge as Charge Nurse
    participant Bed as Capacity Board (/capacity)

    EMS->>Bay: Submits Pre-Arrival Telemetry (STEMI Alert, ETA 7 min)
    Bay-->>Charge: Sounds High-Priority Visual & Auditory Alarm (1.6s pulse)
    Charge->>Bay: Reviews inbound 12-lead ECG snapshot
    Charge->>Bed: Allocates Resuscitation Bay 1 & alerts Cath Lab team
    Bed-->>Bay: Res Bay 1 reserved for Inbound EMS-04
    EMS->>Bay: Arrives at Ambulance Bay & initiates electronic handoff
    Charge->>Bay: Scans EMS transfer QR / accepts electronic handoff
    Bay-->>Bed: Patient status transitioned from "Inbound" to "Active - Resuscitation"
```

#### State Transition Breakdown:
- **ENTRY:** EMS vehicle streams pre-arrival notification via cellular or satellite data.
- **ACTION:** Charge nurse receives visual chime on topbar operational rail and clicks inbound vehicle card.
- **SYSTEM RESPONSE:** System opens EMS telemetry overview, displays patient vitals timeline, and recommends trauma/cath team standby.
- **SUCCESS:** Charge nurse reserves resuscitation suite, notifies on-call specialist, and locks bed status.
- **FAILURE:** Conflicting ambulance arrival without available resuscitation bed.
- **RECOVERY:** Surge management engine suggests bed re-allocation or immediate diversion protocol, with single-click escalation to Medical Director.

---

## 3. Error Handling, Loading States & Offline Resilience

| State | Visual Treatment | Interactive Recovery |
| :--- | :--- | :--- |
| **Route Loading** | Shimmer skeleton cards adhering to exact target dimensions (`.app-shell-route-loading`). Zero layout shifts (CLS < 0.05). | Auto-cancels if navigation changes before load finishes. |
| **Empty State** | Clean illustrated medical icon, friendly plain-language clinical prompt (e.g. "No pending triage patients in queue"). | Contextual action button (e.g. `+ New Arrival` or `Refresh Queue`). |
| **Permission Denied** | Calibrated access boundary banner (`.cd-state--unsupported`), stating exact missing permission code. | Quick persona switch button (in dev mode) or "Contact Department Administrator" link. |
| **Backend Offline** | Top utility sync dot turns amber/red with "Local Mode Active — 14 updates queued". | Persistent background polling (`ensureBackendReachabilityProbed`); seamless sync playback on reconnect. |

---

