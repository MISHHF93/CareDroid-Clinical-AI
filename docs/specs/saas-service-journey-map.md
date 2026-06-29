# SaaS Service Journey Map

**Status:** Defined 2026-06-28. Maps 20 CareDroid SaaS service modules to their journey stages.  
**Cross-reference:** `docs/specs/full-emergency-care-journey.md`

---

## Service Registry

Each service below maps to one or more journey stages. Reused services existed before 2026-06-28. New/extended services were created or extended as part of the full-journey rebuild.

| # | Service Module | Journey Stages | Location | Status |
|---|---------------|---------------|----------|--------|
| 1 | EmergencySignalService | All 20 stages | `src/services/emergencySignalService.ts` | ✅ New |
| 2 | DispatchIntakeService | 1–4 (call, triage, dispatch) | `src/services/dispatchIntakeService.ts` | ✅ New |
| 3 | CADIntegrationService | 4 (unit assignment) | `src/services/cadIntegrationService.ts` | 🔲 Stub needed |
| 4 | EMSUnitService | 5–9 (en route, scene, transport) | `src/services/emsPreArrivalPipelineService.ts` | ✅ Reused + extended by types |
| 5 | PrehospitalAssessmentService | 6–7 (scene, prehospital care) | `src/types/emergency.ts` (types only) | ✅ Types; service stub needed |
| 6 | PreArrivalNotificationService | 8 (MIST/SBAR to ED) | `src/services/preArrivalNotification.ts` | ✅ Reused |
| 7 | EDReadinessService | 9 (bay prep, staff, equipment) | `src/services/edReadinessService.ts` | ✅ New |
| 8 | PatientIntakeService | 10–11 (arrival, intake) | `src/services/smartIntakeApi.ts` + `arrivalControlLayer.ts` | ✅ Reused |
| 9 | TriageService | 12 (acuity, vitals, flags) | `src/services/triageAssist.ts` + `triageAssistSignOff.ts` | ✅ Reused |
| 10 | AIChiefService | 13–18 (all clinical + prehospital) | `lib/ai/careDroidAI.ts` | ✅ Reused (18 intents) |
| 11 | CriticalAlertService | 12–16 (any critical trigger) | `src/engine/alertEngine.ts` + `alertEngineDerived.ts` | ✅ Reused |
| 12 | ThreeMinuteResponseService | 12–16 (timer, escalation) | `src/engine/threeMinuteTimerEngine.ts` | ✅ Reused (built 2026-06-28) |
| 13 | StaffRoutingService | 13–17 (assignments, escalation) | `src/lib/users/aiChiefRouting.ts` | ✅ Reused |
| 14 | DepartmentCapacityService | 9, 15–17 (capacity, boarding) | `src/services/emergencyCapacityIntelligenceService.ts` | ✅ Reused |
| 15 | DiagnosticsCoordinationService | 15 (labs, imaging) | Orders system + lab/imaging alert hooks | ✅ Reused (partial) |
| 16 | HandoffService | 18 (SBAR, transfer, sign-off) | `src/services/receptionHandoff.ts` + `handoff_summary` AI intent | ✅ Reused |
| 17 | BottleneckRegistryService | All operational stages | `src/services/bottleneckRegistry.ts` | ✅ Reused (fully wired) |
| 18 | AnalyticsService | 20 (breach, KPI, outcomes) | `src/services/analyticsService.ts` | ✅ Reused |
| 19 | ReportingService | 20 (reports, exports) | `src/services/emergencyAnalyticsApi.ts` | ✅ Reused |
| 20 | HelpManualService | All stages | `src/config/userManual.config.ts` | ✅ Reused + Extended |

---

## Service ↔ Journey Stage Matrix

```
Stage                        │ 1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
─────────────────────────────┼────────────────────────────────────────────────────────────────
EmergencySignalService       │ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
DispatchIntakeService        │ ●  ●  ●  ●  ○  ○  ○  ○  ○
CADIntegrationService        │          ●  ●
EMSUnitService               │             ●  ●  ●  ●  ●  ●
PrehospitalAssessmentService │                ●  ●  ●  ●
PreArrivalNotificationService│                         ●
EDReadinessService           │                            ●
PatientIntakeService         │                               ●  ●
TriageService                │                                     ●
AIChiefService               │    ○        ○  ○  ○  ○  ○  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
CriticalAlertService         │                            ○        ●  ●  ●  ●  ●
ThreeMinuteResponseService   │                         ○     ○     ●  ●  ●  ●
StaffRoutingService          │                                        ●  ●  ●  ●  ●  ●
DepartmentCapacityService    │                            ●              ●  ●  ●
DiagnosticsCoordinationService│                                              ●
HandoffService               │                                                       ●
BottleneckRegistryService    │             ○  ○  ○  ○  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
AnalyticsService             │                                                          ●
ReportingService             │                                                          ●
HelpManualService            │ ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●

● Primary service for this stage
○ Advisory / observing this stage
```

