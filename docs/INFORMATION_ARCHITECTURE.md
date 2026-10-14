# CareDroid Clinical Intelligence Platform — Information Architecture (IA)

**Document Version:** 3.0.0  
**Status:** Canonical Information Architecture & Navigation Authority  
**Lead Authors:** UX/Product Design Lead, Healthcare Informatics Architect, Principal Enterprise Architect  
**Classification:** Enterprise Healthcare Architecture & Due Diligence Authority  

---

## 1. Executive Information Architecture Overview

CareDroid’s Information Architecture structures complex acute care operations into clear, cognitive zones tailored to 23 distinct healthcare personas. Rather than presenting monolithic EHR tables or nested menus, CareDroid organizes screens around the patient’s longitudinal emergency journey, real-time department surge dynamics, and rapid bedside decision points.

---

## 2. Canonical Route Tree, Aliases & Redirect Topology

All live clinical workspaces are governed by the authoritative route registry in `src/config/routes.config.ts`. All legacy un-prefixed URLs redirect automatically to their canonical `/emergency/*` paths:

```
Root (/)
├── Authentication & Onboarding
│   ├── /login                     (Auth login screen with 2FA support)
│   ├── /register                  (Practitioner registration)
│   ├── /auth/forgot-password      (Self-service credential recovery)
│   └── /auth/invite               (Department workspace invite onboarding)
│
├── Canonical Emergency Operations (/emergency)
│   ├── /emergency/dispatch        (911 dispatch ingestion, EMS assignment, 3-min response)
│   ├── /emergency/ems             (Inbound ambulance telemetry, pre-alerts, handoff sign-off)
│   ├── /emergency/ed-readiness    (Pre-allocation of trauma rooms & resuscitation bays)
│   ├── /emergency/reception       (Walk-in intake, demographic lookup, queue tracking)
│   ├── /emergency/self-arrival    (Patient-facing self-service kiosk mode)
│   ├── /emergency/triage          (CTAS acuity scoring, physiological vitals entry, red flags)
│   ├── /emergency/whiteboard      (Department tracking grid across Resus, Acute, Subacute pods)
│   ├── /emergency/patient-room    (Bedside terminal view for nurses & rounding physicians)
│   ├── /emergency/patients        (Longitudinal encounter directory & medical records)
│   ├── /emergency/queues          (Multi-pod waiting lists sorted by clinical urgency)
│   ├── /emergency/reassessment    (Scheduled nursing vital reassessments & overdue flags)
│   ├── /emergency/capacity        (Surge levels, inpatient bed boarding bottlenecks, ALC queue)
│   ├── /emergency/tools           (Clinical tool catalog, calculators, pediatric dosing checker)
│   ├── /emergency/command-center  (Department macro operations, staffing, wait-time curves)
│   ├── /emergency/pulse           (Chief Investigation bottleneck analytics & shift scorecards)
│   ├── /emergency/copilot         (Interactive clinical context assistant & scribe workspace)
│   ├── /emergency/analytics       (Historical ministry wait-time metrics, LWBS trends)
│   ├── /emergency/simulation      (Digital Twin emergency department disaster surge simulation)
│   └── /emergency/federated-learning (Regional hospital AI model improvement console)
│
├── Legacy Redirect Compatibility Map (Transparent 301 Aliases)
│   ├── /whiteboard               ──► REDIRECT to /emergency/whiteboard
│   ├── /triage                   ──► REDIRECT to /emergency/triage
│   ├── /reception                ──► REDIRECT to /emergency/reception
│   ├── /tools                    ──► REDIRECT to /emergency/tools
│   ├── /ems                      ──► REDIRECT to /emergency/ems
│   ├── /capacity                 ──► REDIRECT to /emergency/capacity
│   ├── /analytics                ──► REDIRECT to /emergency/analytics
│   └── /queue                    ──► REDIRECT to /emergency/queues
│
└── Platform Governance & Administration
    ├── /admin                     (Hospital system operations & facility settings)
    ├── /admin/staff-workflows     (Clinical staff shifts, credentials & roster management)
    ├── /executive                 (Hospital C-suite executive performance overview)
    └── /profile                   (User settings, 2FA management, UI theme preferences)
```

---

## 3. Screen Anatomy, Panels, Drawers & Modals

