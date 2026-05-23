# Tool Render Execute Matrix

Status: source-aligned harness summary

This matrix should be regenerated from the render/execute matrix inventory when package tooling is available:

```bash
npm run tool-matrix:write-docs
```

## Render And Execute Lanes

| Lane | Renders Where | Executes Where | Required fallback |
|---|---|---|---|
| Local calculator form | `Calculators.jsx` through route-derived calculator slugs | Browser calculator utility | Validation errors and result empty state. |
| Chat-assisted workflow | `/assistant`, `/chat`, or guided calculator hub card | Chat API or local Assistant seed | Guarded chat seed and no direct executor claim. |
| Registered backend executor | Tool page or Assistant executor card | `POST /api/tools/:id/execute` | Structured validation, unsupported, and network error states. |
| Clinical intelligence workflow | Dedicated tool page and Assistant handoff | `/api/clinical-intelligence/*` | Permission-denied, review-required, safety, audit, and explainability states. |
| Fleet local operations page | `/fleet/*` and Operations workspace | Browser/local mock services today | Loading, empty, error, retry, and local/mock notice. |
| Trust/source audit row | `ClinicalToolCatalog.jsx` | none unless launchable through canonical resolver | Clear not-launchable label. |

## Current Execution Boundary

Only these tools are registered direct executors:

- `sofa-calculator`
- `drug-interactions`
- `lab-interpreter`

Everything else must be represented as local-only, chat-assisted, clinical-intelligence platform, fleet-local, internal, or unsupported-planned.

## Render Safety Rules

- Unknown `/tools/*` and `/fleet/*` paths must resolve through `ToolsAreaFallback` and `ToolNotFound`, not blank UI.
- Calculator deep links must come from `CALCULATOR_ROUTE_DEFS`.
- Assistant cards must use canonical launch plans and must not recommend unsupported actions as executable.
- Clinical intelligence results must show decision-support limitations and human review language.
- Mobile render coverage should come from `responsiveQaMatrix.js` and route smoke tests.
