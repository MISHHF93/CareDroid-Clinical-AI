# CareDroid — Current Codebase Findings

**Audit date:** 2026-06-29  
**Branch:** codex/unified-caredroid-access  
**Build status:** ✅ Clean (TypeScript clean, Vite build success)

---

## Summary

The CareDroid codebase implements the full 20-stage emergency care lifecycle from
emergency signal and 911 call through EMS, ED care, disposition, and analytics. The prior
session (2026-06-28) built the prehospital tier, dispatcher and EMS coordinator roles, all data
models, the journey service, and the dispatch console.

**This session (2026-06-29)** fills remaining gaps:
- 4 missing standalone service files (CAD, Prehospital, Staff Routing, Diagnostics)
- Navigation — missing journey pages added to the sidebar
- FullJourneyOperatingPage enriched with real functional content per view
- Validation

---

## Phase 0 — What Exists

### Routes (src/app/router.tsx)

All 20+ journey routes are wired:

| Route | Component | Status |
|---|---|---|
| `/emergency/dispatch` | DispatchConsole | ✅ |
| `/emergency/ems` | EMSPipeline | ✅ |
| `/emergency/ed-readiness` | FullJourneyOperatingPage (view=ed-readiness) | ✅ |
| `/emergency/command-center` | FullJourneyOperatingPage (view=journey) | ✅ |
| `/emergency/journey` | FullJourneyOperatingPage (view=journey) | ✅ |
| `/emergency/diagnostics` | FullJourneyOperatingPage (view=diagnostics) | ✅ |
| `/emergency/handoffs` | FullJourneyOperatingPage (view=handoffs) | ✅ |
| `/emergency/reports` | FullJourneyOperatingPage (view=reports) | ✅ |
| `/emergency/reception` | ReceptionWorkspace | ✅ |
| `/emergency/intake` | SmartIntake | ✅ |
| `/emergency/queues` | QueueRoute | ✅ |
| `/emergency/alerts` | ClinicalAlertsPage | ✅ |
| `/emergency/copilot` | CopilotRoute | ✅ |
| `/emergency/capacity` | CapacityRoute | ✅ |
| `/emergency/patients` | PatientsRoute | ✅ |
| `/emergency/analytics` | EmergencyAnalytics | ✅ |
| `/emergency/settings` | EmergencySettings | ✅ |
| `/emergency/help` | HelpHubPage | ✅ |
| `/emergency/shift` | EmergencyShiftSummary | ✅ |
| `/emergency/whiteboard` | EmergencyWhiteboard | ✅ |
| `/staff` | TeamManagement | ✅ |
| `/departments` | CapacityRoute | ✅ |

### Data Models (src/types/emergency.ts)

All required types exist and are fully typed:

- `EmergencyCall`, `DispatcherAssessment`, `DispatchAssignment` ✅
- `PrehospitalAssessment`, `PrehospitalVitals`, `EmsCrewUpdate`, `PrehospitalPacket` ✅
- `EDReadinessPlan` ✅
- `Patient`, `PatientSignal` ✅
- `TriageAssessment` ✅
- `CriticalAlert`, `ThreeMinuteResponse` ✅
- `AIChiefRecommendation` ✅
- `StaffAssignment`, `DepartmentCapacity` ✅
- `DiagnosticOrder`, `HandoffSummary` ✅
- `BottleneckEvent`, `ServiceHealth`, `CareOutcome` ✅

### Services — Existing

| Service | File | Journey Stages |
|---|---|---|
| EmergencySignalService | src/services/emergencySignalService.ts | 1, 2, 11 |
| DispatchIntakeService | src/services/dispatchIntakeService.ts | 2, 3 |
| EMSUnitService | store/emergencyStore.ts + emsPreArrivalPipelineService.ts | 4, 5, 10 |
| PreArrivalNotificationService | src/services/preArrivalNotification.ts | 8 |
| EDReadinessService | src/services/edReadinessService.ts | 9 |
| PatientIntakeService | src/services/emergencyIntakeOperatingSystemService.ts | 10, 11 |
| TriageService | src/services/triageAssist.ts + triageEngine.ts | 12, 16 |
| AIChiefService | src/services/careDroidBrainService.ts + emergencyCopilotApi.ts | 3, 8, 13 |
| CriticalAlertService | src/engine/alertEngine.ts + src/services/clinicalAlertsApi.ts | 8, 14, 16 |
| ThreeMinuteResponseService | src/engine/threeMinuteTimerEngine.ts | 7, 12 |
| DepartmentCapacityService | src/services/emergencyCapacityIntelligenceService.ts | 9, 16, 17 |
| HandoffService | src/services/ambulanceHandoffChecklist.ts + handoffClose.ts | 17, 18 |
| BottleneckRegistryService | src/services/bottleneckRegistry.ts | 13, 20 |
| AnalyticsService | src/services/analyticsService.ts + emergencyAnalyticsApi.ts | 19, 20 |
| HelpManualService | src/config/userManual.config.ts + HelpHubPage.tsx | 20 |
| FullEmergencyCareJourneyService | src/services/fullEmergencyCareJourneyService.ts | ALL |

### Services — Missing Before This Session

| Service | Gap | Action |
|---|---|---|
| CADIntegrationService | No standalone file — mock in journey map only | Created src/services/cadIntegrationService.ts |
| PrehospitalAssessmentService | No standalone file — types only | Created src/services/prehospitalAssessmentService.ts |
| StaffRoutingService | Scattered in emergencyStore.ts | Created src/services/staffRoutingService.ts |
| DiagnosticsCoordinationService | No file — journey page aggregate only | Created src/services/diagnosticsCoordinationService.ts |

