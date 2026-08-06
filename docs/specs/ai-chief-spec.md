> **SUPERSEDED** — Use [docs/generated/ai-capabilities.md](../generated/ai-capabilities.md). Regenerate: `npm run docs:generate`

# AI Chief Spec

**Status:** 16 of 16 intents implemented. All handlers exist in `lib/ai/careDroidAI.ts` (root, not `src/lib/`).  
**Note:** `src/lib/ai/careDroidAI.ts` is a re-export barrel — the real implementation is in the root `lib/` directory.

---

## Purpose

AI Chief is a single decision-support node. It provides structured, explainable recommendations for clinical and operational decisions. Every recommendation requires human review before any clinical action is taken.

---

## Safety Contract

- AI Chief never diagnoses, prescribes, disposes, or writes EHR records without licensed clinician review.
- Every response includes `requiresClinicianReview: boolean` (always `true` for clinical intents).
- Every response includes `requiredReviewerRole: string` (the licensed role that must review before acting).
- Every response includes `uncertaintyStatement: string` (what AI does not know or cannot assess).
- Override of any AI recommendation is always available and always logged with reason.

---

## Response Contract

Every AI Chief response must include:

```typescript
type AIChiefResponse = {
  intent: AIChiefIntent;
  patientContext?: PatientContext;        // patient or department context
  departmentContext?: DepartmentContext;
  recommendation: string;                // specific suggested action
  rationale: string;                    // why AI is suggesting this
  uncertaintyStatement: string;          // what AI does not know
  confidenceLevel: 'high' | 'moderate' | 'low' | 'insufficient';
  requiresClinicianReview: true;         // always true
  requiredReviewerRole: string;          // licensed role that must review
  suggestedOwner?: string;              // recommended staff role or individual
  fallbackAction: string;               // what to do if AI is unavailable
  auditMetadata: {
    requestedBy: string;                // user ID
    requestedAt: string;                // ISO timestamp
    intentVersion: string;              // prompt version
    modelId: string;                    // model used
  };
};
```

---

## Supported Intents

### 1. `triage_recommendation` ✅ Implemented

**When used:** Triage nurse requests decision support for CTAS assignment.  
**Inputs:** vitals, chief complaint, red flags, age, arrival mode, wait time.  
**Output:** Advisory CTAS level (1–5) with rationale and uncertainty.  
**Required reviewer:** `triage_nurse` (clinician owns the final CTAS assignment).  
**Source:** `src/lib/ai/careDroidAI.ts`

---

### 2. `patient_summary` ✅ Implemented

**When used:** Any clinical role requests a structured summary of the patient.  
**Inputs:** patient demographics, arrival data, triage data, vitals, notes.  
**Output:** One-line clinical summary, risk flags, missing information list.  
**Required reviewer:** `registered_nurse` or `emergency_physician`.  
**Source:** `src/lib/ai/careDroidAI.ts`

---

### 3. `critical_alert_assessment` ✅ Implemented

**When used:** A critical alert requires rapid AI assessment to support the clinical response.  
**Inputs:** alert source, severity, patient vitals and complaint, triage data.  
**Output:** Assessment of the clinical risk, recommended immediate action, suggested owner.  
**Required reviewer:** `emergency_physician` or `charge_nurse`.  
**Implementation:** Add handler in `src/lib/ai/careDroidAI.ts`. Use `alertEngine.ts` classification as input.

---

### 4. `three_minute_response_plan` ✅ Implemented

**When used:** Charge nurse or physician needs a structured plan for a critical/CTAS 1–2 patient.  
**Inputs:** patient full context (complaint, vitals, acuity, open alerts, staff available).  
**Output:** Structured plan with: 0–30s action, 30–60s action, 1–2min action, 2–3min escalation.  
**Required reviewer:** `emergency_physician`.  
**Implementation:** Add handler in `src/lib/ai/careDroidAI.ts`. Feeds from 3-minute timer state.

---

### 5. `patient_intake_assist` ✅ Implemented

**When used:** Triage nurse or charge nurse reviewing an intake record for risk completeness.  
**Inputs:** complaint text, red flags checked, vitals (if available), arrival mode.  
**Output:** Risk completeness assessment — what information is missing and why it matters.  
**Required reviewer:** `triage_nurse`.  
**Implementation:** Add handler. Can reuse complaint classification from intake flow.

---

### 6. `department_routing` ✅ Implemented

