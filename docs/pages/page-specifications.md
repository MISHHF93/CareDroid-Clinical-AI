# CareDroid Page Specifications

**Generated:** 2026-06-28  
**Source:** `src/pages/emergency/`, `src/app/router.tsx`, direct source inspection

---

## Page 1: Emergency Whiteboard

| Field | Value |
|-------|-------|
| **Route** | `/emergency/whiteboard` |
| **File** | `src/pages/emergency/index.tsx` (2886 lines) |
| **Purpose** | Live overview of all active ED patients with operational KPIs |
| **Primary Users** | Charge Nurse, Physician, Triage Nurse, ED Director |
| **Load** | Lazy (Suspense fallback: "Loading whiteboard...") |

### Screen Modes
| Mode | Param / Role | Layout Change |
|------|-------------|---------------|
| Standard | Default | Patient cards + filter bar + stat strip |
| Charge Nurse | `?mode=charge` or charge_nurse role | Operational strip with queue/EMS/referral KPIs |
| Physician | `?mode=physician` or physician role | Provider-focused, hides some admin strips |
| Triage | `?mode=triage` or triage_nurse role | Triage queue emphasis |
| Command Center | `?mode=command` | Full KPI throughput dashboard + Surge snapshot |
| Public Waiting | `?mode=waiting` | Patient-safe kiosk display (no names/clinical data) |
| Read-Only Wall | `?mode=wall` | Department status display, auto-refresh |

### Key Components
- `CriticalAlertBanner` — appears when unacknowledged critical alerts > 0
- `StatCards` — total, waiting, high-risk, boarding, reassessment-due
- `CapacityCrisisMode` — activates when capacity band = Red
- `EmsAttentionStrip`, `ReassessmentAttentionStrip`, `ReferralAttentionStrip`
- `WhiteboardOpsDetailStrip` — expandable operational detail
- `ChargeNurseOperationalStrip` / `PhysicianOperationalStrip` (role-conditional)
- `OperationalHandoffDomainBar` — shift handoff summary
- `QueueIntelligencePanel` — queue breach tracking
- `WhiteboardView` — patient card grid (filters: All/Waiting/Assessment/High Risk/Reassess/EMS/Boarding)
- `QuickIntake` — inline patient registration (modal)
- `NativeAiCommandSuitePanel` — AI clinical acuity dashboard (feature-flagged)
- `PublicWaitingDisplay` — kiosk mode layout
- `DepartmentStatusScreen` — wall display layout
- `CommandCenterThroughputScreen` — command center layout

### Services Used
- `useEmergencyStore` — patients, capacity, emsArrivals, alerts, staff, rooms
- `useEmergencyWhiteboard` — backend whiteboard data payload
- `useOperationalIntelligence` — centralSnapshot, bottleneckRegistry, queueHealth
- `useUpgradeHarnessPatientFlow` — upgrade harness signals (wearable, VVT, BRAG)
- `useNativeAiBackendSync` — native AI data sync

### State
- `activeFilter: FilterId` — patient filter (All/Waiting/Assessment/High Risk/Reassess/EMS/Boarding)
- `showIntake: boolean` — quick intake modal open
- `emsOffloadPanelOpen: boolean` — EMS offload tracker open
- `queuePanelCollapsed: boolean` — queue intelligence panel collapsed
- `toast: string` — toast message

### Permissions
- `registrationClerk` → redirected to `/emergency/reception`
- `canMutateWhiteboard` — role + `readOnlyDisplayMode` check
- `canCreatePatient`, `canPrepareBay`, `canConvertEmsArrival`, `canManageReferral` — role actions

### Loading State
- Skeleton cards while `isInitialLoading` (storeLoading or whiteboard.loading with 0 patients)

### Empty State
- `OperationalEmptyState` with walkthrough action if `shouldShowWalkthroughActionOnEmptyBoard`

### KPIs Displayed
- Total patients, Waiting, High Risk, Boarding, Reassessment Due
- Capacity score + band
- EMS inbound count
- Queue breach count
- Boarding risk

