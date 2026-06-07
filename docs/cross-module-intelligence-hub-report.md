# Cross-Module Intelligence Hub Report

## Summary

The Cross-Module Intelligence Hub links CareDroid modules so users can move from one clinical or operational surface to the next relevant capability without guessing where to go. It turns existing catalog links, route metadata, and demo/live module snapshots into explainable related-module recommendations.

The first implementation is deterministic, privacy-safe, and frontend-local. It does not persist new user data or move PHI between modules. It exposes relationships, recommended next actions, coverage counts, and rationale so modules behave as a connected platform rather than isolated islands.

## Required Module Chains

| Chain | Purpose |
| --- | --- |
| Simulation -> Laboratory -> 3D Viewer | Training cases should connect to lab interpretation and anatomy review when the scenario requires diagnostic context |
| Hospital Map -> Fleet -> IoT | Operational maps should connect physical location, fleet movement, and device telemetry |
| Protocols -> Calculators -> AI Agents | Protocols should connect guideline steps to risk calculators and AI-assisted explanation or next-action support |

## CrossModuleIntelligenceService Contract

`CrossModuleIntelligenceService` should provide:

- `buildCrossModuleHubSnapshot()` for a complete graph snapshot.
- `getRelatedModules(moduleId)` for compact related-module cards.
- `getModulePathway(moduleId)` for chain-level context.
- `getNextActions(moduleId)` for suggested navigational steps.

Each related-module record should include a stable ID, label, route, relationship score, relationship type, rationale, and source evidence count.

## Relationship Signals

| Signal Source | Example Evidence |
| --- | --- |
| Simulation catalog | Scenario integrations and required tools that mention Laboratory, 3D Viewer, Hospital Map, or Medical IoT |
| Protocol library | Linked calculators and linked simulations |
| Calculator hub | Dedicated calculator routes and chat-assisted calculator tools |
| Operational snapshots | Hospital map rooms/devices, fleet routes/vehicles, IoT devices/alerts |
| Route and tool registries | Stable navigation paths and tool IDs |

## Acceptance

Acceptance is met when users can see cross-module recommendations from representative modules, including Simulation, Laboratory, 3D Viewer, Hospital Map, Fleet, IoT, Protocols, Calculators, and AI Agents. No module should behave like an isolated island; each should expose relevant next modules with clear rationale.
