# DUPLICATE_MAP.md

R1 fresh duplicate map. Source and third-party generated folders were excluded; tests were used only as importer evidence and are not listed as duplicate implementation hits unless they define an implementation surface.

## Search 1 - Duplicate Patient Components
src/pages/emergency/index.tsx | renders Emergency Whiteboard patient card grid, filter chips, stats, and quick-intake toast | route `/emergency/whiteboard`; re-exported by `src/components/EmergencyWhiteboard.jsx`; imports `PatientCard`
src/components/EmergencyWhiteboard.jsx | compatibility re-export for the whiteboard patient grid | used by `src/App.jsx` route `/emergency/whiteboard`
src/components/PatientCard.tsx | renders patient summary card with vitals row, flags, wait time, staff badge, score badges, and timeline button | used by `src/pages/emergency/index.tsx`, `src/App.jsx` patient/reassessment/boarding/capacity grids, and re-exported by `src/components/EmergencyPatientCard.jsx`
src/components/EmergencyPatientCard.jsx | compatibility re-export for patient card | not directly imported in active source; points to `src/components/PatientCard.tsx`
src/components/PatientDetailPanel.tsx | renders selected-patient detail side panel with timeline rows, vitals, notes, flags, and embedded calculator cards | used by `src/components/AppShell.tsx`; re-exported by `src/components/EmergencyPatientDetailPanel.jsx`
src/components/EmergencyPatientDetailPanel.jsx | compatibility re-export for patient detail panel | not directly imported in active source; points to `src/components/PatientDetailPanel.tsx`
src/pages/Patients.jsx | renders commercial patient/case workflow card grid | legacy `/patients` path redirects to `/emergency/patients`; imported only by `src/pages/OperatingWorkspace.launch.test.jsx`
src/pages/tools/PatientSummaryAi.jsx | renders patient summary input/output panels with result lists for problems, medications, labs, alerts, and risk factors | routed through tool inventory as `patient-summary-ai`; imported in smoke/tests and launched from tools hub/catalog
Total: 8

## Search 2 - Duplicate Store/State Files
src/store/emergencyStore.ts | Zustand store holding canonical Emergency OS patients, staff, rooms, referrals, alerts, capacity, EMS arrivals, shift, workflow logs, settings, realtime, scenario state, and selectors | consumed by active Emergency OS routes/components including `src/App.jsx`, `src/components/AppShell.tsx`, `src/pages/emergency/index.tsx`, `PatientCard`, `PatientDetailPanel`, `Header`, calculators, drawers, and panels
store/featureStore.ts | Zustand store holding feature flags, overrides, tier, backend sync status, and feature toggles | consumed by `src/layout/AppShell.jsx`; not used by active `src/components/AppShell.tsx`
frontend/src/store/emergency-store.ts | Zustand persisted store holding patients, capacity metrics, boarding metrics, surge status, copilot messages, EMS incoming patients, UI selection, websocket, integration events | consumed by `frontend/src/hooks/useEmergencyWebSocket.ts`; not imported by active `src/App.jsx`
src/contexts/WorkspaceContext.jsx | React context holding workspaces, active workspace id, workspace API loading/errors, membership, defaults, and refresh/switch helpers | consumed by `CommandDashboard`, `Operations`, `ClinicalDecisionSupport`, `UserIdentityContext`, workspace tests, and provider stack in `src/App.jsx`
src/contexts/WhiteLabelContext.jsx | React context holding tenant white-label theme/branding state | provider mounted in `src/App.jsx`; direct consumers are sparse
src/contexts/ToolPreferencesContext.jsx | React context holding favorites, pinned/recent tools, access recording, and preference persistence | consumed by `CommandDashboard`, tool pages, `Operations`, `MemoryDashboard`, `CareDroidBrainDashboard`, fleet pages, and `UserIdentityContext`
src/contexts/NotificationContext.jsx | React context holding in-memory notifications and add/remove/read helpers | provider mounted in `src/App.jsx`; consumed by `CommandDashboard` and notification action hooks
src/contexts/TenantContext.jsx | React context holding tenant/org context and scoped headers | consumed by `BillingPage`, `CustomerPortalPage`, API tenant header store, and provider stack
src/contexts/OfflineProvider.jsx | React context holding offline-mode state | provider mounted in `src/App.jsx`; direct consumers are limited
src/contexts/UserIdentityContext.jsx | React context holding account, workspace, organization, role profile, preferences, security, personalization, and activity recording | consumed by profile pages, commercial pages, dashboards, tool pages, `MemoryDashboard`, `CareDroidBrainDashboard`
src/contexts/UserContext.jsx | React context holding user/auth token, role permissions, auth state, and sign-out helpers | broadly consumed by shell, pages, dashboards, route guards, and providers
src/contexts/ConversationContext.jsx | React context holding conversations, messages, active/selected tool, and chat mutation helpers | consumed by command dashboard, tool pages, operations, shell, workspace pages
src/contexts/ThemeContext.jsx | React context holding theme preference and resolved theme | provider mounted in `src/App.jsx`; consumed by settings and `UserIdentityContext`
src/contexts/SystemConfigContext.jsx | React context holding runtime system config, degraded API status, AI usage, and refresh helpers | consumed by `CommandDashboard`; provider renders `ApiConfigDegradedBanner`
src/contexts/OrganizationContext.jsx | React context holding organization profile and refresh/update helpers | consumed by `CommandDashboard`, customer portal, and provider stack
src/contexts/CostTrackingContext.jsx | React context holding token/cost usage, budgets, alerts, and cost analytics helpers | provider mounted in `src/App.jsx`; consumed in cost tracking tests and cost surfaces
Total: 16

