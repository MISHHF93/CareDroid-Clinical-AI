# Tool Audit Report

Generated: 2026-05-30T21:14:34.112Z

## Scope

This audit is generated from the canonical frontend/backend contract sources and covers registry tools, NLU medical profiles, calculator forms, platform/shared API rows, and phantom/planned discovery rows. It does not delete tools or change medical formulas.

## Summary

| Metric | Count |
| --- | --- |
| Total audit rows | 237 |
| Sidebar registry tools | 227 |
| NLU medical profiles | 204 |
| Calculator forms | 92 |
| Registered backend POST executors | 3 |
| Automated contract gaps | 0 |

## Status Distribution

| Status | Count |
| --- | --- |
| missing backend | 108 |
| partially wired | 125 |
| wired | 4 |

## Backend Executor Reality

Only three medical tools currently have registered `POST /api/tools/:id/execute` executors: `sofa-calculator`, `drug-interactions`, and `lab-interpreter`. Most of the 270+ tool set is intentionally frontend-only, chat-assisted, shared-page, or platform/demo routed. The JSON status file marks those as `missing backend` or `partially wired` depending on whether a chat/API action exists.

## Duplicate And Conflict Checks

- Duplicate audit row IDs: 0
- Duplicate registry IDs: 0
- Duplicate NLU IDs: 0
- Duplicate calculator slugs: 0
- Shared frontend route groups: 9
- Shared backend endpoint groups: 1

Shared route groups are expected for hub/chat/shared pages such as `/tools/calculators`, `/tools/lab-interpreter`, `/tools/protocols`, and specialty assistant surfaces. They are still listed in `TOOL_REGISTRY_STATUS.json` for review.

## Broken Connections

_No rows are currently classified as broken by the automated contract builder._

## Missing Backend Connections

The JSON file contains 108 rows without a registered backend endpoint/action. The first 40 are listed here for triage.

| Tool ID | Display name | Frontend route | Frontend component |
| --- | --- | --- | --- |
| aa-gradient | A-a Gradient | /tools/calculators/aa-gradient | src/pages/tools/Calculators.jsx |
| abcd2 | ABCD² score | /tools/calculators/abcd2 | src/pages/tools/Calculators.jsx |
| adjusted-body-weight | Adjusted Body Weight | /tools/calculators/adjusted-body-weight | src/pages/tools/Calculators.jsx |
| anion-gap | Anion Gap | /tools/calculators/anion-gap | src/pages/tools/Calculators.jsx |
| apache2-calculator | APACHE-II Score | /tools/calculators/apache-ii | src/pages/tools/Calculators.jsx |
| apgar-score | Apgar score | /tools/calculators/apgar-score | src/pages/tools/Calculators.jsx |
| apri | APRI | /tools/calculators/apri | src/pages/tools/Calculators.jsx |
| ascvd-risk | ASCVD 10-year risk (PCE) | /tools/calculators/ascvd-risk | src/pages/tools/Calculators.jsx |
| asthma-severity-score | Asthma Severity Score | /tools/calculators/asthma-severity-score | src/pages/tools/Calculators.jsx |
| audit-c | AUDIT-C (alcohol screen) | /tools/calculators/audit-c | src/pages/tools/Calculators.jsx |
| bed-occupancy-calculator | Bed Occupancy Calculator | /tools/calculators/bed-occupancy-calculator | src/pages/tools/Calculators.jsx |
| bisap-score | BISAP score | /tools/calculators/bisap-score | src/pages/tools/Calculators.jsx |
| bishop-score | Bishop score | /tools/calculators/bishop-score | src/pages/tools/Calculators.jsx |
| bode-index | BODE Index | /tools/calculators/bode-index | src/pages/tools/Calculators.jsx |
| braden-scale | Braden scale | /tools/calculators/braden-scale | src/pages/tools/Calculators.jsx |
| bsa | Body Surface Area | /tools/calculators/bsa | src/pages/tools/Calculators.jsx |
| bun-creatinine-ratio | BUN/Creatinine Ratio | /tools/calculators/bun-creatinine-ratio | src/pages/tools/Calculators.jsx |
| cage | CAGE (alcohol screen) | /tools/calculators/cage | src/pages/tools/Calculators.jsx |
| centor-mcisaac | Centor / McIsaac score | /tools/calculators/centor-mcisaac | src/pages/tools/Calculators.jsx |
| cha2ds2vasc-calculator | CHA2DS2-VASc Score | /tools/calculators/chads2vasc | src/pages/tools/Calculators.jsx |
| chads2 | CHADS2 Score | /tools/calculators/chads2 | src/pages/tools/Calculators.jsx |
| child-pugh | Child-Pugh score | /tools/calculators/child-pugh | src/pages/tools/Calculators.jsx |
| ckd-staging | CKD staging (KDIGO) | /tools/calculators/ckd-staging | src/pages/tools/Calculators.jsx |
| columbia-suicide-severity-workflow | Columbia suicide severity workflow entry | /tools/calculators/columbia-suicide-severity-workflow | src/pages/tools/Calculators.jsx |
| copd-gold-assessment | COPD GOLD Assessment | /tools/calculators/copd-gold-assessment | src/pages/tools/Calculators.jsx |
| corrected-calcium | Corrected Calcium | /tools/calculators/corrected-calcium | src/pages/tools/Calculators.jsx |
| corrected-sodium | Corrected Sodium | /tools/calculators/corrected-sodium | src/pages/tools/Calculators.jsx |
| creatinine-clearance-cg | Creatinine Clearance Cockcroft-Gault | /tools/calculators/creatinine-clearance-cg | src/pages/tools/Calculators.jsx |
| curb65-calculator | CURB-65 Score | /tools/calculators/curb-65 | src/pages/tools/Calculators.jsx |
| duke-treadmill-score | Duke Treadmill Score | /tools/calculators/duke-treadmill-score | src/pages/tools/Calculators.jsx |
| egfr-ckd-epi | eGFR CKD-EPI 2021 | /tools/calculators/egfr-ckd-epi | src/pages/tools/Calculators.jsx |
| epworth-sleepiness-scale | Epworth Sleepiness Scale | /tools/calculators/epworth-sleepiness-scale | src/pages/tools/Calculators.jsx |
| fena | FeNa | /tools/calculators/fena | src/pages/tools/Calculators.jsx |
| fenton-growth-chart-helper | Fenton Growth Chart Helper | /tools/calculators/fenton-growth-chart-helper | src/pages/tools/Calculators.jsx |
| feurea | FeUrea | /tools/calculators/feurea | src/pages/tools/Calculators.jsx |
| fib4 | FIB-4 index | /tools/calculators/fib4 | src/pages/tools/Calculators.jsx |
| fleet-command | Fleet Command Dashboard | /fleet/command | src/pages/fleet/FleetDashboard.jsx |
| four-score | FOUR Score | /tools/calculators/four-score | src/pages/tools/Calculators.jsx |
| framingham-risk | Framingham 10-year CHD risk | /tools/calculators/framingham-risk | src/pages/tools/Calculators.jsx |
| free-water-deficit | Free Water Deficit | /tools/calculators/free-water-deficit | src/pages/tools/Calculators.jsx |

