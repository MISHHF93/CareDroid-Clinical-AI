# UX/UI Scrolling and Layout Evaluation

## 1. Executive Summary

CareDroid Clinical AI is already organized around a controlled app-shell scroll model: `html`, `body`, and `#root` are locked, authenticated routes scroll through `.app-shell-page-body`, and chat routes use an internal conversation scrollport. The strongest UX direction is the AI-first command model: dashboard, assistant, tools, calculators, maps, IoT, and fleet surfaces are wired into a single authenticated workspace rather than separate apps.

This pass found no broad need for visual redesign. The safe fixes applied here target medium-width map clipping, long operational label boundaries, and Assistant discoverability from IoT/fleet/map surfaces.

## 2. Global Scrolling Findings

- The global scroll contract is stable: document-level overflow is locked, route-level scroll is owned by `.app-shell-page-body`, and conversation routes opt into `.app-shell-page-body--conversation`.
- Auth and public shells own their own vertical scrollports under the locked root, which avoids hidden sign-in or marketing content.
- Sidebar and mobile drawer content use local vertical scroll, with the closed mobile drawer removed from pointer interaction.
- Chat uses a local message scrollport and a fixed composer within the route, avoiding body scroll traps.
- The main risk found was map canvas clipping: several floor-plan/canvas components used fixed SVG minimum widths but only enabled horizontal scrolling at narrow breakpoints. At tablet/desktop widths after the sidebar inset, this could clip the floor plan or marker layer.

## 3. Component Boundary Findings

- Tool cards, calculator forms, catalog tables, chat bubbles, and sidebar tool labels already have strong `min-width: 0`, wrapping, and local table overflow coverage.
- Dashboard and assistant bubbles protect long generated clinical text with wrapping and contained message widths.
- Calculator forms stack and wrap at mobile breakpoints, and result panels remain inside bordered containers.
- Wide tables are correctly isolated behind local horizontal scrolling wrappers.
- The risk found was long labels and status text in operational map/IoT/fleet pages. A shared boundary guard now applies `min-width: 0`, `max-width: 100%`, and `overflow-wrap: anywhere` to those page families.

## 4. Page-by-Page UX Findings

- Auth page: compact single-column flow, good action clarity, route-level scroll through `AuthShell`; no layout fix needed.
- Dashboard/home: feels like an AI-first command cockpit with compact panels, assistant seeding, tool launch cards, and visible backend/workspace status.
- AI Assistant/chat: the prompt input is obvious, suggested actions are visible, executor previews and result cards provide feedback, and the conversation uses a predictable local scrollport.
- `/tools`: tool library has search/filter controls, compact cards, recent tools, and clear catalog/calculator paths.
- `/tools/calculators` and detail routes: forms are mobile-aware, labels wrap, reset/calculate controls are present, and result panels stay bounded.
- Developer Catalog / Source Audit: table overflow is local, filters wrap, and launch actions are discoverable.
- Fleet dashboard and fleet map: operational cards are compact; fleet map needed the same all-width local map scrolling protection applied in this pass.
- Live map: useful command overview; map canvas now locally scrolls at all widths instead of clipping fixed-width geometry.
- Hospital map: strong operations-detail workflow and existing Ask Assistant action; floor-plan canvas now has all-width local horizontal scrolling.
- Medical IoT dashboard: good telemetry and detail states; now has a direct Ask Assistant entry.
- Device fleet page: clear demo/local feedback and table containment; now has a direct Ask Assistant entry.
- Settings/profile: simple centered pages with mobile stacking; no route-level scroll issue found.
- Fallback/not-found pages: route smoke coverage verifies non-empty fallback/tool-area rendering.

## 5. AI Chatbot Wireframe Findings

- The assistant is easy to find through primary navigation, mobile Quick Command, dashboard prompt seeding, and now map/IoT/fleet hero actions.
- The prompt input is obvious on `/assistant`, with suggested actions and available tools visible above the composer.
- Calculators can launch from the assistant through starter actions, suggestions, and registry launch behavior.
- The dashboard and hospital map already feed context into the assistant flow; Medical IoT, device fleet, and live map now expose a direct Assistant path so the workflow feels less disconnected.
- Tool execution feedback is visible through validation, preview, execution, success, failure, and retry/edit states.
- Remaining opportunity: richer context handoff from every operations panel into Assistant, similar to the hospital map's seeded prompt.

