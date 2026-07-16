# Event Catalogue — Architect Mode Stage A

Events are **not** a single bus yet. Producers span WebSockets, Nest services, FE engines, and store actions.

## Transport channels

| Channel | Location | Auth |
|---------|----------|------|
| EMS WebSocket | `backend/src/api/ems.socket.ts` via `main.ts` | Socket JWT + READ_PHI (when registered) |
| Edge AI ambulance WS | same registration family | Socket JWT |
| Sentinel AVL WS | same | Socket JWT |
| FE emergency realtime | `src/services/emergencyRealtimeService` | session |
| Nest domain events | module services (collaboration, alerts, telemetry) | service-level |
| FE local engines | AppShell `start*Engine` | in-process only |
| Audit log writes | `backend/src/modules/audit` | VIEW_AUDIT_LOGS to read |

## Operational / clinical events (logical catalogue)

| Event name (logical) | Producer | Consumer | Durable? |
|----------------------|----------|----------|----------|
| patient.created | emergencyStore / API intake | queues, KPIs, audit | FE session; BE if API path |
| patient.updated | store / Nest | whiteboard, cards | mixed |
| patient.queue.moved | queueAssignment / store | reception/triage queues | mixed |
| ems.arrival.registered | EMS routes / store | EMSPipeline, reception | mixed |
| ems.arrival.converted | convertEmsArrivalForReception | registration queue | FE + optional API |
| ems.handoff.completed | handoff services | copilot, nursing | Cycle e2e |
| intake.verified | reception verify | pretriage queue | mixed |
| intake.escalated | receptionEscalationWorkflow | alerts, charge | mixed |
| reassessment.due | reassessment engine | drawer, flags | engine timer |
| capacity.changed | capacity engine / API | crisis mode, boards | mixed |
| alert.clinical.raised | clinical-alerts / flags | alarm dock | mixed |
| copilot.recommendation | copilot / AI gateway | CopilotPanel | request/response |
| rag.query.completed | rag.service | chat/copilot | metrics |
| auth.login | auth.service | session | audit |
| audit.phi.access | audit interceptors | compliance | durable (TypeORM) |
| workflow.action.logged | emergencyStore workflow | living docs / automation | **claim durable only if BE write** |

## Classification debt

| Issue | Class | Stage |
|-------|-------|-------|
| No single event schema / versioning | UNFINISHED | F |
| Many FE-only events presented as live multi-user | UNSAFE if labeled live | F |
| Websocket JWT via query residual risk | UNSAFE | D |
| Workflow logs non-durable | APPEARS COMPLETE / mislabeled | F |

## Stage F target

One event catalogue with:

- `name`, `version`, `payload schema`, `producer`, `consumers`, `authz`, `durability`, `pii classification`
- FE engines must mark `durability: session` unless BE confirmed
