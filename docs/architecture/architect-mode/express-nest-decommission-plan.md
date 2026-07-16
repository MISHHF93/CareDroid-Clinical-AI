# Express → Nest Decommission Plan

**Status:** Active residual risk (PROOF-PACK −1 pt)  
**Date:** 2026-07-15  
**Goal:** Single HTTP authority = Nest controllers; Express registry becomes adapter-only then removed.

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
| `/capacity` | Capacity | emergency-os / capacity services | Partial |
| `/ems` | EMS intake | emergency-os, live-tracking, sentinel | Partial — FE uses both |
| `/surge` | Surge/MCI | emergency-os | Thin |
| `/boarding` | Boarding | emergency-os | Thin |
| `/protocol` | Protocols | clinical / tool-calling | Thin |
| `/deterioration` | Prediction | clinical-intelligence | Thin |
| `/copilot` | ED Copilot | `EdCopilotNestParityController` `@Controller('copilot')` + emergency copilot | **P0 Nest parity live** (auth + accountable envelope) |
| `/intake` | Smart intake | emergency-os / smart-intake | Partial |
| `/moh` | MoH FHIR | interoperability | Thin |
| `/wearable` | Wearables | telemetry | Thin |
| `/iot` | IoT | medical-iot | Thin |
| `/simulation` | Simulation | simulation module | Partial |
| `/governance` | AI governance | `NestAiGovernanceController` `@Controller('governance')` (+ v1 / emergency aliases) | **P0 Nest parity live** (JWT + AuthorizationGuard) |
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
4. Capacity / boarding / reassessment
5. Remaining IoT/wearable/simulation/federated (disable if unused)

**P0 proof (2026-07-15/16):**
- Nest: `NestAiGovernanceController` registered in `GovernanceModule`
- Nest: `EdCopilotNestParityController` registered in `EmergencyOsModule` → `POST /api/copilot/query`
- Tests: `express-nest-parity.spec.ts`, `ed-copilot.nest-parity.controller.spec.ts`, `runtime-auth.spec.ts`
- Residual: Express dual-mount still present until Phase 4; FE may still hit Express when Mongoose flag on

### Phase 4 — Remove
- Delete `routes-registry` mounts from `main.ts`
- Quarantine `backend/src/api/*.routes.ts` for one release
- Remove Mongoose emergency OS if TypeORM covers patients

## Exit criteria
- [ ] Production boot with Express mount disabled
- [ ] All e2e EMS/intake/copilot green against Nest only
- [ ] No FE hard-coded `/api/emergency/*` without Nest alias
- [ ] PROOF-PACK deduction removed

## Rollback
Re-enable `ENABLE_MONGOOSE_EMERGENCY_OS` / Express mount flag; keep `runtime-auth` middleware.
