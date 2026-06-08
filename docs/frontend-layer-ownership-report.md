# Frontend Layer Ownership Report

## Goal

Every UI element should have one clear owner. Components may appear across layers only when the ownership boundary is explicit and the lower layer is a reusable primitive rather than a competing renderer, state source, or control surface.

## Ownership Layers

- `AppShell`: global chrome, routing frame, primary navigation, app-level overlays.
- `Workspace`: active workspace identity, workspace switching, workspace-specific availability and context.
- `Dashboard`: landing and orchestration surfaces that compose workspace and feature summaries.
- `Feature`: route-level product workflows, local feature state, and feature-specific actions.
- `Component`: reusable presentational primitives and focused controls with no competing app ownership.

## Detection Targets

- Duplicate ownership
- Duplicated rendering
- Duplicated state
- Duplicated controls
- Components appearing in multiple layers without an explicit reusable-component reason

## Findings

### 1. Assistant Chat Rendering Had Two Owners

- Locations: `src/pages/Dashboard.jsx`, `src/components/ChatInterface.jsx`
- Duplicate ownership: assistant transcript result rendering, tool-result visualization filtering, and operational result cards were owned by both the routed assistant page and a reusable component.
- Competing layers: `Feature` and `Component`
- Canonical owner: `Component` owns reusable assistant result rendering; the assistant feature owns transcript state, composer state, execution recovery, and route behavior.
- Status: implemented.

### 2. Assistant Page Was Named as a Dashboard

- Locations: `src/pages/Dashboard.jsx`, `src/App.jsx`
- Duplicate ownership: `/dashboard` is owned by `CommandDashboard`, while `/assistant` was implemented by a component named `Dashboard`.
- Competing layers: `Dashboard` and `Feature`
- Canonical owner: `Dashboard` layer owns `/dashboard`; assistant chat is a `Feature` page.
- Status: implemented at symbol/route binding level. The file name remains `Dashboard.jsx` for compatibility with existing imports and tests.

### 3. Tool Card Names Had Competing Meanings

- Locations: `src/components/ToolCard.jsx`, `src/components/ui/CareDroidPrimitives.jsx`, `src/pages/CommandDashboard.jsx`
- Duplicate ownership: result cards, generic primitive tool cards, and command launch cards all used `ToolCard` naming.
- Competing layers: `Component` and `Dashboard`
- Canonical owner: result rendering owns `ToolCard`/`ToolResultBody`; dashboard launch cards use dashboard-specific names; generic primitives remain under `CareDroidPrimitives`.
- Status: implemented for `CommandDashboard` and result body reuse.

### 4. Route Metadata Ownership Is Split

- Locations: `src/App.jsx`, `src/config/routes.config.js`, `src/config/navigation.config.js`
- Duplicate ownership: routing, navigation activation, aliases, labels, and component binding are spread across route config, navigation config, and `App.jsx`.
- Competing layers: `AppShell`, `Feature`, and `Component`
- Canonical owner: `routes.config.js` should own route metadata and aliases; `App.jsx` should bind route records to lazy components.
- Status: documented for a future route-generation pass.

### 5. Workspace Selection Has Multiple Control Surfaces

- Locations: `src/contexts/WorkspaceContext.jsx`, `src/contexts/UserIdentityContext.jsx`, `src/components/WorkspaceSwitcher.jsx`, `src/pages/profile/ProfileWorkspaces.jsx`, `src/pages/tools/ToolsOverview.jsx`, `src/components/QuickCommandLauncher.jsx`
- Duplicate ownership: active workspace selection and switching controls appear in context, profile, tools, shell, and command palette surfaces.
- Competing layers: `Workspace`, `AppShell`, `Feature`, and `Component`
- Canonical owner: `WorkspaceContext` owns active workspace. AppShell owns the global switcher. Feature pages can manage preferences or local filters, but should call the workspace owner rather than maintain alternate switching state.
- Status: documented for follow-up.

### 6. Command Palette Has Cross-Layer Side Effects

- Location: `src/components/QuickCommandLauncher.jsx`
- Duplicate ownership: the component builds command entries, switches workspaces, launches tools, seeds chat, refreshes tenant/identity, and records access.
- Competing layers: `Component`, `Workspace`, `Dashboard`, and `Feature`
- Canonical owner: a command palette model/service should own command indexing and launch effects; the component should own presentation and keyboard interaction.
- Status: documented for follow-up.

### 7. Feature Detail Drawers Duplicate Drawer Chrome

- Locations: `src/pages/LiveTrackingMap.jsx`, `src/pages/fleet/FleetLiveMap.jsx`, `src/pages/HospitalMapDashboard.jsx`, `src/pages/DeviceFleetManagement.jsx`, `src/pages/MedicalIotDashboard.jsx`
- Duplicate ownership: local detail drawers repeat close buttons, empty states, status badges, detail grids, and selected-item panel behavior.
- Competing layers: `Feature` and `Component`
- Canonical owner: `components/ui/Drawer.jsx` owns drawer chrome and behavior; feature pages own selected entity state and domain content.
- Status: documented for follow-up.

### 8. Calculator Primitives Are Reimplemented

- Locations: `src/pages/tools/calculatorPrimitives.jsx`, multiple calculator pages under `src/pages/tools`
- Duplicate ownership: calculator panels, result panels, validation summaries, and calculate/reset control patterns are locally redefined despite shared primitives.
- Competing layers: `Feature` and `Component`
- Canonical owner: `calculatorPrimitives.jsx` owns calculator panel/result primitives; individual calculators own clinical inputs and scoring.
- Status: documented for follow-up.

## Canonical Ownership Decisions

- `AssistantResultRenderer` now owns assistant result rendering, including `tool-result` visualization de-duplication and operational result card rendering.
- `AssistantPage` is now the route symbol for `/assistant`; `CommandDashboard` remains the `/dashboard` owner.
- `CommandDashboard` now uses `CommandToolLaunchCard` for launch cards, avoiding collision with clinical result `ToolCard` ownership.
- `ToolCard` exposes `ToolResultBody`, allowing operational result cards to reuse result content without nesting a second card owner.
- Follow-up ownership boundaries are documented for route metadata, workspace switching, command palette effects, drawer chrome, and calculator primitives.

## Verification

- Lint diagnostics: no errors reported for edited files.
- Focused tests: `npm run test:run -- src/pages/Dashboard.chatLayout.test.jsx src/pages/CommandDashboard.test.jsx src/components/ChatInterface.nlu.test.jsx src/components/ToolCard.test.jsx src/components/chat/OperationalResultCard.test.jsx src/styles/mobilePerformance.test.js`
- Result: 6 test files passed, 75 tests passed.
