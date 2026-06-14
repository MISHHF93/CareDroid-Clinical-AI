# Nested Elements Cleanup Report

## Path Adaptation

The latest direct prompt references `/frontend/src`. Current repository discovery shows the active app path is `src/`, with `src/App.jsx` and `src/components/AppShell.tsx`. No new `/frontend/src` app, router, shell, layout, or store was created.

## Nested Frontend Elements

| Element | Classification | Evidence | Cleanup action |
|---|---|---|---|
| `src/components/AppShell.tsx` | active and correctly used | Imported by `src/App.jsx` and wraps active route outlet. | Preserved. |
| `src/layout/AppShell.jsx` | legacy / duplicated / needs manual review | Not imported by active router; tests and reports still read/import it. | Fixed broken imports only; retained as compatibility artifact. |
| `src/layout/AppShell.css` | legacy / needs manual review | Referenced by layout/read-source tests and responsive reports. | Retained. |
| `src/components/EmergencyWhiteboard.jsx` | compatibility re-export | Active route imports this path, which re-exports `src/pages/emergency/index.tsx`. | Preserved to avoid route/test churn. |
| `src/pages/emergency/index.tsx` | active and correctly used | Active whiteboard page implementation. | Preserved. |
| `src/pages/emergency/pulse/**`, `src/pages/emergency/shift/**` | future module / needs manual review | Not in active route tree; redirects/reports identify as future or review. | Documented, not moved. |
| `src/features/future-modules/_review/**` | future module | Already archived review area. | Preserved. |

## Nested Backend Elements

| Element | Classification | Evidence | Cleanup action |
|---|---|---|---|
| `backend/src/modules/emergency-os/emergency-os.module.ts` | active and correctly used | Imported by `backend/src/app.module.ts`. | Preserved. |
| `backend/src/modules/emergency-os/emergency-os.controller.ts` | active and correctly used | Canonical Nest `/api/emergency/*` controller. | Preserved. |
| `backend/src/modules/emergency-os/emergency-os.services.ts` | active and correctly used | Module-local DI services used by controller. | Preserved. |
| `backend/src/modules/emergency-os/emergency-os.research.controller.ts` | future module / needs manual review | Mounted in module but exposes research endpoints outside active frontend routes. | Documented. |
| `backend/src/modules/emergency-os/emergency-os.advanced-services.ts` | future module | Simulation/federated/twin review-only services. | Documented. |
| `backend/src/services/*.ts` Emergency OS singleton services | legacy / optional runtime / needs manual review | Export singleton instances and are registered through optional service registry. | Documented; not removed. |
| `backend/src/scheduler/reassessment.scheduler.ts` | optional runtime | Started only inside `registerEmergencyMongooseRuntime` when optional Mongoose Emergency OS is enabled. | Preserved; no new scheduler started. |

## Responsive Requirement

`index.html` already contains:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

No viewport edit was needed. Fixed-width/card/border responsive work was intentionally not touched because other active workers are handling responsive UI and nested card cleanup.

## Cleanup Applied

- Reconciled legacy layout import paths in `src/layout/AppShell.jsx`.
- Reconciled mounted workload panel store import to `src/store/emergencyStore.ts`.

## Not Cleaned Automatically

- The legacy AppShell file was not archived because test files import or read it directly.
- Future/review pages were not moved because they are already represented in `_review` or route reports and may have test references.
- Optional backend singleton runtime and scheduler were not deleted because they are still imported by `backend/src/main.ts`, `backend/src/api/health.routes.ts`, and service-registry tests.
