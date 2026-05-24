# CareDroid Clinical AI — Page Inventory & AI-Chatbot Flattening Plan

## 1) Executive Summary
This audit found a broad route surface with many aliases and multiple tool-specific full pages that fragment the intended “single assistant workspace” experience. The canonical UX should center on `/assistant` with tool launches opening as assistant contexts/panels, while compliance/auth/public/legal remain standalone.

## 2) Total Page Count
- **57 page/screen components** under `src/pages/**` (non-test `.jsx`).
- Of those, **39 are user-facing route-level pages**, and **18 are internal/supporting screens/components (widgets, layouts, proto tool pages, fallback helpers)**.

## 3) Total Route Count
From `src/App.jsx` and route constants:
- **40 static route objects** directly declared in `routes` array.
- **+ AUTH aliases**: `AUTH_PATH_ALIASES` = 14.
- **+ assistant aliases**: 2 (`/ai`, `/copilot`).
- **+ tools aliases**: 2 (`/all-tools`, `/clinical-tools`).
- **+ calculator canonical routes**: dynamic from `CALCULATOR_ROUTE_DEFS` (count varies with inventory; currently wired through `clinicalToolRoutes`).
- **+ legacy calculator aliases**: 4.

## 4) Current Page Inventory Table
| Page name | Component | File path | Route path | Linked from | Layout shell | Data source | Auth | Mobile | In AI layout? | Classification | Recommended action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Welcome | `WelcomePage` | `src/App.jsx` | `/` | Public entry | `PublicShell` | none | Public-only | Yes | No | canonical | keep standalone |
| Auth | `Auth` via `AuthPage` | `src/pages/Auth.jsx` | `/auth` (+14 aliases redirect) | Welcome CTA | `AuthShell` | auth APIs | Public-only | Yes | No | canonical | keep standalone |
| Auth callback | `AuthCallback` | `src/pages/AuthCallback.jsx` | `/auth-callback`, `/auth/callback`(alias) | OAuth flow | `AuthShell` | auth token handoff | Public-only | Yes | No | canonical | keep standalone |
| Home dashboard | `Dashboard` | `src/pages/Dashboard.jsx` | `/home` | primary nav Home | `AppShell` | convo + tool context | Required | Yes | **Partially** | canonical | merge into assistant-first home |
| Dashboard alias | `Navigate` | `src/App.jsx` | `/dashboard` -> `/home` | legacy links | redirect | none | Required | Yes | N/A | alias | keep redirect |
| Assistant | `Dashboard` | `src/pages/Dashboard.jsx` | `/assistant` | primary nav Assistant | `AppShell` | convo + tool context | Required | Yes | Yes | canonical | **primary canonical** |
| Chat alias | redirect | `src/App.jsx` | `/chat` -> `/assistant` | legacy links | redirect | none | Required | Yes | N/A | alias | keep redirect |
| AI aliases | redirect | `src/App.jsx` | `/ai`,`/copilot` -> `/assistant` | legacy links | redirect | none | Required | Yes | N/A | alias | keep redirect |
| Patients | `Patients` | `src/pages/Patients.jsx` | `/patients` | primary nav | `AppShell` | patient context | Required | Yes | No | canonical | wrap as assistant patient workspace panel |
| Operations | `Operations` | `src/pages/Operations.jsx` | `/operations` | primary nav | `AppShell` | ops data | Required | Yes | No | canonical | keep route, embed assistant pane |
| Tools overview | `ToolsOverview` | `src/pages/tools/ToolsOverview.jsx` | `/tools` (+2 aliases) | nav/tools buttons | `AppShell` | tool inventory | Required | Yes | No | canonical | convert to tools drawer/catalog panel |
| Tools catalog | `ClinicalToolCatalog` | `src/pages/tools/ClinicalToolCatalog.jsx` | `/tools/catalog`,`/catalog`(alias) | tools buttons/admin | `AppShell` | catalog wiring/data | Required+perm | Yes | No | canonical | fold into unified drawer; keep deep link |
| Drug checker | `DrugChecker` | `src/pages/tools/DrugChecker.jsx` | `/tools/drug-checker` | tools cards/catalog | `AppShell` | clinical tools api | Required | Yes | No | canonical | launch inside assistant result panel |
| Lab interpreter | `LabInterpreter` | `src/pages/tools/LabInterpreter.jsx` | `/tools/lab-interpreter` | tools cards/catalog | `AppShell` | clinical tools api | Required | Yes | No | canonical | launch inside assistant result panel |
| Calculators hub | `Calculators` | `src/pages/tools/Calculators.jsx` | `/tools/calculators` | tools cards/catalog | `AppShell` | calculator utils/data | Required | Yes | No | canonical | move to tools panel + in-assistant launch |
| Calculator detail routes | `Calculators` w/ `initialCalculatorId` | `src/App.jsx` + `src/routes/clinicalToolRoutes.js` | `/tools/calculators/:slug` (many) | deep links/tool launch | `AppShell` | tool inventory | Required | Yes | No | canonical | keep deep links; render inside assistant workspace frame |
| Legacy calc aliases | redirect | `src/routes/clinicalToolRoutes.js` | 4 legacy paths | old bookmarks | redirect | none | Required | Yes | N/A | alias | keep redirect |
| Protocols | `Protocols` | `src/pages/tools/Protocols.jsx` | `/tools/protocols` | tools | `AppShell` | reference data | Required | Yes | No | canonical | convert to assistant side panel content |
| Diagnosis assistant | `DiagnosisAssistant` | `src/pages/tools/DiagnosisAssistant.jsx` | `/tools/diagnosis` | tools | `AppShell` | AI/tool backend | Required | Yes | No | duplicate concept | merge into `/assistant?tool=diagnosis-assistant` |
| Procedure guide | `ProcedureGuide` | `src/pages/tools/ProcedureGuide.jsx` | `/tools/procedures` | tools | `AppShell` | content API | Required | Yes | No | canonical | panelize inside assistant |
| Ambient scribe | `AmbientScribe` | `src/pages/tools/AmbientScribe.jsx` | `/tools/ambient-scribe` | tools/patient section | `AppShell` | AI backend | Required+perm | Yes | No | canonical | keep route but present as assistant mode |
| Calculator recommender | `CalculatorRecommender` | `src/pages/tools/CalculatorRecommender.jsx` | `/tools/calculator-recommender` | tools | `AppShell` | recommendation service | Required | Yes | No | canonical | merge into calculators panel |
| Guideline RAG | `GuidelineRag` | `src/pages/tools/GuidelineRag.jsx` | `/tools/guideline-rag` | tools | `AppShell` | AI backend | Required+perm | Yes | No | duplicate concept | merge into assistant context mode |
| Differential AI | `DifferentialAi` | `src/pages/tools/DifferentialAi.jsx` | `/tools/differential-ai` | tools | `AppShell` | AI backend | Required+perm | Yes | No | duplicate concept | merge into assistant context mode |
| Timeline AI | `TimelineAi` | `src/pages/tools/TimelineAi.jsx` | `/tools/timeline-ai` | tools/patients | `AppShell` | AI backend | Required+perm | Yes | No | duplicate concept | merge into assistant patient context |
| Patient summary AI | `PatientSummaryAi` | `src/pages/tools/PatientSummaryAi.jsx` | `/tools/patient-summary-ai` | tools/patients | `AppShell` | AI backend | Required+perm | Yes | No | duplicate concept | merge into assistant patient context |
| Order set AI | `OrderSetAi` | `src/pages/tools/OrderSetAi.jsx` | `/tools/order-set-ai` | tools/patients | `AppShell` | AI backend | Required+perm | Yes | No | duplicate concept | merge into assistant patient context |
| AI explainability | `AiExplainability` | `src/pages/tools/AiExplainability.jsx` | `/tools/ai-explainability` | tools | `AppShell` | audit/explainability APIs | Required+perm | Yes | No | canonical | keep but as assistant subpanel |
| Clinical audit tool page | `ClinicalAudit` | `src/pages/tools/ClinicalAudit.jsx` | `/tools/clinical-audit` | tools/admin | `AppShell` | audit API | Required+perm | Yes | No | developer-only/internal-only | relabel + remove from normal tool nav |
| Fleet alias | redirect | `src/App.jsx` | `/fleet` -> `/operations` | legacy | redirect | none | Required | Yes | N/A | alias | keep redirect |
| Fleet command | `FleetDashboard` | `src/pages/fleet/FleetDashboard.jsx` | `/fleet/command` | operations/fleet | `AppShell` | fleet services | Required | Yes | No | canonical | keep standalone under Operations section |
| Predictive maintenance | `PredictiveMaintenance` | `src/pages/fleet/PredictiveMaintenance.jsx` | `/fleet/predictive-maintenance` | operations/fleet | `AppShell` | predictive service | Required | Yes | No | canonical | keep standalone under Operations |
| Route optimizer | `RouteOptimizer` | `src/pages/fleet/RouteOptimizer.jsx` | `/fleet/route-optimizer` | operations/fleet | `AppShell` | route optimization service | Required | Yes | No | canonical | keep standalone under Operations |
| Tools/fleet fallback | `ToolsAreaFallback` | `src/pages/tools/ToolsAreaFallback.jsx` | `/tools/*`,`/fleet/*` | invalid deep links | `AppShell` | routing helpers | Required | Yes | No | canonical | keep; improve guidance back to assistant |
| Clinical alerts | `ClinicalAlertsPage` | `src/pages/ClinicalAlertsPage.jsx` | `/clinical/alerts` | operations | `AppShell` | alert APIs | Required | Yes | No | canonical | keep standalone ops page + assistant side context |
| Profile | `Profile` | `src/pages/Profile.jsx` | `/profile` | settings cluster | `AppShell` | profile API | Required | Yes | No | canonical | keep standalone settings |
| Profile settings | `ProfileSettings` | `src/pages/ProfileSettings.jsx` | `/profile-settings` | settings cluster | `AppShell` | profile API | Required | Yes | No | duplicate | merge into `/settings/profile` |
| Settings | `Settings` | `src/pages/Settings.jsx` | `/settings` | primary nav settings | `AppShell` | settings/profile/subscription | Required | Yes | No | canonical | keep |
| Notifications | `NotificationPreferences` | `src/pages/NotificationPreferences.jsx` | `/notifications` | settings | `AppShell` | notification service | Required | Yes | No | duplicate | merge under `/settings/notifications` |
| Two-factor setup | `TwoFactorSetup` | `src/pages/TwoFactorSetup.jsx` | `/two-factor-setup` | settings | `AppShell` | auth/security | Required | Yes | No | canonical | move under settings nested route |
| Biometric setup | `BiometricSetup` | `src/pages/BiometricSetup.jsx` | `/biometric-setup` | settings | `AppShell` | auth/device | Required | Yes | No | canonical | move under settings nested route |
| Onboarding | `Onboarding` | `src/pages/Onboarding.jsx` | `/onboarding` | post-auth flow | `AppShell` | onboarding state | Required | Yes | No | canonical | keep standalone gated flow |
| Consent flow | `ConsentFlow` | `src/pages/legal/ConsentFlow.jsx` | `/consent` | settings/legal | `AppShell` | compliance API | Required | Yes | No | canonical | keep standalone legal |
| Consent history | `ConsentHistory` | `src/pages/legal/ConsentHistory.jsx` | `/consent-history` | settings/legal | `AppShell` | compliance API | Required | Yes | No | duplicate | merge `/consent/history` |
| Privacy policy | `PrivacyPolicy` | `src/pages/legal/PrivacyPolicy.jsx` | `/privacy` | public footer | `PublicShell` | static legal | Public | Yes | No | canonical | keep standalone public |
| Terms | `TermsOfService` | `src/pages/legal/TermsOfService.jsx` | `/terms` | public footer | `PublicShell` | static legal | Public | Yes | No | canonical | keep standalone public |
| GDPR notice | `GDPRNotice` | `src/pages/GDPRNotice.jsx` | `/gdpr` | public footer | `PublicShell` | static legal | Public | Yes | No | canonical | keep standalone public |
| HIPAA notice | `HIPAANotice` | `src/pages/HIPAANotice.jsx` | `/hipaa` | public footer | `PublicShell` | static legal | Public | Yes | No | canonical | keep standalone public |
| Help center | `HelpCenter` | `src/pages/HelpCenter.jsx` | `/help` | public links | `PublicShell` | static/help | Public | Yes | No | canonical | keep standalone public |
| Shared tool session | `SharedToolSession` | `src/pages/tools/SharedToolSession.jsx` | `/shared/tools/:shareId` | shared links | `PublicShell` | shared tool session API | Public | Yes | No | canonical | keep standalone read-only |
| Team management | `TeamManagement` | `src/pages/team/TeamManagement.jsx` | `/team` | settings/admin | `AppShell` | user mgmt APIs | Required+perm | Yes | No | developer-only/internal-only | relabel admin-only; remove consumer nav |
| Audit logs | `AuditLogs` | `src/pages/AuditLogs.jsx` | `/audit-logs` | operations/admin | `AppShell` | audit API | Required+perm | Yes | No | developer-only/internal-only | keep separate admin area |
| Analytics | `AnalyticsDashboard` | `src/pages/AnalyticsDashboard.jsx` | `/analytics` | operations/admin | `AppShell` | analytics service | Required+perm | Yes | No | internal-only | keep ops/admin standalone |
| Cost analytics | `CostAnalyticsDashboard` | `src/pages/CostAnalyticsDashboard.jsx` | `/costs` | operations/admin | `AppShell` | realtime cost service | Required+perm | Yes | No | internal-only | keep ops/admin standalone |

