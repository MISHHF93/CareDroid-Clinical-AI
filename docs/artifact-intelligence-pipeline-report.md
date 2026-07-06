# Artifact Intelligence Pipeline Report

## Summary

- Artifacts exported: 2460
- Feature rows exported: 2460
- Training label rows exported: 8320
- Intent routing labels: 940
- Duplicate artifact IDs: 0
- Orphan findings: 612
- Duplicate-name groups: 18
- Missing metadata findings: 1687

The pipeline prepares local, model-ready data only. It does not claim that a machine-learning model has been trained.

## Capture Sources

- backend-executors: 11
- backend-services: 171
- core-catalog: routes|tools|api|prompts|packs|products|ai-models|nlu|medical-knowledge
- docs-markdown: 85
- engines: 28
- lib-registries: 38
- ml-services: 6
- pages: 146

## Artifact Types

- ai-model: 21
- api-endpoint: 871
- asset-pack: 14
- backend-service: 171
- calculator: 92
- dashboard: 11
- document: 85
- engine: 28
- executor: 11
- fleet: 5
- governance: 17
- hub: 1
- iot: 2
- medical-knowledge: 4
- nlu-example: 476
- page: 146
- product: 12
- prompt: 214
- registry: 42
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
- Orphan detection: 612 findings
- Duplicate detection: 18 groups
- Missing metadata detection: 1687 findings
