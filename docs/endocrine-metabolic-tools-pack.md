# Endocrine and Metabolic Tools Pack

## Scope

This pack adds endocrine and metabolic clinical decision support across deterministic calculators, guarded assistants, and dashboard/telemetry workflows. It explicitly does not automate insulin, pump control, medication titration, nutrition prescriptions, fluid rates, or disposition decisions unless a future workflow is explicitly governed by local protocols and clinician approval.

## Tier A: Local Calculators

These tools run locally in the shared calculator hub and do not require backend execution:

- HOMA-IR
- Corrected Calcium
- Corrected Sodium
- Serum Osmolality
- Osmolal Gap
- BMI
- BSA
- Ideal Body Weight
- Adjusted Body Weight
- Waist-to-Hip Ratio

Shared calculators already present in other packs, such as BMI, corrected sodium, and osmolal gap, are included through the unified inventory rather than duplicated.

## Tier B: Guarded Assistants

These routes seed Assistant with endocrine/metabolic prompts and safety constraints:

- Diabetes Care Assistant
- DKA Pathway Assistant
- Thyroid Disorder Assistant
- Metabolic Syndrome Assistant

All Tier B prompts require clinician review, prioritize urgent local pathways, and prohibit insulin/dosing automation.

## Tier C: Dashboard And Telemetry Workflows

These are backend/telemetry visibility workflows only:

- Glucose Telemetry Dashboard
- Insulin Trend Engine
- Endocrine Monitoring System
- Metabolic Analytics
- Continuous Glucose Command Center

They can summarize trends, data freshness, missing readings, and review queues. They do not control devices, calculate insulin doses, titrate medications, place orders, or replace bedside assessment.

## Implementation Notes

- Deterministic formulas live in `src/utils/endocrineMetabolicCalculators.js`.
- New calculator forms live in `src/pages/tools/endocrineMetabolicCalculators.jsx`.
- Tier B/C routes use `src/pages/tools/EndocrineMetabolicAssistantPage.jsx`.
- Inventory, launch metadata, aliases, routes, and backend keyword matching are wired through the existing unified tool contract and catalog pattern.
- Focused tests cover local calculations, canonical inventory, launch paths, safety guardrails, mobile/form smoke manifest inclusion, and backend intent matching.
