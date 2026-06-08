# Dashboard Decluttering Report

## Goal

Reduce dashboard noise by 30-50% while preserving capability. The dashboard should keep only immediately useful widgets, cards, metrics, insights, and actions in the default view. Secondary items should move to recommendations, drawers, detail pages, tooltips, or search.

## Audit Questions

- Does the user need this immediately?
- Can it move to a recommendation?
- Can it move to a drawer?
- Can it move to a details page?
- Can it move to a tooltip?
- Can it move to search?

## Findings

Primary audited surface: `src/pages/CommandDashboard.jsx`, which owns the `/dashboard` command center.

### Default View Inventory

| Item | Immediate? | Decision |
| --- | --- | --- |
| Workspace OS eyebrow and dashboard title | Yes | Stay |
| Tenant, role, and verbose subtitle metadata | No | Move to tooltip/details context; default view keeps only workspace and environment |
| Frontend OS flow chips | No | Move to details/system health |
| Workspace operating brief bullets | No | Move to details/context; remove from default view |
| Focus metrics | Partial | Keep one immediate metric, move secondary metrics to details |
| Live alert count | Yes | Stay |
| AI Assistant action | Yes | Stay |
| Tools action | Yes | Stay |
| Operations action | Yes for operational workspaces | Stay |
| Profile action card | No | Move to compact secondary link |
| Manage Workspaces action card | No | Move to compact secondary link |
| Search and Recommendations access | Yes, but not as cards | Move to compact secondary links |
| Assets / Workflows / Simulation shortcuts | No | Move to search/recommendations |
| Empty favorites | No | Hide until populated |
| Empty recents | No | Hide until populated |
| Favorite/recent launch cards | Yes only with history | Move to conditional Continue panel |
| Assistant textarea | Yes | Stay |
| Assistant mode help | Partial | Stay as small helper copy |
| Suggested prompts | Partial | Keep one immediate prompt; move rest to recommendations |
| Recommended tool cards | Yes | Stay, capped at two cards |
| Open Recommended Tools link | Yes as secondary access | Stay |
| Signals feed | Only with live signals | Hide when empty; show only alerts, unread notifications, or recent tool activity |
| Notifications and Alerts links | Only when signal panel exists | Stay inside conditional Signals panel |
| Tools / AI tools inventory metrics | No | Move to details/search; remove from default status |
| Backend status | Only if degraded/checking | Show inline hero pill when ready; show panel only when attention is needed |
| Session status | No unless degraded | Move into conditional Status panel |
| Retry status | Only if degraded/error | Move into conditional Status panel |
| Open Tool Library | Duplicate of Tools/Search | Remove from default status panel |
| Audit link | Role-specific | Keep only in conditional Status panel for authorized users |

## Decluttering Decisions

- Removed always-visible OS flow chips and operating brief from the hero. The dashboard now shows only workspace, environment, and a compact system-health link.
- Reduced hero insight cards from two workspace metrics plus alerts to one immediate workspace metric plus alerts.
- Reduced primary action cards from five to three: Assistant, Tools, and Operations.
- Moved Search, Recommendations, Workspaces, and Profile from full cards to compact secondary links.
- Removed the always-visible Launch Compression panel. Assets, workflows, simulation, and broad discovery remain available through Search and Recommendations.
- Replaced empty Favorites and Recents panels with a conditional Continue panel that renders only when pinned, favorite, or recent tools exist.
- Reduced assistant prompt cards from three to one plus a Recommendations link.
- Reduced recommendation cards from three to two while keeping the Recommended Tools link.
- Made Signals conditional. It appears only when there are active alerts, unread notifications, or recent tool activity.
- Made Status conditional. Healthy systems show a small hero link; the full Status panel appears only when config is loading, degraded, or has an error.

Estimated default visible-surface reduction: about 40-45% fewer always-visible cards, metrics, insights, and action controls in the healthy empty-state dashboard, while preserving access through search, recommendations, conditional continue, signal, and status surfaces.

## Verification

- Lint diagnostics: no errors reported for edited dashboard files.
- Focused test: `npm run test:run -- src/pages/CommandDashboard.test.jsx`
- Result: 1 test file passed, 12 tests passed.
