# Neurology Clinical Tools Pack

## Scope

The neurology pack adds calculator, chat-assisted, and monitoring workflow surfaces for stroke, seizure, coma, disability, headache, vertigo, neuro exam, telemetry, EEG, and timeline review.

## Tier A: Local Calculator Forms

- ABCD2: short-term stroke risk context after suspected TIA.
- Hunt-Hess Scale: aneurysmal SAH clinical severity grade.
- ICH Score: intracerebral hemorrhage severity context from GCS, volume, IVH, origin, and age.
- FOUR Score: coma scale using eye, motor, brainstem, and respiratory components.
- Modified Rankin Scale: global disability outcome documentation.
- NIHSS Summary View: stroke exam item summary for serial comparison and handoff.
- Pediatric GCS: age-adjusted pediatric consciousness scoring.

## Tier B: Chat-Assisted Workflows

- Seizure Assistant.
- Stroke Workflow Assistant.
- Headache Red Flag Assistant.
- Vertigo HINTS Assistant.
- Neuro Exam Assistant.

These workflows are intentionally chat-assisted because they depend on exam quality, timing, and missing-data prompts. Each launch seed states that it is clinical decision support only and must not delay urgent pathways.

## Tier C: Monitoring and Command Surfaces

- Neuro Telemetry Dashboard.
- Stroke Command Center.
- Neuro Monitoring Engine.
- EEG Trend Dashboard.
- Neurology Timeline AI.

Tier C entries are visibility, summary, and review-queue concepts. They do not issue autonomous alerts, orders, treatment recommendations, thrombolysis or thrombectomy decisions, seizure medication recommendations, or disposition guidance.

## Safety Guardrails

Do not delay emergency stroke care. Suspected acute stroke, posterior circulation concern, seizure/status epilepticus, airway compromise, acute neuro deterioration, traumatic neurologic injury, suspected CNS infection, SAH/ICH concern, or spinal cord symptoms require immediate local emergency pathways, bedside assessment, imaging, and specialist review as appropriate.

The pack avoids:

- Stroke diagnosis or rule-out claims.
- Thrombolysis or thrombectomy eligibility decisions.
- Antiseizure medication dosing or medication changes.
- Imaging, LP, procedure, admission, discharge, transfer, or disposition recommendations.
- Autonomous monitoring, escalation, or order placement.

## Wiring Summary

- Canonical IDs live in `src/data/clinicalToolIdContract.js`.
- Sidebar/catalog rows live in `src/data/toolRegistry.js` and `src/data/clinicalIntentToolCatalog.js`.
- Tier A forms are implemented in `src/pages/tools/neurologyCalculators.jsx` with pure helpers in `src/utils/neurologyCalculators.js`.
- Tier B and Tier C launch pages use `src/pages/tools/NeurologyAssistantPage.jsx`.
- Backend NLU pattern coverage lives in `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`.
- Route validation derives calculator paths from `CALCULATOR_ROUTE_DEFS` and dynamic neurology routes from `/tools/neurology/:toolId`.

## Verification

Focused coverage includes:

- `src/utils/neurologyCalculators.test.js`
- `src/data/neurologyToolsPack.test.js`
- `backend/test/tool-patterns-neurology-pack.spec.ts`