## Search 3 - Duplicate AI/LLM Callers
lib/ai/client.ts | Anthropic Messages API via `https://api.anthropic.com/v1/messages` | shared direct provider client for Copilot chat, summaries, score assist, intake suggestion, handoff brief, protocol suggestion, triage assist, and shift summary
backend/src/modules/ai/ai.service.ts | Anthropic through `unifiedAIClient.request` | backend generic AI query service, usage/cost/audit recording, and tool-enabled clinical prompts
backend/src/modules/chat/chat.service.ts | Anthropic through `unifiedAIClient.request` | ED Copilot response generation and chat fallback before clinical tool execution
lib/ai/responseParser.ts | Anthropic through `unifiedAIClient.request({ stream: true })` | streaming AI response parsing, tool-call/action-card extraction
src/lib/ai/client.ts | frontend AI API wrapper using `apiFetch` to `/api/emergency/copilot/message`, `/api/chat/message`, `/api/chat/suggest-action` | consumed by `src/components/CopilotPanel.tsx`
src/services/clinicalIntelligenceApi.js | AI endpoint wrapper using `/api/clinical-intelligence/*` | consumed by `PatientSummaryAi`, `DifferentialAi`, `GuidelineRag`, Timeline/Order/Audit/Explainability tool pages
Total: 6

