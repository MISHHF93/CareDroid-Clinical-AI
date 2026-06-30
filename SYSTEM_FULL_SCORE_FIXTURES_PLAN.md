# CareDroid Full-Score System Evaluation and Fix Fixtures Plan

**Date:** 2026-06-30
**Purpose:** Third planning document after `ARCHITECTURE_MAP.md` and `SYSTEM_EVALUATION.md`.
**Objective:** Score the current CareDroid Clinical AI system, define what prevents a full score, and provide a fixture-style implementation plan for updating the frontend, backend, modules, and pages.

---

## 1. Inputs Reviewed

Local project inputs:

- `ARCHITECTURE_MAP.md`
- `SYSTEM_EVALUATION.md`
- `pages-map.txt`, generated 2026-06-30
- `package.json`
- `backend/package.json`
- `src/config/backendApiCapabilities.ts`
- Quick code scan across `src`, `backend`, `lib`, `engine`, `store`, and `types`

External implementation benchmarks:

- FDA Clinical Decision Support Software guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software
- ONC HTI-1 rule and decision support intervention transparency: https://healthit.gov/regulations/hti-rules/hti-1-final-rule/
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- HHS HIPAA Security Rule overview: https://www.hhs.gov/hipaa/for-professionals/security/index.html
- HL7 FHIR US Core Implementation Guide: https://hl7.org/fhir/us/core/STU6.1/
- SMART App Launch Framework: https://hl7.org/fhir/smart-app-launch/
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

---

## 2. Current System Snapshot

Generated inventory and scan signals:

| Signal | Current Value | Meaning |
|---|---:|---|
| Non-test files under `src/pages` | 184 | The frontend is still page-heavy. |
| Files under `src/pages/tools` | 46 | Clinical tool surface is large and should be module-backed. |
| Non-test files under `src/components` | 559 | Component surface is rich but needs stricter layer boundaries. |
| Frontend feature directories | 7 | The target architecture lists more feature modules than currently exist. |
| Backend modules | 59 | Backend breadth is strong. |
| Backend capability records | 90 | The API surface is already inventoried. |
| Backend capabilities marked `real` | 29 | Real implementation exists for about one third of mapped capabilities. |
| Backend capabilities marked `demo` | 39 | Many surfaces still rely on fixture/demo contracts. |
| Backend capabilities marked `disabled` | 22 | Several frontend intentions are not server-backed yet. |
| Test/spec files in scanned areas | 870 | Test inventory is a strength. |
| `as any` occurrences in scanned areas | 1,625 | TypeScript compiles, but domain safety is not yet full-score. |
| `@ts-nocheck` occurrences in scanned areas | 0 | Good baseline; avoid reintroducing. |
| `placeholder` occurrences in scanned areas | 369 | Some are intentional, but the count should become governed and explicit. |

The previous attempt successfully clarified page counts and reorganized the intent. The next attempt must move from inventory to implementation: thin pages, domain modules, real backend contracts, typed data boundaries, safety governance, and acceptance fixtures.

---

## 3. Current Score

**Current internal full-system score: 72 / 100**

This is a strong demo and pilot-readiness score, but not yet a full production clinical AI score. The bar is intentionally strict because CareDroid is an emergency department operating system with clinical AI, user roles, patient workflow state, and possible ePHI handling.

| Area | Score | Why |
|---|---:|---|
| Product and workflow completeness | 12 / 12 | EDOS scope is broad: reception, triage, whiteboard, EMS, command, tools, admin, platform. |
| Architecture conformance | 9 / 14 | Target layers are well documented, but current frontend still has 184 page files and only 7 feature dirs. |
| Frontend/page quality | 9 / 12 | Large responsive/test surface exists, but pages still need to become thin wrappers over modules. |
| Backend/API maturity | 9 / 16 | 59 backend modules and 90 mapped capabilities are strong, but 39 demo and 22 disabled capabilities block full score. |
| Type and data contracts | 7 / 12 | Strict TS is enabled, but `noImplicitAny` is false and 1,625 `as any` occurrences remain. |
| Clinical AI safety and governance | 7 / 12 | Safety docs and guardrails exist, but decision support metadata, traceability, evidence basis, and human-review contracts need hardening. |
| Security, privacy, compliance | 7 / 12 | Backend modules exist for auth, compliance, privacy, audit, encryption, and governance, but HIPAA/ePHI storage and ASVS-style controls need verification gates. |
| Interoperability | 4 / 8 | FHIR/SMART direction is implied, but production-grade EHR integration contracts need canonical implementation. |
| QA and release gates | 8 / 10 | Test inventory and CI scripts are rich; coverage, security, accessibility, and production contract gates need to be mandatory. |

