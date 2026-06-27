# CareDroid — Ground-Up Architecture Map
### Thinking like Figma: every layer composed from the one below it

**Date:** 2026-06-26  
**Status:** Planning document — not yet implemented

---

## The Build Order

```
Layer 7  ── Screens & Flows          (what users see)
Layer 6  ── Feature Modules          (domain logic assembled)
Layer 5  ── Domain Components        (CareDroid-specific UI)
Layer 4  ── Composed Components      (reusable UI building blocks)
Layer 3  ── Primitives               (atoms: Button, Text, Icon, Input)
Layer 2  ── Design Tokens            (color, spacing, type, motion)
Layer 1  ── Foundation               (CSS reset, fonts, global contract)
```

Nothing in a higher layer is built without its lower layers being stable.  
**No skipping layers. No one-off styles.**

---

## Layer 1 — Foundation

| Item | Detail |
|---|---|
| CSS Reset | `@layer base` — normalize across browsers |
| Font loading | Inter (UI) + JetBrains Mono (code/data) via `@font-face` |
| CSS custom properties | All tokens as `--cd-*` variables |
| Dark/light mode | `prefers-color-scheme` + `data-theme` attribute override |
| 4px grid contract | All spacing is multiples of 4px |
| Focus ring contract | One globally consistent focus ring — never removed, only restyled |
| Global type scale | 6 named sizes: `xs` `sm` `md` `lg` `xl` `2xl` |
| Z-index scale | Named layers: `base` `overlay` `modal` `toast` `tooltip` |

---

## Layer 2 — Design Tokens

### Color

```
Background
  --cd-bg-base          Page background
  --cd-bg-surface       Card / panel background
  --cd-bg-elevated      Modal / popover background
  --cd-bg-sunken        Input wells, code blocks

Foreground
  --cd-text-primary     Main body text
  --cd-text-secondary   Supporting text
  --cd-text-disabled    Disabled text
  --cd-text-inverse     Text on colored backgrounds

Brand
  --cd-brand-50 … 900   Full tonal ramp

Status (semantic — map to palette in theme)
  --cd-status-info
  --cd-status-success
  --cd-status-warning
  --cd-status-danger
  --cd-status-info-bg
  --cd-status-success-bg
  --cd-status-warning-bg
  --cd-status-danger-bg

Clinical (ED-specific semantic layer on top of status)
  --cd-acuity-p1        Immediate / Red
  --cd-acuity-p2        Emergent / Orange
  --cd-acuity-p3        Urgent / Yellow
  --cd-acuity-p4        Semi-urgent / Green
  --cd-acuity-p5        Non-urgent / Blue
  --cd-breach-imminent  Timer turning red
  --cd-breach-warning   Timer turning amber

Border
  --cd-border-subtle    Dividers
  --cd-border-default   Input borders
  --cd-border-strong    Emphasis borders
```

### Spacing

```
--cd-space-0   0
--cd-space-1   4px
--cd-space-2   8px
--cd-space-3   12px
--cd-space-4   16px
--cd-space-5   20px
--cd-space-6   24px
--cd-space-8   32px
--cd-space-10  40px
--cd-space-12  48px
--cd-space-16  64px
--cd-space-20  80px
--cd-space-24  96px
```

### Typography

```
--cd-font-sans     'Inter', system-ui, sans-serif
--cd-font-mono     'JetBrains Mono', monospace

--cd-text-xs       11px / 1.4
--cd-text-sm       13px / 1.5
--cd-text-md       15px / 1.5   (base)
--cd-text-lg       17px / 1.4
--cd-text-xl       20px / 1.3
--cd-text-2xl      24px / 1.25
--cd-text-3xl      30px / 1.2
--cd-text-4xl      36px / 1.15

--cd-font-regular  400
--cd-font-medium   500
--cd-font-semibold 600
--cd-font-bold     700
```

### Radius, Shadow, Motion

```
--cd-radius-sm    4px
--cd-radius-md    8px
--cd-radius-lg    12px
--cd-radius-xl    16px
--cd-radius-full  9999px

--cd-shadow-sm    0 1px 3px rgb(0 0 0 / .08)
--cd-shadow-md    0 4px 12px rgb(0 0 0 / .10)
--cd-shadow-lg    0 8px 24px rgb(0 0 0 / .12)
--cd-shadow-xl    0 16px 48px rgb(0 0 0 / .14)

--cd-motion-instant   0ms
--cd-motion-fast      80ms
--cd-motion-normal    160ms
--cd-motion-slow      280ms
--cd-motion-ease      cubic-bezier(.4, 0, .2, 1)
--cd-motion-spring    cubic-bezier(.34, 1.56, .64, 1)
```

