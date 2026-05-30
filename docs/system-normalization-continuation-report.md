# System Normalization Continuation Report

## 1. What Was Fragmented

- Auth entry still had edge-case traps: protected routes dropped the attempted destination, and the OAuth callback could be treated like a public-only page.
- Route constants did not enumerate the full compact clinical OS route surface, even though many routes existed in `App.jsx`.
- Advanced navigation grouped audit, regulatory, review, and assets unevenly, and `/audit-logs` was still treated as an active destination in several places.
- `/tools` had broad inventory wiring, but its discovery buckets did not match the product model exactly.
- Profile segmentation could make operations tools feel missing for non-operations clinicians instead of keeping them discoverable with profile-aware ordering.
- Backend/frontend contract copy still described executor clients as page-local `apiFetch` calls instead of the normalized orchestrator client.

## 2. What Was Normalized

- `/auth` remains canonical, with `/login`, `/signin`, `/sign-in`, and other auth aliases redirecting there.
- Protected-route redirects now preserve the attempted route in a safe `next` query and route successful auth back to that destination unless it points back to auth.
- `/auth-callback` and `/auth/callback` can process tokens even if a session already exists.
- `/audit` is the canonical audit route; `/audit-logs` is now a redirect alias.
- Sidebar Advanced now exposes Developer Catalog, System Health, Governance, Security, Audit, Regulatory, Human Review, and Assets as separate canonical destinations.
- `/tools` now includes the requested discovery buckets: All, Recommended for Me, Calculators, Diagnostics, AI Workflows, Maps & IoT, Operations, Favorites, and Recent.

## 3. Canonical Routes

Canonical route constants now include:

- User routes: `/dashboard`, `/assistant`, `/tools`, `/tools/calculators`, `/tools/calculators/:slug`, `/hospital-map`, `/medical-iot`, `/devices`, `/fleet/map`, `/live-map`, `/digital-twin`, `/profile`, `/profile/settings`, `/profile/tool-preferences`, `/settings`, `/notifications`, `/timeline`, `/workflows`, `/search`.
- Advanced routes: `/tools/catalog`, `/system-health`, `/ai-governance`, `/security`, `/audit`, `/regulatory`, `/human-review`, `/assets`.
- Aliases: auth aliases to `/auth`, calculator alias `/calculators` to `/tools/calculators`, map/fleet aliases to canonical map routes, and `/audit-logs` to `/audit`.

## 4. Canonical Navigation

- Primary sidebar remains compact: Dashboard, Assistant, Tools, Profile, Settings.
- Operations is a dedicated sidebar section: Digital Twin, Live Map, Hospital Map, Medical IoT, Devices, Fleet Map.
- Advanced is collapsed and permission-aware: Developer Catalog, System Health, Governance, Security, Audit, Regulatory, Human Review, Assets.
- Quick Command continues to consume the canonical navigation projection and inventory projection.

## 5. Configs Normalized

- `src/config/routes.config.js` is the canonical route and alias map.
- `src/navigation/primaryNavigation.js` remains the active navigation definition, re-exported by `src/config/navigation.config.js`.
- `src/data/toolInventory.js` remains the normalized tool inventory projection.
- `src/data/profileToolSegmentation.js` owns profile-aware filtering and recommendation logic.
- `src/config/layout.config.js` and `src/config/theme.tokens.js` remain the layout/theme contract sources.

## 6. UX Simplifications

- The auth page keeps the demo entry visible when demo/local bypass is exposed.
- Dashboard remains the main entrance and links into assistant, tools, calculators, operations, notifications, and system health.
- `/tools` is the canonical broad library; `/tools/calculators` remains a focused calculator view.
- Profile segmentation now prioritizes recommendations without hiding operations visibility entirely.

## 7. Layout / Scroll Fixes

- Existing `AppShell` ownership is preserved: `AppShell` owns viewport layout, `.app-shell-page-body` owns primary page scroll, and Sidebar scrolls internally.
- The continuation pass did not add duplicate full-screen page shells.
- Existing layout regression tests still cover root scroll, sidebar scroll, compact chrome offsets, and horizontal overflow clipping.

## 8. Backend / Frontend Wiring Fixes

- Backend executor contract metadata now points to `src/services/clinicalOrchestratorApi.js` and `executeClinicalTool`.
- The direct POST executor set remains intentionally narrow: SOFA, drug interactions, and lab interpreter.
- Frontend-only and demo/local operations tools remain surfaced through route and inventory metadata rather than claiming unsupported POST executors.

## 9. Tests Added / Updated

- Canonical route config now asserts the compact clinical OS route surface and `/audit-logs` alias.
- Navigation tests now assert the expanded Advanced group and canonical `/audit`.
- Tools overview tests now assert the requested AI-first discovery buckets.
- Profile segmentation tests now assert operations discoverability without removing fleet/operator prioritization.
- Auth flow tests now assert protected redirects preserve auth return targets.

## 10. Remaining Risks

- `App.jsx` still owns a large route list; further extraction would reduce maintenance risk but was not necessary for this pass.
- Some legacy governance subroutes still render the governance workspace rather than redirecting to top-level advanced routes because existing smoke coverage depends on them.
- Full frontend, backend, responsive, and production build checks should be run before release; this pass has focused targeted coverage so far.
