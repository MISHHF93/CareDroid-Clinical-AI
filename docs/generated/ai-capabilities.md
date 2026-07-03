# AI capabilities

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 10

### Patient flow

Arrival throughput, queue movement, disposition blockers, and boarding pressure.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/patient-flow`, `/api/emergency/queues`
- **Roles:** `Patient flow coordinator`
- **Workflows:** `emergencyStore.patients`, `patientFlowSnapshot`, `hospitalOperatingSystem`

### Department capacity

Bed availability, occupancy bands, boarding load, and surge posture.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/capacity`, `/api/emergency/boarding`
- **Roles:** `Charge nurse`
- **Workflows:** `capacityEngine`, `centralNode.capacityStatus`

### Staffing & routing

Assignments, workload balance, pending acknowledgements, and role coverage.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/workflow-orchestration`
- **Roles:** `ED manager`
- **Workflows:** `emergencyStore.staff`, `staffRoutingService`

### Bottlenecks

Service delays, three-minute risk projection, and root-cause bottlenecks.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/operational-intelligence/snapshot`
- **Roles:** `ED manager`
- **Workflows:** `bottleneckRegistry`

### Alerts & escalation

Critical alerts, acknowledgement deadlines, and escalation routing.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/operational-intelligence/alerts`, `/api/emergency/operating-surfaces/alerts`
- **Roles:** `Assigned clinician`
- **Workflows:** `alertEngine`, `alertLifecycleOrchestrator`, `clinicalAlertsApi`

### Service health

Backend availability, degraded integrations, and fallback readiness.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/operational-intelligence/model-health`
- **Roles:** `IT administrator`
- **Workflows:** `bottleneckRegistry.serviceHealth`, `backendReachability`

### EMS arrivals

Inbound units, pre-arrival packets, offload readiness, and handoff timing.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/ems`
- **Roles:** `EMS coordinator`
- **Workflows:** `emergencyStore.emsArrivals`, `emsPreArrivalPipelineService`

### Patient prioritization

Acuity ordering, P1/P2 concentration, deterioration signals, and reassessment due.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/triage/assist`, `/api/emergency/reassessment`
- **Roles:** `Triage nurse`
- **Workflows:** `patientOrchestration`, `threeMinuteTimerEngine`

### Operational intelligence

Rule-based and ML-assisted scores, anomalies, and command-center insights.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/operational-intelligence/snapshot`, `/api/emergency/central-node/snapshot`
- **Roles:** `ED manager`
- **Workflows:** `careDroidOperationalIntelligence`, `centralNode`

### Clinical workflow support

Tool recommendations, calculators, protocols, and AI Chief structured intents.

- **Source:** `aiChiefOrchestrationModel.ts`
- **Endpoints:** `/api/emergency/copilot`, `/api/emergency/copilot/query`
- **Roles:** `Clinician`
- **Workflows:** `patientOrchestration`, `aiChiefOrchestrator`, `careDroidUnifiedAiNode`