### 3-Minute Mission Support
- Reassessment breach timers on patient cards
- EMS ETA countdown (live, 15s refresh)
- Critical alert banner (above fold, always visible)
- Capacity crisis mode auto-activation

---

## Page 2: Reception Workspace

| Field | Value |
|-------|-------|
| **Route** | `/emergency/reception` |
| **File** | `src/pages/emergency/ReceptionWorkspace.tsx` |
| **Purpose** | Front-desk patient registration, verification, EMS tracking, pretriage management |
| **Primary Users** | Registration Clerk, Triage Nurse |
| **Guard** | `EmergencyRouteGuard` |

### Sections
1. **EMS Pre-Arrival Rail** — inbound ambulances, ETA, convert buttons
2. **Register Walk-In** — opens intake form or quick-create
3. **Verification Queue** — patients awaiting ID check
4. **Pretriage Queue** — registered, awaiting nurse
5. **Recent Arrivals** — walk-ins and conversions in last 30 minutes
6. **AI Triage Assist Panel** (`AiTriageAssistPanel`) — AI suggestion for selected patient

### Services
- `src/services/receptionHandoff.ts`
- `src/services/receptionIntakeBridge.ts`
- `src/store/emergencyStore.ts` — patients, emsArrivals

### 3-Minute Mission Support
- EMS conversion visible without leaving reception
- One-click walk-in registration
- Quick create path for high-volume scenarios

---

## Page 3: EMS Pipeline

| Field | Value |
|-------|-------|
| **Route** | `/emergency/ems` |
| **Component** | `src/components/EMSPipeline.tsx` |
| **Purpose** | Track inbound ambulances, manage handoffs, monitor offload times |
| **Primary Users** | Charge Nurse, Paramedic, EMS Coordinator |

### Sections
1. **Unit Cards** — each inbound EMS unit (unitId, crew, patient condition, ETA)
2. **Bay Assignment** — assign ED bay to inbound unit
3. **Offload Timer** — tracks time from arrival to handoff (target: ≤15 min)
4. **EMS Offload Tracker Panel** — aggregate offload stats
5. **Handoff Checklist** — structured EMS-to-ED handoff form

### Real-Time
- WebSocket updates from `backend/src/api/ems.socket.ts`
- 15-second ETA refresh from `clockTick`

---

## Page 4: Smart Intake

| Field | Value |
|-------|-------|
| **Route** | `/emergency/intake` |
| **File** | `src/pages/emergency/SmartIntake.tsx` |
| **Purpose** | Multi-step patient registration with AI-assisted chief complaint classification |
| **Primary Users** | Registration Clerk, Triage Nurse |

### Steps
1. Chief complaint (free text)
2. Demographics (name, DOB, sex, phone)
3. Symptoms, allergies, medications
4. AI classification (clerk reviews, not auto-accepted)
5. Patient created in Registration state

### Role Redirect
- If `registration_clerk` role: intake is embedded in Reception (`getReceptionEmbeddedIntakePath`)
- If other roles: opens as standalone page

---

## Page 5: Triage Queues

| Field | Value |
|-------|-------|
| **Route** | `/emergency/queues` |
| **Component** | `QueueRoute` in `src/pages/emergency/emergencyRoutePages.tsx` |
| **Purpose** | Manage patient queues from pretriage through triage |
| **Primary Users** | Triage Nurse, Charge Nurse |

### Default Behavior
- Default filter: `?queue=pretriage` (auto-set by `TriageWorkspaceRoute`)
- Tabs/filters: Pretriage, Triage, Fast-track, General

### Queue Logic
- `src/services/queueAssignment.ts` — patient → queue matching
- Triage nurse picks patients from pretriage and assigns acuity

---

## Page 6: Reassessment

