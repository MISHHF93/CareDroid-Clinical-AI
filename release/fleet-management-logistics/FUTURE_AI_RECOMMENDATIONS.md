# Future AI recommendations — Fleet Management + Logistics

Operational and engineering guidance for post-foundation AI/ML work. Aligns with the client hooks already present (`SCORING_ENGINE_AI`, `ROUTE_ENGINE_GRAPH`) and the proposed backend `FleetModule` shape.

---

## 1. Guiding principles

1. **Human-in-the-loop by default** — Every AI output is a ranked option or explanation, never an executed command.
2. **Read-only fleet state in v1 ML** — Models consume telemetry and dispatch snapshots; no write adapters until audit logging exists.
3. **Deterministic fallback** — If ML/graph fails or times out, return rules/sort results already shipped in this PR.
4. **Explainability over opacity** — Surface contributing factors (maintenance) and constraint violations (routing) alongside model scores.
5. **Separate “routing” from “authority”** — NLU may route to `dispatch-ai`; orchestrator must never POST-assign vehicles.

---

## 2. Predictive maintenance AI

### Recommended approach

| Stage | Technique | Output |
|-------|-----------|--------|
| P1 | Calibrated rules + thresholds (current) | Risk score, bands, inspection windows |
| P2 | Gradient boosting / survival model on historical work orders | Failure probability at 30/60/90 days |
| P3 | Anomaly detection on telematics streams | Unsupervised flags merged with rules |

### Integration pattern

```text
Client → POST /api/fleet/maintenance/score
         → MaintenanceService.score()
              → RulesEngine (default)
              → ScoringEnginePort (optional ML)
         → Unified DTO (same shape as scorePredictiveMaintenance today)
```

### Safety gates

- Never auto-create CMMS work orders from model output.
- Cap risk score volatility between requests (smoothing) to avoid alert fatigue.
- Log model version + feature snapshot hash with each score for audit.

### Data requirements

- Labeled outcomes: breakdown events, DTC clears, days-to-failure
- Minimum fleet size before enabling ML (e.g. N ≥ 200 vehicle-months)

---

## 3. Route optimization AI

### Recommended approach

| Stage | Engine | Use case |
|-------|--------|----------|
| P1 | Sort heuristic (shipped) | Demo, small fleets, explainable ordering |
| P2 | OR-Tools VRP with time windows | Production multi-stop planning |
| P3 | Dynamic re-optimization | In-shift adjustments (read-only suggestions) |

### Integration pattern

- Implement `ROUTE_ENGINE_GRAPH` behind env `FLEET_ROUTE_ENGINE=graph`.
- Return same `optimizedSequence` schema; add `engine: 'graph' | 'sort'` and `graphPending: false`.
- Preserve `windowStatus` per leg for ops warnings.

### Safety gates

- Do not push sequences to driver apps without dispatcher ACK.
- Show delta vs current plan (“proposed reorder saves X min”).
- Hard-reject routes exceeding `maxDistanceKm` / driver hours even if solver proposes them.

---

## 4. Dispatch intelligence (conversational AI)

### Recommended approach

- **RAG over read-only context**: open jobs, vehicle availability, SLA backlog, maintenance holds.
- **Structured output schema** in chat: ranked assignment options with pros/cons (already in `dispatchAi` chat seed).
- **Tool calling (read-only)**: `getFleetSnapshot`, `listOpenRequests`, `listAvailableVehicles` — no `assignVehicle`.

### NLU vs LLM responsibilities

| Layer | Responsibility |
|-------|----------------|
| NLU (`tool.patterns.ts`) | Intent → `dispatch-ai` |
| Chat LLM | Clarifying questions, option ranking, bottleneck narrative |
| Backend services | Fetch canonical data; never execute assignments |

### Evaluation metrics

- Dispatcher edit rate (how often final assignment differs from top suggestion)
- Time-to-first-option vs baseline
- Safety violation rate (assignments violating stated constraints — should be 0 executed)

---

## 5. Fleet command dashboard

### Near-term (non-ML)

- Live WebSocket or polling for telemetry refresh
- Threshold configuration per tenant (low-energy %, utilization alerts)

### AI enhancements (later)

- **Forecast cards**: ETA distributions, demand vs capacity next 4 hours
- **Anomaly highlights**: “Unusual idle time on VH-118” with natural language summary
- **Not recommended**: autonomous rebalancing labels without explicit dispatcher trigger

---

## 6. Model governance

| Control | Recommendation |
|---------|----------------|
| Versioning | Semantic version per model; expose in API response |
| Shadow mode | Run ML parallel to rules; log diff only |
| Rollback | Feature flag per engine; instant revert to rules/sort |
| Bias review | Stratify maintenance risk by vehicle age cohort quarterly |
| PHI / PII | Fleet ops data may include driver names — treat as sensitive; redact in logs |

---

## 7. Observability

- Trace IDs linking chat session → fleet snapshot version → recommendation set
- Metrics: `fleet_score_latency`, `fleet_route_opt_latency`, `dispatch_chat_tool_calls_total`
- Alerts on ML timeout rate > 5% or fallback surge

---

## 8. Suggested priority order

1. **Live telemetry API** (enables all downstream AI)
2. **Graph route solver** (highest operational value, clear fallback)
3. **Dispatch RAG context** (chat quality, still read-only)
4. **Maintenance survival model** (needs labeled history)
5. **Real-time anomaly detection** (telematics volume dependent)

---

## 9. Anti-patterns to avoid

- Registering fleet tools on `tool-orchestrator` POST without legal/ops sign-off
- End-to-end “auto-dispatch” demos that write to production telematics
- Single opaque score with no contributing factors
- Training on synthetic mock telemetry from `fleetTelemetryService.js`
- Coupling clinical NLU disambiguation with fleet keywords without namespace separation

---

## References in codebase

| Artifact | Path |
|----------|------|
| Maintenance scoring | `src/services/predictiveMaintenanceScoring.js` |
| Route optimization | `src/services/routeOptimizationService.js` |
| Dispatch chat seed | `src/data/chatAssistedFleet/dispatchAi.js` |
| Audit constants | `src/data/prFleetTestConstants.js` |
| Comprehensive tests | `src/data/pr6FleetComprehensive.test.jsx` |
| NLU patterns | `backend/.../tool.patterns.ts` |