---

## Layer 3 — Primitives

Each primitive is a single-responsibility component with no domain logic.  
**Variants and sizes are the only props that control appearance.**

### Text

```tsx
<Text as="h1|h2|p|span|label|…"
      size="xs|sm|md|lg|xl|2xl|3xl|4xl"
      weight="regular|medium|semibold|bold"
      color="primary|secondary|disabled|inverse|brand|danger|…"
      truncate mono />
```

### Icon

```tsx
<Icon name="…" size="xs|sm|md|lg" color="…" aria-hidden />
// Source: Tabler icons — one icon library, no mixing
```

### Button

```tsx
<Button variant="primary|secondary|ghost|outline|danger|link"
        size="sm|md|lg"
        icon={left|right}
        loading disabled fullWidth />
```

### IconButton

```tsx
<IconButton icon="…" label="…" variant="…" size="…" />
```

### Input

```tsx
<Input type="text|email|password|number|search|tel"
       size="sm|md|lg"
       label hint error
       leadingIcon trailingIcon
       disabled readOnly />
```

### Textarea

```tsx
<Textarea label hint error rows resize disabled />
```

### Select

```tsx
<Select label hint error options disabled />
```

### Checkbox / Radio / Switch

```tsx
<Checkbox label description checked indeterminate disabled />
<Radio    label description checked disabled />
<Switch   label checked size="sm|md" disabled />
```

### Badge

```tsx
<Badge variant="neutral|info|success|warning|danger|brand"
       size="sm|md"
       dot />
```

### Avatar

```tsx
<Avatar src name size="xs|sm|md|lg|xl" fallback />
```

### Spinner

```tsx
<Spinner size="sm|md|lg" label />
```

### Divider

```tsx
<Divider orientation="horizontal|vertical" label />
```

### Skeleton

```tsx
<Skeleton width height rounded animate />
```

---

## Layer 4 — Composed Components

Composed from Layer 3 primitives only. No inline styles. No domain logic.

### Layout

| Component | Description |
|---|---|
| `Stack` | Vertical flex container with gap control |
| `Inline` | Horizontal flex container with gap control |
| `Grid` | CSS grid wrapper with column/gap props |
| `Center` | Centers content horizontally and/or vertically |
| `Spacer` | Flexible gap filler |
| `Cluster` | Wrapping flex row — tags, chips |
| `Box` | Escape hatch — styled div with token-based props |

### Surfaces

| Component | Slots | Notes |
|---|---|---|
| `Card` | header, body, footer, actions | Elevation via shadow token |
| `Panel` | header, body, footer | No elevation — flush surfaces |
| `Sheet` | header, body, footer | Drawer/side panel |
| `Modal` | header, body, footer, actions | Portal + focus trap |
| `Popover` | trigger, content | Floating UI anchor |
| `Tooltip` | trigger, content | Max 240px, auto placement |

### Navigation

| Component | Description |
|---|---|
| `Sidebar` | Vertical nav with sections, items, icons, collapse |
| `TopBar` | App header with logo, actions, user menu |
| `BottomNav` | Mobile tab bar (Capacitor views) |
| `Tabs` | Horizontal tab bar with content panels |
| `Breadcrumb` | Path trail with separator |
| `CommandPalette` | ⌘K global command search |

### Data Display

| Component | Props |
|---|---|
| `Table` | columns, rows, sort, select, pagination, loading, empty |
| `DataGrid` | virtualized — for 500+ row datasets |
| `List` | items, dividers, compact, selectable |
| `StatCard` | label, value, delta, trend, icon |
| `ProgressBar` | value, max, color, label, size |
| `Gauge` | circular or arc, value, max, thresholds |
| `Timeline` | events ordered by timestamp |
| `EmptyState` | icon, title, description, action |
| `ErrorState` | icon, title, description, retry |

### Feedback

| Component | Description |
|---|---|
| `Alert` | Inline status message — info/success/warning/danger |
| `Banner` | Full-width page-level message |
| `Toast` | Sonner wrapper — standardized call API |
| `ConfirmDialog` | Destructive action confirmation pattern |

