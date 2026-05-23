# Tool Visibility Matrix

Status: source-aligned harness summary

This matrix should be regenerated from the tool visibility inventory when package tooling is available:

```bash
npm run visibility-matrix:write-docs
```

## Visibility Surfaces

| Surface | Purpose | Source |
|---|---|---|
| `/tools` | User-facing workflow library | `getUserFacingToolRegistryProjection()` from `toolInventory.js` |
| Sidebar | Primary navigation and selected tool shortcuts | `getSidebarToolRegistryProjection()` |
| Calculator hub | Built-in calculator forms and chat-assisted calculator workflows | `calculatorHubManifest.js` and `clinicalToolRoutes.js` |
| Assistant | Workflow recommendation and guided execution layer | `chatCapabilitySuggestions.js`, `chatExecutionModel.js`, and `registryToolLaunch.js` |
| Patients | Patient context workflow launcher | `Patients.jsx` using centralized registry launches for tool-backed cards |
| Operations | Fleet, alerts, analytics, and audit launcher | `Operations.jsx` using centralized registry launches for fleet tools |
| Trust/source catalog | Developer/source/audit coverage | `ClinicalToolCatalog.jsx` |

## Visibility Rules

- Normal users should discover launchable clinical actions through `/tools`, Assistant, Patients, Operations, or Sidebar.
- Internal, phantom, planned, API-only, and source-scan rows belong in the trust/source catalog only.
- Every visible user-facing tool card must have a route, a chat-assisted launch, or a deliberate unsupported state.
- Workspace cards that represent registry tools must route through `applyRegistryToolLaunch()`.
- Fleet pages must remain labeled as local/mock or decision-support until backend operations APIs exist.

## Hidden Functionality Guardrails

- `ToolsOverview.visibility.test.jsx` verifies that `/tools` renders one card per user-facing canonical tool and excludes phantom audit rows.
- `ClinicalToolCatalog.launchButtons.test.jsx` protects trust/source catalog launch buttons.
- `registryToolLaunch.test.js` protects centralized route and Assistant launch behavior.
- `responsiveQaMatrix.test.js` protects mobile route coverage.
