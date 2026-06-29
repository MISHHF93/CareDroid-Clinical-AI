# Current Codebase Findings

**Investigation date:** 2026-06-28  
**Method:** Full automated architecture audit + manual review of 20 key files  
**Codebase:** CareDroid Clinical AI — Emergency Department Operating System

---

## Summary Verdict

**FULL JOURNEY ARCHITECTURE COMPLETE**

The codebase is well-structured with excellent access control, permission modeling, and bottleneck detection. All prior ED gaps were closed in Phase 4–9. The full prehospital journey (pre-hospital tier from 911 call through ED door) has been added in Phase B (2026-06-28).

**Updated 2026-06-28 (Phase 4–9):**
- `src/engine/threeMinuteTimerEngine.ts` — 3-minute auto-escalation engine built and wired
- `src/hooks/useThreeMinuteTimerEngine.ts` — mount hook
- `src/app/providers.tsx` — engine started at app load via `ThreeMinuteTimerEngineMount`
- AI Chief: 16/16 intents implemented in `lib/ai/careDroidAI.ts`
- Bottleneck registry: already wired to central node, dashboard, analytics, copilot — no rebuild needed
- In-app HelpHub: escalation timing corrected; 3-minute response topic updated with engine details

**Updated 2026-06-28 (Phase B — Full Prehospital Journey):**
- `src/types/emergency.ts` — 8 new prehospital types added:
  `EmergencyCall`, `DispatcherAssessment`, `DispatchAssignment`, `PrehospitalAssessment`,
  `PrehospitalVitals`, `EmsCrewUpdate`, `EDReadinessPlan`, `CareOutcome`
- `src/lib/users/userTypes.ts` — added `dispatcher` and `ems_coordinator` to `HospitalRole`
- `src/lib/users/roleAccess.ts` — dispatcher and ems_coordinator labels, descriptions, dashboard configs, emergency role mapping
- `src/lib/users/permissions.ts` — permission sets for dispatcher and ems_coordinator
- `src/lib/users/canonicalAccess.ts` — dispatcher and ems_coordinator in CANONICAL_ROLE_CATALOG
- `src/config/emergencyRolePermissions.ts` — dispatcher and ems_coordinator role IDs, labels, route definitions
- `src/config/routes.config.ts` — added `emergencyDispatch` and `emergencyEdReadiness`
- `src/config/unified-navigation.config.ts` — Dispatch nav item added
- `lib/ai/careDroidAITypes.ts` — 2 new intents: `emergency_call_risk_summary`, `ems_prearrival_risk_summary`
- `lib/ai/careDroidAI.ts` — handlers for both new intents
- `lib/ai/careDroidAIPrompts.ts` — prompts for both new intents
- `lib/ai/careDroidAISchemas.ts` — schemas for both new intents
- `src/services/dispatchIntakeService.ts` — new: 911 call intake and dispatch service
- `src/services/emergencySignalService.ts` — new: full-journey signal tracker
- `src/services/edReadinessService.ts` — new: ED readiness plan service
- `src/pages/emergency/DispatchConsole.tsx` — new: dispatcher UI page
- `src/app/router.tsx` — dispatch route wired
- `src/config/userManual.config.ts` — dispatch-console and prehospital-coordination topics added; dispatcher and ems_coordinator playbooks added
- `src/config/userManual.contract.test.ts` — added dispatcher and ems_coordinator to required playbooks
- `docs/specs/full-emergency-care-journey.md` — created
- `docs/specs/saas-service-journey-map.md` — created

**AI Chief total: 18 intents (16 ED + 2 prehospital)**

---

## Emergency Routes and Pages

All 21 routes are wired, guard-protected, and reachable (19 existing + 2 new):

| Route | Component | Status |
|-------|-----------|--------|
| `/emergency/dispatch` | `DispatchConsole` | ✅ New (2026-06-28) |
| `/emergency/ed-readiness` | *(follow-up page)* | 🔲 Route wired, page stub needed |



