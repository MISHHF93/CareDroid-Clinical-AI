# Integration Hub & Cosmos Viewer Setup Plan

**Date:** 2026-06-16  
**Status:** Initial scaffold landed in-repo after parallel swarm run was blocked by usage limits.

## Problem

CareDroid has **two Integration Hub implementations** and **no Cosmos Viewer product shell**:

| Layer | Path | Role |
|-------|------|------|
| Real interoperability hub | `backend/src/modules/interoperability/integration-hub.service.ts` | Postgres ingestion, normalization, audit (`POST/GET /api/interoperability/*`) |
| Emergency OS fixture hub | `backend/.../emergency-os.services.ts` → `IntegrationHubService` | Demo envelope at `GET /api/emergency/integrations` |
| Clinical Knowledge Graph | `src/pages/ClinicalKnowledgeGraph.jsx` | Static artifact graph only; not branded as Cosmos |

Prior UI: Integration Hub cards embedded in `EmergencySettings.jsx` only. No dedicated route. No ED store consumer for normalized events.

## What landed (scaffold)

- `src/services/interoperabilityApi.js` — `/api/interoperability/summary`, events list, trace
- `src/hooks/useIntegrationHub.ts` — merges emergency envelope + interoperability APIs
- `src/pages/integrations/IntegrationHubPage.jsx` — dashboard at `/integrations/hub`
- `src/pages/cosmos/CosmosViewer.jsx` — tabs: Artifacts (Knowledge Graph) + Integration topology
- Routes: `/integrations/hub`, `/cosmos`; `/emergency/integrations` redirects to hub
- Nav: Integrations + Cosmos in pilot sidebar
- Settings: links to Hub and Cosmos

## Remaining backlog (20 tasks)

| # | Task | Priority |
|---|------|----------|
| 1 | Delegate emergency-os `IntegrationHubService` to real interoperability counts | High |
| 2 | Wire `integrationEmergencyBridge.js` → store vitals/ADT | High |
| 3 | `IntegrationEventTracePanel` detail drawer | Medium |
| 4 | Emergency OS nodes in `artifactKnowledgeGraph.js` | Medium |
| 5 | Integration topology edges (connected vs broken) in graph | Medium |
| 6 | SVG `CosmosGraphCanvas` neighbor visualization | Medium |
| 7 | Realtime: apply normalized events from SSE into store | High |
| 8 | RBAC: `VIEW_INTEGRATIONS` on interoperability calls from ED shell | Medium |
| 9 | Backend tests for enriched integrations envelope | Medium |
| 10 | Cosmos Viewer vitest suite | Low |
| 11 | Unify duplicate FHIR/HL7 settings vs hub status | Medium |
| 12 | Connector test actions on Hub page | Medium |
| 13 | Link Copilot context to hub event summaries | Low |
| 14 | Medical IoT dashboard → hub event source wiring | Medium |
| 15 | Explainability report sections 6.30 / 6.31 | Low |
| 16 | Platform `/platform/cosmos` alias verification | Done |
| 17 | Pilot nav visibility for integrations/cosmos | Done |
| 18 | POST ingest admin UI (review-only) | Low |
| 19 | Alert routing: hub anomalies → ED alertEngine | High |
| 20 | Lint/build/contract test gate | Ongoing |

## Architecture target

```text
External feed → POST /api/interoperability/events
  → IntegrationHubService (Postgres)
  → IntegrationAutomationRouter (normalize)
  → integrationEmergencyBridge → emergencyStore
  → central node / OI / alerts

Emergency UI:
  IntegrationHubPage ← useIntegrationHub ← emergency + interoperability APIs
  CosmosViewer ← artifacts graph + hub topology tab
```

## Related docs

- `docs/architecture/disconnected-integrations.md`
- `docs/architecture/current-integration-inventory.md`
- `docs/architecture/caredroid-explainability-report.md`