### Forms

| Component | Description |
|---|---|
| `Form` | React Hook Form provider wrapper |
| `FormField` | label + control + hint + error layout |
| `SearchInput` | Input + clear button + debounce |
| `ComboBox` | Filterable select with async support |
| `DatePicker` | Calendar + manual input |
| `TagInput` | Multi-value text tokens |
| `RangeSlider` | Numeric range control |
| `FileDrop` | Drag-and-drop upload zone |

### Overlays

| Component | Description |
|---|---|
| `Drawer` | Side panel — left/right, sizes sm/md/lg/full |
| `ContextMenu` | Right-click menu via Floating UI |
| `DropdownMenu` | Action menu triggered by button |
| `ActionSheet` | Mobile-optimized bottom action list |

---

## Layer 5 — Domain Components (CareDroid-specific)

Composed from Layers 3–4. Allowed to import from `store/`, `hooks/`, `config/`.

### Patient

| Component | Description |
|---|---|
| `PatientCard` | Compact patient tile — name, acuity, MRN, wait time, flags |
| `PatientHeader` | Full patient identity header for detail views |
| `AcuityBadge` | P1–P5 colored priority indicator |
| `PatientFlagChip` | Single flag (SepsisAlert, LWBS, DeteriorationRisk, …) |
| `PatientFlagStrip` | Horizontal cluster of `PatientFlagChip` |
| `WaitTimer` | Live counting wait time with breach threshold coloring |
| `BreachTimer` | Countdown to breach — turns amber → red |
| `VitalsSnapshot` | HR / BP / SpO2 / Temp / RR / GCS compact display |
| `VitalsTrend` | Sparkline for single vital over time |
| `PatientTimeline` | Journey events in chronological order |
| `PatientNotes` | Notes list with add action |
| `DispositionChip` | Current disposition state badge |

### Queue & Flow

| Component | Description |
|---|---|
| `QueueRow` | Single patient row in a queue list |
| `QueueList` | Sorted, filterable list of `QueueRow` |
| `QueueHeader` | Queue title + count + overflow actions |
| `FlowCapacityBar` | Visual bed capacity fill bar |
| `BottleneckAlert` | Prominent bottleneck warning strip |
| `ReassessmentRail` | Right-rail alert list for overdue assessments |

### Staff & Operations

| Component | Description |
|---|---|
| `StaffChip` | Staff member name + role + avatar compact |
| `RoleBadge` | Color-coded role badge (physician, nurse, clerk, …) |
| `ShiftHeader` | Current shift time, staff on duty, handoff trigger |
| `KPIStrip` | Horizontal row of `StatCard` — department pulse |
| `CapacityCrisisMode` | Full-screen capacity crisis overlay |

### EMS

| Component | Description |
|---|---|
| `AmbulanceCard` | Unit ID, crew, ETA, patient preview |
| `AmbulanceTracker` | Map or list of active EMS units |
| `PreArrivalCard` | Incoming patient details pre-arrival |
| `HandoffChecklistItem` | Single checklist step with status |
| `HandoffChecklist` | Full EMS handoff checklist |

### AI & Clinical Tools

| Component | Description |
|---|---|
| `CopilotMessage` | Single chat message — user or AI |
| `CopilotThread` | Full conversation thread |
| `CopilotInput` | Message composer with attachments |
| `CitationCard` | Clinical source / guideline reference |
| `ToolResultCard` | Structured AI tool output |
| `ConfidenceIndicator` | AI output confidence level display |
| `CalculatorForm` | Scored clinical calculator shell |
| `CalculatorResult` | Score + interpretation + references |
| `DifferentialItem` | Single diagnosis in a differential list |
| `DifferentialList` | Ranked differential with likelihood |

### Alerts

| Component | Description |
|---|---|
| `AlertCard` | Single alert — severity, message, actions |
| `AlertRail` | Vertical stack of `AlertCard` |
| `AlertBadge` | Count badge for unread alerts |
| `SepsisAlertBanner` | High-priority sepsis protocol trigger |

---

## Layer 6 — Feature Modules

Each module is a self-contained directory:

```
src/features/
├── reception/        Patient arrival, registration, smart intake
├── triage/           Acuity scoring, breach timers, pre-triage queue
├── whiteboard/       Physician whiteboard, patient grid, who-next
├── waiting-room/     Charge nurse view, reassessment, LWBS
├── ems/              Ambulance tracker, handoff, pre-arrival
├── command/          ED manager analytics, capacity, boarding
├── copilot/          AI chat interface, context injection, citations
├── tools/            Clinical tool catalog + 81 tool pages
├── calculators/      15 calculator hubs
├── shift/            Shift summary, handoff notes, audit
├── admin/            Staff management, role assignment
├── platform/         Governance, organization profile
├── team/             Team management, invites
├── settings/         User preferences, notifications
└── auth/             Login, demo bypass, session management
```

### Module Contract (each feature module exports):

```typescript
// index.ts
export { default as FeaturePage }   from './FeaturePage'
export type { FeatureState }        from './types'
export { featureRoute }             from './route'
// No internal state leaks outside the module boundary
```

---

## Layer 7 — Screens & Flows

Every screen mapped by role and entry point.

### ED Operating System Screens

| Screen | Route | Primary Role | Key Components |
|---|---|---|---|
| Platform Start | `/` | All | WorkspaceSelector |
| Auth / Login | `/auth` | All | LoginForm, DemoBypassButton |
| Reception Workspace | `/emergency/reception` | Registration Clerk | QueueList, SmartIntakeDrawer, ArrivalControlPanel |
| Pre-Triage Queue | `/emergency/reception?queue=pretriage` | Triage Nurse | QueueList, BreachTimer, TriageAssistPanel |
| Triage Assist | `/emergency/triage` | Triage Nurse | PatientHeader, VitalsSnapshot, AcuityScorer |
| Physician Whiteboard | `/emergency/whiteboard` | Physician | PatientGrid, KPIStrip, ReassessmentRail |
| Charge Nurse View | `/emergency/whiteboard?view=charge` | Charge Nurse | ChargeNurseStrip, FlowCapacityBar, BottleneckAlert |
| EMS Workspace | `/emergency/ems` | EMS User | AmbulanceTracker, HandoffChecklist, PreArrivalCard |
| Command Center | `/emergency/whiteboard?view=command` | ED Manager | KPIStrip, CapacityBoard, BoardingTable, AnalyticsPanel |
| Waiting Room Display | `/emergency/whiteboard?display=waiting-room` | Public Display | PublicQueue, WaitTimeBoard |
| Patient Room Display | `/emergency/room/:id` | Public Display | RoomStatusDisplay |
| Department Pulse | `/emergency/pulse` | All | KPIStrip, AlertRail |
| Shift Summary | `/emergency/shift` | All | ShiftSummaryReport, HandoffNotes |
| Emergency Analytics | `/emergency/analytics` | ED Manager | Recharts dashboards |
| Emergency Settings | `/emergency/settings` | All | ScreenModeSelector, RoleSettings |

### AI Copilot Screens

| Screen | Route | Notes |
|---|---|---|
| Copilot Chat | `/emergency/copilot` | Full-session AI assistant |
| Shared Tool Session | `/tools/shared/:id` | Shareable tool result URL |

### Clinical Tool Screens (81 pages)

```
/tools                    Tool catalog (filter, search, launch)
/tools/calculators        Calculator hub (15 specialty hubs)
/tools/calculators/:hub   Individual calculator hub
/tools/drug-checker       Drug interaction checker
/tools/lab-interpreter    Lab value interpretation
/tools/diagnosis          Diagnosis assistant
/tools/differential       Differential AI
/tools/order-set          Order set AI
/tools/guidelines         Guideline RAG
/tools/procedure-guide    Procedure guide
/tools/ambient-scribe     Ambient documentation
/tools/patient-summary    Patient summary AI
/tools/timeline           Patient timeline AI
/tools/clinical-audit     Clinical audit
/tools/ai-explainability  AI explainability
/tools/:specialty         Specialty AI assistants (cardiology, neurology, …)
```

### Admin & Platform Screens

| Screen | Route |
|---|---|
| Admin Operations | `/admin/operations` |
| Staff Management | `/admin/operations/staff` |
| Staff Workflows | `/admin/operations/staff-workflows` |
| Platform Governance | `/platform/governance` |
| Organization Profile | `/platform/organization` |
| Team Management | `/team` |
| Profile | `/profile` |
| Profile Settings | `/profile/settings` |
| Billing & Usage | `/billing` |
| System Health | `/system-health` |
| Developer Catalog | `/tools/catalog` |
| AI Governance | `/ai-governance` |
| AI Evaluation | `/ai-evaluation` |
| Help Center | `/help` |

