# Sidebar Simplification Report

## Goal

Make the sidebar navigation, not inventory. The primary sidebar should contain a maximum of six high-frequency destinations. Low-frequency or deep inventory items should move into Advanced, Settings, Workspace context, or the command palette.

## Target

- Maximum six primary sidebar items
- Sidebar owns global navigation only
- Feature inventory lives in feature pages, search, workspace context, or command palette
- Settings and advanced/admin destinations are grouped away from primary navigation

## Audit Criteria

- Is this destination needed on most sessions?
- Is it a global navigation destination or feature inventory?
- Should it move to Advanced?
- Should it move to Settings?
- Should it move to Workspace context?
- Should it move to Command palette?

## Findings

### Current Primary Sidebar Items

The active sidebar was already rendering from `PRIMARY_SIDEBAR_NAV_ITEMS` rather than tool inventory. It had five primary items:

- Dashboard
- Assistant
- Tools
- Operations
- Profile

### Audit Decisions

| Destination group | Sidebar decision | New home |
| --- | --- | --- |
| Dashboard | Keep primary | Sidebar |
| Assistant | Keep primary | Sidebar |
| Tools | Keep primary | Sidebar |
| Operations | Keep primary | Sidebar |
| Workspace | Add as sixth primary item | Sidebar and workspace context |
| Profile | Keep primary | Sidebar |
| Settings, profile settings, preferences, notifications, security setup | Remove from primary | Settings/account surfaces |
| Workspace management and active workspace routes | Own under Workspace | Workspace context |
| Hospital Map, Medical IoT, Devices, Fleet, Live Map, Digital Twin, Usage | Remove from primary | Workspace context and Operations |
| Recommendations, Discover, Workflows, Knowledge Hub, Marketplace | Remove from primary | Command palette and search |
| Products, Plans, Specialties, Pathways, Agents, Value Tracking | Remove from primary | Command palette and commercial/details pages |
| Developer Catalog, System Health, SaaS Health, Feature Flags, Plugins, Dependency Graphs | Remove from primary | Advanced and command palette |
| Governance, Security, Audit, Regulatory, AI Evaluation | Remove from primary | Advanced and command palette |
| Individual tools/calculators | Keep out of sidebar | Tools page, search, command palette |

### Stale Sidebar Inventory CSS

`Sidebar.css` still contained styling for removed inventory-era controls:

- Sidebar command launcher
- Operations nav subsection
- Tool grids and tool cards
- Recent tool lists
- Sidebar workspace controls
- Inline sidebar tool-card layout helpers

These selectors competed with feature-owned Tools and Workspace pages even though `Sidebar.jsx` no longer rendered them.

## Implementation Decisions

- Added canonical `workspace` and `workspaces` route constants.
- Added `Workspace` to `PRIMARY_NAV_ITEMS` as the sixth primary sidebar item.
- Removed `/profile/workspaces` from Profile ownership and matched it under Workspace instead.
- Removed `workspace` from utility navigation because it is now primary.
- Removed the synthetic Workspace command-palette destination because primary nav now supplies it.
- Increased the command palette default destination cap from five to six so all primary sidebar items can appear by default.
- Pruned stale inventory/sidebar CSS for command launcher, operations subsection, tool grids, tool cards, recent tool lists, and workspace controls.
- Updated sidebar, mobile drawer, AppShell, primary navigation, and quick command tests to enforce the six-item sidebar contract.

Final primary sidebar:

1. Dashboard
2. Assistant
3. Tools
4. Operations
5. Workspace
6. Profile

## Verification

- Lint diagnostics: no errors reported for edited sidebar/navigation files.
- Focused tests: `npm run test:run -- src/navigation/primaryNavigation.test.js src/components/Sidebar.toolsNavigation.test.js src/components/Sidebar.mobileRender.test.jsx src/components/Sidebar.responsive.test.js src/layout/AppShell.navigation.test.jsx src/components/QuickCommandLauncher.test.jsx`
- Result: 6 test files passed, 63 tests passed.