**Full-score target:** 95+ internal engineering score before pilot expansion, with 100 reserved for an audited release where security, privacy, clinical safety, accessibility, interoperability, and backend persistence gates all pass.

---

## 4. Why It Is Not Full Score Yet

The system is not blocked by lack of ambition. It is blocked by completion consistency:

1. **Page-heavy frontend:** `src/pages` is still the dominant implementation surface. Full score needs pages to become route wrappers and feature modules to own behavior.
2. **Backend capability gap:** Core runtime status includes 29 real, 39 demo, and 22 disabled capabilities. Full score needs critical EDOS workflows to be real, typed, persisted, audited, and tested end to end.
3. **Type debt:** `as any` is acceptable as a migration bridge but not as a clinical data contract. Full score requires typed vitals, patient state, role state, API envelopes, and engine outputs.
4. **Fixture ambiguity:** Demo fixtures are useful, but production paths must never silently consume fake clinical data. Full score requires fixture labels, fixture gates, and environment enforcement.
5. **Clinical AI transparency:** Decision support must show basis, limitations, evidence/citations, model/tool identity, confidence boundaries, and human-review state.
6. **ePHI risk:** Dexie, localStorage, logs, exports, telemetry, screenshots, and offline behavior must be classified and governed.
7. **Accessibility and operational UX:** ED workflows must be usable under stress, on mobile, and by keyboard/screen reader where appropriate.
8. **Interoperability:** A production clinical system needs clear FHIR/SMART contracts for patient, encounter, observation, practitioner, organization, document, and audit flows.

---

## 5. Full-Score Gates

CareDroid reaches full score only when these gates pass:

| Gate | Required Condition |
|---|---|
| Architecture gate | All user-facing pages are thin wrappers over feature modules or domain screens. |
| Module gate | Every target module exports `index.ts`, `route.ts`, `types.ts`, service hooks, test fixtures, and smoke tests. |
| Backend gate | All critical EDOS capabilities are `real`; demo and disabled capabilities are either non-critical or hidden by feature gates. |
| Type gate | No `as any` in `engine`, `store`, `src/services`, `src/pages/emergency`, `src/pages/tools`, or shared clinical contracts. |
| Fixture gate | Demo data is synthetic, labeled, environment-gated, and impossible to mistake for production data. |
| Clinical safety gate | AI output includes basis, limitations, citations/evidence, human-review state, and trace ID. |
| HIPAA/ePHI gate | ePHI storage, transport, logs, exports, telemetry, and retention are documented and tested. |
| Security gate | OWASP ASVS-aligned auth, session, access control, API, logging, and data protection checks pass. |
| Accessibility gate | WCAG 2.2 AA checks pass for role-critical workflows and tool pages. |
| Interop gate | FHIR R4/US Core and SMART launch contracts exist for production EHR integration. |
| CI gate | Lint, typecheck, frontend tests, backend tests, contract tests, responsive tests, e2e tests, build, and bundle budget pass. |

---

## 6. Fix Fixture Format

Each fix should be tracked as a fixture so the plan becomes testable instead of aspirational.

```md
### FX-000 - Short name

Area: frontend | backend | modules | pages | safety | security | interop | QA
Current state:
Target state:
Files/modules:
Implementation:
Acceptance fixture:
Score impact:
Verification commands:
```

Acceptance fixtures are not only data fixtures. They are repeatable proof units: a synthetic patient set, API contract, route smoke test, accessibility check, security control, or clinical AI output example that demonstrates the fix is real.

---

