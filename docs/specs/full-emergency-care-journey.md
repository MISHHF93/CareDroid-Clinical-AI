# Full Emergency-Care Journey

Mission: build CareDroid as the AI Chief of Staff for emergency response and hospital operations.

Core principle: "It takes 3 minutes to save someone's life."

Safety boundary: AI is decision support only. AI never replaces licensed dispatchers, paramedics, nurses, physicians, pharmacists, technicians, specialists, administrators, or quality/safety staff.

Runtime source: `src/services/fullEmergencyCareJourneyService.ts`

## End-To-End Journey

| # | Stage | Primary surface | Outcome |
|---|---|---|---|
| 1 | Emergency Event | `/emergency/dispatch` | Emergency signal captured from patient, bystander, caregiver, school, workplace, clinic, facility, transfer, walk-in, or staff alert. |
| 2 | Emergency Call / 911 Contact | `/emergency/dispatch` | Caller, location, symptoms, hazards, callback, and immediate risk indicators recorded. |
| 3 | Dispatcher Triage | `/emergency/dispatch` | Structured call assessment, EMS/fire/police need, response priority, and pre-arrival instructions documented. |
| 4 | Ambulance Dispatch | `/emergency/ems` | CAD/mock assignment chooses EMS unit based on location, availability, severity, and resources. |
| 5 | EMS En Route | `/emergency/ems` | Crew receives call details, suspected condition, location, hazards, and risk summary. |
| 6 | EMS Arrival and Scene Assessment | `/emergency/ems` | Scene safety, ABCs, vitals, chief complaint, medications, allergies, history, and red flags captured. |
| 7 | Prehospital Care | `/emergency/ems` | EMS interventions, updated severity, and transport decision recorded. |
| 8 | Hospital Pre-Arrival Notification | `/emergency/ems` | EMS-to-hospital packet alerts ED, triage, charge nurse, and physician. |
| 9 | ED Readiness | `/emergency/ed-readiness` | Bed, staff, equipment, specialty team, lab, radiology, and pharmacy preparation tracked. |
| 10 | Patient Arrival | `/emergency/reception` | Ambulance, walk-in, transfer, or referral enters the ED workflow. |
| 11 | Rapid Intake | `/emergency/intake` | Minimum life-critical data is captured or confirmed. |
| 12 | Triage | `/emergency/reception?queue=pretriage` | ESI-style five-level acuity support, vitals, red flags, and clinician override recorded. |
| 13 | AI Chief Review | `/emergency/copilot` | Risk, missing data, routing, next action, and escalation summarized for human review. |
| 14 | Clinical Action | `/emergency/whiteboard` | Nurse or physician reviews, accepts/modifies/dismisses AI recommendation, and begins care. |
| 15 | Diagnostics | `/emergency/diagnostics` | Labs, imaging, ECG, medication review, pharmacy, and consult workflows coordinated. |
| 16 | Treatment / Observation | `/emergency/whiteboard` | Care plan, monitoring, reassessment, interventions, and observation tracked. |
| 17 | Disposition | `/emergency/referrals` | Discharge, admit, transfer, observation, ICU, OR, or specialty care decision recorded. |
| 18 | Handoff / Reporting | `/emergency/handoffs` | Structured handoff to EMS, ED, department, inpatient team, transfer site, or discharge workflow. |
| 19 | Outcome Tracking | `/emergency/reports` | Response time, triage time, treatment time, delays, bottlenecks, and flow tracked. |
| 20 | Analytics Feedback | `/emergency/analytics` | Operational data improves staffing, routing, bottleneck detection, and 3-minute compliance. |

## Process Engine Loop

Emergency Signal -> Dispatch Intake -> EMS Assignment -> Prehospital Assessment -> Hospital Pre-Alert -> ED Readiness -> Patient Arrival -> Rapid Intake -> Triage -> AI Chief Recommendation -> Staff Routing -> 3-Minute Timer -> Acknowledgement -> Clinical Action -> Diagnostics/Treatment -> Handoff/Disposition -> Outcome Tracking -> Analytics Feedback.

## Required Pages

Implemented or mapped:

- Command Center: `/emergency/command-center`
- Emergency Call Intake: `/emergency/dispatch`
- EMS / Ambulance Board: `/emergency/ems`
- Pre-Arrival Notifications: `/emergency/ems`
- ED Readiness: `/emergency/ed-readiness`
- Patient Intake: `/emergency/intake`
- Patient Queue: `/emergency/queues`
- Triage: `/emergency/reception?queue=pretriage`
- Critical Alerts: `/emergency/alerts`
- AI Chief: `/emergency/copilot`
- Patient Profile: `/emergency/patients`
- Staff Command: `/staff`
- Departments: `/departments`
- Diagnostics: `/emergency/diagnostics`
- Handoffs: `/emergency/handoffs`
- Analytics: `/emergency/analytics`
- Reports: `/emergency/reports`
- Settings/Admin: `/emergency/settings`, `/admin`
- Help/User Manual: `/emergency/help`
