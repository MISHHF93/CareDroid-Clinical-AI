# Operational Intelligence Inventory

Generated: 2026-06-16

## Active spine (consolidated into CareDroidOperationalIntelligence)

| Artifact | Classification | Consolidated |
|----------|----------------|--------------|
| `src/central-node/careDroidCentralNode.ts` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES |
| `src/hooks/useCareDroidCentralNode.ts` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES |
| `src/hooks/useOperationalIntelligence.ts` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES (new unified hook) |
| `src/operational-intelligence/*` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES (new layer) |
| `backend/.../emergency-os.operational-intelligence.service.ts` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES |
| `src/store/emergencyStore.ts` | ACTIVE_OPERATIONAL_INTELLIGENCE | YES (input source) |
| `src/engine/{capacity,alert,reassessment}Engine*` | ACTIVE_SCORING_LOGIC / ACTIVE_ALERT_LOGIC | YES (writers) |
| `lib/emergency-os/logic.ts` | ACTIVE_SCORING_LOGIC | YES |

## Copilot (advisory only)

| Artifact | Classification |
|----------|----------------|
| `src/components/CopilotPanel.tsx` | ACTIVE_AI_COPILOT |
| `backend/.../EDCopilotService` | ACTIVE_AI_COPILOT |

## Disconnected / legacy (not consolidated)

| Artifact | Classification |
|----------|----------------|
| `src/services/doorToDoctorIntelligenceService.js` | DISCONNECTED |
| `src/services/waitingRoomIntelligenceService.js` | DISCONNECTED |
| `src/services/emergencyCopilotApi.js` | DEAD_SAFE_TO_REMOVE |
| `backend/src/api/copilot.routes.ts` | LEGACY |

## ML / monitoring

| Artifact | Classification |
|----------|----------------|
| `backend/ml-services/anomaly-detection/anomaly_detector.py` | ACTIVE_MODEL_MONITORING (infra) |
| `backend/ml-services/nlu/*` | FUTURE_MODULE (intent, not ED ops) |
| Operational intelligence baseline | RULE_BASED (no PHI training) |

## Data files

| File | Classification |
|------|----------------|
| `data/ml/artifact_training_dataset.csv` | FUTURE_MODULE (platform meta, not clinical) |
| `data/artifacts/caredroid_artifacts.csv` | FUTURE_MODULE |
| Emergency OS fixtures | ACTIVE_OPERATIONAL_INTELLIGENCE (demo-safe) |
