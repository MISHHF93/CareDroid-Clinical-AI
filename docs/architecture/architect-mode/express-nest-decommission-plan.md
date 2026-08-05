# Express → Nest Decommission Plan

**Status:** `backend/src/api/routes-registry.ts` no longer exists (Cycle 287) — an empty `ROUTES` array with nothing left to ever populate it was dead weight, not a documented extension point. Nest owns 100% of the HTTP routing surface. Only the Mongoose runtime connection itself (behind `ENABLE_MONGOOSE_EMERGENCY_OS`, default `false`) remains as a live dependency for anything outside routing (WebSocket support, the reassessment scheduler, service-registry init).  
**Date:** 2026-07-15 (updated 2026-08-05, Cycles 277–287)  
**Goal:** Single HTTP authority = Nest controllers; Express registry becomes adapter-only then removed.

## 2026-08-05 update (Cycle 287) — routes-registry.ts deleted entirely

Cycle 286 left `ROUTES: ApiRouteRegistration[] = []` in place, reasoning it
was still needed as the mount point for the `/api/routes` discovery endpoint
and "the documented extension point if a genuinely new legacy-style route
group is ever needed." On reflection this cycle, that reasoning didn't hold
up: an empty registry with a discovery endpoint that can only ever report
`{count: 0, routes: []}` isn't documentation, it's dead code with a
forever-empty response. Deleted `backend/src/api/routes-registry.ts` and its
`routes-registry.spec.ts` outright, and with it:

- The unconditional `registerAllRoutes(expressApp, { mountRoutes: false })`
  call in `bootstrap()` that only ever mounted `/api/routes` — gone, so is
  the route (confirmed live: `GET /api/routes` now returns **404**, not
  `{count:0}`).
- The two `registerAllRoutes(...)` calls inside
  `registerEmergencyMongooseRuntime()` — both were pure no-ops once `ROUTES`
  went empty in Cycle 286 (nothing left to mount), so was the
  `createLegacyApiAuthMiddleware` wiring that only existed to protect routes
  that no longer exist.
- `getRouteList()` calls in `app.controller.ts`'s `getSystemConfig()` — the
  `emergencyOs.routeGroups`/`legacyRouteGroups` response fields always
  resolved to `[]` and carried zero information; removed rather than kept as
  permanently-empty noise. `emergencyOs.defaultNestSurface` was still
  hardcoded to `'partial'`, which stopped being true the moment `ROUTES` hit
  zero in Cycle 286 — flipped to `'complete'` and verified live via
  `GET /api/config/system`.
- `express-nest-parity.spec.ts` no longer imports from the deleted module;
  its `RETIRED` map survives on its own as a standalone historical record
  (which Nest controller replaced each legacy group, which cycle, migrated
  vs. deleted) — genuinely useful, cheap-to-keep documentation-as-test, not
  coupled to implementation that no longer exists.

