# CareDroid Gap Analysis

**Generated:** 2026-06-28  
**Method:** Compare current implementation against CareDroid mission objectives

---

## Mission Objectives Review

> CareDroid exists to help hospitals save more lives by reducing the administrative time between patient arrival and clinician action.  
> North star: **"It takes 3 minutes to save someone's life."**

---

## Objective 1: Reduce Intake Time

### Current Implementation
- Smart Intake form captures chief complaint, demographics
- AI classifies chief complaint automatically
- Reception workflow embeds intake for registration clerks
- EMS conversion from pipeline directly creates patient record
- Self-arrival check-in available for low-acuity patients

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| EMS → reception conversion requires multiple clicks | Medium | High |
| No pre-fill from previous visit data | Medium | Medium |
| Intake step count not optimized (no shortcut for critical presentations) | High | High |
| No real-time "time to triage" display during intake | Medium | Medium |

### Recommendations
1. Add "Emergency Override" button in intake — registers minimal data (name, complaint, DOB) in one step for critical presentations
2. Display a live timer from "started intake" to "in pretriage" to motivate speed
3. Pre-fill from MRN lookup if patient has previous visit data

---

## Objective 2: Reduce Triage Time

### Current Implementation
- Triage Queues page with pretriage filter
- AI Triage Assist Panel suggests scores and flags
- NEWS2 auto-calculated from entered vitals
- Critical patterns trigger CriticalAlertBanner

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| AI Triage Assist Panel is available but not always prominent | High | High |
| No time-to-triage countdown visible to triage nurse | Medium | Medium |
| No clinical calculator shortcut from triage form | Medium | Low |
| Acuity assignment UI could be faster (requires scrolling) | Low | Low |

### Recommendations
1. Make AI Triage Assist Panel persistent and visible by default (not collapsible on first use)
2. Add time-from-registration counter to patient card header during triage
3. Add inline quick-score calculator (NEWS2, qSOFA) directly in triage form

---

## Objective 3: Reduce Administrative Burden

### Current Implementation
- AI Copilot generates patient summaries
- Clinical Documentation Assistant (ambient scribe)
- AI auto-classifies chief complaints
- AI calculator recommendations reduce manual scoring
- Reception handoff automates queue transitions

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| Clinical Documentation Assistant is available but not surfaced prominently | High | High |
| No auto-populated note templates from patient card data | Medium | Medium |
| Reassessment documentation requires manual entry | Medium | Medium |
| Shift summary is not automatically sent to incoming nurse | Low | Low |

### Recommendations
1. Surface Clinical Documentation Assistant link directly on patient card
2. Pre-populate note template with patient name, DOB, chief complaint, vitals from active record
3. Enable auto-generation of shift summary email/notification

---

## Objective 4: Reduce Duplicate Documentation

### Current Implementation
- Reception intake flows into triage without re-entry
- Patient card maintains full journey (intake → triage → assessment)
- EMS conversion pre-fills from unit data
- AI Copilot reads existing patient data for summaries

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| Vitals entered at triage may need re-entry in physician notes | High | High |
| No EHR writeback — documentation exists only in CareDroid | Critical | High |
| Referral information is not auto-populated into specialist consult note | Medium | Medium |

### Recommendations
1. Link vitals auto-populated into clinical documentation template
2. EHR integration roadmap required (FHIR/HL7 writeback)
3. Add referral details to clinical note context when creating referral-related documentation

---

## Objective 5: Improve Patient Information Quality

### Current Implementation
- Structured intake form captures demographics, chief complaint, vitals
- AI assists with chief complaint classification
- Patient flags (HighRisk, SepsisAlert, etc.) surfaced visually
- Patient timeline visible in patient detail panel

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| Allergy data entered but not prominently displayed in drug checker | High | High |
| Previous visit data not surfaced during current visit | Medium | High |
| No photo ID capture in reception workflow | Low | Low |

### Recommendations
1. Display allergy alerts prominently in patient card header and drug interaction checker
2. Surface "Last visit: [X days ago]" with chief complaint from previous visit during intake

---

## Objective 6: Improve Operational Visibility

### Current Implementation
- Department whiteboard with multi-mode display
- Department Pulse with live bottleneck registry
- Command Center throughput KPI dashboard
- Capacity crisis mode auto-activates
- EMS offload tracker with breach alerts
- Wall display modes (public waiting, department status)

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| BRAG 10-hour forecast is available but not prominently presented to charge nurse | Medium | Medium |
| No predicted discharge time on boarding patients | Medium | High |
| No staff utilization view (who is overloaded, who is available) | High | High |
| Public waiting room display doesn't show personalized patient status | Low | Low |

