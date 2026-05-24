# AI Chatbot UX Flattening Plan

Status: planning-only discovery deliverable  
Scope: frontend UX architecture, route normalization, tool launch model, backend capability exposure, mobile/safety/test strategy  
Non-goal: source-code changes in this pass

## 1. Executive Summary

CareDroid Clinical AI already has the technical foundation for one AI-centered clinical workspace, but the user experience still exposes too many product layers: Home, Assistant, Tools, calculators, developer catalog, individual AI pages, fleet pages, settings pages, backend executors, and fallback routes.

The current live assistant workspace is `src/pages/Dashboard.jsx`, routed at `/home` and `/assistant`. The older `src/components/ChatInterface.jsx` still exists, shares the chat service, and has tests, but it is not the active routed chat surface.

The plan is to make `/assistant` the conceptual center of the product while preserving all existing routes as working direct links. Tools, calculators, clinical intelligence pages, patient workflows, and operations workflows should increasingly open as assistant workflows or right-panel tools rather than feeling like separate applications.

Implementation should preserve:

- Existing public/auth routes.
- Current protected route compatibility.
- `/tools` as the user-facing tool/workflow browser.
- `/tools/calculators` and `/tools/calculators/:slug` as deep-linkable calculator routes.
- `/tools/catalog` as permission-gated Developer Catalog / Source Audit.
- Backend executor limits: only `sofa-calculator`, `drug-interactions`, and `lab-interpreter` are currently POST-executable through the tool orchestrator.

Recommended end state:

- Left navigation: high-level sections only.
- Center: AI chat and workflow canvas.
- Right panel: context, tools, evidence, calculators, results, safety, and audit details.
- Bottom/quick actions: recommended tools, recent workflows, and next actions.
- Routes remain stable, but visible UX funnels users into Assistant-first workflows.

## 2. Current UX Architecture

Primary route source:

- `src/App.jsx`
- `src/routing/authPathAliases.js`
- `src/routes/clinicalToolRoutes.js`

Current verified route/page counts from inspection:

- Expanded route entries: 104.
- Literal `src/App.jsx` route records: 55.
- Generated auth alias routes: 14.
- Generated calculator subroutes: 31.
- Generated legacy calculator aliases: 4.
- Redirect/alias route patterns: 23.
- Fallback route patterns: `/tools/*`, `/fleet/*`, and `*`.
- Route-rendered page surfaces: 48 when including local `WelcomePage` and `AuthPage`.
- Routed `src/pages/**` components: 46.
- Non-test JS/JSX modules under `src/pages/**`: 59.

Current visible primary nav already has a good high-level shape in `src/navigation/primaryNavigation.js`:

- Home: `/home`
- Assistant: `/assistant`
- Tools: `/tools`
- Patients: `/patients`
- Operations: `/operations`
- Settings: `/settings`

Current shell model:

- `src/layout/AppShell.jsx` wraps authenticated routes through `AppShellPage` in `src/App.jsx`.
- `src/components/Sidebar.jsx` owns primary nav, workspace selector, tool shortcuts, recent/favorite/pinned tools, conversations, notifications, and sign-out.
- `src/layout/PublicShell.jsx` wraps public/legal/help/share surfaces.
- `src/layout/AuthShell.jsx` wraps auth and callback surfaces.

Current issue:

The shell is flatter than the page architecture. Users can still land in many full-page tools or hidden modules that do not feel like part of one assistant workspace.

## 3. Current AI Chatbot Wireframe

Active implementation:

- `src/pages/Dashboard.jsx`

Supporting components and services:

- `src/components/chat/ChatExecutionCard.jsx`
- `src/components/chat/OperationalResultCard.jsx`
- `src/components/ToolVisualization.jsx`
- `src/components/Citations.jsx`
- `src/components/ConfidenceBadge.jsx`
- `src/components/ui/Drawer.jsx`
- `src/services/clinicalChatService.js`
- `src/utils/chatCapabilitySuggestions.js`
- `src/utils/chatExecutionModel.js`
- `src/contexts/ConversationContext.jsx`
- `src/navigation/registryToolLaunch.js`

Active chat routes:

- `/home` renders `Dashboard`.
- `/assistant` renders `Dashboard`.
- `/dashboard` redirects to `/home`.
- `/chat` redirects to `/assistant`.

Chatbot wireframe as implemented:

- Left: `Sidebar` in `AppShell`, including nav, tools, workspaces, and recent conversations.
- Center: `Dashboard` header, message stream, empty-state action cards, execution cards, operational result cards, citations, visualizations, and composer.
- Right: no persistent right panel yet. `Drawer` is used for outreach planning and sensitive confirmations.
- Bottom: composer, quick actions, and mobile bottom nav from `AppShell`.