**A real, separate, much older bug surfaced along the way.**
`tests/integration/emergency-os.test.ts` (a root-level Vitest suite, run via
its own `npm run test:integration` script — not part of the `backend`
Jest suite this whole 277→286 migration was verified against) imported
`registerAllRoutes` from the file this cycle deleted, and mounted
`ems`/`capacity`/`boarding`/`protocol`/`surge`/`deterioration`/`copilot`/
`federated` as bare Express routers under a synthetic `/api/v1` prefix. Every
one of those legacy files had already been deleted — `surge` since commit
`5bed1bf9` (Cycle 243, long before this session's campaign even started),
the rest across Cycles 277–285 — so this suite could not have passed in its
pre-Cycle-287 form for a long time; nobody had run `test:integration` across
the whole migration to notice. Rather than leave it dead or delete real
end-to-end coverage, rewrote it to boot the six lightweight, dependency-free
Nest modules directly (`Ems`/`Capacity`/`Boarding`/`Protocol`/
`Deterioration`/`SurgeModule` — none of them import anything, confirmed by
reading each `*.module.ts`) via `@nestjs/testing`'s `Test.createTestingModule`,
overriding `AuthGuard('jwt')`/`AuthorizationGuard` the same way this repo's
other e2e specs already do (`backend/test/tool-orchestrator-api.e2e-spec.ts`)
rather than a hand-rolled bearer-token check, and wiring a fake
`socket.data.user`-setting middleware into the real `registerEMSWebSocketSupport`
so the EMS alert → whiteboard Socket.IO emission built in Cycle 282 gets
genuine end-to-end proof instead of failing on the auth-guard's default-deny
behavior (which the *original* version of this test would also have hit,
independent of anything this cycle touched). `copilot`/`federated` are out
of scope for this suite — both live inside the much heavier `EmergencyOsModule`
(TypeORM + AuthModule + ChatModule) and already have their own passing unit
coverage. `mongodb-memory-server` cannot actually execute in this sandbox
(`spawn UNKNOWN` launching `mongod.exe` — the same Windows Application
Control restriction noted elsewhere in this program's history, and why
`surge-capacity.service.mongo-spec.ts` is likewise absent from the standard
277-suite run) — verified correctness instead via a standalone `tsc --noEmit`
pass against the rewritten file (zero errors beyond expected test-runner
globals), which caught and fixed one real latent bug (`UnifiedPatient.findById(...).lean()`
is nullable; original test read `.boardingStatus` off it unchecked).

Verified: full backend suite (277/277 suites, 2,371/2,371 tests — down from
278/2,378 by exactly the 2 deleted `routes-registry` spec files, zero other
change), clean `nest build`, clean frontend typecheck, and a live
compiled-server boot proving all of: `GET /api/routes` → **404** (was
`{count:0}`), `GET /api/config/system`'s `emergencyOs` → `defaultNestSurface:
'complete'` with no `routeGroups`/`legacyRouteGroups` fields, `GET /health` +
`/api/health` still **200** (untouched direct mounts), `GET /api/protocol`
still **401** (guard active, route still exists), `GET /api/moh` still
**404** (Cycle 286's placeholder deletion, unaffected by this cycle).

## 2026-08-05 update (Cycle 286) — ROUTES is empty

The 6 remaining entries (`moh`, `wearable`, `iot`, `simulation`, `handover`,
`digital-twin`) were all pure `createPlaceholderRoute()` stubs — 7-line files
each just returning a static `available-unimplemented` body, confirmed by
direct source read in Cycle 276 and re-confirmed line-by-line this cycle
before deleting them. Zero real functionality, zero live callers (checked the
same way as every real migration). Deleted all 6 outright, along with the now
fully-orphaned `placeholder.routes.ts` factory itself. The `/health` entry
also left `ROUTES` this cycle — not a retirement in the migration sense, since
it was always a redundant second/third/fourth mount of the exact same
`healthRoutes` router `main.ts` already mounts directly at `/health` and
`/api/health`, independent of this registry; removing it from `ROUTES`
changes nothing a real caller can observe. `backend/src/api/routes-registry.ts`
now exports an empty `ROUTES: ApiRouteRegistration[] = []`, kept (not
deleted) as the extension point `registerEmergencyMongooseRuntime()` still
calls for the `/api/routes` discovery endpoint — which now correctly reports
`{count: 0, routes: []}`, verified live.

Verified with the same rigor as every migration this program: full backend
suite (278/278 suites, 2,378/2,378 tests), frontend typecheck clean, `nest
build` clean, and a live compiled-server boot proving both directions at
once — `GET /health`, `/api/health`, and `/api/health/live` still return
**200** (the real, direct mount is untouched), while `GET /api/moh`,
`/api/wearable`, and `/api/digital-twin` now correctly return **404** (the
placeholder stubs are genuinely gone, not silently still reachable through
some other path).

**What remains is no longer route-parity work of any kind.** The only piece
of `registerEmergencyMongooseRuntime()` (`main.ts`) still doing real work is
the Mongoose *connection* itself plus three things riding on the same
conditional block: EMS/edge-ambulance/sentinel-AVL WebSocket support,
`reassessmentScheduler.start()`, and `initializeAllServices()` (the
service-registry health-check init). None of these are legacy Express REST
routes anymore — they're infrastructure wiring that happens to be gated
behind the same flag. Retiring `ENABLE_MONGOOSE_EMERGENCY_OS` for real means
deciding, for each of those three, whether it should become unconditional
(most likely for WebSocket support, since real Nest controllers like
`EmsController` already depend on `app.get('io')` having been set up) or
removed alongside the flag — that decision, not a mechanical file deletion,
is the actual remaining work, and deserves its own dedicated cycle rather
than a rushed tail-end of this one.

## 2026-08-05 update (Cycles 279–285) — all real groups done

Continuing from the 277–278 update below, `/deterioration` (279), `/protocol`
(280), `/reassessment` (281), `/ems` (282), `/boarding` (283), `/intake`
(284, 14 endpoints, the largest migration in this program), and `/federated`
(285) all completed Phase 4 (Remove) the same way as capacity/governance/copilot:
Express file deleted, `routes-registry.ts` entry removed, a real NestJS
controller built or extended to cover every real endpoint, and — starting
with `/reassessment` — a live-caller check *before* choosing an approach,
which surfaced a repeating pattern worth recording: for `/reassessment`,
`/ems`, and `/boarding`, a short bare `/api/emergency/{name}` Nest route
already existed (on `EmergencyOsController`) but turned out each time to be a
*different*, TypeORM-backed implementation than what the real frontend
traffic actually depends on at the longer legacy sub-paths — never a
shortcut, always a trap if assumed to be parity. `/federated` was the one
exception where the shadowed-sibling check found a real, correct extension
point (`FederatedEMSController`, already Nest, already owned `POST
/112-call`) rather than requiring a new module. `/smart-intake`'s first pass
used loosely-typed bodies and the project's own 128-entry unvalidated-`@Body()`
regression guard (`test/body-validation-coverage.spec.ts`) caught 13 new
gaps that migration would otherwise have introduced — rebuilt as real DTO
classes instead, net zero addition to that baseline. Every one of these 7
migrations was verified with the same rigor: full backend suite, full
frontend typecheck, the 6 frontend inventory-contract test files, a clean
`nest build`, and a live compiled-server boot with a real HTTP request
proving 401-not-404. See `backend/src/api/express-nest-parity.spec.ts`'s
`RETIRED` map for the machine-checked record of all 10.

**What's left is explicitly NOT "real route parity" work anymore** — it's
placeholder retirement (6 groups that only ever returned a static
"available-unimplemented" body, confirmed in Cycle 276) and final structural
cleanup (deleting `ENABLE_MONGOOSE_EMERGENCY_OS`, the Mongoose runtime
connection in `main.ts`, and `routes-registry.ts` itself once the 6
placeholders are gone).

## 2026-08-04 update (Cycles 277–278)

`/capacity` (Cycle 277), `/governance`, and `/copilot` (Cycle 278) have completed
**Phase 4 (Remove)**: their Express route files are deleted from
`backend/src/api/`, not just superseded. This is stronger than the "P0 Nest
parity live" state described below for governance/copilot — while reading
`main.ts`'s registration order for this cycle we confirmed the dual-mount was
not merely redundant but **actively shadowing**: `NestFactory.create()` does
not bind controller routes to the underlying Express instance immediately —
Nest defers that to `app.init()`, which only runs inside `app.listen()`
(confirmed in `node_modules/@nestjs/core/nest-application.js`). Since
`registerEmergencyMongooseRuntime()` mounts the legacy Express routers earlier
in `bootstrap()`, well before `app.listen()`, the Express handler for
`POST /api/copilot/query` and `GET/POST /api/governance/*` would win over the
already-built Nest parity controllers on any deployment with
`ENABLE_MONGOOSE_EMERGENCY_OS=true` — silently discarding the Nest controllers'
stronger DTO validation, `USE_AI_CHAT`/`VIEW_GOVERNANCE` permission checks, and
(for copilot) the accountable-recommendation envelope. With the flag at its
documented default (`false`), the Nest controllers were already the only thing
serving these paths, so deleting the Express files changes no default-config
behavior — it only removes the trap for anyone who turns the flag on. See
`backend/src/api/express-nest-parity.spec.ts` (`RETIRED` map) for the
machine-checked record.

14 groups remain, `/ems` and `/intake` next (Phase 3 item 3, "Partial" parity
per the inventory below — need a real Nest-side gap check before they can
follow the same Phase 4 pattern, unlike capacity/governance/copilot which had
complete parity controllers already sitting unused).

## Current state (proven)

| Surface | Path | Auth |
|---------|------|------|
| Nest primary (only HTTP surface left) | `backend/src/modules/**` controllers | JWT + guards + TenantIsolationGuard |
| ~~Express legacy~~ | ~~`backend/src/api/routes-registry.ts`~~ | **File deleted (Cycle 287)** — no legacy Express router mount exists anywhere in the codebase anymore |
| Dual prefix | `/api/*` and `/api/emergency/*` | Both prefixes now resolve to the same Nest controllers, not a dual mount of two frameworks |

## Route inventory (Express ROUTES)

| Express path | Description | Nest target (preferred) | Parity status |
|--------------|-------------|-------------------------|---------------|
| ~~`/capacity`~~ | Capacity | `CapacityController` `@Controller('emergency/capacity')` | **RETIRED (Cycle 277)** |
| ~~`/ems`~~ | EMS intake | `EmsController` `@Controller('emergency/ems')` | **RETIRED (Cycle 282)** — real FE consumer, Socket.IO emission ported |
| `/surge` | Surge/MCI | emergency-os | already Nest-only, no legacy file (see commit `5bed1bf9`) |
| ~~`/boarding`~~ | Boarding | `BoardingController` `@Controller('emergency/boarding')` | **RETIRED (Cycle 283)** — real FE consumer |
| ~~`/protocol`~~ | Protocols | `ProtocolController` `@Controller('protocol')` | **RETIRED (Cycle 280)** |
| ~~`/deterioration`~~ | Prediction | `DeteriorationController` `@Controller('deterioration')` | **RETIRED (Cycle 279)** |
| ~~`/copilot`~~ | ED Copilot | `EdCopilotNestParityController` `@Controller('copilot')` + emergency copilot | **RETIRED (Cycle 278)** |
| ~~`/intake`~~ | Smart intake | `SmartIntakeController` `@Controller('emergency/intake')` | **RETIRED (Cycle 284)** — 14 endpoints, largest migration in the program |
| ~~`/moh`~~ | MoH FHIR | none — stub deleted | **RETIRED (Cycle 286)** — placeholder, no real functionality |
| ~~`/wearable`~~ | Wearables | none — stub deleted | **RETIRED (Cycle 286)** — placeholder |
| ~~`/iot`~~ | IoT | none — stub deleted | **RETIRED (Cycle 286)** — placeholder |
| ~~`/simulation`~~ | Simulation | none — stub deleted | **RETIRED (Cycle 286)** — placeholder |
| ~~`/governance`~~ | AI governance | `NestAiGovernanceController` `@Controller('governance')` (+ v1 / emergency aliases) | **RETIRED (Cycle 278)** |
| ~~`/handover`~~ | Handover | none — stub deleted (real `/er-pulse` work lives on `ERPulseHandoverController` separately) | **RETIRED (Cycle 286)** — placeholder |
| ~~`/federated`~~ | Federated learning | `FederatedEMSController` `@Controller('ems/federated')` (extended, not replaced) | **RETIRED (Cycle 285)** — last real group |
| ~~`/digital-twin`~~ | Digital twin | none — stub deleted (real work lives on `OrganizationalDigitalTwinController` separately) | **RETIRED (Cycle 286)** — placeholder |
| ~~`/reassessment`~~ | Reassessment | `ReassessmentController` `@Controller('emergency/reassessment')` | **RETIRED (Cycle 281)** — first real FE consumer found |
| ~~`/health`~~ | Health | direct `main.ts` mount at `/health` + `/api/health` (unrelated to this registry) | **REMOVED from ROUTES (Cycle 286)** — was always a redundant duplicate mount, not unique functionality |

## Phased plan

### Phase 0 — Freeze (done)
- JWT middleware on legacy mount (`runtime-auth`)
- Structured error envelopes on governance failures
- Document dual surface in architecture map

### Phase 1 — Inventory consumers
- Grep FE for `/api/capacity`, `/api/ems`, `/api/intake`, `/api/copilot`, `/api/governance`
- Build `express-consumer-matrix.md` (path → service file)
- Contract test: every Express path either has Nest equivalent or `legacy: true` flag

### Phase 2 — Feature-flag decommission
```
ENABLE_MONGOOSE_EMERGENCY_OS=false  # default in production
ENABLE_EXPRESS_LEGACY_ROUTES=false  # new explicit flag if split needed
```
- Production default: Nest only
- Dev: optional Express for EMS/intake lab until parity

### Phase 3 — Nest parity PRs (order) — ALL DONE (Cycle 285)
1. Governance (security) — **done (Nest controllers + unit inventory)**
2. Copilot / chat — **done (Nest parity controller + accountable DTO)**
3. Intake / EMS / handoff — **done**: intake (Cycle 284), EMS (Cycle 282)
4. Capacity / boarding / reassessment — **done**: capacity (277), boarding (283), reassessment (281)
5. Remaining deterioration/protocol/federated — **done**: deterioration (279), protocol (280), federated (285)

**P0 proof (2026-07-15/16, extended through Cycle 285):**
- Nest: `NestAiGovernanceController` registered in `GovernanceModule`
- Nest: `EdCopilotNestParityController` registered in `EmergencyOsModule` → `POST /api/copilot/query`
- Tests: `express-nest-parity.spec.ts`, `ed-copilot.nest-parity.controller.spec.ts`, `runtime-auth.spec.ts`
- ~~Residual: Express dual-mount still present until Phase 4; FE may still hit Express when Mongoose flag on~~
  **Closed 2026-08-04 (Cycle 278) for governance/copilot, extended to all 10 real groups by Cycle 285.**

### Phase 4 — Remove — route-level work DONE, runtime-level cleanup still open
- Delete `routes-registry` mounts from `main.ts` — **done.** `backend/src/api/routes-registry.ts` itself is deleted (Cycle 287), not just emptied; `registerAllRoutes`/`getRouteList`/the `/api/routes` discovery endpoint no longer exist anywhere in the codebase.
- Quarantine `backend/src/api/*.routes.ts` for one release — N/A: every file was deleted outright once real (Nest parity confirmed) or dead (placeholder stub), not quarantined, matching the Surge precedent (`git show 5bed1bf9`)
- Remove Mongoose emergency OS if TypeORM covers patients — **the only piece left.** Not a route question anymore: `registerEmergencyMongooseRuntime()` still owns the Mongoose connection, EMS/edge-ambulance/sentinel-AVL WebSocket bootstrapping, the reassessment scheduler, and service-registry init, all gated behind the same flag. Needs a deliberate per-responsibility decision (unconditional vs. removed), not a mechanical deletion — scoped as its own next cycle.

## Exit criteria
- [x] All real (non-placeholder) route groups migrated to Nest controllers (Cycle 285)
- [x] 6 placeholder-only route groups retired outright, `routes-registry.ts` `ROUTES` is `[]` (Cycle 286)
- [x] `routes-registry.ts` itself deleted — no legacy Express registry exists at any size, empty or otherwise (Cycle 287)
- [ ] `registerEmergencyMongooseRuntime()`'s non-route responsibilities (WebSocket, scheduler, service-registry init) resolved to unconditional-or-removed
- [ ] Production boot with the Mongoose runtime block disabled entirely
- [ ] All e2e EMS/intake/copilot green against Nest only
- [ ] No FE hard-coded `/api/emergency/*` without Nest alias
- [ ] PROOF-PACK deduction removed (16/16 route groups retired; only the underlying Mongoose runtime block remains)

## Rollback
Re-enable `ENABLE_MONGOOSE_EMERGENCY_OS` / Express mount flag; keep `runtime-auth` middleware.
