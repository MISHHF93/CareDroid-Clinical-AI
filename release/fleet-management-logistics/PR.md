# Add Fleet Management + Logistics AI Foundation

## 1. Summary

This change introduces a **fleet operations and logistics decision-support foundation** in CareDroid Clinical AI. Four tools are wired end-to-end through the existing clinical tool spine (registry → NLU catalog → discovery → routes → sidebar → launch), with **Tier A** dedicated fleet pages for operational UIs and **Tier B** chat-assisted dispatch intelligence on the calculators hub.

All surfaces are **decision-support only**: they do not auto-assign vehicles, push routes to telematics, create work orders, or execute live fleet control. Tier A tools use **deterministic client-side engines** (mock telemetry, rules-based maintenance scoring, sort-based route planning) suitable for demo and integration testing until backend fleet services land.

**Test coverage:** 355+ deterministic Vitest tests across comprehensive wiring, UI, services, and route validation (`npm run test:pr6-fleet`).

---

## 2. Features added

### Tier A — dedicated fleet pages

| Tool ID | Name | Route | Capability |
|---------|------|-------|------------|
| `fleet-command` | Fleet Command | `/fleet/command` | Operational dashboard: summary metrics, maintenance breakdown, per-vehicle energy meters, utilization/ETA, operational alerts |
| `predictive-maintenance` | Predictive Maintenance | `/fleet/predictive-maintenance` | Form-based maintenance risk scoring (0–100), inspection windows, anomaly indicators, contributing factors |
| `route-optimizer` | Route Optimization | `/fleet/route-optimizer` | Multi-stop planner: priority/window ordering, traffic multiplier, savings estimate, window-risk warnings |

### Tier B — chat-assisted

| Tool ID | Name | Launch | Capability |
|---------|------|--------|------------|
| `dispatch-ai` | Dispatch Intelligence | `/tools/calculators` → `/dashboard` | Guided chat for assignment options, prioritization, bottleneck review; human dispatcher approval required |

### Shared UX

- `FleetPageChrome`: skip link, back navigation, safety banner, main landmark
- `fleetUxShared.css`: focus-visible, touch targets, operational warning styles, anti-automation footers
- Mock telemetry via `fleetTelemetryService.js` (development builds)

---

## 3. Architecture changes

Fleet tools follow the **same spine as PR1–PR5 clinical calculators**, avoiding a parallel routing or catalog system.

```
toolRegistry.js
    ↓
clinicalIntentToolCatalog.js (+ chatAssistedFleet/dispatchAi.js)
    ↓
clinicalCatalogWiring.js (resolveCatalogLaunch, resolveNavigationPathForLaunch)
    ↓
sourceCodeToolDiscovery.js (aliases)
    ↓
medicalToolsCatalogIndex.js (catalog rows)
    ↓
App.jsx (lazy fleet routes) + Calculators.jsx (fleet-dispatch hub group)
    ↓
backend tool.patterns.ts (NLU keywords + disambiguation helpers)
```

**Design choices:**

- **Single fleet category** (`category: 'fleet'`) across NLU and catalog for audit consistency.
- **No new top-level Nest modules** in this PR; backend changes are NLU/orchestrator classification only.
- **Tier C hooks** reserved in scoring/route services (`SCORING_ENGINE_AI`, `ROUTE_ENGINE_GRAPH`) without enabling ML/graph execution in production paths.
- Constants live in `prFleetTestConstants.js` (`PR_FLEET_*`); clinical PR6 (COPD GOLD) remains separate to avoid ID collision.

---

## 4. Registry changes

### `toolRegistry.js`

Four new **Fleet** category entries with sidebar icons, shortcuts, and paths:

- `fleet-command` → `/fleet/command`
- `predictive-maintenance` → `/fleet/predictive-maintenance`
- `route-optimizer` → `/fleet/route-optimizer`
- `dispatch-ai` → `/tools/calculators` (`panelTool: 'calculators'`)

### `clinicalIntentToolCatalog.js`

Matching NLU profiles for all four tools with fleet `chatSeed`s and paths.

### `clinicalToolIdContract.js`

- Fleet IDs included in `PR_FLEET_ALL_REGISTRY_IDS` / audit slices
- `dispatch-ai` in `AI_EXECUTABLE_NLU_TOOL_IDS` (chat/NLU routing)
- **Not** in `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` (no POST executor)

### Discovery aliases

NLU phrases and hyphenated slugs (e.g. `fleet-dashboard` → `fleet-command`, `dispatch` → `dispatch-ai`) in `PR_FLEET_ALL_ALIAS_PAIRS`.

---

## 5. Routing changes

### `App.jsx` (authenticated)

