# CareDroid Brain Layer Report

## Summary

The CareDroid Brain Layer is a centralized intelligence layer that understands the platform as a connected operating system. It unifies the Artifact Registry, Knowledge Graph, AI Memory, Recommendations, Automations, AI Agents, and Platform Learning Engine into one advisory service and dashboard.

The Brain Layer is a decision-support layer for platform operators, administrators, and builders. It recommends actions, identifies risks, and explains relationships; it does not automatically enable products, hide assets, execute automations, or change workflows without human review.

## Unified Knowledge Sources

| Source | Contribution |
| --- | --- |
| Artifact Registry | Asset, route, API, pack, product, model, prompt, and dependency inventory |
| Knowledge Graph | Connected platform graph across assets, products, packs, roles, routes, simulations, workflows, agents, and integrations |
| AI Memory | Organization, workspace, role, user, AI, and artifact memory context |
| Recommendations | Role-aware tools, packs, products, agents, simulations, and protocols |
| Automations | Trigger, condition, action templates and workflow optimization opportunities |
| AI Agents | Available AI agents and their fit for platform, clinical, operational, governance, and education workflows |
| Learning Engine | Usage-based optimization suggestions, failed launch repairs, high-value asset promotion, merge opportunities, and unused asset review |

## Service Responsibilities

`CareDroidBrainService` should:

- Understand the platform by composing artifact, route, graph, product, pack, role, memory, recommendation, automation, and learning signals.
- Recommend actions with explainable source signals and review routes.
- Detect duplication using existing duplicate-system audit outputs.
- Detect orphan assets using existing orphan-detection audit outputs.
- Suggest products using existing product and recommendation inputs.
- Optimize workflows by combining automation templates, workflow activity, and learning suggestions.

## Dashboard Sections

| Section | Purpose |
| --- | --- |
| Platform Knowledge | Overall graph coverage, duplicate findings, orphan findings, route/tool health, and platform posture |
| Organization Knowledge | Organization memory, enabled packs/assets, product suggestions, organization recommendations |
| Role Knowledge | Role profile, role-fit recommendations, preferred assets, recent assets, and role memory |
| Asset Knowledge | Artifact counts, graph nodes/edges, validation state, orphan assets, and duplicate asset risks |
| Automation Knowledge | Automation templates, workflow optimization suggestions, learning actions, and next recommended reviews |

## Privacy and Control

The first implementation should be frontend-local and privacy-safe. It should consume safe metadata, sanitized memory fabric context, aggregate usage signals, catalog records, and advisory recommendations. It should not persist new user data, include raw prompts, include raw PHI, or execute changes automatically.

## Route

The dashboard route is `/brain`.

## Acceptance

Acceptance is met when CareDroid has a centralized intelligence layer that can understand platform structure, recommend actions, detect duplication, detect orphan assets, suggest products, and optimize workflows across the requested knowledge domains.
