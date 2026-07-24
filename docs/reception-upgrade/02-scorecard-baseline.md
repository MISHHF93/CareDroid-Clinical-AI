# Reception Profile Scorecard — Baseline (Pre-Upgrade)

> Graded against production-grade standards for an operational ED front-desk system.
> Scale: 1–10 per dimension. Total weighted out of 100.

---

## Re-score after FE↔BE create/handoff wire-up (2026-07-23)

Code audit + implementation pass (awaited `createSmartIntakePatient`, capability flags REAL for patients/smart-intake/reception snapshot, OCR→draft helpers, registration_clerk persona density).

| Surface | Prior (plan audit) | Updated | Notes |
|---------|-------------------:|--------:|-------|
| Reception Desk | 68 | **78** | Create & route awaits backend; sync status UX; primary action labels; queue focus after create |
| User Profile | 74 | **80** | Clerk actions already had `createPatient`; persona density wired into reception desk slim mode |
| Patient onboarding | 70 | **82** | Local-first + awaited BE create; provisional/verification tab routing; Smart Intake same orchestrator |
| Smart Intake + OCR | 72 | **78** | OCR field merge helpers; BE sync status on Smart Intake create; OCR capability REAL |
| FE↔BE contract | 65 | **84** | `emergencyPatients` / `emergencySmartIntake` / `emergencyReceptionSnapshot` promoted REAL (session board mutators) |

## Full E2E audit re-score (2026-07-23, later same day)

Full-module audit + hardening: PHI RBAC on create/OCR, OCR apply demographics + review gate, desk OCR capture strip, live duplicate scan, reception staff profiles, provisional backend sync, clerk stays on desk after create, real handoff CTA.

| Domain | Score |
|--------|------:|
| Backend integrity | **72** |
| Frontend completeness | **84** |
| AI execution | **62** |
| OCR performance | **76** |
| Workflow completeness | **80** |
| Design consistency | **78** |
| Accessibility | **74** |
| Security | **78** |
| Interoperability | **70** |
| Testing | **72** |
| Documentation | **82** |
| **Production readiness** | **74** |

See [RECEPTION_HEALTH_REPORT.md](./RECEPTION_HEALTH_REPORT.md) for the full matrix and residual P0 items (board rehydrate, durable OCR store, MPI).

**Not claimed:** multi-tab durability of in-memory OCR jobs / board after process restart; full Playwright live browser create path (sandbox esbuild block may prevent vitest in some envs).

---

## Scoring Summary

| # | Dimension | Score | Weight | Weighted | Key Finding |
|---|-----------|-------|--------|----------|-------------|
| 1 | **Correctness & Data Integrity** | 7 | 15 | 105 | Core intake → route flow works end-to-end. Backend handoff endpoint functional. Draft persistence via sessionStorage (no server-side autosave). |
| 2 | **RBAC & Security** | 6 | 15 | 90 | Role definition complete (registration_clerk). 6 allowed actions, clinical denials enforced. But: no backend RBAC guard on `reception/snapshot` or `reception/handoff` endpoints — frontend-only gating. |
| 3 | **Information Architecture** | 5 | 12 | 60 | Single page at `/emergency/reception`. No sub-routes. All panels co-located. Toolbar has 3 groups (Actions/Filters/Flow). Queue tabs work. But: no dedicated pages for EMS arrivals, escalation detail, or intake review. |
| 4 | **Command Center UI** | 5 | 12 | 60 | EmergencyRoutePage zone layout. Toolbar rendered in `primaryActions`. Queue rail in `supportingContext`. Stepper + intake in `activeWork`. But: situation brief was blue-tinted (fixed in prior sessions). No real-time count badges. No patient detail panel. |
| 5 | **Intake Workflow** | 6 | 10 | 60 | Full intake form via UnifiedIntakePanel. AI assist available. Critical field validation. Red flag detection. But: no autosave to server (sessionStorage only). No draft recovery across sessions. No progressive save. No field-level validation messages. |
| 6 | **Queue Management** | 6 | 8 | 48 | Three tabs: EMS, Verification, Pre-triage. Journey stages with counts and avg wait. Pin default tab. But: no real-time queue refresh (SSE exists but not consumed on page). No drag-to-reorder. No queue capacity indicators. |
| 7 | **Alert Center & Escalation** | 5 | 8 | 40 | 5 escalation reasons defined. Quick actions strip. Attention strip for critical alerts. But: no real-time alert push to reception (SSE exists). No escalation history view. No escalation detail modal with timeline. |
| 8 | **AI & Copilot Integration** | 4 | 5 | 20 | AiTriageAssistPanel exists but mock-only for reception. CopilotPanel available globally (1321 lines). Triage assist is client-side rule engine. But: no reception-specific AI suggestions. No smart field extraction. No voice intake. |
| 9 | **Search & Patient Lookup** | 5 | 5 | 25 | Patient search in header. ReceptionSearchHint component. But: broken CSS syntax on ReceptionSearchHint.css:10. No reception-scoped search filter. No quick-select from search results to intake. |
| 10 | **Design System Compliance** | 6 | 5 | 30 | CCDL tokens used. primitives.css unified. reception-desk-theme.css overrides. But: 5 competing token namespaces. clinical-figma-polish.css `!important` overrides. 27 CSS files for 29 components (no CSS modules, no Tailwind). |
| 11 | **Responsive & Accessibility** | 5 | 3 | 15 | `aria-label` on toolbar groups. `role="tablist"` on queue tabs. `aria-live="polite"` on counts. But: no WCAG 2.2 AA audit. No focus management for modal overlays. No keyboard navigation for queue selection. No reduced-motion handling. |
| 12 | **Test Coverage** | 3 | 2 | 6 | 29 test files found for reception. But: 21 components have NO tests. 5 pages have NO tests. E2E/Playwright tests minimal. 833/864 tests pass (42 failures pre-existing). |
| 13 | **Offline/Resilience** | 2 | 0 | 0 | No offline detection. No service worker. No retry logic on handoff failure. Draft lost if sessionStorage cleared. Backend workflow logs in-memory only (not persisted). |
| | **TOTAL** | | **100** | **559/1000** | **Grade: D+ (55.9%)** |