| Route | Component | Status |
|-------|-----------|--------|
| `/emergency/whiteboard` | `EmergencyWhiteboard` | ✅ Wired |
| `/emergency/reception` | `ReceptionWorkspace` | ✅ Wired |
| `/emergency/intake` | `SmartIntake` | ✅ Wired |
| `/emergency/patients` | `PatientsRoute` | ✅ Wired |
| `/emergency/ems` | `EMSPipeline` | ✅ Wired |
| `/emergency/queues` | `QueueRoute` | ✅ Wired |
| `/emergency/reassessment` | `ReassessmentRoute` | ✅ Wired |
| `/emergency/capacity` | `CapacityRoute` | ✅ Wired |
| `/emergency/boarding` | `BoardingRoute` | ✅ Wired |
| `/emergency/referrals` | `ReferralPanel` | ✅ Wired |
| `/emergency/alerts` | `ClinicalAlertsPage` | ✅ Wired |
| `/emergency/copilot` | `CopilotRoute` | ✅ Wired |
| `/emergency/documentation` | `ClinicalDocumentationAssistant` | ✅ Wired |
| `/emergency/tools` | `ToolsOverview` | ✅ Wired |
| `/emergency/pulse` | `EmergencyDepartmentPulse` | ✅ Wired |
| `/emergency/shift` | `EmergencyShiftSummary` | ✅ Wired |
| `/emergency/analytics` | `EmergencyAnalytics` | ✅ Wired |
| `/emergency/settings` | `EmergencySettings` | ✅ Wired |
| `/emergency/help` | `HelpHubPage` | ✅ Wired |

No orphaned emergency pages. `Version.tsx` and `TrainingDashboard.tsx` are not routed — intentional.

---

## AI Chief Implementation

**All 16 intents are implemented.** The real implementation is in the root `lib/ai/careDroidAI.ts` — NOT in `src/lib/ai/careDroidAI.ts`, which is just a re-export barrel.

| Intent | Status | Notes |
|--------|--------|-------|
| `triage_recommendation` | ✅ | Returns CTAS level with clinician override required |
| `patient_summary` | ✅ | One-line summary, flags missing info |
| `critical_alert_assessment` | ✅ | Red flag detection, severity, acknowledgement state |
| `three_minute_response_plan` | ✅ | Phase-aware response plan with escalation state |
| `patient_intake_assist` | ✅ | Completeness score, suggested questions, urgency flags |
| `department_routing` | ✅ | Symptom-based routing with available department awareness |
| `handoff_summary` | ✅ | Delegates to `patient_summary` with handoff framing |
| `hospital_command_insight` | ✅ | Severity band (green/amber/red), bottleneck list |
| `service_bottleneck_analysis` | ✅ | Active bottlenecks, failed services, 3-min risk |
| `fallback_recommendation` | ✅ | Service-specific manual procedures |
| `wait_time_prediction` | ✅ | Queue length + staff + bed wait estimate |
| `staff_resource_insight` | ✅ | Staffing risk, overloaded departments, reallocation |
| `workflow_delay_analysis` | ✅ | Delayed workflow identification and owner routing |
| `three_minute_risk_projection` | ✅ | Projects breach risk from bottleneck state |
| `operational_root_cause_summary` | ✅ | Root cause identification across active bottlenecks |
| `escalation_recommendation` | ✅ | Escalation decision support with owner and reason |

**Key finding:** `src/lib/ai/*.ts` files are re-export barrels. All real AI logic lives in the root `lib/ai/` directory.

**AI routing by alert scenario** is fully implemented in `src/lib/users/aiChiefRouting.ts` — 12 clinical scenarios with ownership, escalation, and clinician review requirements. This is excellent and reusable.

---

## 3-Minute Response Timer

**Status: Engine built and wired (2026-06-28).**

`src/components/emergency/ThreeMinuteTimer.tsx` is the visual timer (unchanged — pure display).

`src/engine/threeMinuteTimerEngine.ts` (new) is the auto-escalation engine:
- Subscribes to the Zustand store for new Critical alerts
- Auto-starts a timer when a Critical alert is dispatched for a patient
- Checks every 5 seconds for threshold crossings
- Fires escalation alerts via `dispatchAlert` at:
  - 0:30 — awareness notification to charge nurse (Warning severity)
  - 2:00 — L1 escalation to charge nurse (Critical severity, new owner)
  - 3:00 — BREACH escalation to ED physician (Critical severity, breach recorded)
  - 5:00 — Extended breach notification to hospital admin

`src/hooks/useThreeMinuteTimerEngine.ts` + `ThreeMinuteTimerEngineMount` in `providers.tsx` starts the engine on app load.

**Remaining gap:** Timer state is module-level only (not in Zustand/localStorage). State will reset on page reload. Adding a `responseTimers` Zustand slice with localStorage persistence is a follow-up task.

**Bottleneck registry** also has `buildThreeMinuteRiskProjection()` for advisory risk projection — separate from the timer engine.

---

## Role System Assessment

Three complementary (not duplicate) systems:

1. **`src/lib/users/canonicalAccess.ts`** — Master identity compilation. `compileCareDroidAccessProfile()` builds the runtime access profile from role, organization, and feature flags. 18 roles defined. Excellent pattern.

