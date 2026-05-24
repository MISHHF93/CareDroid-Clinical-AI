# Current AI Chatbot Wireframe and UX Flattening Investigation

Status: discovery-only investigation  
Scope: current UI/UX architecture, assistant wireframe, route/page structure, tool launch flows, calculator flows, backend result surfacing, and flattening opportunities  
Non-goal: no source-code changes, route changes, deletions, renames, or flattening in this pass

## 1. Executive Summary

Fact: CareDroid Clinical AI is not fully flattened today. It has a strong assistant-centered core, but the overall product experience is still mixed and fragmented across dashboard/home, assistant, tools, calculators, clinical AI pages, fleet/operations pages, settings/admin pages, and developer/audit surfaces.

Fact: The live assistant/chat workspace is `src/pages/Dashboard.jsx`, rendered by both `/home` and `/assistant`. The prompt input, message list, assistant result rendering, suggested action chips, backend execution cards, result cards, citation display, visualizations, loading state, and error fallback all live there.

Fact: `src/components/ChatInterface.jsx` still exists and calls the same chat service, but current route inspection did not find it as the routed assistant experience. It should be treated as legacy, test-covered, or reusable support code until proven otherwise.

Fact: The primary visible navigation is already relatively flat: Home, Assistant, Tools, Patients, Operations, Settings. The deeper route map is much larger: 104 expanded route entries, including 31 calculator subroutes and 23 redirect/alias patterns.

Recommendation: Treat `/assistant` as the primary workflow layer and keep all existing routes as deep-link-compatible surfaces while progressively moving normal user flows into Assistant-centered workflows, tool panels, and result panels.

Recommendation: Do not delete or rename routes yet. The first implementation should centralize launch behavior and wireframe layout, not remove compatibility.

## 2. Current UX Classification

Current classification: **mixed/fragmented**.

The app is partly chat-first:

- `/assistant` renders `Dashboard` as the assistant workspace.
- Chat can send messages through `POST /api/chat/message`.
- Chat renders structured result cards, citations, tool visualizations, execution cards, suggestions, and loading/error states.
- Registered backend executors can run inline in chat after validation and confirmation.

The app is also dashboard-first:

- `/home` renders the same `Dashboard` component but labels itself as Home.
- Home has pulse/priority action cards that route into tools or Assistant.
- `/dashboard` still exists as a legacy alias to `/home`.

The app is also tools-first:

- `/tools` is the user-facing tool browser.
- Sidebar exposes 69 data-backed tool shortcuts.
- Many tool routes remain standalone full pages.
- `/tools/calculators` is a full calculator hub rather than a pure assistant panel.

The app is also page-first in several areas:

- Clinical AI workflows have dedicated `/tools/*` pages.
- Fleet workflows have dedicated `/fleet/*` pages.
- Settings, account, notifications, consent, audit, analytics, costs, and team management are standalone surfaces.

Conclusion: the UI has an AI-centered core, but the overall product still feels like a collection of route islands connected by a shared shell.

## 3. Current AI Chatbot Wireframe

Main assistant/chat experience:

- Component/page: `src/pages/Dashboard.jsx`.
- Routes: `/assistant` and `/home`.
- Legacy aliases: `/chat` redirects to `/assistant`; `/dashboard` redirects to `/home`.

Prompt input:

- Rendered in `Dashboard` near the bottom composer.
- Textarea placeholder: `Ask anything clinical...`.
- Submission path: `handleSendMessage()` -> `submitChatMessage()`.
- Service call: `sendClinicalChatMessage()` from `src/services/clinicalChatService.js`.

Messages:

- Message state comes from `useConversation()` in `src/contexts/ConversationContext`.
- Messages are rendered in `Dashboard` via `messages.map(...)`.
- Assistant messages render content, confidence, tool results, visualizations, citations, execution cards, and suggestions.

Tool suggestions:

- Empty-state starter cards come from `CHAT_EMPTY_ACTIONS` in `Dashboard`.
- Dynamic action chips come from `getChatCapabilitySuggestions()` in `src/utils/chatCapabilitySuggestions.js`.
- Backend/tool executor suggestions are filtered from backend-backed inventory records.

Calculator launch points:

- Dashboard pulse action routes to `/tools/calculators`.
- Sidebar tool cards can launch calculator routes through `applyRegistryToolLaunch()`.
- `/tools` cards use `applyRegistryToolLaunch()`.
- `/tools/calculators` cards use direct `navigate(calc.route)` for built-in calculators.
- Chat-assisted calculator cards seed Assistant and navigate to `/assistant`.