---

## Detailed Findings by Dimension

### 1. Correctness & Data Integrity (7/10)

**Working:**
- `createPatientAndRouteFromReception()` orchestrates full lifecycle: draft → AI assist → patient creation → arrival record → handoff → navigation
- `validateReceptionMinimumCriticalData()` enforces required fields before routing
- `detectReceptionRedFlags()` flags critical symptoms in real-time
- Backend `POST /reception/handoff` moves patient to Triage state correctly
- Draft saved to sessionStorage on explicit save action

**Gaps:**
- No server-side draft persistence — browser crash = data loss
- No idempotency on handoff (double-submit possible)
- `workflow_action_logs` are in-memory only (500 entry buffer) — not auditable
- No optimistic UI rollback on handoff failure

### 2. RBAC & Security (6/10)

**Working:**
- `registrationClerk` role defined with 6 specific permissions
- Frontend capability resolution via `resolveReceptionScreenCapabilities()`
- Actions gated by `canCreatePatient`, `canVerifyIdentity`, `canEscalateToNurse`
- `assertReceptionMutationAllowed()` blocks clinical actions with guardrail message
- Backend RBAC: `registration-clerk` → packs `['core-platform', 'reception-desk']`, permissions `READ_PHI`, `WRITE_PHI`

**Gaps:**
- **No backend RBAC guard** on `GET /reception/snapshot` or `POST /reception/handoff` — any authenticated user can call these
- No rate limiting on handoff endpoint
- No audit trail for reception operations (workflow logs not persisted)
- No CSRF protection beyond JWT

### 3. Information Architecture (5/10)

**Working:**
- Single canonical route: `/emergency/reception`
- 8 routes accessible to registration clerk: reception, patients, intake, pulse, shift, alerts, collaboration, help
- Queue tabs: EMS, Verification, Pre-triage
- Express create path: `?express=1`
- Smart Intake overlay: `?intake=1&autostart=1`

**Gaps:**
- All Reception UI on one page — no sub-routes for EMS arrivals, escalation detail, or intake history
- No patient detail panel — must navigate away to `/emergency/patients` to see full record
- No breadcrumb navigation within reception
- Sidebar nav items shared across all roles — no reception-specific nav grouping

### 4. Command Center UI (5/10)

**Working:**
- EmergencyRoutePage zone composition (operationalSummary, primaryActions, supportingContext, activeWork)
- Toolbar with 3 logical groups (Actions, Filters, Flow Status)
- Situation brief with status, attention, owner, nextAction
- Queue metrics in header area (patient count, critical count)

**Gaps:**
- No real-time count badges (counts are computed from store snapshot, not SSE-pushed)
- No patient detail flyout/panel — must navigate away
- No workspace-level notifications (only header-level alert rail)
- No keyboard shortcut for common actions (register, search, escalate)

### 5. Intake Workflow (6/10)

**Working:**
- Full intake form via UnifiedIntakePanel (complaint, demographics, vitals indicators, allergies, medications, insurance, consent, documents)
- AI triage assist suggestion
- Critical field validation with error count
- Red flag detection with real-time feedback
- Stepper progress visualization (Arrival → Critical → AI → Route)
- SessionStorage draft save on explicit action

**Gaps:**
- No autosave to server (sessionStorage only)
- No draft recovery across browser sessions
- No progressive/field-level save
- No field-level validation messages (only count shown)
- No intake template/preset for common scenarios
- No multi-patient intake support (one draft at a time)

### 6. Queue Management (6/10)

**Working:**
- Three queue tabs with filtering
- Journey stages with patient counts and average wait times
- Pin default queue tab (persisted to localStorage)
- High-risk patient sorting (P1/P2, flags)
- Queue status derivation (temporary identity, incomplete registration, etc.)
- Next-step and owner-role computation per patient