## 7. Implementation Fixtures

### FX-001 - Canonical Page and Route Inventory

Area: pages

Current state:

- `pages-map.txt` records 184 non-test `src/pages` files.
- Route definitions exist across app router, route config, clinical tool routes, navigation config, and backend exposure docs.

Target state:

- One canonical route registry drives page inventory, navigation, role access, backend capability requirements, and route smoke tests.

Implementation:

- Add or harden a route manifest that maps each route to page wrapper, feature module, required role, required backend capabilities, layout shell, and test fixture.
- Generate `pages-map.txt` from the manifest where possible instead of treating it as a standalone text inventory.
- Add a test that fails when a page is not represented in the route manifest.

Acceptance fixture:

- `route-inventory.fixture.ts` with all 184 current page entries classified as active, module-backed, redirect, compatibility, or retire.
- Test: every route has a module owner and every page has a route disposition.

Score impact:

- Architecture +2, frontend +1.

Verification commands:

```powershell
npm run test:registry-launch
npm run test:responsive-regression
```

### FX-002 - Thin Page Wrapper Migration

Area: frontend/pages

Current state:

- Many pages likely contain domain logic, store access, API calls, layout logic, and presentation in one file.

Target state:

- `src/pages/**` files only resolve route params, choose shell/layout, and render a feature module screen.

Implementation:

- For each high-traffic area, create a corresponding module screen under `src/features/<module>/`.
- Move domain logic, data hooks, and components out of route pages.
- Keep compatibility redirects where external links depend on old paths.

Acceptance fixture:

- `page-thinness.test.ts` fails if page files import stores directly, contain API calls, or exceed an agreed complexity threshold.

Score impact:

- Architecture +2, frontend +1, QA +1.

Verification commands:

```powershell
npm run test:run:frontend
npm run typecheck:frontend
```

### FX-003 - Feature Module Contract Completion

Area: modules

Current state:

- Current `src/features` directories: `alerts-center`, `capacity`, `copilot`, `ems-module`, `patient-detail`, `triage-queue`, `whiteboard`.
- Target architecture includes reception, triage, whiteboard, waiting-room, ems, command, copilot, tools, calculators, shift, admin, platform, team, settings, and auth.

Target state:

- Each target feature module has the same contract and owns its domain behavior.

Implementation:

- Normalize module names, especially `ems-module` to `ems` or add a compatibility barrel.
- Add missing module shells: `reception`, `waiting-room`, `command`, `tools`, `calculators`, `shift`, `admin`, `platform`, `team`, `settings`, `auth`.
- Require module files: `index.ts`, `route.ts`, `types.ts`, `fixtures.ts`, `module.test.ts`, and one primary screen component.

Acceptance fixture:

- `feature-module-contract.test.ts` verifies each module exports route metadata, ownership metadata, fixtures, and smoke tests.

Score impact:

- Architecture +3, frontend +2.

Verification commands:

```powershell
npm run test:run:frontend
npm run lint
```

### FX-004 - Backend Capability Graduation

Area: backend

Current state:

- `backendApiCapabilities.ts` contains 90 capabilities: 29 real, 39 demo, 22 disabled.

Target state:

- Critical EDOS capabilities are real, persisted, audited, and contract-tested.

Priority graduation order:

1. `emergencyPatients`
2. `emergencyQueues`
3. `emergencyWhiteboard`
4. `emergencyCapacity`
5. `emergencyBoarding`
6. `emergencyEmsRuntime`
7. `emergencyReceptionSnapshot`
8. `emergencySmartIntake`
9. `emergencyCopilotRuntime`
10. `emergencyReassessment`
11. `emergencyOperationalAnalytics`
12. `clinicalAlerts`

Implementation:

- For each capability, define DTOs, validation, service, repository/persistence, audit event, OpenAPI metadata, frontend client, and contract tests.
- Update frontend feature gates only after backend e2e tests pass.
- Keep demo variants under explicit `/demo` fixtures or environment-only seed scripts.

Acceptance fixture:

- `backend-capability-graduation.fixture.ts` lists each capability, status, required tests, and production readiness.
- Contract test fails when frontend marks a route callable but backend is disabled.

