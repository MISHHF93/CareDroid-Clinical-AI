# Phase 5: Reception Information Architecture

> Complete map of pages, workflows, navigation, states, and URL parameters
> for the Registration Clerk role.

---

## 1. Role Identity

| Property | Value |
|----------|-------|
| Role ID | `registration_clerk` |
| Cluster | B — Reception & Intake |
| Screen Mode | `reception` |
| Default Landing | `/emergency/reception` |
| Sidebar Items | 7 (desktop), 5 (pilot mode), 3 (mobile primary) |
| Allowed Actions | 6 (all administrative, none clinical) |
| Allowed Routes | 8 (reception, patients, intake, pulse, shift, alerts, collaboration, help) |

---

## 2. Sidebar Navigation (Ordered)

```
[Emergency]
  reception        →  /emergency/reception         ← Landing page

[Patients]
  patients         →  /emergency/patients           Patient list

[Analytics]
  pulse            →  /emergency/pulse               Department pulse
  shift            →  /emergency/shift               Shift summary

[Emergency]
  alerts           →  /emergency/alerts              Critical alerts

[Utility]
  collaboration    →  /emergency/collaboration       Team collaboration
  help             →  /emergency/help                Help manual
```

**Pilot mode** drops `alerts` and `collaboration` → 5 items.

---

## 3. URL Parameters

| Parameter | Value | Effect |
|-----------|-------|--------|
| `?express=1` | — | Express registration (walk-in quick create) |
| `?intake=1` | — | Opens embedded Smart Intake overlay |
| `?intake=1&autostart=1` | — | Auto-starts intake wizard |
| `?quickCreate=1` | — | Quick create walk-in |
| `?queue=ems` | `ems` | Focuses EMS arrivals tab |
| `?queue=verification` | `verification` | Focuses ID verification tab |
| `?queue=pretriage` | `pretriage` | Focuses pretriage/waiting tab |
| `?patientId=<id>` | — | Selects specific patient |
| `?step=<step>` | `capture` etc. | Smart Intake wizard step |
| `?mode=<mode>` | — | Intake mode |
| `?artifactId=<id>` | — | Resume from artifact |
| `?arrived=<id>` | — | Selects patient (alias) |
| `?filter=<tab>` | — | Alternative alias for `queue` |

---

## 4. Multi-Page Workflows

### 4A. Walk-In Registration → Triage
```
/reception → UnifiedIntakePanel → createPatientAndRouteFromReception()
  → /emergency/queues?queue=pretriage → Triage nurse picks up
```

### 4B. Express Registration
```
/reception?express=1 → Reset draft → Fill demographics → Route
```

### 4C. Embedded Smart Intake
```
/reception?intake=1&autostart=1 → Smart Intake overlay → Handoff → nextRoute
```

### 4D. EMS Arrival Conversion
```
/reception?queue=ems → EMS arrival cards → convertEmsArrival → Registration queue
```

### 4E. Identity Verification
```
/reception?queue=verification → Provisional patients → verifyIntake → Registered
```

### 4F. Escalation
```
/reception → Escalation dialog → submitReceptionEscalation → Critical alert + 3-min timer
```

### 4G. Unknown Patient
```
/reception → PreparePatientChooser → "Unknown" → Provisional identity → Demographics follow-up
```

---

## 5. Reception Workspace Internal Structure

### Zones (EmergencyRoutePage)

| Zone | Content |
|------|---------|
| `operationalSummary` | User meta, escalation attention strip, escalation quick actions |
| `primaryActions` | ReceptionDeskToolbar (3 groups: Actions, Filters, Flow Status) |
| `supportingContext` | ReceptionOperationalRail (queue list, alerts, patient cards) |
| `activeWork` (= children) | Stepper, guardrail, UnifiedIntakePanel, context hint, result banner |

### Modal Overlays

| Overlay | Trigger | Content |
|---------|---------|---------|
| PreparePatientChooser | "Other Arrivals" button | Manual/Scan/SmartIntake/QuickCreate/Unknown |
| ReceptionSmartIntakeOverlay | `?intake=1` or Check Identity | Full intake wizard |
| ReceptionEscalationPanel | Escalate button | Patient selection + reason + detail |

---

## 6. Pages NOT Accessible (Clinical-Only)

| Page | Path | Why Excluded |
|------|------|-------------|
| Command Center | `/emergency/command-center` | Clinical leadership |
| Whiteboard | `/emergency/whiteboard` | Clinical operations |
| Dispatch | `/emergency/dispatch` | Dispatcher only |
| ED Readiness | `/emergency/ed-readiness` | EMS coordinator |
| Triage | `/triage` | Triage nurse only |
| Reassessment | `/emergency/reassessment` | Nursing/physicians |
| Capacity | `/emergency/capacity` | Ops leadership |
| Referrals | `/emergency/referrals` | Physicians |
| Copilot | `/emergency/copilot` | Clinical profiles |
| Analytics | `/emergency/analytics` | Admin/clinical leadership |
| Reports | `/emergency/reports` | Admin/quality |

---

## 7. Feature Flags

| Flag | Value | Effect |
|------|-------|--------|
| `RECEPTION_FIRST_UX.enabled` | `true` | Reception-first platform mode |
| `hideCopilotOnReception` | `true` | Copilot hidden in reception mode |
| `routeAllIntakeThroughReception` | `true` | All patient create goes through reception |
| `routePatientSearchThroughReception` | `true` | Patient search routed through reception |
| `pipelineShellEnabled` | `true` | Pipeline shell UI enabled |
| `redirectStandaloneIntake` | `true` | Standalone intake redirects to reception |
| `deskUiEnabled` | `true` | Reception desk toolbar enabled |

---

## 8. Redirect Aliases

| URL | Resolves To |
|-----|-------------|
| `/` | `/emergency/reception` |
| `/emergency` | `/emergency/reception` |
| `/reception` | `/emergency/reception` |
| `/home`, `/app` | `/emergency/reception` |
| `*` (catch-all) | `/emergency/reception` |
