# Express → Nest Decommission Plan

**Status:** Active residual risk (PROOF-PACK −1 pt), narrowing — 3 of 17 groups fully retired  
**Date:** 2026-07-15 (updated 2026-08-04, Cycles 277–278)  
**Goal:** Single HTTP authority = Nest controllers; Express registry becomes adapter-only then removed.

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
| Nest primary | `backend/src/modules/**` controllers | JWT + guards + TenantIsolationGuard |
| Express legacy | `backend/src/api/routes-registry.ts` | Mounted when `enableMongooseEmergencyOs`; `runtime-auth` JWT + PHI method |
| Dual prefix | `/api/*` and `/api/emergency/*` | Same routers, dual mount |

## Route inventory (Express ROUTES)

| Express path | Description | Nest target (preferred) | Parity status |
|--------------|-------------|-------------------------|---------------|
| `/health` | Health | App/health Nest | Overlap OK |
| ~~`/capacity`~~ | Capacity | `CapacityController` `@Controller('emergency/capacity')` | **RETIRED (Cycle 277)** — Express file deleted |
| `/ems` | EMS intake | emergency-os, live-tracking, sentinel | Partial — FE uses both |
| `/surge` | Surge/MCI | emergency-os | Thin |
| `/boarding` | Boarding | emergency-os | Thin |
| `/protocol` | Protocols | clinical / tool-calling | Thin |
| `/deterioration` | Prediction | clinical-intelligence | Thin |
| ~~`/copilot`~~ | ED Copilot | `EdCopilotNestParityController` `@Controller('copilot')` + emergency copilot | **RETIRED (Cycle 278)** — Express file deleted |
| `/intake` | Smart intake | emergency-os / smart-intake | Partial |
| `/moh` | MoH FHIR | interoperability | Thin |
| `/wearable` | Wearables | telemetry | Thin |
| `/iot` | IoT | medical-iot | Thin |
| `/simulation` | Simulation | simulation module | Partial |
| ~~`/governance`~~ | AI governance | `NestAiGovernanceController` `@Controller('governance')` (+ v1 / emergency aliases) | **RETIRED (Cycle 278)** — Express file deleted |
| `/handover` | Handover | emergency-os | Partial |
| `/federated` | Federated learning | future | Can disable |
| `/digital-twin` | Digital twin | digital-twin routes Nest | Thin |
| `/reassessment` | Reassessment | emergency-os | Partial |

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

### Phase 3 — Nest parity PRs (order)
1. Governance (security) — **done (Nest controllers + unit inventory)**
2. Copilot / chat — **done (Nest parity controller + accountable DTO)**
3. Intake / EMS / handoff
4. Capacity / boarding / reassessment — Capacity **done**; boarding/reassessment still Express-only
5. Remaining IoT/wearable/simulation/federated (disable if unused)

**P0 proof (2026-07-15/16):**
- Nest: `NestAiGovernanceController` registered in `GovernanceModule`
- Nest: `EdCopilotNestParityController` registered in `EmergencyOsModule` → `POST /api/copilot/query`
- Tests: `express-nest-parity.spec.ts`, `ed-copilot.nest-parity.controller.spec.ts`, `runtime-auth.spec.ts`
- ~~Residual: Express dual-mount still present until Phase 4; FE may still hit Express when Mongoose flag on~~
  **Closed 2026-08-04 (Cycle 278) for governance/copilot** — see update above.

### Phase 4 — Remove
- Delete `routes-registry` mounts from `main.ts` — done for `/capacity` (Cycle 277), `/governance`, `/copilot` (Cycle 278); 14 groups remain mounted
- Quarantine `backend/src/api/*.routes.ts` for one release — N/A: files were deleted outright once Nest parity was confirmed unconditionally registered, not quarantined, matching the Surge precedent (`git show 5bed1bf9`)
- Remove Mongoose emergency OS if TypeORM covers patients — still blocked on the 14 remaining groups

## Exit criteria
- [ ] Production boot with Express mount disabled
- [ ] All e2e EMS/intake/copilot green against Nest only
- [ ] No FE hard-coded `/api/emergency/*` without Nest alias
- [ ] PROOF-PACK deduction removed (partial credit: 3/17 groups retired, not yet zero)

## Rollback
Re-enable `ENABLE_MONGOOSE_EMERGENCY_OS` / Express mount flag; keep `runtime-auth` middleware.
