# Frontend Entropy Compression Final

Date: 2026-06-08

## Goal

Compress frontend complexity while preserving platform power.

The platform should feel simpler, faster, more coherent, more SaaS-native, more workspace-driven, easier to learn, and easier to operate without losing functionality.

## Compression Inputs

- SaaS profiling: rank defaults by role, account, tenant, subscription, and organization context.
- Workspace profiling: narrow visible actions by active workspace before rendering.
- Recommendation engine: show next-best actions first instead of full inventories.
- Search-first UX: keep complete discovery in search and Quick Command.
- AI-first UX: make Assistant the guidance and ambiguity resolver.
- Progressive disclosure: hide advanced/admin surfaces until relevant.
- Component consolidation: reuse compact action/result/card patterns.
- Navigation compression: keep sidebar small and route power through hubs.

## Before / After Metrics

| Metric | Before Current Final Pass | After Target | Strategy |
| --- | ---: | ---: | --- |
| Canonical route records | 66 | 40-45 user-facing records over time | Keep registered power, but expose via hubs/search/recommendations first. |
| Mounted route entries | ~236+ including aliases/generated calculators | 90-115 over time | Future route table consolidation; preserve current deep links for now. |
| Sidebar primary items | 5 | 5 | Keep Dashboard, Assistant, Tools, Operations, Profile only. |
| Sidebar recent chat items | 4 | 2 | Keep recency useful without making sidebar a second workspace. |
| Dashboard visible cards/actions | ~20-25 runtime units | 12-16 | Merge launch/action concepts into next-action framing and keep Search/Assistant/Recommendations as power exits. |
| Tools default visible cards | Full visible tool inventory | Recommended/search-first set | Default to recommended profile/workspace tools; full inventory remains one filter away. |
| Operations visible action surfaces | ~15 | 8-10 | Keep Operations hub plus continuation actions; avoid exposing every drilldown equally. |
| Search default visible results | 12 | 8-12 | Search stays the expansion surface; typed search shows full matches. |
| Clicks to asset | 1-3 | 1 for known/recommended, 2 max unknown | Dashboard recents/favorites, Search, Recommendations, Tools. |
| Clicks to workflow | 1-2+ | 1 from contextual hubs, 2 max globally | Dashboard, Tools bridge, Operations continuation, Search. |

## Final Compression Rules

1. Default views show ranked next actions, not full platform inventory.
2. Full power remains reachable through Search, Quick Command, Assistant, Recommendations, and filters.
3. Workspace and SaaS profile determine what appears first.
4. Sidebar never expands to mirror the route table.
5. Hubs own discovery; routes remain implementation detail.
6. Every compressed page keeps at least one obvious continuation path.

## Implementation Plan

1. Reduce sidebar recent chat density from 4 to 2.
2. Make Tools recommended/search-first by default while preserving the All filter.
3. Reduce default Search results to 8 while typed search remains complete.
4. Add/adjust tests to verify compressed defaults and preserved access.
5. Update this report with the final implementation and verification summary.

## Acceptance Mapping

- Simpler: fewer default choices and smaller sidebar recency surface.
- Faster: recommended/search-first defaults reduce scanning.
- More coherent: dashboard, tools, operations, workflows, results, and recommendations continue into each other.
- More SaaS-native: profile, organization, subscription, and workspace context rank defaults.
- More workspace-driven: active workspace filters tools, shortcuts, recommendations, and copy.
- Easier to learn: users start from Dashboard, Assistant, Tools, Operations, or Profile.
- Easier to operate: full platform power remains in Search, Recommendations, Assistant, filters, and route deep links.

## Implemented Final Pass

- Sidebar recent chats reduced from 4 to 2.
- Tools now defaults to the recommended/profile/workspace-ranked view instead of the full inventory.
- Tools still preserves the full tool inventory through the `All` filter and direct query params.
- Search default results reduced from 12 to 8.
- Typed Search remains complete and continues to reveal full matching results.
- Existing Dashboard, Operations, Assistant, Workflow, Result, Recommendation, Search, and Quick Command power paths remain intact.

## Final Metrics

| Metric | Before | After Implemented |
| --- | ---: | ---: |
| Sidebar primary items | 5 | 5 |
| Sidebar recent chat items | 4 | 2 |
| Tools default visible mode | Full inventory | Recommended/profile-ranked inventory |
| Search default visible results | 12 | 8 |
| Typed search results | Full matching set | Full matching set |
| Clicks to asset | 1-3 | 1 for known/recommended, 2 max unknown |
| Clicks to workflow | 1-2+ | 1 from contextual hubs, 2 max globally |

## Verification

- `npm run test:run -- src/components/Sidebar.toolsNavigation.test.js src/pages/tools/ToolsOverview.visibility.test.jsx src/pages/PlatformOSPages.test.jsx src/pages/CommandDashboard.test.jsx src/pages/Dashboard.chatLayout.test.jsx src/pages/Operations.test.jsx`
- Lint diagnostics passed for the edited files.
