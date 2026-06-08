# Search-First UX Report

Status: implemented

## Goal

Users should find things through:

- Search
- Assistant
- Command palette

Instead of navigation hunting.

## Audit Scope

- Command palette
- Global search
- Assistant launches

## Implementation Scope

- Asset search
- Workflow search
- Simulation search
- Workspace search
- Discovery optimization

## Audit Notes

Inspected the discovery surfaces and data sources:

- `src/components/QuickCommandLauncher.jsx`
- `src/pages/PlatformOSPages.jsx`
- `src/components/ChatInterface.jsx`
- `src/data/platformOperatingSystem.js`
- `src/data/assetInventory.js`
- `src/data/medicalSimulationCatalog.js`
- `src/config/workspace.config.js`

Findings:

- Quick Command already searched routes, workspaces, workspace shortcuts, and tool inventory, but discovery logic was local to the component.
- Global Search used a separate local index from `platformOperatingSystem`, so it did not share ranking or discovery behavior with Quick Command.
- Asset search was partially represented through tool inventory and local artifacts, but mounted platform assets were not exposed through one reusable discovery index.
- Workflow search existed in Global Search through `PLATFORM_WORKFLOWS`, but was not surfaced as a command-palette discovery type.
- Simulation search was mostly available through launchable tool entries, while scenario-level simulation data from `medicalSimulationCatalog` was not searchable in Global Search or Quick Command.
- Workspace search existed in Quick Command and Global Search, but the shared search-first model did not yet make workspace context available to all discovery surfaces.
- Assistant launches already receive workspace context and chat-assisted tool seeds, but the assistant composer did not explicitly invite search-first discovery requests.

Decision:

- Add a shared frontend discovery index for search-first UX.
- Keep backend behavior unchanged.
- Preserve existing routes and capabilities.
- Use token matching so natural queries can find items across title, category, workspace, tags, aliases, and descriptions.

## Fixes Applied

- Added `src/data/searchFirstDiscovery.js`.
- Indexed assets from the mounted asset inventory, workflows from `PLATFORM_WORKFLOWS`, simulations from `SIMULATION_SCENARIOS`, workspaces from `CARE_WORKSPACES`, plus destinations and notifications.
- Added shared helper functions for building discovery entries, filtering by query, filtering by workspace, filtering by category, and generating assistant prompt seeds.
- Updated Global Search to use the shared search-first discovery results.
- Expanded Global Search copy and filters to include assets, workflows, simulations, and workspaces.
- Updated Quick Command to include a dedicated Discovery section for workflow and simulation results while preserving canonical tool launches for asset/tool duplicates.
- Updated Quick Command placeholder and scope note so users know they can search assets, workflows, simulations, workspaces, routes, calculators, and tools.
- Added direct command-palette launch behavior for workflow and simulation discovery results.
- Added workspace-aware assistant discovery prompts so users can ask for assets, workflows, simulations, and workspace-relevant next steps from the assistant.
- Added focused tests for the shared index, command palette discovery, Global Search discovery, and assistant composer behavior.

## Verification

- `ReadLints`: no diagnostics for edited search-first files.
- `npm run test:run -- src/data/searchFirstDiscovery.test.js src/components/QuickCommandLauncher.test.jsx src/pages/PlatformOSPages.test.jsx src/components/ChatInterface.nlu.test.jsx`
  - 4 test files passed
  - 24 tests passed.