Backend tool calls:

- Inline chat execution action is created by `createChatExecutionAction()` from `src/utils/chatExecutionModel.js`.
- Validation calls `validateClinicalTool()` from `src/services/clinicalToolsApi.js`.
- Execution calls `executeClinicalTool()` from `src/services/clinicalOrchestratorApi.js`.
- Results are added back to chat as assistant messages with `toolResult`.
- `OperationalResultCard` renders completed backend tool results.

Context panels:

- There is no persistent desktop right-side context panel for the main Assistant workspace.
- `Drawer` is used for sensitive confirmations and outreach planning.
- `AppShell` has left sidebar and mobile bottom nav but no persistent right-panel region yet.

Errors/loading states:

- Chat send failure shows a notification and adds an assistant message: "Unable to reach the clinical AI service. Check your connection and try again."
- Sending state renders `Thinking...`.
- Tool validation/execution failures update the corresponding execution action.
- Unsupported tool execution is blocked client-side before network calls in `clinicalOrchestratorApi.js`.

## 4. Current Route and Page Map

Fact: route source of truth is `src/App.jsx`, with generated routes from `src/routing/authPathAliases.js` and `src/routes/clinicalToolRoutes.js`.

Counts already verified by code inspection:

- 104 expanded route entries.
- 55 literal `src/App.jsx` route records.
- 14 generated auth alias routes.
- 31 generated calculator subroutes.
- 4 generated legacy calculator aliases.
- 23 redirect/alias route patterns.
- 3 wildcard/fallback patterns: `/tools/*`, `/fleet/*`, `*`.
- 48 route-rendered page surfaces when including local `WelcomePage` and `AuthPage`.
- 46 routed components imported from `src/pages/**`.
- 59 non-test JS/JSX modules under `src/pages/**`.

Canonical public/auth/share:

- `/`
- `/auth`
- `/auth-callback`
- `/privacy`
- `/terms`
- `/gdpr`
- `/hipaa`
- `/help`
- `/shared/tools/:shareId`

Canonical protected primary sections:

- `/home`
- `/assistant`
- `/tools`
- `/patients`
- `/operations`
- `/settings`

Canonical tools/fleet/clinical routes:

- `/tools`
- `/tools/catalog`
- `/tools/drug-checker`
- `/tools/lab-interpreter`
- `/tools/calculators`
- `/tools/calculators/:knownSlug`, generated from 31 calculator routes
- `/tools/protocols`
- `/tools/diagnosis`
- `/tools/procedures`
- `/tools/ambient-scribe`
- `/tools/calculator-recommender`
- `/tools/guideline-rag`
- `/tools/differential-ai`
- `/tools/timeline-ai`
- `/tools/patient-summary-ai`
- `/tools/order-set-ai`
- `/tools/ai-explainability`
- `/tools/clinical-audit`
- `/clinical/alerts`
- `/fleet/command`
- `/fleet/predictive-maintenance`
- `/fleet/route-optimizer`

Hidden, admin, or secondary routes:

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

Aliases and redirects:

- Auth aliases redirect to `/auth`.
- `/auth/callback` redirects to `/auth-callback`.
- `/dashboard` redirects to `/home`.
- `/chat` redirects to `/assistant`.
- `/fleet` redirects to `/fleet/command`.
- `/catalog` redirects to `/tools/catalog`.
- Four singular calculator paths redirect to plural calculator paths.

## 5. Current App Shell/Layout Map

Fact: the repository uses `src/layout`, not `src/layouts`.

Main shell:

- `src/layout/AppShell.jsx`.
- Used through `AppShellPage` in `src/App.jsx`.
- Wraps authenticated routes.
- Owns compact viewport state, sidebar drawer state, sidebar collapse state, bottom nav, theme FAB, and dev-mode banner.

Sidebar:

- `src/components/Sidebar.jsx`.
- Renders primary nav from `src/navigation/primaryNavigation.js`.
- Renders "Start Assistant".
- Renders workspace selector.
- Renders favorite, recent, pinned, and categorized tools.
- Renders Developer Catalog / Source Audit only when `Permission.CONFIGURE_SYSTEM` is present.
- Renders Browse All Tools.
- Renders recent conversations, notifications, HIPAA badge, and sign out.

Main content:

- `AppShell` renders route children inside `app-shell-main-wrap`.
- `AppShellPage` wraps children in `app-shell-page-body`.
- `/home` and `/assistant` use `Dashboard` inside that content region.