---

## State Architecture

### Rule: one store per concern, no cross-store imports

```
Store Layer
├── emergencyStore       Live ED operational state (patients, queues, EMS, alerts)
├── featureStore         Feature flag overrides (session-scoped)
├── userStore            Authenticated user identity + role + permissions
├── settingsStore        User preferences, screen mode, theme
└── copilotStore         AI chat session state (messages, context, streaming)

Server State (TanStack Query or SWR — not in Zustand)
├── /api/profile/me              User profile
├── /api/workspaces              Available workspaces
├── /api/emergency/*             ED data (demo-fixture today)
└── /api/tools/*                 Tool metadata

URL State (not duplicated in stores)
├── ?queue=                      Active queue tab
├── ?view=                       Whiteboard view mode
├── ?filter=                     Tool catalog filter
└── ?open=                       Open tool panel

Local Component State (useState — never lifted unnecessarily)
├── Form field values
├── Dropdown open/close
├── Hover/focus
└── Transient UI state
```

### emergencyStore shape

```typescript
type EmergencyStore = {
  // Entities
  patients:   Patient[]
  queues:     Queue[]
  emsUnits:   EmsUnit[]
  alerts:     Alert[]

  // Derived (selectors, not stored)
  // → use selector functions, not store fields

  // Actions — one verb per action
  addPatient:         (p: Patient) => void
  updatePatient:      (id, patch: Partial<Patient>) => void
  movePatientToState: (id, state: PatientState) => void
  addVitals:          (id, v: Vitals) => void
  addFlag:            (id, flag: PatientFlagType) => void
  removeFlag:         (id, flag: PatientFlagType) => void
  addJourneyEvent:    (id, e: JourneyEvent) => void
  addEMSUnit:         (u: EmsUnit) => void
  updateEMSUnit:      (id, patch: Partial<EmsUnit>) => void
  addEMSArrival:      (a: EMSArrival) => void
  dispatchAlert:      (a: Alert) => void
  dismissAlert:       (id: string) => void
  setBottleneckAlert: (b: BottleneckAlert) => void
  clearBottleneckAlert: () => void
}
```

---

## Routing Architecture

```typescript
// type-safe route registry — one file, every route
export const ROUTES = {
  // Auth
  auth:               '/auth',
  // ED OS
  reception:          '/emergency/reception',
  whiteboard:         '/emergency/whiteboard',
  ems:                '/emergency/ems',
  copilot:            '/emergency/copilot',
  analytics:          '/emergency/analytics',
  pulse:              '/emergency/pulse',
  shift:              '/emergency/shift',
  settings:           '/emergency/settings',
  // Tools
  tools:              '/tools',
  calculators:        '/tools/calculators',
  // Admin
  admin:              '/admin/operations',
  team:               '/team',
  profile:            '/profile',
  billing:            '/billing',
  systemHealth:       '/system-health',
} as const

export type Route = typeof ROUTES[keyof typeof ROUTES]

// Route guards: role-based, not scattered across components
// Every guarded route declares its minimum role in the route definition
```

---

## Data Contracts (Core Types)

```typescript
// Every ID is a branded string — prevents id-field mixups
type PatientId   = string & { readonly _brand: 'PatientId' }
type EmsUnitId   = string & { readonly _brand: 'EmsUnitId' }
type AlertId     = string & { readonly _brand: 'AlertId' }
type ISODateString = string & { readonly _brand: 'ISO8601' }

// Vitals — single reading at a point in time
type Vitals = {
  hr:          number
  bpSystolic:  number
  bpDiastolic: number
  spo2:        number
  temp:        number
  rr:          number
  gcs?:        number
  pain?:       number
  recordedAt:  ISODateString
}

// Patient — normalized, no derived/cached fields
type Patient = {
  id:               PatientId
  firstName:        string
  lastName:         string
  dob:              string
  sex:              'M' | 'F' | 'Other'
  mrn:              string
  state:            PatientState
  priority:         Priority
  vitals:           Vitals[]      // ordered, newest last
  flags:            PatientFlagType[]
  timeline:         JourneyEvent[]
  notes:            PatientNote[]
  chiefComplaint:   string
  complaintCategory: string
  arrivalTime:      ISODateString
  triageTime:       ISODateString | null
  lastAssessedTime: ISODateString | null
  assignedStaffId:  string | null
  roomId:           string | null
}
```