| Path | Component |
|------|-----------|
| `/fleet/command` | `FleetDashboard` |
| `/fleet/predictive-maintenance` | `PredictiveMaintenance` |
| `/fleet/route-optimizer` | `RouteOptimizer` |
| `/fleet/*` | `ToolsAreaFallback` |

### Launch behavior

| Tool | `resolveCatalogLaunch` path | Navigation target |
|------|----------------------------|-------------------|
| Tier A fleet tools | Dedicated `/fleet/...` path | Same path (`Open`) |
| `dispatch-ai` | `/tools/calculators` | `/dashboard` (`Start guided chat`) |

### `clinicalToolRoutes.js`

Fleet Tier A paths registered in `REGISTRY_TOOL_PATHS` / `KNOWN_TOOL_AREA_PATHS`; `isFleetAreaPath()` helper for audits.

### Explicit non-routes

- No `/tools/calculators/<fleet-id>` slug cases for Tier A tools
- No dedicated `/fleet/dispatch-ai` page (hub + chat only)

---

## 6. Backend considerations

### Shipped in this PR

- **`tool.patterns.ts`**: keyword patterns and `category: 'fleet'` for all four tool IDs
- **Disambiguation helpers**: `preferFleetCommand`, `preferPredictiveMaintenance`, `preferRouteOptimizer`, `preferDispatchAi`
- **`tool-orchestrator.registry.ts`**: fleet NLU IDs (including `dispatch-ai`) in `NLU_TOOL_IDS_WITHOUT_EXECUTOR` — chat routing only, no `registerTool()` handler

### Not shipped (recommended follow-up)

| Capability | Proposed location | Notes |
|------------|-------------------|-------|
| Live telemetry | `GET /api/fleet/command/snapshot` | Replace `fetchFleetCommandSnapshot` mock |
| Maintenance scoring API | `POST /api/fleet/maintenance/score` | Optional server-side rules parity |
| Route optimization API | `POST /api/fleet/routes/optimize` | Graph/VRP engine behind feature flag |
| Dispatch context | Chat context injection from fleet DB | Read-only fleet snapshot in chat |
| Persistence | `fleet_vehicle`, `telemetry_reading`, `dispatch_request` tables | Phased P0–P3 |

**Contract:** `dispatch-ai` has `backendExecutable: true` in the frontend catalog (NLU/chat may hit the control plane) but **must not** gain a POST `/tools/:id/execute` mapping without explicit product approval and orchestrator registration.

---

## 7. Safety considerations

### Automation overreach prevention

- **Header safety banners** on every Tier A page (decision support only; no live system control)
- **`fleet-no-automation-note`** footers (human approval required for dispatch, maintenance, routing)
- **Dispatch chat seed** (STEP 0): explicit denial of authority to assign vehicles or modify live systems
- **Hub UI**: visible “Human approval required — no auto-assign” pill on Dispatch Intelligence card
- **No orchestrator POST executors** for any fleet tool ID

### Operational warnings

- Dashboard: alert when maintenance count or low-energy units elevated; critical banner for low-energy vehicle labels
- Predictive maintenance: ops alert for critical/high risk, urgent inspection windows, critical anomalies
- Route optimizer: ops alert when stops are late vs delivery windows; route-level warning list

### Data fidelity

- Dashboard labeled as **mock telemetry** in development
- Scoring and routing outputs are **suggestions** — verify against dispatch system of record and CMMS

---

## 8. Accessibility improvements

| Area | Implementation |
|------|----------------|
| Keyboard | Skip-to-main with programmatic focus; 44px minimum controls; `focus-visible` outlines |
| Screen readers | Landmarks (`main`, `header`); `aria-busy` loading; `role="alert"` for errors/ops warnings; `role="meter"` for energy; `fleet-sr-only` badge prefixes |
| Forms | `htmlFor` labels; `aria-invalid` + `aria-describedby` on validation; `noValidate` with explicit alerts |
| Live regions | `aria-live="polite"` on assessment/route results; refresh status announcement on dashboard |
| Motion | `prefers-reduced-motion` disables loading/transition animations |
| Mobile | Responsive stat grids, stacked vehicle cards, full-width toolbar buttons |
| Dispatch hub | `fleetChatAssistedLaunchAriaLabel` with auto-assign and human-approval context |

Contract tests: `src/pages/fleet/fleetUxAccessibility.test.js`.

---

## 9. Testing

### Primary command

```bash
npm run test:pr6-fleet
```

### Suite breakdown (355 tests)

