# Repository Harmonization Inventory

## Objective

CareDroid Emergency OS is the active primary product. The repository also contains historical general healthcare platform code, Android/mobile code, integration tooling, backend modules, tests, scripts, and future-module review areas.

## Discovered Project Roots

| Path | Language | Framework / Build | Package Manager | Purpose | Entry Point | Build Command | Runtime Target | Status | Emergency OS Relevance | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | JS/TS/React | Vite React SPA | npm, `package-lock.json` | Primary web/SaaS app | `index.html`, `src/main.jsx`, `src/App.jsx` | `npm run build` | Browser / Vercel static app | Active | Primary Emergency OS application | Stay, continue consolidating around `src/components/AppShell.tsx` and `/emergency/*` |
| `/backend` | TypeScript | NestJS | npm, `backend/package-lock.json` | API, auth, chat, clinical tools, platform modules | `backend/src/main.ts`, `backend/src/app.module.ts` | `cd backend && npm run build` | Node.js API | Active but broad | Required backend surface, but many endpoints are legacy platform | Keep; document `/api/emergency/*` target and exceptions |
| `/mcp` | JavaScript | MCP stdio bridge | npm, `mcp/package-lock.json` | Cursor/MCP bridge to clinical tools API | `mcp/src/server.mjs` | `cd mcp && npm test` | Local stdio integration | Future module | Useful integration tooling, not active app runtime | Keep isolated or archive after product decision |
| `/android` | Kotlin/Java/Gradle | Native Android + Capacitor files | Gradle | Historical/mobile app and packaged web shell | `android/app/src/main/.../MainActivity.kt` | root scripts `android-debug`, `android-release` | Android | Future module | Not imported by active web build | Mark `MOBILE_FUTURE_MODULE`; do not import into active web app |
| `/backend/ml-services/nlu` | Python/service assets | Dockerfile + env example | Unknown from root scan | ML/NLU service artifact | Needs review | Docker build likely | Service container | Manual review | Could support AI routing, not active route dependency | `NEEDS_MANUAL_REVIEW` |
| `/src/features/future-modules/_review` | JSX | React archived/review code | root npm | Existing future-module review area | none active | none | None unless imported | Review/archive | Contains copied historical workspace/emergency pages | Keep as review archive, avoid active imports |
| `/archive/_review` | Markdown | Manual archive manifest | none | Review manifest for separate app/package relocation | n/a | n/a | n/a | Review/archive | Documents high-risk archive candidates | Stay |

## Core Config Inventory

| Area | Files Found | Assessment |
|---|---|---|
| Package manifests | `package.json`, `backend/package.json`, `mcp/package.json` | Three package roots: primary web, backend API, MCP tooling |
| Lockfiles | `package-lock.json`, `backend/package-lock.json`, `mcp/package-lock.json` | npm-only repo; no Yarn or pnpm lockfiles found |
| TypeScript configs | `tsconfig.json`, `tsconfig.frontend.json`, `backend/tsconfig.json`, `backend/tsconfig.eslint.json` | Frontend and backend configs are separate and valid |
| Web config | `vite.config.js` | Single active Vite config; no Next config found |
| Mobile config | `capacitor.config.json`, Android Gradle files | Mobile packaging present; active Vite build excludes Capacitor deps |
| Deployment config | `vercel.json`, `Dockerfile`, `backend/Dockerfile`, `Dockerfile.android`, `docker-compose.yml` | Vercel targets active Vite app; Docker configs need product review |
| Env examples | `.env.example`, `backend/.env.example`, `backend/.env.rag.example`, `backend/ml-services/nlu/.env.example` | Multiple env strategies; document as web/backend/service-specific |

## Active Emergency OS Code

