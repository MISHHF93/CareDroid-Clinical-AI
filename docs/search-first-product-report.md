# Search First Product Report

Date: 2026-06-08

## Goal

Search becomes the primary discovery mechanism. One search should help users find:

- tools
- calculators
- simulations
- workflows
- AI agents
- protocols
- operations

## Current Coverage

| Search Target | Current Coverage | Source |
| --- | --- | --- |
| Tools | Covered through user-facing tool inventory and asset projection | `toolInventory`, `assetInventory`, `QuickCommandLauncher` |
| Calculators | Covered through tool inventory and calculator routes | `toolInventory`, `clinicalToolRoutes` |
| Simulations | Covered as scenario entries | `medicalSimulationCatalog` |
| Workflows | Partially covered through platform workflows | `platformOperatingSystem` |
| AI Agents | Partially covered as destination only, not individual rows | `/agents`, workspace defaults |
| Protocols | Partially covered through tools/assets, not pathway records | `protocolPathwayLibrary` |
| Operations | Partially covered through routes/tools, not operations surface metadata | `digitalOperationsCenter`, `Operations` |

## Gaps

1. Protocol pathway records like Sepsis, ACS, Stroke, DKA, and Trauma are not first-class global search results.
2. AI model and agent-style records like Guardrails, RAG Evidence Engine, Simulation Tutor, and workspace agents are not first-class global search results.
3. Operations surfaces like Digital Twin, Hospital Map, Medical IoT, Fleet, Notifications, and System Health are not indexed with their operational metadata.
4. Automation/workflow templates outside `PLATFORM_WORKFLOWS` are not indexed.
5. Quick Command filters discovery entries to assets, workflows, and simulations only, so newly indexed protocols, AI, and operations records would not appear there without widening the filter.

## Implementation Plan

1. Keep `searchFirstDiscovery.js` as the single frontend search adapter.
2. Add pure adapters for protocols, AI models, workspace AI agents, operations surfaces, and automation templates.
3. Expand `/search` categories to include `protocol`, `ai-agent`, `ai-model`, `operation`, and `automation`.
4. Expand Quick Command discovery to include the new indexed kinds after the user types.
5. Add tests proving global search finds protocols, AI, operations, workflows, simulations, tools/assets, and workspace records.

## Expected Result

Users can use one search to discover clinical tools, calculators, simulations, workflows, AI agents/models, protocols, and operations surfaces, while the existing app shell and route system remain unchanged.
