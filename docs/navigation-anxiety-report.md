# Navigation Anxiety Report

Date: 2026-06-08

## Goal

Users should never have to ask: "Where is that feature?"

Every major feature should be:

- searchable
- discoverable
- recommended
- reachable

## Audit Summary

| Surface | Searchable | Discoverable | Recommended | Reachable | Anxiety Risk |
| --- | --- | --- | --- | --- | --- |
| Sidebar | Partial | Yes | Partial | Yes | Hidden secondary routes depend on Quick Command and are not always in global search. |
| Dashboard | Partial | Yes | Yes | Yes | Full search and recommendations are not primary dashboard actions. |
| Tools | Yes | Yes | Yes | Yes | Tools page search is weaker than command palette search because aliases are underused. |
| Operations | Partial | Partial | Partial | Yes | Operations hub omits some operations sidebar features such as workflow mining, workspace graph, twin intelligence, and usage. |
| Command Palette | Yes | Yes | Partial | Yes | Strongest discovery surface, but full Search route itself is not obvious. |
| Assistant | Partial | Partial | Partial | Yes | Assistant suggestions do not reuse the global search-first index. |

## Major Feature Coverage

| Feature Group | Searchable | Discoverable | Recommended | Reachable | Required Fix |
| --- | --- | --- | --- | --- | --- |
| Tools and calculators | Yes | Yes | Yes | Yes | Improve Tools page alias matching. |
| Workflows and automations | Yes | Partial | Partial | Yes | Surface search and workflow recommendations more directly. |
| Simulations | Yes | Yes | Partial | Yes | Share search-first suggestions with Assistant. |
| AI agents and AI models | Yes | Partial | Partial | Yes | Make Assistant and dashboard expose search-first discovery. |
| Protocols and pathways | Yes | Partial | Partial | Yes | Share search-first suggestions with Assistant. |
| Operations | Partial | Partial | Partial | Yes | Index all operations navigation items and add missing operations hub cards. |
| Products, billing, admin, governance | Partial | Partial | Partial | Yes | Add full navigation destinations to global search. |
| Recommendations | Partial | Partial | Yes | Yes | Add a direct dashboard path and search destination. |
| Global search | Weak | Weak | No | Yes | Add Search as a command destination and dashboard action. |

## Implementation Plan

1. Add Global Search and Recommendations as visible dashboard actions.
2. Add Global Search to Quick Command destinations.
3. Index all canonical navigation destinations in `searchFirstDiscovery.js` so hidden sidebar and utility routes are searchable from `/search`.
4. Add operations intelligence drill-downs for workflow mining, workspace graph, twin intelligence, and usage to the Operations hub.
5. Improve Tools page search to include aliases, AI aliases, mounted capability metadata, route text, and token matching.
6. Feed `buildSearchFirstResults` into assistant capability suggestions so Assistant can recommend protocols, simulations, workflows, AI records, operations, and routes from the same search index.

## Expected Result

Every major feature has at least one obvious path from the sidebar, dashboard, tools hub, operations hub, command palette, or assistant. Hidden routes remain available without cluttering the primary shell because search and assistant recommendations become the universal safety net.
