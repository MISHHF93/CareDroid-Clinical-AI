# Manual QA checklist — wired clinical & fleet tools

Run after automated `npm run test:e2e-matrix` passes. Canonical source: `src/data/e2eManualQaChecklist.ts`.

## Authentication & AppShell

### login-dashboard

**Steps:**
Sign in → land on dashboard → open sidebar tools menu.

**Expected:**
Authenticated shell loads; no console errors on navigation.

### tools-overview

**Steps:**
Navigate to /tools and /tools/catalog.

**Expected:**
Overview and catalog render; search/filter work; cards open correct routes or chat.

## Tier A calculators (dedicated forms)

### tier-a-disclaimer

**Steps:**
Open PHQ-9, HAS-BLED, SOFA, ASCVD routes; scroll lead + result areas.

**Expected:**
Decision-support disclaimer visible; no treatment orders on results.

### phq9-q9

**Steps:**
PHQ-9: set question 9 > 0 before completing remaining items.

**Expected:**
Crisis/safety messaging surfaces; screening-only framing.

### calc-reset

**Steps:**
Run calculation → Reset on 3 Tier A tools.

**Expected:**
Inputs clear; results hidden; no stale state.

## Tier B chat-assisted (hub launch)

### hub-launch

**Steps:**
From catalog, launch Wells PE, PERC, NIHSS, dispatch-ai.

**Expected:**
Hub or fleet path opens; chat seed pre-filled; orchestrator tool null except Tier C.

### pe-acs-language

**Steps:**
Complete Wells PE / GRACE chat flows with sample data.

**Expected:**
No “PE ruled out” or definitive ACS diagnosis language.

## Tier C backend executors

### drug-checker

**Steps:**
Drug checker: enter ≥2 medications → run check.

**Expected:**
Results return; disclaimer on interactions; no dose prescriptions.

### lab-interpreter

**Steps:**
Lab interpreter: enter sample panel → interpret.

**Expected:**
Interpretation returns; educational disclaimer footer.

### sofa-executor

**Steps:**
SOFA dedicated page or orchestrator path with sample vitals.

**Expected:**
Deterministic score; decision-support disclaimer on layout.

## CareDroid tool pages

### diagnosis-procedures

**Steps:**
Open /tools/diagnosis and /tools/procedures; submit sample prompt.

**Expected:**
AI documentation disclaimer; output labeled for clinician review.

### protocols

**Steps:**
Open /protocols; request ACLS summary.

**Expected:**
Guideline-style support; no autonomous orders.

## Fleet / dispatch

### fleet-disclaimer

**Steps:**
Open Fleet Command, Route Optimizer, Predictive Maintenance.

**Expected:**
Operational decision-support disclaimer; no auto-dispatch controls.

### dispatch-chat

**Steps:**
Launch dispatch-ai from catalog → review chat seed.

**Expected:**
Human approval required; no automated assignment language.

## NLU & alias resolution (chat)

### alias-phrases

**Steps:**
In chat, mention "PHQ9", "bleeding risk", "sofa calculator", "drug interactions".

**Expected:**
Correct tool suggestion or route; no phantom tool launches.

## Render / execute (10-point) — per tool

### matrix-automated

**Steps:**
Run `npm run test:tool-render-smoke` and `npm run test:e2e-matrix`.

**Expected:**
All matrix and smoke tests pass.

### per-tool-deep-link

**Steps:**
For each tool in docs/tool-render-execute-matrix.md: open deep link, confirm non-empty page, run Tier A calculate or Tier C check or Tier B chat launch.

**Expected:**
Route renders; Tier A forms work locally; Tier C only hits POST executors; Tier B has chat seed; API errors show alert banner.

### catalog-sidebar

**Steps:**
From /tools/catalog and sidebar, open drug-check, qSOFA, Wells PE, fleet command.

**Expected:**
Catalog and sidebar navigation match matrix smoke paths.

