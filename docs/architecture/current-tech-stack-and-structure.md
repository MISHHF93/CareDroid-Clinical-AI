# Current Tech Stack And Structure

Generated: 2026-06-12

## Actual Tech Stack Found

- Framework: root React 18 single page app, not Next.js. The active frontend is `src/` and is mounted by `src/main.jsx`.
- Frontend routing system: `react-router-dom` v6 with `BrowserRouter`, `Routes`, and `Route` in `src/App.jsx`. Route definitions are an in-file route object array; stable paths and aliases are centralized in `src/config/routes.config.js`.
- Backend framework: NestJS 10 in `backend/src`, bootstrapped by `backend/src/main.ts`. The Nest HTTP adapter is Express.
- Additional backend API pattern: optional Express routers in `backend/src/api/*.routes.ts` are mounted from `backend/src/main.ts` only when `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Database/ORM: TypeORM with SQLite as the default development database and PostgreSQL when configured. Optional Emergency OS Mongoose models live in `backend/src/models`.
- Package manager: npm, with `package-lock.json`, `backend/package-lock.json`, and `mcp/package-lock.json`.
- Runtime baseline: Node 20+ for root and backend tooling, captured by `.node-version` and package `engines`.
- Build tool: Vite for the frontend, Nest CLI/TypeScript for the backend.
- Styling system: CSS files and CSS custom properties under `src/styles`, `src/index.css`, `src/globals.css`, `src/layout/AppShell.css`, and component CSS. `tailwind.config.ts` exists, but the active UI is primarily CSS/token based rather than Tailwind utility based.
- Auth system: frontend `UserContext`, `AUTH_CONFIG`, dev auth bypass helpers, JWT bearer storage, tenant headers, and backend Nest `AuthModule` with Passport/JWT/OAuth strategies and authorization guards.
- State management: Zustand stores in `store/`, especially `store/emergencyStore.ts` and `store/featureStore.ts`, plus React context providers in `src/contexts`.
- API client pattern: canonical frontend request helpers live in `src/services/apiClient.js`; URL normalization lives in `src/config/apiEnv.js` and `src/config/api.config.js`; root API environment values are parsed by `src/config/appConfig.js`.
- Deployment config: `vercel.json` declares Vite, `npm ci`, `npm run validate:vercel-env`, and `npm run build`; root Vite output is `dist`.

## Folder Structure

- `src/`: root React frontend, routes, contexts, components, pages, config, services, styles, tests, and data inventories.
- `src/layout/`: active application shell. `src/layout/AppShell.jsx` is the active shell.
- `src/config/`: frontend configuration for routes, navigation, API, environment projection, feature flags, layout, auth, entitlements, build info, and workspace projection.
- `src/components/`: active Emergency OS components, command palette, chat, whiteboard, EMS, referral, queue, reassessment, and shared UI.
- `src/pages/`: lazy-loaded pages, including active Emergency OS pages in `src/pages/emergency`.
- `src/services/`: API clients and frontend service adapters. `src/services/apiClient.js` is the canonical low-level fetch/axios helper.
- `store/`: Zustand state stores for Emergency OS and feature flags.
- `engine/`: Emergency OS engines for patient journey, capacity, reassessment, and simulation.
- `types/`: shared frontend TypeScript domain types, including `types/emergency.ts`.
- `backend/src/`: NestJS backend.
- `backend/src/modules/`: Nest feature modules, controllers, services, DTOs, and TypeORM entities.
- `backend/src/api/`: optional Express Emergency OS routers mounted behind `ENABLE_MONGOOSE_EMERGENCY_OS`.
- `backend/src/models/`: Mongoose Emergency OS models (`Patient`, `PatientJourney`, `SmartIntake`).
- `backend/src/services/`: singleton services for optional Express Emergency OS runtime, now exported through `backend/src/services/index.ts`.
- `config/`: observability and deployment-adjacent config for Prometheus, Grafana, Alertmanager, Kibana, and Logstash.
- `e2e/`: Playwright suites.
- `docs/architecture/`: architecture reports and audit artifacts.

## Current Route Tree

Active normalized Emergency OS routes:

- `/` redirects to `/emergency/whiteboard`.
- `/emergency` redirects to `/emergency/whiteboard`.
- `/emergency/whiteboard` renders `EmergencyWhiteboard`.
- `/emergency/patients` renders `EmergencyWhiteboard`.
- `/emergency/ems` renders `EMSPipeline` behind `ems_pipeline`.
- `/emergency/intake` renders `SmartIntake`.
- `/emergency/queues` renders `EmergencyQueueRoute` behind `queue_intelligence`.
- `/emergency/reassessment` renders `EmergencyWhiteboard`.
- `/emergency/capacity` renders `EmergencyCapacityRoute` behind `capacity_intelligence`.
- `/emergency/boarding` renders `EmergencyCapacityRoute` behind `capacity_intelligence`.
- `/emergency/referrals` renders `ReferralPanel` behind `referral_intelligence`.
- `/emergency/copilot` opens the persistent ED Copilot panel and redirects to `/emergency/whiteboard`.
- `/emergency/analytics` renders `EmergencyAnalytics`.
- `/emergency/settings` renders `SettingsRoute`.
- `/settings/features` renders `SettingsFeaturesRoute`.
- `*` redirects to `/emergency/whiteboard`.

Legacy and future routes:

- Auth aliases from `AUTH_PATH_ALIASES` redirect to `/emergency/whiteboard`.
- Duplicate and legacy app paths from `DUPLICATE_ROUTE_REDIRECTS` redirect into the normalized Emergency OS routes.
- `PROTECTED_ROUTE_ALIAS_REDIRECTS` in `src/config/routes.config.js` redirects canonical aliases into active routes.
- Workspace legacy paths (`/workspace/:workspaceId` and `/workspace/:workspaceId/:subpage`) route through `WorkspaceRouteRedirect`.
- `FUTURE_RELEASE_ROUTES` are kept deep-linkable but redirect to `/emergency/whiteboard`.

## Current Layout Tree

- `src/main.jsx`
  - `React.StrictMode`
    - `App`
      - `BrowserRouter`
        - `ThemeProvider`
        - `UserProvider`
        - `NotificationProvider`
        - `WorkspaceProvider`
        - `CostTrackingProvider`
        - `ToolPreferencesProvider`
        - `TenantContextProvider`
        - `UserIdentityProvider`
        - `OrganizationContextProvider`
        - `WhiteLabelProvider`
        - `ConversationProvider`
        - `SystemConfigProvider`
        - `OfflineProvider`
        - `ErrorBoundary`
          - `Suspense`
            - `AppRoutes`
              - protected pages are wrapped once by `AppShellPage`
                - `src/layout/AppShell.jsx`
                  - sidebar/navigation rail
                  - header
                  - command palette
                  - drawers/overlays
                  - one `<main data-layout-role="MainContent">`
                  - persistent ED Copilot panel

No active page-level nested `AppShell`, duplicate `Sidebar`, or duplicate `Header` was found in the active Emergency OS route tree.

## Current Navigation Structure

- Active sidebar config: `APP_SHELL_NAV_ITEMS` in `src/config/navigation.config.js`.
- The sidebar item labels/icons are resolved in `src/layout/AppShell.jsx` from `FEATURE_REGISTRY_BY_ID`.
- Compatibility navigation exports remain in `src/navigation/primaryNavigation.js`; that file re-exports from `src/config/navigation.config.js`.
- `PRIMARY_NAV_ITEMS`, `QUICK_COMMAND_NAV_ITEMS`, and related exported navigation groups still exist for compatibility and report/test consumers, but active AppShell sidebar items come from `APP_SHELL_NAV_ITEMS`.
- Command palette route commands are currently defined inside `src/components/CommandPalette.jsx`.
- Search registry/discovery is currently in `src/data/searchFirstDiscovery.js`, which draws from navigation, workspace, asset, marketplace, simulation, protocol, automation, and platform data sources.

## Current API Structure

Frontend:

- `src/config/appConfig.js` parses `VITE_API_URL` and `VITE_WS_URL`.
- `src/config/apiEnv.js` exposes `normalizeApiPath`, `resolveApiRoot`, and `resolveWebSocketOrigin`.
- `src/config/api.config.js` re-exports API helpers and defines `API_ROUTES`.
- `src/services/apiClient.js` builds request URLs, attaches auth and tenant headers, parses JSON, and exposes axios/fetch helpers.
- Feature clients live under `src/services/*Api.js`.
- Frontend API inventory is documented in `src/data/frontendApiCallsInventory.js`.

Backend:

- Nest global prefix is `/api`, with `/health` excluded.
- Nest controllers live in `backend/src/modules/**`.
- Canonical backend route inventory lives in `src/data/backendHttpRouteInventory.js`.
- Optional Mongoose Emergency OS Express routes are:
  - `/api/capacity`
  - `/api/copilot`
  - `/api/ems`
  - `/api/emergency/intake`
  - `/api/reassessment`
- Swagger is mounted via `SWAGGER_DOCS_PATH` from `backend/src/server-routes`.

## Current Database And Model Structure

- TypeORM is initialized in `backend/src/app.module.ts`.
- Development defaults to SQLite (`SQLITE_PATH` or `caredroid.dev.sqlite`) when no explicit PostgreSQL config is present.
- PostgreSQL config is loaded from `backend/src/config/database.config.ts` and `backend/src/config/database-url.config.ts`.
- TypeORM entities are spread through `backend/src/modules/**/entities`.
- Mongoose is only connected by `registerEmergencyMongooseRuntime` when `ENABLE_MONGOOSE_EMERGENCY_OS=true`.
- Mongoose Emergency OS models are in `backend/src/models/Patient.ts`, `backend/src/models/PatientJourney.ts`, and `backend/src/models/SmartIntake.ts`.

## Current Feature And Module Structure

Active Emergency OS feature root is distributed across:

- Routes: `src/App.jsx` and `src/config/routes.config.js`.
- Navigation: `src/config/navigation.config.js`.
- Shell: `src/layout/AppShell.jsx` and `src/layout/AppShell.css`.
- State: `store/emergencyStore.ts`.
- Types: `types/emergency.ts`.
- Engines: `engine/journeyEngine.ts`, `engine/reassessmentEngine.ts`, `engine/capacityEngine.ts`, `engine/simulation.ts`.
- Pages/components: `src/components/EmergencyWhiteboard.jsx`, `src/components/EMSPipeline.jsx`, `src/components/QueueIntelligencePanel.jsx`, `src/components/ReferralPanel.jsx`, `src/pages/emergency/SmartIntake.jsx`, `src/pages/emergency/EmergencyAnalytics.jsx`, `src/pages/emergency/EmergencySettings.jsx`.
- Backend optional runtime: `backend/src/api`, `backend/src/services`, and `backend/src/models`.

Broader platform modules remain imported by `backend/src/app.module.ts`, including platform assets, product catalog, fleet, simulation, governance, regulatory, telemetry, hospital map, memory, training, and evaluation.

## Current Config Files

- Root package/build/test: `package.json`, `package-lock.json`, `vite.config.js`, `vitest.config.js`, `tsconfig.json`, `tsconfig.frontend.json`, `eslint.config.js`, `.prettierrc`.
- Backend package/build/test: `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/tsconfig.eslint.json`, `backend/eslint.config.mjs`, `backend/.prettierrc`, `backend/src/config/*.ts`.
- Frontend app config: `src/config/appConfig.js`, `src/config/env.config.js`, `src/config/apiEnv.js`, `src/config/api.config.js`, `src/config/routes.config.js`, `src/config/navigation.config.js`, `src/config/workspace.config.js`, `src/config/featureFlags.config.js`, `src/config/layout.config.js`, `src/config/auth.config.js`.
- Deployment/e2e/mobile: `vercel.json`, `playwright.config.mjs`, `playwright.android.config.mjs`, `playwright.production.config.mjs`, `playwright.canonical-routes.config.mjs`, `capacitor.config.json`.
- Styling tokens: `tailwind.config.ts`, `src/config/theme.tokens.js`, and CSS files under `src/styles`.

## Current Aliases And Import Conventions

- Frontend TypeScript/Vitest alias: `@/*` maps to `src/*`.
- Backend TypeScript/Jest aliases: `@/*`, `@modules/*`, `@common/*`, and `@config/*`.
- Active root JS/JSX mostly uses relative imports.
- Backend Nest files use both relative imports and configured aliases in tests/build tooling.
- No separate `frontend/` package or `frontend/tsconfig.json` exists.

## Current Build, Test, Lint, And Typecheck Commands

- Local full-stack dev: `npm start` or `npm run dev:fullstack` starts the Vite frontend and Nest backend together with local SQLite defaults.
- Frontend dev: `npm run dev:web` or `npm run dev`.
- Frontend build: `npm run build`.
- Frontend typecheck: `npm run typecheck:frontend`.
- Frontend lint: `npm run lint`.
- Frontend tests: `npm run test:run` or scoped Vitest commands.
- Backend dev: `npm run dev:api`, `npm run backend:dev`, or `cd backend && npm run start:dev`.
- Backend build: `npm run backend:build` or `cd backend && npm run build`.
- Backend lint: `cd backend && npm run lint`.
- Backend tests: `cd backend && npm test`.
- App-only Docker stack: `npm run compose:app:build`.
- Optional ML Docker stack: `npm run compose:app:ml`.
- Full available CI command: `npm run validate:ci`.

## Mismatches Between Intended Emergency OS Architecture And Actual Codebase

- The intended active surface is the 12-route Emergency OS set, but `src/config/routes.config.js`, `src/App.jsx`, and `src/config/navigation.config.js` still retain many future/legacy platform paths for compatibility.
- The active app uses one `AppShell`, one shell-owned sidebar, and one shell-owned header, but compatibility navigation groups remain exported from `src/config/navigation.config.js`.
- Command palette route commands are defined directly inside `src/components/CommandPalette.jsx`, not in a separate registry file.
- Search discovery remains broad and imports platform/future module registries from `src/data/searchFirstDiscovery.js`; it filters some future routes but is not Emergency OS-only.
- Workspace config is a projection over `src/data/workspaceArchitecture.js`; legacy `/workspace/emergency/*` redirects remain for deep links.
- API base configuration is centralized through `appConfig`, `apiEnv`, `api.config`, and `apiClient`, but feature services still import these helpers in different ways.
- Optional Express Emergency OS backend routes are not mounted by default; they require `ENABLE_MONGOOSE_EMERGENCY_OS=true` and MongoDB config.
- The backend still imports many healthcare super-platform modules in `AppModule`, so they are not safe to delete or blindly archive.
- `tailwind.config.ts` exists, but active styling is CSS/token based, so Tailwind is not the practical styling source of truth.