### Pages — Navigation Gaps Before This Session

| Page | Route | Fix |
|---|---|---|
| Command Center | /emergency/command-center | Added to sidebar |
| ED Readiness | /emergency/ed-readiness | Added to sidebar |
| Critical Alerts | /emergency/alerts | Added to sidebar |
| Diagnostics | /emergency/diagnostics | Added to sidebar |
| Handoffs | /emergency/handoffs | Added to sidebar |
| Reports | /emergency/reports | Added to sidebar |

### User Roles

21 hospital roles defined in `src/lib/users/`:
super_admin, hospital_admin, ed_director, charge_nurse, triage_nurse, registered_nurse,
emergency_physician, attending_physician, resident_physician, specialist, paramedic,
registration_clerk, patient_flow_coordinator, lab_technician, radiology_technician,
pharmacist, social_worker, security_officer, it_admin, quality_safety_officer, demo_observer

Emergency roles: `dispatcher`, `ems_coordinator` also active.

### AI Chief

18 AI intents in `src/lib/ai/careDroidAI.ts` including:
- `emergency_call_risk_summary`
- `ems_prearrival_risk_summary`
- `triage_recommendation`
- `department_routing`
- `staff_routing`
- `handoff_summary`
- `bottleneck_analysis`
- `fallback_recommendation`

### 3-Minute Response

`src/engine/threeMinuteTimerEngine.ts` — timer engine  
`src/components/emergency/ThreeMinuteTimer.tsx` — timer UI  
`ThreeMinuteResponse` type — full phase model (0-30s identify, 30-60s notify, 60-120s route, 120-180s escalate, >180s breach)

---

## What Was Built in This Session

1. `src/services/cadIntegrationService.ts` — CAD dispatch stub with unit registry and assignment tracking
2. `src/services/prehospitalAssessmentService.ts` — Full EMS field lifecycle: assessment, vitals, interventions, packet transmission
3. `src/services/staffRoutingService.ts` — Staff routing assignments by alert/patient/role with workload awareness
4. `src/services/diagnosticsCoordinationService.ts` — Diagnostic order management: lab, imaging, ECG, pharmacy, consults
5. Navigation — Added command-center, ed-readiness, alerts, diagnostics, handoffs, reports to sidebar
6. fullEmergencyCareJourneyService.ts — Updated to reference all new services
7. FullJourneyOperatingPage — Enriched each view with real functional content

---

## Fixes Applied (2026-06-29 continuation)

### Route Redirect Cleanup — src/config/routes.config.ts

6 stale entries removed or corrected:

| Fix | Before | After |
|---|---|---|
| LEGACY_EMERGENCY_ROUTE_REDIRECTS `/emergency/command-center` | Redirected to emergencyWhiteboard (dead code — explicit route exists) | Removed |
| LEGACY_EMERGENCY_ROUTE_REDIRECTS `/emergency/journey` | Redirected to emergencyPatients (dead code — explicit route exists) | Removed |
| LEGACY_EMERGENCY_ROUTE_REDIRECTS `/workspace/emergency/journey` | → emergencyPatients | → emergencyJourney |
| LEGACY_EMERGENCY_ROUTE_REDIRECTS `/workspace/emergency/command-center` | → emergencyWhiteboard | → emergencyCommandCenter |
| WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS `journey` | → emergencyPatients | → emergencyJourney |
| WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS `command-center` | → emergencyWhiteboard | → emergencyCommandCenter |

### Surface Registry Additions — src/config/emergencyPipelineModel.ts

10 new entries added to `EMERGENCY_SURFACE_REGISTRY` (were orphans in nav coverage audit):

| Surface | Route | Zone | Nav |
|---|---|---|---|
| command-center | /emergency/command-center | CLINICAL | sidebar: command-center |
| journey | /emergency/journey | CLINICAL | sidebar: command-center (shared) |
| dispatch | /emergency/dispatch | PIPELINE | sidebar: dispatch |
| ed-readiness | /emergency/ed-readiness | PIPELINE | sidebar: ed-readiness |
| documentation | /emergency/documentation | RETAINED | no sidebar (AI Copilot link) |
| diagnostics | /emergency/diagnostics | CLINICAL | sidebar: diagnostics |
| handoffs | /emergency/handoffs | CLINICAL | sidebar: handoffs |
| reports | /emergency/reports | UTILITY | sidebar: reports |
| alerts | /emergency/alerts | CLINICAL | sidebar: alerts |
| help | /emergency/help | RETAINED | sidebar: help |

### Nav Coverage Audit — qa/emergency-nav-coverage-report.json

Before: `passesAudit: false` — 10 orphan routes  
After: `passesAudit: true` — 0 orphans, all routes covered

`src/config/emergencyNavCoverageAudit.test.ts` — 1 passed ✅  
`src/config/emergencyPipelineModel.test.ts` — 5 passed ✅

---

## Build Validation

TypeScript: ✅ clean (0 errors)  
ESLint: ✅ clean  
Vite build: ✅ success (pre-existing chunk size warning on data-navigation chunk only)  

### Test Suite Summary

| Suite | Status |
|---|---|
| src/config/emergencyPipelineModel.test.ts | ✅ 5 passed |
| src/config/emergencyNavCoverageAudit.test.ts | ✅ 1 passed |
| src/services/ (all new services) | ✅ passed |
| src/config/ overall | 4 pre-existing failures, 79 passed |
| Full suite pre-existing failures | emergencyMultiScreenConvergence, emergencyOperationalPresentationModel (2), userProfileCatalog, userProfileIsolation (3) |

Pre-existing failures confirmed by running test suite on base commit before any changes — same 4 test files fail identically on prior commit.