CareDroid interfaces maintain a strict three-tier spatial hierarchy:

```
+---------------------------------------------------------------------------------------------------+
| TOP UTILITY BAR (52px)                                                                            |
| [Logo] [Department Picker] [Sync Pulse] [Global Search ⌘K] [Theme Toggle] [User Persona Switcher]  |
+---------------------------------------------------------------------------------------------------+
| ROUTE IDENTITY TAB (48px)                                                                        |
| Breadcrumbs > Workspace Title (e.g. Emergency Whiteboard)              [Quick Actions: + Patient] |
+------------------------------------+--------------------------------------------------------------+
| SIDEBAR NAVIGATION RAIL            | MAIN WORKSPACE VIEWPORT (Virtual Scrollport)                 |
| (240px Expanded / 56px Collapsed)  |                                                              |
|                                    | [Pod Filters: All | Resus | Acute A | Subacute B | Boarding] |
| - Clinical Navigation              |                                                              |
|   * Dispatch                       | +----------------------------------------------------------+ |
|   * EMS Telemetry                  | | Rendered Patient Cards (Strict Max 18 in DOM)            | |
|   * Reception & Intake             | | [Card 01] [Card 02] [Card 03] [Card 04]                  | |
|   * Triage Workspace               | | [Card 05] [Card 06] [Card 07] [Card 08]                  | |
|   * Whiteboard Tracking            | +----------------------------------------------------------+ |
|   * Clinical Tools Hub             |                                                              |
|   * Bed Capacity                   +--------------------------------------------------------------+
|   * Command Center                 | SLIDE-OUT PATIENT INSPECTION DRAWER (480px / Overlaid Right) |
| - Analytics & AI                   | - Demographics, Vital Trends, Lab Results, Orders Drafts     |
|   * Pulse Analytics                | - Clinical Calculators Launchpad                             |
|   * AI Copilot                     +--------------------------------------------------------------+
+------------------------------------+--------------------------------------------------------------+
```

### 3.1 Non-Disruptive Slide-Out Drawer
- Width: `480px` on desktop, `100vw` full-width on mobile viewports (<768px).
- Mounted over the active workspace with a soft scrim; pressing `Esc` or clicking outside dismisses the drawer while preserving the background scroll position and live WebSocket updates.

### 3.2 Modal Hierarchy
- **Critical Action Modals:** Used exclusively for irreversible actions:
  - Code Blue / Trauma Team activation.
  - Final patient discharge / disposition sign-off.
  - Clinical medication order confirmation with allergy overrides.
- All non-destructive information browsing occurs within drawers or tabs, never modals.

---

## 4. Command Palette (⌘K) Architecture

The universal command launcher provides sub-50ms keyboard accessibility:
- **Global Keybinding:** `⌘K` (macOS) / `Ctrl+K` (Windows/Linux).
- **Index Domains:**
  1. *Patients & Beds:* Instant search by MRN, patient initials, or room code (e.g. `Bed 04`).
  2. *Canonical Workspaces:* Direct navigation to any route (e.g. `> Whiteboard`, `> Capacity`).
  3. *Clinical Tools:* Direct execution of calculators (e.g. `calc wells`, `calc pediatric`).
  4. *Actions:* System actions (e.g. `toggle theme`, `switch persona`, `export shift report`).

---

## 5. Role-Based Visibility & Permission Masking

In accordance with the principle of least privilege, the UI applies declarative visibility gating (`PermissionGate` and `RoleGate`):

| UI Surface / Action | Required Canonical Permission | Behavior if Unauthorized |
| :--- | :--- | :--- |
| **Commit Triage Acuity** | `triage:commit` | Button disabled; shows tooltip *"Requires RN or MD role"*. |
| **Pediatric Order Sign-off** | `order:sign` | Replaced by *"Draft Order for Physician Review"* button. |
| **Reserve Resuscitation Bay** | `bed:allocate` | Hidden on paramedic and reception clerk profiles. |
| **View Audit Trail Logs** | `audit:read` | Navigation item hidden; direct URL access renders 403 panel. |
| **Emergency Whiteboard** | `whiteboard:read` | Core clinical surface; visible to all clinical staff personas. |

---

*This Information Architecture governs all layout components, route configurations, and navigation patterns.*
