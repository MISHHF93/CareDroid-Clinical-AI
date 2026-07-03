# Platform services

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 32

### apiFacade

emergencyOsApi

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `emergencyOsApi`

### workflowEngine

unified-workflow-automation

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `unified-workflow-automation`

### adminAutomationEngine

unified-clinical-workflow-orchestrator

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `unified-clinical-workflow-orchestrator`

### aiChiefEngine

ai-chief-orchestrator

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `ai-chief-orchestrator`

### patientWorkflowEngine

unified-patient-workflow-orchestrator

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `unified-patient-workflow-orchestrator`

### operationalIntelligenceEngine

unified-operational-intelligence

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `unified-operational-intelligence`

### knowledgeGraphEngine

unified-application-knowledge-graph

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `unified-application-knowledge-graph`

### livingDocumentationEngine

living-documentation

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `living-documentation`

### observabilityEngine

caredroid-observability

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `caredroid-observability`

### securityEngine

caredroid-security

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `caredroid-security`

### cohesionEngine

caredroid-platform-cohesion

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `caredroid-platform-cohesion`

### envelopeParser

emergencyApiHelpers.unwrapEmergencyEnvelope

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `emergencyApiHelpers.unwrapEmergencyEnvelope`

### humanOversightRequired

true

- **Source:** `emergencyPlatform.config.ts`
- **Workflows:** `true`

### OI: Patient flow

Queue movement, stage waits, handoff delays, and congestion signals.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `patient_flow_coordinator`
- **Workflows:** `journey_state_changed`, `patient_flow_updated`, `bottleneck_detected`

### OI: Staffing

Shift coverage, assignment load, and routing recommendations.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `charge_nurse`
- **Workflows:** `staff_assigned`, `workflow_orchestration_updated`

### OI: Capacity

Bed occupancy, boarding load, and surge posture.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `ed_manager`
- **Workflows:** `capacity_updated`, `capacity_changed`, `boarding_started`

### OI: Alerts

Unresolved operational and clinical alerts requiring acknowledgement.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `charge_nurse`
- **Workflows:** `alert_created`, `operational_alert_dispatched`

### OI: Workflow

Automation queue depth, pending reviews, and orchestration metrics.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `ed_manager`
- **Workflows:** `workflow_orchestration_updated`, `workflow_log_created`

### OI: Service health

Degraded integrations, stale sync, and model health posture.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `ed_manager`
- **Workflows:** `central_node_snapshot`, `service_health_updated`

### OI: AI recommendations

Explainable AI Chief and backend OI interventions awaiting review.

- **Source:** `unifiedOperationalIntelligenceModel.ts`
- **Roles:** `emergency_physician`
- **Workflows:** `workflow_orchestration_updated`, `operational_intelligence_updated`

### KG: patient

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `patient`

### KG: staff

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `staff`

### KG: department

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `department`

### KG: alert

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `alert`

### KG: workflow

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `workflow`

### KG: ai recommendation

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `ai_recommendation`

### KG: service

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `service`

### KG: queue

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `queue`

### KG: room

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `room`

### KG: bed

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `bed`

### KG: diagnostic

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `diagnostic`

### KG: operational event

Knowledge graph entity type connected via unifiedApplicationKnowledgeGraphService.

- **Source:** `unifiedApplicationKnowledgeGraphModel.ts`
- **Workflows:** `operational_event`
