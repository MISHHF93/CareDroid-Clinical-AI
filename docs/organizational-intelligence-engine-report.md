# Organizational Intelligence Engine Report

## Summary

The Organizational Intelligence Engine gives CareDroid a unified profile of each organization so the platform can adapt to real operating behavior instead of only static configuration.

The engine composes existing tenant, organization, entitlement, workspace, analytics, customer success, and usage signals into an Organization Intelligence Profile. The profile highlights what the organization is, what it has enabled, how teams are using the platform, and which next actions should be recommended.

## Profile Inputs

| Signal | Source |
| --- | --- |
| Organization type | Organization engine and platform context |
| Departments | Platform department APIs and tenant administration context |
| Workspaces | Workspace context and tenant administration workspace records |
| Packs | Entitled packs, available packs, marketplace packs, and product packaging |
| Asset usage | Organization analytics asset usage and underused asset dashboards |
| AI usage | Organization analytics AI usage and customer success AI usage metrics |
| Adoption | Organization analytics adoption dashboard and customer success health metrics |

## Intelligence Profile

The Organization Intelligence Profile should expose:

- Organization identity: id, name, organization type, subscription, tenant, and health status.
- Department and workspace coverage: active departments, workspace focus, and visible workspace gaps.
- Pack coverage: enabled pack count, available pack count, missing pack candidates, and pack usage.
- Usage behavior: asset usage, AI usage, workflow completion, simulation completion, and dashboard engagement.
- Adoption posture: adoption score, health score, active users, retention risk, and underused products.
- Adaptation signals: the recommended workspace focus, next best packs, next best assets, AI assist opportunities, workflow/simulation opportunities, and automation opportunities.

## Recommendation Categories

| Recommendation | Logic |
| --- | --- |
| Missing packs | Compare available packs to entitled packs and prioritize organization/workspace fit |
| Underused assets | Use low-count underused asset analytics and customer success product gaps |
| Workflow opportunities | Detect low workflow completion, active departments, and workflow-capable workspaces |
| Simulation opportunities | Detect low simulation completion and education/training workspace gaps |
| Automation opportunities | Detect repeated asset usage, dashboard engagement gaps, or absent automation signals |

## Adaptation Acceptance

Acceptance is met when the `/organization-intelligence` route shows how the platform adapts to organization behavior through visible recommendations and adaptation signals.

Examples:

- If adoption is low, recommend missing packs and onboarding-focused next actions.
- If assets are enabled but underused, surface underused assets with route-level launch guidance.
- If AI usage is low, recommend assistant and AI-agent opportunities.
- If simulations or workflows are low, recommend training and workflow opportunities.
- If dashboard engagement or repeated manual usage patterns are present, recommend automation opportunities.

## Implementation Notes

The first implementation should compose existing frontend and backend APIs instead of adding new persistence. A backend facade can be added later if the organization intelligence profile needs a single stable API contract.