## Search 4 - Duplicate Dashboard/Workspace Pages
/emergency/whiteboard | src/pages/emergency/index.tsx | Emergency Whiteboard workspace
/emergency/patients | src/App.jsx inline `PatientsRoute` | Emergency Patients workspace
/emergency/journey | src/App.jsx inline `JourneyRoute` | Patient Journey workspace
/emergency/ems | src/components/EMSPipeline.jsx | EMS Pipeline workspace
/emergency/intake | src/pages/emergency/SmartIntake.jsx | Smart Intake workspace
/emergency/queues | src/App.jsx inline `QueueRoute` | Queue Intelligence workspace
/emergency/reassessment | src/App.jsx inline `ReassessmentRoute` | Reassessment workspace
/emergency/capacity | src/App.jsx inline `CapacityRoute` | Capacity Detail workspace
/emergency/boarding | src/App.jsx inline `BoardingRoute` | Boarding workspace
/emergency/referrals | src/components/ReferralPanel.jsx | Referral Intelligence workspace
/emergency/provincial-health | src/App.jsx inline `ProvincialHealthRoute` | Provincial Health Connector workspace
/emergency/integrations | src/App.jsx inline `IntegrationsRoute` | Integration Hub workspace
/emergency/copilot | src/App.jsx inline `CopilotRoute` | ED Copilot workspace
/emergency/analytics | src/pages/emergency/EmergencyAnalytics.jsx | Emergency Analytics dashboard
/emergency/simulation | src/App.jsx inline `RealTimeSimulationRoute` | Real-Time Simulation dashboard
/emergency/federated-learning | src/App.jsx inline `FederatedLearningRoute` | Federated Learning dashboard
/emergency/digital-twin | src/App.jsx inline `HybridDigitalTwinRoute` | Hybrid Digital Twin dashboard
/emergency/tools | src/pages/emergency/ClinicalCalculatorHub.jsx | Clinical Calculator Hub workspace
/emergency/shift | src/App.jsx inline `ShiftRoute` | Emergency OS Shift workspace
/emergency/ai-governance | src/pages/AIGovernanceDashboard.tsx | AI Governance dashboard alias
/ai-governance | src/pages/AIGovernanceDashboard.tsx | AI Governance dashboard canonical root alias
/emergency/settings | src/pages/emergency/EmergencySettings.jsx | Emergency Settings workspace
/dashboard | src/App.jsx redirect route | legacy Dashboard route redirected to Emergency Whiteboard
/workspace | src/App.jsx redirect route | legacy Workspace route redirected to Emergency Whiteboard
/patients | src/App.jsx legacy redirect route | legacy Patients route redirected to `/emergency/patients`; `src/pages/Patients.jsx` still exists as unmounted patient workflow page
/operations | src/App.jsx legacy redirect route | legacy Operations route redirected to Emergency Whiteboard; `src/pages/Operations.jsx` still exists as unmounted operations workspace
/operations-center | src/App.jsx legacy redirect route | legacy Digital Operations Center route redirected to Emergency Whiteboard; `src/pages/DigitalOperationsCenter.jsx` still exists
/hospital-map | src/App.jsx legacy redirect route | legacy Hospital Map dashboard route redirected to Emergency Whiteboard; `src/pages/HospitalMapDashboard.jsx` still exists
/medical-iot | src/App.jsx legacy redirect route | legacy Medical IoT dashboard route redirected to Emergency Whiteboard; `src/pages/MedicalIotDashboard.jsx` still exists
/fleet/* | src/App.jsx legacy redirect route | legacy Fleet dashboards redirected to Emergency Whiteboard; `src/pages/fleet/FleetDashboard.jsx`, `FleetLiveMap.jsx`, `RouteOptimizer.jsx`, `PredictiveMaintenance.jsx` still exist
/workspaces | src/App.jsx legacy redirect route | legacy Workspaces route redirected to Emergency Whiteboard; `src/pages/WorkspaceHome.jsx` re-exports future-module workspace page
/platform-admin | src/App.jsx legacy redirect route | legacy Platform Admin route redirected to Emergency Whiteboard; `src/pages/PlatformAdminPage.jsx` still exists
/customer-portal | src/App.jsx legacy redirect route | legacy Customer Portal workspace redirected to Emergency Whiteboard; `src/pages/customer-portal/CustomerPortalPage.jsx` still exists
Total: 33

## Search 5 - Duplicate Type Definitions
src/types/emergency.ts | Priority enum | P1/P2/P3/P4/P5 compact frontend priority enum
src/types/emergency.ts | Patient interface | id, mrn, firstName, lastName, dob, age, sex, arrival/triage time, complaint, state, priority, vitals array, flags, staff/room ids, notes, timeline, referral, reassessment reminders, source, emsUnitId
src/types/emergency.ts | Staff interface | id, name, role `MD/RN/PA/Tech/Charge`, active
types/emergency.ts | Priority enum | P1/P2/P3/P4/P5 plus PriorityLabel and PatientPriority aliases
types/emergency.ts | Patient interface | richer root model with entity ids, demographics, location, triage/assessment times, current vitals object, staff/room ids, PatientFlag objects, reminders, vitals alerts, timeline, referral, EMS arrival, notes, critical checklist
types/emergency.ts | Staff interface | id, firstName, lastName, displayName/email/avatar, role, status, shiftId, assignedPatientIds, activePatients, currentRoomId
backend/src/models/unified-patient.model.ts | IUnifiedPatient interface and status/priority-like aliases | Mongoose patient document with identifiers, demographics, clinical history, currentState/JourneyState, dpsScore, boardingStatus, protocolStatus, deterioration/AI review/safety status, wearable/EMS/virtual-care fields
backend/src/modules/users/entities/user.entity.ts | User class and UserRole enum | TypeORM user entity with id, encrypted email/phone fields, password/reset fields, email verification, role, active status, login metadata, profile/oauth/two-factor/subscription/audit relations
backend/src/modules/subscriptions/entities/subscription.entity.ts | SubscriptionStatus enum | active, suspended, expired, cancelled/canceled, pending, past_due, trialing, incomplete, incomplete_expired
Total: 9

## Search 6 - Duplicate Notification Systems
src/contexts/NotificationContext.jsx | in-memory notification context | triggered by `addNotification`, auto-removes non-critical notifications after 5 seconds; consumed by `CommandDashboard` and notification hooks
src/components/notifications/NotificationToast.jsx | toast container and `useToasts` hook | triggered by local `addToast`; mounted in `src/App.jsx` without provider wiring for context notifications
src/hooks/useNotificationActions.js | notification action helper | triggered by workflow/security/system helper calls that call `addNotification`
src/components/NotificationPreferences.jsx | notification preferences/inbox/device cards/status messages | triggered by `/api/notifications/*` reads, preference saves, read-all, and device removal
src/services/NotificationService.js | browser push notification and backend notification API service | triggered by push permission, Firebase token registration, browser `Notification`, `/api/notifications/*`, and stream setup
src/components/ApiStateBanner.jsx | loading/error/unsupported state banner wrapper | triggered by tool/page API loading, unsupported backend capability, or API error props
src/components/ToolApiErrorBanner.jsx | danger alert banner | triggered by `ApiStateBanner` and direct tool API errors
src/components/ApiConfigDegradedBanner.jsx | system configuration degraded banner | triggered by `SystemConfigContext` when API config cannot be loaded
src/components/ui/Alert.jsx | generic alert/status primitive | triggered by any consumer passing warning/danger/info/success tone
src/components/clinical/ClinicalAlertBanner.jsx | clinical alert banner with findings/actions | triggered by ToolPageLayout clinical alerts
src/components/clinical/AnomalyBanner.jsx | anomaly alert banner with score/type badges | triggered by ToolPageLayout anomaly scores >= 0.5
src/components/StateSourceNotice.jsx | demo/live/source-state notice | triggered by pages declaring live/demo/local/backend-unavailable source states
src/components/EMSCriticalBroadcast.jsx | EMS critical overlay, banner, countdown badge, and checklist | triggered by active EMS arrivals with critical checklists in emergency store
src/pages/emergency/index.tsx | local patient-added status toast and whiteboard API error alert | triggered by QuickIntake `onAdded` and whiteboard API failure
Total: 14

## Search 7 - Duplicate Navigation Components
src/components/Sidebar.tsx | renders icon sidebar links from `getVisibleNavigation`: Whiteboard, EMS, Referrals, Capacity, Tools, Shift, Settings by role, with reassessment badge | used by `src/components/AppShell.tsx`
src/components/AppShell.tsx | renders `Sidebar`, `Header`, command palette, patient detail, Copilot, EMS broadcast, reassessment drawer | imported by `src/App.jsx` as active root layout
src/layout/AppShell.jsx | renders legacy `ed-nav-rail` from `APP_SHELL_NAV_ITEMS`, header controls, alert/reassessment/capacity menus, command palette, and main region | not imported by active `src/App.jsx`; kept as legacy shell
src/components/Header.tsx | renders top header controls: Emergency OS, clock, role selector, scenario selector, capacity badge, alert bell/menu, staff/workload menu | used by `src/components/AppShell.tsx`
src/components/CommandPalette.jsx | renders command/search modal items for routes, patients, referrals, calculators, flags, capacity, and reassessment | used by both `src/components/AppShell.tsx` and `src/layout/AppShell.jsx`
src/config/unified-navigation.config.ts | source list for active sidebar items: Whiteboard, EMS, Referrals, Capacity, Tools, Shift, Settings | imported by `src/components/Sidebar.tsx` and `src/layout/AppShell.jsx` projection
frontend/src/config/unified-navigation.config.ts | alternate navigation source list with Emergency Whiteboard, EMS Intake, Queues, Reassessment, Capacity, Surge, Safety, Virtual Care, Wearable Monitor, Patients, ED Copilot, AI Governance, Settings | consumed only by frontend legacy store/build area; duplicates active nav config
src/config/navigation.config.js | compatibility/projection nav source: `APP_SHELL_NAV_ITEMS`, `PRIMARY_NAV_ITEMS`, utility/sidebar/quick-command sets | consumed by legacy shell/config consumers; duplicates unified navigation
src/navigation/primaryNavigation.js | compatibility re-export of navigation config | consumers use it as legacy primary nav import
src/config/commandPalette.config.js | command palette route command list for Emergency OS pages | imported by `src/components/CommandPalette.jsx`
src/navigation/iconRegistry.js | central route/tool/workspace icon mapping | consumed by sidebar, dashboard cards, tool pages, command/dashboard navigation surfaces
Total: 11

## Search 8 - Duplicate Clinical Calculators
src/pages/emergency/ClinicalCalculatorHub.jsx | Emergency OS calculator hub, category tabs, embedded calculator launch, and ED workflow tools | active route `/emergency/tools`
src/components/ClinicalCalculatorHub.tsx | Clinical Calculator Hub compatibility re-export | not directly imported; points to `src/pages/emergency/ClinicalCalculatorHub.jsx`
src/pages/tools/Calculators.jsx | legacy Medical Calculators hub and calculator interface | reachable through tools redirect/query flows; imports many calculator page packs and utils
src/components/calculators/qSOFA.tsx | qSOFA score | active embedded patient calculator; saves notes and dispatches sepsis alerts
src/components/calculators/HEARTScore.tsx | HEART score | active embedded patient calculator; saves notes to patient
src/components/ClinicalScoreCalculator.jsx | HEART/qSOFA/NIHSS reusable score modal | older reusable score component; supports AI assist and score event/note creation
src/components/PediatricDrugCalculator.jsx | pediatric emergency drug dose calculator | active AppShell shortcut and emergency tools launch
src/pages/tools/sourceBackedClinicalCalculators.jsx | Wells PE, PERC, GRACE ACS, NIHSS, Canadian C-Spine, Ottawa Ankle/Foot, NEXUS C-Spine, PECARN Head forms | source-backed calculator pack
src/pages/tools/mentalHealthCalculators.jsx | PHQ-9 and GAD-7 forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/pr4aCalculators.jsx | ASCVD, AUDIT-C, CKD staging, Stop-Bang forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/pr8ClinicalBatchCalculators.jsx | HEART, Centor/McIsaac, Bishop, Apgar, Braden, Morse Fall, Ranson, BISAP, FIB-4, Framingham forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/hepatologyGiCalculators.jsx | APRI, Glasgow-Blatchford, Maddrey DF, Rockall forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/abcd2Calculator.jsx | ABCD2 score form | active calculator pack imported by `Calculators.jsx`
src/pages/tools/nextWaveCalculators.jsx | Shock Index, Anion Gap, RASS forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/emergencyCriticalCareCalculators.jsx | GCS, CURB-65, APACHE II, MEWS, Revised Trauma Score, PEWS forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/cardiologyCalculators.jsx | CHADS2, Duke Treadmill, HCM Sudden Death, Heart Failure Staging, Reynolds Risk forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/pulmonologyCalculators.jsx | BODE, COPD GOLD, A-a Gradient, PaO2/FiO2, ROX, Pneumonia Severity, Asthma Severity forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/nephrologyCalculators.jsx | eGFR CKD-EPI, Cockcroft-Gault CrCl, FeNa, FeUrea, KFRE, BUN/Cr, corrected sodium, free water deficit, osmolal gap forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/endocrineMetabolicCalculators.jsx | HOMA-IR, corrected calcium, serum osmolality, BMI, BSA, ideal/adjusted body weight, waist-hip ratio forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/neurologyCalculators.jsx | Hunt-Hess, ICH, FOUR score, modified Rankin, NIHSS summary, Pediatric GCS forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/pediatricsObgynCalculators.jsx | pregnancy due date, gestational age, pediatric BP percentile, Fenton helper, neonatal bilirubin, pediatric dose safety forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/psychiatryScreeningCalculators.jsx | CAGE, MMSE, MoCA workflow, PCL-5, MDQ, Epworth, Columbia suicide workflow forms | active calculator pack imported by `Calculators.jsx`
src/pages/tools/hospitalOperationsCalculators.jsx | bed occupancy, staffing ratio, turnaround time, resource utilization calculators | active calculator pack imported by `Calculators.jsx`; operational not clinical
src/utils/qsofaCalculator.js | qSOFA scoring utilities | imported by `Calculators.jsx`
src/utils/news2Calculator.js | NEWS2 scoring utilities | imported by `Calculators.jsx`
src/utils/childPughCalculator.js | Child-Pugh scoring utilities | imported by `Calculators.jsx`
src/utils/hasBledCalculator.js | HAS-BLED scoring utilities | imported by `Calculators.jsx`
src/utils/meldCalculator.js | MELD/MELD-Na scoring utilities | imported by `Calculators.jsx`
src/utils/timiUaNstemiCalculator.js | TIMI UA/NSTEMI scoring utilities | imported by `Calculators.jsx`
src/utils/wellsPeCalculator.js | Wells PE scoring utilities | imported by source-backed calculator pack
src/utils/percCalculator.js | PERC rule utilities | imported by source-backed calculator pack
src/utils/graceAcsCalculator.js | GRACE ACS risk utilities | imported by source-backed calculator pack
src/utils/nihssCalculator.js | NIHSS scoring utilities | imported by source-backed/neurology calculator packs
src/utils/canadianCSpineCalculator.js | Canadian C-Spine rule utilities | imported by source-backed calculator pack
src/utils/ottawaAnkleCalculator.js | Ottawa Ankle/Foot rule utilities | imported by source-backed calculator pack
src/utils/nexusCSpineCalculator.js | NEXUS C-Spine rule utilities | imported by source-backed calculator pack
src/utils/pecarnHeadCalculator.js | PECARN Head rule utilities | imported by source-backed calculator pack
src/utils/ascvdPceCalculator.js | ASCVD PCE risk utilities | imported by PR4A calculator pack
src/utils/ckdStagingCalculator.js | CKD staging/eGFR/albuminuria utilities | imported by PR4A/nephrology calculator packs
src/utils/auditCCalculator.js | AUDIT-C utilities | imported by PR4A calculator pack
src/utils/phq9Calculator.js | PHQ-9 utilities | imported by mental health calculator pack
src/utils/gad7Calculator.js | GAD-7 utilities | imported by mental health calculator pack
src/utils/emergencyCriticalCareCalculators.js | GCS, CURB-65, APACHE II, MEWS, RTS, PEWS utilities | imported by emergency critical care pack
src/utils/nephrologyCalculators.js | nephrology calculator utilities | imported by nephrology pack and `Calculators.jsx`
src/utils/endocrineMetabolicCalculators.js | endocrine/metabolic calculator utilities | imported by endocrine pack
src/utils/pediatricsObgynCalculators.js | pediatrics/OB calculator utilities | imported by pediatrics/OB pack
src/utils/psychiatryScreeningCalculators.js | psychiatry screening utilities | imported by psychiatry calculator pack
src/utils/pulmonologyCalculators.js | pulmonology calculator utilities | imported by pulmonology pack
src/utils/cardiologyRiskCalculators.js | cardiology risk utilities | calculator implementation support; imported by cardiology pack/data
src/utils/heartScoreCalculator.js | HEART score utilities | calculator implementation support
src/utils/centorMcisaacCalculator.js | Centor/McIsaac utilities | calculator implementation support
src/utils/apgarScoreCalculator.js | Apgar utilities | calculator implementation support
src/utils/bishopScoreCalculator.js | Bishop score utilities | calculator implementation support
src/utils/bradenScaleCalculator.js | Braden scale utilities | calculator implementation support
src/utils/morseFallScaleCalculator.js | Morse Fall Scale utilities | calculator implementation support
src/utils/bisapScoreCalculator.js | BISAP utilities | calculator implementation support
src/utils/ransonCriteriaCalculator.js | Ranson criteria utilities | calculator implementation support
src/utils/fib4Calculator.js | FIB-4 utilities | calculator implementation support
src/utils/framinghamRiskCalculator.js | Framingham risk utilities | calculator implementation support
src/utils/nextWaveCalculatorUtils.js | Shock Index, Anion Gap, RASS utilities | imported by next-wave calculator pack
src/utils/hospitalOperationsCalculators.js | bed/staffing/TAT/resource operations calculator utilities | imported by hospital operations calculator pack; operational not clinical
backend/src/modules/medical-control-plane/tool-orchestrator/services/sofa-calculator.service.ts | SOFA score backend executor | registered backend tool executor
Total: 61

## Search 9 - Duplicate API Clients
src/services/apiClient.js | `VITE_API_URL` origin or same-origin `/api`, plus axios `baseURL` from `getApiBaseUrl()` | shared `apiFetch`, `apiFetchJson`, `apiAxios`, stream URL, auth headers, tenant headers, response parsing
src/lib/apiClient.ts | re-export of `../services/apiClient` | TypeScript import compatibility for shared API client
src/config/appConfig.js | `VITE_API_URL`, `VITE_WS_URL` | app-wide API and websocket configuration source
src/config/apiEnv.js | same-origin `/api` timeout/env defaults | API timeout/env helper
src/config/api.config.js | API route normalization and route constants | used by API clients and orchestrator execution
src/services/emergencyOsApi.js | `/api/emergency/*` via direct `fetch(buildApiUrl(path))` | Emergency OS whiteboard, patients, journey, EMS, intake, queues, reassessment, capacity, boarding, referrals, integrations, copilot, analytics, simulation, federated, digital twin, settings
src/services/clinicalIntelligenceApi.js | `/api/clinical-intelligence/*` via `apiFetch` | ambient scribe, guideline RAG, differential AI, timeline AI, patient summary AI, order set AI, explainability, clinical audit
src/services/clinicalToolsApi.js | `/api/tools*` via `apiFetch` | tool list, metadata, validation, executor catalog, statistics with stable GET cache
src/services/clinicalOrchestratorApi.js | `/api/tools/:id/execute` via `apiFetch` | registered clinical tool execution
src/services/NotificationService.js | `/api/notifications/*`, `buildStreamUrl` | preferences, unread counts, notification history, devices, browser push, stream registration
src/services/liveTrackingApi.js | `/api/live-tracking/*` via shared client | live tracking/fleet map API
src/services/reassessmentApi.js | `/api/reassessment/*` via shared client | reassessment API
src/services/surgeApi.js | `/api/surge/*` via shared client | surge activation/status API
src/services/emergencyTransportApi.js | `/api/emergency-transport/*` via shared client | emergency transport API
src/services/successCenterApi.js | `/api/success-center/*` via shared client | success center/customer success API
src/services/complianceApi.js | `/api/compliance/*` via shared client | consent/export/delete-account compliance API
src/services/emergencyStaffingApi.js | `/api/emergency/staffing/*` and notification prefs via shared client | staffing and notification preference support
src/services/saasHealthApi.js | `/api/saas-health` via shared client | SaaS health API
src/services/enterpriseIdentityApi.js | `/api/auth/identity-providers` via shared client | enterprise identity API
src/services/platformSystemsApi.js | `/api/platform-systems/*` via shared client | platform systems/capabilities API
src/services/emergencyGovernanceApi.js | `/api/emergency/governance/*` via shared client | emergency AI governance API
src/services/subscriptionApi.js | `/api/subscriptions/*` via shared client | subscription/billing API
src/services/emergencySettingsApi.js | `/api/emergency/settings*` via shared client | Emergency OS settings and feature flags API
src/services/aiCommandCenterApi.js | `/api/ai-command-center/*` via shared client | AI command center snapshots/API
src/services/artifactsApi.js | `/api/artifacts/*` via shared client | artifact/version/graph API
src/services/emergencyCopilotApi.js | `/api/emergency/copilot/*` via shared client | Emergency Copilot API
src/services/productCatalogApi.js | `/api/products`, `/api/asset-packs`, `/api/commercial-plans`, `/api/specialties`, `/api/care-pathways`, `/api/agents`, `/api/integrations-marketplace`, `/api/solution-builder`, `/api/maturity-assessments`, `/api/organizations/*` via shared client | commercial catalog/product/platform API
src/services/whiteLabelApi.js | `/api/white-label/*` via shared client | white-label tenant branding API
src/services/patientManagementApi.js | `/api/patients/*` via shared client | patient search/backend verification/management API
src/services/platformAssetsApi.js | `/api/platform-assets/*` via shared client | platform assets/entitlements API
src/services/userIdentityApi.js | `/api/user-profile/*` and related identity endpoints via shared client | user identity/profile API
src/services/customerPortalApi.js | `/api/customer-portal/*` via shared client | customer portal API
src/services/memoryApi.js | `/api/memory/*` via shared client | memory API
src/services/platformGovernanceApi.js | `/api/security`, `/api/interoperability`, `/api/regulatory`, `/api/equity`, `/api/human-review`, `/api/privacy`, `/api/system-health`, `/api/operations` via shared client | platform governance API
src/services/boardingApi.js | `/api/boarding/*` via shared client | boarding API
src/services/smartIntakeApi.js | `/api/smart-intake/*` via shared client | smart intake API
src/services/tenantIsolationApi.js | `/api/tenant/isolation-audit` via shared client | tenant isolation audit API
src/services/auditApi.js | `/api/audit/*` via shared client | audit API
src/services/trainingApi.js | `/training/*` via shared client | training dashboard/runs API
src/services/emergencyAnalyticsApi.js | `/api/emergency/shift/*` via shared client | emergency analytics/shift report API
src/services/automationAuditApi.js | `/api/automation-audit/*` via shared client | automation audit API
src/services/clinicalAlertsApi.js | `/api/clinical-alerts/*` via shared client | clinical alerts API
src/services/clinicalContentApi.js | `/api/protocols/*`, `/api/drugs/*` via shared client | clinical content/protocol/drug API
src/services/evaluationApi.js | `/api/evaluation/*` via shared client | AI evaluation API
src/services/analyticsService.ts | `/api/analytics/events` via shared client | analytics event posting
src/services/clinicalChatService.js | `/api/chat/*` via shared client plus `buildApiUrl('/api/chat/message')` | chat message/action/vitals API
src/services/emergencyRealtimeService.js | websocket/SSE paths using stream/realtime config | Emergency OS realtime API connection management
Total: 48

## Search 10 - Duplicate Layout/Shell Files
src/components/AppShell.tsx | renders full-page wrapper with `Sidebar`, `Header`, main content, patient detail panel, Copilot panel, EMS broadcast, reassessment drawer, command palette | active shell imported by `src/App.jsx`
src/layout/AppShell.jsx | renders full-page wrapper with `ed-nav-rail`, `ed-os-header`, `ed-os-main`, alert drawer/toasts, critical vitals banner, EMS broadcast, command palette, pediatric calculator, reassessment/capacity panels | legacy shell not imported by active `src/App.jsx`
Total: 2

Grand Total: 208