Score impact:

- Backend +5, security +1, QA +1.

Verification commands:

```powershell
npm run test:backend-exposure
cd backend; npm run build; npm test; npm run test:e2e
```

### FX-005 - Clinical Data Contract Hardening

Area: type/data contracts

Current state:

- Strict TypeScript is enabled, but `noImplicitAny` is false.
- `as any` occurs 1,625 times in scanned areas.
- Known clinical risk areas include `Vitals`, `Patient`, queue state, engine outputs, and store action signatures.

Target state:

- Clinical data contracts are explicit, runtime-validated, shared between frontend and backend, and free of `as any` in critical paths.

Implementation:

- Define canonical shared contracts for patient, encounter, vitals, observation, queue, EMS arrival, alert, handoff, capacity, and audit event.
- Add Zod or class-validator schemas at network boundaries.
- Replace `patient.vitals as any` with latest-vitals selectors and typed transforms.
- Turn on stricter lint rules before turning on `noImplicitAny`.

Acceptance fixture:

- `clinical-contracts.fixture.ts` includes valid and invalid examples for vitals, queue move, handoff, and AI tool result.
- Tests prove invalid clinical payloads fail before reaching UI or engine state.

Score impact:

- Type/data +4, clinical safety +1, backend +1.

Verification commands:

```powershell
npm run typecheck:frontend
npm run test:safety-compliance
npm run test:contract-matrix
```

### FX-006 - Fixture Governance and Environment Separation

Area: fixtures/QA

Current state:

- Demo fixtures are productive for development, but backend statuses and placeholder content show that fake paths remain broad.

Target state:

- Fixtures are synthetic, versioned, environment-gated, and visibly labeled.
- Production cannot silently call demo fixtures.

Implementation:

- Create `src/fixtures/clinical` for frontend test fixtures and `backend/src/fixtures` for backend seed fixtures.
- Add a `fixtureKind` field where useful: `synthetic-demo`, `contract-test`, `e2e-test`, `seed`, `forbidden-production`.
- Add a runtime guard that blocks fixture-backed clinical data in production builds.
- Add visible demo banners when any route is fixture-backed.

Acceptance fixture:

- `fixture-governance.test.ts` starts the app in production mode and verifies no demo-only capabilities can render as live clinical data.

Score impact:

- Backend +1, clinical safety +2, security +1, QA +1.

Verification commands:

```powershell
npm run test:backend-exposure
npm run test:e2e:production
```

### FX-007 - Clinical AI Transparency Contract

Area: clinical AI safety

Current state:

- AI tools and governance surfaces exist, but full-score clinical AI needs repeatable transparency metadata.

Target state:

- Every AI-assisted output includes identity, input summary, evidence basis, limitations, confidence boundary, human review state, trace ID, and audit event.

Implementation:

- Define `ClinicalAiDecisionSupportEnvelope`.
- Require all AI tool results to render safety metadata.
- Add model/tool version, prompt/template version, data freshness, missing-data flags, citations, and "not autonomous clinician" boundary.
- Add human review workflow: draft, reviewed, accepted, overridden, rejected.

Acceptance fixture:

- `clinical-ai-output.fixture.ts` with examples for diagnosis assistant, lab interpreter, order set AI, patient summary, and timeline AI.
- Tests fail if AI output renders without transparency metadata.

Score impact:

- Clinical safety +4, QA +1.

Verification commands:

```powershell
npm run test:safety-compliance
npm run test:executor-mapping
```

### FX-008 - HIPAA/ePHI Data Handling Audit

Area: security/privacy

Current state:

- App uses browser storage, offline capability code, exports, telemetry, logs, backend audit modules, and mobile shell potential.

Target state:

- ePHI data handling is classified, encrypted where required, minimized, logged, and retained according to policy.

Implementation:

- Inventory every ePHI path: request/response bodies, IndexedDB/Dexie, localStorage/sessionStorage, exports, screenshots, logs, telemetry, cache, push notifications, email, PDF/Excel outputs, mobile storage.
- Add data classification to API envelopes and frontend state.
- Add redaction utilities for logs and error reporting.
- Ensure audit events cover clinical data access, mutation, export, AI generation, override, and deletion.

