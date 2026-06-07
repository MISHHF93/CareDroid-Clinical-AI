# Recommendation Engine Report

## Summary

The Recommendation Engine helps users discover relevant CareDroid capabilities automatically. It combines role, workspace, organization, activity, search, simulation, and workflow signals into grouped recommendations for tools, packs, products, AI agents, simulations, and protocols.

The first implementation is deterministic and local to the frontend. It reuses existing catalogs, role intelligence, marketplace data, workspace context, and memory signals rather than introducing a new backend persistence model.

## Inputs

| Input | Purpose |
| --- | --- |
| Role | Matches capabilities to clinician, administrator, educator, operations, research, student, and governance profiles |
| Workspace | Prioritizes capabilities relevant to the active workspace or care setting |
| Organization | Surfaces packs and products that match the tenant type, enabled packs, and visible assets |
| Asset usage | Recommends recently used, pinned, underused, or adjacent tools |
| Search history | Uses safe search metadata such as search length, result count, filters, and repeated categories |
| Simulations | Recommends incomplete or role-fit simulations and related protocols |
| Workflows | Recommends workflow playbooks and packs when workflow signals show gaps or repeated activity |

Raw search text, raw prompts, PHI, and client-provided tenant identifiers are not required for scoring.

## Outputs

Recommendations are grouped by capability type:

- Tools: clinical tools, calculators, dashboards, maps, IoT views, and workflow surfaces.
- Packs: asset packs and marketplace bundles.
- Products: outcome-oriented product suites and solution bundles.
- AI agents: assistant and copilot experiences.
- Simulations: role-fit clinical and operational scenarios.
- Protocols: pathway and protocol content linked to tools and simulations.

Every recommendation should include a title, summary, route, score, reason, source signals, and underlying item metadata.

## Scoring Rules

The engine should favor capabilities when they match:

- The user role or role profile.
- The active workspace or organization type.
- Pinned, recent, or visible assets.
- Repeated workflow or usage signals.
- Simulation gaps or incomplete training paths.
- Protocol links to recommended tools or simulations.
- Marketplace tags that match safe search categories.

Scores are explainable. Users should see why a capability is recommended without exposing sensitive query text or tenant-private data.

## Route

The recommendation surface is available at:

`/recommendations`

The route is authenticated and rendered in the main app shell.

## Acceptance

Acceptance is met when users can open `/recommendations` and see relevant tools, packs, products, AI agents, simulations, and protocols automatically ranked from their role, workspace, organization, usage, search, simulation, and workflow context.
