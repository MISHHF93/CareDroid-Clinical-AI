# Unwired / Orphan Code Scan

Date: 2026-05-23

Scope: read-only static inspection of frontend routes, pages, components, tool inventory, calculator hub, sidebar/navigation, API clients, hooks/utilities, backend modules/controllers/services/DTOs, medical control plane, orchestrator registry, intent classifier patterns, scripts, configs, tests, env examples, and docs.

No code was deleted or modified as part of this scan.

## 1. Executive Summary

CareDroid Clinical AI is mostly wired through centralized route, tool, calculator, and API inventories. The core shipped path is not an orphaned app: `src/App.jsx` mounts `/tools`, `/tools/calculators`, calculator deep links from `CALCULATOR_ROUTE_DEFS`, the tool catalog, fleet pages, and protected AI tool pages. Tool launches are centralized through `applyRegistryToolLaunch`, and the calculator hub derives cards from `buildBuiltinHubCalculatorCards()`.

The highest-risk findings are backend/security and API-contract drift, not dead frontend pages:

- High: auth/security helpers are exported but not registered or used, including emergency backup-code handling that compares plaintext against hashed backup codes.
- High: email workflows exist as a module but registration/magic-link flows return or simulate tokens instead of sending email.
- High: unsupported clinical-tool requests can be hidden by chat fallback instead of returning a structured unsupported-tool boundary.
- High: `backend/package.json` contains a `seed` script pointing to a missing seed runner.
- Medium: several backend routes are real and documented as expose-recommended, but no frontend caller surfaces them.
- Medium: several frontend clients reference backend-missing APIs, but they are currently gated behind disabled capability flags.
- Medium/low: Developer Catalog / Source Audit metadata mixes true phantoms with aliases and API-only concepts, which makes source-scan output less reliable for product decisions.

Classification key:

- orphaned: code exists but has no reachable runtime consumer.
- unreachable: a route, test, link, or component cannot currently be reached through normal app execution.
- duplicate: multiple IDs, routes, aliases, or ownership records represent the same surface ambiguously.
- stale: code/docs/tests/scripts describe behavior that no longer matches the app.
- partially wired: one side of the contract exists, but the runtime path is incomplete.
- intentionally internal: backend-only or ops-only code with a plausible non-frontend consumer.
- planned/future: gated or documented future work that should not be treated as production-ready.

## 2. Frontend Orphans

### F-01: Export-only chart, notification, emergency, and display components

Classification: orphaned / planned-future

Severity: low

Evidence:

- `src/components/charts/VitalsTrendChart.jsx`, `DrugInteractionHeatmap.jsx`, and `LabAnomalyScatter.jsx` are exported from `src/components/charts/index.js`, but inspection found no production imports.
- `src/components/data-display/DataDisplay.jsx` is exported and referenced by a style/performance test, but no production page imports it.
- `src/components/notifications/NotificationCenter.jsx`, `src/components/alerts/EmergencyBanner.jsx`, `src/components/alerts/EmergencyModal.jsx`, `src/components/RateLimitBadge.jsx`, and `src/components/clinical/TrendChart.jsx` appear limited to definitions, barrel exports, tests, or audit text.

Impact: these components add maintenance and styling surface without a rendered user path. If they are intended future UI, their status is implicit rather than documented.

Exact fix:

- Either wire the components into actual pages, add Storybook/example/demo documentation if they are reusable UI primitives, or move them to an explicit `planned`/archive area.
- Add an import-reachability test for `src/components/**` that excludes deliberate primitives and test-only fixtures.

### F-02: Clinical alert banner imports itself instead of its stylesheet

Classification: partially wired

Severity: medium

Evidence:

- `src/components/clinical/ClinicalAlertBanner.jsx` begins with `import './ClinicalAlertBanner.jsx';`.
- The intended stylesheet appears to be `ClinicalAlertBanner.css`, and `ToolPageLayout.jsx` renders clinical alerts.

Impact: the component is reachable, but its CSS is orphaned and the self-import is suspicious. Depending on the bundler, this can cause duplicate module evaluation or simply leave the banner unstyled.

Exact fix:

- Change the import to `import './ClinicalAlertBanner.css';`.
- Add a render smoke test for `ClinicalAlertBanner` through `ToolPageLayout`.

### F-03: Public footer hash links do not have matching anchors

