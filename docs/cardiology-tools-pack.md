# Cardiology Clinical Tools Pack

## Summary

This pack adds cardiology-focused calculators, guided assistants, and workflow dashboards through the existing CareDroid tool architecture:

- Unified inventory: `src/data/clinicalToolIdContract.js` and `src/data/toolInventory.js`
- Canonical launch resolution: `resolveCatalogLaunch()` and `applyRegistryToolLaunch()`
- Calculator hub and deep links: `/tools/calculators` and `/tools/calculators/:slug`
- NLU catalog and backend keyword patterns: `clinicalIntentToolCatalog.js` and `tool.patterns.ts`
- Safety framing: all tools are clinical decision support only, do not diagnose, and do not recommend treatment or disposition.

## Tier A Calculators

| Tool | Registry ID | Route | Surface |
|---|---|---|---|
| CHA2DS2-VASc | `calc-chads2vasc` | `/tools/calculators/chads2vasc` | Dedicated calculator form |
| HAS-BLED | `has-bled` | `/tools/calculators/has-bled` | Dedicated calculator form |
| ASCVD Risk | `ascvd-risk` | `/tools/calculators/ascvd-risk` | Dedicated calculator form |
| TIMI Risk | `timi-ua-nstemi` | `/tools/calculators/timi-ua-nstemi` | Dedicated calculator form |
| Framingham Risk Score | `framingham-risk` | `/tools/calculators/framingham-risk` | Dedicated calculator form |
| Duke Treadmill Score | `duke-treadmill-score` | `/tools/calculators/duke-treadmill-score` | Dedicated calculator form |
| Reynolds Risk Score Helper | `reynolds-risk-score` | `/tools/calculators/reynolds-risk-score` | Dedicated calculator form |
| HCM Sudden Death Risk | `hcm-sudden-death-risk` | `/tools/calculators/hcm-sudden-death-risk` | Dedicated calculator form |
| CHADS2 | `chads2` | `/tools/calculators/chads2` | Dedicated calculator form |
| Heart Failure Staging Helper | `heart-failure-staging` | `/tools/calculators/heart-failure-staging` | Dedicated calculator form |

## Tier B Assistants

These tools are registered as Tier B chat-assisted cardiology tools. They appear in the unified tool inventory, NLU catalog, backend patterns, and calculator hub chat-assisted section. Their canonical detail routes are under `/tools/cardiology/:toolId`, and launch actions seed `/assistant` with safety guardrails.

- `ecg-interpretation-assistant`
- `stemi-pathway-assistant`
- `acs-workflow-assistant`
- `atrial-fibrillation-assistant`
- `heart-failure-assistant`

## Tier C Workflows

These tools are registered as Tier C cardiology workflows and use the shared cardiology workflow page to provide launch context and assistant seeding.

- `cardiac-telemetry-analyzer`
- `ecg-trend-engine`
- `arrhythmia-risk-classifier`
- `remote-cardiology-monitoring-dashboard`
- `cardiology-command-center`

## Safety Scope

All tools are decision support only. They do not diagnose, rule in, rule out, recommend medications, recommend anticoagulation, determine ICD placement, clear exercise tests, place orders, dispatch staff, or replace local ACS/STEMI, unstable arrhythmia, telemetry, remote monitoring, or heart failure escalation pathways.

## Verification

Focused coverage was added for:

- Cardiology calculator helper logic: `src/utils/cardiologyRiskCalculators.test.js`
- Inventory, routes, launch behavior, and duplicate route/id checks: `src/data/cardiologyToolsPack.test.js`
- Backend NLU pattern matching: `backend/test/tool-patterns-cardiology-pack.spec.ts`
