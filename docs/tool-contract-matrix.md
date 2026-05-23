# Tool Contract Matrix

Status: source-aligned harness summary

This matrix should be regenerated from repository contracts when package tooling is available:

```bash
npm run test:contract-matrix
```

## Canonical Contract Columns

Every user-facing capability should be representable with these fields from `src/data/toolInventory.js`:

| Field | Purpose |
|---|---|
| `id` | Canonical registry or platform capability ID. |
| `route` / `navigationPath` | User-facing route or Assistant/chat launch target. |
| `launchType` | `local-only`, `chat-assisted`, `backend-backed`, `clinical-page`, `fleet-local`, `hub`, `platform`, or `unsupported-planned`. |
| `surface` | Tool page, calculator form, chat-assisted flow, fleet page, hub, or internal. |
| `component` | React component path when a page or form exists. |
| `endpoint` | Backend API path when a backend call exists. |
| `requestDto` / `responseDto` | Request and response contract names. |
| `executorStatus` | `registered`, `unsupported`, `none`, or `platform`. |
| `permissionPolicy` | Frontend preflight permissions aligned with backend controller guards. |
| `testCoverage` | Test files that protect the route, launch, inventory, backend, or responsive contract. |

## Contract Groups

| Group | Canonical lane | Notes |
|---|---|---|
| Deterministic calculators | `local-only` or `hub` | Route-derived through `clinicalToolRoutes.js` and `calculatorHubManifest.js`. |
| Chat-assisted calculators | `chat-assisted` | Launch through Assistant, never direct POST executors. |
| Registered executors | `backend-backed` + `registered` | Limited to SOFA, drug interactions, and lab interpreter today. |
| Clinical intelligence workflows | `backend-backed` + `platform` | Use `clinicalIntelligenceApi.js` and `/api/clinical-intelligence/*`. |
| Fleet pages | `fleet-local` | Local/mock operational pages until backend telemetry ships. |
| Trust/audit records | `platform` or audit-only | Visible in `ClinicalToolCatalog.jsx`, not normal `/tools` discovery. |

## Current Harness Invariants

- `/tools` should render one card per user-facing launchable inventory record.
- `ClinicalToolCatalog.jsx` may show internal, planned, phantom, source-scan, and API rows, but must label itself as trust/source audit.
- `registryToolLaunch.js` is the only supported card/sidebar/catalog launch planner.
- `backendFrontendToolContract.test.js`, `toolInventory.test.js`, and `toolRenderExecuteMatrix.test.js` should fail if a user-facing capability has no route, no launch behavior, or dishonest executor status.
