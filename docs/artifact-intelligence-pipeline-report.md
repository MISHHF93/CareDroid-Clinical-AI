# Artifact Intelligence Pipeline Report

## Summary

- Artifacts exported: 2210
- Feature rows exported: 2210
- Training label rows exported: 7132
- Intent routing labels: 502
- Duplicate artifact IDs: 0
- Orphan findings: 714
- Duplicate-name groups: 13
- Missing metadata findings: 1919

The pipeline prepares local, model-ready data only. It does not claim that a machine-learning model has been trained.

## Capture Sources

- backend-executors: 48
- backend-services: 215
- core-catalog: routes|tools|api|prompts|packs|products|ai-models|nlu|medical-knowledge
- docs-markdown: 159
- engines: 28
- lib-registries: 57
- ml-services: 7
- pages: 147

## Artifact Types

- ai-model: 19
- api-endpoint: 927
- asset-pack: 14
- backend-service: 215
- calculator: 92
- dashboard: 11
- document: 159
- engine: 28
- executor: 48
- fleet: 5
- governance: 17
- hub: 1
- iot: 2
- page: 147
- product: 12
- prompt: 214
- registry: 62
- route: 74
- simulation: 8
- tool: 155

## Outputs

- `data/artifacts/caredroid_artifacts.csv`
- `data/artifacts/caredroid_artifacts.json`
- `data/artifacts/caredroid_artifact_features.csv`
- `data/ml/artifact_training_dataset.csv`

## Resonance Checks

- Local similarity engine: enabled
- Orphan detection: 714 findings
- Duplicate detection: 13 groups
- Missing metadata detection: 1919 findings
