# Reception Screen Design

## Route

`/emergency/reception` — **Arrival Dashboard**

Component: `src/pages/emergency/ReceptionWorkspace.jsx`

Screen mode: `REGISTRATION_SCREEN` (via `useRouteScreenMode`)

## Layout Zones

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Arrival Dashboard + patient lookup (sole search)   │
├─────────────────────────────────────────────────────────────┤
│  Inbound ambulances (EmsPreArrivalPanel — ETA, vitals)      │
├─────────────────────────────────────────────────────────────┤
│  [ Prepare Patient ] [ Quick Create | Smart Intake | OCR ]  │
├─────────────────────────────────────────────────────────────┤
│  Recent │ Waiting │ Awaiting Verify │ Awaiting Triage │ EMS │
├─────────────────────────────────────────────────────────────┤
│  Work queues (EMS / verification / pre-triage)              │
└─────────────────────────────────────────────────────────────┘
```

## Zone Specifications

### 1. Patient Search (Header only)

- **Single search surface** in `Header.tsx` patient lookup (`emergency-os-header__lookup--primary` on reception route)
- Syncs URL `?q=` for shareable state and queue filtering on the page
- Keyboard: `/` focuses Header lookup via `focus-reception-search` event
- No duplicate hero search on `ReceptionWorkspace.jsx`

### 2. Screen mode layout (`useScreenModeCapabilities`)

Registration screen mode hides:

- Central Node badge and CAP/EMS/REA/ALR/OI operational strip
- Reassess / Referral / Discharge header actions
- Full-screen `EMSCriticalBroadcast` overlay (inline EMS panel instead)

### 3. Primary Action Band

**Prepare Patient** (wide primary CTA) opens `PreparePatientChooser` for guided paths: manual quick create, scan/OCR, full Smart Intake, or unknown patient.

**Secondary row** — three one-click CTAs (no extra chooser step):

| CTA | Action | Click depth |
| --- | --- | --- |
| Quick Create | Opens `QuickIntake` modal (`variant="reception"`) | 1 |
| Start Smart Intake | Navigate `/emergency/intake?from=reception` | 1 |
| Scan / OCR | Navigate `/emergency/intake?from=reception&step=ocr` | 1 |

Quick Create copy: **Register & send to triage** (not Central Node language).

### 3. Arrival Metrics Row

`ArrivalMetricsPanel` (`src/components/reception/ArrivalMetricsPanel.jsx`):

| Metric | Source |
| --- | --- |
| Recent arrivals | Patients with `arrivalTime` within last 30 minutes |
| Current waiting | `PatientState.Waiting` count |
| Awaiting verification | `PatientState.Registration` count |
| Awaiting triage | `PatientState.Triage` count |
| EMS inbound | `selectEmergencyOperationalSummary.emsInbound` |

Each metric is clickable and navigates to the relevant route when role permits.

### 4. Work Queues Panel

Two lists derived from live store (not demo fixtures):

- **Awaiting verification** — patients in `Registration` state
- **Pre-triage** — patients in `Triage` state, sorted by arrival time

Row click: verification queue → Smart Intake verify with `patientId`; pre-triage → `selectPatient(id)`.

### 5. EMS Arrivals Strip

- Shows inbound `emsArrivals` count and first 3 unit labels
- Read-only for registration clerk
- "Open EMS" link → `/emergency/ems`

## Click Budget

| Task | Max clicks |
| --- | --- |
| Start Smart Intake | 1 |
| Quick create patient | 2 (open modal + submit) |
| Finalize intake → see on queue | 3 |
| Search existing patient | 2 (type + select) |

## Role Behavior

| Role | Reception access | Intake nav visible |
| --- | --- | --- |
| `registration_clerk` | Full | No (embedded) |
| `charge_nurse` | View metrics | Yes |
| `triage_nurse` | View metrics | Yes |
| `physician` | No route | Yes |
| `ems_user` | No route | No |

## Styling

- Reuse Emergency OS panel classes: `workspace-panel`, `emergency-analytics-grid`
- Dedicated `ReceptionWorkspace.css` for hero search and action band
- Match density: `REGISTRATION_SCREEN` → comfortable (`careDroidCentralNode.ts`)

## Success Toast

On `?arrived=<patientId>` query param:

- Show confirmation banner: "Patient handed off to triage queue"
- Actions: "View on Whiteboard", "Start next arrival"

## Non-Goals

- Do not duplicate Smart Intake field review UI on reception page
- Do not embed full Whiteboard grid
- Do not add new AppShell or sidebar variant