Classification: stale navigation

Severity: low

Evidence:

- `src/layout/PublicShell.jsx` links to `#security` and `#audit`.
- No matching public-page anchors were found for those hash targets.

Impact: users can click links that do not navigate to meaningful content.

Exact fix:

- Replace the hash links with real routes, for example `/privacy`, `/hipaa`, or `/audit-logs` for authenticated users.
- Alternatively add matching `id="security"` and `id="audit"` sections to the public compliance/legal pages.

### F-04: `/chat` route is current behavior, but stale scripts still treat it as removed

Classification: stale / unreachable

Severity: medium

Evidence:

- `src/App.jsx` mounts `/chat` to `Dashboard`.
- `src/navigation/primaryNavigation.js` treats `/chat` as the Assistant legacy path.
- `test-routes.js` fails when `/chat` exists and prints "Should be /dashboard only."
- `test-routes.js` and `test-routes-comprehensive.js` are not referenced by root `package.json` scripts.

Impact: running these scripts manually will report a false route failure. Because they are not wired into scripts, they are stale test assets rather than active checks.

Exact fix:

- Delete both stale scripts, or update them to the current route policy and add a package script if they remain useful.
- Prefer existing route tests under `src/routes/clinicalToolRoutes*.test.js` and `src/test/routePagesSmoke.test.jsx`.

## 3. Backend Orphans

### B-01: Auth helper services are exported but not registered or consumed

Classification: orphaned

Severity: high

Evidence:

- `backend/src/modules/auth/services/index.ts` exports `device-fingerprint.service.ts` and `emergency-access.service.ts`.
- `backend/src/modules/auth/auth.module.ts` registers `AuthService`, `BiometricService`, `JwtStrategy`, `AuthorizationGuard`, and optional OAuth strategies, but not `DeviceFingerprintService` or `EmergencyAccessService`.
- Search found no backend consumers of those services.
- `EmergencyAccessService.verifyEmergencyCode()` checks `backupCodes.findIndex((c) => c === code)`, while `TwoFactorService.verifyToken()` correctly uses `bcrypt.compare()` against hashed backup codes.

Impact: emergency access code is both unreachable and incorrect if later wired as-is.

Exact fix:

- Decide whether emergency/device fingerprint auth is a shipped requirement.
- If yes, register the services in `AuthModule`, inject them into the login/2FA flow, use bcrypt comparison for backup codes, and add service/controller tests.
- If no, remove the exported services or mark them explicitly as planned/future with no runtime export.

### B-02: Two-factor enforcement guard is unused

Classification: orphaned / partially wired

Severity: medium

Evidence:

- `backend/src/modules/auth/guards/two-factor-enforcement.guard.ts` defines `TwoFactorEnforcementGuard` and `TwoFactorRequired`.
- No controller uses `@TwoFactorRequired`.
- `AuthModule` does not provide `TwoFactorEnforcementGuard`.

Impact: privileged-route 2FA enforcement appears intended but is not active.

Exact fix:

- Register the guard and apply `@TwoFactorRequired` to privileged routes, or remove it and document that 2FA is enforced only during login.
- Add an e2e test proving privileged routes reject users who have not satisfied required 2FA.

### B-03: Email module is loaded but auth flows do not send email

Classification: partially wired

Severity: high

Evidence:

- `backend/src/app.module.ts` imports `EmailModule`.
- `backend/src/modules/email/email.service.ts` implements `sendVerificationEmail`, `sendPasswordResetEmail`, `sendTwoFactorCode`, and `sendWelcomeEmail`.
- Search found no consumers of `EmailService`.
- Auth behavior returns or simulates verification/magic-link flows rather than injecting `EmailService`.

Impact: user-visible auth flows can claim email delivery while no email is actually sent.

Exact fix:

- Inject `EmailService` into `AuthService`.
- Send verification, password reset, magic link, and 2FA email flows where appropriate.
- Only expose raw tokens in development/test mode, guarded by environment.

### B-04: Cache module starts infrastructure with no consumers

Classification: orphaned / intentionally internal

Severity: low

Evidence:

- `backend/src/app.module.ts` imports `CacheModule`.
- `backend/src/modules/cache/cache.service.ts` initializes cache infrastructure.
- Search found no service injecting `CacheService`.

