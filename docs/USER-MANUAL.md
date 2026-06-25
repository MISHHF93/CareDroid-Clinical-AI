# CareDroid User Manual

**Version:** Pilot / demo-ready  
**Audience:** Emergency department staff, clinical evaluators, and manual Codespace testers  
**Last updated:** June 2026

---

## 1. What this manual is for

CareDroid is a full emergency department operating platform with embedded AI. The codebase contains many layers — clinical workflows, analytics, fleet extensions, platform admin, and developer tooling — that are not all meant for frontline staff at once.

This manual does three things:

1. **Explains what practitioners should use** — the reception-first ED workflow, not the entire tech stack.
2. **Walks through role-based procedures** — who does what, in what order.
3. **Defines a cleanup playbook** — data, visual, and process steps to make the platform ready for manual Codespace onboarding and real user evaluation.

If the product feels “nested” or misleading, that is usually because **Pilot Customer Mode** is hiding extension surfaces while the codebase still contains platform, fleet, surveillance, and AI-center routes. This manual separates **what you operate** from **what developers maintain**.

**Where this file lives:** `docs/USER-MANUAL.md` (linked from `README.md`).

---

## 2. What CareDroid is — and is not

### CareDroid is

- A **reception-first, whiteboard-centered** emergency department operating layer.
- Built for roughly **100 patients/day** and teams under **10 staff**.
- **Role-based**: registration clerk, triage nurse, charge nurse, physician, EMS, ED manager, and display roles each see a scoped view.
- **Human-reviewed**: AI copilot assists with context, evidence, and workflow prompts — staff must review before any clinical action.
- **Demo/manual-data-first** in the current pilot: data sources are labeled; there is no live EHR writeback unless explicitly integrated.

### CareDroid is not

- An autonomous clinician (no autonomous diagnosis, prescribing, order entry, discharge, or acuity assignment).
- A replacement for your EHR.
- A single “dashboard of everything.” Extension suites (fleet, IoT, surveillance, platform admin) exist in the codebase but are **not part of the frontline ED pilot**.

### Clinical scope (high level)

| Area | What CareDroid supports |
|------|-------------------------|
| Patient flow | Reception, triage queues, whiteboard, reassessment timers |
| Coordination | EMS offload, referrals, boarding, capacity |
| Clinical support | Calculators (qSOFA, NEWS2, HEART, Wells, GCS, NIHSS, etc.), copilot summaries |
| Operations | Department pulse, shift summary, throughput analytics |
| Training | Simulation and walkthrough datasets |

---

## 3. Mental model — how the product is organized

CareDroid groups work into **11 suites**. Frontline staff primarily use suites **1–7**. Suites **8–11** are extensions and platform tooling.

| # | Suite | Who uses it | Pilot nav |
|---|-------|-------------|-----------|
| 1 | Reception & Arrival | Registration clerk, triage | **Visible** |
| 2 | Emergency Whiteboard | Charge nurse, physician, manager | **Visible** |
| 3 | Triage / Reassessment / Clinical Flow | Triage nurse, charge nurse | **Visible** |
| 4 | EMS / Referral / Boarding | EMS, charge nurse, manager | **Visible** |
| 5 | Physician / Clinical Copilot | Physicians, all clinical roles | **Visible** |
| 6 | Charge Nurse / Command Center | Charge nurse, ED manager | **Visible** (Pulse, Shift) |
| 7 | Analytics / Simulation / QA | Manager, educators | **Visible** |
| 8 | Fleet / Ambulance Extension | Dispatch (optional) | Hidden in pilot |
| 9 | Telemetry / IoT / Digital Twin | Engineering / ops | Hidden in pilot |
| 10 | Platform Admin / SaaS | Administrators | Direct URL only |
| 11 | Integration Hub / Automation | Integrations team | **Visible** (Integrations) |

**Pilot Customer Mode** (currently enabled) shows only core ED navigation items. Extension items — Cosmos, Platform hub, Fleet, Surveillance, Simulation lab, Knowledge Graph, Audit, AI Center, Admin — are hidden from the sidebar unless entitlements expand.

---

## 4. Getting started

### 4.1 Local or Codespace setup

**Requirements:** Node `>=20.19.0`, npm `>=10`

