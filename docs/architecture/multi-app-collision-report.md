# Multi-App Collision Report

## What Was Found

The repository contains collided systems:

- Active Vite React Emergency OS web app.
- NestJS backend with broad platform modules.
- MCP integration package.
- Native Android/Kotlin app and Capacitor packaging.
- Legacy general healthcare platform pages, dashboards, governance screens, fleet pages, marketplace/commercial pages, and historical shell.
- Existing review archive under `src/features/future-modules/_review`.

## Major Collision Areas

| Area | Active Emergency OS Owner | Colliding / Legacy Area | Status |
|---|---|---|---|
| App shell | `src/components/AppShell.tsx` | `src/layout/AppShell.jsx` | Active shell consolidated; legacy shell unmounted |
| Whiteboard | `src/pages/emergency/index.tsx` | `src/components/EmergencyWhiteboard.jsx` | Active whiteboard consolidated; legacy whiteboard unmounted |
| Patient cards | `src/components/PatientCard.tsx` | `src/components/PatientCard.jsx` | Active TSX card consolidated; legacy JSX card already deleted/unmounted |
| Detail panel | `src/components/PatientDetailPanel.tsx` | legacy nested card/detail implementations | Active detail panel consolidated |
| Intake | `src/components/QuickIntake.tsx` | `src/components/NewPatientIntake.jsx` | Active quick intake consolidated |
| EMS | route-local `EMSRoute` in `src/App.jsx` | `src/components/EMSPipeline.jsx` using root store | Active route no longer mounts root-store panel |
| Queues | route-local `QueueRoute` in `src/App.jsx` | `src/components/QueueIntelligencePanel.jsx` using root store | Active route no longer mounts root-store panel |
| Referrals | route-local `ReferralsRoute` in `src/App.jsx` | `src/components/ReferralPanel.jsx` using root store | Active route no longer mounts root-store panel |
| Pediatric drugs | future calculator modules | `src/components/PediatricDrugCalculator.jsx`, broad `src/pages/tools/*` library | Removed from standalone active route; curate later |
| Navigation | `src/components/Sidebar.tsx` | `src/config/navigation.config.js`, old shell nav | Active sidebar route targets normalized; config remains review/shared |
| Command palette | `src/components/AppShell.tsx` + `src/config/commandPalette.config.js` | old `CommandPalette` | Active keyboard palette now consumes one Emergency OS command registry |
| API client | `src/services/apiClient.js` | multiple service-specific API wrappers | Central client remains; service wrappers need curation |
| Routes | `src/App.jsx` | `src/config/routes.config.js`, route health/test inventories | Active route tree normalized; legacy config remains audit/reference |

## What Was Moved

No directories were moved. High-risk areas are documented in `archive/_review/README.md`.

## What Was Merged

- Emergency OS active routes now mount from one router in `src/App.jsx`.
- Sidebar targets now match the requested normalized `/emergency/*` route family.
- Command palette destinations now match the normalized route family and no longer launch inactive tools/pulse/shift/governance routes.
- Conditional backend Express routers now mount under `/api/emergency/*` only.

## What Was Archived

- Review archive manifest created.
- Existing `_review` future modules retained.

## What Was Removed

- Active `/settings` mounting of the generic platform settings page was removed by redirecting `/settings` to `/emergency/settings`.
- Active `/emergency/tools`, `/emergency/pulse`, `/emergency/shift`, and `/emergency/ai-governance` mounts were removed; unknown `/emergency/*` routes fall back to `/emergency/whiteboard`.
- Duplicate backend `/api/v1/governance` alias was removed.

## Manual Review

- `src/config/routes.config.js` still contains many historical route constants and aliases. It should either be reduced to the Emergency OS route contract or moved to future review after tests are updated.
- `src/config/navigation.config.js` and `src/config/commandPalette.config.js` still contain larger legacy route registries. The active shell does not depend on them.
- Legacy platform pages under `src/pages/` are not mounted in active `src/App.jsx`, but tests and inventory scripts still reference them.

## Risks

- Some audit tests may intentionally validate historical route/config inventories.
- Removing legacy files before updating tests would create false failures unrelated to active Emergency OS runtime.

## Commands Run

- Config/package glob inventory
- Route/layout/navigation source reads
- Active import searches for legacy shell, root store panels, and mobile code
- Frontend/backend validation commands listed in `repository-harmonization-report.md`

## Validation Result

Active route tree consolidated. Typecheck, lint, production build, focused frontend route/navigation tests, backend build/lint/tests, and dependency checks pass. Full frontend suite still fails legacy/audit assumptions and hung after failure output.
