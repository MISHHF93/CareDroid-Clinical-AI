# Information Architecture Refactor

Status: implemented

## Target Visible Navigation

- Dashboard
- Assistant
- Tools
- Operations
- Profile
- Settings

## Refactor Principle

All other frontend capabilities remain available, but move out of persistent visible navigation and into:

- Workspace-driven discovery
- Search-driven discovery
- Recommendation-driven discovery

## Constraints

- Do not reduce functionality.
- Do not remove backend behavior or contracts.
- Reduce visible navigation and visual decision load.
- Preserve deep links, route aliases, and command/search access.

## Implementation Notes

### Visible App Shell

The persistent sidebar/drawer now exposes only the target primary destinations:

- Dashboard: `/dashboard`
- Assistant: `/assistant`
- Tools: `/tools`
- Operations: `/operations`
- Profile: `/profile`
- Settings: `/settings`

The sidebar no longer renders an Advanced navigation section, notification shortcut, or system-health build badge. Those capabilities remain route-registered and discoverable through search, workspace flows, page links, and recommendation surfaces.

### Search-Driven Access

Quick Command remains the primary access model for the long tail of routes, tools, workspaces, and administrative surfaces.

- Default command destinations are limited to the six primary IA entries.
- Non-primary destinations still appear when searched.
- Workspaces, workspace shortcuts, recent tools, favorite tools, and suggested tools remain available.

### Workspace-Driven Access

Workspace entries remain first-class command destinations and deep links. Workspace-specific shortcuts continue to appear inside Quick Command, keeping specialized routes available without adding persistent navigation.

### Recommendation-Driven Access

Recommendation and product/commercial surfaces remain available as routes and command destinations, but no longer occupy persistent visible navigation. They can continue to be linked from dashboard cards, recommendation cards, workspace contexts, and search results.

### Preserved Functionality

- No backend files were changed.
- No React routes were removed.
- No route aliases were removed.
- No tools, dashboards, admin pages, governance pages, analytics pages, commercial pages, or organization pages were deleted.
- Notifications remain available through `/notifications` and command/search access.
- System health remains available through `/system-health` and command/search access.

### Files Updated

- `src/components/Sidebar.jsx`
- `src/components/Sidebar.css`
- `src/components/Sidebar.toolsNavigation.test.js`
- `src/components/Sidebar.responsive.test.js`
- `src/components/QuickCommandLauncher.jsx`
- `src/components/QuickCommandLauncher.test.jsx`
- `src/data/accessibilityAudit.js`
- `src/navigation/primaryNavigation.test.js`

### Verification

- `npm run test:run -- src/components/Sidebar.toolsNavigation.test.js src/components/Sidebar.responsive.test.js src/navigation/primaryNavigation.test.js src/components/QuickCommandLauncher.test.jsx src/layout/AppShell.navigation.test.jsx src/layout/AppShell.layout.test.js` passed: 73 tests.
- `npm run test:run -- src/data/accessibilityAudit.test.js` passed: 2 tests.

## Entropy Reduction Update

- `/workflows` is now the canonical workflow destination; `/automation` remains functional as a protected alias redirect.
- Public `/privacy` remains public-only while enterprise/governance privacy references use protected privacy routes.
- Product/commercial destinations stay under Solutions; platform/admin destinations stay under Account/Admin or Advanced/Admin; operations leaves stay under Operations/Search/Quick Command.
- Quick Command workspace launches now refresh workspace, tenant, and identity context consistently.
