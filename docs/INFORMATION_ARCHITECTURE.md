# CareDroid Clinical Intelligence Platform — Information Architecture (IA)

**Document Version:** 2.2.0  
**Status:** Living Architectural Specification / Navigation Authority  
**Author:** CareDroid Healthcare Informatics & Enterprise Architecture  

---

## 1. Executive Overview

CareDroid’s Information Architecture organizes complex clinical operations into intuitive, role-tailored cognitive zones. Rather than presenting clinicians with monolithic database forms, CareDroid arranges workflows around the patient’s longitudinal emergency journey, department surge dynamics, and clinical decision points.

---

## 2. Core Route Hierarchy & Canonical Topology

The platform’s routes are strictly governed by `src/config/routes.config.ts` and `src/lib/users/canonicalAccess.ts`:

```
CareDroid Root (/)
│
├── Clinical Operations (/emergency)
│   ├── Reception & Intake (/reception)
│   │   ├── Self-Arrival Kiosk (/kiosk/arrival)
│   │   └── Fast Demographic Intake
│   ├── Clinical Triage (/triage)
│   │   ├── CTAS / ESI Acuity Assignment
│   │   └── Initial Vital Sign Recording
│   ├── Department Whiteboard (/whiteboard)
│   │   ├── Patient Grid View (By Bed / Pod / Zone)
│   │   ├── Patient Detail Drawer
│   │   └── Quick Order / Status Entry
│   ├── Active Encounters & Patient Directory (/patients)
│   │   └── Patient Longitudinal Detail View
│   ├── Inbound EMS & Ambulance Bay (/ems)
│   │   ├── Pre-arrival Telemetry Feed
│   │   └── Handoff Documentation & Bed Allocation
│   ├── Bed Capacity & Surge Management (/capacity)
│   │   ├── Bed Board & Flow Bottlenecks
│   │   └── Admission Holding / Boarding Queue
│   └── Reassessment & Deterioration Watch (/reassessment)
│       └── Timed Reassessment Due Alerts
│
├── Clinical Intelligence & Decision Support (/tools)
│   ├── Pediatric Dosing & Safety Checker (/tools?open=pediatric-dose-safety-checker)
│   ├── Clinical Calculators Hub (/tools?filter=calculator)
│   │   ├── Wells Score, PERC, Glasgow Coma Scale, HEART Score
│   │   └── Renal Dosing Adjuster
│   ├── AI Clinical Scribe & Copilot (/tools?filter=ai)
│   └── Evidence & Guidance Reference (/tools?filter=guidance)
│
├── Communications & Alerts (/alerts)
│   ├── Critical Lab Value Broadcasts
│   ├── Sepsis & Deterioration Alerts
│   └── Multi-Disciplinary Messaging (/messages)
│
├── Operational Analytics & Executive Intelligence (/analytics)
│   ├── Door-to-Doctor Time Benchmarks
│   ├── Left Without Being Seen (LWBS) Risk Trends
│   ├── Length of Stay (LOS) Modeling
│   └── Physician & Nursing Shift Productivity
│
└── Governance, Platform & Profile
    ├── System Administration (/admin)
    │   ├── User RBAC / ABAC Permissions
    │   ├── Bed & Pod Configuration
    │   └── Audit Trail & Compliance Logs
    ├── Organization Settings (/settings)
    └── Clinical User Profile & Preferences (/profile)
        ├── Role Switching (Demo / Training / Live)
        └── Notification & Acoustic Settings
```

---

## 3. Persona-Driven Workspaces & Cognitive Profiles

| Persona | Primary Needs | Primary Workspace | Cognitive Reductions in UI |
| :--- | :--- | :--- | :--- |
| **Triage Nurse** | Fast vital entry, CTAS/ESI scoring, identifying high-risk red flags. | `/reception`, `/triage` | Simplified numeric keypad entry, high-contrast acuity chips, automatic red flag alerts. |
| **Emergency Physician** | Real-time patient whiteboard, lab results, clinical calculators, disposition orders. | `/whiteboard`, `/tools` | Single-click patient inspection drawer, direct pediatric dosing checker, AI clinical note drafting. |
| **Charge Nurse** | Macro-level department flow, bed capacity, surge state, inbound ambulances. | `/whiteboard`, `/capacity`, `/ems` | Visual bed occupancy maps, bottleneck indicators, ambulance arrival countdown timers. |
| **Paramedic / EMS** | Seamless pre-hospital handoff, telemetry transmission. | `/ems` | Touch-first mobile card layout, rapid vitals dictation, electronic handoff sign-off. |
| **Hospital Executive** | Regulatory compliance, wait times, staffing allocation, resource bottlenecks. | `/analytics` | Real-time KPI summaries, predictive surge forecasting, drill-down operational metrics. |

---

## 4. Universal Navigation & Command Architecture

### 4.1 Omni-Search & Command Palette (`⌘K` / `Ctrl+K`)
Clinicians frequently cannot take their hands off sterile keyboards to hunt through sidebar menus. The universal command palette allows instant keyboard navigation:
- `Type MRN (e.g. 849201)` -> Jumps straight to patient’s active encounter chart.
- `Type 'calc wells'` -> Opens Wells Score for PE calculator modal.
- `Type 'ped dose'` -> Opens Pediatric Weight-based Dosing Checker.
- `Type 'bed 4'` -> Highlights Pod B Bed 4 on the Whiteboard.

### 4.2 Breadcrumbs & Spatial Orientation
Located in the 72px Route Identity Band (`ShellRouteTab.tsx`), the breadcrumbs explicitly reflect the physical and logical location within the facility:
`CareDroid › Emergency Department › Pod 2 Acute › Bed 14`

### 4.3 Contextual Secondary Drawers
To prevent clinicians from losing their primary spatial orientation on the whiteboard:
- **Patient Detail Panel:** Slides out from the right (420px width), preserving the whiteboard background so the doctor never loses context of other patients in their pod.
- **Reassessment Drawer:** Slides from right with high-risk color highlights for overdue vital reassessments.
- **AI Copilot Panel:** Docks optionally to the right margin (380px width) with distinct violet AI provenance styling.

---

