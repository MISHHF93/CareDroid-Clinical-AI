# CareDroid Design Language and Navigation Normalization Report

Generated: 2026-05-30

## 1. Design System Implemented

CareDroid now has a clearer shared design-language contract in `src/styles/design-tokens.css` and `src/layout/designTokens.js`.

- Typography hierarchy: display, heading, subheading, body, small, caption, label, helper, and mono tokens.
- Spacing hierarchy: `xs`, `sm`, `md`, `lg`, `xl`, and `2xl` semantic spacing aliases.
- Card primitives: standard, dashboard, tool, calculator, and alert card padding and surface classes.
- State primitives: shared empty, loading, and error blocks.
- Existing shared primitives remain token-native for buttons, badges, inputs, cards, and alerts.
- Responsive acceptance widths remain codified for 320, 360, 390, 412, 430, 768, 1024, 1280, and 1440 px, with additional QA widths retained.

## 2. Navigation Changes

The visible navigation model is now split into one product-level architecture.

- Primary navigation: Dashboard, AI Assistant, Tools, Profile, Settings.
- Operations navigation: Digital Twin, Hospital Map, Medical IoT, Fleet.
- Advanced navigation: Developer Catalog, System Health, Governance, Security, Audit Logs.
- Workspace and Devices remain searchable launch destinations in Quick Command, but no longer compete with the primary sidebar model.
- Mobile bottom navigation now mirrors the primary navigation rather than exposing Workspace as a competing primary destination.
- Sidebar rendering now has separate Primary, Operations, and Advanced sections.

## 3. Route Fixes

Route health now understands visible Operations and Advanced navigation entries.

- `src/routing/routeHealth.js` imports Primary, Operations, and Advanced navigation groups.
- Navigation-visible routes such as `/tools/catalog`, `/system-health`, `/ai-governance`, `/security`, and `/audit-logs` are treated as active navigation destinations instead of hidden-only routes.
- The generated route matrix now includes route, component, navigation entry, inventory entry, backend contract, health state, and source.
- Backend contract hints were added for core app routes backed by known inventory entries, including chat, profile/settings, hospital map, medical IoT, fleet, audit, governance, security, and system health.

Core route matrix excerpt:

```text
/dashboard -> CommandDashboard -> Dashboard -> inventory: none -> backend: /api/profile/me, /api/personalization/me/recommendations
/assistant -> Dashboard chat viewport -> AI Assistant -> inventory: none -> backend: /api/chat/message, /api/chat/intent-classify
/tools -> ToolsOverview -> Tools -> inventory: tool routes -> backend: /api/chat/message
/tools/calculators -> Calculators -> Tools -> inventory: calculator routes -> backend: /api/chat/message
/profile -> Profile -> Profile -> inventory: none -> backend: /api/profile/me
/settings -> Settings -> Settings -> inventory: none -> backend: /api/users/profile, /api/profile/me/preferences
/digital-twin -> DigitalTwinPage -> Digital Twin -> inventory: none -> backend: none
/hospital-map -> HospitalMapDashboard -> Hospital Map -> inventory: none -> backend: /api/hospital-map/floors, /api/hospital-map/devices, /api/hospital-map/rooms
/medical-iot -> MedicalIotDashboard -> Medical IoT -> inventory: none -> backend: /api/medical-iot/snapshot
/fleet/map -> FleetLiveMap -> Fleet -> inventory: fleet routes -> backend: /api/fleet/vehicles/live, /api/fleet/routes/active
/tools/catalog -> ClinicalToolCatalog -> Developer Catalog -> inventory: none -> backend: none
/system-health -> PlatformGovernanceWorkspace -> System Health -> inventory: none -> backend: /health, /api/config/system
/ai-governance -> PlatformGovernanceWorkspace -> Governance -> inventory: none -> backend: /api/ai-governance/summary, /api/platform-governance/summary
/security -> PlatformGovernanceWorkspace -> Security -> inventory: none -> backend: /api/security/summary, /api/governance/ai-security/summary
/audit-logs -> AuditLogs -> Audit Logs -> inventory: none -> backend: /api/audit/logs, /api/audit/statistics
```

## 4. Theme Changes

The theme system remains semantic and now uses blue as the product accent.

- Light mode uses a white/neutral surface stack with dark text and subtle borders.
- Dark mode uses near-black and charcoal surfaces with light text and subtle dark borders.
- The product accent is blue in both themes.
- Success, warning, danger, and info remain reserved for status meaning rather than product branding.

## 5. Scrolling Fixes

The app shell continues to use document-level scrolling for normal pages.

- `html` and `body` stay scrollable by default.
- `#root` and the shell clip horizontal overflow.
- Local scroll is preserved for chat/conversation viewports and explicit local scroll utilities.
- Mobile drawer scroll lock remains limited to the active overlay state.

## 6. Responsive Fixes

The responsive contract was tightened rather than rewritten.

- The sidebar keeps drawer behavior below the compact shell breakpoint.
- The authenticated shell now includes a single header slot before route content.
- Primary mobile navigation is canonical and compact.
- The responsive QA matrix now includes the newly promoted source-backed Tier A calculators so no dedicated calculator route is skipped.

## 7. Link Validation

Visible link and route contracts were validated in tests.

- Sidebar links use canonical destinations.
- Calculator routes remain under `/tools/calculators/*`.
- Deprecated route aliases remain redirects rather than duplicate user-facing pages.
- Quick Command includes navigation destinations without duplicating primary tool-card shortcuts.
- Route health reports no blank routes, no unreachable active/hidden routes, no duplicate route ownership conflicts, and no orphan page files.

## 8. Test Results

Validation completed:

- Focused design/navigation suite: `89` tests passed across `10` files.
- Route health rerun after backend-contract refinement: `5` tests passed.
- Lint: `npm run lint` passed with existing warnings, no errors.
- Build: `npm run build` passed, including asset validation and Vite production build.

Commands run:

```text
npx vitest run src/navigation/primaryNavigation.test.js src/components/Sidebar.toolsNavigation.test.js src/layout/AppShell.layout.test.js src/styles/designTokens.test.js src/styles/themeColorSystem.test.js src/styles/compactUxFlattening.test.js src/routing/sectionLinkInventory.test.js src/routing/routeHealth.test.js src/data/responsiveQaMatrix.test.js src/test/mobileScrolling.contract.test.js
npx vitest run src/routing/routeHealth.test.js
npm run lint
npm run build
```

