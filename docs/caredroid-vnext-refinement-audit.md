# CareDroid vNext Refinement Audit

## Codebase Audit

- Framework: Vite + React 18 with React Router 6, lazy-loaded route modules, and an app shell around canonical ED routes.
- State: Zustand powers emergency operations state; React contexts provide identity, tenant, feature, notification, simulation, and offline concerns.
- API architecture: frontend service modules isolate backend calls; the repository also contains a Nest-style backend package and shared operational models.
- Styling: component CSS plus layered design tokens in `src/styles`. The system already has primitives, token bridges, responsive guardrails, and domain CSS.
- Reuse: ED workflows are componentized around emergency, reception, whiteboard, tools, command-center, and clinical support modules.
- AI architecture: legacy chat and structured endpoints already existed in the Nest `AiModule`, while browser-safe AI compatibility wrappers lived under `src/lib/ai`. This pass adds a single reusable CareDroid AI node under shared `lib/ai` and exposes it through the existing backend module.
- Technical debt: duplicate token aliases and several large page/components remain; some text output still contains legacy encoding artifacts in older docs/logs.

## UX Audit

- Strengths: canonical ED routes preserve core workflows for reception, triage, whiteboard, EMS, capacity, alerts, analytics, and tools.
- Gaps addressed: the command dashboard did not yet expose the full hospital operations KPI set requested for a production command center.
- Gaps addressed: patient list/profile surfaces did not consistently show the full Registration -> Waiting -> Triage -> Doctor Review -> Labs / Imaging -> Treatment -> Discharge journey.
- Gaps addressed: shared alert cards used brittle icon glyphs and the queue surface mixed inline styling with loose table semantics.
- Gaps addressed: AI recommendations were split across UI-specific logic and older chat endpoints; new work centralizes intent routing, response schemas, safety wording, fallback behavior, and reusable frontend presentation.
- Workflow principle: command-center changes prioritize fast scanning, operational escalation, and clear handoff between charge nurse, beds, triage, and provider teams.

## Accessibility Audit

- Strengths: core dashboard uses semantic regions, headings, status text, and explicit aria labels.
- Gaps addressed: added keyboard-focus styling for AI review actions, semantic patient-detail tabs, text-backed journey status that is not color-only, and table headers/cells for queue rows.
- Remaining work: run a full axe/Playwright accessibility pass across every canonical route before release.

## Design System Improvements

- Extended command-dashboard styling toward flatter enterprise SaaS panels, stable metric card dimensions, token-backed radius, responsive grids, and clear clinical status colors.
- Added a human-review AI recommendation pattern with recommendation, confidence, rationale, suggested action, and Accept/Modify/Dismiss controls.
- Added reusable AI components for confidence, reasoning, missing data, safety notices, and override actions.
- Added a reusable patient journey tracker for cards, queues, and patient profiles.
- Moved patient-detail screen styling out of inline objects into a maintainable feature CSS file.
- Reworked shared alert primitives around semantic cards, real icons, severity badges, and urgency sorting.
- Reworked triage queue filters and rows with class-based styling, count chips, and accessible table structure.

## Modified Areas

- `src/services/operationalCommandDashboardModel.ts`: expanded operational KPI model.
- `src/components/emergency/CommandDashboard.tsx`: added AI decision-support queue and passed staff into snapshot building.
- `src/components/emergency/CommandDashboard.css`: tightened command-center layout, responsive behavior, focus states, and contrast.
- `src/pages/emergency/index.tsx`: wired staff into the dashboard snapshot.
- `src/components/emergency/CommandDashboard.test.tsx`: covered expanded metrics and clinician-owned AI recommendations.
- `src/domain/patient/PatientJourneyTracker.tsx`: reusable patient journey visualization.
- `src/domain/patient/patient.css`: compact and full-size journey tracker styling.
- `src/domain/patient/PatientCard.tsx`, `src/domain/patient/PatientHeader.tsx`, `src/domain/queue/QueueRow.tsx`: surfaced journey status in existing patient list/profile components.
- `src/features/patient-detail/PatientDetailFeature.tsx` and `.css`: refactored inline UI styling into accessible tabbed layout classes.
- `src/domain/patient/PatientJourneyTracker.test.tsx`: covered patient state to journey stage mapping.
- `src/domain/alerts/AlertCard.tsx`, `src/domain/alerts/AlertRail.tsx`, `src/domain/alerts/alerts.css`: alert primitive UX/accessibility refinement.
- `src/domain/alerts/AlertRail.test.tsx`: covered alert ordering, actions, and empty state.
- `src/domain/queue/QueueList.tsx`, `src/domain/queue/QueueRow.tsx`, `src/domain/queue/queue.css`: accessible queue table and responsive row layout.
- `src/domain/queue/QueueList.test.tsx`: covered queue semantics and selection behavior.
- `src/features/triage-queue/TriageQueueFeature.tsx` and `.css`: class-based triage queue filter surface with priority counts.
- `lib/ai/careDroidAI.ts`, `careDroidAISchemas.ts`, `careDroidAITypes.ts`, `careDroidAIPrompts.ts`: centralized AI node, intent schemas, validation, deterministic routing, safety copy, and metadata-only audit logging.
- `backend/src/modules/ai/ai.controller.ts`, `ai.service.ts`, `dto/ai.dto.ts`: added `/api/ai/node` to the existing authenticated AI module and logged redacted operational metadata through the current AI query path.
- `src/services/careDroidAiApi.ts`, `src/hooks/useCareDroidAI.ts`: frontend API wrapper and hook with safe local fallback.
- `src/components/ai/*`: reusable AI insight panel, recommendation card, confidence badge, reasoning accordion, clinical safety notice, missing-data alert, and override buttons.
- `src/lib/ai/careDroidAI.test.ts`, `src/services/careDroidAiApi.test.ts`, `src/components/ai/AIRecommendationCard.test.tsx`: covered schema response shape, clinical safety output, backend fallback, and AI card rendering.
- `.github/copilot-instructions.md`, `.github/prompts/*.prompt.md`: Copilot guardrails for current-codebase refinement, centralized AI architecture, privacy, accessibility, and clinical safety.

## Rationale

- The dashboard is the operational heart of CareDroid, so the refinement concentrates on throughput, capacity, staffing, triage, and AI governance without changing routes or backend contracts.
- AI appears as decision support only; the interface asks clinicians to accept, modify, or dismiss recommendations before workflow impact.
- The central AI node is deterministic and schema-driven so dashboard, triage, patient profile, analytics, and admin surfaces can consume one predictable response contract while provider-backed AI remains safely isolated behind backend services.
- The changes preserve existing whiteboard, staff, capacity, and predictive models while making their signals easier to act on.

## Remaining Technical Debt

- Large components such as emergency whiteboard, copilot, and chat still need further decomposition.
- Token layers should be consolidated over time to reduce alias drift between `--cd-*`, `--app-*`, and legacy medical variables.
- Full route-level visual QA and accessibility scans are still needed before calling the whole platform production-ready.

## Future Enhancements

- Persist AI recommendation decisions as audit events.
- Add role-filtered dashboard presets for receptionist, nurse, doctor, and administrator views.
- Add real-time event streaming for metric deltas, staffing gaps, bed requests, and accepted/rejected AI recommendations.
- Route more legacy AI chat/referral/intake call sites through the central node where structured workflow output is required.