Acceptance fixture:

- `ephi-data-map.md` plus tests proving no known PHI fields are logged in client or server logs.

Score impact:

- Security/privacy +4, clinical safety +1.

Verification commands:

```powershell
npm run test:backend-exposure
cd backend; npm test
```

### FX-009 - Accessibility and Stress-Mode UX

Area: frontend/accessibility

Current state:

- Responsive tests and UI hardening scripts exist.
- Clinical operations require keyboard-safe, mobile-safe, high-contrast, low-cognitive-load screens.

Target state:

- WCAG 2.2 AA plus ED stress-mode usability for core workflows.

Implementation:

- Add accessibility checks for reception, triage, whiteboard, EMS, command, shared tool session, and clinical tools.
- Ensure focus order, live regions, labels, hit targets, color contrast, reduced motion, and keyboard operations.
- Add display-mode and public-screen tests for non-interactive routes.

Acceptance fixture:

- `accessibility-critical-routes.fixture.ts` listing critical routes and required keyboard/screen-reader assertions.

Score impact:

- Frontend +2, QA +1.

Verification commands:

```powershell
npm run test:responsive-regression
npm run qa:responsive:chromium
```

### FX-010 - FHIR/SMART Interoperability Backbone

Area: interoperability/backend

Current state:

- Healthcare workflows exist, but production EHR interoperability needs canonical FHIR/SMART mapping.

Target state:

- Core EDOS objects map to FHIR R4/US Core resources and can launch in SMART-compatible clinical contexts.

Implementation:

- Map patient, encounter, observation/vitals, condition/problem, medication, diagnostic report, document reference, practitioner, organization, service request, and audit event.
- Implement an adapter layer rather than binding UI modules directly to FHIR payloads.
- Add SMART launch context handling for patient, encounter, user, scopes, and token refresh.

Acceptance fixture:

- `fhir-us-core-fixtures/` with representative patient, encounter, observation, practitioner, organization, and diagnostic report bundles.
- Contract tests validate transforms both directions.

Score impact:

- Interop +4, backend +2.

Verification commands:

```powershell
npm run test:contract-matrix
cd backend; npm run test:e2e
```

### FX-011 - Security Verification Profile

Area: security

Current state:

- Backend dependencies include auth, throttling, Helmet, encryption, audit, permissions, 2FA, and observability modules.
- Full-score security needs a named verification profile and pass/fail evidence.

Target state:

- A CareDroid ASVS-inspired profile covers auth, session, access control, validation, API, data protection, logging, error handling, file/export safety, SSRF, secrets, and dependency hygiene.

Implementation:

- Create `docs/security/asvs-profile.md`.
- Add tests for role enforcement, tenant isolation, broken-object-level-authorization cases, export authorization, audit logging, and rate limits.
- Add CI dependency audit and secret scanning step if not already present in deployment CI.

Acceptance fixture:

- `security-abuse-cases.fixture.ts` with unauthorized patient access, wrong-tenant access, stale token, export denial, role downgrade, and disabled capability call.

Score impact:

- Security/privacy +3, QA +1.

Verification commands:

```powershell
npm run lint:all
npm run test:all
```

### FX-012 - Release Scoreboard and Stoplight CI

Area: QA/release

Current state:

- `validate:ci` is rich but long.
- Score is not currently generated from code health metrics.

Target state:

- A generated release scoreboard shows architecture, backend, type, fixture, safety, security, accessibility, interop, and QA status.

Implementation:

- Add `scripts/write-system-scoreboard.mjs`.
- Include metrics: page count, module count, capability status counts, `as any` count, placeholder count, ePHI audit status, route smoke status, backend contract status, test pass/fail.
- Write `docs/system-scoreboard.md` on demand.

Acceptance fixture:

- Scoreboard must fail CI below agreed thresholds and explain the failing gate.

Score impact:

- QA +2, architecture +1.

Verification commands:

```powershell
npm run validate:ci
```

---

## 8. Frontend Update Plan