| Field | Value |
|-------|-------|
| **Route** | `/emergency/reassessment` |
| **Component** | `ReassessmentRoute` in `src/pages/emergency/emergencyRoutePages.tsx` |
| **Purpose** | Show patients with overdue or approaching reassessment timers |
| **Primary Users** | Triage Nurse, Charge Nurse |

### Display
- Patients flagged `ReassessmentDue`
- Sorted by most overdue first
- Inline reassessment completion form
- Reassessment cleared → timer resets

---

## Page 7: Capacity & Boarding

| Field | Value |
|-------|-------|
| **Routes** | `/emergency/capacity`, `/emergency/boarding` |
| **Components** | `CapacityRoute`, `BoardingRoute` |
| **Purpose** | Monitor bed availability, manage boarding patients, prevent capacity crisis |
| **Primary Users** | Charge Nurse, ED Director |

### Capacity Display
- Capacity score (0–100) + band (Green/Yellow/Orange/Red)
- Available beds by type (resus, acute, fast-track)
- Predicted bed shortage alerts

### Boarding Display
- Patients admitted but physically remaining in ED
- Boarding duration per patient
- Actions: contact inpatient unit, expedite transport

---

## Page 8: Referral Panel

| Field | Value |
|-------|-------|
| **Route** | `/emergency/referrals` |
| **Component** | `src/components/ReferralPanel.tsx` |
| **Purpose** | Create, track, and manage specialist referrals |
| **Primary Users** | Physician, Charge Nurse |

### Sections
- **New Referral** — create from patient card link
- **Pending** — awaiting specialist response
- **Accepted** — specialist confirmed, awaiting consult
- **Delayed** — exceeded threshold without response
- **Completed/Closed** — historical

---

## Page 9: AI Copilot (AI Chief)

| Field | Value |
|-------|-------|
| **Route** | `/emergency/copilot` |
| **Component** | `CopilotRoute` in `src/pages/emergency/emergencyRoutePages.tsx` |
| **Purpose** | AI clinical decision support, patient summaries, differential diagnosis, evidence retrieval |
| **Primary Users** | All clinical roles |

### Features
- Clinical chat with patient context
- Patient summary AI (structured patient snapshot)
- Differential diagnosis suggestions
- Clinical calculator recommendations
- Guideline and evidence retrieval (RAG)
- Tool calling (SOFA, drug checker, lab interpreter)
- Diagnostic Safety Dashboard (`DiagnosticSafetyDashboard`)
- AI confidence badges on all suggestions
- Safety disclaimer on all AI outputs

### Safety Rules
- No autonomous diagnosis
- Every AI suggestion labeled with confidence score
- Human review required before clinical action
- Safety notice on all AI outputs

---

## Page 10: Department Analytics

| Field | Value |
|-------|-------|
| **Route** | `/emergency/analytics` |
| **File** | `src/pages/emergency/EmergencyAnalytics.tsx` |
| **Purpose** | ED operational performance reporting |
| **Primary Users** | ED Director, Charge Nurse, Quality Officer |

### Metrics
- Hourly arrivals (time distribution)
- Average wait time (triage + provider)
- Door-to-doctor time
- Left Without Being Seen (LWBS) rate
- Boarding duration
- EMS offload delays
- Daily volume trend
- Throughput efficiency

---

## Page 11: Department Pulse

| Field | Value |
|-------|-------|
| **Route** | `/emergency/pulse` |
| **File** | `src/pages/emergency/pulse/index.tsx` |
| **Purpose** | Real-time operational health snapshot |
| **Primary Users** | Charge Nurse, ED Manager |

### Display
- Live bottleneck registry (active by severity)
- Queue breach count
- Active critical alert count
- Capacity band
- EMS delay indicator

---

## Page 12: Shift Summary

| Field | Value |
|-------|-------|
| **Route** | `/emergency/shift` |
| **File** | `src/pages/emergency/shift/index.tsx` |
| **Purpose** | End-of-shift operational snapshot for handoff |
| **Primary Users** | Charge Nurse |

### Content
- Total patients this shift
- Remaining active patients
- Outstanding reassessments
- Pending referrals
- Boarding patients
- EMS offload status
- Pending critical alerts