```bash
npm install
npm --prefix backend install
cp .env.example .env
cp backend/.env.example backend/.env
npm start
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8000 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/health |

Local defaults use SQLite and disable optional ML/RAG services so the app boots without Docker.

### 4.2 First login — demo persona

Open the app and use **open-access demo mode**. You enter as:

> **Dr. Cara George** — ED Clinical Director, Emergency Department 18, CareDroid Memorial Hospital

One identity travels across every role view. Use the **Demo persona drawer** (session chrome) to switch roles without re-authenticating.

### 4.3 Entry hub

Navigate to **Entry hub** (`/start`) to choose:

- Explore the demo as Dr. George
- Open admin staff workflows
- Review the guided demo journey (steps A–K)

### 4.4 Default landing screen

**Reception-first mode** is enabled. Most roles land on **Reception** (`/emergency/reception`), not the whiteboard. This matches how a real ED front desk starts the day.

### 4.5 Practitioner layout (pilot cleanup)

During pilot review, **Practitioner Cleanup** flattens the UI so staff see queues and patients first — not nested platform chrome.

| Screen | What you see (top → bottom) | What stays in the background |
|--------|-----------------------------|------------------------------|
| **Reception** | Title · data source · operational strip · intake pipeline | Process education, status messaging, throughput cluster, communication panel, alert rail, audit history |
| **Whiteboard** | Title · data source · primary stats · filter chips · patient grid | Hero copy, card-key legend, role strips, alert rails, mission control, queue intelligence, Native AI panels |
| **Patient card** | Name · acuity · one signal badge · core meta | Predictive badges, tool chips, Native AI chips, data-quality noise |
| **Profile** | Title · nav tabs · summary grid · recent tools | Access summary panel, competency card, PHI audit panel, nested subtitles |
| **Tools** | Title · workspace · search · filter tabs · tool grid | Context row, execution legend, header stats, breadcrumbs, clinical intelligence panel |
| **Settings** | Theme · notifications · privacy actions | Platform admin strip, enterprise identity, tenant isolation audit |

All visibility rules are centralized in:

- `src/config/practitionerCleanup.config.js` — toggles
- `src/config/practitionerSurfaceVisibility.js` — one map pages read at render time

---

## 5. Role guide — who sees what

| Role | Primary screens | Can do | Cannot do |
|------|-----------------|--------|-----------|
| **Registration Clerk** | Reception, Patients, Pulse, Shift | Register walk-ins, verify identity, convert EMS arrivals, escalate to triage | Assign acuity, move queues, clinical notes |
| **Triage Nurse** | Reception (pretriage), Whiteboard, EMS, Copilot, Tools | Triage, vitals, flags, queue moves, EMS handoff | Disposition, full analytics |
| **Charge Nurse** | Reception, Whiteboard, Queues, Reassess, EMS, Boarding | Flow control, staff/room assignment, reassessment, capacity | — |
| **Physician** | Whiteboard, Patients, Copilot, Tools, Referrals | Review patients, notes, referrals, disposition | Registration-only actions |
| **EMS User** | EMS pipeline, Reception handoff | Offload tracking, handoff checklist | Triage acuity, disposition |
| **ED Manager** | Reception, Whiteboard, Analytics, Capacity, Boarding | Throughput, analytics, surge, transfers | — |
| **Public Display** | Whiteboard (waiting-room view) | Read-only queue status for families | Any PHI editing |
| **Read-Only Display** | Whiteboard (hallway monitor) | Departmental KPIs | Any mutations |
| **Admin** | All routes | Settings, staff workflows, governance | — |

Switch roles via **Demo persona drawer → Switch profile** or the profile role switcher chips.

---

## 6. The ED patient journey (A–K demo walkthrough)

Follow this sequence to understand the full platform without getting lost in nested menus.

| Step | Title | Role / Route | What happens |
|------|-------|--------------|--------------|
| **A** | Choose your entry path | `/start` | Pick demo or admin |
| **B** | Meet Dr. Cara George | — | One identity across lanes |
| **C** | Command the department | ED Manager → Whiteboard | Department KPIs and flow |
| **D** | Walk the reception desk | Registration Clerk → Reception | Arrival intake, escalation |
| **E** | Run triage | Triage Nurse → Reception pretriage | Acuity queues, breach timers |
| **F** | Hold the waiting room | Charge Nurse → Whiteboard | Fit-to-wait, LWBS risk |
| **G** | Round with physicians | Physician → Whiteboard | Provider queue, disposition |
| **H** | Complete EMS handoff | EMS User → EMS | Offload and checklist |
| **I** | Capture with Copilot | Any lane → Copilot | Log decisions, handoffs |
| **J** | Preview staff workflows | Admin → Staff workflows | Role assignment preview |
| **K** | Review profile | Profile | Preferences and tool policy |

Open **Demo persona drawer → Demo journey** and click **Go** on each step.

---

## 7. Core screens — procedures

### 7.1 Reception (`/emergency/reception`)

**Purpose:** Front door — arrivals, verification, EMS pre-arrival, pretriage handoff.

**Typical procedure (registration clerk):**

1. Check **EMS pre-arrival** panel for inbound units.
2. **Register walk-in** or **convert EMS arrival** when the unit arrives.
3. Route patients through verification → pretriage queues.
4. **Escalate** high-risk complaints to triage.
5. Hand off to triage nurse when pretriage queue is ready.

**Queues to know:**

| Queue | Meaning |
|-------|---------|
| EMS | Ambulance patients after pre-arrival or conversion |
| Verification | Waiting for ID check or document scan |
| Pretriage | Registered, awaiting triage nurse |
| Recent arrivals | Walk-ins and conversions in last 30 minutes |

**Tip:** Reception-first mode routes intake through Reception. Standalone Intake nav may be hidden for some roles.

---

### 7.2 Emergency Whiteboard (`/emergency/whiteboard`)

**Purpose:** Primary operational board — patient cards, queues, flags, assignments.

**Typical procedure (charge nurse / physician):**

1. Scan patient cards for flags (reassessment breach, long wait, deterioration).
2. Use filters for waiting, assigned, or boarding lenses.
3. Open a **patient card** for vitals, notes, journey, and copilot context.
4. Move patients between queues or assign staff/rooms (role-dependent).
5. Complete reassessments when timers breach.

**Empty board?** Register a walk-in from Reception, convert an EMS unit, or load the walkthrough dataset in Settings.

---

### 7.3 EMS (`/emergency/ems`)

**Purpose:** Ambulance arrivals, offload timing, handoff checklists.

**Typical procedure (EMS / charge nurse):**

1. Track inbound units and bay readiness.
2. Complete **handoff checklist** on arrival.
3. Convert to reception patient record when appropriate.
4. Monitor offload delays and capacity pressure.

---

### 7.4 Queues & Reassessment

| Screen | Route | Purpose |
|--------|-------|---------|
| Queues | `/emergency/queues` | Queue intelligence and bottleneck view |
| Reassess | `/emergency/reassessment` | Reassessment timers and breach management |

Charge nurses use these for flow control; physicians may see reassessment alerts on the whiteboard.

---

### 7.5 Capacity, Boarding, Referrals

| Screen | Route | Purpose |
|--------|-------|---------|
| Capacity | `/emergency/capacity` | Bed and surge visibility |
| Boarding | `/emergency/boarding` | Inpatient boarding delays |
| Referrals | `/emergency/referrals` | Transfer and referral coordination |

Primarily used by ED manager and charge nurse roles.

---

### 7.6 CareDroid Copilot (`/emergency/copilot`)

**Purpose:** Case-aware AI assistant using live board context.

**Rules:**

- Every response requires **staff review** before clinical action.
- Copilot supports routing, evidence, summaries, and workflow prompts.
- Copilot does **not** autonomously diagnose, prescribe, or disposition.

**Typical uses:**

- “Summarize this patient’s current status”
- “What reassessment signals should I review?”
- “Recommend clinical tools for this case”
- Department-level: queue bottlenecks, operational awareness

**Note:** Copilot may be hidden on the Reception screen in reception-first mode to reduce noise at the front desk. Open it from the sidebar or patient card when needed.

---

### 7.7 Medical Tools (`/emergency/tools` or `/tools/calculators`)

**Purpose:** Clinical calculators and guided chat workflows.

Examples: qSOFA, NEWS2, SOFA, HEART, Wells PE/DVT, Shock Index, NIHSS, GCS, PERC.

Many tools run locally or via chat-assisted workflows. A narrower set uses live backend executor APIs. Tool availability may be restricted by role tool policy.

---

### 7.8 Pulse, Shift, Analytics

| Screen | Route | Purpose |
|--------|-------|---------|
| Pulse | `/emergency/pulse` | Real-time department pulse |
| Shift | `/emergency/shift` | Shift summary and handoff |
| Analytics | `/emergency/analytics` | Throughput and operational analytics |

---

### 7.9 Settings (`/emergency/settings`)

**Purpose:** Department preferences, walkthrough dataset loading, display configuration.

Use **Load walkthrough dataset** to populate the whiteboard for demos when the board is empty.

---

## 8. Navigation reference (pilot mode)

These items appear in the sidebar during pilot:

| Nav item | Route |
|----------|-------|
| Reception | `/emergency/reception` |
| Whiteboard | `/emergency/whiteboard` |
| Intake | `/emergency/intake` |
| EMS | `/emergency/ems` |
| Patients | `/emergency/patients` |
| Queues | `/emergency/queues` |
| Reassess | `/emergency/reassessment` |
| Capacity | `/emergency/capacity` |
| Boarding | `/emergency/boarding` |
| Referrals | `/emergency/referrals` |
| Copilot | `/emergency/copilot` |
| Medical Tools | `/emergency/tools` |
| Analytics | `/emergency/analytics` |
| Settings | `/emergency/settings` |
| Integrations | `/integrations/hub` |
| Pulse | `/emergency/pulse` |
| Shift | `/emergency/shift` |

**Hidden in pilot** (reachable by direct URL for developers): Cosmos, Platform, Fleet, Surveillance, Simulation, Laboratory, Knowledge Graph, Audit, AI Center, Admin.

---

## 9. Data sources and honesty labels

The pilot runs in **demo-fixture / local-first** mode:

| Data type | Source | Label to expect |
|-----------|--------|-----------------|
| Profile & workspaces | Backend API (real) | — |
| Whiteboard reads | Demo envelope / local store | “Demo” or data-source banner |
| Reception handoffs | Backend POST (real routes) | — |
| Whiteboard mutations | Local Zustand store | Changes may not persist across refresh |
| AI responses | Configured AI provider | Staff review required |

Always check **EdDataSourceBanner** and **ApiStateBanner** on a screen before treating data as production-connected.

---

## 10. Cleanup playbook — making the platform practitioner-ready

The platform currently shows too much to medical practitioners because the codebase contains the full product surface while pilot mode only partially hides it. Use this three-part cleanup process before Codespace manual onboarding.

### Phase 0 — Principles

1. **One story per role** — each role should have ≤5 primary actions and ≤7 nav items.
2. **Label everything** — demo, preview, planned, or live.
3. **Progressive disclosure** — show operational data first; tuck analytics and platform tooling behind role gates.
4. **No nested surprises** — if a screen is not in the pilot nav, it should not appear in practitioner search or command palette.

---

### Phase 1 — Data cleanup

| # | Task | How | Owner |
|---|------|-----|-------|
| 1.1 | Reduce whiteboard patient cardinality | Cap demo dataset to 18 representative patients covering each queue state (**implemented**) | Data / FE |
| 1.2 | Tag every metric with source | Ensure `EdDataSourceBanner` on Reception, Whiteboard, EMS, Analytics | FE |
| 1.3 | Remove duplicate patient narratives | Audit seed data for repeated names/MRNs | Data |
| 1.4 | Align empty states | Use `EMPTY_STATE_COPY` entries — every empty queue needs guidance + next steps | FE |
| 1.5 | Suppress platform telemetry on clinical screens | Hide ApiStateBanner, debug chips, and developer metrics from reception/whiteboard | FE |
| 1.6 | Walkthrough dataset as default | Settings should offer one-click “Load ED-18 walkthrough” for empty boards | FE |
| 1.7 | Copilot context budget | Limit copilot prompt context to active patient + department summary, not full platform inventory | AI |
| 1.8 | Role-scoped tool catalog | Enforce `toolPolicy` from user profile — physicians see clinical pack, clerks see none | Config |

**Verification:** A registration clerk sees only reception-relevant patients and queues. A physician sees assigned/department patients, not fleet telemetry.

---

### Phase 2 — Visual cleanup

Run the inventory script:

```bash
npm run inventory:visual-cleanup
npm run check:inline-styles
```

| # | Task | Current signal | Target |
|---|------|----------------|--------|
| 2.1 | Migrate inline styles | 86 files, top offender `emergency/index.tsx` (85 inline styles) | 0 inline styles on ED core pages |
| 2.2 | Adopt PageShell on dashboards | 30+ dashboard files missing PageShell | All practitioner dashboards use `PageShell` / `cd-page-shell` |
| 2.3 | Split oversized CSS | `AppShell.css` (2566 lines), `EmergencyWhiteboard.css` (1058) | ≤400 lines per file, shared tokens |
| 2.4 | MetricGrid consolidation | Emergency routes use ad-hoc metric layouts | Single `MetricGrid` pattern on strips |
| 2.5 | Alert rail consistency | Reception, Whiteboard, Operational alert rails | One visual language for alerts |
| 2.6 | Reduce header chrome | Session bar + header + operational strip stacking | Max 2 chrome rows on clinical screens |
| 2.7 | Copilot panel density | CopilotPanel.css (759 lines) | Collapsed by default; expand on demand |
| 2.8 | Mobile reception desk | Reception desk UI config | Touch-friendly quick intake on tablet |

**Verification:** Screenshot comparison — reception and whiteboard at 1280×800 and 390×844 with no horizontal scroll and no developer banners.

---

### Phase 3 — Process & procedure cleanup

| # | Task | Description |
|---|------|-------------|
| 3.1 | Canonical ED journey | Publish A–K journey in onboarding; remove competing entry paths |
| 3.2 | Reception pipeline stages | One pipeline shell: arrival → verify → pretriage → triage handoff |
| 3.3 | Role action matrix audit | Confirm `EMERGENCY_ROLE_ACTION_MATRIX` matches what UI exposes — hide disabled actions, don't gray out dozens of buttons |
| 3.4 | Command palette scope | Role-filter commands; remove platform/fleet commands from clinical roles |
| 3.5 | Intake route consolidation | Reception-first: all intake through Reception, not standalone Intake nav |
| 3.6 | Copilot placement policy | Hidden on reception; available on whiteboard, patient card, dedicated copilot route |
| 3.7 | Shift handoff procedure | Document shift summary workflow in Shift screen empty state |
| 3.8 | EMS handoff checklist | Single checklist path: EMS → Reception convert → Triage queue |
| 3.9 | Admin separation | Admin and staff-workflows only linked from Entry hub and admin role |
| 3.10 | Search scope | Patient/encounter search only for clinical roles; no platform artifact search |

**Verification:** Walk the A–K journey as a new Codespace user in ≤30 minutes without asking “what is this screen?”

---

### Implementation status (June 2026)

The following playbook items are wired in code via `src/config/practitionerCleanup.config.js`:

**Phase 1 — Data**
- Walkthrough dataset capped at **18 active patients** (`practitionerCleanup.constants.js`)
- Seed patient MRNs deduped in fixtures (`src/utils/patientSeedUtils.js`)
- `EdDataSourceBanner` on Patients, Whiteboard, Reception, Analytics
- Developer `ApiStateBanner` hidden on frontline ED routes during pilot cleanup
- Patient Journey Engine card hidden on Patients route
- Copilot context budgets (3 recommendations / 3 orchestration recs / 3 notes)
- Role-scoped tool catalog via `compileUserProfile` / `filterToolsForProfileGraph` on Tools overview

**Phase 2 — Visual**
- Whiteboard page: **0 inline `style={{}}`** (classes in `emergency-whiteboard-cleanup.css`)
- `PageShell` on Emergency Analytics, Shift summary, and shared `EmergencyRoutePage` routes
- Emergency Analytics heatmap/legend moved to CSS classes (no inline styles)
- Large CSS split into ≤400-line parts: `AppShell.css`, `EmergencyWhiteboard.css`, `CopilotPanel.css` (`node scripts/split-large-css.mjs`)

**Phase 3 — Process**
- Command palette extension routes suppressed; registration clerk search is patient-only
- Session chrome Dev/API segments suppressed during practitioner review (`SessionChromeBar`)
- Whiteboard empty state offers **Load ED-18 walkthrough** action
- Whiteboard operational-awareness layout forced by default
- Shift summary empty-state guidance when board is clear
- Copilot collapsed by default (`copilotOpen: false` in store); auto-open on whiteboard disabled during pilot cleanup

**Surface visibility (background vs screen)**
- Central map: `getPractitionerSurfaceVisibility()` in `practitionerSurfaceVisibility.js`
- Whiteboard: hero chrome, card-key, role strips, alert rails, command dashboard, mission control, queue intelligence, ops-detail, Native AI, diagnostic dashboard, Who Next — **patient grid + primary stats + filter chips remain**
- Reception: intro description, process education, status messaging, throughput cluster, communication panel, alert rail, operational history, data-quality audits hidden — **operational strip + pipeline remain**
- Patient cards: one signal badge; predictive / tool / Native AI / data-quality chips suppressed
- Analytics: central-node command layer and upgrade-harness grids hidden; shift KPI charts and trend graphs remain
- Compact CSS: `src/styles/practitioner-compact.css` (global tighter padding on profile, tools, settings, header, sidebar, PageShell, copilot when `data-practitioner-compact` is on `<main>`)
- Profile: shell eyebrow, access summary, competency card, PHI panel suppressed
- Tools: overview context/legend/stats, tool breadcrumbs, meta badges, clinical intelligence panel suppressed
- Settings: platform admin strip and enterprise sections suppressed for frontline pilot
- Header: page subtitles hidden during pilot cleanup

### Phase 4 — Codespace manual onboarding checklist

Use this checklist when handing the platform to a manual tester:

- [ ] `npm start` boots frontend (:8000) and backend (:3000) without Docker
- [ ] Open `/start` → Entry hub loads
- [ ] Demo persona shows Dr. Cara George in session chrome
- [ ] Switch to Registration Clerk → lands on Reception
- [ ] Register walk-in → patient appears in pretriage queue
- [ ] Switch to Triage Nurse → assign acuity → patient moves to whiteboard
- [ ] Switch to Charge Nurse → whiteboard shows reassessment timers
- [ ] Switch to Physician → open patient card → copilot summary works
- [ ] Switch to EMS User → EMS handoff checklist completable
- [ ] No extension nav items visible (Fleet, Cosmos, AI Center, etc.)
- [ ] Data source banners visible where data is demo/fixture
- [ ] Copilot shows “Staff review required” disclaimer

---

## 11. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Empty whiteboard | No patients registered | Register from Reception or load walkthrough dataset in Settings |
| Too many nav items | Pilot mode off or admin role | Switch to a frontline demo role |
| Copilot not on Reception | Reception-first hides copilot | Open Copilot from sidebar |
| Changes disappear on refresh | Local-first whiteboard store | Expected in pilot; handoffs via API do persist |
| Backend errors | API not running | Run `npm start` (full stack) |
| Inline layout broken | Viewport/keyboard on mobile | Check responsive QA: `npm run test:responsive-regression` |

---

## 12. Quick reference — canonical routes

| Workflow | Route |
|----------|-------|
| Entry hub | `/start` |
| Reception | `/emergency/reception` |
| Whiteboard | `/emergency/whiteboard` |
| EMS | `/emergency/ems` |
| Copilot | `/emergency/copilot` |
| Medical Tools | `/tools/calculators` |
| Admin staff workflows | `/admin/staff-workflows` |
| Profile | `/profile` |

Full route map: `src/config/routes.config.js`

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Pilot Customer Mode** | Hides extension nav; shows core ED items only |
| **Reception-first UX** | Reception is the default home, not whiteboard |
| **Suite** | Product grouping (11 suites, 1–7 are core ED) |
| **Demo persona** | Dr. Cara George open-access identity |
| **Walkthrough dataset** | Seeded patients for demo boards |
| **Copilot** | CareDroid AI assistant — human review required |
| **Local-first** | Whiteboard state in browser store until API persistence ships |

---

## 14. Related developer docs

| Resource | Location |
|----------|----------|
| Repository README | `README.md` |
| Suite registry | `lib/features/suiteRegistry.ts` |
| ED workflow model | `src/config/edWorkflowIntegrationModel.ts` |
| Role permissions | `src/config/emergencyRolePermissions.js` |
| Demo persona | `src/config/demoPersonaModel.ts` |
| Visual cleanup inventory | `npm run inventory:visual-cleanup` |
| Platform inventory tests | `npm run inventory:report` |
| Practitioner surface map | `src/config/practitionerSurfaceVisibility.js` |
| Practitioner cleanup toggles | `src/config/practitionerCleanup.config.js` |

---

*CareDroid accompanies clinical teams — it does not replace them. Review all AI output before action.*