---

## Service Detail

### 1. EmergencySignalService *(New)*

**File:** `src/services/emergencySignalService.ts`  
**Purpose:** Full-journey audit trail. Captures a `JourneySignal` at each stage transition for every emergency event. Connects the call-to-outcome lifecycle without duplicating state owned by other services.

**Key types:** `EmergencyJourneyTrace`, `JourneySignal`, `JourneyStage`  
**Key functions:** `startJourney()`, `advanceJourney()`, `markThreeMinuteBreach()`, `getJourneyMetrics()`

---

### 2. DispatchIntakeService *(New)*

**File:** `src/services/dispatchIntakeService.ts`  
**Purpose:** 911 call logging, dispatcher triage, call priority assignment, EMS unit dispatch tracking.

**Key types:** `EmergencyCall`, `DispatcherAssessment`, `DispatchAssignment`  
**Key functions:** `createEmergencyCall()`, `createDispatcherAssessment()`, `createDispatchAssignment()`, `updateCallStatus()`, `getDispatchSummary()`

---

### 3. CADIntegrationService *(Stub needed)*

**Stub location:** Not yet created  
**Purpose:** Computer-Aided Dispatch integration. Will receive CAD event feeds, map to CareDroid `EmergencyCall` records, and relay unit status changes in real time.  
**Integration target:** External CAD systems (e.g., Motorola PremierOne, Hexagon, Tyler)  
**Data contract:** Maps CAD events to `DispatchAssignment.status` transitions

---

### 4. EMSUnitService — `emsPreArrivalPipelineService.ts` *(Reused)*

**File:** `src/services/emsPreArrivalPipelineService.ts`  
**Purpose:** Manages inbound EMS unit data pipeline: field vitals, crew assessment workflow, ETA tracking, and ED pre-alert generation.  
**Extended by:** New `PrehospitalAssessment`, `EmsCrewUpdate` types in `emergency.ts`

---

### 5. PrehospitalAssessmentService *(Types complete; service stub needed)*

**Current state:** Full type definitions in `src/types/emergency.ts`:
- `PrehospitalAssessment` — field vitals history, interventions, medications, clinical alerts
- `PrehospitalVitals` — per-capture vitals snapshot
- `EmsCrewUpdate` — real-time update events from crew

**Next step:** Create `src/services/prehospitalAssessmentService.ts` to manage assessment lifecycle, vitals capture, and pre-alert trigger logic.

---

### 6. PreArrivalNotificationService *(Reused)*

**File:** `src/services/preArrivalNotification.ts`  
**Purpose:** Formats and transmits structured MIST or SBAR pre-arrival notifications from EMS to the receiving ED.  
**Already wired to:** `arrivalControlLayer`, `emsPreArrivalPipelineService`, `resourceActivation`

---

### 7. EDReadinessService *(New)*

**File:** `src/services/edReadinessService.ts`  
**Purpose:** Creates and tracks `EDReadinessPlan` — bay assignment, staff notification, equipment checklist, specialty team callbacks.  
**Trigger:** Pre-arrival notification for Echo/Delta patients  
**Key functions:** `createReadinessPlan()`, `notifyStaff()`, `checkEquipmentItem()`, `markReady()`, `getReadinessSummary()`

---

### 8. PatientIntakeService *(Reused)*

**Files:** `src/services/smartIntakeApi.ts`, `src/services/arrivalControlLayer.ts`, `src/services/intakeEncounter.ts`  
**Purpose:** Walk-in and EMS conversion to patient record. Normalizes arrival data, creates encounter, routes to queue.

---

### 9. TriageService *(Reused)*

**Files:** `src/services/triageAssist.ts`, `src/services/triageAssistSignOff.ts`, `src/services/highRiskComplaintFlags.ts`  
**Purpose:** AI-assisted CTAS/ESI acuity suggestion, red flag detection, nurse sign-off, breach timer triggers.

---