---

## Page 13: Help Hub

| Field | Value |
|-------|-------|
| **Route** | `/emergency/help` |
| **File** | `src/pages/emergency/HelpHubPage.tsx` |
| **Component** | `src/components/help/HelpHub.tsx` |
| **Purpose** | In-app contextual help, role playbooks, procedure guides |
| **Primary Users** | All roles |

### Tabs
| Tab | Content |
|-----|---------|
| This screen | Contextual help for the current page |
| My role | Role-specific playbook (daily flow, can/cannot do) |
| Full process | Patient journey A–Z + demo walkthrough A–K |
| All topics | Browse all manual topics |
| Shortcuts | Keyboard shortcuts for current role |

### Topics Defined (`src/config/userManual.config.ts`)
- reception, whiteboard, triage-flow, ems, queues, reassessment, capacity, boarding, referrals, copilot, analytics, settings, tools, pulse, shift

### Keyboard Trigger
- Press `?` anywhere to open HelpHub drawer

---

## Page 14: Medical Tools Hub

| Field | Value |
|-------|-------|
| **Route** | `/emergency/tools` |
| **File** | `src/pages/tools/ToolsOverview.tsx` |
| **Purpose** | Access to 242 clinical tools: calculators, AI workflows, diagnostic aids |
| **Primary Users** | All clinical roles |

### Tool Tiers
- **Tier A (91):** Dedicated calculator forms (SOFA, NEWS2, GCS, qSOFA, etc.)
- **Tier B (44):** Chat-assisted from hub (structured chat seed)
- **Tier C (65):** Full AI analysis pages
- **clinical-page (8):** Protocol + decision support pages

### Search
- Filter by category (Calculator, Diagnostic, AI System, etc.)
- Search by name or clinical keyword
- NLU intent matching for chat-style queries

---

## Page 15: Admin Console

| Field | Value |
|-------|-------|
| **Route** | `/admin/*` |
| **File** | `src/components/admin/AdminOperationsShell.tsx` |
| **Purpose** | Hospital administration, team management, system configuration |
| **Primary Users** | Hospital Admin, Super Admin |
| **Guard** | `CareDroidRouteGuard` (admin-only) |

### Sub-pages
- `/admin/` — Admin overview
- `/admin/staff-workflows` — ED staff workflow admin
- `/admin/team` — Team management
- `/admin/tenant` — Tenant admin
- `/admin/system-health` — System health
- `/admin/audit-trail` — Automation audit trail

---

## Page 16: Self-Arrival Check-In

| Field | Value |
|-------|-------|
| **Route** | `/emergency/self-arrival` |
| **File** | `src/pages/emergency/SelfArrivalCheckIn.tsx` |
| **Purpose** | Patient-facing self-registration kiosk |
| **Primary Users** | Patients (public access, no auth required) |

### Flow
1. Patient enters name, DOB, chief complaint, contact
2. Record created in Reception workspace
3. Clerk verifies and moves to standard intake

---

## Page 17: Patient Room Display

| Field | Value |
|-------|-------|
| **Route** | `/emergency/room/:id` |
| **File** | `src/pages/emergency/PatientRoomDisplay.tsx` |
| **Purpose** | Bedside or room TV display showing patient's care status |
| **Primary Users** | Patient (displayed in room) |

### Display
- Patient name and triage time
- Current care stage
- Provider assigned
- Next expected step
- No clinical details (PHI-safe)

---

## Page 18: Clinical Documentation Assistant

| Field | Value |
|-------|-------|
| **Route** | `/emergency/documentation` |
| **File** | `src/pages/ClinicalDocumentationAssistant.tsx` |
| **Purpose** | AI-assisted clinical note generation |
| **Primary Users** | Emergency Physician |

### Features
- Ambient scribe mode (transcription → structured note)
- Note template by encounter type
- AI summary of patient encounter
- EHR writeback preparation (integration-dependent)