## Shared Frontend Routes

| Route | Count | Example tool IDs |
| --- | --- | --- |
| /tools/calculators | 17 | calculators, canadian-c-spine, copd-gold, device-recommendation-assistant, dispatch-ai, dose-calculator, grace-acs, hospital-command-assistant, ... |
| /hospital-map | 7 | asset-tracking-dashboard, capacity-prediction-engine, hospital-map, hospital-operations-cockpit, hospital-operations-command, incident-command-center, telemetry-monitoring |
| /assistant | 3 | ai-gateway, ai-tool-calling, moe-router |
| /tools/protocols | 3 | acls-protocol, atls-protocol, protocol-lookup |
| /devices | 2 | device-fleet-management, device-maintenance |
| /medical-iot | 2 | device-battery-intelligence, medical-iot-dashboard |
| /tools/diagnosis | 2 | antibiotic-guide, differential-diagnosis |
| /tools/guideline-rag | 2 | ai-rag, guideline-rag |
| /tools/lab-interpreter | 2 | abg-interpreter, lab-interpreter |

## Recommended Patches

- **high: Preserve orchestrator result metadata in the frontend adapter** (implemented in this pass) — Backend tools return interpretation, warnings, citations, disclaimer, and timestamp outside data; the current adapter can drop them.
- **high: Connect existing source-backed trauma/PE/ACS/neuro calculator forms to canonical routes** (recommended; broad contract migration) — Several calculator form components exist in source code while catalog records still present them as hub/chat-only.
- **medium: Standardize calculator result payloads around score/value, interpretation, warnings, disclaimer, and citations** (recommended) — Local calculators use varied field names, which complicates copy/share/result rendering.
- **medium: Move repeated calculator panel primitives into a shared component module** (recommended) — Multiple calculator packs duplicate validation summaries, decision-support notices, and result panel shells.

## Generated Artifacts

- `TOOL_REGISTRY_STATUS.json` contains the complete per-tool map with frontend, backend, schema, quality, conflict, and status fields.
- This report intentionally summarizes high-signal findings and leaves full row-level detail to the JSON artifact.

