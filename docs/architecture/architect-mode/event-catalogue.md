# Event Catalogue — Architect Mode Stage A → F (partial)

Events are **not** a single bus yet. Producers span WebSockets, Nest services, FE engines, and store actions.

**Stage F machine-readable contracts (PR-1 CIG):** `lib/cig/events/catalogue.ts`  
**Design:** `docs/architecture/clinical-intelligence-graph-design.md`

The catalogue classifies each logical event as:

| `producerClass` | Meaning | Multi-user T1 twin badge |
|-----------------|---------|--------------------------|
| `be_emitted` | Nest / BE path can emit now or near-term | Only if `durabilityDefault === 'durable'` **and** Mode A SoT cutover (K13) |
| `fe_session` | FE store / engines only until promoted | **Never** until promoted + durable path |
| `unavailable_for_t1` | Not wired for multi-user twin | **No** |

Use `buildCigDomainEvent`, `getCigEventCatalogueEntry`, and `isEventEligibleForMultiUserTwin` from `@lib/cig` (or `lib/cig`).

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
| CIG projector bus (planned) | Nest `CigEventBus` (PR-5a) | service-level + tenant |

## Operational / clinical events (logical catalogue)

| Event name (logical) | Producer | Consumer | Durable? | Stage F class |
|----------------------|----------|----------|----------|---------------|
| patient.created | emergencyStore / API intake | queues, KPIs, audit | FE session; BE if API path | `be_emitted` (session default) |
| patient.updated | store / Nest | whiteboard, cards | mixed | `be_emitted` (session default) |
| patient.state.changed | Nest / journeyEngine | workflow, KPIs | mixed | `be_emitted` (session default) |
| patient.assigned | Nest / assign services | whiteboard | mixed | `be_emitted` (session default) |
| patient.queue.moved | queueAssignment / store | reception/triage queues | mixed | `fe_session` |
| ems.arrival.registered | EMS routes / store | EMSPipeline, reception | mixed | `be_emitted` (session default) |
| ems.arrival.converted | convertEmsArrivalForReception | registration queue | FE + optional API | `fe_session` |
| ems.handoff.completed | handoff services | copilot, nursing | Cycle e2e | `be_emitted` (session default) |
| intake.verified | reception verify | pretriage queue | mixed | `fe_session` |
| intake.escalated | receptionEscalationWorkflow | alerts, charge | mixed | `fe_session` |
| reassessment.due | reassessment engine | drawer, flags | engine timer | `fe_session` |
| capacity.changed | capacity engine / API | crisis mode, boards | mixed | `fe_session` |
| alert.clinical.raised | clinical-alerts / flags | alarm dock | mixed | `be_emitted` (session default) |
| copilot.recommendation | copilot / AI gateway | CopilotPanel | request/response | `fe_session` |
| rag.query.completed | rag.service | chat/copilot | metrics | `be_emitted` (session default) |
| auth.login | auth.service | session | audit | `be_emitted` (durable) |
| audit.phi.access | audit interceptors | compliance | durable (TypeORM) | `be_emitted` (durable) |
| workflow.action.logged | emergencyStore workflow | living docs / automation | **claim durable only if BE write** | `be_emitted` (session default) |
| operational_intelligence_updated | OI Nest | OI / CIG | session | `be_emitted` (session default) |
| bottleneck_detected | OI / bottleneckRegistry | boards / CIG | session | `be_emitted` (session default) |
| whiteboard_snapshot | EmergencyRealtimeService | SPA | session | `be_emitted` (session default) |
| central_node_snapshot | CareDroidCentralNodeService | OI / CIG | session | `be_emitted` (session default) |
| cig.graph.updated | CigProjectionFacade (planned) | SPA dual-read | session until Mode A | `be_emitted` (session default) |
| fhir.observation.streamed | FHIR (partial) | future CIG | n/a | `unavailable_for_t1` |
| reassessment.scheduler.tick | Mongoose cron (optional) | reassessment | n/a | `unavailable_for_t1` |

## Classification debt

| Issue | Class | Stage |
|-------|-------|-------|
| No single event schema / versioning | **IN PROGRESS** — contracts in `lib/cig/events/catalogue.ts`; full JSON Schema + Nest ingest later | F |
| Many FE-only events presented as live multi-user | **MITIGATED in contracts** — `fe_session` + `isEventEligibleForMultiUserTwin` | F |
| Websocket JWT via query residual risk | UNSAFE | D |
| Workflow logs non-durable | APPEARS COMPLETE / mislabeled — catalogue notes BE write required | F |

## Stage F target

One event catalogue with:

- `name`, `version`, `payload schema`, `producer`, `consumers`, `authz`, `durability`, `pii classification`
- FE engines must mark `durability: session` unless BE confirmed

**Done in PR-1 (CIG contracts):**

- Typed catalogue entries with producer class, durability default, PHI class, authz, payload summary
- `buildCigDomainEvent` factory rejecting unknown names
- Multi-user twin eligibility helper (conservative defaults)

**Still open for Stage F completion:**

- Full JSON Schema per payload
- Single Nest ingest bus with micro-batch / backpressure (CIG design PR-5a)
- Promoting FE-session producers after durable SoT cutover (K13 / PR-15)
