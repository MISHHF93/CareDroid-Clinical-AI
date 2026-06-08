# Frontend Entropy Reduction Audit

Date: 2026-06-07

## Scoring Model

Entropy Score is a 0-100 estimate of user-facing complexity. Higher means the area has more competing ways to do the same job, more duplicate routes or information, more clicks to recover from a wrong turn, and more cognitive effort to choose the right surface.

Inputs:

- Clicks required: lowest and common path on desktop/mobile.
- Competing actions: different CTAs that appear equivalent.
- Duplicate actions: same action exposed on multiple surfaces.
- Duplicate routes: aliases or separate routes that imply the same intent.
- Duplicate information: repeated cards, stats, explanations, or recommendations.
- Cognitive load: number of concepts a user must compare before acting.

## Executive Summary

The frontend already has a stronger canonical route and primary navigation foundation than the raw route count suggests. The primary sidebar is compressed to Dashboard, Assistant, Tools, Operations, Profile, and Settings, with legacy route aliases redirected through config. Entropy now comes from the surfaces behind that shell: dashboard action cards, Quick Command defaults, operations drill-downs, workspace context panels, settings/admin links, and AI/tool launch labels.

Highest entropy clusters:

- Dashboard launch surface: 82/100
- Tool discovery: 80/100
- Operations/workspace discovery: 78/100
- Route surface: 76/100
- Settings/admin: 74/100

## Area Measurements

| Area | Clicks Required | Competing Actions | Duplicate Actions | Duplicate Routes | Duplicate Information | Cognitive Load | Entropy Score |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Navigation | 1 desktop, 2 mobile drawer, 1-2 Quick Command | Sidebar, mobile nav, Quick Command, dashboard cards | Dashboard/Assistant/Tools/Operations repeated globally | Strong alias coverage for home, assistant, tools, calculators, maps, fleet | Primary labels are clean; secondary hidden nav still leaks into Quick Command | Medium: primary nav is simple, destination search is broad | 58 |
| Dashboard | 1 from `/dashboard`, 1 to launch most cards | Command cards, prompt form, recommended tools, recent activity, notifications | Assistant, tools, calculators, operations, workspace, maps, devices, simulation all repeat elsewhere | Links to canonical and direct detail routes | Workspace stats, recommended tools, recent tools, alerts repeat in workspace/tools pages | High: too many "best next action" candidates | 82 |
| Workspace | 1-2 from dashboard/header, 1 per route/tool card | Header switcher, workspace chips, Quick Command workspace entries, `/workspaces` index | Workspace switch/open, Ask in context, Command Center, recommended tools | `/workspaces`, `/workspace/:id`, profile workspace routes | Context routes, tool counts, notifications, recommendations repeat dashboard/context pages | High: users must infer state switch vs navigation | 78 |
| Components | N/A | Multiple card/action components with similar semantics | Compact action, workspace route card, tool card, insight card, operation card | N/A | Repeated icon/title/body/action layouts | Medium: visual patterns are similar but not always semantically consistent | 68 |
| Routes | 1 when known, 2-4 when discovered | Canonical records, inline routes, aliases, Quick Command destinations | Tools/catalog/calculators, assistant/chat/ai, live-map/fleet/map/tracking, settings/preferences | About 80+ configured records plus aliases and direct route declarations | Route notes and page descriptions overlap | High for discovery, lower for direct links due redirects | 76 |
| Onboarding | 1-3 depending on entry | Welcome, onboarding, success center, profile setup, org deployment | Personal setup and organization deployment CTAs blur | `/welcome`, `/onboarding`, `/success-center`, profile setup routes | Progress/onboarding language repeats in success/admin/settings | Medium-high: unclear if onboarding is personal or tenant deployment | 70 |
| Settings | 1 from nav, 1-3 to subareas | Settings, profile settings, preferences, notifications, team, tenant admin, platform admin, billing | Save changes/preferences, notification/theme controls, organization/admin/billing links | `/settings`, `/profile/settings`, `/profile/preferences`, `/notifications`, `/notification-preferences`, admin routes | Billing/org/security/privacy snippets repeat dedicated pages | High: settings mixes personal, compliance, billing, and org admin | 74 |
| Tool Discovery | 1 from nav/dashboard, 1-2 via Quick Command/search | Tools page, calculators hub, catalog, recommendations, dashboard tools, workspace tools, assistant suggestions | Open tool/calculator/dashboard/guided chat/Ask Assistant labels overlap | `/tools`, `/tools/calculators`, `/tools/catalog`, direct tool pages | Recommendations repeat dashboard, workspace, tools, assistant | Very high: many valid starting points for same tool | 80 |
| AI Interaction | 1 from nav/dashboard/workspace/tools | Assistant page, dashboard prompt, tool Ask Assistant buttons, workspace context prompt, Quick Command assistant shortcuts | Ask Assistant, AI Assistant, Start guided chat, Think through case | `/assistant`, `/chat`, `/ai`, `/copilot` aliases | Suggested prompts and tool suggestions repeat | Medium-high: route aliases are handled but intent labels fragment | 72 |

## Top 20 Entropy Reductions

1. Cap dashboard workspace actions to the six most relevant cards.
2. Remove broad operational detail cards from dashboard fallback actions; keep Operations as the hub.
3. Limit dashboard workspace route injections to three entries.
4. Limit dashboard workspace shortcut injections to two entries.
5. Reduce dashboard recommended tools from four to three.
6. Reduce dashboard suggested prompts from six to four.
7. Standardize dashboard labels from "My Tools/My Calculators" to "Tools/Calculators".
8. Make Quick Command default destinations narrower.
9. Make Quick Command default tools narrower.
10. Hide broad discovery entries in Quick Command until the user types.
11. Rename Quick Command destination category from "Destination" to "Go to".
12. Rename Quick Command workspace shortcut category to "Workspace".
13. Keep Quick Command as launch/go-to and make search/discovery query-driven.
14. Remove the duplicated Operations hero "Ask Assistant" CTA.
15. Make Operations hero point to the operational twin as the recommended next step.
16. Reduce Operations primary area cards from five to four.
17. Keep lower-level fleet/live-map/routing/maintenance actions in one compact drill-down list.
18. Reduce Workspace default route cards to six.
19. Reduce Workspace default recommended tools to four.
20. Reduce Settings organization/admin link sprawl by grouping to five canonical entry points.

## Preservation Rules

- Do not remove canonical routes or redirect aliases.
- Do not remove tools, calculators, operations detail pages, or AI workflows.
- Prefer reducing default visible choices over deleting capability.
- Keep direct links available through hubs, Quick Command search, or canonical routes.
- Preserve tests that assert route availability and launch behavior.

## Expected Result

The first pass should reduce default visible choices on the dashboard, workspace, operations, settings, and Quick Command surfaces while keeping every capability reachable. Users should see fewer competing "start here" options, with broad inventory shifted to Tools, Operations, Settings, and typed Quick Command search.