## 6. Responsive Findings

- 320, 360, 390, 412, and 430px: compact app chrome reserves space for menu/command controls, bottom navigation is fixed, calculator forms stack, and controls preserve touch target size.
- 768px: route grids and filters collapse before content clips; sidebars become drawer-style navigation.
- 1024px: map/detail workspaces collapse through existing breakpoints where needed; route scroll remains on `.app-shell-page-body`.
- 1280 and 1440px+: dense multi-column dashboards are stable; fixed-width maps now scroll locally even when a sidebar inset leaves a map panel slightly narrower than the SVG minimum.
- 1440px+: content max-width rules prevent overly wide rows while preserving full-width dashboards where appropriate.

## 7. Interaction Findings

- Buttons and cards generally have hover/focus states, clear disabled states, and useful labels.
- Calculator submit/reset flows are covered by form smoke tests and mobile reset-control checks.
- Chat launch actions provide visible feedback through message insertion, executor cards, toasts, and result panels.
- Map marker clicks open detail panels, and empty/loading/error states are present across map/IoT/fleet routes.
- Demo/local actions on device fleet are visibly labeled and do not silently imply backend writes.
- Remaining opportunity: add seeded Assistant prompts to Medical IoT, live map, and device fleet actions so users carry panel-specific context into Chat.

## 8. Design Language Findings

- The current language is compact, flat, token-driven, and consistent with neutral light/dark surfaces plus accent-colored actions.
- Cards, panels, badges, filters, and buttons use shared app tokens across command, tools, calculator, map, IoT, and fleet routes.
- The older inconsistent areas are mostly legacy warning/lint debt in unrelated components and not part of this visual pass.
- The changes here preserve the existing compact design rather than introducing a new visual direction.

## 9. Fixes Applied

- `src/pages/LiveTrackingMap.css`: made the live map canvas locally horizontally scrollable at all widths and preserved marker-layer height.
- `src/pages/HospitalMapDashboard.css`: made the hospital floor-plan canvas locally horizontally scrollable at all widths and preserved marker-layer height.
- `src/pages/MedicalIotDashboard.css`: made the Medical IoT map canvas locally horizontally scrollable at all widths and preserved marker-layer height.
- `src/pages/fleet/FleetLiveMap.css`: made the fleet map canvas locally horizontally scrollable at all widths and preserved marker-layer height.
- `src/styles/layout-visibility.css`: added shared operational page boundary rules for long map/IoT/fleet labels and reinforced map-canvas local overflow ownership.
- `src/pages/MedicalIotDashboard.jsx`, `src/pages/DeviceFleetManagement.jsx`, and `src/pages/LiveTrackingMap.jsx`: added direct Ask Assistant actions and kept other route actions secondary.
- `src/styles/responsiveUx.test.js`, `src/pages/MedicalIotDashboard.test.jsx`, and `src/pages/DeviceFleetManagement.test.jsx`: added regression coverage for local map scroll and Assistant route availability.

## 10. Remaining Risks

- Browser-level visual review at the exact viewport list is still valuable because jsdom cannot measure real scrollWidth/clientWidth clipping.
- Production build still warns that the calculators chunk is large; this is an existing bundle-size concern, not a layout failure.
- Lint still reports existing warnings in unrelated files, but no lint errors were produced.
- Medical IoT, device fleet, and live map now link to Assistant, but only hospital map currently seeds a detailed Assistant prompt with page-specific context.

## 11. Test Results

- Focused UX/layout tests: `npm run test:run -- src/styles/responsiveUx.test.js src/layout/AppShell.layout.test.js src/pages/MedicalIotDashboard.test.jsx src/pages/DeviceFleetManagement.test.jsx src/pages/HospitalMapDashboard.test.jsx src/test/routePagesSmoke.test.jsx` passed, 6 files and 111 tests.
- Responsive regression: `npm run test:responsive-regression` passed, 11 files and 399 tests.
- Lint: `npm run lint` passed with 0 errors and 108 existing warnings.
- Production build: `npm run build` passed; asset validation passed and Vite built successfully.
