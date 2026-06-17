# Operational Intelligence Safety Report

## Advisory-only contract

All operational intelligence outputs are advisory. Staff must review before action.

## Blocked autonomous actions

- change patient journey state
- assign acuity / auto-triage
- diagnose / prescribe
- discharge / admit
- merge patients
- import external data without review
- send clinical orders
- override staff
- auto-identify patients

## Disclaimers

- Operational: "Operational intelligence is advisory. Human review required."
- Clinical: "Human review required. This is not a replacement for clinical judgment."
- External data: "External health record data requires clinician review before use."

## Governance fields on every prediction/recommendation

- `modelOrRuleId`
- `version`
- `inputSummary` / feature vector
- `output` / action
- `confidence`
- `reasonCodes`
- `timestamp`
- `tenantId`
- `sourceModules`
- `humanReviewRequired: true`

## Settings defaults (safe)

- `operationalIntelligenceEnabled: true`
- `operationalIntelligenceMode: rule_based`
- `humanReviewRequired: true` (immutable)
- `autoAlertingEnabled: true` (advisory alerts only)
- `driftMonitoringEnabled: false` until ML models approved
