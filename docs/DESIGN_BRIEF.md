# CareDroid Clinical Intelligence Platform — Design Brief & Visual Specification

**Document Version:** 2.2.0  
**Status:** Living Design Specification / Implementation Authority  
**Author:** CareDroid Design & UX Architecture Working Group  
**Target Environments:** Desktop Cockpit (1440px+), Clinical Workstation (1024px–1280px), Tablet / Bedside Rounding (768px–1024px), Mobile Triage / Response (320px–430px)

---

## 1. Executive Summary & Design Philosophy

CareDroid is evolving into a mission-critical Medical Intelligence and Healthcare Operations Platform. It serves emergency physicians, triage nurses, charge nurses, hospital administrators, and pre-hospital EMS crews who operate in high-stress, time-sensitive clinical environments.

The visual and interaction philosophy of CareDroid is defined by one core mandate:
> **A Calm Clinical Command Surface** — decisive under pressure, quiet when the department is stable, and explicit when human attention is required.

### What CareDroid Is NOT:
- **Not a legacy EHR clone:** No beige surfaces, stacked 90s tabular borders, tiny unreadable 10px text, or cluttered 10-level nested menus.
- **Not a consumer entertainment app:** No distracting animations, rainbow color gradients, unnecessary dark shadows, or gamified UI elements.
- **Not an uncontrolled AI chatbot:** AI outputs never masquerade as definitive clinical decrees; they are explicitly framed with clinical provenance, certainty levels, and human-in-the-loop validation barriers.

### What CareDroid IS:
- **A Modern Clinical Intelligence Cockpit:** Clean, hyper-legible, ergonomic, and structured around high-speed clinical decision-making.
- **Ergonomically Tuned for 12-Hour Shifts:** Minimal eye fatigue through low-glare surface calibration, balanced contrast ratios (WCAG 2.2 AA / AAA standards), and predictable spatial consistency.
- **Human Authority Preserved:** Every autonomous recommendation, risk score, and clinical calculation surfaces its evidence, references, and validation controls before any clinical action is finalized.

---

## 2. Core Experience Principles

| Principle | Meaning & Clinical Rationale | Implementation Rule |
| :--- | :--- | :--- |
| **1. Calm Command** | Cognitive bandwidth during resuscitation or surge is sacred. Visual noise kills situational awareness. | The interface remains neutral (`--cdl-surface-page`, `--cdl-surface-card`) until clinical state demands attention. Saturated colors are strictly budgeted. |
| **2. One Screen, One Primary Decision** | In an emergency, clinicians must know the immediate next action within 500 milliseconds. | Every view highlights one primary clinical action (`.btn-primary`). Secondary or destructive controls recede into ghost/subtle outlines. |
| **3. Signal Has a Strict Budget** | When everything flashes, nothing is urgent. Visual alarms must never trigger alarm fatigue. | Alarms follow standard IEC 60601-1-8 / CDL Severity protocols. Only Level 1/2 acuity triggers immediate visual/auditory priority. Stable patients use calm neutrals. |
| **4. Human-in-the-Loop Authority** | AI assists; licensed human practitioners decide. | AI recommendations use a distinct violet theme (`--cdl-ai-*`), state confidence intervals, link clinical evidence, and require one-click clinician approval. |
| **5. Density Follows the Task** | Kiosk and mobile require large touch targets; high-volume tracking boards require maximum data density without clutter. | Adaptive density profiles (`simple-fast` for reception triage vs. `dense-operational` for central tracking whiteboard). Touch targets never drop below 44px on mobile. |
| **6. Multi-Sensory Redundancy** | Color blindness (affecting 8% of male clinicians) and glare must not impede emergency care. | Color is NEVER the sole carrier of meaning. State is always confirmed by text labels, distinct SVG iconography, and numeric indicators. |

---

## 3. Design Tokens & Visual Architecture

### 3.1 Color System & Clinical Palette

The CareDroid color system is built on a dual-mode foundation (calibrated for both daylight clinical stations and dimmed emergency lighting pods):

#### Neutral Canvas & Working Surfaces
- **Canvas (`--cdl-surface-page`):** Soft, cool slate `#f4f7fb` (Light) / Deep navy slate `#061725` (Dark). Eliminates glare while providing clear separation from floating panels.
- **Card Surfaces (`--cdl-surface-card`):** Pure crisp white `#ffffff` (Light) / Elevated slate `#0d2438` (Dark). High-clarity backdrop for patient data and vital charts.
- **Muted Inset (`--cdl-surface-muted`):** `#e4ebf2` (Light) / `#132c42` (Dark). Used for non-interactive metadata grouping, inactive input backgrounds, and table header rows.
- **Structural Borders (`--cdl-border`):** `#dbe5ee` (Light) / `#27445c` (Dark). Hairline 1px borders that organize space without boxing in content.