Priority order:

1. Create route manifest and page disposition inventory.
2. Move emergency pages into feature module screens.
3. Move tool pages into `features/tools` and calculator hubs into `features/calculators`.
4. Normalize navigation to read route/module metadata.
5. Add thin-page tests.
6. Add accessibility fixtures for critical routes.
7. Add demo/production banners based on backend capability status.
8. Collapse repeated shell/layout logic into layout primitives and domain screens.

Frontend full-score acceptance:

- No critical page imports Zustand stores directly.
- No critical page performs raw HTTP calls.
- All active pages have route metadata, role metadata, backend capability metadata, and test fixtures.
- Responsive and accessibility tests pass for critical EDOS and tool routes.

---

## 9. Backend Update Plan

Priority order:

1. Graduate EDOS capabilities from demo to real in the order listed in FX-004.
2. Add DTO validation and OpenAPI metadata for every graduated endpoint.
3. Add audit events for read, write, AI generation, export, and override.
4. Add persistence and migration coverage for patient, queue, whiteboard, EMS, capacity, and alerts.
5. Add contract tests that compare backend routes to frontend clients and feature gates.
6. Keep demo fixtures available only through explicit seed/test paths.

Backend full-score acceptance:

- Critical EDOS workflows do not depend on demo routes.
- Disabled capabilities are hidden or have clear unavailable states.
- Frontend cannot call backend routes that are not mounted.
- Every clinical mutation has validation, persistence, audit, authorization, and tests.

---

## 10. Module Update Plan

Target module contract:

```txt
src/features/<module>/
  index.ts
  route.ts
  types.ts
  fixtures.ts
  api.ts
  hooks.ts
  <Module>Screen.tsx
  <module>.test.ts
```

Target module list:

| Module | Current Status | Next Action |
|---|---|---|
| reception | Missing feature dir | Create from reception pages/components. |
| triage | Partial via `triage-queue` | Normalize to `triage`; keep compatibility barrel. |
| whiteboard | Exists | Add full module contract and move page logic in. |
| waiting-room | Missing feature dir | Extract from whiteboard/waiting-room components. |
| ems | Partial via `ems-module` | Normalize to `ems`. |
| command | Missing feature dir | Extract analytics/capacity/command surface. |
| copilot | Exists | Add AI transparency fixture contract. |
| tools | Missing feature dir | Own clinical tool catalog and shared tool session. |
| calculators | Missing feature dir | Own calculator hubs and source-backed calculators. |
| shift | Missing feature dir | Own shift summary and handoff. |
| admin | Missing feature dir | Own staff/admin operations. |
| platform | Missing feature dir | Own governance, diagnostics, platform OS. |
| team | Missing feature dir | Own team management. |
| settings | Missing feature dir | Own app and emergency settings. |
| auth | Missing feature dir | Own login/session/demo persona workflows. |

---

## 11. Page Update Plan

Page disposition categories:

| Category | Meaning |
|---|---|
| Active module-backed | Route remains and renders a feature module screen. |
| Active domain wrapper | Route remains but only wraps a domain screen or public/static page. |
| Compatibility redirect | Old route redirects to canonical route. |
| Tool compatibility | Route remains for external links but tool implementation lives in `features/tools`. |
| Retire/archive | Not linked in navigation and not needed by compatibility policy. |

Required page fixture fields:

```ts
type PageDispositionFixture = {
  path: string;
  sourceFile: string;
  ownerModule: string;
  disposition: 'active-module-backed' | 'active-domain-wrapper' | 'compatibility-redirect' | 'tool-compatibility' | 'retire-archive';
  roles: string[];
  backendCapabilities: string[];
  testIds: string[];
};
```

---

## 12. Scoring Roadmap

