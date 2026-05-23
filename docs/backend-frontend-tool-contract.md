# Backend Frontend Tool Contract

Status: source-aligned harness summary

This document summarizes the contract that is enforced by the code inventories and tests. When package tooling is available, regenerate this document from the source inventories with:

```bash
npm run contract:write-docs
```

## Source Of Truth

- Frontend capability spine: `src/data/toolInventory.js`
- Canonical IDs and executor maps: `src/data/clinicalToolIdContract.js`
- Launch resolution: `src/data/clinicalCatalogWiring.js` and `src/navigation/registryToolLaunch.js`
- Frontend API calls: `src/data/frontendApiCallsInventory.js`
- Backend HTTP routes: `src/data/backendHttpRouteInventory.js`
- Backend capability gates: `src/config/backendApiCapabilities.js`
- Backend executor registry: `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- Clinical intelligence controller: `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`

## Contract Lanes

| Lane | Frontend launch type | Backend surface | Rule |
|---|---|---|---|
| Registered executor | `backend-backed` | `POST /api/tools/:id/execute` | Only tools registered in the backend orchestrator registry may use this lane. |
| Clinical intelligence workflow | `backend-backed` | `/api/clinical-intelligence/*` | AI workflows use run IDs, DTO contracts, safety blocks, audit metadata, and permission policies. |
| Chat-assisted workflow | `chat-assisted` | `/api/chat/message` | Assistant-guided flows must not claim direct executor support. |
| Local calculator | `local-only` | none | Deterministic UI calculators remain client-side unless deliberately promoted to an executor. |
| Fleet local page | `fleet-local` | none today | Fleet pages must remain honest about local/mock state until operations APIs exist. |
| Platform/internal API | `platform` | backend route or gated missing route | Must be documented in exposure policy before user-facing use. |

## Current Registered Tool Executors

The backend medical control plane currently exposes only these real POST executors:

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`

The frontend maps these through `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` and validates them through `backendFrontendToolContract.test.js`. Any future executor must update both frontend and backend registries, DTO contracts, API clients, and tests.

## Current Clinical Intelligence Workflows

These are backend-backed platform workflows, not tool-orchestrator executors:

- `ambient-scribe`
- `guideline-rag`
- `differential-ai`
- `timeline-ai`
- `patient-summary-ai`
- `order-set-ai`
- `ai-explainability`
- `clinical-audit`

Their route, endpoint, component, executor status, and permission policy are modeled in `toolInventory.js` and protected in `App.permissions.test.jsx` and `toolInventory.test.js`.

## Harness Rules

- No frontend card may imply backend execution unless `executorStatus` is `registered` or `platform` with a matching endpoint.
- No frontend API call may exist without a backend route or a disabled capability gate.
- No NLU profile may be treated as a POST executor unless the backend registry registers it.
- No clinical intelligence page should be exposed without permission preflight, safety copy, fallback state, and contract tests.
- `ClinicalToolCatalog.jsx` is a trust/source audit view. `/tools` is the user-facing workflow library.
