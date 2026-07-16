# API Catalogue — Architect Mode Stage A

**Dual surface:** Nest modules (primary target) + Express `routes-registry` (legacy, flag-gated Mongoose path).

## Express registry (backend/src/api/routes-registry.ts)

| Path | Description | Auth (target) | FE consumers (known) |
|------|-------------|---------------|----------------------|
| `/api/health` | Health checks | Public/limited | backendReachability, ops |
| `/api/capacity` | Capacity dashboard | JWT + ops | capacity services / whiteboard |
| `/api/ems` | EMS intake/tracking | JWT + READ/WRITE PHI | EMSPipeline, emergencyOsApi, handoff |
| `/api/surge` | Surge / MCI | JWT | ops |
| `/api/boarding` | Boarding metrics | JWT | boarding panels |
| `/api/protocol` | Clinical protocol triggers | JWT + protocol | protocol UI |
| `/api/deterioration` | Deterioration prediction | JWT + PHI | predictive panels |
| `/api/copilot` | ED Copilot | JWT + USE_AI_CHAT | CopilotPanel, copilot services |
| `/api/intake` | Smart patient intake | JWT + WRITE_PHI | SmartIntake, reception bridge |
| `/api/moh` | MoH FHIR | JWT + integration | integrations |
| `/api/wearable` | Wearables | JWT | wearable UI |
| `/api/iot` | IoT sensors | JWT | IoT dashboard |
| `/api/simulation` | Simulation | JWT + sim flag | training/sim pages |
| `/api/governance` | AI governance | JWT + governance perms | **UNSAFE residual if thin** |
| `/api/handover` | Smart handover | JWT + PHI | handoff generators |
| `/api/federated` | Federated learning | JWT + admin | future module |
| `/api/digital-twin` | Digital twin | JWT | twin pages |
| `/api/reassessment` | Reassessment | JWT + PHI | ReassessmentDrawer |
| (aliases) `/api/emergency/*` | Same routers dual-mount | Same middleware | legacy FE paths |

When `enableMongooseEmergencyOs=true`, `main.ts` applies `createLegacyApiAuthMiddleware` + mounts discovery off.

## Nest module controllers (partial inventory)

Controllers live under `backend/src/modules/**/**.controller.ts`. Major domains:

| Domain module | Purpose | Auth pattern |
|---------------|---------|--------------|
| auth | Login, register, tokens | Public login; guards elsewhere |
| users | User CRUD | MANAGE/VIEW_USERS |
| audit | Audit logs | VIEW_AUDIT_LOGS |
| rag | Ingest/query knowledge | tenant + auth |
| ai / ai-gateway | Clinical AI queries | USE_AI_CHAT + safety |
| emergency-os | ED OS Nest surface | PHI + role |
| chat | Chat + RAG tenants | tenant specs |
| collaboration-hub | Collaboration | auth |
| organizations / workspaces | Tenancy | tenant context |
| platform-governance | Governance Nest | VIEW/MANAGE_GOVERNANCE |
| clinical-alerts | Alerts | PHI |
| hospital-map | Map | ops |
| fleet | Fleet | ops |
| subscriptions / product-catalog | SaaS | billing perms |
| notifications | Notifications | user |
| memory | AI memory | tenant |
| tool-calling | Tool orchestrator | tools |
| sentinel | Sentinel alarms | sentinel perms |
| analytics | Analytics events | VIEW_ANALYTICS |
| evaluation | AI evaluation | validation perms |

*Full OpenAPI: Swagger at path from `SWAGGER_DOCS_PATH` when enabled.*

## FE API configuration

- Path constants: `src/config/api.config.ts`  
- Inventory helper: `src/data/backendHttpRouteInventory.ts` (modified in Cycles)  
- Emergency OS client: `src/services/emergencyOsApi.ts`  
- Contract tests: `npm run test:contract-matrix`

## Overlaps to resolve (Stage D/H)

| Verb | Express | Nest | Action |
|------|---------|------|--------|
| EMS | `/api/ems` | emergency-os / live-tracking | Prefer Nest; Express adapter |
| Copilot | `/api/copilot` | ai-gateway / chat | Single envelope |
| Intake | `/api/intake` | emergency-os / clinical | Single DTO |
| Governance | `/api/governance` | platform-governance | Nest only; harden Express or disable |
| Health | `/api/health` | app health | Keep both only if identical |

## Auth middleware proof

| Component | Test | Status Stage 0 |
|-----------|------|----------------|
| runtime-auth | `backend/src/api/runtime-auth.spec.ts` | PASS (Jest) |
