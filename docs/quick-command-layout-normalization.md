# Quick Command Layout Normalization

## Current Behavior

No dedicated Quick Command or command palette component existed in the codebase. The closest global upper-layer artifact was the authenticated `AppShell` theme floating button in the top-right corner. Primary actions were distributed across `Sidebar.jsx`, `/dashboard`, `/tools`, and page-level cards. Mobile also had a fixed bottom nav plus top-left menu button, creating several independent chrome layers.

## UX Issue

The old floating top-right control behaved like an app-wide artifact rather than part of the clinical command center. It occupied its own z-index layer, visually floated above content, and did not help users launch tools, routes, or dashboard actions. Tool launch remained duplicated between sidebar cards, dashboard cards, and the Tool Library.

## Selected Interaction Model

CareDroid now uses a hybrid model:

- Desktop: Windows Start-style launcher integrated into the sidebar as `Quick Command`.
- Mobile: compact shell command button opens a bottom drawer-style launcher above the bottom navigation.
- Keyboard: `Ctrl/Cmd K` opens Quick Command for power users.
- AI assistant slash commands remain a planned assistant enhancement, not a competing overlay in this pass.

This keeps Quick Command intentional and native to the app shell while preserving a familiar command-palette search flow.

## Desktop Behavior

The desktop trigger lives inside the sidebar, below “Start Assistant” and above primary navigation. The panel opens beside the sidebar instead of floating randomly over the page. It includes:

- Search across destinations and canonical tools.
- Recent tools from `ToolPreferencesContext`.
- Primary destinations from `PRIMARY_NAV_ITEMS`.
- Canonical tool entries from `getUserFacingToolRegistryProjection()`.
- Theme cycling as a utility action inside the command center.

## Mobile Behavior

On compact layouts, the top-right shell control is now a command button rather than a theme FAB. The launcher opens as a bottom drawer above the bottom nav, with a dimmed backdrop for click-outside close. It avoids covering the auth/public shell because it only renders when `isAuthed` is true.

## Z-Index Strategy

- Mobile nav backdrop: `900`.
- Bottom nav: `930`.
- Quick Command desktop panel: `940`.
- Quick Command mobile drawer: `950`.
- Mobile menu/command buttons: `960`.
- Sidebar remains `1000`.
- Toasts/emergency layers remain above this system.

The command panel intentionally sits above page content but below the sidebar and emergency/toast surfaces.

## Route And Launch Strategy

Quick Command uses canonical sources only:

- Primary app destinations come from `PRIMARY_NAV_ITEMS`.
- Tool entries come from `getUserFacingToolRegistryProjection()`.
- Tool launches call `applyRegistryToolLaunch()`.
- Destination launches use canonical route paths.
- Tool entries whose path duplicates a primary destination are omitted to prevent duplicate launch entries.

## Tests Added

- Quick Command opens and closes.
- Escape closes.
- Click outside closes.
- Search filters commands/tools.
- qSOFA launches the canonical `/tools/calculators/qsofa` route.
- Entries remain unique and tool entries are inventory-backed.
- App shell statically gates Quick Command behind authenticated state and removes the old floating theme FAB.

## Remaining Risks

- AI slash commands such as `/tools`, `/calc`, and `/fleet` are not implemented yet.
- The launcher currently caps default tool results to keep the panel usable; deeper browsing remains `/tools`.
- The Start-style panel is still an overlay by necessity, but it is anchored and intentional instead of a detached floating artifact.