### Non-route page/screen components under `src/pages/**` (internal/orphan/prototype)
- Fleet/internal UI components: `FleetPageChrome`, `FleetDashboardWidgets`, `PredictiveMaintenanceWidgets`, `RouteOptimizerWidgets` → internal-only support screens.
- Tool internal layout/fallback components: `ToolPageLayout`, `ToolNotFound` → internal-only.
- Prototype/sandbox calculators: `abcd2Calculator`, `mentalHealthCalculators`, `nextWaveCalculators`, `pr4aCalculators`, `pr8ClinicalBatchCalculators` → sandbox/prototype or hidden (not routed in `App.jsx`).

## 5) Current Route Inventory Table
- Canonical authenticated clusters: `/assistant`, `/home`, `/patients`, `/operations`, `/tools`, `/tools/*`, `/fleet/*`, `/settings` family.
- Public/auth cluster: `/`, `/auth`, `/auth-callback`, legal/help pages.
- Redirect-heavy aliases: `/dashboard`, `/chat`, `/ai`, `/copilot`, `/all-tools`, `/clinical-tools`, `/fleet`, `/catalog`, auth aliases, legacy calculator aliases.

## 6) Fragmented Pages
Primary fragmentation sources:
1. AI functions split across many full-page tool routes (`differential-ai`, `timeline-ai`, `patient-summary-ai`, etc.).
2. Calculator experiences spread across hub + direct slug routes + legacy aliases.
3. Ops/fleet experiences use separate path family and fallback behavior unlike assistant tool flows.

