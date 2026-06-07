# Artifact Intelligence Pipeline Report

## Summary

- Artifacts exported: 1278
- Feature rows exported: 1278
- Training label rows exported: 3834
- Duplicate artifact IDs: 0
- Orphan findings: 225
- Duplicate-name groups: 1
- Missing metadata findings: 987

The pipeline prepares local, model-ready data only. It does not claim that a machine-learning model has been trained.

## Artifact Types

- ai-model: 9
- api-endpoint: 588
- asset-pack: 14
- calculator: 92
- dashboard: 11
- document: 87
- executor: 11
- fleet: 5
- governance: 17
- hub: 1
- iot: 2
- product: 12
- prompt: 214
- route: 52
- simulation: 8
- tool: 155

## Outputs

- `data/artifacts/caredroid_artifacts.csv`
- `data/artifacts/caredroid_artifacts.json`
- `data/artifacts/caredroid_artifact_features.csv`
- `data/ml/artifact_training_dataset.csv`

## Resonance Checks

- Local similarity engine: enabled
- Orphan detection: 225 findings
- Duplicate detection: 1 groups
- Missing metadata detection: 987 findings
