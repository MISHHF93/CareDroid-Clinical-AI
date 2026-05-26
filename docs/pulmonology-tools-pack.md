# Pulmonology Clinical Tools Pack

## Summary

This pack adds pulmonology calculators, guided assistants, and workflow dashboards through the existing CareDroid tool architecture:

- Unified inventory: `src/data/clinicalToolIdContract.js` and `src/data/toolInventory.js`
- Canonical launch resolution: `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`
- Calculator hub and deep links: `/tools/calculators` and `/tools/calculators/:slug`
- Chat-assisted routes: `/tools/pulmonology/:toolId`
- NLU catalog and backend keyword patterns: `clinicalIntentToolCatalog.js` and `tool.patterns.ts`
- Safety framing: tools are clinical decision support only and do not diagnose or recommend treatment, oxygen, ventilator settings, medications, or disposition.

## Tier A Calculators

| Tool | Registry ID | Route | Surface |
|---|---|---|---|
| STOP-BANG | `stop-bang` | `/tools/calculators/stop-bang` | Existing dedicated calculator form |
| BODE Index | `bode-index` | `/tools/calculators/bode-index` | Dedicated calculator form |
| COPD GOLD Assessment | `copd-gold-assessment` | `/tools/calculators/copd-gold-assessment` | Dedicated calculator form |
| A-a Gradient | `aa-gradient` | `/tools/calculators/aa-gradient` | Dedicated calculator form |
| PaO2/FiO2 Ratio | `pao2-fio2-ratio` | `/tools/calculators/pao2-fio2-ratio` | Dedicated calculator form |
| ROX Index | `rox-index` | `/tools/calculators/rox-index` | Dedicated calculator form |
| Pneumonia Severity Index | `pneumonia-severity-index` | `/tools/calculators/pneumonia-severity-index` | Dedicated calculator form |
| Asthma Severity Score | `asthma-severity-score` | `/tools/calculators/asthma-severity-score` | Dedicated calculator form |

## Tier B Assistants

These tools are registered as chat-assisted pulmonology workflows. Their canonical detail routes are under `/tools/pulmonology/:toolId`, and launch actions seed `/assistant` with safety guardrails.

- `asthma-exacerbation-assistant`
- `ventilator-support-assistant`
- `oxygen-escalation-helper`
- `copd-workflow-assistant`

## Tier C Workflows

These tools are registered as Tier C pulmonology workflows and use the shared pulmonology workflow page for launch context and assistant seeding.

- `ventilator-monitoring-dashboard`
- `respiratory-telemetry-dashboard`
- `sleep-apnea-analytics`
- `pulmonary-trend-engine`
- `respiratory-command-center`

## Backend Contract Scope

No new `/api/tools/:id/execute` executors were added. Pulmonology tools are deterministic client-side calculators or chat-assisted workflows. Their catalog launches therefore resolve `orchestratorTool` to `null` unless a real backend executor is registered in the future.

## Safety Scope

The pack does not diagnose COPD, asthma, pneumonia, ARDS, OSA, respiratory failure, shunt, PE, or ventilator-associated problems. It does not recommend inhalers, steroids, antibiotics, CPAP, oxygen devices, ventilator settings, NIV, intubation, ICU admission, discharge, or disposition. Local emergency respiratory, oxygen, ventilator, pneumonia, asthma, COPD, and sleep medicine pathways take priority.

## Verification

Focused coverage was added for:

- Pulmonology calculator helper logic: `src/utils/pulmonologyCalculators.test.js`
- Inventory, routes, launch behavior, and backend-contract checks: `src/data/pulmonologyToolsPack.test.js`
- Backend NLU pattern matching: `backend/test/tool-patterns-pulmonology-pack.spec.ts`