**When used:** Charge nurse or patient flow coordinator needs a routing recommendation.  
**Inputs:** patient acuity, complaint, open orders, department capacity snapshot.  
**Output:** Recommended destination (ED zone, lab, radiology, pharmacy, specialist, admission, transfer) with rationale.  
**Required reviewer:** `charge_nurse` or `patient_flow_coordinator`.  
**Implementation:** Add handler. Input from `buildBottleneckRegistrySnapshot()` for capacity context.

---

### 7. `staff_routing` ✅ Implemented (as `staff_resource_insight`)

**When used:** Charge nurse needs to know which nurse and physician to assign to a patient.  
**Inputs:** patient acuity, complaint, available staff (role + current patient load).  
**Output:** Recommended staff assignments with rationale.  
**Required reviewer:** `charge_nurse`.  
**Implementation:** Add handler. Input from staff availability in `emergencyStore.ts`.

---

### 8. `handoff_summary` ✅ Implemented

**When used:** Clinical staff is transferring a patient and needs a structured handoff document.  
**Inputs:** patient full record, current acuity, open alerts, recent vitals, owner, destination.  
**Output:** Structured handoff document: patient, acuity, risk, destination, owner, next action, AI recommendation status.  
**Required reviewer:** Sending clinician (physician or charge nurse).  
**Implementation:** Add handler. Output format follows standard handoff elements from the master manual.

---

### 9. `hospital_command_insight` ✅ Implemented

**When used:** Administrator, quality officer, or charge nurse needs aggregate department state.  
**Inputs:** full department snapshot (patients, alerts, capacity, bottlenecks, staff, timers).  
**Output:** Department summary with risk areas, bottleneck impacts, and recommended operational adjustments.  
**Required reviewer:** `charge_nurse`, `hospital_admin`, or `quality_safety_officer`.  
**Implementation:** Add handler. Input from `CareDroidCentralNodeSource` in `careDroidCentralNode.ts`.

---

### 10. `service_bottleneck_analysis` ✅ Implemented

**When used:** IT Admin or patient flow coordinator needs an analysis of current service degradation.  
**Inputs:** `BottleneckRegistrySnapshot` from `buildBottleneckRegistrySnapshot()`.  
**Output:** Analysis of which services are degraded, patient impact, risk projection, and recovery steps.  
**Required reviewer:** `it_admin` or `patient_flow_coordinator`.  
**Implementation:** Add handler. Direct input from `src/services/bottleneckRegistry.ts`.

---

### 11. `fallback_recommendation` ✅ Implemented

**When used:** Any role when AI or a specific service is unavailable.  
**Inputs:** current workflow context (which page, which action was being taken, current role).  
**Output:** Manual procedure steps for the current workflow without AI.  
**Required reviewer:** None — this is a pure manual guidance intent.  
**Implementation:** Add handler. Maps to manual topics from `src/config/userManual.config.ts`.

---

## Implementation Status

All 16 intents are implemented in `lib/ai/careDroidAI.ts`. The `HANDLERS` map at line 128 covers every intent in `CARE_DROID_AI_INTENTS`. `src/lib/ai/careDroidAI.ts` is a re-export barrel — always read the real implementation from the root `lib/` directory.

**Additional intents beyond the original 11 scope:**
- `wait_time_prediction` — ED queue wait time estimation
- `staff_resource_insight` — staffing gap and reallocation analysis
- `workflow_delay_analysis` — active workflow delay identification
- `three_minute_risk_projection` — projects breach risk from bottleneck state
- `operational_root_cause_summary` — root cause identification for operational issues
- `escalation_recommendation` — structured escalation decision support

**Next step for AI Chief:** Wire `service_bottleneck_analysis` and `three_minute_risk_projection` intents to live bottleneck registry data in the Copilot panel. Currently the panel requires the caller to pass `activeBottlenecks` manually — a future improvement is to auto-inject from `buildBottleneckRegistrySnapshot()` in `src/services/bottleneckRegistry.ts`.

---

## AI Routing by Alert Scenario

The `src/lib/users/aiChiefRouting.ts` file defines 12 clinical alert scenarios with ownership and escalation routing. This is separate from the intent handler system — it controls who receives alerts, not who handles AI intents. Both systems are complementary and should be kept in sync.

---

## Audit Requirements

Every AI Chief request and response must be logged in the audit trail:
- Request: intent, requestedBy (user ID + role), patient/department context, timestamp
- Response: full response object
- Decision: accepted / modified / overridden + reason
- Action taken: what clinical action followed the AI review (if any)
