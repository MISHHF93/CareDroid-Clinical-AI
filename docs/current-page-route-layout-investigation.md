# Current Page, Route, Layout, and Navigation Investigation

Discovery pass only. This report documents the current CareDroid Clinical AI frontend architecture as found in code. It does not propose source-code edits, deletions, renames, or route normalization.

## 1. Executive Summary

- Source of truth for SPA routes is `src/App.jsx`, with route support data in `src/routing/authPathAliases.js` and `src/routes/clinicalToolRoutes.js`.
- Expanded route count is **104**: 55 literal route records in `src/App.jsx`, 14 generated auth aliases, 31 generated calculator subroutes, and 4 generated legacy calculator aliases.
- Route-rendered page component count is **48** when including local `WelcomePage` and `AuthPage`; **46** routed components are imported from `src/pages/**`.
- `src/pages/**` contains **59** non-test JS/JSX modules found during inspection: 46 direct route target files plus 13 support, widget, calculator-helper, or barrel modules.
- The primary information architecture is intentionally flatter than the route table: six protected primary nav destinations are visible in the shell: `/home`, `/assistant`, `/tools`, `/patients`, `/operations`, and `/settings`.
- No visible internal SPA link was found that is clearly unrouted. Most unresolved concerns are discoverability, duplicate route concepts, legacy aliases, and hidden/admin surfaces rather than immediate broken links.
- The largest overlap areas are auth aliases, `/home` versus `/assistant` sharing `Dashboard`, `/tools` versus `/tools/catalog`, calculator hub versus calculator subroutes, `/assistant` versus `/chat`, and `/operations` versus `/fleet/*`.

## 2. Page Count

Methodology: counted direct route targets from `src/App.jsx`, generated route targets from `CALCULATOR_ROUTE_DEFS`, and non-test JS/JSX modules under `src/pages/**`.

- **48 route-rendered page components/surfaces**:
  - 46 imported routed components from `src/pages/**`.
  - 2 local route-rendered components in `src/App.jsx`: `WelcomePage` and `AuthPage`.
- **46 unique direct `src/pages/**` routed components**:
  - Public/auth/legal/share: `Auth`, `AuthCallback`, `PrivacyPolicy`, `TermsOfService`, `GDPRNotice`, `HIPAANotice`, `HelpCenter`, `SharedToolSession`.
  - Main protected: `Dashboard`, `Patients`, `Operations`.
  - Account/settings: `Profile`, `ProfileSettings`, `Settings`, `NotificationPreferences`, `TwoFactorSetup`, `BiometricSetup`, `Onboarding`, `ConsentFlow`, `ConsentHistory`.
  - Admin/analytics/audit: `TeamManagement`, `AuditLogs`, `AnalyticsDashboard`, `CostAnalyticsDashboard`.
  - Tools: `ToolsOverview`, `ClinicalToolCatalog`, `DrugChecker`, `LabInterpreter`, `Calculators`, `Protocols`, `DiagnosisAssistant`, `ProcedureGuide`, `AmbientScribe`, `CalculatorRecommender`, `GuidelineRag`, `DifferentialAi`, `TimelineAi`, `PatientSummaryAi`, `OrderSetAi`, `AiExplainability`, `ClinicalAudit`, `ToolsAreaFallback`.
  - Fleet/operations: `FleetDashboard`, `PredictiveMaintenance`, `RouteOptimizer`, `ClinicalAlertsPage`.
- **13 non-routed support/barrel modules under `src/pages/**`**:
  - `src/pages/tools/ToolPageLayout.jsx`
  - `src/pages/tools/ToolNotFound.jsx`
  - `src/pages/tools/abcd2Calculator.jsx`
  - `src/pages/tools/mentalHealthCalculators.jsx`
  - `src/pages/tools/nextWaveCalculators.jsx`
  - `src/pages/tools/pr4aCalculators.jsx`
  - `src/pages/tools/pr8ClinicalBatchCalculators.jsx`
  - `src/pages/fleet/FleetPageChrome.jsx`
  - `src/pages/fleet/FleetDashboardWidgets.jsx`
  - `src/pages/fleet/PredictiveMaintenanceWidgets.jsx`
  - `src/pages/fleet/RouteOptimizerWidgets.jsx`
  - `src/pages/legal/index.js`
  - `src/pages/team/index.js`

## 3. Route Count

Expanded route count: **104**.

- **55 literal route records** in the `routes` array in `src/App.jsx`.
- **14 auth alias routes** from `AUTH_PATH_ALIASES` in `src/routing/authPathAliases.js`.
- **31 generated calculator routes** from `CALCULATOR_ROUTE_DEFS` in `src/routes/clinicalToolRoutes.js`.
- **4 legacy calculator alias routes** from `LEGACY_CALCULATOR_ROUTE_ALIASES` in `src/routes/clinicalToolRoutes.js`.

Route categories:

- **Canonical public/auth/share routes**: `/`, `/auth`, `/auth-callback`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/shared/tools/:shareId`.
- **Canonical protected shell routes**: `/home`, `/assistant`, `/patients`, `/operations`, `/tools`, `/settings`, plus secondary protected pages.
- **Canonical tool routes**: `/tools`, `/tools/catalog`, `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/calculators`, 31 calculator subroutes, and the clinical AI/tool pages under `/tools/*`.
- **Fleet/operations routes**: `/operations`, `/clinical/alerts`, `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer`.
- **Redirect or alias routes**: 23 redirect/alias patterns plus one global catch-all.
- **Fallback patterns**: `/tools/*`, `/fleet/*`, and `*`.

## 4. Navigation Link Count

Methodology: counted visible link/action templates and data-backed generated navigation records, not every possible runtime duplicate caused by recent/pinned/favorite sections.

- **Primary protected nav items**: 6 in `src/navigation/primaryNavigation.js`.
- **Sidebar navigation actions**: 80 if sign-out is included; 79 if sign-out is excluded from navigation.
  - 6 primary nav buttons.
  - 69 data-backed sidebar tool cards from `getSidebarToolRegistryProjection()`.
  - 2 tool quick actions: `Developer Catalog / Source Audit` and `Browse All Tools`.
  - 1 `Start Assistant` action.
  - 1 notifications footer action.
  - 1 sign-out footer action.
- **Mobile bottom nav items**: 6, mirroring the same primary nav items.
- **Public shell header/footer links/actions**: 15 visible links/actions in `src/layout/PublicShell.jsx`.
- **Welcome page visible route actions**: 1 canonical auth action plus 1 conditional dev/demo action.
- **Auth page visible actions**: 4 provider/API sign-in actions, 1 back-home SPA link, and 1 conditional dev/demo action.
- **Tools overview generated actions**: 69 user-facing tool cards, each with a primary open action and an `Open in Assistant` action; this yields 138 generated launch actions before search/workspace filters.
- **Calculator hub generated actions**: 31 built-in calculator cards plus 15 rendered chat-assisted cards.
- **Operations page cards**: 6 route cards.
- **Patients page cards**: 4 route cards plus one `Ask Assistant` action.

Visible internal SPA links inspected were routed. External/API/anchor links intentionally outside React Router include OAuth API URLs, `mailto:`, external documentation/support URLs, and in-page anchors.

## 5. Current Canonical Routes

Inventory legend used below: `route -> component; file; linked from; data source; shell/auth; mobile; status; action`.

Canonical public and auth routes:

- `/` -> `WelcomePage`; `src/App.jsx`; `PublicShell`; public-only; linked from public logo and auth back link; status: canonical; action: keep.
- `/auth` -> `AuthPage`/`Auth`; `src/App.jsx` and `src/pages/Auth.jsx`; `AuthShell`; public-only; linked from welcome and public shell; status: canonical; action: keep.
- `/auth-callback` -> `AuthCallback`; `src/pages/AuthCallback.jsx`; `AuthShell`; public-only OAuth handoff; status: internal canonical; action: keep.
- `/privacy` -> `PrivacyPolicy`; `src/pages/legal/PrivacyPolicy.jsx`; `PublicShell`; public; status: canonical; action: keep.
- `/terms` -> `TermsOfService`; `src/pages/legal/TermsOfService.jsx`; `PublicShell`; public; status: canonical; action: keep.
- `/gdpr` -> `GDPRNotice`; `src/pages/GDPRNotice.jsx`; `PublicShell`; public; status: canonical; action: keep.
- `/hipaa` -> `HIPAANotice`; `src/pages/HIPAANotice.jsx`; `PublicShell`; public; status: canonical; action: keep.
- `/help` -> `HelpCenter`; `src/pages/HelpCenter.jsx`; `PublicShell`; public; status: canonical; action: keep.
- `/shared/tools/:shareId` -> `SharedToolSession`; `src/pages/tools/SharedToolSession.jsx`; `PublicShell`; public share deep link; status: internal/shared; action: investigate further.

Canonical protected shell routes:

- `/home` -> `Dashboard`; `src/pages/Dashboard.jsx`; `AppShell`; auth required; primary nav; data from conversation, tools, dashboard recommendation data; status: canonical; action: keep.
- `/assistant` -> `Dashboard`; `src/pages/Dashboard.jsx`; `AppShell`; auth required; primary nav; data from conversation/chat/tool launch state; status: canonical but shares component with `/home`; action: investigate further.
- `/patients` -> `Patients`; `src/pages/Patients.jsx`; `AppShell`; auth required; primary nav; data from patient workflow cards; status: canonical; action: keep.
- `/operations` -> `Operations`; `src/pages/Operations.jsx`; `AppShell`; auth required; primary nav; data from operations cards; status: canonical; action: keep.
- `/settings` -> `Settings`; `src/pages/Settings.jsx`; `AppShell`; auth required; primary nav; status: canonical; action: keep.

Canonical account/settings secondary routes:

- `/profile` -> `Profile`; `src/pages/Profile.jsx`; `AppShell`; auth required; highlighted by settings nav but weakly linked; status: hidden/secondary; action: investigate further.
- `/profile-settings` -> `ProfileSettings`; `src/pages/ProfileSettings.jsx`; `AppShell`; auth required; linked from profile; status: secondary; action: fix later because its "Back to chat" link currently points to `/`.
- `/notifications` -> `NotificationPreferences`; `src/pages/NotificationPreferences.jsx`; `AppShell`; auth required; sidebar footer/profile linked; status: secondary; action: keep.
- `/two-factor-setup` -> `TwoFactorSetup`; `src/pages/TwoFactorSetup.jsx`; `AppShell`; auth required; settings cluster; status: secondary; action: investigate further.
- `/biometric-setup` -> `BiometricSetup`; `src/pages/BiometricSetup.jsx`; `AppShell`; auth required; profile linked; status: secondary; action: investigate further.
- `/onboarding` -> `Onboarding`; `src/pages/Onboarding.jsx`; `AppShell`; auth required; profile linked; status: secondary; action: keep.
- `/consent` -> `ConsentFlow`; `src/pages/legal/ConsentFlow.jsx`; `AppShell`; auth required; consent-history links to it; status: secondary/legal; action: keep.
- `/consent-history` -> `ConsentHistory`; `src/pages/legal/ConsentHistory.jsx`; `AppShell`; auth required; no normal inbound nav found; status: hidden; action: investigate further.

Canonical admin, analytics, and audit routes:

- `/team` -> `TeamManagement`; `src/pages/team/TeamManagement.jsx`; `AppShell`; auth required; `Permission.MANAGE_USERS`; status: internal/admin; action: investigate further.
- `/audit-logs` -> `AuditLogs`; `src/pages/AuditLogs.jsx`; `AppShell`; auth required; `Permission.VIEW_AUDIT_LOGS`; linked from operations/profile; status: internal/audit; action: keep.
- `/analytics` -> `AnalyticsDashboard`; `src/pages/AnalyticsDashboard.jsx`; `AppShell`; auth required; `Permission.VIEW_ANALYTICS`; linked from operations; status: internal/analytics; action: keep.
- `/costs` -> `CostAnalyticsDashboard`; `src/pages/CostAnalyticsDashboard.jsx`; `AppShell`; auth required; `Permission.VIEW_ANALYTICS`; no normal inbound link found; status: hidden; action: investigate further.

Canonical tool and fleet route groups:

- `/tools` -> `ToolsOverview`; `src/pages/tools/ToolsOverview.jsx`; `AppShell`; auth required; primary nav; data from `getUserFacingToolRegistryProjection()`; status: canonical; action: keep.
- `/tools/catalog` -> `ClinicalToolCatalog`; `src/pages/tools/ClinicalToolCatalog.jsx`; `AppShell`; auth required; `Permission.CONFIGURE_SYSTEM`; data from audit/catalog inventory; status: developer-only; action: keep and document later.
- `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/protocols`, `/tools/diagnosis`, `/tools/procedures`, `/tools/calculator-recommender` -> dedicated tool pages; `AppShell`; auth required; data from page-local metadata plus inventory launch data; status: canonical; action: keep.
- `/tools/calculators` -> `Calculators`; `src/pages/tools/Calculators.jsx`; `AppShell`; auth required; data from `builtinUiCalculators`, `getCalculatorToolInventory()`, and chat-assisted hub groups; status: canonical hub; action: keep.
- `/tools/calculators/:knownSlug` -> `Calculators initialCalculatorId`; 31 generated route records; `AppShell`; auth required; status: canonical subroutes; action: keep.
- `/tools/ambient-scribe`, `/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/ai-explainability` -> clinical AI pages; `AppShell`; auth required with `READ_PHI` and `USE_AI_CHAT`; status: protected clinical AI; action: keep.
- `/tools/guideline-rag` -> `GuidelineRag`; `AppShell`; auth required with `USE_AI_CHAT`; status: protected clinical AI; action: keep.
- `/tools/clinical-audit` -> `ClinicalAudit`; `AppShell`; auth required with `VIEW_AUDIT_LOGS`; status: protected audit; action: keep.
- `/clinical/alerts` -> `ClinicalAlertsPage`; `AppShell`; auth required; linked from operations; status: operations/clinical intelligence; action: keep.
- `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer` -> fleet pages; `AppShell`; auth required; linked from operations and tools inventory; status: canonical fleet subroutes; action: keep.

Condensed per-route inventory:

- `/` -> `WelcomePage`; `src/App.jsx`; linked from public logo/auth back; static welcome/dev bypass config; `PublicShell`, public-only; mobile readiness through welcome styles; canonical; keep.
- `/auth` -> `AuthPage`/`Auth`; `src/App.jsx`, `src/pages/Auth.jsx`; linked from welcome/public shell; auth provider config/dev bypass; `AuthShell`, public-only; mobile card layout; canonical; keep.
- `/auth-callback` -> `AuthCallback`; `src/pages/AuthCallback.jsx`; linked externally by OAuth provider; URL token form; `AuthShell`, public-only; simple mobile card; internal canonical; keep.
- `/auth/callback` -> `LegacyOAuthCallbackRedirect`; `src/App.jsx`; external legacy callback; location query; `AuthShell`, public-only; not UI-bearing; alias; keep.
- Auth aliases `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, `/create-account`, `/account/login`, `/account/signup`, `/account/register`, `/accounts/login`, `/accounts/signup` -> `AuthPathRedirect`; `src/App.jsx`, `src/routing/authPathAliases.js`; deep links only; URL query/hash; redirect shellless; public-only; not UI-bearing; alias; document later.
- `/home` -> `Dashboard`; `src/pages/Dashboard.jsx`; primary nav; conversation/dashboard/tool data; `AppShell`, auth required; mobile tests exist; canonical; keep.
- `/dashboard` -> `LegacyProtectedRouteRedirect`; `src/App.jsx`; legacy deep link; location query/hash; redirect shellless; auth required; not UI-bearing; alias; keep.
- `/assistant` -> `Dashboard`; `src/pages/Dashboard.jsx`; primary nav/tool launches; conversation/chat/tool data; `AppShell`, auth required; mobile tests exist; canonical but overlaps `/home`; investigate further.
- `/chat` -> `LegacyProtectedRouteRedirect`; `src/App.jsx`; legacy deep link; location query/hash; redirect shellless; auth required; not UI-bearing; alias; keep.
- `/patients` -> `Patients`; `src/pages/Patients.jsx`; primary nav; patient workflow card data; `AppShell`, auth required; simple responsive card layout; canonical; keep.
- `/operations` -> `Operations`; `src/pages/Operations.jsx`; primary nav; operations card data; `AppShell`, auth required; simple responsive card layout; canonical; keep.
- `/tools` -> `ToolsOverview`; `src/pages/tools/ToolsOverview.jsx`; primary/sidebar/welcome dev action; `getUserFacingToolRegistryProjection()`; `AppShell`, auth required; responsive CSS; canonical; keep.
- `/tools/catalog` -> `ClinicalToolCatalog`; `src/pages/tools/ClinicalToolCatalog.jsx`; permission-gated sidebar/tools overview; audit/catalog inventory; `AppShell`, auth plus `CONFIGURE_SYSTEM`; responsive CSS hardened; developer-only; keep.
- `/tools/drug-checker` -> `DrugChecker`; `src/pages/tools/DrugChecker.jsx`; registry/sidebar/tools overview; page metadata/orchestrator; `AppShell`, auth required; tool layout; canonical; keep.
- `/tools/lab-interpreter` -> `LabInterpreter`; `src/pages/tools/LabInterpreter.jsx`; registry/sidebar/tools overview; page metadata/orchestrator; `AppShell`, auth required; layout test exists; canonical shared by ABG; keep.
- `/tools/calculators` -> `Calculators`; `src/pages/tools/Calculators.jsx`; registry/sidebar/tools overview; `builtinUiCalculators`, calculator inventory, chat hub groups; `AppShell`, auth required; responsive tests exist; canonical hub; keep.
- Generated calculator subroutes `/tools/calculators/sofa`, `/tools/calculators/gfr`, `/tools/calculators/bmi`, `/tools/calculators/chads2vasc`, `/tools/calculators/qsofa`, `/tools/calculators/news2`, `/tools/calculators/child-pugh`, `/tools/calculators/has-bled`, `/tools/calculators/meld`, `/tools/calculators/meld-na`, `/tools/calculators/timi-ua-nstemi`, `/tools/calculators/ascvd-risk`, `/tools/calculators/ckd-staging`, `/tools/calculators/stop-bang`, `/tools/calculators/audit-c`, `/tools/calculators/phq9`, `/tools/calculators/gad7`, `/tools/calculators/heart-score`, `/tools/calculators/centor-mcisaac`, `/tools/calculators/bishop-score`, `/tools/calculators/apgar-score`, `/tools/calculators/braden-scale`, `/tools/calculators/morse-fall-scale`, `/tools/calculators/ranson-criteria`, `/tools/calculators/bisap-score`, `/tools/calculators/fib4`, `/tools/calculators/framingham-risk`, `/tools/calculators/abcd2`, `/tools/calculators/shock-index`, `/tools/calculators/anion-gap`, `/tools/calculators/rass` -> `Calculators initialCalculatorId`; `src/pages/tools/Calculators.jsx`, `src/routes/clinicalToolRoutes.js`; registry/sidebar/tools/calculator hub; `CALCULATOR_ROUTE_DEFS`; `AppShell`, auth required; responsive tests exist; canonical subroutes; keep.
- Legacy calculator aliases `/tools/calculator/sofa`, `/tools/calculator/gfr`, `/tools/calculator/bmi`, `/tools/calculator/chads2vasc` -> `LegacyProtectedRouteRedirect`; `src/App.jsx`, `src/routes/clinicalToolRoutes.js`; legacy deep links; location query/hash; redirect shellless; auth required; not UI-bearing; alias; keep.
- `/tools/protocols` -> `Protocols`; `src/pages/tools/Protocols.jsx`; registry/sidebar/tools overview; page metadata; `AppShell`, auth required; tool layout; canonical shared by ACLS/ATLS; keep.
- `/tools/diagnosis` -> `DiagnosisAssistant`; `src/pages/tools/DiagnosisAssistant.jsx`; registry/sidebar/tools overview; page metadata/chat support; `AppShell`, auth required; inline layout risk; canonical shared by antibiotic guide; keep.
- `/tools/procedures` -> `ProcedureGuide`; `src/pages/tools/ProcedureGuide.jsx`; registry/sidebar/tools overview; page metadata; `AppShell`, auth required; tool layout; canonical; keep.
- `/tools/ambient-scribe` -> `AmbientScribe`; `src/pages/tools/AmbientScribe.jsx`; patients/tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive test coverage; protected clinical AI; keep.
- `/tools/calculator-recommender` -> `CalculatorRecommender`; `src/pages/tools/CalculatorRecommender.jsx`; registry/sidebar/tools overview; calculator inventory; `AppShell`, auth required; tool layout; canonical; keep.
- `/tools/guideline-rag` -> `GuidelineRag`; `src/pages/tools/GuidelineRag.jsx`; registry/sidebar/tools overview; clinical intelligence API; `AppShell`, auth plus `USE_AI_CHAT`; tool layout; protected clinical AI; keep.
- `/tools/differential-ai` -> `DifferentialAi`; `src/pages/tools/DifferentialAi.jsx`; dashboard/tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive test coverage; protected clinical AI; keep.
- `/tools/timeline-ai` -> `TimelineAi`; `src/pages/tools/TimelineAi.jsx`; patients/tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive CSS; protected clinical AI; keep.
- `/tools/patient-summary-ai` -> `PatientSummaryAi`; `src/pages/tools/PatientSummaryAi.jsx`; patients/tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive test coverage; protected clinical AI; keep.
- `/tools/order-set-ai` -> `OrderSetAi`; `src/pages/tools/OrderSetAi.jsx`; patients/tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive test coverage; protected clinical AI; keep.
- `/tools/ai-explainability` -> `AiExplainability`; `src/pages/tools/AiExplainability.jsx`; tools registry; clinical intelligence API; `AppShell`, auth plus `READ_PHI` and `USE_AI_CHAT`; responsive test coverage; protected clinical AI; keep.
- `/tools/clinical-audit` -> `ClinicalAudit`; `src/pages/tools/ClinicalAudit.jsx`; tools registry; clinical intelligence API; `AppShell`, auth plus `VIEW_AUDIT_LOGS`; responsive test coverage; protected audit; keep.
- `/fleet` -> `LegacyProtectedRouteRedirect`; `src/App.jsx`; legacy deep link; location query/hash; redirect shellless; auth required; not UI-bearing; alias; keep.
- `/catalog` -> `LegacyProtectedRouteRedirect`; `src/App.jsx`; legacy deep link; location query/hash; redirect shellless; auth required; not UI-bearing; alias to developer page; document later.
- `/fleet/command` -> `FleetDashboard`; `src/pages/fleet/FleetDashboard.jsx`; operations/tools registry; fleet telemetry/mock data; `AppShell`, auth required; responsive fleet tests; canonical fleet; keep.
- `/fleet/predictive-maintenance` -> `PredictiveMaintenance`; `src/pages/fleet/PredictiveMaintenance.jsx`; operations/tools registry; fleet maintenance data; `AppShell`, auth required; responsive fleet tests; canonical fleet; keep.
- `/fleet/route-optimizer` -> `RouteOptimizer`; `src/pages/fleet/RouteOptimizer.jsx`; operations/tools registry; route optimizer data; `AppShell`, auth required; responsive fleet tests; canonical fleet; keep.
- `/tools/*` -> `ToolsAreaFallback`; `src/pages/tools/ToolsAreaFallback.jsx`; unknown tool URLs; route resolver/tool-not-found data; `AppShell`, auth required; fallback layout; fallback; keep.
- `/fleet/*` -> `ToolsAreaFallback`; `src/pages/tools/ToolsAreaFallback.jsx`; unknown fleet URLs; route resolver/tool-not-found data; `AppShell`, auth required; fallback layout; fallback; keep.
- `/clinical/alerts` -> `ClinicalAlertsPage`; `src/pages/ClinicalAlertsPage.jsx`; operations card; clinical alert data; `AppShell`, auth required; responsive CSS; canonical operations; keep.
- `/profile` -> `Profile`; `src/pages/Profile.jsx`; contextual/profile surfaces; user/profile/audit state; `AppShell`, auth required; profile styles; hidden secondary; investigate further.
- `/profile-settings` -> `ProfileSettings`; `src/pages/ProfileSettings.jsx`; profile links; profile settings form state; `AppShell`, auth required; inline style risk; secondary; fix later label/link.
- `/settings` -> `Settings`; `src/pages/Settings.jsx`; primary nav/profile; settings/config state; `AppShell`, auth required; inline style risk; canonical; keep.
- `/notifications` -> `NotificationPreferences`; `src/pages/NotificationPreferences.jsx`; sidebar footer/profile; notification context; `AppShell`, auth required; component CSS; secondary; keep.
- `/two-factor-setup` -> `TwoFactorSetup`; `src/pages/TwoFactorSetup.jsx`; settings/profile flows; two-factor setup state; `AppShell`, auth required; inline style risk; secondary; investigate further.
- `/biometric-setup` -> `BiometricSetup`; `src/pages/BiometricSetup.jsx`; profile link; biometric setup state; `AppShell`, auth required; simple page layout; secondary; investigate further.
- `/onboarding` -> `Onboarding`; `src/pages/Onboarding.jsx`; profile link; onboarding state; `AppShell`, auth required; simple page layout; secondary; keep.
- `/consent` -> `ConsentFlow`; `src/pages/legal/ConsentFlow.jsx`; consent-history/self flows; consent state/legal links; `AppShell`, auth required; form layout; secondary legal; keep.
- `/consent-history` -> `ConsentHistory`; `src/pages/legal/ConsentHistory.jsx`; no normal inbound link found; consent history data; `AppShell`, auth required; legal page layout; hidden; investigate further.
- `/privacy` -> `PrivacyPolicy`; `src/pages/legal/PrivacyPolicy.jsx`; public shell/footer/consent; static legal content; `PublicShell`, public; public responsive shell; canonical; keep.
- `/terms` -> `TermsOfService`; `src/pages/legal/TermsOfService.jsx`; public shell/footer/consent; static legal content; `PublicShell`, public; public responsive shell; canonical; keep.
- `/gdpr` -> `GDPRNotice`; `src/pages/GDPRNotice.jsx`; public footer; static legal content; `PublicShell`, public; public responsive shell; canonical; keep.
- `/hipaa` -> `HIPAANotice`; `src/pages/HIPAANotice.jsx`; public footer; static legal content; `PublicShell`, public; public responsive shell; canonical; keep.
- `/help` -> `HelpCenter`; `src/pages/HelpCenter.jsx`; public header/footer; static help content; `PublicShell`, public; public responsive shell; canonical; keep.
- `/shared/tools/:shareId` -> `SharedToolSession`; `src/pages/tools/SharedToolSession.jsx`; share links/API result sharing; shared session state; `PublicShell`, public; simple responsive page; internal public share; investigate further.
- `/team` -> `TeamManagement`; `src/pages/team/TeamManagement.jsx`; no normal inbound link found; team/admin data; `AppShell`, auth plus `MANAGE_USERS`; `min-height: 100vh` risk; internal/admin; investigate further.
- `/audit-logs` -> `AuditLogs`; `src/pages/AuditLogs.jsx`; operations/profile; audit data; `AppShell`, auth plus `VIEW_AUDIT_LOGS`; page layout; internal/audit; keep.
- `/analytics` -> `AnalyticsDashboard`; `src/pages/AnalyticsDashboard.jsx`; operations; analytics data; `AppShell`, auth plus `VIEW_ANALYTICS`; page layout; internal analytics; keep.
- `/costs` -> `CostAnalyticsDashboard`; `src/pages/CostAnalyticsDashboard.jsx`; no normal inbound link found; cost tracking context; `AppShell`, auth plus `VIEW_ANALYTICS`; page layout; hidden analytics; investigate further.
- `*` -> auth-aware `Navigate`; `src/App.jsx`; unmatched URLs; auth state only; redirect shellless; public/auth dependent; not UI-bearing; fallback; keep.

Note: repeated generated routes intentionally share component, shell, auth, mobile-readiness, status, and action values. This is current architecture, not a recommendation to collapse them.

## 6. Duplicate or Overlapping Routes

- Auth duplicates: `/auth` is canonical; `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, `/create-account`, `/account/login`, `/account/signup`, `/account/register`, `/accounts/login`, and `/accounts/signup` redirect to `/auth`. Status: intentional aliases; action: keep now, document later.
- OAuth duplicates: `/auth-callback` is canonical; `/auth/callback` redirects to it. Status: legacy alias; action: keep.
- Home/chat duplicates: `/home` and `/assistant` both render `Dashboard`; `/dashboard` redirects to `/home`; `/chat` redirects to `/assistant`. Status: duplicate concept with preserved legacy deep links; action: investigate further before any merge.
- Tools catalog duplicates: `/tools` is user-facing tools hub; `/tools/catalog` is developer/source audit; `/catalog` redirects to `/tools/catalog`. Status: overlapping labels; action: relabel/document later.
- Calculator duplicates: `/tools/calculators` is the hub; 31 `/tools/calculators/:slug` routes are canonical direct-launch subroutes; four `/tools/calculator/:slug` singular routes redirect. Status: canonical plus legacy aliases; action: keep now.
- Fleet/operations duplicates: `/operations` is the primary visible operations page; `/fleet` redirects to `/fleet/command`; `/fleet/*` pages are also tool inventory entries. Status: overlapping operations/fleet concept; action: investigate further.

## 7. Auth Route Findings

- Canonical sign-in/create-account page is `/auth`.
- Signup intent is represented through query state: signup aliases set `mode=signup` before redirecting to `/auth`.
- `AuthShell` wraps `/auth`, `/auth-callback`, and `/auth/callback`; these intentionally bypass `AppShell`.
- Public-only auth routes redirect authenticated users to `/home`.
- Auth-required routes redirect unauthenticated users to `/auth`.
- Dev/demo bypass is conditional, appears on welcome/auth surfaces when enabled outside production, and navigates to `/tools`.
- Visible auth/provider actions use backend API endpoints rather than SPA routes for Google, LinkedIn, OIDC, and SAML. These are not React Router gaps.

Recommended action: keep the single `/auth` surface, keep aliases until external deep-link usage is known, and document the alias contract before normalization.

## 8. Tools Route Findings

- User-facing tools hub is `/tools`, powered by `getUserFacingToolRegistryProjection()`.
- Developer/source audit page is `/tools/catalog`, gated by `Permission.CONFIGURE_SYSTEM`.
- Canonical launchable registry records: **69**.
- Unique registry route paths: **49**.
- Medical catalog rows from the registry/NLU union: **75**.
- Tool cards in `ToolsOverview` generate 69 primary open actions and 69 assistant launch actions.
- Sidebar tools generate 69 data-backed shortcuts from `getSidebarToolRegistryProjection()`.
- Tool route groups that share one page/component:
  - `/tools/calculators`: 17 registry IDs share the hub path, including hub-only/chat-assisted calculators and dispatch/dose concepts.
  - `/tools/protocols`: `protocols`, `acls-protocol`, `atls-protocol`.
  - `/tools/lab-interpreter`: `lab-interp`, `abg-interpreter`.
  - `/tools/diagnosis`: `diagnosis`, `antibiotic-guide`.
- Tool-adjacent pages outside normal launch inventory include `/tools`, `/tools/catalog`, `/tools/*`, `/fleet/*`, `/shared/tools/:shareId`, and `/clinical/alerts`.

Recommended action: keep user-facing `/tools` separate from developer `/tools/catalog`; document which routes are tool inventory entries versus shell/fallback/share surfaces.

## 9. Calculator Route Findings

- Calculator hub route: `/tools/calculators`.
- Dedicated generated calculator subroutes: **31**.
- Dedicated calculator forms/cards are sourced from `builtinUiCalculators` and normalized through `getCanonicalToolInventory()`.
- Rendered calculator hub affordances: **46** total:
  - 31 built-in calculator cards.
  - 15 chat-assisted cards.
- Chat-assisted launch records: **16**, but the hub renders 15 because `dispatch-ai` is excluded from the calculator inventory display.
- Legacy singular calculator aliases: **4**:
  - `/tools/calculator/sofa` -> `/tools/calculators/sofa`
  - `/tools/calculator/gfr` -> `/tools/calculators/gfr`
  - `/tools/calculator/bmi` -> `/tools/calculators/bmi`
  - `/tools/calculator/chads2vasc` -> `/tools/calculators/chads2vasc`
- Unknown calculator-like slugs land in the tools fallback/`ToolNotFound` path rather than being assumed valid.

Recommended action: keep `/tools/calculators` as the canonical plural family and retain singular aliases until analytics confirm no active inbound usage.

## 10. AI/Chat Route Findings

- `/assistant` is the canonical visible AI/chat route.
- `/chat` is a legacy protected redirect to `/assistant`.
- `/home` and `/assistant` both render `Dashboard`, with conversation viewport logic recognizing `/dashboard`, `/home`, `/chat`, and `/assistant`.
- Chat-assisted tool launches often navigate to `/assistant` with a seeded prompt or selected tool state.
- Clinical AI pages live as protected full-page tools under `/tools/*`, not under `/assistant`.
- Protected AI routes include `AmbientScribe`, `GuidelineRag`, `DifferentialAi`, `TimelineAi`, `PatientSummaryAi`, `OrderSetAi`, `AiExplainability`, and `ClinicalAudit`.

Recommended action: investigate whether `Dashboard` should remain the shared implementation for `/home` and `/assistant` before any flattening. Do not assume either path is unused.

## 11. Fleet/Operations Route Findings

- `/operations` is the visible primary navigation entry.
- `/fleet/command`, `/fleet/predictive-maintenance`, and `/fleet/route-optimizer` are canonical fleet subroutes.
- `/fleet` redirects to `/fleet/command`.
- `/fleet/*` falls back to `ToolsAreaFallback`.
- Operations also links to `/clinical/alerts`, `/analytics`, and `/audit-logs`.
- Fleet tool records exist in `toolRegistry.js` and are visible through tool launch flows, so fleet pages are both operations routes and tool inventory launches.

Recommended action: keep `/operations` as the primary IA label and investigate whether fleet pages should remain tool-launchable before relabeling or merging.

## 12. Developer/Audit Route Findings

- `/tools/catalog` is the Developer Catalog / Source Audit page.
- It is route-gated with `Permission.CONFIGURE_SYSTEM` in `src/App.jsx`.
- Sidebar and Tools Overview links to Developer Catalog / Source Audit are also permission-gated.
- `/catalog` redirects to `/tools/catalog`.
- Tool not-found fallback conditionally exposes a catalog link only when the user has `Permission.CONFIGURE_SYSTEM`.
- Source audit data includes broad tool/source inventory beyond the user-facing 69 registry records, including platform/internal and planned/future IDs.

Recommended action: keep as developer-only, document the permission contract, and avoid merging it with the user-facing `/tools` hub without a product decision.

## 13. Orphaned or Hidden Pages

Imported but not routed:

- No `src/App.jsx` page import was found to be unused.
- The 13 non-routed modules under `src/pages/**` are support, widget, helper, or barrel modules rather than direct route targets. They should not be treated as unused without import-level tracing.

Routed but weakly linked or hidden:

- `/auth-callback` and `/auth/callback`: internal OAuth flows.
- Auth aliases: intentionally hidden compatibility routes.
- `/dashboard`, `/chat`, `/fleet`, `/catalog`, and legacy calculator aliases: intentionally hidden redirects.
- `/tools/*`, `/fleet/*`, and `*`: fallback routes.
- `/team`: admin/internal, permission-gated.
- `/costs`: analytics permission-gated, not found in normal visible navigation.
- `/consent-history`: routed and links to `/consent`, but no normal inbound app link was found.
- `/shared/tools/:shareId`: public deep-link route, not expected in primary nav.
- `/profile`: highlighted by settings nav and reachable from some contextual surfaces, but not a fixed primary link.

Linked but not routed:

- None found for visible internal SPA links inspected.
- External/API/anchor links intentionally outside React Router include OAuth API endpoints, documentation/support URLs, `mailto:` links, and in-page anchors.

## 14. Layout/Shell Observations

- `AppShell` is the main authenticated shell and wraps most protected pages through `AppShellPage` in `src/App.jsx`.
- `PublicShell` wraps public content, legal/help pages, welcome, and shared tool sessions.
- `AuthShell` wraps auth and auth callback flows.
- Main AppShell bypasses by unique component/surface: **9**:
  - `WelcomePage`
  - `Auth`/`AuthPage`
  - `AuthCallback`
  - `PrivacyPolicy`
  - `TermsOfService`
  - `GDPRNotice`
  - `HIPAANotice`
  - `HelpCenter`
  - `SharedToolSession`
- Bypass route entries are **10** because `/auth/callback` is a separate legacy route entry that reuses the auth callback flow.
- `AppShell` includes compact viewport detection, mobile drawer behavior, bottom nav, dev-mode banner, theme FAB, and sidebar-controlled tool launching.
- `PublicShell` has its own header/footer with legal/resource/compliance links.
- `AuthShell` intentionally provides a standalone full-page auth card.

Potential layout/scroll risk areas visible from code:

- Some protected pages still use large inline styles, fixed widths, or fixed padding, especially `ProfileSettings.jsx`, `TwoFactorSetup.jsx`, and some tool forms.
- `TeamManagement.css` uses `min-height: 100vh` inside an AppShell-wrapped route, which can create nested vertical scroll on smaller devices.
- Several AI/tool pages use two-column CSS grids with responsive breakpoints; they look considered but should remain mobile regression targets.
- `ClinicalToolCatalog.css` has extensive overflow protections and responsive rules, suggesting the catalog is high-risk but actively hardened.

## 15. Risk Areas

- **Route count drift**: generated routes from auth aliases and calculator definitions make raw route count easy to miscount.
- **Shared `Dashboard` implementation**: `/home` and `/assistant` share one component but represent different user intents.
- **Developer catalog naming**: `/tools/catalog` can sound user-facing while it is permission-gated developer/source audit.
- **Tool inventory layering**: `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `clinicalToolIdContract.js`, `toolInventory.js`, and source-audit data all describe overlapping tool concepts.
- **Calculator hub overlap**: many registry IDs intentionally share `/tools/calculators`, but only 31 have dedicated subroutes/forms.
- **Hidden routes**: `/costs`, `/team`, and `/consent-history` are valid but not part of normal primary navigation.
- **Fleet/operations overlap**: fleet pages are both operational routes and tool-launch records.
- **Public versus protected shells**: shared tool sessions are public and bypass AppShell, which is likely intentional but should be security-reviewed.
- **Layout regressions**: AppShell pages with `min-height: 100vh`, inline grids, or fixed dimensions should remain responsive test targets.

## 16. Recommended Next Investigation

- Trace actual runtime imports for the 13 non-routed `src/pages/**` support modules before labeling any as dead.
- Build a route-to-link matrix from rendered tests or static AST tooling so every route has a verified inbound link classification.
- Split user-facing tool inventory from developer/source audit inventory in documentation before changing routes.
- Review analytics or server logs for legacy alias usage: `/dashboard`, `/chat`, `/fleet`, `/catalog`, and `/tools/calculator/*`.
- Review permissions for `/tools/catalog`, `/team`, `/audit-logs`, `/analytics`, `/costs`, and clinical AI pages against intended roles.
- Run mobile/responsive smoke coverage for `ProfileSettings`, `TwoFactorSetup`, `TeamManagement`, `ClinicalToolCatalog`, `Calculators`, and all fleet pages.
- Confirm whether `/shared/tools/:shareId` should remain public and whether the shared route needs explicit auth/security documentation.

## 17. Do-Not-Touch List

Do not refactor, delete, rename, or normalize these before a follow-up implementation plan:

- Auth aliases in `src/routing/authPathAliases.js`.
- Legacy redirects for `/dashboard`, `/chat`, `/fleet`, `/catalog`, and `/auth/callback`.
- Legacy singular calculator aliases in `LEGACY_CALCULATOR_ROUTE_ALIASES`.
- Generated calculator route definitions in `CALCULATOR_ROUTE_DEFS`.
- `Dashboard` serving both `/home` and `/assistant`.
- `/tools/catalog` permission gating and all Developer Catalog / Source Audit links.
- Public legal/help/share routes using `PublicShell`.
- Auth routes using `AuthShell`.
- Tool inventory source files: `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `clinicalToolIdContract.js`, `toolInventory.js`, and `sourceCodeToolDiscovery.js`.
- Non-routed `src/pages/**` support modules, especially calculator helper modules and fleet widget modules.
- Hidden/deep-link routes such as `/costs`, `/team`, `/consent-history`, and `/shared/tools/:shareId` until inbound usage and product intent are verified.
