# Segment Fragmentation Investigation

Investigation date: 2026-05-23

Scope: read-only investigation of frontend routes, navigation, clinical tool registries, API clients, backend controllers, mock/local services, tests, docs, and build/config surfaces.

Recovery batch status: the investigation has been converted into an executable segment contract in `src/data/segmentInventory.js`, with drift tests in `src/data/segmentInventory.test.js`. The inventory is intentionally non-routing runtime data for now; it makes segment ownership, status, bridges, and recovery gaps enforceable before larger UX/backend rebuilds.

## 1. Executive Summary

CareDroid Clinical AI has a strong new center of gravity around `AppShell`, `/assistant`, `/tools`, `primaryNavigation.js`, `registryToolLaunch.js`, and `toolInventory.js`. The remaining fragmented feeling comes from several older or parallel surfaces still existing beside that center:

- The product has a canonical visible IA (`Home`, `Assistant`, `Tools`, `Patients`, `Operations`, `Settings`), but many routes remain reachable only through cards, aliases, permissions, or wildcard fallbacks.
- Tool inventory is much stronger than the rest of the app. Clinical tools have canonical metadata, launch resolvers, aliases, and many drift tests. Non-tool product areas do not have the same segment inventory.
- Only three tool-orchestrator executors are registered: `sofa-calculator`, `drug-interactions`, and `lab-interpreter`. Many calculators and fleet workflows are local-only or chat-assisted by design, but the UI sometimes presents them near backend-backed tools.
- Clinical intelligence pages are backend-backed and relatively well bridged, but they sit under `/tools/*` while patient-facing concepts also appear under `/patients`, creating a workspace-vs-tool split.
- Operations and fleet are the largest product fragmentation cluster. `/operations` is the canonical shell entry, but fleet pages use mock/local services and the backend has no operations/fleet module yet.
- Several backend routes are internal or admin-oriented with no user-facing bridge, while several frontend pages are capability-gated because the backend route does not exist yet.
- Naming drift is partially controlled by alias maps, but the repo still carries multiple names for the same concepts: `assistant/chat/copilot`, `tools/catalog/inventory`, `fleet/operations/dispatch`, `drug-check/drug-interactions`, `lab-interp/lab-interpreter`, and `sofa-score/sofa-calculator`.
- Test coverage is broad for tool inventory and route drift, but thinner for user-visible behavior in non-tool segments, backend contracts for platform/admin features, and mobile behavior outside the main shell/tools/fleet paths.

Recommended recovery direction: promote the normalized tool inventory pattern into a normalized segment inventory, make `/assistant` the universal launch and return surface, keep `/tools` as the action catalog, and classify every feature as one of `backend-backed`, `local-only`, `chat-assisted`, `planned-backend`, `internal`, or `hidden-admin`.

Implemented first recovery bridge:

- `src/data/segmentInventory.js` now defines canonical segment records for public/auth/core/tools/patients/operations/settings/platform/backend/build/mobile areas.
- `src/data/segmentInventory.test.js` enforces unique segment IDs, allowed statuses, frontend-only/backend-only classifications, primary navigation ownership, App route declaration coverage, and documented bridge gaps for incomplete segments.
- Remaining recovery work should now update this inventory as implementation changes, just as tool changes update `toolInventory.js`.

## 2. Segment Map