### 10. AIChiefService *(Reused — 18 intents)*

**File:** `lib/ai/careDroidAI.ts`  
**Purpose:** All 18 AI intent handlers for decision support across the full journey.  
**New intents added 2026-06-28:**
- `emergency_call_risk_summary` — call-level risk from complaint + patient status
- `ems_prearrival_risk_summary` — prehospital vitals + crew alerts → ED prep recommendations  

**AI is decision support only at every stage.**

---

### 11. CriticalAlertService *(Reused)*

**Files:** `src/engine/alertEngine.ts`, `src/engine/alertEngineDerived.ts`  
**Purpose:** Classifies, dispatches, and routes critical alerts. Feeds the 3-minute timer engine.

---

### 12. ThreeMinuteResponseService *(Reused — built 2026-06-28)*

**File:** `src/engine/threeMinuteTimerEngine.ts`  
**Purpose:** Auto-escalation engine. Subscribes to Critical alerts, auto-starts timers, fires escalation alerts at 30s/2m/3m/5m.

---

### 13. StaffRoutingService *(Reused)*

**File:** `src/lib/users/aiChiefRouting.ts`  
**Purpose:** 12-scenario clinical alert ownership matrix. Maps alert type → suggested owner → escalation role → clinician review requirement.

---

### 14. DepartmentCapacityService *(Reused)*

**File:** `src/services/emergencyCapacityIntelligenceService.ts`  
**Purpose:** Real-time capacity scoring (0-100, Green/Yellow/Orange/Red), boarding tracking, queue optimization.

---

### 15. DiagnosticsCoordinationService *(Reused — partial)*

**Purpose:** Critical lab results fire via alert engine hooks. Imaging order workflow exists. Full diagnostics coordination service (order bundling, result interpretation, reflex testing) is a follow-up build.

---

### 16. HandoffService *(Reused)*

**Files:** `src/services/receptionHandoff.ts`, `handoff_summary` AI intent  
**Purpose:** SBAR handoff generation, ambulance handoff checklist completion, inpatient transfer sign-off.

---

### 17. BottleneckRegistryService *(Reused — fully wired)*

**File:** `src/services/bottleneckRegistry.ts`  
**Purpose:** Multi-layer risk projection across all tracked services. `impactsThreeMinuteTarget` flag on every bottleneck event.  
**Already wired to:** Central node, analytics, copilot panel, whiteboard command dashboard.

---

### 18. AnalyticsService *(Reused)*

**File:** `src/services/analyticsService.ts`  
**Purpose:** Department KPI aggregation — throughput, LOS, breach rate, capacity bands, EMS offload times.

---

### 19. ReportingService *(Reused)*

**File:** `src/services/emergencyAnalyticsApi.ts`  
**Purpose:** Analytics backend API — exports, scheduled reports, trend analysis.

---

### 20. HelpManualService *(Reused — extended)*

**File:** `src/config/userManual.config.ts`  
**Purpose:** Single source of truth for in-app HelpHub content. Extended 2026-06-28 with:
- `dispatch-console` topic — 911 call intake procedure
- `prehospital-coordination` topic — EMS pre-arrival relay
- `dispatcher` role playbook
- `ems_coordinator` role playbook

---

## Reuse vs New Summary

| Category | Count | Files |
|----------|-------|-------|
| Fully reused (unchanged) | 13 | All existing services |
| Reused + type-extended | 2 | `emsPreArrivalPipelineService`, `preArrivalNotification` |
| Reused + content-extended | 1 | `userManual.config.ts` |
| Newly created this session | 3 | `emergencySignalService`, `dispatchIntakeService`, `edReadinessService` |
| Stub/next-phase | 2 | `CADIntegrationService`, `PrehospitalAssessmentService` |

---

## Follow-Up Build Items (Not This Session)

| Item | Priority | Effort |
|------|----------|--------|
| `CADIntegrationService` — real CAD feed | High | 1–2 weeks |
| `PrehospitalAssessmentService` — full field lifecycle | High | 2–3 days |
| Timer state persistence (Zustand + localStorage) | High | 1 day |
| Breach analytics rollup to `CareOutcome` | High | 1 day |
| ED Readiness Plan wired to EMS Pipeline UI | Medium | 2 days |
| Prehospital vitals trend display in EMS pipeline | Medium | 2 days |
| `CareOutcome` records wired to analytics | Medium | 1 day |
| Journey trace viewer in analytics | Low | 2 days |