**Gaps:**
- No real-time queue refresh (SSE exists but not consumed on this page)
- No drag-to-reorder patients within queue
- No queue capacity indicators (visual max/threshold)
- No bulk actions on queue (move multiple patients)
- No queue history/audit view

### 7. Alert Center & Escalation (5/10)

**Working:**
- 5 escalation reasons with severity levels
- Quick actions strip (escalate without selecting patient)
- Attention strip (shows critical alerts needing reception action)
- Escalation panel with patient selection and detail input
- Alert filtering for reception-critical sources

**Gaps:**
- No real-time alert push to reception workspace
- No escalation history view (only current alerts)
- No escalation detail modal with timeline
- No escalation acknowledgment workflow
- No escalation metrics (response time, resolution rate)

### 8. AI & Copilot Integration (4/10)

**Working:**
- AiTriageAssistPanel exists (but mock-only for reception role)
- CopilotPanel available globally (1321 lines)
- Client-side triage assist rule engine
- AI urgency suggestion in intake flow

**Gaps:**
- No reception-specific AI suggestions (arrival pattern recognition)
- No smart field extraction from voice/text
- No voice intake capability
- No AI-powered duplicate patient detection
- No AI routing suggestion (which queue, which nurse)

### 9. Search & Patient Lookup (5/10)

**Working:**
- Patient search in header (shared across all roles)
- ReceptionSearchHint component provides contextual guidance

**Gaps:**
- **Broken CSS** on ReceptionSearchHint.css:10 (missing `color-mix(in srgb,` prefix)
- No reception-scoped search filter (e.g., only patients in reception states)
- No quick-select from search results to intake
- No recent patients list
- No barcode/QR scanning integration

### 10. Design System Compliance (6/10)

**Working:**
- CCDL tokens defined and used
- primitives.css unified spacing/radius/type/shadows
- reception-desk-theme.css overrides accent to white
- Blue backgrounds eliminated (10 fixes in prior sessions)

**Gaps:**
- 5 competing token namespaces (`--cd-*`, `--app-*`, `--medical-*`, `--semantic-*`, `--ed-*`)
- clinical-figma-polish.css uses `!important` overrides (lines 614–720)
- 27 CSS files for 29 components (no CSS modules, no Tailwind utility classes)
- No design token documentation for reception-specific tokens
- No component library (each component has its own CSS)

### 11. Responsive & Accessibility (5/10)

**Working:**
- `aria-label` on toolbar groups
- `role="tablist"` on queue tabs
- `aria-live="polite"` on queue counts
- `aria-current="step"` on active journey stage
- `role="note"` on guardrail banner
- `role="status"` on result banner

**Gaps:**
- No WCAG 2.2 AA audit
- No focus management for modal overlays (PreparePatientChooser, EscalationPanel)
- No keyboard navigation for queue selection
- No reduced-motion handling
- No skip-to-content link
- No high-contrast mode support
- Responsive breakpoints in ReceptionWorkspace.css but not tested at 320px–768px

### 12. Test Coverage (3/10)

**Working:**
- 29 test files found for reception-related code
- Core services tested (intakeOrchestrator, arrivalControlLayer, escalationWorkflow)
- Hook tests (useReceptionPinnedActions, useRouteScreenMode)

**Gaps:**
- 21 of 29 TSX components have NO unit tests
- 5 pages have NO unit tests
- No integration tests (full intake → route → handoff flow)
- No Playwright E2E tests for reception
- 42 pre-existing test failures (not reception-specific)
- No visual regression tests

### 13. Offline/Resilience (2/10)

**Working:**
- Draft saved to sessionStorage (survives page refresh within same tab)
- Error feedback on handoff failure (showActionError)

**Gaps:**
- No offline detection
- No service worker
- No retry logic on handoff failure
- Draft lost if sessionStorage cleared or different browser
- Backend workflow logs in-memory only (not persisted, lost on server restart)
- No optimistic UI with rollback

---

## Priority Remediation Plan

### Critical (Must-fix before production)
1. **Backend RBAC guards** on `reception/snapshot` and `reception/handoff` endpoints
2. **Fix ReceptionSearchHint.css:10** broken CSS syntax
3. **Persist workflow_action_logs** to database (not in-memory buffer)
4. **Add idempotency key** to handoff endpoint (prevent double-submit)

### High (Should-fix for upgrade)
5. **Autosave drafts to server** (progressive save, draft recovery across sessions)
6. **Consume SSE on reception page** for real-time queue and alert updates
7. **Add focus management** for modal overlays (keyboard trap, escape to close)
8. **Expand test coverage** to all 29 components (unit) + full intake flow (integration)

### Medium (Nice-to-have for upgrade)
9. **Patient detail flyout** — view full record without leaving reception
10. **Escalation history view** with timeline
11. **WCAG 2.2 AA audit** and fixes
12. **CSS consolidation** — reduce 27 CSS files to component-scoped modules

### Low (Future iteration)
13. **Reception-specific AI** (duplicate detection, routing suggestions)
14. **Voice intake** capability
15. **Offline resilience** (service worker, retry queue)
16. **Visual regression tests**