| Segment | Purpose | Frontend files | Backend files | Routes | Navigation entry | Inventory entry | API clients | Backend endpoints | Launch behavior | Layout shell | Auth | Mobile readiness | Test coverage | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Public welcome/legal/help | Entry, marketing, legal, support | `src/App.jsx`, `src/pages/legal/*`, `src/pages/GDPRNotice.jsx`, `src/pages/HIPAANotice.jsx`, `src/pages/HelpCenter.jsx` | Static SPA serving in `backend/src/main.ts` | `/`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help` | None in authenticated nav | None | None | None | Welcome CTA to `/auth`; dev bypass can jump to `/tools` | `PublicShell` | Public | Basic shell only | Route smoke tests cover public pages | partially built |
| Auth/login/signup/OAuth/dev bypass | Authentication, SSO handoff, local demo mode | `src/pages/Auth.jsx`, `src/pages/AuthCallback.jsx`, `src/auth/devAuthBypass.js`, `src/routing/authPathAliases.js`, `src/contexts/UserContext.jsx` | `backend/src/modules/auth/*`, `backend/src/modules/two-factor/*` | `/auth`, `/auth-callback`, `/auth/callback`, aliases `/login`, `/signin`, `/signup`, etc. | Public welcome CTA | None | `src/services/apiClient.js` | `/api/auth/*`, `/api/two-factor/*`, `/api/users/profile` | Auth success to `/home`; dev demo to `/tools`; aliases redirect to `/auth` | `AuthShell` | Public-only, then protected app | Auth page is responsive, but auth is outside app shell | `Auth.devBypass.test.jsx`, `App.devBypass.test.jsx`, auth backend specs | complete |
| Home/dashboard | AI-centered home and dashboard cards | `src/pages/Dashboard.jsx`, `src/pages/Dashboard.*.test.jsx` | `backend/src/modules/chat/*`, `backend/src/modules/medical-control-plane/*`, `backend/src/modules/rag/*` | `/home`, legacy `/dashboard` | `Home` primary nav | Not a tool inventory record | `clinicalChatService.js`, `clinicalToolsApi.js`, `clinicalOrchestratorApi.js` | `/api/chat/message`, `/api/tools/:id/validate`, `/api/tools/:id/execute` | Cards route to Assistant or tool pages; legacy query params resolved through launch resolver | `AppShellPage`, conversation body modifier | Required | Stronger than most pages; dashboard mobile tests exist | `Dashboard.chatLayout.test.jsx`, `Dashboard.mobile.test.jsx` | partially built |
| AI assistant/chat | Core AI conversation, NLU, tool execution, citations, emergency escalation | `src/pages/Dashboard.jsx`, legacy `src/components/ChatInterface.jsx`, `src/services/clinicalChatService.js` | `backend/src/modules/chat/*`, `backend/src/modules/medical-control-plane/intent-classifier/*`, `backend/src/modules/rag/*`, `backend/src/modules/ai/*` | `/assistant`, legacy `/chat`, `/ai`, `/copilot` | `Assistant` primary nav | Chat-assisted tool records in `toolInventory.js` | `clinicalChatService.js`, `clinicalOrchestratorApi.js` | `/api/chat/message`, `/api/chat/intent-classify`, `/api/chat/suggest-action`, `/api/chat/analyze-vitals` | New conversation and tool seeds land on `/assistant`; selected tools can run executor previews | `AppShellPage` conversation mode | Required, `USE_AI_CHAT` for backend | Strong shell behavior; older `ChatInterface.jsx` is a parallel component | `ChatInterface.nlu.test.jsx`, chat service tests, route smoke | fragmented |
| Tools overview | User-facing catalog and launcher | `src/pages/tools/ToolsOverview.jsx`, `src/navigation/registryToolLaunch.js`, `src/data/toolInventory.js` | Tool list endpoints from orchestrator | `/tools`, aliases `/all-tools`, `/clinical-tools` | `Tools` primary nav and sidebar quick actions | `getUserFacingToolRegistryProjection()` | Mostly launch resolver; optional backend metadata through `clinicalToolsApi.js` | `/api/tools`, `/api/tools/available`, `/api/tools/catalog/executors` | Search/filter/pin/favorite; launches direct routes or chat seeds | `AppShellPage` | Required | Responsive tests exist | `ToolsOverview.*.test.*`, inventory tests | complete |
| Developer tool catalog/source audit | Developer/admin catalog, source discovery, executor audit | `src/pages/tools/ClinicalToolCatalog.jsx`, `src/data/sourceCodeToolDiscovery.js`, catalog utilities | Orchestrator catalog endpoint | `/tools/catalog`, alias `/catalog` | Hidden behind Tools button and permission; not primary | Discovery and contract inventories | `clinicalToolsApi.js` | `/api/tools/catalog/executors`, `/api/tools` | Developer Catalog button only for `CONFIGURE_SYSTEM`; direct route permission-gated | `AppShellPage` | Required plus `CONFIGURE_SYSTEM` | Has mobile CSS and tests, but table-heavy | launch/responsive/catalog tests | hidden |
| Calculators hub and local calculator forms | Deterministic frontend calculators and score forms | `src/pages/tools/Calculators.jsx`, calculator modules under `src/pages/tools/*Calculators.jsx`, `src/data/calculatorHubManifest.js` | Only SOFA has registered backend executor; most calculators no backend | `/tools/calculators`, `/tools/calculators/:slug`, legacy `/tools/calculator/*` redirects | Tools/sidebar/catalog | Many records in `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `toolInventory.js` | Local calculation, `clinicalOrchestratorApi.js` for SOFA executor paths | `/api/tools/sofa-calculator/execute` for SOFA only | Dedicated calculator routes or hub with `?calc=`; many Tier B ids seed Assistant | `AppShellPage` | Required | Responsive and form smoke tests exist | broad calculator wiring, route, responsive, form smoke tests | partially built |
| Backend executor tools | Registered tool-orchestrator actions for SOFA, drug interactions, labs | `DrugChecker.jsx`, `LabInterpreter.jsx`, `Calculators.jsx`, `clinicalOrchestratorApi.js`, `clinicalToolsApi.js` | `tool-orchestrator.controller.ts`, `tool-orchestrator.service.ts`, `drug-checker.service.ts`, executor registry | `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/calculators/sofa` | Tools/sidebar/catalog and Assistant quick actions | Registry ids `drug-check`, `lab-interp`, `sofa-score` map to executor ids | Mixed: pages may call `apiFetch`; Assistant uses `clinicalOrchestratorApi.js` | `/api/tools/drug-interactions/execute`, `/api/tools/lab-interpreter/execute`, `/api/tools/sofa-calculator/execute` | Direct page launch plus Assistant execute preview | `AppShellPage` | Required and backend JWT | Good for tool routes; direct pages need consistent client layer audit | executor mapping, backend specs, contract tests | complete |
| Chat-assisted clinical tools | NLU/chat workflows with no POST executor | `clinicalIntentToolCatalog.js`, `clinicalCatalogWiring.js`, `Dashboard.jsx`, `Calculators.jsx` | NLU patterns and unsupported docs | Mostly `/assistant` or `/tools/calculators` | Tools/sidebar/catalog | `TOOL_LAUNCH_TYPES.CHAT_ASSISTED` | `clinicalChatService.js` | `/api/chat/message`; no `/api/tools/:id/execute` | Resolver seeds guarded chat prompt | `AppShellPage` | Required | Depends on Assistant mobile readiness | launch, alias, NLU path tests | frontend-only |
| Clinical intelligence pages | Tier C AI workflows with explicit backend endpoints | `AmbientScribe.jsx`, `GuidelineRag.jsx`, `DifferentialAi.jsx`, `TimelineAi.jsx`, `PatientSummaryAi.jsx`, `OrderSetAi.jsx`, `AiExplainability.jsx`, `ClinicalAudit.jsx`, `clinicalIntelligenceApi.js` | `backend/src/modules/clinical-intelligence/*`, `backend/src/modules/rag/*`, audit service | `/tools/ambient-scribe`, `/tools/guideline-rag`, `/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/ai-explainability`, `/tools/clinical-audit` | Tools/sidebar; patient subroutes are represented as `/tools/*` but highlighted under Patients by nav matching | Backend-backed records in `toolInventory.js` | `clinicalIntelligenceApi.js` | `/api/clinical-intelligence/*` | Direct tool page forms return structured results; some patient cards launch them | `AppShellPage`, `ToolPageLayout` | Required plus PHI/chat/audit permissions by route | Tool page responsive tests exist, but patient embedding not built | per-page tests plus contract/exposure tests | partially built |
| Patients workspace | Patient-context landing area for summary, timeline, scribe, orders | `src/pages/Patients.jsx`, `OperatingWorkspace.css` | No patient workspace backend module; uses clinical-intelligence pages | `/patients`; patient AI routes still under `/tools/*` | `Patients` primary nav | Not a segment inventory record | Launch resolver only | Clinical-intelligence endpoints after tool launch | Cards launch patient-related tools, not patient-specific records | `AppShellPage` | Required | Shared operating workspace likely responsive, but no dedicated mobile test found | route smoke only likely | frontend-only |
| Operations workspace | Landing area for alerts, fleet, analytics, audit | `src/pages/Operations.jsx`, `OperatingWorkspace.css` | Analytics/audit endpoints exist; no operations command module | `/operations`; legacy `/fleet` redirects | `Operations` primary nav | Not a segment inventory record | Launch resolver and page-specific clients | `/api/analytics/metrics`, `/api/audit/*`; no `/api/operations/*` | Cards route to operation subareas | `AppShellPage` | Required | Shared workspace likely responsive, but no dedicated mobile test found | `OperatingWorkspace.launch.test.jsx` | partially built |
| Fleet command, route optimizer, predictive maintenance | Fleet ops dashboards and deterministic local decision support | `src/pages/fleet/*`, `fleetTelemetryService.js`, `routeOptimizationService.js`, `predictiveMaintenanceScoring.js` | No fleet/operations backend module | `/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance`; `/fleet/*` fallback | Under Operations; also tool inventory category Fleet | `fleet-command`, `route-optimizer`, `predictive-maintenance` | Local services only | None | Operations cards or registry launch open pages | `AppShellPage`, `FleetPageChrome` | Required | Stronger than other ops pages; fleet responsive tests exist | fleet route/widget/responsive tests | stale/mock-only |
| Dispatch AI | Fleet chat/intelligence concept | `toolRegistry.js`, `clinicalIntentToolCatalog.js`, contract tests | NLU unsupported docs only | Launches Assistant or calculators hub, not a fleet page | Tools/sidebar/category Fleet, Operations conceptually | `dispatch-ai` | `clinicalChatService.js` | `/api/chat/message`; no executor | Chat seed only | Assistant shell | Required | Inherits Assistant readiness | dispatch wiring tests | frontend-only |
| Clinical alerts | Alert review and acknowledge UI | `src/pages/ClinicalAlertsPage.jsx`, `backendApiCapabilities.js` | No `/api/clinical/alerts/*` routes | `/clinical/alerts` | Operations card, active under Operations | Capability inventory only | Planned `clinicalAlertNotifications.js` references | Capability false for ack/dismiss/stream | Shows sample alerts and local acknowledge/export buttons | `AppShellPage`, custom page CSS | Required | No dedicated mobile test found | likely route smoke only | stale/mock-only |
| Settings/profile/security | User preferences, profile, MFA, biometric setup, notifications | `Settings.jsx`, `Profile.jsx`, `ProfileSettings.jsx`, `NotificationPreferences.jsx`, `TwoFactorSetup.jsx`, `BiometricSetup.jsx` | Users, subscriptions, compliance, notifications, two-factor, biometric controllers | `/settings`, `/profile`, `/profile-settings`, `/notifications`, `/two-factor-setup`, `/biometric-setup`, `/onboarding` | `Settings` primary nav | None | `profileApi.js`, `subscriptionApi.js`, `complianceApi.js`, `NotificationService.js`, `apiClient.js` | `/api/users/profile`, `/api/subscriptions/*`, `/api/compliance/*`, `/api/notifications/*`, `/api/two-factor/*`, `/api/auth/biometric/*` | Settings page links/drawers and direct routes | `AppShellPage` | Required, some backend permissions | Mixed; fewer mobile tests visible outside shell | settings/profile tests, service tests | partially built |
| Team/admin users | Team management UI | `src/pages/team/TeamManagement.jsx`, `backendApiCapabilities.js` | No team controller in backend route inventory | `/team` | Hidden under Settings active paths only; permission route | None | `apiClient.js` | Planned `/api/team/*`, capability false | Route exists but client refuses network and shows unsupported message | `AppShellPage`, custom CSS | Required plus `MANAGE_USERS` | No mobile route evidence found | capability test only | frontend-only |
| Audit/compliance/consent/privacy | HIPAA/GDPR logs, consent, data export/delete | `AuditLogs.jsx`, `Settings.jsx`, `ConsentFlow.jsx`, `ConsentHistory.jsx`, `complianceApi.js`, `auditApi.js` | `audit.controller.ts`, `compliance.controller.ts` | `/audit-logs`, `/consent`, `/consent-history`, privacy drawers in `/settings` | Operations card for audit; Settings active paths for consent | Platform API inventory | `apiClient.js`, `complianceApi.js`, `auditApi.js` | `/api/audit/*`, `/api/compliance/*` | Mixed direct pages and drawers | `AppShellPage`; audit uses custom container | Required plus audit permissions | Audit/consent custom layouts need mobile audit | audit/compliance service tests, some settings tests | partially built |
| Analytics/cost tracking | Usage metrics, cost dashboard | `AnalyticsDashboard.jsx`, `CostAnalyticsDashboard.jsx`, `CostTrackingContext.jsx`, analytics services | `analytics.controller.ts`, metrics services | `/analytics`, `/costs` | Operations card and nav active paths | Platform/inventory docs only | `analyticsService.ts`, `apiClient.js`, offline service | `/api/analytics/metrics`, `/api/analytics/events`, `/api/crashes`, `/api/metrics` | Operations card opens analytics; cost route hidden except path | `AppShellPage`, custom containers | Required plus analytics permission | Unknown mobile coverage for analytics/cost pages | analytics service tests, route smoke likely | partially built |
| Notifications/push/offline/service workers | Toasts, preferences, device tokens, push/offline shell | `NotificationService.js`, `services/notifications/NotificationService.js`, `OfflineProvider`, `public/sw.js`, `public/firebase-messaging-sw.js`, notification pages | `notification.controller.ts`, Firebase config | `/notifications`; service worker public paths | Settings active path | Capability inventory only | Notification service(s), Firebase client | `/api/notifications/*`; stream/send-channel are capability false | Preferences page and app toasts | App provider plus `AppShellPage` | Required | Push/mobile readiness unclear | Notification service tests likely partial | fragmented |
| Backend clinical content APIs | Drug/protocol CRUD and clinical reference data | `clinicalContentApi.js`, tool pages | `clinical/drug.controller.ts`, `clinical/protocol.controller.ts` | No standalone admin route; tool pages consume some APIs | Hidden under tools | Not normalized as product segments | `clinicalContentApi.js` | `/api/drugs/*`, `/api/protocols/*` | Tool pages or catalog reference | None directly | Backend JWT if controller guarded elsewhere | Not UI-specific | service/controller tests | backend-only |
| Backend AI/RAG/metrics/internal | AI query, structured AI, RAG, metrics, observability | `configService.js`, chat and clinical intelligence clients | `ai.controller.ts`, `rag`, `metrics.controller.ts`, Datadog/Sentry config | `/api/ai/*`, `/api/metrics` | No frontend route except usage/config | Platform APIs only | `configService.js`, chat/intelligence services | `/api/ai/query`, `/api/ai/structured`, `/api/ai/usage`, `/api/ai/remaining-queries`, `/api/metrics` | Internal supporting capabilities | N/A | Backend auth varies by controller | N/A | backend service tests, config tests | backend-only |
| Build/config/assets/docs/testing | Development, deployment, asset validation, generated audit docs | `package.json`, `vite.config.js`, `vercel.json`, `scripts/*`, `public/*`, `docs/*` | `backend/src/main.ts`, config modules | Dev/build routes and service workers | None | Docs/inventory scripts | N/A | Vite proxy to backend, production static serving | Build scripts and docs generation | N/A | N/A | Asset validation and CI scripts | broad script/test coverage | complete |
| Mobile shell/responsive UX | Compact navigation, bottom nav, responsive regression | `AppShell.jsx`, `Sidebar.jsx`, `layout/breakpoints`, `index.css`, responsive tests | None | Applies to all protected routes | Bottom nav mirrors primary nav | Not segment-inventory tracked | None | None | Compact shell and mobile nav drawer | `AppShell` | Required | Strong for shell/tools/fleet; weaker for admin/mock pages | responsive regression scripts/tests | partially built |

## 3. Complete Segments

- `AppShell` and primary navigation are structurally complete for the canonical six-area IA. `PRIMARY_NAV_ITEMS` defines the visible nav and `App.jsx` keeps legacy route aliases deep-linkable.
- Auth is complete enough for the current product surface: `/auth` is canonical, common auth aliases redirect, OAuth callbacks are bridged, two-factor is represented, and dev bypass is explicitly gated.
- The normalized tool inventory and launch resolver are the most complete cross-cutting segment. `toolInventory.js`, `clinicalCatalogWiring.js`, `registryToolLaunch.js`, `clinicalToolRoutes.js`, and related tests provide a real source of truth for tool launch behavior.
- The registered backend executor triad is complete as backend-backed clinical tools: `drug-check`, `lab-interp`, and `sofa-score` map to `drug-interactions`, `lab-interpreter`, and `sofa-calculator`.
- Build/config asset validation is complete enough to be considered a platform segment: Vite proxy, static asset validation, Vercel SPA rewrites, and production backend static serving are represented.

## 4. Partially Built Segments

- Assistant/dashboard is central but still has a legacy parallel `ChatInterface.jsx`. The new `Dashboard.jsx` owns `/assistant`, but older component-level chat UI remains as another implementation path.
- Calculators are well-covered for local UI, but only SOFA is a true backend executor. Many calculator-like ids are chat-assisted, which is valid only if the UI consistently labels them as local/chat-assisted.
- Clinical intelligence workflows have backend endpoints and tests, but patient-related workflows are still tool pages under `/tools/*`, not embedded in a patient workspace with patient route context.
- Operations is a routing bridge, not a complete operations system. It points to fleet, alerts, analytics, and audit, but no canonical operations inventory or `/api/operations/*` backend exists.
- Settings/profile/security has several real backend bridges, but it mixes local preferences, billing, compliance, notifications, biometric setup, and onboarding without a segment inventory.
- Notifications are split between app toasts, REST preferences/devices, Firebase/service workers, stream/send-channel planned capabilities, and two service files.
- Analytics/cost tracking has backend metrics and local/offline data, but the user-facing relationship between `/analytics`, `/costs`, events, cost context, and operations is not fully canonical.

## 5. Frontend-Only Segments

| Segment | Classification | Evidence | Proposed bridge |
|---|---|---|---|
| Most local calculators | local-only | Built in `Calculators.jsx` and calculator modules; no registered executor except SOFA | Keep local-only label in `/tools`, return result cards to Assistant, and avoid execute API affordances unless an executor exists. |
| Chat-assisted calculators/tools | local-only | `UNSUPPORTED_ORCHESTRATOR_TOOL_DOCS` lists many NLU ids with no executor | Show `Guided chat` status, not `backend-backed`; route all execution-like flows through `/assistant`. Promote individual tools to `planned-backend` only when a real executor is approved. |
| Patients workspace | planned-backend | `/patients` contains action cards only; no patient data route or patient backend module | Add patient workspace segment inventory and future `/patients/:patientId/*` routes that embed clinical-intelligence outputs. |
| Fleet command | local-only | `fleetTelemetryService.js` source is `mock-telemetry` | Keep labeled as mock/local until `/api/operations/fleet/snapshot` exists. |
| Route optimizer | local-only | Deterministic sort engine in `routeOptimizationService.js` | Keep as Tier A local optimizer; add optional backend optimizer only through a capability flag. |
| Predictive maintenance | local-only | Rule scorer in `predictiveMaintenanceScoring.js` | Keep local rules; future ML/backend scoring should be a separate capability. |
| Dispatch AI | planned-backend | Registry and NLU only; no executor | Decide whether it is Assistant-only or future operations backend; if future, add `/api/operations/dispatch/analyze`. |
| Clinical alerts page | broken | UI uses sample alerts; `clinicalAlerts` capability is false | Either hide route or implement `/api/clinical/alerts/*`; wire acknowledge/dismiss/export to real endpoints. |
| Team management | broken | `/team` route exists; `/api/team/*` capabilities false and no backend routes | Keep hidden/admin-gated or implement a `TeamModule`. |
| Tool result sharing by email | broken | Frontend inventory has `POST /api/tools/share-results`; no Nest route and capability false | Implement backend share endpoint or remove email-share UI entirely. |
| Export/report generation | planned-backend | Export/report capabilities false | Keep on-device export as canonical until backend export/report routes ship. |

## 6. Backend-Only Segments

| Backend segment | Classification | Current exposure | Proposed disposition |
|---|---|---|---|
| Drug/protocol CRUD | should-be-exposed | `DrugController` and `ProtocolController` routes exist; user routes are tool pages, not admin CRUD | Expose read-only through clinical content clients; reserve create/update/delete for admin/settings if needed. |
| AI generic endpoints | internal | `/api/ai/query`, `/api/ai/structured`, `/api/ai/usage`, `/api/ai/remaining-queries` | Keep internal/supporting; Assistant should continue through `/api/chat/message`. |
| Metrics endpoint | internal | `/api/metrics` only | Keep internal/observability, not product UX. |
| Auth provider endpoints | internal | OAuth/OIDC/SAML routes exist; UI pings or redirects | Keep behind Auth surface; no app-shell nav. |
| Chat `message-3d` | planned | Backend route exists; no current canonical route found | Keep planned unless a 3D patient view is revived. |
| Chat `analyze-vitals` | should-be-exposed | Backend route exists; source discovery marks `vitals-monitor` API-only | Either expose as a vitals card in Assistant/Patients or absorb into clinical alerts. |
| Audit `my-logs` and `phi-access` | should-be-exposed | Backend routes exist; AuditLogs focuses on logs/statistics/integrity | Add tabs or Settings privacy surfaces if required. |
| Subscription webhook/config | internal | Backend routes exist; UI uses plans/current/checkout/portal | Keep webhook internal; config can remain service-only. |
| Notification device endpoints | should-be-exposed | REST routes exist; notification preferences likely cover some but not all device management | Add a clear notifications settings bridge for registered devices. |

## 7. Hidden/Orphaned Segments

- `/tools/catalog` is deliberately hidden behind `CONFIGURE_SYSTEM`, but it is also a major source-audit view. It should be documented as an admin/developer segment, not a clinician tool.
- `/shared/tools/:shareId` is public, but the backend share-results route is absent. That makes shared tool sessions a fragile orphan until share creation is wired.
- `/costs` is route-registered and permission-gated but not visible in primary nav except as an Operations match path. It needs an Operations card or Settings billing bridge if user-facing.
- `/team` is route-registered and permission-gated but backend capability is false. It should remain hidden or become a real admin backend segment.
- `/clinical/alerts` is reachable from Operations but uses sample data because capability is false.
- Phantom/source-only references include `abc-assessment`, `trauma-score`, `cancer-calculator`, `tumor-staging`, `chemo-calculator`, and API-only `vitals-monitor`.
- Several public/support routes (`/gdpr`, `/hipaa`, `/help`) are not part of app navigation after login. That is acceptable if they remain footer/help links, but they are not bridged from Settings today.
- Backend routes `/api/chat/message-3d`, `/api/audit/my-logs`, `/api/audit/phi-access`, `/api/ai/query`, `/api/ai/structured`, and `/api/metrics` have no obvious direct product UX.

## 8. Naming Fragmentation

| Fragmented names | Canonical name | Where it appears | Recommendation |
|---|---|---|---|
| `assistant`, `chat`, `ai`, `copilot` | `assistant` | `App.jsx`, `primaryNavigation.js` | Keep aliases, show only Assistant in UI/docs/tests. |
| `home`, `dashboard` | `home` | `/home`, legacy `/dashboard` | Keep `/dashboard` as redirect only. |
| `tools`, `clinical-tools`, `all-tools`, `catalog`, `inventory` | `tools` for user UX; `tools/catalog` for developer audit | Routes, docs, catalog tests | Rename docs to distinguish "Tools" from "Developer Catalog". |
| `calculator`, `calculators`, `score`, `tool` | `calculator` for single forms; `calculators` for hub | `clinicalToolRoutes.js`, registry ids, tests | Keep route `/tools/calculators/:slug`; keep singular only as legacy redirect. |
| `drug-check`, `drug-checker`, `drug-interactions`, `drug-interaction-checker` | `drug-check` UI, `drug-interactions` executor | registry, NLU, backend registry, source discovery | Continue alias map but make docs state UI id vs executor id. |
| `lab-interp`, `lab-interpreter` | `lab-interp` UI, `lab-interpreter` executor | registry/backend/routes | Same pattern as drug checker; avoid adding new names. |
| `sofa-score`, `sofa-calculator`, `sofa` | `sofa-score` UI, `sofa-calculator` executor, `sofa` calculator slug | registry/routes/backend | Keep all three roles explicit in segment inventory. |
| `fleet`, `operations`, `dispatch` | `operations` for product area, `fleet-*` for fleet tools | nav/routes/registry/docs | Do not add a top-level Fleet nav; expose fleet as Operations subsegments. |
| `patient-summary-ai`, `timeline-ai`, `ambient-scribe`, patient workspace | `patients` workspace plus tool ids | `/patients`, `/tools/*` | Keep tool ids, but add patient workspace routes when patient context exists. |
| `diagnosis`, `differential-ai`, `differential-diagnosis`, `antibiotic-guide` | `differential-ai` for backend-backed workflow; `diagnosis` for legacy page | registry/NLU/tool pages | Decide whether `DiagnosisAssistant.jsx` remains a reference page or is folded into `differential-ai`. |
| `audit logs`, `clinical-audit`, `ai-explainability` | `clinical-audit` for clinical AI traces; `audit-logs` for platform audit | routes/tool pages/backend | Keep both but label clearly as clinical AI trace vs compliance audit. |
| `settings`, `profile-settings`, `profile`, `onboarding`, `notifications` | `settings` area | primary nav and routes | Keep subroutes under Settings active path; consider route nesting later. |

## 9. Layout Fragmentation

- Protected routes mostly use `AppShellPage`, but page internals vary. `Dashboard.jsx`, tools, fleet pages, `OperatingWorkspace.css`, `AuditLogs.css`, `ClinicalAlertsPage.css`, `AnalyticsDashboard.css`, and `TeamManagement.css` each define local containers.
- Clinical tool pages commonly use `ToolPageLayout`, but older tool pages and operational/admin pages do not all use shared cards/buttons/forms.
- `ClinicalToolCatalog.jsx` is a table-heavy admin view with mobile CSS and tests, but it does not match the AI-chatbot-centered wireframe because it is an audit/developer surface.
- `AuditLogs.jsx`, `ClinicalAlertsPage.jsx`, `AnalyticsDashboard.jsx`, and `TeamManagement.jsx` use custom layouts and direct status icons/buttons; they should be normalized into shared `PageHeader`, `StateBanner`, `CardGrid`, `DataList`, and `ActionFooter` patterns.
- `Patients.jsx` and `Operations.jsx` use a shared operating workspace layout, which is good, but they are shallow launch pages and do not yet embed results or return paths.
- Mobile readiness is strongest in `AppShell`, `Sidebar`, `Dashboard`, `ToolsOverview`, `ClinicalToolCatalog`, `Calculators`, tool pages, and fleet pages. It is weakest or unknown for audit, analytics, team, alerts, consent history, and some settings subroutes.

## 10. Data-Flow Fragmentation

- `apiClient.js` is the canonical low-level client, but some pages still construct headers from `localStorage` and call `apiFetch` directly instead of using feature clients.
- `clinicalOrchestratorApi.js` provides explicit unsupported handling for non-executor tools, but direct pages such as drug/lab/calculators should be audited to ensure they do not bypass classification behavior.
- `clinicalIntelligenceApi.js` is a good feature client, but its pages are still separate `/tools/*` forms rather than reusable panels inside Assistant or Patients.
- `fleetTelemetryService.js` uses hard-coded mock telemetry. `routeOptimizationService.js` and `predictiveMaintenanceScoring.js` are deterministic local engines. These are valid local-only segments, but they should not be visually mixed with live backend operations without clear badges.
- `ClinicalAlertsPage.jsx` uses sample data and local state while the planned alert API is capability false.
- `sourceCodeToolDiscovery.js`, `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `clinicalToolIdContract.js`, and `toolInventory.js` intentionally overlap. The normalized inventory reduces drift, but the same pattern does not exist for non-tool segments.
- `frontendApiCallsInventory.js` documents calls that are gated off by `backendApiCapabilities.js`. This is useful, but planned routes still leak into pages such as Team, Clinical Alerts, export/report scheduling, notification streams, and tool sharing.
- Offline, sync, notification, and service worker behavior are spread across providers, service files, public workers, and capability flags. They need a single platform segment map.

## 11. Test Fragmentation

- Tool inventory tests are broad and valuable: alias sync, launch paths, route canonicalization, executor mapping, contract matrix, visibility matrix, render/execute matrix, and clinical safety tests.
- User-visible behavior is less evenly tested. The strongest visible tests appear around Dashboard, ToolsOverview, ClinicalToolCatalog, Calculators, tool pages, and fleet widgets.
- Backend contract coverage is strongest for tool orchestrator, clinical intelligence, auth/users/subscriptions, and exposure inventory. It is missing or capability-disabled for team, clinical alerts, exports/reports, notification stream/send-channel, chat persistence, and bulk sync.
- Mobile tests exist for shell/sidebar/tools/calculators/fleet, but likely gaps remain for Auth edge flows, AuditLogs, Analytics, CostAnalytics, TeamManagement, ClinicalAlertsPage, ConsentHistory, NotificationPreferences, and Settings drawers.
- Several tests assert inventory consistency rather than actual user-visible flows. That is appropriate for drift control but should be paired with route/page behavior tests for major product segments.
- Backend-only routes need explicit classification tests: internal, planned, or should-be-exposed. `backendFrontendExposure.test.js` is a good base, but the report should expand it beyond tool/API calls into segments.
- Obsolete or parallel UI risk: `ChatInterface.jsx` has tests while `Dashboard.jsx` owns the canonical Assistant route. Keep tests only if the component remains used.

## 12. Missing Bridges

| Segment | How user reaches it | AI Assistant bridge | `/tools` bridge | Backend bridge | Result return | Safe failure | Tests needed |
|---|---|---|---|---|---|---|---|
| Auth | Welcome CTA or auth aliases | None after auth except route redirect | None | Auth/users/two-factor endpoints | Token/user context | Form errors, dev bypass fallback | OAuth callback, SSO unavailable, mobile auth |
| Home/Assistant | Primary nav, new conversation, tool seeds | Native surface | Tools can seed Assistant | Chat, RAG, tool executor APIs | Conversation messages/cards | Network fallback message | End-to-end chat with tool result |
| Tools overview | Primary nav/sidebar | `Try in Assistant` launch | Native surface | Tool list optional | Navigation or seeded prompt | Unknown tool fallback | User-visible launch tests for each launch type |
| Developer catalog | Permissioned Tools link/direct route | Launch buttons can seed Assistant | Hidden under Tools | Tool executor catalog | Tables/status badges | Backend unavailable status | Permission/mobile/table behavior |
| Local calculators | Tools/sidebar/direct routes | Add result interpretation handoff to Assistant | Native `/tools/calculators` | Mostly none | Local result panel; should support "send to Assistant" | Validation states | Result handoff and empty/error tests |
| Executor tools | Tools/sidebar/Assistant quick actions | Assistant execute preview | Tool pages in `/tools` | Tool orchestrator | Tool cards/visualizations | Unsupported/network errors | Contract and direct page behavior |
| Clinical intelligence | Tools/sidebar/Patients cards | Needs explicit "continue in Assistant" after result | Tool pages in `/tools` | Clinical intelligence controller | Structured result pages | `NETWORK_ERROR` and permission errors | Backend contract plus result handoff tests |
| Patients | Primary nav | Ask Assistant CTA only | Patient cards launch `/tools/*` | No patient backend | None in patient workspace | N/A | Patient workspace route and mobile tests |
| Operations | Primary nav | Ask Assistant CTA only | Fleet tools in inventory | Audit/analytics only; no operations backend | None in operations workspace | N/A | Operations card routing and mobile tests |
| Fleet | Operations cards and tool registry | Dispatch AI/chat not embedded | Fleet category in Tools | None | Local panels | Loading/error/empty states exist | Backend capability transition tests |
| Clinical alerts | Operations card | No direct Assistant handoff | None | Planned, capability false | Local list only | Unsupported banner | Mock-only and future API contract tests |
| Settings/security | Settings nav/direct paths | None | None | Users/subscriptions/compliance/notifications/MFA/biometric | Forms/drawers | Error banners/status messages | Drawer/mobile/backend failures |
| Team/admin | `/team` direct/permission route | None | None | Missing, capability false | Unsupported state | Capability gate | Hidden route/capability tests |
| Audit/compliance | Operations/Settings/direct | Clinical audit is separate tool | Clinical audit under `/tools` | Audit/compliance endpoints | Tables/downloads | Error states | Distinguish audit vs clinical-audit tests |
| Analytics/cost | Operations/direct routes | None | None | Analytics/events/metrics | Charts/cards | Error message | Mobile/empty/error tests |
| Notifications/offline | Settings/toasts/provider | Chat can use offline notes indirectly | None | Notifications REST; stream planned | Toasts/preferences | Capability gates | Device management and service worker tests |
| Build/config/docs | Scripts/CI | None | None | Vite proxy/backend static | Build artifacts | Asset validation failure | CI validation and docs freshness tests |

## 13. Exact Files To Inspect Further

Frontend routing and shells:
- `src/App.jsx`
- `src/layout/AppShell.jsx`
- `src/components/Sidebar.jsx`
- `src/navigation/primaryNavigation.js`
- `src/navigation/registryToolLaunch.js`
- `src/routes/clinicalToolRoutes.js`
- `src/routing/authPathAliases.js`
- `src/index.css`

Canonical tool and segment-like inventories:
- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/data/backendFrontendToolContract.js`
- `src/data/backendFrontendExposure.js`
- `src/data/frontendApiCallsInventory.js`
- `src/data/backendHttpRouteInventory.js`

Assistant and clinical data flow:
- `src/pages/Dashboard.jsx`
- `src/components/ChatInterface.jsx`
- `src/services/clinicalChatService.js`
- `src/services/clinicalOrchestratorApi.js`
- `src/services/clinicalToolsApi.js`
- `src/services/clinicalIntelligenceApi.js`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/medical-control-plane/intent-classifier/intent-classifier.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`

Tool and workflow pages:
- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/tools/ClinicalToolCatalog.jsx`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/DrugChecker.jsx`
- `src/pages/tools/LabInterpreter.jsx`
- `src/pages/tools/Protocols.jsx`
- `src/pages/tools/DiagnosisAssistant.jsx`
- `src/pages/tools/ProcedureGuide.jsx`
- `src/pages/tools/AmbientScribe.jsx`
- `src/pages/tools/GuidelineRag.jsx`
- `src/pages/tools/DifferentialAi.jsx`
- `src/pages/tools/TimelineAi.jsx`
- `src/pages/tools/PatientSummaryAi.jsx`
- `src/pages/tools/OrderSetAi.jsx`
- `src/pages/tools/AiExplainability.jsx`
- `src/pages/tools/ClinicalAudit.jsx`
- `src/pages/tools/ToolsAreaFallback.jsx`
- `src/pages/tools/SharedToolSession.jsx`

Patients, operations, admin, and mock-only candidates:
- `src/pages/Patients.jsx`
- `src/pages/Operations.jsx`
- `src/pages/ClinicalAlertsPage.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/RouteOptimizer.jsx`
- `src/pages/fleet/PredictiveMaintenance.jsx`
- `src/services/fleetTelemetryService.js`
- `src/services/routeOptimizationService.js`
- `src/services/predictiveMaintenanceScoring.js`
- `src/pages/AuditLogs.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/CostAnalyticsDashboard.jsx`
- `src/pages/team/TeamManagement.jsx`
- `src/pages/Settings.jsx`
- `src/pages/ProfileSettings.jsx`
- `src/pages/NotificationPreferences.jsx`

Backend modules and platform APIs:
- `backend/src/app.module.ts`
- `backend/src/main.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`
- `backend/src/modules/clinical/drug.controller.ts`
- `backend/src/modules/clinical/protocol.controller.ts`
- `backend/src/modules/audit/audit.controller.ts`
- `backend/src/modules/compliance/compliance.controller.ts`
- `backend/src/modules/analytics/analytics.controller.ts`
- `backend/src/modules/notifications/notification.controller.ts`
- `backend/src/modules/ai/ai.controller.ts`
- `backend/src/modules/metrics/metrics.controller.ts`

Config/build/test docs:
- `src/config/backendApiCapabilities.js`
- `src/config/appConfig.js`
- `vite.config.js`
- `vercel.json`
- `package.json`
- `scripts/validate-assets.mjs`
- `docs/backend-frontend-tool-contract.md`
- `docs/backend-exposure-report.md`
- `docs/caredroid-next-generation-roadmap.md`
- `docs/ai-chatbot-ux-flattening-plan.md`

## 14. Prioritized Recovery Plan

1. Keep the canonical `segmentInventory` modeled after `toolInventory` current.
   - `src/data/segmentInventory.js` now tracks route, nav entry, shell, API client, backend route, auth/permission, mobile test, status, and canonical bridges for major product segments.
   - Expand it as new subsegments ship, especially patient detail routes, operations backend modules, notification/offline ownership, and settings/admin surfaces.

2. Normalize launch and return behavior around Assistant.
   - Every segment should define `launchFromAssistant`, `launchFromTools`, `returnToAssistant`, `resultShape`, and `safeFailure`.
   - Add "Continue in Assistant" or "Send result to Assistant" affordances for local calculators, clinical intelligence pages, fleet outputs, alerts, and analytics summaries.

3. Make `/tools` the only user-facing action catalog and keep `/tools/catalog` admin-only.
   - Add explicit labels for `backend-backed`, `local-only`, `chat-assisted`, `mock-only`, and `planned-backend`.
   - Do not show planned-backend features as live actions unless the capability is enabled.

4. Resolve operations/fleet fragmentation.
   - Keep `/operations` as canonical.
   - Classify current fleet as `local-only/mock-only`.
   - Add planned backend routes only when there is a real module: `/api/operations/fleet/snapshot`, `/api/operations/routes/optimize`, `/api/operations/maintenance/score`, `/api/operations/dispatch/analyze`.

5. Resolve patient workspace fragmentation.
   - Keep current `/tools/*` clinical intelligence pages, but add patient-context bridge records.
   - Future canonical routes should be `/patients/:patientId/summary`, `/patients/:patientId/timeline`, `/patients/:patientId/documentation`, and `/patients/:patientId/orders`.

6. Hide or complete broken planned-backend pages.
   - Team management, clinical alerts, tool result email sharing, reports, notification stream/send-channel, chat persistence, and bulk sync should either stay hidden/capability-gated or receive backend modules.

7. Standardize API clients.
   - Feature pages should use feature clients, not raw `apiFetch` plus `localStorage` headers.
   - Keep `apiClient.js` as the low-level transport only.

8. Expand tests from inventory consistency to user-visible bridges.
   - Add segment inventory tests.
   - Add route-to-nav, route-to-shell, route-to-mobile, route-to-backend, and route-to-Assistant bridge tests.
   - Add backend contract tests for every capability currently false before enabling it.

## 15. Recommended Canonical Segment Architecture

Define one canonical segment record shape:

```js
{
  id: 'operations.fleet-command',
  label: 'Fleet Command',
  area: 'operations',
  route: '/fleet/command',
  canonicalRoute: '/operations/fleet-command',
  navEntry: 'operations',
  shell: 'AppShellPage',
  launchType: 'local-only',
  inventoryKind: 'segment',
  toolId: 'fleet-command',
  assistantBridge: {
    launchPrompt: 'Review this fleet snapshot as operational decision support.',
    acceptsContext: true,
    resultCard: 'OperationalResultCard'
  },
  toolsBridge: {
    visibleInTools: true,
    category: 'Operations'
  },
  backend: {
    endpoint: null,
    plannedEndpoint: '/api/operations/fleet/snapshot',
    apiClient: 'src/services/fleetTelemetryService.js',
    capability: 'operationsFleetSnapshot'
  },
  auth: {
    required: true,
    permissions: []
  },
  mobile: {
    status: 'covered',
    tests: ['src/pages/fleet/fleet.responsive.test.js']
  },
  tests: {
    route: [],
    behavior: [],
    backendContract: []
  },
  status: 'stale/mock-only'
}
```

Canonical status policy:

- `complete`: route, nav, shell, inventory, backend/client if needed, result path, safe failure, and tests exist.
- `partially built`: user can reach it, but one or more bridges are missing.
- `frontend-only`: UI exists without backend. Must be classified as `local-only`, `planned-backend`, or `broken`.
- `backend-only`: backend exists without UI. Must be classified as `internal`, `planned`, or `should-be-exposed`.
- `hidden`: route or backend exists but is intentionally permissioned/admin/internal.
- `orphaned`: source exists with no route, no inventory, or no launch path.
- `stale/mock-only`: visible UI uses sample data or mock services.
- `duplicated`: multiple routes/components/names own the same product concept.
- `fragmented`: multiple partial bridges exist but no canonical segment contract owns them.

Canonical route policy:

- Public: `/`, `/auth`, `/auth-callback`, legal/help routes.
- Core protected: `/home`, `/assistant`, `/tools`, `/patients`, `/operations`, `/settings`.
- Tool actions: `/tools/:toolSlug` and `/tools/calculators/:calculatorSlug`.
- Patient workspace: future `/patients/:patientId/:workspaceSegment`.
- Operations workspace: future `/operations/:operationsSegment`; keep `/fleet/*` as legacy aliases or tool-specific routes only if already shipped.
- Admin/developer: `/tools/catalog`, `/audit-logs`, `/team`, `/analytics`, `/costs` should be explicitly classified as admin/operations subsegments.

Immediate canonical bridges to add:

- Assistant bridge for every non-auth protected segment.
- Tools bridge for every clinical/fleet action, with visible launch type.
- Backend bridge classification for every API-capable segment.
- Result bridge that returns outputs to conversation state or a shareable result card.
- Failure bridge using common loading/error/empty/unsupported components.
- Mobile bridge declaring compact layout expectations and responsive test ownership.
