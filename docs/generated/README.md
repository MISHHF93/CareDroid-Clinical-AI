# CareDroid living documentation index

> Generated: **2026-09-02T20:12:48.120Z**
> Engine: `living-documentation`

## Metrics

| Section | Count |
|---------|------:|
| routes | 16 |
| apis | 54 |
| roles | 12 |
| workflows | 21 |
| services | 32 |
| aiCapabilities | 10 |
| permissions | 38 |
| components | 12 |
| configuration | 81 |

## Generated files

- [routes.md](./routes.md)
- [apis.md](./apis.md)
- [roles.md](./roles.md)
- [workflows.md](./workflows.md)
- [services.md](./services.md)
- [ai-capabilities.md](./ai-capabilities.md)
- [permissions.md](./permissions.md)
- [components.md](./components.md)
- [configuration.md](./configuration.md)
- [contextual-help.md](./contextual-help.md)
- [superseded-manifest.json](./superseded-manifest.json)

## Superseded static documentation

The following manual docs are replaced by this generated set:

- `docs/specs/page-map.md` → `docs/generated/routes.md` — Route records now derive from src/config/routes.config.ts and caredroidPageArchitecture.config.ts
- `docs/specs/role-permission-map.md` → `docs/generated/permissions.md` — Permissions derive from emergencyPermissionRegistry.ts
- `docs/architecture/endpoint-to-frontend-matrix.md` → `docs/generated/apis.md` — API bindings derive from pageApiBinding.registry.ts and emergencyOsApi.ts
- `docs/specs/ai-chief-spec.md` → `docs/generated/ai-capabilities.md` — AI Chief domains derive from aiChiefOrchestrationModel.ts
- `docs/workflows/patient-journey.md` → `docs/generated/workflows.md` — Workflow steps derive from unifiedPatientWorkflowModel.ts
- `docs/services/service-catalog.md` → `docs/generated/services.md` — Platform services derive from emergencyPlatform.config.ts
- `docs/specs/route-map.md` → `docs/generated/routes.md` — Runtime routes derive from routes.config.ts and caredroidPageArchitecture.config.ts
- `docs/specs/full-emergency-care-journey.md` → `docs/generated/workflows.md` — Journey phases derive from hospitalOperatingSystemModel and unifiedPatientWorkflowModel
- `docs/architecture/endpoint-to-frontend-matrix.md` → `docs/generated/apis.md` — Endpoint matrix is generated from emergencyOsApi and pageApiBinding.registry

## In-app help

- Press `?` to open HelpHub with contextual procedures.
- `ContextualGuidance` banners link to HelpHub topics on key workflow surfaces.
- Source registries: `src/config/livingDocumentationModel.ts`, `src/services/livingDocumentationService.ts`.