---

## API / Service Layer

```
src/services/
├── apiClient.ts              Base HTTP client, auth headers, error normalization
├── patientService.ts         Patient CRUD, vitals, flags
├── queueService.ts           Queue reads, patient moves
├── emsService.ts             EMS arrivals, unit tracking
├── alertService.ts           Alert dispatch, dismiss
├── analyticsService.ts       ED analytics queries
├── copilotService.ts         AI chat, tool invocation, streaming
├── profileService.ts         User profile, workspace resolution
├── featureFlagService.ts     Feature flag evaluation
└── notificationService.ts    Push notifications (Capacitor)
```

Each service:
- Returns typed responses (no `any`)
- Validates at boundary with Zod schemas (runtime safety)
- Throws typed errors (`ApiError` subclasses)
- Is independently testable (no direct Zustand imports)

---

## File & Folder Convention

```
src/
├── components/              Layer 3–4: Primitives and composed components
│   ├── primitives/          Text, Icon, Button, Input, Badge, Avatar, …
│   ├── layout/              Stack, Inline, Grid, Center, Box, …
│   ├── surfaces/            Card, Modal, Drawer, Sheet, Popover, …
│   ├── navigation/          Sidebar, TopBar, Tabs, Breadcrumb, …
│   ├── data-display/        Table, List, StatCard, Timeline, EmptyState, …
│   ├── feedback/            Alert, Banner, Toast, ConfirmDialog, …
│   └── forms/               Form, FormField, ComboBox, DatePicker, …
├── domain/                  Layer 5: Domain components
│   ├── patient/             PatientCard, AcuityBadge, VitalsSnapshot, …
│   ├── queue/               QueueRow, QueueList, BreachTimer, …
│   ├── ems/                 AmbulanceCard, HandoffChecklist, …
│   ├── alerts/              AlertCard, AlertRail, …
│   ├── staff/               StaffChip, RoleBadge, …
│   └── clinical/            CalculatorForm, DifferentialList, …
├── features/                Layer 6: Feature modules
│   ├── reception/
│   ├── triage/
│   ├── whiteboard/
│   ├── waiting-room/
│   ├── ems/
│   ├── command/
│   ├── copilot/
│   ├── tools/
│   ├── calculators/
│   ├── shift/
│   ├── admin/
│   ├── platform/
│   ├── team/
│   ├── settings/
│   └── auth/
├── pages/                   Layer 7: Route-level screen components (thin wrappers)
├── store/                   Zustand stores
├── services/                API and external services
├── hooks/                   Shared React hooks
├── types/                   TypeScript contracts
├── config/                  Role permissions, routes, capabilities
├── styles/                  Global CSS, token definitions
└── utils/                   Pure utility functions
```

---

## Build Sequence (Implementation Order)

```
Week 1–2    Layer 1–2   Foundation + all design tokens
Week 3–4    Layer 3     All primitives (Text, Icon, Button, Input, Badge, Avatar, …)
Week 5–6    Layer 4     All composed components
Week 7–8    Layer 5     All domain components
Week 9–10   Layer 6     Feature modules (reception, triage, whiteboard first)
Week 11–12  Layer 7     Screens assembled and wired
Ongoing     State       Stores hardened and connected to real backend
```

---

## What Changes from Today's Codebase

| Current State | Target State |
|---|---|
| Styles scattered across 200+ `.css` files | All design tokens in one `tokens.css`, component styles co-located |
| `as any` in 200+ files | Proper types at every layer boundary |
| One giant `emergencyStore` with implicit actions | Explicit typed action signatures, selectors for derived state |
| Domain logic mixed into page components | Feature modules own their logic; pages are thin |
| `src/components/` is flat with 100+ files | Organized into `primitives/`, `layout/`, `surfaces/`, `domain/` |
| Routes defined in multiple places | Single `ROUTES` registry, type-safe |
| No runtime API validation | Zod schemas at every API boundary |
| `_review` future modules mixed in | Future modules in dedicated `src/features/future/` — never transitively imported |

---

*This document defines the target architecture. Implementation starts from Layer 1 and builds up.*
