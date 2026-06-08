# One Action Principle Report

Date: 2026-06-08

## Goal

Every user task should have one obvious path. Secondary surfaces may still deep-link or search, but they should not present multiple equivalent buttons for the same task in the same context.

## Canonical Action Paths

| User Task | Canonical Path | Preserved Capability | Duplicate Patterns Found |
| --- | --- | --- | --- |
| Launch Tool | `/tools` for browsing, `applyRegistryToolLaunch()` for a specific recommended/recent tool | Direct tool cards, recommendations, recents, Quick Command search | Tool card click and `Open` button both launch; dashboard has Tools, Calculators, Recommended Tools; profile has recent/saved direct opens |
| Launch Workflow | `/workflows` | Query-seeded workflow entries and Quick Command search | Dashboard Workflows, Quick Command workflow discovery, legacy automation paths |
| Launch Simulation | `/simulation` for library, scenario route/query for direct launch | Simulation cards, search discovery, dashboard shortcut | Dashboard Medical Simulation, search discovery, scenario launch buttons |
| Open Operations | `/operations` | Operations drill-downs stay inside the Operations hub | Dashboard operation detail cards, Quick Command operation entries, detail page peer links |
| Open AI Assistant | `/assistant`, seeded by context when needed | Sidebar Assistant, dashboard composer, workspace context seed, tool assistant help | Assistant action card plus assistant composer; `AI Assistant`, `Open Assistant`, `Ask in context`, `Ask Assistant` label drift |
| Change Workspace | `/profile/workspaces` for management/defaults, header switcher for global quick switch | Workspace detail pages remain openable | Workspace chips, profile switch cards, Tools workspace select, Quick Command workspace entries |
| Manage Profile | `/profile` for overview, `/profile/settings` for editing identity, `/profile/preferences` for preferences, `/profile/tool-preferences` for tool tuning | Existing profile subpages and redirects remain | `Profile settings`, `Edit settings`, `App settings`, `Save profile`, `Save preferences`, `Save changes` overlap |

## Implementation Decisions

1. A card should not also be a launch button when it already contains a primary launch button.
2. Dashboard action cards should be hub-first: Workspace, Tools, Workflows, Simulation, Operations.
3. The dashboard AI panel is the dashboard's canonical Assistant path; the separate Assistant action card is redundant there.
4. Workspace pages should not duplicate workspace switching; they should point users to the workspace manager.
5. Settings should not be the profile/preferences owner; it should focus on organization, billing, privacy, and platform settings.
6. Recommendations should distinguish direct tool launch from non-tool detail navigation.
7. Search and Quick Command remain secondary accelerators, not competing default task flows.

## Findings By Task

### Launch Tool

The highest duplication is in `ToolsOverview`, where the whole tool card is clickable and the same card also has an explicit `Open` button. This creates two identical launch targets inside one component. The canonical action should be the explicit `Open` button, with the surrounding card acting as information and preference controls only.

### Launch Workflow

Workflow discovery appears on the dashboard, Quick Command, search-first discovery, and `/workflows`. The canonical user-facing path is `/workflows`; query-seeded workflow entries may deep-link there, but dashboard should only show one Workflow hub action.

### Launch Simulation

Simulation launch appears through dashboard cards, Quick Command discovery, and simulation scenario cards. The canonical library path is `/simulation`; scenario launch remains direct from the simulation page or search.

### Open Operations

Operations now works best as a hub. Detail routes like Hospital Map, Medical IoT, Fleet, Live Map, and Devices should be visible inside `/operations` or searchable, not repeated as top-level action choices next to Operations.

### Open AI Assistant

Assistant is both a destination and a context-seeded action. The canonical label should be `Ask Assistant` when a prompt/context is seeded and `Assistant` for navigation. On the dashboard, the assistant composer is the obvious path, so an additional Assistant action card is redundant.

### Change Workspace

Workspace switching appears in several places. The canonical management path is `/profile/workspaces`; global quick switching can remain in the header switcher. Workspace detail pages should not present another grid of active workspace switch buttons.

### Manage Profile

Profile and settings are overlapping. Profile owns personal identity and preferences; Settings owns organization, billing, privacy, and platform controls. Labels should use `Edit profile`, `Edit preferences`, `Manage workspaces`, and `Tool preferences` instead of generic "settings" wording.

## Expected Result

The app should still expose the same capabilities, but each task should have a clear owner:

- Tools live in Tools.
- Workflows live in Workflows.
- Simulations live in Simulation.
- Operations detail lives under Operations.
- Assistant questions go through Assistant or a context-seeded `Ask Assistant`.
- Workspace changes go through workspace management or the global switcher.
- Profile edits go through profile-specific pages.