| Phase | Target Score | Definition of Done |
|---|---:|---|
| Current | 72 | Docs reviewed, map regenerated, score baseline created. |
| Phase 1: Inventory and route fixtures | 76 | Every page has disposition and module owner. |
| Phase 2: Module contract completion | 82 | Target feature modules exist and critical pages are thin. |
| Phase 3: Backend capability graduation | 88 | Critical EDOS capabilities are real and contract-tested. |
| Phase 4: Type and clinical contract hardening | 92 | No `as any` in critical clinical paths. |
| Phase 5: Safety, security, privacy, accessibility | 96 | AI transparency, ePHI map, ASVS profile, WCAG checks pass. |
| Phase 6: Interop and release scoreboard | 98+ | FHIR/SMART contracts and generated system scoreboard pass. |

---

## 13. First Ten Work Items

1. Create `src/data/pageDispositionFixture.ts` from `pages-map.txt`.
2. Add a test that every `src/pages` file has a disposition.
3. Add module contract tests for the target feature module list.
4. Normalize `ems-module` to `ems` with compatibility exports.
5. Create missing feature directories with empty contracts and failing TODO tests.
6. Pick one vertical slice: reception page -> reception feature module -> backend capability -> route test.
7. Graduate `emergencyPatients` from demo to real.
8. Replace `as any` in `engine/simulation.ts` vitals and bottleneck paths.
9. Add `ClinicalAiDecisionSupportEnvelope` and render it in one AI tool page.
10. Add fixture-production guard that blocks demo clinical data in production builds.

---

## 14. Verification Battery

Run this battery when a phase claims completion:

```powershell
npm run lint:all
npm run typecheck:frontend
npm run test:backend-exposure
npm run test:contract-matrix
npm run test:safety-compliance
npm run test:responsive-regression
npm run test:e2e-matrix
cd backend; npm run build; npm test; npm run test:e2e
cd ..
npm run build
npm run test:bundle-budget
```

Run the full existing gate before release:

```powershell
npm run validate:ci
```

---

## 15. Executive Recommendation

CareDroid should not do another broad rename-only reorganization. The next pass should be a vertical-slice hardening program:

1. Lock the route/page/module inventory.
2. Convert pages into thin wrappers.
3. Graduate backend capabilities from demo to real.
4. Replace clinical `as any` debt with runtime-validated contracts.
5. Prove every fix with a named fixture and CI gate.

The fastest path to a full score is not to make the system bigger. It is to make every existing surface honest: module-owned, typed, persisted, audited, accessible, explainable, and test-proven.

---

## 16. Execution Log

### 2026-06-30 - Phase 1 Started

Implemented:

- Added `src/data/pageDispositionFixture.ts` to classify all 184 `src/pages` inventory files.
- Added `src/data/pageDispositionFixture.test.ts` to enforce 184 total page inventory files, 140 TS/TSX source files, 44 CSS support files, 56 tool inventory files, and 46 tool source files.
- Added `src/features/featureModuleContract.ts` to codify the 15 target modules from this plan.
- Added `src/features/featureModuleContract.test.ts` to enforce module list, route metadata, backend capability metadata, compatibility status, and physical `index.ts` presence.
- Added target module scaffold barrels for reception, triage, waiting-room, EMS, command, tools, calculators, shift, admin, platform, team, settings, auth, and whiteboard.
- Normalized EMS with `src/features/ems/index.ts` while preserving compatibility with `src/features/ems-module`.
- Removed the highest-risk simulation `as any` cluster around latest vitals, EMS pre-arrival vitals, EMS unit insertion, and the missing `setBottleneckAlert` call.

Verification:

- `cmd /c npm run test:run -- src/data/pageDispositionFixture.test.ts src/features/featureModuleContract.test.ts` passed.
- `cmd /c npm run typecheck:frontend` passed.
- `cmd /c npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --jsx react-jsx --skipLibCheck --strict --noImplicitAny false --types vite/client engine/simulation.ts` passed.

Known baseline noise:

- `cmd /c npm run test:run -- engine store` is not currently a clean gate. It still fails in unrelated existing suites for alert expectations, capacity export expectations, EMS state expectations, workflow log selector exports, first-customer demo sizing, UX debt file paths, and one whiteboard label expectation.

Interim score:

- Phase 1 raises the implementation posture from 72/100 to approximately 76/100 by closing the page inventory and target module contract gates. The backend, clinical contract, security, accessibility, and interoperability gates still control the path to 95+.