#### Brand & Interactive Accents
- **Primary Clinical Teal (`--cdl-brand-500` / `#0d9488` / `#2dd4bf`):** The primary brand and action color. Represents active workflows, clinical focus, and verified system operations.
- **Brand Hover / Active (`--cdl-brand-600` / `#0f766e`):** Solid contrast-compliant interactive states.
- **Brand Mint (`--cdl-brand-mint` / `#5eead4`):** Focused highlights and active sidebar rail indicators in dark theme.

#### Clinical Acuity & Urgency Tiers (CTAS / ESI Aligned)
- **Level 1 — Resuscitation (`--cdl-critical`):** `#dc2626` (Light text `#991b1b`, dark text `#fecaca`). Immediate life threat; dedicated high-urgency pulse cadence (1.6s).
- **Level 2 — Emergent (`--cdl-urgent`):** `#ea580c` (Light text `#9a3412`, dark text `#fed7aa`). High potential for rapid deterioration; 2.0s pulse cadence.
- **Level 3 — Urgent (`--cdl-warning`):** `#b45309` (Light text `#92400e`, dark text `#fde68a`). Serious condition requiring multi-resource evaluation.
- **Level 4 — Less Urgent (`--cdl-info`):** `#0284c7` (Light text `#075985`, dark text `#bae6fd`). Stable distress or localized trauma.
- **Level 5 — Non-Urgent (`--cdl-ok` / `--cdl-neutral`):** `#059669` (Light text `#065f46`, dark text `#bbf7d0`) / Slate. Routine or discharge care.

#### AI & Agentic Provenance
- **AI Violet (`--cdl-ai`):** `#6d28d9` (Light bg `color-mix(in srgb, #8b5cf6 12%, #fff)`, text `#5b21b6`, dark text `#ddd6fe`). Distinguishes synthetic intelligence, clinical copilot suggestions, and automated triage drafting from validated physician entries.

---

## 3.2 Typography System

CareDroid uses an ultra-clean, modern geometric sans-serif stack optimized for high-speed legibility across varied viewing distances:

- **Display & UI Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Tabular & Medical Monospace:** `'JetBrains Mono', 'SFMono-Regular', Consolas, monospace`. Used for MRNs, encounter IDs, timestamps, vital signs, and lab measurements to guarantee columnar alignment.

#### Scale & Hierarchy
| Token | Size | Line Height | Weight | Typical Application |
| :--- | :--- | :--- | :--- | :--- |
| `--cdl-text-3xl` | clamp(24px, 2.4vw, 32px) | 1.15 | Bold (700) | Route Identity Titles, Emergency Broadcast Headers |
| `--cdl-text-2xl` | clamp(20px, 1.8vw, 24px) | 1.20 | Bold (700) | Major Section Headers, Department KPI Counts |
| `--cdl-text-xl` | 20px | 1.25 | Semibold (600) | Modal Titles, Primary Patient Card Headers |
| `--cdl-text-lg` | 17px | 1.35 | Semibold (600) | Subsection Titles, Form Field Grouping |
| `--cdl-text-md` | 15px | 1.50 | Regular (400) / Med (500) | Primary Body Text, Clinical Notes, Dialog Copy |
| `--cdl-text-sm` | 13px | 1.40 | Regular (400) / Med (500) | Table Cells, Sidebar Navigation, Secondary Labels |
| `--cdl-text-xs` | 11px | 1.30 | Semibold (600) | Badges, Table Headers, Micro-status Tags |
| `--cdl-text-2xs`| 10px | 1.20 | Bold (700) | Eyebrow Badges, Breadcrumbs, Triage Acuity Indicators |

---

## 3.3 Elevation, Depth & Geometry

To avoid visual fatigue, CareDroid rejects deep, muddy drop shadows in favor of crisp, multi-layered ambient occlusion:

```css
--cdl-elev-0: none;
--cdl-elev-1: 0 1px 2px rgba(16, 42, 67, 0.05), 0 1px 1px rgba(16, 42, 67, 0.03); /* Leaf Cards */
--cdl-elev-2: 0 4px 6px -1px rgba(16, 42, 67, 0.06), 0 2px 4px -2px rgba(16, 42, 67, 0.04); /* Hover Cards */
--cdl-elev-3: 0 10px 15px -3px rgba(16, 42, 67, 0.08), 0 4px 6px -4px rgba(16, 42, 67, 0.04); /* Dropdowns / Flyouts */
--cdl-elev-4: 0 20px 25px -5px rgba(16, 42, 67, 0.12), 0 8px 10px -6px rgba(16, 42, 67, 0.08); /* Modals / Drawers */
```

#### Border Radii
- **Micro-controls (Badges, Tags):** `var(--cdl-radius-sm)` (4px)
- **Standard Controls (Inputs, Buttons):** `var(--cdl-radius-md)` (10px)
- **Cards & Content Surfaces:** `var(--cdl-radius-lg)` (14px)
- **Dialogs & Sliding Sheets:** `var(--cdl-radius-xl)` (18px)
- **Status Pills & Capsules:** `var(--cdl-radius-full)` (9999px)

---

## 4. Application Chrome & Layout Architecture

The CareDroid application shell consists of 5 tightly coordinated spatial zones:

```
+---------------------------------------------------------------------------------------------------+
|  SIDEBAR (252px)  |  TOP UTILITY BAR (60px)                                                      |
|  - Brand Logo     |  [Clock] [Live Operational Pulse] [Global Patient/Op Search ⌘K] [Theme] [User] |
|  - Department Nav +-------------------------------------------------------------------------------+
|    * Whiteboard   |  ROUTE IDENTITY BAND (72px)                                                   |
|    * Triage       |  Breadcrumbs › Current Workspace Title                                         |
|    * Patients     |  Context Description                                            [Primary Action] |
|    * EMS / Beds   +-------------------------------------------------------------------------------+
|  - AI Assistant   |  MAIN WORKSPACE CANVAS (Scrollport)                                           |
|  - Settings       |  +---------------------------+ +----------------------------+                 |
|                   |  | Clinical KPI Summary Grid | | Operational Filter Panel   |                 |
|                   |  +---------------------------+ +----------------------------+                 |
|                   |  | Active Clinical Patient Data Table / Workflow Kanban    |                 |
|                   |  +----------------------------------------------------------+                 |
|                   +-------------------------------------------------------------------------------+
|  [Collapse <]     |  (Optional Slide-out AI Copilot Drawer / Patient Detail Inspection Sheet)     |
+---------------------------------------------------------------------------------------------------+
```

### 4.1 Navigation Rail (Sidebar)
- Follows the active theme (pure white in light mode, deep black `#000000` in dark mode) to create crisp visual grounding.
- 252px width expanded, 64px width collapsed.
- Active route highlighted by brand mint/teal left anchor bar with subtle inset glowing background (`rgba(94, 234, 212, 0.13)`).
- Critical notification count badges (e.g., Unassigned Inbound EMS or Sepsis Flags) highlight in high-contrast red/amber.

### 4.2 Top Utility Bar
- 60px height with translucent frosted glass backdrop (`backdrop-filter: blur(14px)`).
- Centered or left-aligned real-time department synchronizer pulse (Green pulse = <2s sync latency; Amber = stale sync; Red = disconnected offline mode).
- Universal Omnibox / Search with instant keyboard trigger (`⌘K` / `Ctrl+K`), searching across Patients, Encounters, Inbound EMS, and Clinical Calculators.

### 4.3 Route Identity Band
- Dedicated 72px workspace header that establishes clear context for the practitioner.
- Houses workspace title (`<h1>`), contextual subtitle, and up to 3 high-priority contextual action buttons (e.g. `+ New Arrival`, `Reassess All Due`, `Export Shift Report`).

---

## 5. Clinical Safety & Accessibility Standards

1. **Contrast Standards:** Every text element against its rendered background meets or exceeds WCAG 2.2 AA (minimum 4.5:1 for normal text, 3:1 for large text). Vital alert states meet AAA (7:1).
2. **Keyboard Ergonomics:** Every critical clinical workflow can be operated 100% via keyboard without mouse dependency (Tab order, Arrow-key navigation in listboxes, `Esc` dismissals, `Enter` submission).
3. **No Character Wrapping in Clinical Identifiers:** MRNs, phone numbers, lab values with units, and medication dosages use `white-space: nowrap` and `font-variant-numeric: tabular-nums` to prevent life-threatening misinterpretation.
4. **Error Recovery & Reversibility:** High-impact clinical actions (e.g. bed transfer, code blue trigger, patient discharge) require explicit confirmation dialogs with double-check summaries.

---

