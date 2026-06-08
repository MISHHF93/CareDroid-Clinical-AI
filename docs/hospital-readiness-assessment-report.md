# Hospital Readiness Assessment Report

## Goal

The hospital readiness assessment evaluates customer maturity across the dimensions that determine whether a hospital can adopt CareDroid safely, effectively, and at scale. The assessment makes CareDroid consultative by turning maturity gaps into product, pack, integration, and training recommendations.

## Route

Hospital readiness assessment is available through the existing maturity assessment surface at `/maturity-assessment`.

## Measured Dimensions

The assessment generates a score for each readiness dimension:

- Digital maturity: baseline digitization, workflow standardization, and operational analytics readiness.
- AI maturity: AI adoption, model governance, human review, and AI workflow readiness.
- Interoperability: EHR/FHIR/HL7 integration readiness and data exchange maturity.
- Simulation readiness: scenario usage, competency workflows, and training operations.
- IoT readiness: device telemetry, uptime, biomedical workflows, and operational signal quality.
- Governance readiness: audit, privacy, security, regulatory, and review controls.

## Hospital Readiness Score

The Hospital Readiness Score is a 0 to 100 weighted average of the six dimensions. Each dimension includes:

- `score`: normalized 0 to 100 readiness score.
- `level`: emerging, developing, ready, or advanced.
- `signals`: evidence that supports the score.
- `gaps`: maturity gaps that need consultative follow-up.
- `recommendations`: next actions grouped by product, pack, integration, or training.

Readiness bands:

- 85-100: advanced
- 70-84: ready
- 50-69: developing
- 0-49: emerging

## Recommendation Output

The assessment generates consultative recommendations across:

- Products: commercial product suites to position.
- Packs: asset packs that close maturity gaps.
- Integrations: interoperability, identity, data, or device integrations to prioritize.
- Training: onboarding, simulation, governance, and enablement programs.

## Acceptance

CareDroid becomes consultative when the platform can show a hospital its readiness score, explain why each maturity dimension scored as it did, and recommend concrete next products, packs, integrations, and training actions.

## Verification

Verification should cover:

- All six maturity dimensions are measured.
- Hospital Readiness Score is generated from dimension scores.
- Product, pack, integration, and training recommendations are present.
- `/maturity-assessment` renders the score, dimensions, and recommendations.