Important finding:

`src/components/ChatInterface.jsx` is an older chat UI. It calls the same `sendClinicalChatMessage()` service and renders tool cards, visualizations, citations, and a `ToolPanel`, but current route inspection found no active route rendering it. It should be treated as legacy or a source of reusable patterns, not the primary workspace.

Current assistant capabilities already wired:

- Free-text clinical chat via `POST /api/chat/message`.
- Intent classification and RAG-backed responses through backend `ChatService`.
- Emergency escalation response path through backend `EmergencyEscalationService`.
- Inline executable cards for three registered backend executors.
- Capability suggestions for follow-up planning, audit logs, compliance export, notifications, billing, and profile routes.
- Tool launch seeding through `applyRegistryToolLaunch()` for chat-assisted tools.

## 4. Routes That Already Fit The Chatbot Model

These routes either render the assistant workspace directly or naturally launch into it:

- `/assistant`: canonical assistant route.
- `/home`: shared `Dashboard` implementation; should become command center and route users into `/assistant`.
- `/chat`: legacy alias to `/assistant`; preserve.
- `/dashboard`: legacy alias to `/home`; preserve.
- Chat-assisted calculator/tool launches from `src/navigation/registryToolLaunch.js`.
- `ToolsOverview` assistant launch buttons in `src/pages/tools/ToolsOverview.jsx`.
- Chat-assisted calculator cards in `src/pages/tools/Calculators.jsx`.
- Dashboard empty-state actions for medication safety, lab interpretation, SOFA, outreach planning, and clinical reasoning.
- Capability suggestions from `src/utils/chatCapabilitySuggestions.js`.

Routes that are compatible but need better assistant handoff:

- `/tools/drug-checker`
- `/tools/lab-interpreter`
- `/tools/calculators`
- `/tools/calculators/:slug`
- `/tools/protocols`
- `/tools/diagnosis`
- `/tools/procedures`
- `/tools/calculator-recommender`

These should keep direct routes but open as assistant-contextual workflows or right-panel tools when launched from the main UX.

## 5. Routes That Bypass The Chatbot Model

Public/auth routes intentionally bypass the chatbot:

- `/`
- `/auth`
- `/auth-callback`
- `/auth/callback`
- `/privacy`
- `/terms`
- `/gdpr`
- `/hipaa`
- `/help`
- `/shared/tools/:shareId`

Protected routes that use `AppShell` but bypass the chatbot center:

- `/patients`
- `/operations`
- `/settings`
- `/profile`
- `/profile-settings`
- `/notifications`
- `/two-factor-setup`
- `/biometric-setup`
- `/onboarding`
- `/consent`
- `/consent-history`
- `/team`
- `/audit-logs`
- `/analytics`
- `/costs`
- `/clinical/alerts`
- `/fleet/command`
- `/fleet/predictive-maintenance`
- `/fleet/route-optimizer`
- `/tools/catalog`
- `/tools/*`
- `/fleet/*`

Clinical AI pages that currently feel like separate AI products:

- `/tools/ambient-scribe`
- `/tools/guideline-rag`
- `/tools/differential-ai`
- `/tools/timeline-ai`
- `/tools/patient-summary-ai`
- `/tools/order-set-ai`
- `/tools/ai-explainability`
- `/tools/clinical-audit`

Planning recommendation:

Keep direct routes during migration. Change normal navigation and tool launch behavior so these routes are experienced as Assistant workflows, right-panel tools, or developer/admin surfaces rather than separate primary destinations.

## 6. Tool/Calculator UX Findings

Canonical user-facing tool browser:

- `/tools`
- `src/pages/tools/ToolsOverview.jsx`
- Data source: `getUserFacingToolRegistryProjection()` from `src/data/toolInventory.js`
- Launch helper: `applyRegistryToolLaunch()` from `src/navigation/registryToolLaunch.js`

Canonical calculator routes:

- `/tools/calculators`
- `/tools/calculators/:slug`
- Data sources: `builtinUiCalculators`, `getCalculatorToolInventory()`, `CALCULATOR_ROUTE_DEFS`

Developer catalog route:

- `/tools/catalog`
- `src/pages/tools/ClinicalToolCatalog.jsx`
- Gated by `Permission.CONFIGURE_SYSTEM`
- Uses raw/diagnostic catalogs and should remain developer/audit, not clinician workflow UX.

Current tool counts:

- Canonical registry tools: 69.
- Canonical inventory records: 72, including 3 platform records.
- User-facing `/tools` actions: 69.
- Built-in calculator forms: 31.
- Chat/NLU profiles: 59.
- POST-executable orchestrator tools: 3.
- Medical catalog rows from registry/NLU union: 75.

Tool UX that already follows canonical launch:

- Sidebar tool cards use `applyRegistryToolLaunch()`.
- Tools overview primary open action uses `applyRegistryToolLaunch()`.
- AppShell tool selection uses `applyRegistryToolLaunch()`.

Tool UX that partially bypasses the canonical flow:

- `ClinicalToolCatalog.jsx` intentionally uses source-audit/raw catalog data and direct `navigate(path)` calls.
- `Calculators.jsx` uses direct `navigate(calc.route)` for built-in calculator cards.
- Chat-assisted calculator cards use `getRegistryToolNavigation()` rather than the full launch helper.
- Individual tool pages keep local `toolConfig` metadata instead of deriving visible metadata from `toolInventory.js`.

Planning recommendation:

- Keep `/tools` as the action library.
- Keep `/tools/calculators` as a calculator-focused view.
- Keep `/tools/catalog` developer-only.
- Introduce an Assistant workspace panel contract so launches can choose: chat seed, right-panel form, full-page fallback, or developer/audit page.
- Preserve direct tool URLs while making normal clicks open the assistant workspace with the tool active.

## 7. Backend Capability UX Findings

Backend route inventory:

- `src/data/backendHttpRouteInventory.js` lists 100 backend HTTP routes.
- Chat routes are in `backend/src/modules/chat/chat.controller.ts`.
- Tool execution routes are in `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`.
- Clinical intelligence routes are in `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`.

Backend capabilities that should surface inside Assistant:

- `POST /api/chat/message`: primary chat.
- `POST /api/chat/intent-classify`: assistant intent preview, command routing, or debugging.
- `POST /api/chat/suggest-action`: next-action suggestions in the workspace.
- `POST /api/chat/analyze-vitals`: vitals analysis as a right-panel workflow.
- `POST /api/tools/:id/validate`: preflight validation for executable tool cards.
- `POST /api/tools/:id/execute`: confirmed execution for registered tools.
- `GET /api/tools/catalog/executors`: developer/audit and capability transparency.
- Clinical intelligence endpoints for scribe, guideline RAG, differential, timeline, patient summary, order sets, explainability, and clinical audit.

Backend functions that should remain internal-only:

- `RagService`
- `EncryptionService`
- `CacheService`
- `EmailService`
- `EmergencyEscalationService`
- `IntentClassifierService`
- `ToolOrchestratorService.executeInChat`

Frontend tools with intentionally limited backend connection:

- 30 of 31 calculator forms are local/client-side.
- 15 calculator-hub guided tools are chat-assisted only.
- 56 of 59 NLU profiles have no tool-orchestrator POST executor.
- `dispatch-ai` is chat/NLU routed and explicitly not a POST executor.

Backend-backed capabilities weakly represented in UI:

- `/api/tools/catalog/executors` has client support but is not a normal clinician-facing workflow.
- `/api/chat/suggest-action` and `/api/chat/analyze-vitals` fit the Assistant workspace but are not yet prominent primary UX.
- `/api/drugs` and `/api/protocols/categories` clients exist, but production page usage is not clearly first-class.

Planning recommendation:

Expose backend capabilities as user-safe modes:

- Guided by Assistant.
- Local calculator.
- Verified server action.
- Clinical intelligence workflow.
- Reference data.
- Admin/developer audit.
- Unsupported or planned with clear fallback.

## 8. Proposed Flattened AI Workspace

Target workspace:

- Left navigation: only primary sections and workspace/conversation essentials.
- Center: Assistant chat and workflow canvas.
- Right panel: active patient/context, tool forms, calculator inputs/results, citations, evidence, audit trail, and next steps.
- Bottom/quick actions: recent workflows, recommended tools, safety confirmations, and mobile-friendly action chips.

Recommended primary sections:

- Assistant
- Tools
- Patients / Workspace
- Operations
- Settings
- Developer Audit, visible only when allowed

Role of Home:

Home should become either a lightweight command center or redirect-style entry point into Assistant. It should not compete with Assistant as a separate product concept. During migration, keep `/home` for compatibility and use it for recent activity, recommended workflows, and "start a case" prompts.

Role of Assistant:

Assistant becomes the central user-facing experience. It should support:

- Free text clinical chat.
- Tool suggestions based on message/context.
- Inline executable cards for registered backend executors.
- Right-panel calculator/forms.
- Evidence/citations side panel.
- Human-review confirmation steps.
- Recent workflow recall.
- Failure states and unsupported-capability explanations.

Role of Tools:

Tools becomes a workflow library and command palette, not a parallel app. Opening a tool should normally activate Assistant with the appropriate panel/workflow. Direct route pages remain as deep links and fallback surfaces.

## 9. Page-by-Page UX Classification

Keep as standalone public/auth pages:

- `/` -> `WelcomePage`; keep page.
- `/auth` -> `Auth`; keep page.
- `/auth-callback` and `/auth/callback` -> auth plumbing; keep internal.
- `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`; keep public pages.
- `/shared/tools/:shareId`; keep standalone public share surface, but security-review before expanding.

Make Assistant the conceptual center:

- `/assistant` -> `Dashboard`; keep as primary workspace.
- `/home` -> `Dashboard`; keep route, but make it command-center/launcher into Assistant.
- `/dashboard` -> redirect/alias; preserve.
- `/chat` -> redirect/alias; preserve.

Keep as high-level sections:

- `/tools` -> `ToolsOverview`; keep as workflow library.
- `/patients` -> `Patients`; keep as patient/workspace hub.
- `/operations` -> `Operations`; keep as operations hub.
- `/settings` -> `Settings`; keep as settings hub.

Convert to right-panel tools inside Assistant:

- `/tools/drug-checker` -> `DrugChecker`
- `/tools/lab-interpreter` -> `LabInterpreter`
- `/tools/calculators` -> `Calculators`
- `/tools/calculators/:slug` -> `Calculators initialCalculatorId`
- `/tools/protocols` -> `Protocols`
- `/tools/procedures` -> `ProcedureGuide`

Convert to Assistant workflows:

- `/tools/diagnosis` -> `DiagnosisAssistant`
- `/tools/calculator-recommender` -> `CalculatorRecommender`
- `/tools/ambient-scribe` -> `AmbientScribe`
- `/tools/guideline-rag` -> `GuidelineRag`
- `/tools/differential-ai` -> `DifferentialAi`
- `/tools/timeline-ai` -> `TimelineAi`
- `/tools/patient-summary-ai` -> `PatientSummaryAi`
- `/tools/order-set-ai` -> `OrderSetAi`
- `/clinical/alerts` -> `ClinicalAlertsPage`, surfaced as operations/assistant alert workflow.

Keep developer/admin/audit:

- `/tools/catalog` -> `ClinicalToolCatalog`; developer/audit only.
- `/tools/clinical-audit` -> `ClinicalAudit`; audit/admin workflow, not normal clinician nav.
- `/audit-logs` -> `AuditLogs`; compliance/admin.
- `/analytics` -> `AnalyticsDashboard`; operations/admin.
- `/costs` -> `CostAnalyticsDashboard`; admin/billing, hidden from normal nav unless intended.
- `/team` -> `TeamManagement`; settings/admin.

Keep fleet under Operations, with Assistant handoff:

- `/fleet/command` -> `FleetDashboard`; keep route, surface under Operations and assistant dispatch context.
- `/fleet/predictive-maintenance` -> `PredictiveMaintenance`; keep route, surface under Operations.
- `/fleet/route-optimizer` -> `RouteOptimizer`; keep route, surface under Operations.
- `/fleet` -> redirect/alias; preserve.
- `/fleet/*` -> fallback; preserve.

Move account/security pages under Settings panels later:

- `/profile` -> settings/profile panel.
- `/profile-settings` -> settings/profile panel.
- `/notifications` -> settings/notifications panel.
- `/two-factor-setup` -> settings/security workflow.
- `/biometric-setup` -> settings/security workflow.
- `/onboarding` -> first-run or setup workflow.
- `/consent` -> settings/privacy workflow.
- `/consent-history` -> settings/privacy/history workflow.

Fallback/internal pages:

- `/tools/*` -> `ToolsAreaFallback`; keep safety net.
- `ToolNotFound`; keep as fallback component.
- Calculator helper modules and fleet widget modules under `src/pages/**`; keep internal composition modules.

## 10. Route Normalization Strategy

Do not remove routes in the first implementation phase.

Canonical visible routes:

- `/assistant`
- `/tools`
- `/patients`
- `/operations`
- `/settings`

Compatibility routes to preserve:

- `/home`
- `/dashboard`
- `/chat`
- `/auth` aliases
- `/tools/calculators`
- `/tools/calculators/:slug`
- `/tools/calculator/:legacySlug`
- `/fleet`
- `/fleet/*`
- `/catalog`
- `/tools/catalog`