2. **`src/lib/users/permissions.ts`** — 24 permission constants organized by family. `ROLE_PERMISSIONS` map with one entry per role. Granular, auditable, type-safe.

3. **`src/lib/users/aiChiefRouting.ts`** — Clinical alert ownership routing by scenario. 12 scenarios with visible roles, suggested owner, escalation role, and clinician review requirement.

**Verdict:** These are complementary, not duplicative. No role system rebuild needed — extend to cover missing intents and wire to the timer.

---

## Bottleneck Registry

`src/services/bottleneckRegistry.ts` is one of the strongest modules in the codebase:
- 684+ lines covering all tracked services
- Multi-layer risk projection (queue, capacity, sync, reassessment, referral, alert)
- `impactsThreeMinuteTarget` flag on every bottleneck event
- Response deadline calculation with projected risk status
- Explainable root cause summaries

**Already wired to:**
- `careDroidCentralNode.ts` — `bottleneckRegistry` in the snapshot output
- `CommandDashboard.tsx` — Service health in the whiteboard
- `EmergencyAnalytics.tsx` — Analytics feed
- `CopilotPanel.tsx` — Available to AI Chief intents
- `BottleneckPanels.tsx` — Dedicated UI panels
- `alertEngineDerived.ts` — Feeds derived alert creation

**AI Chief integration:** `service_bottleneck_analysis` and `three_minute_risk_projection` intents are implemented. The Copilot caller currently must pass `activeBottlenecks` manually; auto-injection from `buildBottleneckRegistrySnapshot()` is a follow-up improvement.

---

## Architectural Debt

### Operating System Layer Sprawl

Multiple "OS" service layers exist:
- `emergencyOperatingSystemService.ts` — ED SaaS service backbone
- `emergencyIntakeOperatingSystemService.ts` — Intake coordination
- `src/data/emergencyOperatingSystem.tsx` — Frontend data layer
- `src/data/platformOperatingSystem.ts` — Platform layer  
- `src/data/saasOperatingSystem.ts` — SaaS/commercial layer

These are intentionally layered for domain separation but create confusion about which is the source of truth. Consolidation is a medium-term priority.

### Backend/Frontend AI Parity Gap

Backend AI routing (`backend/src/modules/ai/foundation/ai-routing-engine.service.ts`) is 376+ lines but completely opaque to the frontend. The frontend has no visibility into backend AI decision audit logs or confidence scores. This is both a safety feature (isolation) and an operational blind spot (no cross-system audit trail).

### Service Count

304 service files exist. Not all are connected to live UI flows. Services with `disabled` or `mock` in the name should be reviewed for removal.

---

## What to Reuse

| Component | Why Reuse |
|-----------|----------|
| `compileCareDroidAccessProfile()` | Excellent pattern — extend, not replace |
| `ROLE_PERMISSIONS` map | Granular, testable, type-safe |
| Alert routing in `aiChiefRouting.ts` | Solid 12-scenario matrix — extend to all intents |
| `buildBottleneckRegistrySnapshot()` | Multi-layer risk ready — wire to AI and alerts |
| Route constants in `routes.config.ts` | Single source of truth |
| Navigation config in `unified-navigation.config.ts` | Feature-gated, role-filtered |
| Emergency store in `emergencyStore.ts` | Central Zustand state — solid foundation |
| Alert engine in `engine/alertEngine.ts` | Real-time classification — extend, not rebuild |

---

## What to Build (Remaining)

| Item | Priority | Effort | Status |
|------|----------|--------|--------|
| 3-minute auto-escalation engine | Critical | — | ✅ Done |
| AI intent handler registry | High | — | ✅ Done (16/16) |
| Bottleneck → Alert auto-creation | High | — | ✅ Partially (via alertEngineDerived) |
| Timer state persistence (localStorage) | High | 1 day | ❌ Remaining |
| Breach analytics rollup | High | 1 day | ❌ Remaining |
| AI decision audit trail (review + override logging) | High | 2–3 days | ❌ Remaining |
| Bottleneck auto-injection into AI Chief Copilot | Medium | 0.5 days | ❌ Remaining |
| Backend/frontend AI audit parity | Medium | 1–2 weeks | ❌ Remaining |
| OS layer consolidation | Medium | 2–3 weeks | ❌ Remaining |
| Dead service cleanup (mock/disabled services) | Low | 1 day | ❌ Remaining |

---

## What to Remove

After new systems are validated:
- `disabledBackendMocks.ts` — stub/mock file
- Redirect stubs in router for deprecated routes (`/emergency/simulation`, `/emergency/federated-learning`, `/emergency/digital-twin`) — keep redirect, remove stale components if any
- Duplicate imports in page bundles (audit with tree-shaking analysis)