| Path | Classification | Notes |
|---|---|---|
| `src/App.jsx` | `ACTIVE_EMERGENCY_OS` | Active BrowserRouter route root now redirects to `/emergency/whiteboard` |
| `src/main.jsx` | `ACTIVE_EMERGENCY_OS` | Active React mount and startup simulation now use `src/engine/simulation.ts` |
| `src/components/AppShell.tsx` | `ACTIVE_EMERGENCY_OS` | Active layout shell, shortcut handler, command palette, engines lifecycle |
| `src/components/Sidebar.tsx` | `ACTIVE_EMERGENCY_OS` | Active Emergency OS navigation rail |
| `src/components/Header.tsx` | `ACTIVE_EMERGENCY_OS` | Active header; duplicate shortcut handling removed |
| `src/pages/emergency/index.tsx` | `ACTIVE_EMERGENCY_OS` | Active whiteboard route |
| `src/components/PatientCard.tsx` | `ACTIVE_EMERGENCY_OS` | Active patient card |
| `src/components/PatientDetailPanel.tsx` | `ACTIVE_EMERGENCY_OS` | Active detail panel |
| `src/components/QuickIntake.tsx` | `ACTIVE_EMERGENCY_OS` | Active intake modal |
| `src/components/CopilotPanel.tsx` | `ACTIVE_EMERGENCY_OS` | Active ED Copilot side panel |
| `src/components/calculators/*.tsx` | `FUTURE_MODULE` / `SHARED_LIBRARY` | Valuable Emergency OS clinical tools, but no longer mounted as a standalone active route |
| `src/store/emergencyStore.ts` | `ACTIVE_EMERGENCY_OS` | Active Emergency OS store and seed data |
| `src/types/emergency.ts` | `ACTIVE_EMERGENCY_OS` | Active Emergency OS domain model |
| `src/engine/*.ts` | `ACTIVE_EMERGENCY_OS` | Simulation, reassessment, capacity engines |

## Shared Library Candidates

| Path | Classification | Notes |
|---|---|---|
| `src/services/apiClient.js` | `SHARED_LIBRARY` | Central frontend API client. Added unauthenticated protected API short-circuit to avoid local dev console noise |
| `src/services/clinicalChatService.js` | `SHARED_LIBRARY` | Existing chat API layer used by ED Copilot |
| `src/contexts/*` | `SHARED_LIBRARY` / `NEEDS_MANUAL_REVIEW` | Many legacy providers still wrap the active app; safe to reduce in a later pass |
| `src/components/ErrorBoundary.jsx` | `SHARED_LIBRARY` | Active app boundary |
| `src/components/notifications/NotificationToast.jsx` | `SHARED_LIBRARY` | Active notification container |

## Backend Required Areas

| Path | Classification | Notes |
|---|---|---|
| `backend/src/modules/chat` | `BACKEND_REQUIRED` | Chat service powers ED Copilot; `/api/chat/*` remains a documented backend exception while `/api/emergency/copilot/*` is normalized |
| `backend/src/modules/auth` | `BACKEND_REQUIRED` | Auth endpoints are documented exception to `/api/emergency/*` |
| `backend/src/modules/clinical`, `clinical-intelligence`, `medical-control-plane` | `BACKEND_REQUIRED` | Clinical tools and AI orchestration candidates |
| `backend/src/modules/fleet`, `live-tracking` | `BACKEND_REQUIRED` / `FUTURE_MODULE` | EMS/fleet operations, not yet fully `/api/emergency/*` |
| `backend/src/modules/audit`, `notifications`, `users`, `tenant-context` | `BACKEND_REQUIRED` | Cross-cutting infrastructure exceptions |

## Legacy / Future / Prototype Areas

| Path | Classification | Notes |
|---|---|---|
| `src/layout/AppShell.jsx` | `LEGACY_PLATFORM_ARTIFACT` | Large historical shell; not mounted by `src/App.jsx` |
| `src/components/EmergencyWhiteboard.jsx` | `LEGACY_PLATFORM_ARTIFACT` | Older whiteboard implementation; not active |
| `src/components/PatientCard.jsx` | `LEGACY_PLATFORM_ARTIFACT` | Deleted earlier in Emergency OS build; tests still reference old path |
| `src/components/NewPatientIntake.jsx` | `LEGACY_PLATFORM_ARTIFACT` | Replaced by `QuickIntake.tsx` in active app |
| `src/components/PediatricDrugCalculator.jsx` | `LEGACY_PLATFORM_ARTIFACT` | Replaced by `calculators/PediatricDrugCalc.tsx` in active app |
| `src/pages/fleet/*` | `FUTURE_MODULE` | Fleet product artifacts; not active Emergency OS routes |
| `src/pages/commercial/*`, organization/product/customer pages | `LEGACY_PLATFORM_ARTIFACT` | General SaaS/platform artifacts; unmounted from active route tree |
| `src/components/EMSPipeline.jsx`, `src/components/ReferralPanel.jsx`, `src/components/QueueIntelligencePanel.jsx` | `FUTURE_MODULE` / `LEGACY_PLATFORM_ARTIFACT` | Older root-store panels; no longer mounted by active `src/App.jsx` |
| `src/pages/tools/*` calculator library | `SHARED_LIBRARY` / `FUTURE_MODULE` | Valuable clinical calculator inventory, but removed from active standalone routing until curated into Emergency OS |
| `android/` | `MOBILE_FUTURE_MODULE` | Native/mobile code preserved but disconnected from active web imports |
| `backend/ml-services/nlu/` | `NEEDS_MANUAL_REVIEW` | Separate service artifact |
| `caredroid.sqlite` | `NEEDS_MANUAL_REVIEW` | Untracked local database artifact; do not commit without decision |

