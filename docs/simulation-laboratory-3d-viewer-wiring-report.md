# Simulation, Laboratory, and 3D Viewer Wiring Report

## 1. Source Search Findings

### Medical Simulation

| Finding | Files | Classification | Notes |
|---|---|---|---|
| AI training dashboard | `src/pages/TrainingDashboard.jsx`, `src/services/trainingApi.js`, `backend/src/modules/training/*` | Complete and visible, but not medical simulation | Existing `/training` surface is for model training/evaluation, not virtual patient simulation. |
| Simulation/scenario terms | `src/services/platformGovernanceApi.js`, `src/data/toolRegistry.js`, calculator/recommendation tests | Partial / adjacent | Existing mentions are validation scenarios, protocol training references, or calculator recommendation scenarios. |
| Medical simulation suite | None found before this wiring pass | Not implemented | No dedicated medical simulation route, scenario library page, virtual patient module, or backend simulation module existed. |

### Laboratory

| Finding | Files | Classification | Notes |
|---|---|---|---|
| Lab Interpreter frontend | `src/pages/tools/LabInterpreter.jsx` | Complete and visible | Existing `/tools/lab-interpreter` page interprets entered lab values. |
| Lab interpreter backend executor | `backend/src/modules/medical-control-plane/tool-orchestrator/services/lab-interpreter.service.ts` | Backend-backed | Existing POST executor for `lab-interpreter`; not a lab operations dashboard. |
| Lab-related alerts/charts | `src/pages/ClinicalAlertsPage.jsx`, `src/components/charts/LabAnomalyScatter.jsx`, `src/utils/riskScoring.js` | Partial / frontend-only | Reusable lab concepts exist, but no unified laboratory route or specimen dashboard existed. |
| Laboratory operations endpoints | `backend/src/**` | Not implemented | No `GET /laboratory/results`, `GET /laboratory/specimens`, `GET /laboratory/alerts`, `GET /laboratory/trends`, or `POST /laboratory/interpret` controllers were found. |

### 3D Viewer

| Finding | Files | Classification | Notes |
|---|---|---|---|
| Three.js / React Three Fiber dependency | `package.json` | Not implemented | No `three`, `@react-three/fiber`, model-viewer, or DICOM viewer package is installed. |
| Committed model assets | `src/assets/**`, `public/**` | Not implemented | No committed `.glb`, `.gltf`, `.obj`, `.dcm`, or DICOM assets were found. |
| Existing model viewer component | `src/pages/**`, `src/components/**` | Not implemented | No dedicated 3D/anatomy/radiology viewer component existed. |

## 2. Existing Code Found

- Laboratory interpretation was already present through `src/pages/tools/LabInterpreter.jsx` and the backend `lab-interpreter` orchestrator executor.
- AI training infrastructure was already present through `/training`, but it is model training rather than medical simulation.
- 3D viewer support was not present as a working component, dependency, or asset pipeline.

## 3. Orphaned Or Hidden Code Found

- No complete hidden/orphaned medical simulation suite was found.
- No complete hidden/orphaned laboratory dashboard was found.
- No complete hidden/orphaned 3D viewer was found.
- Lab-related charting and alert snippets are adjacent frontend-only pieces, not currently wired as a full lab module.

## 4. Routes Added

- `/simulation` renders `src/pages/MedicalSimulationSuite.jsx`.
- `/laboratory` renders `src/pages/LaboratoryDashboard.jsx`.
- `/3d-viewer` renders `src/pages/Medical3DViewer.jsx`.

## 5. Aliases Added

- `/medical-simulation` redirects to `/simulation`.
- `/lab` redirects to `/laboratory`.
- `/anatomy-viewer` redirects to `/3d-viewer`.

## 6. Inventory Entries

Added canonical registry IDs:

- `simulation-suite` with category `Education & Simulation` and type-like inventory category `simulation`.
- `laboratory-dashboard` with category `Laboratory` and type-like inventory category `laboratory`.
- `medical-3d-viewer` with category `Visualization` and type-like inventory category `visualization`.

Updated:

- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js` via derived inventory/launch behavior
- `src/data/medicalToolsCatalogIndex.js` via derived catalog rows
- `src/data/sourceCodeToolDiscovery.js`
- `src/data/backendFrontendToolContract.js`
- `src/data/toolInventory.js`

## 7. Dashboard Cards

The command dashboard now includes:

- Quick Action card: `Medical Simulation`
- Quick Action card: `Laboratory`
- Quick Action card: `3D Viewer`
- Dedicated panel: `Simulation, Lab, and 3D`

Each launches through the canonical route and unified tool launch behavior.

## 8. Backend/API Status

- Existing live backend support: `lab-interpreter` executor only.
- No dedicated laboratory REST endpoints were found.
- No simulation backend module was found.
- No visualization/3D backend module was found.
- Backend NLU keyword patterns were added for assistant launch recognition only. They do not claim POST executor support.

## 9. Demo/Live Data Distinction

- `/simulation` labels the surface as `Demo training simulation - Not live patient data`.
- `/laboratory` labels the surface as `Demo laboratory dashboard - Not live patient data`.
- `/3d-viewer` labels the surface as `Demo 3D viewer - No diagnostic imaging`.
- The 3D viewer explicitly states that the asset-safe fallback is active.

## 10. 3D Asset Safety Notes

- No GLB/GLTF/OBJ/DICOM files are imported.
- No local-only paths are referenced.
- No new 3D package dependency was added.
- The route uses CSS/SVG-style placeholder rendering, so production builds do not depend on missing model assets.

## 11. Tests Added or Updated

- `src/data/simulationLaboratoryViewerWiring.test.js`
- `src/pages/SimulationLaboratoryViewer.test.jsx`
- `src/routing/canonicalRouteRedirects.test.js`
- `src/data/commandDashboardModel.test.js`
- `src/components/QuickCommandLauncher.test.jsx`
- `src/test/responsiveRegression.routes.js`
- `src/test/routePagesSmoke.test.jsx`
- `src/data/toolInventory.test.js`

Focused verification passed for route rendering, aliases, inventory, assistant launch resolution, dashboard grouping, Quick Command search entries, UI demo labels, and 3D fallback safety.

## 12. Remaining Work

- Connect `/laboratory` to real LIS/FHIR endpoints if backend routes such as `/laboratory/results`, `/laboratory/specimens`, `/laboratory/alerts`, or `/laboratory/trends` are implemented later.
- Add real scenario persistence, scoring history, and instructor review to `/simulation` if a simulation backend is introduced.
- Add an explicit committed model manifest and approved viewer dependency before replacing the `/3d-viewer` placeholder with true 3D rendering.
- Add permissions and audit logging if any of these surfaces move from demo/local state to live patient data workflows.
