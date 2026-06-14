# Manual Review Required

## Items Requiring Product Or Safety Review

| Item | Classification | Why manual review is required | Suggested next decision |
|---|---|---|---|
| Real-time simulation endpoints | FUTURE_MODULE | Forecasting/intervention recommendations need local validation, clinical governance, and operating policy before active UI exposure. | Decide whether `/emergency/simulation` should remain redirected or become a scoped future route. |
| Federated learning endpoints | FUTURE_MODULE | Privacy, secure aggregation, model registry, and hospital broadcast contracts are placeholders. | Keep review-only until privacy/legal/model governance signoff. |
| Hybrid digital twin endpoints | FUTURE_MODULE | DES/ABM calibration and live data synchronization are fixture-backed. | Keep out of active navigation until validated with hospital data. |
| Research controllers in `emergency-os.research.controller.ts` | FUTURE_MODULE | EMS AI call interrogation, LMECS, federated EMS, handover, and organizational twin are research contracts outside active SPA routes. | Move to a dedicated research module or route only after product approval. |
| Provincial health connector | BACKEND_ONLY | Current response states no production provincial credential/adapter is connected. | Keep as settings/config placeholder or build real adapter later. |
| Integration hub connector | BACKEND_ONLY | HL7/FHIR/device feeds are placeholder contracts. | Keep settings controls; do not expose as active operational feed until connected. |
| Patient-specific workflow logs | BACKEND_ONLY | Backend supports patient log filtering, but patient detail currently uses patient timeline/store logs. | Decide whether patient detail should add a dedicated audit tab. |

## Items Requiring Engineering Cleanup Review

| Item | Classification | Why not changed in this pass | Suggested cleanup |
|---|---|---|---|
| `src/services/smartIntakeApi.js` | NEEDS_MANUAL_REVIEW | Active Smart Intake no longer imports disabled session endpoints, but inventory/tests document them as optional runtime APIs. | Archive or retain after confirming optional identity runtime scope. |
| `src/services/emergencyAnalyticsApi.js` | LEGACY / NEEDS_MANUAL_REVIEW | Store analytics now uses `emergencyOsApi`, but older helper exports may still be referenced. | Remove or archive after reference audit and tests. |
| `src/services/emergencyTransportApi.js` | FRONTEND_ONLY / NEEDS_MANUAL_REVIEW | EMS external feeds and referral mutation parity are not covered by canonical Nest Emergency OS endpoints. | Split optional external transport feeds from canonical ED referrals once backend mutations exist. |
| `src/layout/AppShell.jsx` | LEGACY / NEEDS_MANUAL_REVIEW | Active AppShell is `src/components/AppShell.tsx`; legacy file may be referenced by tests/docs. | Archive after route/layout tests are updated. |
| Emergency pulse/shift pages | FUTURE_MODULE / NEEDS_MANUAL_REVIEW | Not in active route tree; route config redirects pulse/shift aliases. | Keep in `_review` or explicitly add to future roadmap. |
| Old emergency services such as `emergencyWhiteboardService`, `emergencyOperatingSystemService`, `emergencyFlowEngineService` | LEGACY / NEEDS_MANUAL_REVIEW | Some tests and archived demos still reference them. | Run a dedicated reference and test-dependency pass before removal. |

## Active Local-First Workflows

| Workflow | Classification | Current behavior | Needed backend parity |
|---|---|---|---|
| Referral create/status | FRONTEND_ONLY | `ReferralPanel` updates the store and optionally calls non-canonical transport/persistence helpers. | Canonical `POST/PATCH /api/emergency/referrals` endpoints. |
| Smart Intake link existing patient | FRONTEND_ONLY | Requires selected candidate to already be on the active board; records manual-link review locally. | Canonical link-existing endpoint if this becomes persisted behavior. |
| EMS prepare bay / handoff completion | FRONTEND_ONLY | Existing store actions update visible EMS rows. | Canonical EMS mutation endpoints if persistence is required. |

## Files Changed In This Pass

See `docs/architecture/discovery-execution-report.md`.