Impact: app startup may perform Redis/cache work without runtime benefit.

Exact fix:

- Wire `CacheService` into RAG/content/clinical lookup paths, or remove `CacheModule` from `AppModule` until it is used.
- If it is intentionally preloaded infrastructure, document that in `CacheModule` and add a health/startup test.

### B-05: Key rotation service is provided and tested but operationally unreachable

Classification: planned/future

Severity: medium

Evidence:

- `backend/src/modules/encryption/encryption.module.ts` provides and exports `KeyRotationService`.
- Search found no controller, cron, CLI, or service invoking `KeyRotationService` under `backend/src`.

Impact: key rotation exists as code but has no operational entrypoint.

Exact fix:

- Add an admin-only controller, scheduled job, or CLI runner with authorization and audit logging.
- If manual/internal only, document how it is invoked and keep it out of product exposure reports.

### B-06: RAG retrieval is wired, but ingestion has no runtime entrypoint

Classification: partially wired / planned-future

Severity: medium

Evidence:

- `RAGService` is injected into `ChatService` and `ClinicalIntelligenceService`.
- `RAGService.ingest()` and `ingestBatch()` exist.
- No backend controller or scheduled job exposes ingestion.
- `backend/package.json` has an `ingest` script pointing to `scripts/ingest-documents.ts`, so ingestion may be intended as a script-only path.

Impact: retrieval is production-reachable, but keeping the knowledge base fresh depends on an external/manual path.

Exact fix:

- Document ingestion as script-only bootstrap behavior, or add a protected admin ingestion endpoint/job.
- Add a test that ensures the ingestion script still compiles and calls `RAGService` contracts correctly.

### B-07: Backend seed script points to a missing file

Classification: orphaned

Severity: high

Evidence:

- `backend/package.json` defines `"seed": "ts-node src/database/seeds/run-seeds.ts"`.
- No `backend/src/database/seeds/run-seeds.ts` file exists.

Impact: `npm run seed` in `backend` fails immediately.

Exact fix:

- Add `backend/src/database/seeds/run-seeds.ts`, or replace/remove the script if seeding is no longer supported.
- Add a CI script existence check for package scripts that point to local files.

## 4. Tool Inventory Orphans

### T-01: Phantom/source-audit list mixes true phantoms with aliases and API-only capabilities

Classification: stale / partially wired / intentionally internal

Severity: low

Evidence:

- `src/data/sourceCodeToolDiscovery.js` defines `phantomToolReferences`.
- Some rows are true phantoms, such as `abc-assessment`, `cancer-calculator`, `tumor-staging`, and `chemo-calculator`.
- Some rows are aliases or conceptual overlaps, such as `bleeding-risk` resolving to HAS-BLED and `medication-checker` overlapping drug-check.
- Some rows are API-only or route-policy concepts, such as `vitals-monitor` pointing to `POST /api/chat/analyze-vitals`.

Impact: Developer Catalog / Source Audit can imply that aliases or backend capabilities are missing tools.

Exact fix:

- Split `phantomToolReferences` into `truePhantoms`, `aliases`, `apiOnlyCapabilities`, and `plannedRoadmap`.
- Compute launchability through `resolveCatalogLaunch()` instead of static notes.
- Update source-audit tests to assert true phantoms are not shown as launchable tools.

### T-02: Tool result share endpoint exists in inventories but not as a backend route

Classification: stale / planned-future

Severity: low

Evidence:

- `src/data/frontendApiCallsInventory.js` lists `POST /api/tools/share-results` with client `ToolResultShare.jsx`.
- `src/data/toolInventory.js` also references `/api/tools/share-results`.
- `src/config/backendApiCapabilities.js` sets `toolsShareResults: false`.
- `ToolResultShare.jsx` gates email sharing behind `toolsShareResults` and otherwise uses local/public share links.

Impact: inventory readers can see a backend endpoint that is intentionally disabled and not implemented.

Exact fix:

- If email sharing is planned, keep the disabled capability but mark the inventory row as planned/future and add a backend ticket.
- If not planned, remove the endpoint from inventories and describe local sharing only.

### T-03: Tool inventory contains strong launch guards, but unsupported executors are product-visible

Classification: partially wired

Severity: medium

Evidence:

- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` has exactly three registered executor IDs: `sofa-calculator`, `drug-interactions`, and `lab-interpreter`.
- The same registry documents many `NLU_TOOL_IDS_WITHOUT_EXECUTOR`.
- The frontend differentiates calculator/chat-assisted workflows from direct executor calls through registry and capability checks.

Impact: the product can surface tools that are intentionally frontend-only or chat-assisted, but the backend execution boundary must remain explicit to avoid fake executor expectations.

Exact fix:

- Keep unsupported tools documented as frontend/chat-only, but expose a structured unsupported-tool response from chat and direct executor APIs.
- Add a frontend catalog badge such as "calculator form", "chat-assisted", "backend executor", or "planned".

## 5. Calculator Orphans

### C-01: `egfr` is an alias slug, not an independently rendered calculator form

Classification: stale / duplicate alias

Severity: low

Evidence:

- `src/data/clinicalToolIdContract.js` defines `BUILTIN_CALC.egfr = 'egfr'` and maps it to `REGISTRY.calcGfr`.
- `src/pages/tools/Calculators.jsx` renders `case 'gfr'` for the GFR calculator.
- `toolVisibilityMatrix.js` filters out `egfr`, treating it as an alias.

Impact: source scans or docs can count `egfr` as a separate calculator slug even though the rendered form is `gfr`.

Exact fix:

- Keep `egfr` only in alias maps and explicitly label it as an alias, or add a real `/tools/calculators/egfr` route/card if it should be independently launchable.
- Add a test that alias-only calculator slugs do not inflate shipped calculator counts.

### C-02: Calculator route health is centralized but depends on generated route definitions

Classification: intentionally internal

Severity: low

Evidence:

- `src/App.jsx` maps `CALCULATOR_ROUTE_DEFS` into calculator deep-link routes.
- `src/pages/tools/Calculators.jsx` handles unknown slugs through `ToolNotFound` and redirects known registry/chat-assisted tools.

Impact: this is not currently orphaned, but it is a contract boundary worth protecting.

Exact fix:

- Continue validating `CALCULATOR_ROUTE_DEFS`, `builtinUiCalculators`, and `Calculators.jsx` switch/render coverage in route and form smoke tests.
- Ensure new calculator slugs land in all required contracts before merge.

## 6. NLU/Launch Orphans

### N-01: Unsupported clinical tool requests can be hidden by chat fallback

Classification: partially wired

Severity: high

Evidence:

- `backend/src/modules/chat/chat.service.ts` catches `NotFoundException` in `handleClinicalTool()`.
- For missing orchestrator tools, it calls `generateAIResponse()` with a note that the clinical tool is not available as an automated executor.
- The response does not return a structured `UNSUPPORTED_TOOL` boundary to the client.

Impact: users and frontend telemetry can see a general educational response instead of an explicit unsupported-tool state.

Exact fix:

- Return a structured response with `code: 'UNSUPPORTED_TOOL'`, matched `toolId`, frontend surface (`calculator-form`, `chat-assisted`, `clinical-page`, `fleet`), and a suggested launch path.
- Allow educational fallback only as a secondary explanatory message after the unsupported state is explicit.
- Add backend tests for unsupported NLU tools such as `qsofa`, `news2`, and `wells-pe`.

### N-02: Intent classifier LLM fallback has a manually maintained tool list

Classification: stale

Severity: medium

Evidence:

- `backend/src/modules/medical-control-plane/intent-classifier/intent-classifier.service.ts` builds an LLM classification prompt with tool IDs.
- `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts` is the broader canonical pattern catalog.

Impact: the LLM fallback can drift from keyword/NLU patterns as tool IDs are added.

Exact fix:

- Generate the LLM tool list from `CLINICAL_TOOL_PATTERNS`.
- Add a drift test that fails when `tool.patterns.ts` contains a tool not represented in the LLM prompt.

### N-03: Pattern parameter names do not fully match executor contracts

Classification: partially wired / DTO mismatch

Severity: medium

Evidence:

- `tool.patterns.ts` uses snake_case names such as `urine_output`, `lab_values`, `patient_age`, `patient_sex`, `clinical_context`, and `severity_filter`.
- `tool-orchestrator.registry.ts` aliases only SOFA fields like `urine_output` to `urineOutput`.
- Executor request contracts use camelCase names such as `labValues`, `patientAge`, `patientSex`, `clinicalContext`, and `severityFilter`.

Impact: extracted parameters can fail validation or require AI re-extraction despite being semantically present.

Exact fix:

- Add aliases for lab/drug optional parameter names, or make tool patterns emit canonical camelCase names.
- Add tests from representative clinical phrases through `extractToolParameters()` into `validateExecutorRequestPayload()`.

### N-04: Chat-assisted calculator hub needs metadata enforcement for future additions

Classification: intentionally internal / partially wired guardrail

Severity: low

Evidence:

- `src/pages/tools/Calculators.jsx` launches chat-assisted tools by resolving catalog launch metadata, adding `chatSeed` when present, and navigating to `/chat`.
- Current hub wiring appears centralized, but the path depends on complete launch metadata.

Impact: future chat-assisted tools can appear as cards without useful chat seeding if metadata is incomplete.

Exact fix:

- Add a test that every chat-assisted hub card has a launch target and either `chatSeed` or a deterministic route.
- Include the source of the launch metadata in Developer Catalog rows.

## 7. API Contract Orphans

### A-01: Backend chat next-action/vitals endpoints are not surfaced by frontend clients

Classification: partially wired

Severity: medium

Evidence:

- `backend/src/modules/chat/chat.controller.ts` exposes `POST /api/chat/suggest-action` and `POST /api/chat/analyze-vitals`.
- `src/data/backendRouteExposurePolicy.js` marks both as `expose-recommended` with `clinicalChatService.js` as the client hint.
- `src/data/frontendApiCallsInventory.js` has no rows for those routes.
- `src/services/clinicalChatService.js` only posts to `/api/chat/message`.

Impact: real backend functionality is not product-reachable through the canonical frontend client inventory.

Exact fix:

- Add `clinicalChatService` methods, frontend API inventory rows, capability entries, UI entry points, and tests.
- If they should remain backend-only, change exposure policy from `expose-recommended` to `deferred` or `backend-only`.

### A-02: Clinical alerts API calls are frontend-visible but backend-missing

Classification: planned/future

Severity: medium

Evidence:

- `src/utils/clinicalAlertNotifications.js` contains calls for `/api/clinical/alerts/:id/acknowledge`, `/dismiss`, and `/stream`.
- `src/config/backendApiCapabilities.js` sets `clinicalAlerts: false`.
- No backend clinical alerts controller was found.

Impact: currently guarded, but the page and utility can suggest an API that does not exist.

Exact fix:

- Implement a `ClinicalAlertsController`, or keep alerts local/mock-only and remove API endpoint claims from inventories and UI copy.
- Keep tests asserting no network call occurs while `clinicalAlerts` is false.

### A-03: Team management page is a gated frontend stub

Classification: planned/future

Severity: medium

Evidence:

- `src/pages/team/TeamManagement.jsx` calls `/api/team/users` and `/api/team/invite`.
- `src/data/frontendApiCallsInventory.js` lists team endpoints.
- `src/config/backendApiCapabilities.js` sets `teamManagement: false`.
- No backend team controller was found.

Impact: route `/team` exists behind permission, but backend behavior is planned only.

Exact fix:

- Implement team management backend routes, or hide/remove the route and inventory rows until the capability is enabled.
- Add a route smoke test for disabled capability behavior.

### A-04: Offline sync, chat persistence, export/report, and notification stream APIs are planned only

Classification: planned/future

Severity: low

Evidence:

- `src/services/syncService.js` references `/api/chat/messages`, `/api/chat/conversations`, `/api/tools/results`, and `/api/sync`.
- Export/report services reference `/api/exports/*` and `/api/reports/*`.
- Notification services reference stream/send-channel endpoints.
- `src/config/backendApiCapabilities.js` disables `chatPersistence`, `bulkSync`, `exportsPdf`, `exportsExcel`, `reportsGenerate`, `reportsSchedule`, `notificationStream`, and `notificationSendChannel`.

Impact: no immediate breakage while gates remain false, but these are not production-ready APIs.

Exact fix:

- Keep gated rows explicitly labeled planned/future.
- Implement controllers before enabling any capability flag.
- Add tests proving disabled capabilities use local fallback or skip network.

### A-05: Backend routes with no current frontend caller need policy decisions

Classification: intentionally internal / partially wired / planned-future

Severity: low to medium

Evidence:

- `src/data/backendRouteExposurePolicy.js` marks several no-caller routes as expose-recommended or deferred.
- Notable no-caller or partial-caller routes include `GET /api/auth/biometric/available`, `DELETE /api/auth/biometric/delete/:deviceId`, `GET /api/subscriptions/config`, `GET /api/drugs/categories`, `GET /api/drugs/:id`, `GET /api/protocols/:id`, `GET /api/ai/usage`, and `POST /api/tools/execute`.
- Internal routes such as health probes, OAuth callbacks, Stripe webhook, metrics, and AI internals are plausibly backend-only.

Impact: route exposure reports can blur backend-only, deferred, and missing-frontend states.

Exact fix:

- Refresh `backendRouteExposurePolicy` from actual clients.
- For each no-caller route, set exactly one strategy: `backend-only`, `deferred`, or `expose-recommended`.
- Add a report test that fails when a route is `expose-recommended` without a frontend inventory row.

### A-06: DTO/runtime validation is inconsistent on reachable endpoints

Classification: DTO mismatch / partially wired

Severity: medium

Evidence:

- `ChatController.suggestAction()` and `ChatController.analyzeVitals()` use inline object body types.
- `ToolOrchestratorController.recordToolResult()`, `AuthController.verifyTwoFactor()`, and `UsersController.updateProfile()` were identified as using loose inline or `any` bodies.
- `RegisterDeviceDto`, `UpdatePreferencesDto`, `EnrollBiometricDto`, and `VerifyBiometricDto` are TypeScript interfaces, which Nest `ValidationPipe` cannot validate at runtime.

Impact: request shape expectations can drift from frontend clients and Swagger/docs.

Exact fix:

- Convert interface DTOs to decorated classes with `class-validator`.
- Replace inline object bodies with exported DTO classes.
- Add request validation tests for accepted and rejected payloads.

### A-07: Compliance consent enum is stale/loose

Classification: DTO mismatch / stale

Severity: low

Evidence:

- `backend/src/modules/compliance/dto/compliance.dto.ts` documents `UpdateConsentDto.consentType` enum as `marketing`, `analytics`, `thirdParty`.
- Frontend/service behavior uses values such as `marketing`, `data_processing`, and `third_party_sharing`.
- The DTO only validates `@IsString()`.

Impact: invalid or obsolete consent types can pass validation and docs can mislead client implementers.

Exact fix:

- Replace `consentType: string` with a real enum matching service/frontend values.
- Reject unknown consent types with validation.
- Add frontend/backend contract tests for each consent type.

## 8. Duplicate/Stale Code

### D-01: `/tools/catalog` has duplicate nav ownership

Classification: duplicate

Severity: medium

Evidence:

- `src/navigation/primaryNavigation.js` marks Tools active for `/tools` and `/tools/` prefixes.
- The same file also includes `/tools/catalog` under Settings `matchPaths`.
- `AppShellPage` exposes `onOpenToolsCatalog()` as a tool/catalog action.

Impact: the same route can be conceptually owned by Tools and Settings, which can produce ambiguous active nav state and IA confusion.

Exact fix:

- Assign `/tools/catalog` to one nav item. Prefer Tools because it is under `/tools`.
- Remove `/tools/catalog` from Settings `matchPaths`, or move catalog/trust UI to a Settings-specific route if it is truly settings content.

### D-02: Legacy `ChatInterface.test.jsx` is intentionally excluded and obsolete

Classification: unreachable / stale

Severity: medium

Evidence:

- `vitest.config.js` excludes `**/ChatInterface.test.jsx` with the comment "Legacy Jest-style suite; wrong paths and missing chatAPI".
- `src/components/ChatInterface.test.jsx` imports `../../../src/services/chatAPI`, which does not exist.
- The test uses `jest.mock` and typo `executeClinicaTool`.
- Current coverage exists in `src/components/ChatInterface.nlu.test.jsx`.

Impact: stale tests can confuse coverage and future refactors.

Exact fix:

- Delete the legacy test or rewrite it to Vitest and `clinicalChatService`.
- Remove the explicit exclusion after the stale file is gone.

### D-03: Generated docs and source-scan docs are stale or missing

Classification: stale / partially wired

Severity: medium

Evidence:

- Existing docs such as `docs/tool-contract-matrix.md`, `docs/tool-render-execute-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/backend-exposure-report.md`, and `docs/tool-visibility-matrix.md` identify themselves as source-aligned harness summaries and may require regeneration.
- Code references generated docs that are not present, including `docs/orphaned-backend-functions.md`, `docs/backend-api-inventory.md`, `docs/endpoint-to-frontend-matrix.md`, `docs/tool-render-execute-manual-qa.md`, and `docs/unsupported-orchestrator-tools.md`.
- `docs/unwired-code-discovery-audit.md` contains historical stale findings about source-scan counts that are now derived dynamically in `sourceCodeToolDiscovery.js`.

Impact: docs can disagree with current contracts and inventory.

Exact fix:

- Run and commit the relevant writer outputs, or remove/update references to docs that are not intended to exist.
- Mark historical audit docs as historical snapshots with dates.
- Add a doc freshness check to CI for generated matrices.

### D-04: Env examples lag config usage

Classification: partially wired / stale config

Severity: low to medium

Evidence:

- `src/config/appConfig.js` reads `VITE_SENTRY_PROFILES_SAMPLE_RATE`, `VITE_LOG_LEVEL`, `VITE_FDA_API_KEY`, `VITE_NIH_API_KEY`, `VITE_PUBMED_API_KEY`, `VITE_OPENAI_API_KEY`, and `VITE_OPENAI_MODEL`.
- Root `.env.example` does not list those `VITE_` variables.
- Backend config reads variables such as `DEV_LOGIN_EMAIL`, `APP_VERSION`, `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_PUSH_ENABLED`, `FIREBASE_NOTIFICATION_TTL`, `FIREBASE_NOTIFICATION_PRIORITY`, `FIREBASE_COLLAPSE_KEY`, `NLU_SERVICE_TIMEOUT`, `NLU_SERVICE_RETRIES`, `NLU_CONFIDENCE_THRESHOLD`, `ANOMALY_DETECTION_TIMEOUT`, `ANOMALY_DETECTION_RETRIES`, and `COHERE_API_KEY`.
- `backend/.env.example` omits several of those optional variables.

Impact: new environments may miss optional but supported configuration.

Exact fix:

- Add optional frontend/backend env sections for all config-read variables, or remove unused config reads.
- Add an env-example drift script that compares config reads to `.env.example`.

### D-05: Duplicate root ESLint configs

Classification: duplicate / stale config

Severity: low

Evidence:

- Root has `eslint.config.js` and `.eslintrc.cjs`.
- Root `npm run lint` uses ESLint 9 flat config behavior and no script references `.eslintrc.cjs`.
- Backend has its own `.eslintrc.js`, which is separate.

Impact: contributors can edit the wrong lint config.

Exact fix:

- Remove root `.eslintrc.cjs`, or add a comment/documentation that it is legacy and not used by root scripts.

## 9. Intentionally Internal Code

The following surfaces are not frontend orphans if their intended consumers are ops, providers, webhooks, or backend pipelines:

- `GET /health`: load balancer/ops probe.
- OAuth redirects/callbacks under `/api/auth/google`, `/api/auth/linkedin`, `/api/auth/oidc`, and `/api/auth/saml`: backend auth flows or deferred SSO.
- `POST /api/subscriptions/webhook`: Stripe webhook.
- `GET /api/metrics`: Prometheus scrape.
- `POST /api/ai/query` and `POST /api/ai/structured`: internal AI pipeline endpoints.
- `POST /api/health`: client health ping distinct from public `GET /health`.
- Medical-control-plane registries that document unsupported tools: intentionally separate frontend/chat-only tools from direct executor tools.

Recommended guardrail:

- Keep these routes explicitly tagged `backend-only` or `deferred` in `backendRouteExposurePolicy`.
- Do not force frontend callers for webhook, metrics, probe, or backend pipeline routes.

## 10. Planned/Future Code

The following code appears intentionally planned or capability-gated rather than accidentally live:

- Clinical alerts backend API: frontend utilities exist, but `clinicalAlerts` is false and no backend controller exists.
- Team management backend: `/team` route and frontend clients exist, but `teamManagement` is false and no backend controller exists.
- Offline sync and chat persistence: clients reference `/api/sync`, `/api/chat/messages`, and `/api/chat/conversations`, with capabilities disabled.
- Export/report APIs: export services reference `/api/exports/*` and `/api/reports/*`, with capabilities disabled.
- Notification stream/send-channel APIs: frontend inventory lists them, capabilities are disabled or not fully surfaced.
- Tool result email share: inventory references `POST /api/tools/share-results`, but capability is disabled and local share links are the current path.
- Key rotation operational entrypoint: service is present and exported, but no controller/cron/CLI exists.
- RAG ingestion: script path exists, but no runtime controller/admin job exists.

Recommended guardrail:

- Keep every planned API behind a disabled capability until a backend route, client, UI entrypoint, and tests all land together.
- Label planned/future rows in catalog and exposure reports so reviewers do not confuse them with broken production features.

## 11. Prioritized Fix Plan

Priority 0: security and auth correctness

- Fix or remove `EmergencyAccessService`; never compare plaintext backup codes to hashed values.
- Decide whether device fingerprinting and emergency access are real auth features; register and test them only if they are.
- Wire `EmailService` into auth flows or change UI/API responses so they do not imply delivered email.

Priority 1: API contract truthfulness

- Make unsupported clinical-tool chat responses structured instead of hidden behind general fallback.
- Align `suggest-action` and `analyze-vitals`: either add frontend clients/UI/tests or downgrade their exposure policy.
- Convert interface/inline DTOs to decorated runtime DTO classes.
- Fix compliance consent enum validation.

Priority 2: broken scripts and stale tests

- Fix or remove backend `seed` script.
- Delete or rewrite `src/components/ChatInterface.test.jsx` and remove its Vitest exclusion.
- Delete or update `test-routes.js` and `test-routes-comprehensive.js`.

Priority 3: inventory and catalog cleanup

- Split phantom/source-audit data into true phantoms, aliases, API-only, and planned/future.
- Normalize `egfr` as an alias or make it a real calculator route.
- Clarify `/tools/catalog` ownership in primary navigation.
- Remove stale `/api/tools/share-results` endpoint claims unless implementation is planned.

Priority 4: docs/config hygiene

- Regenerate generated docs or mark existing docs as historical snapshots.
- Add missing config variables to root and backend env examples.
- Remove or document root `.eslintrc.cjs`.
- Replace dead public hash links with real routes or anchors.

## 12. Recommended Tests

Frontend reachability and launch tests:

- Add an import-reachability test for `src/components/**` that allows documented primitives and fails on accidental export-only components.
- Extend `src/navigation/registryToolLaunch.test.js` to assert each registry tool has one launch mode: route, calculator, chat-assisted, backend executor, or planned.
- Add a nav ownership test that ensures each protected route maps to only one primary nav owner unless explicitly allowed.
- Add a public-shell test that verifies footer links resolve to mounted routes or existing anchors.

Calculator/tool inventory tests:

- Add a test that alias-only calculator slugs such as `egfr` do not count as shipped forms.
- Add a calculator deep-link smoke test for every `CALCULATOR_ROUTE_DEFS` slug.
- Add a chat-assisted hub test requiring `chatSeed` or a deterministic route for every chat-assisted card.
- Add a Developer Catalog test that separates true phantoms from aliases and API-only capabilities.

Backend/API contract tests:

- Add backend unit/e2e tests for unsupported clinical tools returning `UNSUPPORTED_TOOL` instead of a plain general fallback.
- Add a drift test that generates the LLM intent-classifier tool list from `CLINICAL_TOOL_PATTERNS`.
- Add parameter alias tests from `tool.patterns.ts` extraction through executor validation for SOFA, drug interactions, and lab interpreter.
- Add a backend route exposure test: `expose-recommended` routes must have a frontend inventory caller or an explicit waiver.
- Add DTO validation tests for notification device registration, notification preferences, biometric enrollment/verify, chat suggest/analyze, user profile update, tool result records, and compliance consent.

Config/docs/tests hygiene:

- Add a package-script file existence test for scripts like `backend npm run seed`.
- Add an env-example drift check that compares config-read env vars against `.env.example` and `backend/.env.example`.
- Add generated-doc freshness tests for backend exposure, tool contract, visibility, render/execute, and unsupported orchestrator docs.
- Remove or rewrite obsolete route scripts and the excluded legacy chat test, then verify `npm run validate:ci` no longer needs the legacy exclusion.