Normalization approach:

- First normalize labels and launch behavior, not URLs.
- Keep deep links rendering the current page during transition.
- Add a route metadata layer later so every route declares UX role: primary section, assistant workflow, right-panel tool, developer-only, admin-only, public, fallback, alias.
- After analytics confirms low alias usage, consider redirecting more pages into `/assistant?workflow=...` or `/assistant?tool=...` while still preserving direct deep-link fallback.

Recommended future canonical query/state model:

- `/assistant?tool=drug-check`
- `/assistant?calc=sofa`
- `/assistant?workflow=differential-ai`
- `/assistant?patient=:id`
- `/assistant?operation=route-optimizer`
- `/assistant?audit=clinical-explainability`

## 11. Navigation Simplification Strategy

Current problem:

`Sidebar.jsx` currently combines primary nav, new conversation, workspace selection, all tools, favorites, pinned tools, recent tools, recent conversations, notifications, compliance badge, and sign out.

Recommended left navigation:

- Assistant
- Tools
- Patients / Workspace
- Operations
- Settings
- Developer Audit if `Permission.CONFIGURE_SYSTEM`

Move out of the left rail:

- Full 69-tool list.
- Favorites and pinned tools.
- Tool category expansion.
- Developer catalog quick action for ordinary users.
- Dense recent tool lists.

Move into Assistant/Tools panels:

- Recommended tools.
- Recent workflows.
- Favorite tools.
- Calculator shortcuts.
- Contextual next actions.
- Tool search and command palette.

Mobile strategy:

- Keep bottom nav for primary sections.
- Use Assistant composer as the main persistent action.
- Convert right panel to bottom sheet.
- Collapse tool filters into chips/search.
- Keep one active task visible at a time.

## 12. Tool Launch Strategy

Introduce one launch contract for all user-facing capabilities:

- `mode: assistant-chat`
- `mode: assistant-workflow`
- `mode: assistant-right-panel`
- `mode: direct-route`
- `mode: developer-audit`
- `mode: admin`
- `mode: fallback`

Build on current code:

- Extend or wrap `getRegistryToolNavigation()` in `src/navigation/registryToolLaunch.js`.
- Add workspace launch metadata in `src/data/toolInventory.js`.
- Keep `applyRegistryToolLaunch()` as the main entry point from sidebar, tools, dashboard, and calculator cards.
- Update `ToolsOverview.jsx` and `Calculators.jsx` so all user-facing clicks use the same launch helper.
- Standardize "Open in Assistant" so it seeds the conversation with meaningful context and opens the right panel when applicable.

Tool launch behavior by category:

- Registered executors: open Assistant with `ChatExecutionCard`, validate first, require confirmation, execute, render `OperationalResultCard`.
- Local calculators: open Assistant with calculator right panel; keep direct calculator route fallback.
- Chat-assisted tools: seed Assistant and show guided checklist/results area.
- Clinical intelligence workflows: open Assistant workflow panel with form, safety language, and backend result renderer.
- Fleet tools: open Operations or Assistant operations panel depending on launch context.
- Developer catalog: direct route only for allowed users.

## 13. Mobile/Responsive Strategy

Current strengths:

- `AppShell` compact breakpoint at 900px.
- Mobile drawer with focus management.
- Bottom nav on compact viewports.
- Dashboard visual viewport handling.
- Calculator responsive tests.
- Responsive QA matrix with Android widths.

Mobile requirements for implementation:

- No horizontal overflow at 320px, 360px, 390px, 412px, 430px, 480px, 600px, and tablet widths.
- Text must wrap inside cards, tool results, chips, and calculator summaries.
- Assistant composer must remain reachable with Android soft keyboard open.
- Right panel becomes bottom sheet on compact viewports.
- Tool/calculator inputs remain touch-friendly.
- Clinical warnings and disclaimers remain visible before action.
- Long result objects use collapsible sections rather than overflowing cards.
- Fleet dashboards and catalog/audit views must keep tables scroll-contained.

High-risk files for mobile work:

- `src/pages/Dashboard.jsx`
- `src/pages/Dashboard.css`
- `src/layout/AppShell.jsx`
- `src/layout/AppShell.css`
- `src/components/Sidebar.jsx`
- `src/components/Sidebar.css`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/Calculators.css`
- `src/pages/tools/ClinicalToolCatalog.jsx`
- `src/pages/tools/ClinicalToolCatalog.css`
- `src/pages/ProfileSettings.jsx`
- `src/pages/TwoFactorSetup.jsx`
- `src/pages/team/TeamManagement.css`
- Fleet page CSS and widget modules under `src/pages/fleet/**`

## 14. Safety/Fallback Strategy

Safety requirements:

- Every clinical AI/workflow output must show decision-support language.
- Human review must be explicit for scribe, differential, patient summary, order set, dispatch, and any PHI-sensitive workflows.
- Backend unsupported tools must not silently fail or pretend to execute.
- Local calculators must identify whether results are local, server-backed, or chat-assisted.
- Emergency detection/escalation should remain backend-owned and visibly surfaced in Assistant responses.
- Missing backend capability must render a clear fallback card, not blank/null content.
- Permission-denied flows should route to a clear "not available for your role" state instead of only redirecting to Home where feasible.

Current safety anchors:

- `src/data/clinicalSafetyGuardrails.js`
- `src/data/unsupportedOrchestratorTools.js`
- `src/data/orchestratorMappingAudit.js`
- `src/utils/chatCapabilitySuggestions.js`
- `src/utils/chatExecutionModel.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalIntelligenceApi.js`
- Backend `ChatService`, `ToolOrchestratorService`, and `ClinicalIntelligenceService`.

Recommended fallback states:

- Unsupported POST executor: show "guided or local only" with available launch path.
- Backend offline: show retry, local-only mode if available, and "do not use stale result" warning.
- Permission missing: show required permission and safe next step.
- Unknown tool ID: show Tool Not Found with Assistant fallback and developer catalog only if allowed.
- Null launch path: fail test and show safe fallback to `/tools`, not a blank render.

## 15. Implementation Phases

Phase 0: Lock current behavior

- Keep routes unchanged.
- Add route metadata audit tests.
- Fix stale tests that still expect legacy labels/routes.
- Snapshot current Assistant, Tools, and calculator behavior.

Phase 1: Define workspace contract

- Add a workspace launch model that classifies capabilities as assistant workflow, right-panel tool, direct route, developer audit, admin, or fallback.
- Extend `toolInventory.js` records with assistant UX metadata.
- Keep existing `path` and `navigationPath` fields backward-compatible.

Phase 2: Centralize launch behavior

- Route all normal tool clicks through one launch helper.
- Update `Calculators.jsx` and `ClinicalToolCatalog.jsx` where appropriate.
- Ensure "Open in Assistant" always seeds meaningful context.
- Preserve direct deep links.

Phase 3: Add Assistant right panel

- Add persistent workspace panel to `Dashboard`.
- Render calculators, tool forms, evidence, clinical intelligence forms, and results inside that panel.
- Keep mobile bottom sheet behavior.

Phase 4: Convert disconnected pages

- Convert clinical AI pages into Assistant workflow panels.
- Convert Drug Checker, Lab Interpreter, calculators, Protocols, and Procedure Guide into right-panel tools.
- Keep full-page routes as direct fallback/deep-link wrappers.

Phase 5: Simplify navigation

- Move full tool list out of `Sidebar`.
- Keep sidebar high-level sections only.
- Add Assistant quick actions, command search, recent workflows, and contextual recommendations.
- Keep Developer Audit only for users with permission.

Phase 6: Harden safety and fallback states

- Add explicit unsupported, permission-denied, backend-offline, and null-launch UI states.
- Ensure every clinical output has review language.
- Ensure failed backend calls do not render blank panels.

Phase 7: Route normalization after proof

- Use usage data or logs before removing any visible path.
- Keep aliases and redirects until external deep-link usage is known.
- Only then consider replacing direct pages with `/assistant?...` canonical entries.

## 16. Exact Files To Modify Later

Core routing and shell:

- `src/App.jsx`
- `src/navigation/primaryNavigation.js`
- `src/navigation/registryToolLaunch.js`
- `src/layout/AppShell.jsx`
- `src/layout/AppShell.css`
- `src/components/Sidebar.jsx`
- `src/components/Sidebar.css`

Assistant workspace:

- `src/pages/Dashboard.jsx`
- `src/pages/Dashboard.css`
- `src/components/chat/ChatExecutionCard.jsx`
- `src/components/chat/OperationalResultCard.jsx`
- `src/components/ToolVisualization.jsx`
- `src/components/Citations.jsx`
- `src/components/ConfidenceBadge.jsx`
- `src/components/ui/Drawer.jsx`
- Potentially retire or reuse `src/components/ChatInterface.jsx`
- `src/contexts/ConversationContext.jsx`
- `src/hooks/**` used by dashboard/workspace panels

Tool inventory and launch contracts:

- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/chatAssistedHubGroups.js`
- `src/routes/clinicalToolRoutes.js`

Tool pages to convert into workflows/panels:

- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/DrugChecker.jsx`
- `src/pages/tools/LabInterpreter.jsx`
- `src/pages/tools/Protocols.jsx`
- `src/pages/tools/DiagnosisAssistant.jsx`
- `src/pages/tools/ProcedureGuide.jsx`
- `src/pages/tools/AmbientScribe.jsx`
- `src/pages/tools/CalculatorRecommender.jsx`
- `src/pages/tools/GuidelineRag.jsx`
- `src/pages/tools/DifferentialAi.jsx`
- `src/pages/tools/TimelineAi.jsx`
- `src/pages/tools/PatientSummaryAi.jsx`
- `src/pages/tools/OrderSetAi.jsx`
- `src/pages/tools/AiExplainability.jsx`
- `src/pages/tools/ClinicalAudit.jsx`
- `src/pages/tools/ToolPageLayout.jsx`
- `src/pages/tools/ToolsAreaFallback.jsx`
- `src/pages/tools/ToolNotFound.jsx`

Operations and patient workflows:

- `src/pages/Patients.jsx`
- `src/pages/Operations.jsx`
- `src/pages/ClinicalAlertsPage.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/PredictiveMaintenance.jsx`
- `src/pages/fleet/RouteOptimizer.jsx`
- `src/pages/fleet/FleetPageChrome.jsx`
- `src/pages/fleet/*Widgets.jsx`

Settings/admin consolidation:

- `src/pages/Settings.jsx`
- `src/pages/Profile.jsx`
- `src/pages/ProfileSettings.jsx`
- `src/pages/NotificationPreferences.jsx`
- `src/pages/TwoFactorSetup.jsx`
- `src/pages/BiometricSetup.jsx`
- `src/pages/Onboarding.jsx`
- `src/pages/legal/ConsentFlow.jsx`
- `src/pages/legal/ConsentHistory.jsx`
- `src/pages/team/TeamManagement.jsx`
- `src/pages/AuditLogs.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/CostAnalyticsDashboard.jsx`

Frontend API clients:

- `src/services/clinicalChatService.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalToolsApi.js`
- `src/services/clinicalIntelligenceApi.js`
- `src/services/clinicalContentApi.js`
- `src/services/fleetTelemetryService.js`
- `src/services/routeOptimizationService.js`
- `src/services/predictiveMaintenanceScoring.js`
- `src/services/auditApi.js`
- `src/services/complianceApi.js`
- `src/services/profileApi.js`

Backend contracts and controllers:

- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- `backend/src/modules/medical-control-plane/intent-classifier/**`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`
- `backend/src/modules/rag/**`
- `backend/src/modules/ai/**`
- `backend/src/modules/audit/**`
- `backend/src/modules/clinical/**`

Build/config/test files:

- `package.json`
- `vite.config.js`
- `vercel.json`
- `tsconfig.frontend.json`
- `src/data/responsiveQaMatrix.js`
- `src/test/responsiveRegression.routes.js`
- `src/test/routePagesSmoke.test.jsx`
- `backend/package.json`
- `backend/scripts/run-eslint.mjs`

## 17. Test Plan

Route rendering:

- Keep and expand `src/test/routePagesSmoke.test.jsx`.
- Add canonical-route rendering tests for `/assistant`, `/tools`, `/patients`, `/operations`, and `/settings`.
- Add alias preservation tests for `/dashboard`, `/chat`, `/fleet`, `/catalog`, auth aliases, and legacy calculator aliases.
- Add no-duplicate-visible-route tests against `PRIMARY_NAV_ITEMS`.

Chatbot workspace rendering:

- Expand `src/pages/Dashboard.chatLayout.test.jsx`.
- Verify Assistant renders message stream, composer, quick actions, execution cards, result cards, citations, and fallback states.
- Add tests for right-panel/bottom-sheet rendering once implemented.

Tool launch into chatbot:

- Expand `src/navigation/registryToolLaunch.test.js`.
- Verify every user-facing inventory record resolves to one valid mode.
- Verify chat-assisted tools seed Assistant.
- Verify local calculators open panel/deep route.
- Verify developer-only entries do not appear for ordinary users.

Calculator panel rendering:

- Keep `src/pages/tools/Calculators.formSmoke.test.jsx`.
- Add assistant-panel calculator tests.
- Verify calculator slugs render without horizontal overflow.
- Verify unknown calculator slugs show a safe fallback.

Mobile responsive layout:

- Keep `src/pages/Dashboard.mobile.test.jsx`.
- Keep `src/pages/tools/Calculators.responsive.test.js`.
- Keep `src/layout/AppShell.layout.test.js`.
- Keep `src/styles/responsiveUx.test.js`.
- Expand Playwright responsive QA to cover Assistant with panel open, keyboard open, calculator panel, clinical AI workflow panel, and fleet operations.

Backend failure states:

- Expand `src/services/clinicalChatService.test.js`.
- Expand `src/services/clinicalOrchestratorApi.test.js`.
- Expand `src/services/clinicalIntelligenceApi` tests if missing.
- Add UI tests for network error, 401/403, unsupported tool, validation error, and empty response.

No null launch paths:

- Add inventory contract test: every user-facing tool has one of route, assistant workflow, right-panel tool, chat seed, or developer/admin classification.
- Fail when launch mode is undefined or silently falls back to blank.

No duplicate visible routes:

- Verify `/dashboard`, `/chat`, `/catalog`, `/fleet`, and legacy calculator paths are not visible primary nav entries.
- Verify `/tools/catalog` appears only for `Permission.CONFIGURE_SYSTEM`.

Known stale tests to fix during implementation:

- `src/pages/tools/ToolsAreaFallback.test.jsx` has stale `/dashboard` expectations.
- `src/data/responsiveQaMatrix.test.js` may still expect `dashboard` while matrix uses `home`.
- `src/test/responsiveRegression.routes.js` still lists `/dashboard` and `/chat`.
- `src/pages/Dashboard.chatLayout.test.jsx` has older heading expectations such as `Pulse` / `CareDroid Clinical Chat` while current UI uses `Home` / `CareDroid Assistant`.

Recommended command groups after environment is healthy:

- `npm run test:registry-launch`
- `npm run test:catalog-launch`
- `npm run test:tool-render-smoke`
- `npm run test:responsive-regression`
- `npm run test:mobile-performance`
- `npm run test:backend-exposure`
- `npm run test:safety-compliance`
- `cd backend && npm run build && npm test`
- `npm run validate:ci` after stale expectations are updated

## 18. Risks

Primary UX risks:

- Collapsing too quickly could break deep-link workflows that are currently working.
- Moving all tools into Assistant could overload the chat workspace if the right-panel model is not designed first.
- `/home` and `/assistant` currently share `Dashboard`; changing one may unintentionally change both.
- Retiring `ChatInterface` too early may remove reusable patterns still expected by tests.

Backend/product risks:

- Many tools are user-facing but not POST-executable. UX must distinguish local, guided, and verified server actions.
- `dispatch-ai` is backend/chat-routed but not a POST executor, which can confuse implementation if labels are not precise.
- Clinical intelligence endpoints are already represented as pages; converting them to workflows must preserve permissions and safety copy.
- Backend route inventory and frontend capability flags must stay synchronized.

Mobile risks:

- Assistant plus right panel plus bottom nav can crowd Android viewports.
- Calculator forms can overflow if embedded without careful sheet/panel constraints.
- Developer catalog and fleet tables are high-risk for horizontal overflow.

Testing/config risks:

- Some route/responsive tests are stale relative to current canonical routes.
- Frontend typecheck currently covers TS/TSX but most frontend code is JS/JSX.
- Backend lint script can auto-fix files, which is risky in CI planning.
- Vercel env validation requires correct `VITE_API_URL` or same-origin allowance.

## 19. Do-Not-Touch List

Do not delete, rename, or remove compatibility before implementation and analytics review:

- `/auth` and all auth aliases in `src/routing/authPathAliases.js`.
- `/auth-callback` and `/auth/callback`.
- `/home`, `/assistant`, `/dashboard`, and `/chat`.
- `/tools`, `/tools/calculators`, all 31 calculator subroutes, and legacy singular calculator aliases.
- `/tools/catalog` and its `Permission.CONFIGURE_SYSTEM` gates.
- `/fleet`, `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer`, and `/fleet/*`.
- `/shared/tools/:shareId`.
- `/tools/*` fallback and `ToolNotFound` fallback behavior.
- `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `clinicalToolIdContract.js`, `toolInventory.js`, and `clinicalCatalogWiring.js` until launch metadata is added and tested.
- Backend executor limits in `tool-orchestrator.registry.ts`; do not mark unsupported tools executable for UX convenience.
- Safety disclaimers, human-review copy, emergency escalation handling, and permission gates.
- Public legal/help pages and auth shells.
- Non-routed calculator helper modules and fleet widget modules under `src/pages/**` until import tracing proves they are unused.