Public shell:

- `src/layout/PublicShell.jsx`.
- Used for welcome, legal/help pages, and shared tool sessions.

Auth shell:

- `src/layout/AuthShell.jsx`.
- Used for `/auth`, `/auth-callback`, and `/auth/callback`.

Mobile shell:

- `AppShell` switches to compact layout via `COMPACT_MEDIA_QUERY`.
- Sidebar becomes a drawer.
- Bottom nav mirrors primary navigation.
- Drawer focus is managed with `useDrawerFocus()`.

## 6. Current Assistant/Chat Flow

User reaches Assistant:

- Sign-in success navigates to `/home`.
- Welcome dev/demo bypass navigates to `/tools`.
- Sidebar "Start Assistant" creates a new conversation and navigates to `/assistant`.
- Primary nav Assistant goes to `/assistant`.
- `/chat` legacy route redirects to `/assistant`.

Prompt submission:

- User types into `Dashboard` textarea.
- `handleSendMessage()` calls `submitChatMessage(input)`.
- User message is added locally.
- `sendClinicalChatMessage()` posts to `/api/chat/message`.
- Response maps through `mapChatResponseToAssistantMessage()`.
- Assistant response is added to conversation state.

Message rendering:

- Assistant content appears in chat bubbles.
- Confidence renders with `ConfidenceBadge`.
- Tool results render with `OperationalResultCard`.
- Visualizations render with `ToolVisualization`.
- Citations render with `Citations` and `CitationModal`.
- Suggestions render as follow-up buttons.
- Execution cards render with `ChatExecutionCard`.

Error path:

- Request failure shows notification through `useNotificationActions()`.
- A fallback assistant message is inserted into chat.

Conclusion:

The assistant flow is coherent inside `Dashboard`, but not all major app workflows route back through it.

## 7. Current Tool Launch Flow

Canonical launch helper:

- `src/navigation/registryToolLaunch.js`
- `getRegistryToolNavigation(toolId)`
- `applyRegistryToolLaunch(toolId, handlers)`

Launch modes currently returned:

- `calculator-route`
- `chat-assisted`
- `tool-page`
- `calculator-hub`
- `fallback`

Main launch callers:

- `AppShellPage` via sidebar tool selection.
- `Sidebar` when no parent `onToolSelect` is supplied.
- `ToolsOverview`.
- `Patients`.
- `Operations`.
- `ClinicalToolCatalog`, partially.
- `ToolNotFound`.
- `Dashboard` for `?tool=` style legacy handling.

Current behavior:

- Dedicated calculator tools navigate to `/tools/calculators/:slug`.
- Chat-assisted tools seed chat and navigate to `/assistant`.
- Tool-page tools navigate to `/tools/*` or `/fleet/*` pages.
- Fallback opens known fallback route or `/tools/catalog`.

Fragmentation:

- `Calculators.jsx` uses direct `navigate(calc.route)` for built-in cards.
- Individual tool pages often call APIs directly inside standalone pages.
- Clinical AI pages are full-page forms/workflows, not Assistant panels.
- Developer catalog intentionally has raw/direct catalog launch behavior.

## 8. Current Calculator Flow

Canonical calculator hub:

- `/tools/calculators`
- Component: `src/pages/tools/Calculators.jsx`

Dedicated subroutes:

- 31 generated `/tools/calculators/:slug` routes.
- Render the same `Calculators` component with `initialCalculatorId`.

Calculator source data:

- `builtinUiCalculators` from `src/data/clinicalIntentToolCatalog.js`.
- `CALCULATOR_ROUTE_DEFS` from `src/routes/clinicalToolRoutes.js`.
- Calculator inventory from `src/data/toolInventory.js`.

Built-in calculator UX:

- Calculator cards render inside the calculator page.
- Clicking a built-in calculator sets selected state and navigates to the calculator route.
- Unknown slugs render `ToolNotFound`.

Chat-assisted calculator UX:

- `getHubChatAssistedTools()` produces chat-assisted hub cards.
- Clicking one calls `handleChatAssistedLaunch()`.
- It resolves catalog launch data, records access, optionally seeds chat, and navigates to `/assistant`.

Fragmentation:

- Built-in calculators are full-page calculator forms, not Assistant right-panel tools.
- Chat-assisted calculator tools are Assistant-first.
- This creates a split between local form calculators and chat-guided calculators.

## 9. Current Backend Tool Result Flow

Primary chat backend:

- Frontend: `src/services/clinicalChatService.js`.
- Backend: `backend/src/modules/chat/chat.controller.ts`.
- Endpoint: `POST /api/chat/message`.
- Permission: `USE_AI_CHAT`.

Chat backend response includes:

- `response`
- `suggestions`
- `visualizations`
- `toolResult`
- `citations`
- `confidence`
- `ragContext`
- `metadata`

Registered tool execution:

- Frontend validation: `validateClinicalTool()` from `src/services/clinicalToolsApi.js`.
- Frontend execution: `executeClinicalTool()` from `src/services/clinicalOrchestratorApi.js`.
- Backend: `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`.
- Endpoints: `POST /api/tools/:id/validate`, `POST /api/tools/:id/execute`.

POST-executable tools:

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`

Clinical intelligence endpoints:

- Backend controller: `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`.
- Frontend client: `src/services/clinicalIntelligenceApi.js`.
- Pages: Ambient Scribe, Guideline RAG, Differential AI, Timeline AI, Patient Summary AI, Order Set AI, AI Explainability, Clinical Audit.

Safety behavior:

- Unsupported orchestrator tools are classified before network calls.
- Unsupported execution returns explicit unsupported state.
- Dashboard surfaces success/failure through `ChatExecutionCard`, `OperationalResultCard`, notifications, and assistant fallback messages.

## 10. Fragmentation Findings

Fact: The product has one app shell but multiple user-facing mental models.

Fragmentation points:

- `/home` and `/assistant` share the same component but present different modes.
- `/tools` is user-facing, while `/tools/catalog` is developer/source audit.
- `/tools/calculators` is both a route hub and a target shared by many registry IDs.
- Some calculator flows are local full-page forms while other calculator-like flows are chat-assisted.
- Clinical AI pages are full pages instead of assistant workflows.
- Fleet tools are both tool inventory entries and Operations pages.
- Sidebar contains primary nav plus a large generated tool list, which makes the left rail feel like a second tool browser.
- Some pages are valid but hidden or weakly linked: `/costs`, `/team`, `/consent-history`, `/shared/tools/:shareId`.
- `ChatInterface.jsx` remains as a second chat implementation surface without current route ownership.

Recommendation:

Flatten user flows by making Assistant the main workflow layer and making Tools a searchable launcher rather than a parallel application.

## 11. Duplicate Entry Points

Auth duplicates:

- `/auth` is canonical.
- `/login`, `/signin`, `/signup`, `/register`, and related account aliases redirect to `/auth`.

Assistant/Home duplicates:

- `/assistant` and `/home` both render `Dashboard`.
- `/chat` redirects to `/assistant`.
- `/dashboard` redirects to `/home`.

Tools duplicates:

- `/tools` is the user-facing browser.
- `/tools/catalog` is developer/source audit.
- `/catalog` redirects to `/tools/catalog`.

Calculator duplicates:

- `/tools/calculators` is the hub.
- 31 `/tools/calculators/:slug` routes are direct subroutes.
- 4 `/tools/calculator/:slug` routes are legacy aliases.

Operations/fleet duplicates:

- `/operations` is primary nav.
- `/fleet/command`, `/fleet/predictive-maintenance`, and `/fleet/route-optimizer` are also tool inventory launches.
- `/fleet` redirects to `/fleet/command`.

Recommendation:

Keep duplicates as compatibility routes, but remove duplicate user-facing labels and normal navigation choices later.

## 12. Pages Outside Main Wireframe

Intentionally outside Assistant/AppShell:

- Public welcome page.
- Auth page.
- Auth callback.
- Legal/help pages.
- Shared tool session public route.

Inside AppShell but outside Assistant wireframe:

- `/tools`
- `/tools/catalog`
- `/tools/*` full-page tools.
- `/tools/calculators`
- `/patients`
- `/operations`
- `/fleet/*`
- `/settings`
- `/profile`
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

Recommendation:

Do not force every route into Assistant. Instead, classify routes:

- Primary shell sections.
- Assistant workflows.
- Right-panel tools.
- Developer/admin pages.
- Public/auth pages.
- Deep-link/fallback pages.

## 13. Tools Outside Assistant Workflow

Tools currently outside the Assistant workflow as full pages:

- Drug Checker
- Lab Interpreter
- Calculators
- Protocols
- Diagnosis Assistant
- Procedure Guide
- Ambient Scribe
- Calculator Recommender
- Guideline RAG
- Differential AI
- Timeline AI
- Patient Summary AI
- Order Set AI
- AI Explainability
- Clinical Audit
- Fleet Command
- Predictive Maintenance
- Route Optimizer

Partially assistant-connected tools:

- Chat-assisted calculator/hub tools seed Assistant.
- Tools Overview has `Open in Assistant`.
- Sidebar launch can route chat-assisted tools to Assistant.
- Dashboard can run three backend executors inline.

Recommendation:

Convert normal launches for clinician-facing tools into one of:

- Assistant workflow.
- Assistant right panel.
- Assistant seeded chat.
- Direct page only when deep-linked or explicitly opened.

## 14. Recommended Flattening Strategy

Facts to preserve:

- Existing routes work and should remain stable.
- `Dashboard` is the current assistant implementation.
- `/tools` is the user-facing tool browser.
- `/tools/catalog` is developer-only.
- Only three tools are currently server-executable.

Recommended flattening steps:

1. Define a route/workflow metadata contract that classifies each route as primary, assistant workflow, right-panel tool, developer/admin, public/auth, alias, or fallback.
2. Extend `registryToolLaunch` to support assistant panel/workflow modes in addition to existing route modes.
3. Route all normal tool launches through one launch helper.
4. Add a persistent Assistant context/tool panel to `Dashboard`.
5. Convert calculators into Assistant panel-capable components while preserving `/tools/calculators` routes.
6. Convert clinical AI pages into Assistant workflow panels while preserving direct routes.
7. Simplify Sidebar by keeping primary sections and moving full tool discovery into Tools or Assistant panels.
8. Keep Developer Catalog visible only to allowed users and label it as audit/source coverage, not a clinician catalog.
9. Keep compatibility aliases until usage is known.

## 15. Canonical AI-First UX Proposal

Recommended canonical user model:

- Assistant: central workspace for chat, workflow execution, context, results, and tool recommendations.
- Tools: searchable workflow/tool drawer, not a second app.
- Calculators: filtered tool view and Assistant panel forms.
- Patients / Workspace: patient context and case workspace.
- Operations: alerts, fleet, analytics, and operational workflows.
- Settings: account, security, privacy, notifications, billing, team, and trust.
- Developer Audit: permission-gated source/tool/backend coverage.

Recommended desktop wireframe:

- Left: compact primary nav and conversation/workspace essentials.
- Center: Assistant chat and workflow canvas.
- Right: context/tool/result/evidence panel.
- Bottom: composer, suggested actions, recent workflows.

Recommended mobile wireframe:

- Top/center: single active task.
- Bottom: primary nav and composer.
- Tool/context panel: bottom sheet.
- Sidebar: drawer only.
- Results: collapsible cards with no horizontal overflow.

## 16. Mobile Wireframe Observations

Facts:

- `AppShell` has compact mode and bottom nav.
- Sidebar becomes drawer on compact viewports.
- Dashboard listens to `visualViewport` resize/scroll and orientation changes.
- Dashboard composer stays at the bottom of the chat area.
- Calculators and catalog have responsive tests and CSS hardening.

Risks:

- Assistant header, suggested action rail, composer, and bottom nav can consume vertical space on Android.
- A future right panel must become a bottom sheet on mobile.
- Calculator forms embedded inside Assistant may overflow unless constrained.
- Developer catalog, fleet pages, and audit/analytics pages are table/card dense.
- Some pages use inline styles or `min-height: 100vh` inside AppShell contexts.

Recommendation:

Do mobile-first panel design before converting full pages into assistant panels.

## 17. Desktop Wireframe Observations

Facts:

- Desktop AppShell has fixed/sidebar layout and main content wrap.
- There is no persistent right context panel in the active Assistant.
- Current tool and calculator pages use full main content instead of side panels.
- Sidebar contains both primary IA and a large tool launcher.

Risks:

- The left rail can become visually overloaded.
- Without a right panel, tools must open as full pages or chat cards.
- The same `Dashboard` component serving Home and Assistant can blur product meaning.

Recommendation:

Add a desktop right-side workspace panel before moving major tool pages into Assistant.

## 18. Risks and Do-Not-Touch Areas

Flattening risks:

- Breaking deep links to existing `/tools/*`, `/fleet/*`, `/settings`, and calculator routes.
- Accidentally changing `/home` behavior while modifying `/assistant`, because both use `Dashboard`.
- Removing `ChatInterface.jsx` before confirming test/support usage.
- Treating local or chat-assisted tools as server-executable.
- Exposing developer catalog or audit tools to ordinary users.
- Weakening auth/dev bypass production safeguards.
- Losing safety disclaimers or human-review copy during panel conversion.

Do not touch yet:

- Auth aliases and auth callback routes.
- `/home`, `/assistant`, `/dashboard`, `/chat`.
- `/tools`, `/tools/calculators`, `/tools/catalog`.
- All calculator subroutes and legacy calculator redirects.
- `/fleet/*` and `/operations`.
- `/shared/tools/:shareId`.
- Permission gates for Developer Catalog, clinical AI pages, audit logs, analytics, costs, and team management.
- Tool inventory contract files.
- Backend executor registry and unsupported-tool classification.
- Clinical safety disclaimers, emergency escalation flow, human-review language, and fallback states.

## 19. Exact Files To Inspect Further

Assistant and shell:

- `src/pages/Dashboard.jsx`
- `src/pages/Dashboard.css`
- `src/components/ChatInterface.jsx`
- `src/layout/AppShell.jsx`
- `src/layout/AppShell.css`
- `src/components/Sidebar.jsx`
- `src/components/Sidebar.css`
- `src/navigation/primaryNavigation.js`
- `src/contexts/ConversationContext.jsx`

Tool launch and inventory:

- `src/navigation/registryToolLaunch.js`
- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalCatalogWiring.js`
- `src/routes/clinicalToolRoutes.js`

Tool pages and fallback:

- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/ClinicalToolCatalog.jsx`
- `src/pages/tools/ToolPageLayout.jsx`
- `src/pages/tools/ToolsAreaFallback.jsx`
- `src/pages/tools/ToolNotFound.jsx`
- `src/pages/tools/*.jsx`

Operations and settings:

- `src/pages/Patients.jsx`
- `src/pages/Operations.jsx`
- `src/pages/ClinicalAlertsPage.jsx`
- `src/pages/fleet/**`
- `src/pages/Settings.jsx`
- `src/pages/Profile.jsx`
- `src/pages/ProfileSettings.jsx`
- `src/pages/NotificationPreferences.jsx`
- `src/pages/team/TeamManagement.jsx`

API and backend:

- `src/services/clinicalChatService.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalToolsApi.js`
- `src/services/clinicalIntelligenceApi.js`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/**`
- `backend/src/modules/clinical-intelligence/**`
- `backend/src/modules/rag/**`
- `backend/src/modules/ai/**`

Tests and responsive coverage:

- `src/pages/Dashboard.chatLayout.test.jsx`
- `src/pages/Dashboard.mobile.test.jsx`
- `src/test/routePagesSmoke.test.jsx`
- `src/test/responsiveRegression.routes.js`
- `src/navigation/registryToolLaunch.test.js`
- `src/pages/tools/Calculators.responsive.test.js`
- `src/pages/tools/Calculators.formSmoke.test.jsx`
- `src/layout/AppShell.layout.test.js`
- `src/styles/responsiveUx.test.js`

## 20. Next Implementation Plan

Phase 1: Lock current behavior

- Add or update tests for current route rendering.
- Verify `/assistant`, `/home`, `/tools`, calculators, fleet, and clinical AI pages still render.
- Preserve aliases and fallbacks.

Phase 2: Define UX metadata

- Add a route/tool UX classification model.
- Mark primary sections, assistant workflows, right-panel tools, developer/admin pages, public/auth pages, aliases, and fallbacks.

Phase 3: Centralize launches

- Route all user-facing tool launches through `applyRegistryToolLaunch()` or an expanded successor.
- Remove direct launch behavior only after tests prove equivalent routes.

Phase 4: Add Assistant panel wireframe

- Add desktop right panel and mobile bottom sheet to `Dashboard`.
- Render selected tool context, calculator forms, backend results, citations, and safety state there.

Phase 5: Convert tools gradually

- Start with calculators and the three registered backend executors.
- Then convert chat-assisted tools.
- Then convert clinical intelligence pages.
- Keep direct routes as wrappers/deep links.

Phase 6: Simplify navigation

- Keep left nav high-level.
- Move dense tool discovery into `/tools`, Assistant quick actions, and command/search panels.
- Keep Developer Audit permission-gated and clearly labeled.

Phase 7: Hardening

- Add tests for mobile overflow, no null launch paths, backend failure states, permission-denied states, and unsupported executor states.
- Run responsive and route smoke tests before any route normalization.

Phase 8: Normalize only after evidence

- Use route usage data or logs before removing duplicate visible paths.
- Keep redirects and aliases until external deep-link usage is known.