| Layer | Files | Focus |
|-------|-------|-------|
| Comprehensive | `src/data/pr6FleetComprehensive.test.jsx` (130) | All 8 audit dimensions in one deterministic suite |
| Consistency | `src/data/prFleetConsistency.test.js` (88) | Cross-layer ID/route/catalog/discovery/launch |
| Per-tool wiring | `*Wiring.test.js` × 4 | Tool-specific contracts |
| Services | `predictiveMaintenanceScoring.test.js`, `routeOptimizationService.test.js`, `fleetTelemetryService.test.js` | Scoring, routing, telemetry |
| UI | `src/pages/fleet/*.test.*` | Rendering, forms, UX |
| Routes | `clinicalToolRoutes.test.js` | Path registry drift |

### Test principles

- **Deterministic** fixtures in `src/data/testHelpers/fleetToolsTestFixtures.js`
- **No snapshots**
- **Isolated** mocks (telemetry fetch only in dashboard UI tests)
- **No live network** or backend required for CI

---

## 10. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Users treat mock dashboard as live telemetry | Medium | High | Safety copy, mock source label, footer disclaimers |
| NLU routes to dispatch-ai without human review | Low | High | Chat seed STEP 0; hub pill; no POST executor |
| Alias collision with clinical tools | Low | Medium | `PR_FLEET_*` audit lists; `prFleetConsistency` tests |
| Route window logic incorrect vs real dispatch | Medium | Medium | Documented as sort estimate; ops warnings; future graph engine |
| `dispatch-ai` `backendExecutable` misunderstood as POST-capable | Medium | Medium | Documented in contract; tests assert no orchestrator mapping |
| Fleet routes missing from App.jsx after refactor | Low | High | `pr6FleetComprehensive` App.jsx source checks |
| Performance on large fleets (UI list) | Low | Low | Mock capped; pagination deferred to backend phase |

**Overall risk:** **Low–medium** for merge — client-only, no destructive automation, broad test coverage. Production operational risk remains with **integrators** until live data APIs ship.

---

## 11. Rollout strategy

### Phase 1 — Merge (this PR)

1. Merge to `main` after CI green (`test:pr6-fleet` + existing frontend CI).
2. Deploy frontend build; verify four tools appear in sidebar under Fleet category.
3. Smoke test Tier A routes and Dispatch hub launch manually (see reviewer checklist).

### Phase 2 — Staged enablement (optional)

- Feature-flag fleet sidebar entries per tenant if multi-tenant config exists.
- Monitor NLU classification logs for fleet toolId hit rate and disambiguation fallthrough.

### Phase 3 — Backend integration (follow-up PRs)

- P0: `GET /api/fleet/command/snapshot` behind env flag `FLEET_TELEMETRY_LIVE=true`
- P1: Maintenance and route POST APIs with request validation
- P2: Dispatch chat context provider
- P3: ML/graph engines behind explicit opt-in

### Communication

- Release notes to ops: **decision support only**; no telematics write path
- Training: distinguish Fleet Command (read snapshot) vs Dispatch Intelligence (chat options)

---

## 12. Rollback strategy

### Frontend-only rollback

1. Revert merge commit or redeploy previous frontend artifact.
2. Fleet routes become 404 / sidebar entries removed — no database migration to undo.

### Partial rollback (tool-by-tool)

- Remove individual `toolRegistry` entries and rerun catalog index build (if applicable) to hide tools without full revert.
- Disable NLU patterns by reverting `tool.patterns.ts` fleet block (prevents chat routing to fleet tools).

### Backend rollback

- This PR does not add fleet REST endpoints; no backend rollback required unless NLU patterns were deployed separately.

### Verification after rollback

- Confirm `npm run test:run:frontend` passes on reverted branch.
- Confirm no orphaned catalog rows reference fleet IDs (consistency tests on main).

---

## 13. Future roadmap

| Horizon | Deliverable |
|---------|-------------|
| **P0** | Live fleet telemetry API + auth; replace mock in `fleetTelemetryService` |
| **P1** | `FleetModule` (Nest): Command, Telemetry, Maintenance, Routing, Dispatch services |
| **P1** | CMMS integration port (read-only work order suggestions) |
| **P2** | Graph/VRP route engine (`ROUTE_ENGINE_GRAPH`) with feature flag |
| **P2** | Maintenance ML scoring hook (`SCORING_ENGINE_AI`) with human-in-loop |
| **P3** | Real-time dispatch assist with read-only fleet state injection into chat |
| **P3** | Audit logging for dispatch recommendations (who approved what) |
| **Ongoing** | E2E Playwright flows for fleet Tier A + dispatch hub |

See `FUTURE_AI_RECOMMENDATIONS.md` in this folder for ML/AI-specific guidance.

---

## Related artifacts

- [CHANGELOG.md](./CHANGELOG.md)
- [REVIEWER_CHECKLIST.md](./REVIEWER_CHECKLIST.md)
- [FUTURE_AI_RECOMMENDATIONS.md](./FUTURE_AI_RECOMMENDATIONS.md)
