# Workspace UX Optimization Report

Status: implemented

## Goal

Workspace should feel like switching operating systems.

When workspace changes:

- Dashboard changes
- Tools change
- Recommendations change
- Assistant changes

Users should immediately understand:

- "I am now in Emergency"
- "I am now in Medical IoT"

## Audit Notes

Inspected workspace state and the four target surfaces:

- `src/contexts/WorkspaceContext.jsx`
- `src/config/workspace.config.js`
- `src/data/workspaceArchitecture.js`
- `src/components/WorkspaceSwitcher.jsx`
- `src/pages/CommandDashboard.jsx`
- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/RecommendationsPage.jsx`
- `src/components/ChatInterface.jsx`

Findings:

- Workspace state already exists and exposes active workspace, visible assets, recommendations, assistant context, shortcuts, widgets, and recommended agents/packs.
- Workspace definitions already include useful operating-system ingredients: labels, descriptions, AI context, route IDs, tool IDs, default widgets, asset packs, and default AI agents.
- Recommendations already consumed workspace context, but the page did not strongly announce that the recommendation surface had changed operating mode.
- Tools already filtered by workspace assets, but the page still read like a generic tool library instead of the active workspace console.
- Dashboard used workspace context for some counts and shortcuts, but the title, hero, assistant prompts, and action priority were not workspace-specific enough.
- Assistant did not visibly tell the user which workspace it was operating inside, and chat requests were not passing a clear workspace UX payload.
- Local workspace shortcuts can be string route IDs while dashboard actions expect route objects; shortcut normalization was needed for safe workspace-specific actions.

## Fixes Applied

- Added `src/data/workspaceExperience.js`.
- Added explicit workspace operating profiles for Emergency, Medical IoT, Operations, Fleet, Laboratory, Simulation, Education, and Governance.
- Added neutral fallback behavior for local views such as "All Tools" so unknown workspace IDs do not accidentally inherit Emergency copy.
- Added shortcut normalization for route IDs and route objects.
- Dashboard now changes its title, hero copy, mode chip, prioritized actions, assistant title, assistant placeholder, and prompt seeds from the active workspace.
- Dashboard preserves common shortcuts such as Assets, Workflows, Simulation, Operations, Tools, and Workspace while prioritizing workspace-specific actions first.
- Dashboard assistant seeding now includes the active workspace operating label and assistant context.
- Tools now render as the active workspace tool console, including an operating-mode banner and workspace-specific copy.
- Recommendations now render as the active workspace recommendation surface, including workspace operating label, workspace-specific title, mode summary, and role/workspace profile.
- Assistant now renders an active workspace banner, workspace-specific quick prompts, workspace-specific placeholder text, and sends a workspace context payload to chat requests.
- Added/updated tests for the shared workspace profile, dashboard switching, tool console identity, recommendations identity, and assistant workspace payload.

## Verification

- `ReadLints`: no diagnostics for edited workspace UX files.
- `npm run test:run -- src/data/workspaceExperience.test.js src/pages/CommandDashboard.test.jsx src/pages/tools/ToolsOverview.visibility.test.jsx src/pages/RecommendationsPage.test.jsx src/components/ChatInterface.nlu.test.jsx`
  - 5 test files passed
  - 31 tests passed

## Entropy Reduction Update

- `WorkspaceContext` now ignores backend workspace context when it does not match the active workspace, preventing stale visible assets, recommendations, shortcuts, and assistant context after a workspace switch.
- Dashboard recommendation cards now render active workspace recommendations before generic recommendation-engine output.
- Recommendations pass the active workspace-context workspace into the recommendation engine when available.
- Quick Command workspace launches now call the shared workspace switch path and refresh tenant and identity context before navigating to the workspace.