## Harmonized Active Route Contract

Mounted active routes now normalize to:

- `/emergency/whiteboard`
- `/emergency/patients`
- `/emergency/ems`
- `/emergency/intake`
- `/emergency/queues`
- `/emergency/reassessment`
- `/emergency/capacity`
- `/emergency/boarding`
- `/emergency/referrals`
- `/emergency/copilot`
- `/emergency/analytics`
- `/emergency/settings`

Legacy roots `/`, `/emergency`, `/settings`, `/dashboard`, `/home`, `/app`, `/workspace`, `/mobile`, `/general-healthcare`, and `/tools/*` redirect into the Emergency OS route tree, with generic/platform roots landing on `/emergency/whiteboard`.

## Detailed Collision Inventory

| Collision | Files / Roots | Classification | Resolution |
|---|---|---|---|
| Multiple `package.json` files | `package.json`, `backend/package.json`, `mcp/package.json` | `ACTIVE_EMERGENCY_OS`, `BACKEND_REQUIRED`, `FUTURE_MODULE` | Keep root web app and backend active; keep MCP isolated from deployed app |
| Multiple lockfiles | `package-lock.json`, `backend/package-lock.json`, `mcp/package-lock.json` | `NEEDS_MANUAL_REVIEW` | npm-only, but package roots remain separate |
| Multiple TypeScript configs | `tsconfig.json`, `tsconfig.frontend.json`, `backend/tsconfig*.json` | `SHARED_LIBRARY` / `BACKEND_REQUIRED` | Frontend/backend separation retained |
| Multiple app shells | `src/components/AppShell.tsx`, `src/layout/AppShell.jsx` | `ACTIVE_EMERGENCY_OS`, `LEGACY_PLATFORM_ARTIFACT` | Active app mounts only `src/components/AppShell.tsx` |
| Multiple route systems | `src/App.jsx`, `src/config/routes.config.js`, route-health inventories | `ACTIVE_EMERGENCY_OS` / `NEEDS_MANUAL_REVIEW` | Active router is `src/App.jsx`; config remains audit/compatibility metadata |
| Multiple sidebars / headers | `src/components/Sidebar.tsx`, `src/components/Header.tsx`, legacy shell internals, Android `Sidebar.kt` | `ACTIVE_EMERGENCY_OS`, `LEGACY_PLATFORM_ARTIFACT`, `MOBILE_FUTURE_MODULE` | Active web app mounts one sidebar/header pair |
| Duplicated Emergency domain models | `src/types/emergency.ts`, `types/emergency.ts`, `src/store/emergencyStore.ts`, `store/emergencyStore.ts` | `ACTIVE_EMERGENCY_OS`, `FUTURE_MODULE` | Active routes now use `src/types`/`src/store`; root store/type pair is isolated from active route imports |
| Android/Kotlin/Gradle code | `android/`, `Dockerfile.android`, `capacitor.config.json` | `MOBILE_FUTURE_MODULE` | Preserved but disconnected from active web routing/build imports |
| React Native / Expo | none found | n/a | No Expo or React Native app root discovered |
| Serverless functions | none found | n/a | No dedicated `functions/`, Netlify, or Vercel serverless function root discovered |
| API clients | `src/services/apiClient.js`, many service wrappers | `SHARED_LIBRARY` / `NEEDS_MANUAL_REVIEW` | Central `apiClient` remains convention; Emergency OS wrappers use `/api/emergency/*` where available |
| Backend services/controllers | `backend/src/modules/*`, `backend/src/api/*.routes.ts` | `BACKEND_REQUIRED` / `LEGACY_PLATFORM_ARTIFACT` | Conditional Emergency OS routers mount only under `/api/emergency/*`; broad Nest modules remain documented exceptions |