## 7) Duplicate Route Concepts
- Assistant concept: `/home`, `/assistant`, `/dashboard`, `/chat`, `/ai`, `/copilot`.
- Tools concept: `/tools`, `/all-tools`, `/clinical-tools`.
- Catalog concept: `/tools/catalog`, `/catalog`.
- Calculator concept: canonical `/tools/calculators/:slug` plus legacy `/tools/calculator/*` aliases.
- Auth concept: `/auth` plus 14 aliases.

## 8) Orphaned Pages
Likely orphaned/unrouted under `src/pages`:
- `src/pages/tools/abcd2Calculator.jsx`
- `src/pages/tools/mentalHealthCalculators.jsx`
- `src/pages/tools/nextWaveCalculators.jsx`
- `src/pages/tools/pr4aCalculators.jsx`
- `src/pages/tools/pr8ClinicalBatchCalculators.jsx`
- `src/pages/fleet/FleetPageChrome.jsx` (supporting component)

## 9) Pages Outside App Shell
Expected and acceptable:
- `PublicShell`: `/`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/shared/tools/:shareId`.
- `AuthShell`: `/auth`, `/auth-callback`, `/auth/callback`.

## 10) Pages Outside AI Chatbot Layout
Most tools and settings pages are in `AppShell` but **not in assistant-centered workspace composition**. Key set: `/tools/*` tool pages, `/patients`, `/operations`, `/fleet/*`, `/clinical/alerts`.

## 11) Calculator UX Fragmentation
- Multiple entry points and route aliases create inconsistent state restoration.
- Some calculator prototypes exist as separate pages and are not integrated into canonical calculator hub/tool catalog.

## 12) Tool UX Fragmentation
- Full-page tools bypass a single assistant workbench.
- Catalog and overview are separate page destinations instead of a drawer/panel model.

## 13) AI Assistant UX Fragmentation
- Assistant capabilities exist both as `/assistant` chat and dedicated AI tool pages.
- Recommendation: one assistant route with tool mode contexts (`?tool=` + structured panel state).

## 14) Backend Exposure Gaps
Potential gaps to verify in implementation phase:
- Unrouted/prototype calculator pages with utility support but no canonical launch path.
- Admin/audit tooling visibility mixed into regular navigation concepts (needs strict labeling and gating).

## 15) Canonical AI Chatbot Layout Proposal
- **App shell**: keep `AppShell` as global authed frame.
- **Left navigation/sidebar**: keep primary nav (Assistant, Tools, Patients, Ops, Settings) but route Tools to assistant-with-drawer.
- **Main workspace**: `/assistant` as primary render target.
- **Tool/context panel**: right panel for tool inputs/results.
- **Unified tools drawer**: replace `/tools` as standalone destination experience with drawer invoked inside assistant.
- **Calculators**: launch inside assistant panel, preserve deep links.
- **Backend results**: render in assistant execution/result cards.
- **Developer/audit/admin**: separate area under operations/admin labels.
- **Auth/public**: remain outside app shell until authenticated.

## 16) Canonical Route Map
- **Primary user**: `/assistant` (home + chat + tool launches).
- **Secondary standalone**: `/patients`, `/operations`, `/settings` (these can still include assistant sidecar).
- **Tool deep links preserved**: `/tools/calculators/:slug`, `/tools/drug-checker`, `/tools/lab-interpreter` redirect/render via assistant mode.
- **Admin/internal**: `/audit-logs`, `/analytics`, `/costs`, `/team`, `/tools/clinical-audit`.
- **Public/auth/legal**: unchanged.

## 17) Page-by-Page Flattening Recommendations
- Convert AI-heavy tools (`/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/guideline-rag`) to assistant modes; keep route compatibility via redirect/query mapping.
- Convert calculators to assistant panel launches while preserving calculator slug routes.
- Reclassify `/tools/clinical-audit`, `/audit-logs`, `/team`, `/analytics`, `/costs` as admin/internal and remove from standard user tool browsing.
- Merge settings satellites into nested settings route structure.

## 18) Implementation Phases
1. **Phase 1: Routing normalization** — set canonical route ownership and redirects.
2. **Phase 2: Assistant mode framework** — tool-mode query/state contract.
3. **Phase 3: Tools drawer unification** — embed overview/catalog into assistant.
4. **Phase 4: Calculator panelization** — shift calculator render into assistant results panel.
5. **Phase 5: Admin separation** — isolate audit/dev/internal pages in clearly labeled admin IA.
6. **Phase 6: Cleanup** — deprecate orphan/prototype pages and tighten tests.

## 19) Exact Files To Modify Later
- Routing + layout orchestration:
  - `src/App.jsx`
  - `src/layout/AppShell.jsx`
  - `src/navigation/primaryNavigation.js`
  - `src/navigation/registryToolLaunch.js`
  - `src/routes/clinicalToolRoutes.js`
- Assistant/tool composition:
  - `src/components/ChatInterface.jsx`
  - `src/components/ToolPanel.jsx`
  - `src/pages/tools/ToolsOverview.jsx`
  - `src/pages/tools/ClinicalToolCatalog.jsx`
  - `src/pages/tools/Calculators.jsx`
- Admin labeling / visibility:
  - `src/data/toolInventory*`
  - `src/data/sidebarToolPresentation.js`

## 20) Test Plan
- Route canonicalization tests: aliases redirect to canonical routes.
- Assistant mode tests: each tool route yields assistant mode + tool context.
- Tools drawer tests: catalog/overview open in drawer without leaving assistant.
- Calculator integration tests: slug routes preserve selected calculator in assistant panel.
- Navigation tests: primary nav always highlights canonical section.
- RBAC tests: admin/internal pages gated and absent from standard user nav.
- Responsive tests: panel/drawer behavior on mobile widths.

## 21) Risks and Do-Not-Touch Areas
- Do not break existing deep links and shared tool URLs.
- Do not collapse legal/auth flows into app shell.
- Do not expose admin pages in patient-facing navigation.
- Preserve permission checks for PHI-sensitive AI tools.
