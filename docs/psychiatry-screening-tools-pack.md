# Psychiatry and Screening Tools Pack

## Scope

This pack adds psychiatry and behavioral-health screening surfaces across three tiers:

- Tier A calculator/forms: PHQ-9, GAD-7, AUDIT-C, CAGE, MMSE score entry, MoCA placeholder workflow, PCL-5, MDQ, Epworth Sleepiness Scale, and Columbia suicide severity workflow entry.
- Tier B guided assistants: Mental Health Screening Assistant, Suicide Risk Workflow Assistant, Substance Use Screening Assistant, and Cognitive Screening Assistant.
- Tier C monitoring surfaces: Behavioral Analytics Dashboard, Screening Trend Engine, Psychiatry Monitoring Dashboard, Crisis Escalation Audit Log, and Population Screening Dashboard.

## Safety Requirements

All outputs are screening decision support only. They do not establish psychiatric, substance-use, cognitive, trauma, or sleep diagnoses; they do not recommend medications, therapy, detoxification, disposition, work clearance, driving clearance, or capacity determinations.

Human review is required for every result. Local behavioral-health, medical emergency, intoxication, withdrawal, delirium, neurologic, and psychiatric emergency pathways take priority over screening completion.

PHQ-9 item 9, Columbia workflow flags, and any self-harm/suicidal ideation disclosure are crisis-sensitive. Routine scoring must stop for immediate safety assessment, direct clinical or crisis review, local psychiatric emergency pathways, emergency services when needed, and crisis resources such as the 988 Suicide & Crisis Lifeline in the U.S. when applicable.

## Implementation Notes

- Dedicated Tier A routes are registered under `/tools/calculators/:slug` and render through `Calculators.jsx`.
- MoCA is implemented as a placeholder workflow only; it does not display MoCA items or calculate a score.
- MMSE is score-entry support only from a governed administration; it does not administer the instrument.
- Tier B and Tier C entries route through `/tools/psychiatry/:toolId` and seed the Assistant with safety-scoped guardrails.
- Backend intent patterns recognize all new tool IDs, but no new backend executor is registered.

## Verification

Required tests cover deterministic scoring, crisis-sensitive messaging, registry/catalog routing, assistant/dashboard safety copy, and backend intent pattern matching.