### Recommendations
1. Add "Crowding forecast" chip to charge nurse operational strip showing BRAG band
2. Add estimated discharge time to boarding patient cards (AI-predicted from LOS model)
3. Add staff utilization panel to command center view

---

## Objective 7: Improve Patient Throughput

### Current Implementation
- Queue intelligence panel shows breach risk
- Reassessment timers track patients through ED
- Boarding management tracks admitted patients
- Capacity management prevents overcrowding

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| No bottleneck detection between triage and physician assignment | High | High |
| Long provider wait times are shown but not acted on automatically | Medium | Medium |
| No automated escalation for patients exceeding LOS targets | High | High |

### Recommendations
1. Add "Provider wait breach approaching" alert for P2/P3 patients (similar to triage breach)
2. Add LOS target tracking per acuity — surface patients approaching their LOS target

---

## Objective 8: Improve Clinician Efficiency

### Current Implementation
- Persistent AI Copilot panel in sidebar
- 242 clinical tools available in one hub
- Calculator recommendations from AI
- Patient summary AI
- Clinical timeline

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| Copilot panel is always open but may not be discovered by new users | Medium | Medium |
| Tool catalog search requires knowing the tool name | Medium | Low |
| No patient-context-aware tool suggestions on patient card | High | High |

### Recommendations
1. Add "Quick tools" button to patient card that suggests relevant calculators based on chief complaint and acuity
2. Add symptom-based search to tool catalog ("chest pain" → shows HEART, Wells PE, Troponin interpreter)

---

## Objective 9: Support the First 3 Minutes

### Current Implementation
- Critical Alert Banner (visible, above-fold)
- Reassessment attention strips
- EMS countdown timers
- Bottleneck registry critical severity detection
- Three-minute response loop UI components exist in features/whiteboard/

### Gaps
| Gap | Impact | Priority |
|-----|--------|----------|
| Three-minute response loop UI is built but not wired to a visible timer on the whiteboard | High | Critical |
| No visual acknowledgment of 3-minute compliance | High | High |
| Critical alert resolution time is not tracked or displayed | High | High |

### Recommendations
1. **Wire the 3-minute response loop timer to the critical alert banner** — display elapsed time from alert to acknowledgment
2. Add response time compliance metric to Analytics and Command Center
3. Display `3:00` countdown on patient card when critical alert is raised for that patient

---

## Priority Improvement Summary

| Priority | Item | Phase |
|----------|------|-------|
| Critical | Wire 3-minute timer to critical alerts on whiteboard | Phase 9 |
| High | Add "Emergency Override" fast intake for critical presentations | Phase 10 |
| High | Surface Clinical Documentation Assistant on patient card | Phase 10 |
| High | Add provider wait breach alerts (P2/P3) | Phase 9 |
| High | Add LOS target tracking per patient | Phase 9 |
| High | Surface staff utilization in command center | Phase 9 |
| Medium | Pre-populate note templates from patient card vitals | Phase 10 |
| Medium | BRAG forecast chip on charge nurse operational strip | Phase 9 |
| Medium | Add "Quick tools" to patient card based on complaint | Phase 10 |
| Low | Patient room display with personalized status | Phase 11 |

---

## Completeness Score (Current Implementation)

| Objective | Score | Notes |
|-----------|-------|-------|
| Reduce intake time | 70% | Reception workflow strong; intake speed gaps remain |
| Reduce triage time | 65% | AI Triage Assist exists; visibility and speed not optimal |
| Reduce admin burden | 60% | Documentation AI exists; not prominently surfaced |
| Reduce duplicate documentation | 50% | EHR integration absent; within-CareDroid flow good |
| Improve patient information quality | 65% | Rich data model; allergy surfacing gaps |
| Improve operational visibility | 80% | Strong whiteboard + pulse + command center |
| Improve patient throughput | 65% | Queue management good; LOS tracking absent |
| Improve clinician efficiency | 70% | Copilot strong; context-aware suggestions missing |
| Support 3-minute response | 75% | Infrastructure exists; timer wiring incomplete |

**Overall Mission Alignment Score: 67%**

Key unlocking investment: wiring the 3-minute timer, surfacing documentation AI, and adding LOS tracking would take this to ~85%.
