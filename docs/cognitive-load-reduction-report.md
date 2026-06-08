# Cognitive Load Reduction Report

Date: 2026-06-08

## Goal

Reduce mental effort by avoiding "show everything at once" layouts.

Capability must remain available through:

- search
- recommendations
- workspace filtering
- AI assistant

## Audit Summary

| Page | Current Load | 30% Reduction Target | Implementation Direction |
| --- | --- | --- | --- |
| Sidebar/App Shell | 5 primary items plus profile, new chat, recents, utilities | Keep 5 primary items; avoid re-expanding shell | Already meets target after progressive disclosure. |
| Dashboard | 6 panels, 4 insight chips, 6 flow chips, 5 actions, 6 shortcuts, 4 prompts, 3 recommendations, 7 signal rows, 6 status metrics/cards | Reduce prompts, shortcuts, signals, and status cards by about one third | Keep primary actions; move extra discovery to Search/Recommendations links. |
| Tools | 12 visible filter tabs, 4 stats, recent list, unbounded result cards | Reduce visible tabs and recents by at least 30% | Keep full filter select and search; show only common filter chips. |
| Operations | 2 insights, 4 primary cards, 5 drilldowns, 4 intelligence actions | Reduce drilldowns/intelligence by about one third | Keep all via Search/Operations; show top drilldowns and intelligence actions. |
| Profile | Summary, 6 identity rows, 5 overview cards, activity, PHI panel, 10+ footer links | Reduce identity/footer links and overview cards by about one third | Keep settings/workspaces/security/search paths; move extras to contextual routes. |
| Settings | Personal settings plus admin/billing/compliance controls | Keep personal settings first; admin remains separated | Already partly separated; reduce visible admin links for normal users. |
| Global Search | 3 filters, 18 category options, uncapped result grid | Cap visible results while preserving search refinement | Show top results first; search query exposes full match set progressively. |
| Workspace Home | Hero, focus metrics, stats, 6 route cards, 4 tools, notifications | Reduce routes/tools/notifications by about one third | Keep workspace filtering and Assistant context. |
| Recommendations | Multiple groups and many recommendation cards | Reduce default results to next-best items | Keep group filters and Search/Assistant access. |
| Assistant | Starter cards and suggestion chips can stack | Reduce visible suggestions | Keep Assistant as discovery surface but limit visible chips. |

## Rules

1. Default surfaces should show the next best actions, not the full inventory.
2. Search is the escape hatch for complete discovery.
3. Recommendations show a small ranked set first.
4. Workspace context narrows visible lists before rendering.
5. Assistant can reveal advanced paths through natural language.
6. Admin and advanced pages remain separated from normal user flows.

## Implementation Plan

1. Dashboard: reduce visible shortcuts, prompts, signals, and status metrics.
2. Tools: reduce visible filter tabs while preserving all filters in the select; cap recent tool cards.
3. Operations: cap visible drilldowns and intelligence actions while preserving search/route access.
4. Profile: reduce identity rows, overview cards, and footer links.
5. Search: cap unbounded result rendering and keep refinement text.
6. Workspace Home: cap routes, tools, and notifications more tightly.
7. Update tests to verify reduced visible counts and preserved launch/search access.

## Expected Result

Normal users see fewer simultaneous choices while still reaching the same capabilities through Search, Recommendations, workspace filtering, and Assistant.

## Implemented Reductions

- Dashboard: reduced OS flow chips, focus metrics, favorite/recent cards, assistant prompts, shortcut cards, signal rows, and status metrics.
- Tools: reduced visible filter tabs from 12 to 5 while preserving every filter in the select; capped recent tools to 3.
- Operations: reduced visible drilldowns from 5 to 3 and operations intelligence rows from 4 to 2.
- Profile: reduced identity rows, removed the separate recent calculator card, capped recent/saved/activity rows, and reduced footer links.
- Global Search: capped only the default untyped result grid; typed searches still reveal the full matching set.
- Workspace Home: reduced context routes, recommended tools, operating brief bullets, focus metrics, stats, and notifications.
- Recommendations: reduced the default view to the first two populated groups with three cards per group; every group remains reachable through the Type filter.
- Assistant: reduced starter cards and capped the suggested action rail while keeping compliance-sensitive actions visible.

## Verification

- `npm run test:run -- src/pages/CommandDashboard.test.jsx src/pages/tools/ToolsOverview.visibility.test.jsx src/pages/Operations.test.jsx src/pages/PlatformOSPages.test.jsx src/pages/WorkspaceHome.test.jsx src/pages/RecommendationsPage.test.jsx src/pages/Dashboard.chatLayout.test.jsx src/pages/Dashboard.mobile.test.jsx`
- Lint diagnostics passed for the edited files.
