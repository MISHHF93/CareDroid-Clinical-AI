# Model Monitoring Report

## Current state

CareDroid Emergency OS uses a **rule-based operational intelligence baseline**. No trained clinical ML model is active in this layer.

## Monitored rule baseline

| Rule ID | Purpose | Status |
|---------|---------|--------|
| `rule-operational-baseline-v1` | Unified operational snapshot | Active (fallback mode) |
| `rule-capacity-v1` | Capacity scoring | Active |
| `rule-ems-pressure-v1` | EMS inbound pressure | Active |
| `rule-boarding-risk-v1` | Boarding escalation | Active |
| `rule-queue-bottleneck-v1` | Queue target breaches | Active |
| `rule-reassessment-priority-v1` | Reassessment due queue | Active |
| `rule-data-freshness-v1` | Sync staleness | Active |

## ML monitoring fields (reserved)

When ML-assisted mode is approved for operational (non-clinical) models only:

- input schema validity
- missing values
- data freshness
- feature distribution shift
- prediction distribution shift
- confidence distribution shift
- error rates
- latency
- model version
- last trained / evaluated timestamps
- fallback mode

## External ML artifacts (not in OI spine)

- `backend/ml-services/nlu/*` — intent classification (future)
- `backend/ml-services/anomaly-detection/anomaly_detector.py` — Prometheus infra anomalies

## PHI policy

No PHI/PII used for ML training in this layer.
