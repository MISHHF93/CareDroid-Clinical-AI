# CareDroid Master Platform Inventory

**Generated:** 2026-06-02

This is the master feature inventory and strategy document for CareDroid Clinical AI. It consolidates findings from the React/Vite frontend, NestJS backend, package/config files, route registries, tool/calculator inventories, AI modules, map/IoT/fleet modules, tests, README, and the markdown reports under `docs/`.

## 1. Executive Summary

- CareDroid is a large clinical AI platform with **242 sidebar registry tools**, **219 NLU/AI clinical profiles**, **92 dedicated calculator UI forms**, **92 calculator SPA routes**, and **291 catalog rows**.
- The honest backend/frontend contract is mixed: **4 fully wired rows**, **240 frontend-only rows**, **8 planned rows**, and **3 executable clinical POST tools** (`sofa-calculator`, `drug-interactions`, `lab-interpreter`).
- The frontend route table currently contains **193 explicit route records** plus generated calculator routes and aliases. The backend route inventory contains **253 canonical HTTP routes** across controllers, with the largest route surface in `PlatformSystemsController` (75 routes).
- The product is strongest as a frontend-rich clinical workspace, calculator catalog, AI assistant shell, governance dashboard, and operations demo layer. Production-grade execution is narrower: backend-backed clinical tool execution exists for SOFA, drug interaction checking, lab interpretation, selected Clinical Intelligence workflows, governance, profile/workspace, artifacts, memory, tool calling, training/evaluation, hospital map/telemetry/fleet demo services, and platform systems APIs.
- Anything using demo snapshots, static data, placeholders, chat-only fallbacks, or mocked platform/system cards is labeled as demo/mock-only or frontend-only below.

## 2. Current Platform Vision

CareDroid is positioned as a clinical operating system: an AI-chat-centered workspace that routes users into calculators, clinical AI tools, evidence/RAG, governed tool calls, hospital operations maps, Medical IoT telemetry, fleet logistics, simulation/training, laboratory workflows, and platform governance. The vision is to reduce route sprawl by using a unified inventory, normalized routes, profile-based segmentation, and assistant-first tool launch while keeping high-risk clinical actions audit-bound and human-reviewed.

## 3. Implemented Features

| Feature | ID/route | Frontend status | Backend status | Launch behavior | Demo/live | Tests status | Notes |
|---|---|---|---|---|---|---|---|
| Drug Interaction Checker | `drug-interactions` / `/tools/drug-checker` | Implemented | Implemented endpoint `/api/tools/drug-interactions/execute` | Direct UI/API execution | Live contract | Covered by contract/tool tests | Fully wired row in tool contract matrix. |
| Lab Results Interpreter | `lab-interpreter` / `/tools/lab-interpreter` | Implemented | Implemented endpoint `/api/tools/lab-interpreter/execute` | Direct UI/API execution | Live contract | Covered by contract/tool tests | Fully wired row in tool contract matrix. |
| SOFA Score Calculator | `sofa-calculator` / `/tools/calculators/sofa` | Implemented | Implemented endpoint `/api/tools/sofa-calculator/execute` | Direct UI/API execution | Live contract | Covered by contract/tool tests | Calculator slug: sofa |
| List orchestrator tools | `tools-list-api` / `—` | Implemented | Implemented endpoint `GET /api/tools` | Direct UI/API execution | Live contract | Covered by contract/tool tests | Catalog executor panel |
| Authentication, profile, workspace shell | `/auth`, `/profile`, `/workspace/:workspaceId` | Implemented | Implemented auth/users/profile/workspaces modules | Route guarded app shell | Live/demo depending env | Frontend/backend auth tests exist | JWT/OAuth/2FA/biometric endpoints are present; dev bypass exists for local/dev scenarios. |
| Notifications | `/notifications`, `/notification-preferences` | Implemented | Implemented notification controller/services | App notification center and preferences | Live if Firebase/config available | Component/API tests exist | Device tokens, preferences, unread count, test notification routes. |
| Audit/compliance/governance shell | `/audit`, `/ai-governance`, `/governance/*` | Implemented UI surfaces | Backend audit, compliance, platform-governance, governance modules | Protected admin/governance routes | Mostly live service APIs plus dashboards | Backend service specs and frontend page tests exist | Includes hash-chained audit logs, gate evaluation, review items, consent/privacy/synthetic validation routes. |
| Artifacts | `/artifacts` | Implemented | Backend artifacts module + migrations | Artifact list/graph/API | Live service contract | Artifacts tests exist | Supports artifact entities, versions, relationships, seed/asset registry services. |
| AI Memory dashboard | `/memory`, `/ai-memory` | Implemented | Backend short/long/clinical memory modules + migration | Dashboard/API memory records | Live service contract | Memory service specs and page tests exist | Distinguishes short-term, long-term, and clinical memory entries. |
| Training/evaluation/cost dashboards | `/training`, `/ai/evaluation`, `/costs` | Implemented pages | Backend training, evaluation, cost-optimizer modules | Dashboards/API calls | Live/demo depending data | Service/page tests exist | Used for AI quality, runs, metrics, routing/cost optimization. |

## 4. Partially Implemented Features

| Feature class | Count/examples | Frontend status | Backend status | Launch behavior | User-facing status | Notes |
|---|---:|---|---|---|---|---|
| Frontend-only clinical tools and calculators | 240 rows | UI/catalog/routes/NLU mostly present | No dedicated POST executor for most rows | Calculator form, chat seed, or static page | Visible but not backend-executable | Includes 92 calculator forms/routes and many Tier-B/C specialty assistants. Chat may fall back to general AI when no structured executor exists. |
| Clinical Intelligence workflows | 8 main routes | Pages implemented | Backend endpoints exist for ambient scribe, guideline RAG, differential, timeline, summary, order set, explainability, audit | Direct form/API calls | Partially live | Requires real source data, review workflows, and production policy gates for clinical deployment. |
| Hospital map / Medical IoT / live maps / fleet | 20+ surfaces | Pages implemented | Backend demo modules/services exist | Snapshot dashboards and map views | Demo/live hybrid | Services explicitly mark backend map contract as demo until connected to real floor/device feeds. |
| Platform systems and integrations | 75 backend routes in PlatformSystemsController | Many pages route to generic PlatformSystemPage | Backend endpoints implemented with synthetic/demo contracts | Protected platform pages | Partially implemented | FHIR/HL7/source provenance/patient import and clinical intelligence helpers need production connectors. |
| AI Gateway / MoE / tool calling / memory / artifacts | Assistant-integrated | Backend modules and services present | ChatService wires gateway, MoE, cost optimizer, memory, artifacts, evaluation, tool calling | Assistant first | Partially implemented | Strategy is present in code/docs; production completeness depends on model credentials, evaluation, policies, and real tool coverage. |

## 5. Planned Features

| Name | ID | Route | Frontend status | Backend status | Category | User-facing status | Demo/live | Tests | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ABC Emergency Assessment | `abc-assessment` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Recommended for emergency_assessment intent; no UI or backend executor. |
| Antibiotic Scripts | `antibiotic-scripts` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Overlaps NLU antibiotic-guide → diagnosis page; separate id unused in UI. |
| Bleeding Risk Calculator | `bleeding-risk` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Cost category id; launch resolves to HAS-BLED registry (/tools/calculators/has-bled) via NLU_TO_REGISTRY_ID + toolIdAliases. |
| Oncology Risk Calculator | `cancer-calculator` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | NLU recommendations only; not in tool.patterns or Calculators.jsx. |
| Chemotherapy Dosing Calculator | `chemo-calculator` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Recommendation + cost tracking only. |
| Medication Checker (offline label) | `medication-checker` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Offline cache category label; alias of drug-check conceptually. |
| Tumor Staging Guide | `tumor-staging` | — | Not implemented | Not implemented | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | Recommendation + cost tracking only. |
| Vitals Monitor | `vitals-monitor` | — | Not implemented | Endpoint exists but no dedicated page | Planned/phantom | Not visible as production tool | Planned | Contract matrix only | POST /api/chat/analyze-vitals exists; no dedicated vitals tool page. |
| Real hospital digital twin feeds | TBD | `/hospital-map`, `/medical-iot`, `/live-map` | Demo shells exist | Demo contracts exist | Operations | Planned production connector | Demo now | Page/service tests | Needs real RTLS/CMMS/IoT/FHIR feeds. |
| Production 3D/DICOM viewer | TBD | `/3d-viewer` | Placeholder canvas | No DICOM/3D backend | Visualization | Planned | Demo-only now | Page smoke tests | Needs committed assets or remote viewer service and dependency selection. |
| Production LIS/laboratory integration | TBD | `/laboratory` | Demo dashboard | Platform endpoints only | Laboratory | Planned | Demo-only now | Route/page tests | Needs LIS/FHIR Observation integration and analyzer queue data. |

## 6. Demo/Mock-Only Features

| Feature | Route | Demo signal | Frontend status | Backend status | Notes |
|---|---|---|---|---|---|
| Hospital map dashboard | `/hospital-map` | `HOSPITAL_MAP_BACKEND_STATUS.demoContractOnly = true` | Implemented | Demo hospital-map services | Replace with real floor/device feeds before clinical use. |
| Medical IoT dashboard | `/medical-iot` | Snapshot/demo telemetry | Implemented | Telemetry/device registry demo services | Needs real device registry, telemetry broker, alerting, maintenance feeds. |
| Live tracking map | `/live-map`, `/fleet/map` | Live tracking capability/demo services | Implemented | LiveTracking/Fleet demo contracts | Needs production GPS/RTLS ingestion and SLA monitoring. |
| Medical simulation suite | `/simulation`, `/simulation/:scenarioId`, `/simulation/outcomes` | Scenario/training catalog style | Implemented | Simulation module/services | Training content exists but should be validated before credentialing use. |
| Laboratory dashboard | `/laboratory` | Demo specimen/analyzer panels | Implemented | No dedicated LIS backend beyond platform systems | Demo operational visualization. |
| 3D viewer | `/3d-viewer` | Placeholder models; no GLB/GLTF/DICOM assets | Implemented placeholder | No imaging backend | Explicitly not diagnostic imaging. |
| Some platform OS pages | `/integrations/*`, `/patients/*`, `/operations/*`, `/review/*` | Generic PlatformSystemPage | Implemented route shell | Backend/platform APIs vary | Useful as navigation/strategy placeholders. |

## 7. Medical Calculators Inventory

CareDroid exposes **109 calculator-related contract rows** including **92 dedicated calculator UI forms** and **92 calculator SPA routes**. Unless marked fully wired, calculator rows are frontend-only local forms or chat-assisted launches without dedicated backend POST execution.

| Name | ID | Route | Frontend status | Backend status | Launch behavior | Category | User-facing status | Demo/live | Tests | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A-a Gradient | `aa-gradient` | `/tools/calculators/aa-gradient` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: aa-gradient |
| ABCD² score | `abcd2` | `/tools/calculators/abcd2` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: abcd2 |
| Adjusted Body Weight | `adjusted-body-weight` | `/tools/calculators/adjusted-body-weight` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: adjusted-body-weight |
| Anion Gap | `anion-gap` | `/tools/calculators/anion-gap` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: anion-gap |
| APACHE-II Score | `apache2-calculator` | `/tools/calculators/apache-ii` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Apgar score | `apgar-score` | `/tools/calculators/apgar-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: apgar-score |
| APRI | `apri` | `/tools/calculators/apri` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: apri |
| ASCVD 10-year risk (PCE) | `ascvd-risk` | `/tools/calculators/ascvd-risk` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: ascvd-risk |
| Asthma Severity Score | `asthma-severity-score` | `/tools/calculators/asthma-severity-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: asthma-severity-score |
| AUDIT-C (alcohol screen) | `audit-c` | `/tools/calculators/audit-c` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: audit-c |
| Bed Occupancy Calculator | `bed-occupancy-calculator` | `/tools/calculators/bed-occupancy-calculator` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bed-occupancy-calculator |
| BISAP score | `bisap-score` | `/tools/calculators/bisap-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bisap-score |
| Bishop score | `bishop-score` | `/tools/calculators/bishop-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bishop-score |
| BODE Index | `bode-index` | `/tools/calculators/bode-index` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bode-index |
| Braden scale | `braden-scale` | `/tools/calculators/braden-scale` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: braden-scale |
| Body Surface Area | `bsa` | `/tools/calculators/bsa` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bsa |
| BUN/Creatinine Ratio | `bun-creatinine-ratio` | `/tools/calculators/bun-creatinine-ratio` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: bun-creatinine-ratio |
| CAGE (alcohol screen) | `cage` | `/tools/calculators/cage` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: cage |
| Canadian C-Spine Rule | `canadian-c-spine` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| Centor / McIsaac score | `centor-mcisaac` | `/tools/calculators/centor-mcisaac` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: centor-mcisaac |
| CHA2DS2-VASc Score | `cha2ds2vasc-calculator` | `/tools/calculators/chads2vasc` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: chads2vasc |
| CHADS2 Score | `chads2` | `/tools/calculators/chads2` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: chads2 |
| Child-Pugh score | `child-pugh` | `/tools/calculators/child-pugh` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: child-pugh |
| CKD staging (KDIGO) | `ckd-staging` | `/tools/calculators/ckd-staging` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: ckd-staging |
| Columbia suicide severity workflow entry | `columbia-suicide-severity-workflow` | `/tools/calculators/columbia-suicide-severity-workflow` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: columbia-suicide-severity-workflow |
| COPD GOLD Assessment | `copd-gold` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| COPD GOLD Assessment | `copd-gold-assessment` | `/tools/calculators/copd-gold-assessment` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: copd-gold-assessment |
| Corrected Calcium | `corrected-calcium` | `/tools/calculators/corrected-calcium` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: corrected-calcium |
| Corrected Sodium | `corrected-sodium` | `/tools/calculators/corrected-sodium` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: corrected-sodium |
| Creatinine Clearance Cockcroft-Gault | `creatinine-clearance-cg` | `/tools/calculators/creatinine-clearance-cg` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: creatinine-clearance-cg |
| CURB-65 Score | `curb65-calculator` | `/tools/calculators/curb-65` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Device Recommendation Assistant | `device-recommendation-assistant` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Dispatch Intelligence Assistant | `dispatch-ai` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST; NLU backendExecutable flag (chat routing only) |
| Medication Dose Calculator | `dose-calculator` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Duke Treadmill Score | `duke-treadmill-score` | `/tools/calculators/duke-treadmill-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: duke-treadmill-score |
| eGFR CKD-EPI 2021 | `egfr-ckd-epi` | `/tools/calculators/egfr-ckd-epi` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: egfr-ckd-epi |
| Epworth Sleepiness Scale | `epworth-sleepiness-scale` | `/tools/calculators/epworth-sleepiness-scale` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: epworth-sleepiness-scale |
| FeNa | `fena` | `/tools/calculators/fena` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: fena |
| Fenton Growth Chart Helper | `fenton-growth-chart-helper` | `/tools/calculators/fenton-growth-chart-helper` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: fenton-growth-chart-helper |
| FeUrea | `feurea` | `/tools/calculators/feurea` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: feurea |
| FIB-4 index | `fib4` | `/tools/calculators/fib4` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: fib4 |
| FOUR Score | `four-score` | `/tools/calculators/four-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: four-score |
| Framingham 10-year CHD risk | `framingham-risk` | `/tools/calculators/framingham-risk` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: framingham-risk |
| Free Water Deficit | `free-water-deficit` | `/tools/calculators/free-water-deficit` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: free-water-deficit |
| GAD-7 (anxiety screen) | `gad7` | `/tools/calculators/gad7` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: gad7 |
| Glasgow Coma Scale | `gcs-calculator` | `/tools/calculators/gcs` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Gestational Age Calculator | `gestational-age-calculator` | `/tools/calculators/gestational-age-calculator` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: gestational-age-calculator |
| Glasgow-Blatchford Score | `glasgow-blatchford-score` | `/tools/calculators/glasgow-blatchford-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: glasgow-blatchford-score |
| GRACE ACS Risk | `grace-acs` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| HAS-BLED score | `has-bled` | `/tools/calculators/has-bled` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: has-bled |
| HCM Sudden Death Risk | `hcm-sudden-death-risk` | `/tools/calculators/hcm-sudden-death-risk` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: hcm-sudden-death-risk |
| Heart Failure Staging Helper | `heart-failure-staging` | `/tools/calculators/heart-failure-staging` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: heart-failure-staging |
| HEART score | `heart-score` | `/tools/calculators/heart-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: heart-score |
| HOMA-IR | `homa-ir` | `/tools/calculators/homa-ir` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: homa-ir |
| Hospital Command Assistant | `hospital-command-assistant` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Hunt-Hess Scale | `hunt-hess-scale` | `/tools/calculators/hunt-hess-scale` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: hunt-hess-scale |
| ICH Score | `ich-score` | `/tools/calculators/ich-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: ich-score |
| Ideal Body Weight | `ideal-body-weight` | `/tools/calculators/ideal-body-weight` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: ideal-body-weight |
| Kidney Failure Risk Equation | `kfre` | `/tools/calculators/kfre` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: kfre |
| Maddrey Discriminant Function | `maddrey-discriminant-function` | `/tools/calculators/maddrey-discriminant-function` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: maddrey-discriminant-function |
| Mood Disorder Questionnaire (MDQ) | `mdq` | `/tools/calculators/mdq` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: mdq |
| MELD score | `meld` | `/tools/calculators/meld` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: meld |
| MELD-Na score | `meld-na` | `/tools/calculators/meld-na` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: meld-na |
| Modified Early Warning Score (MEWS) | `mews` | `/tools/calculators/mews` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: mews |
| MMSE score entry | `mmse` | `/tools/calculators/mmse` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: mmse |
| MoCA placeholder workflow | `moca-placeholder-workflow` | `/tools/calculators/moca-placeholder-workflow` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: moca-placeholder-workflow |
| Modified Rankin Scale | `modified-rankin-scale` | `/tools/calculators/modified-rankin-scale` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: modified-rankin-scale |
| Morse Fall Scale | `morse-fall-scale` | `/tools/calculators/morse-fall-scale` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: morse-fall-scale |
| Neonatal Bilirubin Risk Helper | `neonatal-bilirubin-risk-helper` | `/tools/calculators/neonatal-bilirubin-risk-helper` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: neonatal-bilirubin-risk-helper |
| NEWS2 (National Early Warning Score 2) | `news2` | `/tools/calculators/news2` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: news2 |
| NEXUS C-Spine Rule | `nexus-cspine` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| NIH Stroke Scale (NIHSS) | `nihss` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| NIHSS Summary View | `nihss-summary-view` | `/tools/calculators/nihss-summary-view` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: nihss-summary-view |
| Osmolal Gap | `osmolal-gap` | `/tools/calculators/osmolal-gap` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: osmolal-gap |
| Ottawa Ankle Rule | `ottawa-ankle` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| PaO2/FiO2 Ratio | `pao2-fio2-ratio` | `/tools/calculators/pao2-fio2-ratio` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pao2-fio2-ratio |
| PCL-5 (PTSD symptom screen) | `pcl5` | `/tools/calculators/pcl5` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pcl5 |
| PECARN Head Injury Rule | `pecarn-head` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| Pediatric BP Percentile | `pediatric-bp-percentile` | `/tools/calculators/pediatric-bp-percentile` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pediatric-bp-percentile |
| Pediatric Dose Safety Checker | `pediatric-dose-safety-checker` | `/tools/calculators/pediatric-dose-safety-checker` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pediatric-dose-safety-checker |
| Pediatric GCS | `pediatric-gcs` | `/tools/calculators/pediatric-gcs` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pediatric-gcs |
| PERC (PE rule-out criteria) | `perc` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| Pediatric Early Warning Score (PEWS) | `pews` | `/tools/calculators/pews` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pews |
| PHQ-9 (depression screen) | `phq9` | `/tools/calculators/phq9` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: phq9 |
| Pneumonia Severity Index | `pneumonia-severity-index` | `/tools/calculators/pneumonia-severity-index` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pneumonia-severity-index |
| Pregnancy Due Date Calculator | `pregnancy-due-date-calculator` | `/tools/calculators/pregnancy-due-date-calculator` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: pregnancy-due-date-calculator |
| qSOFA (quick SOFA) | `qsofa` | `/tools/calculators/qsofa` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: qsofa |
| Ranson criteria | `ranson-criteria` | `/tools/calculators/ranson-criteria` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: ranson-criteria |
| RASS | `rass` | `/tools/calculators/rass` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: rass |
| Resource Allocation Assistant | `resource-allocation-assistant` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests |  |
| Resource Utilization Index | `resource-utilization-index` | `/tools/calculators/resource-utilization-index` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: resource-utilization-index |
| Revised Trauma Score | `revised-trauma-score` | `/tools/calculators/revised-trauma-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: revised-trauma-score |
| Reynolds Risk Score Helper | `reynolds-risk-score` | `/tools/calculators/reynolds-risk-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: reynolds-risk-score |
| Rockall Score | `rockall-score` | `/tools/calculators/rockall-score` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: rockall-score |
| Rome IV IBS Criteria | `rome-iv-ibs` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| ROX Index | `rox-index` | `/tools/calculators/rox-index` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: rox-index |
| Serum Osmolality | `serum-osmolality` | `/tools/calculators/serum-osmolality` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: serum-osmolality |
| Shock Index | `shock-index` | `/tools/calculators/shock-index` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: shock-index |
| SOFA Score Calculator | `sofa-calculator` | `/tools/calculators/sofa` | Implemented | Implemented executor | Direct calculator route | Calculator | fully wired | Live executor | Inventory/contract tests | Calculator slug: sofa |
| Staffing Ratio Calculator | `staffing-ratio-calculator` | `/tools/calculators/staffing-ratio-calculator` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: staffing-ratio-calculator |
| STOP-Bang (OSA screening) | `stop-bang` | `/tools/calculators/stop-bang` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: stop-bang |
| TIMI risk score (UA/NSTEMI) | `timi-ua-nstemi` | `/tools/calculators/timi-ua-nstemi` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: timi-ua-nstemi |
| Turnaround Time Calculator | `turnaround-time-calculator` | `/tools/calculators/turnaround-time-calculator` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: turnaround-time-calculator |
| Waist-to-Hip Ratio | `waist-hip-ratio` | `/tools/calculators/waist-hip-ratio` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Calculator slug: waist-hip-ratio |
| Wells DVT Score | `wells-dvt-calculator` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| Wells PE Score | `wells-pe` | `/tools/calculators` | Implemented | Chat endpoint only | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | Tier-B: catalog launch seeds dashboard chat; no tool POST |
| BMI | `calc-bmi` | `/tools/calculators/bmi` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | No dedicated clinicalIntentTools row |
| eGFR (CKD-EPI) | `calc-gfr` | `/tools/calculators/gfr` | Implemented | No dedicated backend executor | Direct calculator route | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | No dedicated clinicalIntentTools row |
| All calculators | `calculators` | `/tools/calculators` | Implemented | No dedicated backend executor | Calculator hub/chat-assisted launch | Calculator | frontend-only | Frontend/local or chat-assisted | Inventory/contract tests | No dedicated clinicalIntentTools row |

## 8. Clinical Tools Inventory

### Delivery tiers

| Tier | Count | Meaning | Tools |
|---|---:|---|---|
| ai-system | 12 | AI/platform system tier | AI Artifacts, AI Command Center, AI Cost Optimization, AI Evaluation, AI Gateway, AI Governance, AI Memory, AI Tool Calling, AI Training Pipeline, LLM Security, MoE Router, RAG Evidence Engine |
| C | 65 | Advanced page/dashboard/executor tier | 3D Viewer, AI Explainability, Ambient Clinical Scribe, Arrhythmia Risk Classifier, Behavioral Analytics Dashboard, Cardiac Telemetry Analyzer, Cardiology Command Center, Cirrhosis Monitoring Engine, CKD Progression Predictor, Clinical Audit, Clinical Decision Support Engine, Clinical Documentation Assistant, Clinical Knowledge Graph, Competency Platform, Continuous Glucose Command Center, Credentialing Platform, Crisis Escalation Audit Log, Dialysis Utilization Tracker, Differential Diagnosis Assistant, Drug Checker, ECG Trend Engine, EEG Trend Dashboard, Electrolyte Trend Engine, Endocrine Monitoring System, Endoscopy Workflow Assistant, Fluid Balance Monitor, GI Command Center, GI Surveillance Dashboard, Glucose Telemetry Dashboard, Growth Trend Analytics, Guideline Retrieval + Evidence Engine, Hepatic Trend Analytics, Insulin Trend Engine, Intelligent Order Set Assistant, Lab Interpreter, Laboratory Dashboard, Maternal Monitoring Dashboard, Medical Simulation Suite, Metabolic Analytics, Neonatal Dashboard, Neuro Monitoring Engine, Neuro Telemetry Dashboard, Neurology Timeline AI, Patient Summary AI, Patient Timeline AI, Pediatric Command Center, Perinatal Risk Dashboard, Population Screening Dashboard, Predictive Analytics Dashboard, Psychiatry Monitoring Dashboard, Pulmonary Trend Engine, Remote Cardiology Monitoring Dashboard, Renal Monitoring Dashboard, Research and Evidence Hub, Respiratory Command Center, Respiratory Telemetry Dashboard, Screening Trend Engine, Simulation Competency Dashboard, Simulation Debrief Dashboard, Simulation Outcomes, Simulation Scenario Player, Sleep Apnea Analytics, SOFA Score, Stroke Command Center, Ventilator Monitoring Dashboard |
| clinical-page | 8 | Shared clinical page tier | ABG Interpreter, ACLS Protocol, Antibiotic Guide, ATLS Protocol, Calculator Recommendation AI, Diagnosis Assistant, Procedure Guide, Protocol and Clinical Pathway Library |
| A | 91 | Dedicated calculator/local form tier | A-a Gradient, ABCD² score, Adjusted Body Weight, Anion Gap, APACHE-II, Apgar score, APRI, ASCVD 10-year risk, Asthma Severity Score, AUDIT-C, Bed Occupancy Calculator, BISAP score, Bishop score, BMI, BODE Index, Body Surface Area, Braden scale, BUN/Creatinine Ratio, CAGE, Centor / McIsaac, CHA₂DS₂-VASc, CHADS2, Child-Pugh, CKD staging (KDIGO), Columbia Suicide Severity Workflow, COPD GOLD Assessment, Corrected Calcium, Corrected Sodium, Creatinine Clearance (Cockcroft-Gault), CURB-65, Duke Treadmill Score, eGFR (CKD-EPI), eGFR CKD-EPI 2021, Epworth Sleepiness Scale, FeNa, Fenton Growth Chart Helper, FeUrea, FIB-4, FOUR Score, Framingham CHD risk, Free Water Deficit, GAD-7, Gestational Age Calculator, Glasgow Coma Scale (GCS), Glasgow-Blatchford Score, HAS-BLED, HCM Sudden Death Risk, Heart Failure Staging Helper, HEART score, HOMA-IR, Hunt-Hess Scale, ICH Score, Ideal Body Weight, Kidney Failure Risk Equation, Maddrey Discriminant Function, MDQ, MELD, MELD-Na, MEWS, MMSE, MoCA Placeholder Workflow, Modified Rankin Scale, Morse Fall Scale, Neonatal Bilirubin Risk Helper, NEWS2, NIHSS Summary View, Osmolal Gap, PaO2/FiO2 Ratio, PCL-5, Pediatric BP Percentile, Pediatric Dose Safety Checker, Pediatric GCS, PEWS, PHQ-9, Pneumonia Severity Index, Pregnancy Due Date Calculator, qSOFA (quick SOFA), Ranson criteria, RASS, Resource Utilization Index, Revised Trauma Score, Reynolds Risk Score Helper, Rockall Score, ROX Index, Serum Osmolality, Shock Index, Staffing Ratio Calculator, STOP-Bang, TIMI (UA/NSTEMI), Turnaround Time Calculator, Waist-to-Hip Ratio |
| B | 44 | Chat-assisted specialty/workflow tier | ACS Workflow Assistant, AKI Staging Assistant, Asthma Exacerbation Assistant, Atrial Fibrillation Assistant, Canadian C-Spine Rule, Cognitive Screening Assistant, COPD GOLD, COPD Workflow Assistant, Diabetes Care Assistant, Dialysis Readiness Helper, DKA Pathway Assistant, ECG Interpretation Assistant, Electrolyte Disorder Assistant, GI Bleed Workflow Assistant, GRACE ACS Risk, Headache Red Flag Assistant, Heart Failure Assistant, Liver Disease Assistant, Medication Dose Calculator, Mental Health Screening Assistant, Metabolic Syndrome Assistant, Neonatal Assessment Assistant, Neuro Exam Assistant, NEXUS C-Spine Rule, NIH Stroke Scale (NIHSS), OB Triage Assistant, Ottawa Ankle Rule, Oxygen Escalation Helper, Pancreatitis Workflow Assistant, PECARN Head Injury Rule, Pediatric Sepsis Assistant, PERC, Pregnancy Workflow Assistant, Rome IV IBS, Seizure Assistant, STEMI Pathway Assistant, Stroke Workflow Assistant, Substance Use Screening Assistant, Suicide Risk Workflow Assistant, Thyroid Disorder Assistant, Ventilator Support Assistant, Vertigo HINTS Assistant, Wells DVT, Wells PE |
| hub | 1 | Hub route | All calculators |
| fleet-A | 3 | Fleet direct pages | Fleet Command, Predictive Maintenance Engine, Route Optimization Engine |
| fleet-B | 1 | Fleet chat-assisted | Dispatch Intelligence |
| hospital-ops-B | 3 | Hospital operations chat-assisted | Device Recommendation Assistant, Hospital Command Assistant, Resource Allocation Assistant |
| live-map | 2 | Live map pages | Fleet Live Map, Live Tracking Map |
| medical-iot | 1 | Medical IoT page | Medical IoT Dashboard |
| hospital-ops | 11 | Hospital operations pages | Asset Tracking Dashboard, Capacity Prediction Engine, Device Battery Intelligence, Device Fleet Management, Device Maintenance, Digital Operations Center, Hospital Map, Hospital Operations Cockpit, Hospital Operations Command, Incident Command Center, Telemetry Monitoring Center |

### Fully wired clinical executors

| Name | ID | Route | Backend endpoint | Status | Notes |
|---|---|---|---|---|---|
| Drug Interaction Checker | `drug-interactions` | `/tools/drug-checker` | `/api/tools/drug-interactions/execute` | Fully wired |  |
| Lab Results Interpreter | `lab-interpreter` | `/tools/lab-interpreter` | `/api/tools/lab-interpreter/execute` | Fully wired |  |
| SOFA Score Calculator | `sofa-calculator` | `/tools/calculators/sofa` | `/api/tools/sofa-calculator/execute` | Fully wired | Calculator slug: sofa |

## 9. AI Systems Inventory

| System | ID | Route | Frontend status | Backend status | Launch behavior | Demo/live status | Notes |
|---|---|---|---|---|---|---|---|
| AI Artifacts | `ai-artifacts` | `/artifacts` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Command Center | `ai-command-center` | `/ai-command-center` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Cost Optimization | `ai-cost-optimization` | `/costs` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Evaluation | `ai-evaluation` | `/ai/evaluation` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Gateway | `ai-gateway` | `/assistant` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Governance | `ai-governance` | `/ai-governance` | Implemented/visible | /api/ai-governance/summary | Assistant/page API | Live API |  |
| AI Memory | `ai-memory` | `/ai-memory` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| RAG Evidence Engine | `ai-rag` | `/tools/guideline-rag` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| LLM Security | `ai-security` | `/security` | Implemented/visible | /api/security/summary | Assistant/page API | Live API |  |
| AI Tool Calling | `ai-tool-calling` | `/assistant` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| AI Training Pipeline | `ai-training` | `/training` | Implemented/visible | /api/chat/message | Assistant/page API | Live API |  |
| Differential Diagnosis Assistant | `differential-ai` | `/tools/differential-ai` | Implemented/visible | /api/clinical-intelligence/differential-ai/generate | Assistant/page API | Live API |  |
| AI Explainability | `ai-explainability` | `/tools/ai-explainability` | Implemented/visible | /api/clinical-intelligence/ai-explainability/trace | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Ambient Clinical Scribe | `ambient-scribe` | `/tools/ambient-scribe` | Implemented/visible | /api/clinical-intelligence/ambient-scribe/generate | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Clinical Audit | `clinical-audit` | `/tools/clinical-audit` | Implemented/visible | /api/clinical-intelligence/clinical-audit/execution-logs | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Guideline Retrieval + Evidence Engine | `guideline-rag` | `/tools/guideline-rag` | Implemented/visible | /api/clinical-intelligence/guideline-rag/query | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Intelligent Order Set Assistant | `order-set-ai` | `/tools/order-set-ai` | Implemented/visible | /api/clinical-intelligence/order-set-ai/generate | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Patient Summary AI | `patient-summary-ai` | `/tools/patient-summary-ai` | Implemented/visible | /api/clinical-intelligence/patient-summary-ai/generate | Assistant/page API | Live API | No dedicated clinicalIntentTools row |
| Patient Timeline AI | `timeline-ai` | `/tools/timeline-ai` | Implemented/visible | /api/clinical-intelligence/timeline-ai/generate | Assistant/page API | Live API | No dedicated clinicalIntentTools row |

## 10. RAG Strategy

- Current implementation: `RAGService` orchestrates document chunking, embeddings, Pinecone vector upsert/query, retrieval, reranking, clinical context building, citation extraction, retrieval cache invalidation, and corpus versioning. `GuidelineRag` exposes a user-facing route at `/tools/guideline-rag` and Clinical Intelligence exposes `POST /api/clinical-intelligence/guideline-rag/query`.
- Status: partially implemented/live when RAG config, OpenAI embeddings, Pinecone, and corpus ingestion are configured; otherwise it should be treated as a controlled backend capability, not a complete evidence product.
- Strategy: maintain source provenance, references, confidence, top-K/min-score controls, chunk size/overlap config, reranking, and explicit unsupported-claim handling. Retrieval should be scoped by specialty, organization, document type, patient consent, and release-gated corpus version.

## 11. Mixture-of-Experts Strategy

- Current implementation: `moe-router` and AI foundation routing descriptors select expert classes; ChatService also wires `MoERouterService`.
- Strategy: route low-risk/general/admin tasks to cheaper experts; route high-risk clinical prompts to clinical reasoning/RAG/governed experts; route operations prompts to fleet/IoT/platform experts; require confidence thresholds, fallbacks, evaluation logs, and escalation to human review for unsafe/uncertain outputs.
- Status: backend services/tests exist, but production behavior depends on model/provider configuration and complete policy/evaluation integration.

## 12. Tool Calling Strategy

- Current implementation: backend `ToolCallingModule` provides resolver, parameter collector, validation, execution service, and controller. The execution service can classify prompts, resolve supported tool definitions, collect missing parameters, validate, call orchestrator/services, and return launch/action cards.
- Strategy: keep assistant-first launch for all tools, but distinguish **open UI**, **local calculator**, **backend execute**, and **needs parameters** states. Only tool calls with validated parameters, permissions, audit context, and supported executor definitions should execute backend actions.
- Current gap: most clinical inventory rows are frontend-only or chat-assisted; only three clinical POST executors are fully wired in the orchestrator.

## 13. Artifact Knowledge Strategy

- Current implementation: artifacts backend module, entities, version tables, seed/asset registry, API service, and `/artifacts` page exist.
- Strategy: make artifacts the curated knowledge substrate for guidelines, policies, playbooks, calculators, workflows, simulation assets, operational SOPs, and AI-generated drafts. Tie every artifact to owner, version, source provenance, approval state, audit logs, citations, and retirement status.

## 14. AI Memory Strategy

- Current implementation: backend memory module supports short, long, and clinical memory entries plus `/memory` and `/ai-memory` dashboards/API client.
- Strategy: use short memory for conversation state, long memory for user/org preferences, and clinical memory only with strict consent, PHI minimization, retention windows, access logs, and explicit separation from model training.

## 15. Cost Optimization Strategy

- Current implementation: `CostTrackingContext`, cost dashboard, backend cost optimizer/routing optimizer, AI cost registry row, and docs around algorithmic cost optimization exist.
- Strategy: select lowest-cost safe model/expert by task risk, cache deterministic tool results and retrieval hits, batch embeddings, cap context windows, summarize long histories, route calculators locally, and track token/spend budgets by workspace/user/capability.

## 16. Algorithmic Optimization Strategy

- Current implementation includes benchmark/test artifacts for algorithmic lookup, catalog search/sort, capability discovery, inventory matrices, and caching services.
- Strategy: maintain O(1) maps for ID/route/tool lookup; O(log n) sorted indexes for search facets; O(n log n) initial indexing when rebuilding catalog/search graphs; cache normalized route/capability matrices; invalidate by registry hash/version rather than scanning at runtime.

## 17. User Profile + Segmentation

- Current implementation: `profileToolSegmentation.js`, `ToolPreferencesContext`, profile tool preferences page, profile graph card, workspace context, and profile-aware assistant suggestions.
- Segmentation dimensions include role, specialty, department, workspace, permission level, preferred/recent/pinned/hidden tools, clinical/operations access, training level, and organization type.
- Status: implemented in frontend/local persistence and backend profile/workspaces APIs; production deployment needs durable preference persistence, org policy mapping, and RBAC enforcement consistency.

## 18. Dashboard + Command Center

- Implemented routes include `/dashboard`, `/assistant`, `/ai-command-center`, `/analytics`, `/costs`, `/self-diagnostics`, `/system-health`, `/operations-center`, `/digital-twin`, and workspace pages.
- The strategy is to keep the AI chatbot central while command cards surface high-value routes, recommended tools, cost/quality signals, alerts, profile segmentation, and operational snapshots.

## 19. Hospital Map + IoT + Fleet

| Capability | Route | Frontend status | Backend status | Demo/live | Notes |
|---|---|---|---|---|---|
| Dispatch Intelligence Assistant | `/tools/calculators` | Implemented | /api/chat/message | Demo/live hybrid | Tier-B: catalog launch seeds dashboard chat; no tool POST; NLU backendExecutable flag (chat routing only) |
| Fleet Command Dashboard | `/fleet/command` | Implemented | Demo/static or module-backed | Demo/live hybrid |  |
| Predictive Maintenance Assistant | `/fleet/predictive-maintenance` | Implemented | Demo/static or module-backed | Demo/live hybrid |  |
| Route Optimization Assistant | `/fleet/route-optimizer` | Implemented | Demo/static or module-backed | Demo/live hybrid |  |
| Asset Tracking Dashboard | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Capacity Prediction Engine | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Device Battery Intelligence | `/medical-iot` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Device Fleet Management | `/devices` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Device Maintenance | `/devices` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Fleet Live Map | `/fleet/map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Hospital Map | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Hospital Operations Cockpit | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Hospital Operations Command | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Incident Command Center | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Live Tracking Map | `/live-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Medical IoT Dashboard | `/medical-iot` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
| Telemetry Monitoring Center | `/hospital-map` | Implemented | Demo/static or module-backed | Demo/live hybrid | No dedicated clinicalIntentTools row |
- Strategy: integrate RTLS, telemetry broker, CMMS/device registry, bed/room/floor master data, vehicle GPS, dispatch, alerting, maintenance, and audit logs behind normalized `/api/hospital-map`, `/api/telemetry`, `/api/fleet`, and `/api/live-tracking` contracts.

## 20. Simulation + Laboratory + 3D Viewer

| Capability | Route | Frontend status | Backend status | Demo/live | Notes |
|---|---|---|---|---|---|
| Medical Simulation Suite | `/simulation`, `/simulation/:scenarioId` | Implemented | Simulation module/services | Demo/training | Needs validated curriculum and competency governance. |
| Simulation Outcomes | `/simulation/outcomes` | Implemented | Simulation outcome/debrief services | Demo/training | Use for debrief and credentialing only after validation. |
| Laboratory Dashboard | `/laboratory` | Implemented demo | No dedicated LIS production backend | Demo-only | Connect LIS/FHIR Observation/analyzer feeds. |
| 3D Viewer | `/3d-viewer` | Implemented placeholder | No 3D/DICOM backend | Demo-only | No Three.js/DICOM assets loaded; not diagnostic. |

## 21. Governance + Security + Audit

- Implemented modules include auth, authorization guards/permissions, audit, compliance, platform governance, governance, LLM security, privacy center, regulatory, equity, human review, EHR audit, encryption, environment validation, Sentry/Datadog/Prometheus config, and hash-chain/encryption migrations.
- Strategy: all high-risk AI and PHI workflows require RBAC, consent scope, immutable audit, source provenance, explainability trace, policy gate, human review option, privacy request handling, and release-gate validation.

## 22. Frontend Architecture

- React/Vite SPA with `BrowserRouter`, lazy-loaded pages, provider stack (theme, user, notifications, workspace, cost, system config, offline, tool preferences, identity, conversation), `AppShell`, public/auth shells, mobile/responsive CSS, route aliases, calculator generated routes, and inventory-driven tests.
- Key counts: 193 explicit `App.jsx` route entries, 92 calculator route definitions, 255 known tool-area paths, 242 registry tools.

## 23. Backend Architecture

- NestJS backend with global `/api` prefix, ConfigModule/env validation, TypeORM Postgres/SQLite, throttling, Swagger, security modules, RAG, AI, chat, medical control plane, telemetry/fleet/hospital-map, platform systems, governance, artifacts, memory, training, evaluation, cost optimizer, notifications, observability, metrics, and migrations.
- Canonical backend inventory currently lists 253 HTTP routes. Top controllers: PlatformSystemsController (75), PlatformGovernanceController (15), AuthController (13), ToolOrchestratorController (9), NotificationController (9), UserProfileController (8), MemoryController (7), SimulationController (7), ArtifactsController (6), TrainingController (6).

## 24. Route Map

### Major frontend route groups

- `('/', '/auth', '/dashboard', '/assistant', '/workspace/:workspaceId', '/tools', '/tools/catalog', '/tools/calculators/:slug', '/clinical/alerts', '/hospital-map', '/medical-iot', '/live-map', '/fleet/map', '/devices', '/simulation', '/laboratory', '/3d-viewer', '/artifacts', '/memory', '/training', '/ai/evaluation', '/ai-command-center', '/profile', '/settings', '/audit', '/governance/*')`

### Canonical backend route families

- `/health`, `/api/config/system`, `/api/auth/*`, `/api/users/*`, `/api/profile/*`, `/api/workspaces/*`, `/api/chat/*`, `/api/tools/*`, `/api/clinical-intelligence/*`, `/api/rag/*`, `/api/artifacts/*`, `/api/memory/*`, `/api/tool-calling/*`, `/api/training/*`, `/api/evaluation/*`, `/api/platform-governance/*`, `/api/platform-systems/*`, `/api/hospital-map/*`, `/api/telemetry/*`, `/api/fleet/*`, `/api/live-tracking/*`, `/api/simulation/*`, `/api/notifications/*`, `/api/audit/*`, `/api/compliance/*`, `/api/metrics/*`, `/api/system-health`.

## 25. Navigation Map

- Primary navigation is centralized through `src/config/navigation.config.js` and re-exported by `src/navigation/primaryNavigation.js`.
- Route aliases normalize auth (`/login`, `/signup`, etc.), assistant (`/chat`, `/ai`, `/copilot`), tools (`/all-tools`, `/clinical-tools`, `/catalog`), calculators (`/calculators`), simulation (`/medical-simulation`), lab (`/lab`), 3D viewer (`/anatomy-viewer`), live maps (`/maps`, `/tracking`, `/live-tracking`), fleet map (`/fleet`, `/fleet/live-map`, `/fleet/tracking`), and audit (`/audit-logs`).
- Navigation simplification strategy: keep dashboard/assistant/tools/maps/profile/governance as top-level concepts and hide long-tail capabilities behind profile-aware recommendations, quick command, catalog search, and assistant launches.

## 26. Backend/Frontend Contract Summary

| Status | Count | Meaning |
|---|---:|---|
| fully wired | 4 | UI/API contract is present and executable where applicable. |
| frontend-only | 240 | Client route/form/chat launch exists without dedicated backend executor. |
| backend-only | 0 | Backend API without dedicated UI. |
| broken | 0 | Known mismatch or misleading wiring. |
| planned | 8 | Phantom/roadmap capability without production surface. |

## 27. Design System + Theme Strategy

- Implemented design assets include theme tokens, theme surfaces, legacy bridge, layout breakpoints, mobile-first/responsive styles, compact UI components, AppShell/PageContainer, common UI components, charts, banners, cards, drawers, modals, and theme context/tests.
- Strategy: continue token-first theming, reduce duplicate CSS, keep clinical safety colors separate from decorative colors, preserve mobile-first density, and avoid page-specific divergence by using shared page headers/cards/panels.

## 28. Testing Strategy

- Frontend: Vitest/Testing Library tests cover route smoke, responsive regressions, calculators, tool contracts, visibility matrices, profile segmentation, services, contexts, dashboards, navigation, and build budget. Playwright configs exist for responsive, Android, and production smoke checks.
- Backend: Jest specs cover app module, auth, SOFA, AI foundation, chat/tool unsupported paths, clinical alerts, telemetry/fleet/hospital-map services, platform governance, RAG pieces, memory, subscriptions, training, evaluation, and more.
- Strategy: keep inventory/matrix tests as release gates, add backend/frontend contract tests for every new endpoint, add e2e smoke for critical user journeys, and require clinical validation fixtures for new calculators/tools.

## 29. Deployment/Vercel Strategy

- Frontend build uses Vite with asset validation and Vercel environment validation script. Backend is NestJS and may be deployed separately; Vite dev proxy forwards `/api`, `/health`, and `/socket.io` to backend target.
- Strategy: separate frontend static deployment from backend API health, expose `/health` and `/api/config/system`, validate Vercel env vars, avoid importing missing 3D/assets, keep demo fallbacks explicit, and run production smoke Playwright checks after deploy.

## 30. Known Gaps

- Most clinical tools are frontend-only/chat-assisted rather than backend-executable.
- Backend/frontend contract docs can become stale if not regenerated; current source-derived count is 252 contract rows, while older docs may show lower counts.
- Hospital map/IoT/fleet surfaces need production data feeds, not demo snapshots.
- 3D viewer and lab dashboard are placeholders/demo views.
- Tool ID aliases, NLU IDs, registry IDs, route IDs, and cost/offline category IDs remain fragmented in places.
- Clinical Intelligence outputs need production-grade corpus validation, policy gates, source-review workflows, and real patient data connectors before clinical use.
- Vitals monitor has a backend chat endpoint reference but no dedicated tool page.

## 31. Duplicate/Fragmented Areas

- Multiple AI gateway concepts exist: `backend/src/modules/ai/foundation/*` and `backend/src/modules/ai-gateway/*`.
- Clinical tool IDs appear across `toolRegistry`, `clinicalIntentToolCatalog`, `clinicalToolIdContract`, `clinicalToolRoutes`, catalog wiring, backend orchestrator IDs, aliases, and cost/offline labels.
- Route definitions are split between `App.jsx`, `routes.config.js`, calculator generated routes, navigation config, and route health inventories.
- Hospital operations map concepts overlap across `/hospital-map`, `/medical-iot`, `/devices`, `/live-map`, `/fleet/map`, `/fleet/command`, and digital twin/operations pages.
- Governance surfaces overlap `/ai-governance`, `/governance/*`, `/security`, `/regulatory`, `/equity`, `/human-review`, `/privacy`, `/audit/*`, and platform governance APIs.

## 32. Next Priority Fixes

1. Regenerate/update contract docs after source changes (`npm run contract:write-docs`, `npm run tool-matrix:write-docs`, `npm run visibility-matrix:write-docs`).
2. Create a single canonical tool capability schema used by registry, NLU, routes, backend executor mapping, visibility matrix, and profile segmentation.
3. Mark demo-only routes visibly in UI and API responses for map/IoT/fleet/lab/3D where real feeds are absent.
4. Normalize AI gateway duplication and document which backend gateway is canonical.
5. Add backend executors or explicit “open/chat-only” statuses for high-value emergency/cardiology calculators.
6. Add health/contract checks for Vercel frontend-to-backend API availability.

## 33. Next Priority Features

1. Backend-executable emergency/critical-care bundle: qSOFA, NEWS2, GCS, HEART, PERC, Wells PE, NIHSS, APACHE-II, MEWS, PEWS, ROX, PaO2/FiO2.
2. Production RAG corpus management: artifact-backed ingestion, approvals, citations, version pinning, specialty filters, and retrieval evals.
3. Assistant tool calling for calculators with parameter collection and structured result cards.
4. Production hospital operations connector pack: RTLS, telemetry broker, CMMS, bed board, fleet GPS, and alert webhooks.
5. Simulation/lab/3D asset pipeline with validated content, safe placeholders, and deployment-safe imports.

## 34. Final Roadmap

| Phase | Focus | Outcomes |
|---|---|---|
| Phase 1 | Source-of-truth normalization | Canonical tool schema, regenerated docs, route/nav consolidation, demo labeling. |
| Phase 2 | Clinical execution hardening | Backend executors for priority calculators, tool-calling parameter collection, audit and safety gates. |
| Phase 3 | Evidence and memory | Artifact-backed RAG corpus, memory governance, citation/evaluation dashboards. |
| Phase 4 | Operations productionization | Real hospital map, Medical IoT, live tracking, device fleet, maintenance, and alert integrations. |
| Phase 5 | Training/simulation expansion | Validated simulation suite, lab integration, 3D/DICOM viewer asset service, competency workflows. |
| Phase 6 | Enterprise governance | Release gates, privacy center, regulatory/equity/human-review workflows, cost optimization, deployment health. |

## Final Single Source of Truth Capability Table

| Capability | ID/count | Routes | Frontend status | Backend status | Launch behavior | Category | User-facing status | Demo/live | Tests status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Unified tool inventory | 242 registry / 291 catalog | `/tools`, `/tools/catalog` | Implemented | Contract/inventory data only | Catalog/search/quick command | Platform | Implemented | Live inventory | Matrix tests | Must remain canonical. |
| Medical calculators | 92 forms | `/tools/calculators`, `/tools/calculators/:slug` | Implemented | Mostly frontend-only; SOFA backend-executable | Direct forms/hub/chat | Calculator | Implemented/partial | Local/live hybrid | Calculator tests | 92 calculator routes. |
| Drug checker | drug-interactions | `/tools/drug-checker` | Implemented | Fully wired | Direct API execute | Diagnostic | Implemented | Live contract | Backend/frontend tests | One of three clinical executors. |
| Lab interpreter | lab-interpreter | `/tools/lab-interpreter` | Implemented | Fully wired | Direct API execute | Diagnostic/Lab | Implemented | Live contract | Backend/frontend tests | Also used by ABG/lab profiles. |
| Emergency/critical care tools | qSOFA, NEWS2, GCS, SOFA, APACHE-II, etc. | Calculator routes | Implemented forms | Only SOFA backend-executable | Direct/calculator hub | Emergency/Critical care | Partial | Frontend/local mostly | Calculator tests | Priority backend-executor bundle. |
| AI assistant/chat | assistant/chat | `/assistant`, `/chat` alias | Implemented | Chat, AI, gateway, RAG, MoE, memory wired | Chat-centered | AI | Implemented/partial | Live if configured | Chat tests | Central launch surface. |
| RAG evidence engine | ai-rag/guideline-rag | `/tools/guideline-rag` | Implemented | RAG + clinical-intelligence endpoints | Query + citations | AI/RAG | Partial | Config-dependent | RAG specs | Needs corpus governance. |
| MoE router | moe-router | `/assistant` | Indirect UI | Backend module/services | Expert selection | AI routing | Partial | Config-dependent | MoE specs | Needs policy/eval hardening. |
| AI gateway | ai-gateway | `/assistant` | Indirect UI | Gateway modules/services | Run envelope/context/response | AI platform | Partial | Config-dependent | Gateway specs | Duplicate gateway concepts need normalization. |
| Tool calling | ai-tool-calling | `/assistant` | Indirect/cards | Tool-calling module/services | Resolve/collect/validate/execute | AI platform | Partial | Live for supported definitions | Tool-calling specs | Expand executors. |
| Artifacts | ai-artifacts | `/artifacts` | Implemented | Backend module/migrations | Artifact graph/API | Knowledge | Implemented | Live contract | Artifacts specs | Knowledge substrate. |
| AI memory | ai-memory | `/memory`, `/ai-memory` | Implemented | Backend memory module/migration | Dashboard/API | AI memory | Implemented/partial | Live contract | Memory specs | Requires PHI governance. |
| Profile segmentation | profile graph | `/profile/tool-preferences`, `/tools` | Implemented | Profile/workspace APIs | Recommended tools | Personalization | Implemented/partial | Local/API hybrid | Segmentation tests | Needs durable org policy mapping. |
| Command dashboard | dashboard | `/dashboard`, `/ai-command-center` | Implemented | Analytics/eval/cost APIs | Cards/quick launch | Dashboard | Implemented | Live/demo hybrid | Page tests | Chat-centered layout strategy. |
| Hospital map | hospital-map | `/hospital-map` | Implemented | Demo backend modules | Map dashboard | Operations | Demo/partial | Demo-only until feeds | Page/service specs | Real feeds required. |
| Medical IoT | medical-iot-dashboard | `/medical-iot`, `/devices` | Implemented | Telemetry/device registry demo | Device dashboard | IoT | Demo/partial | Demo/live hybrid | Service/page specs | Real telemetry broker required. |
| Live tracking maps | live-tracking-map/fleet-live-map | `/live-map`, `/fleet/map` | Implemented | LiveTracking/Fleet services | Map view | Operations/Fleet | Demo/partial | Demo/live hybrid | Service/page specs | Real RTLS/GPS required. |
| Device fleet management | device-fleet-management | `/devices`, `/fleet/command` | Implemented | Fleet/telemetry services | Fleet dashboard | Fleet/Ops | Partial | Demo/live hybrid | Fleet specs | Maintenance/asset feeds required. |
| Medical simulation suite | simulation | `/simulation` | Implemented | Simulation module | Scenario/training routes | Education | Demo/partial | Demo/training | Simulation tests | Needs validated curriculum. |
| Laboratory module | laboratory | `/laboratory` | Demo page | No production LIS backend | Dashboard | Laboratory | Demo-only | Demo | Route tests | Needs LIS/FHIR integration. |
| 3D viewer | 3d-viewer | `/3d-viewer` | Placeholder | No imaging backend | Placeholder canvas | Visualization | Demo-only | Demo | Page tests | No GLB/GLTF/DICOM assets. |
| Governance/security/privacy/audit | governance/audit | `/governance/*`, `/audit`, `/security`, `/privacy` | Implemented | Multiple backend modules | Protected dashboards/APIs | Governance | Implemented/partial | Live/demo hybrid | Service/page specs | Requires release-gate operations. |
| Design language/theme | theme system | global | Implemented | N/A | Theme tokens/components | UX | Implemented | Live | Style tests | Continue token consolidation. |
| Route normalization/navigation simplification | routes/nav | aliases + nav config | Implemented/partial | N/A | Redirect aliases/quick command | Architecture | Partial | Live | Route/nav tests | Continue consolidation. |
| Deployment/Vercel health | deployment | `/health`, `/api/config/system` | Frontend build scripts | Backend health/config | Build/health checks | Deployment | Partial | Env-dependent | Build/env tests | Separate frontend/backend health. |
| Backend/frontend contract matrix | 252 rows | docs/matrix | Implemented data/docs | Implemented route inventory | Release gate | Architecture | Implemented | Live source-derived | Contract tests | Regenerate often. |

## Inspection Sources

Primary inspected sources included:

- `README.md`
- `package.json`
- `backend/package.json`
- `src/App.jsx`
- `src/data/platformInventory.js`
- `src/data/toolRegistry.js`
- `src/data/toolContractMatrix.js`
- `src/data/backendHttpRouteInventory.js`
- `src/routes/clinicalToolRoutes.js`
- `src/config/routes.config.js`
- `src/config/navigation.config.js`
- `backend/src/app.module.ts`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/rag/rag.service.ts`
- `backend/src/modules/tool-calling/tool-execution.service.ts`
- `src/services/hospitalMapService.js`
- `docs/backend-frontend-tool-contract.md`
- `docs/tool-render-execute-matrix.md`
- `docs/platform-capability-matrix.md`
- `docs/application-architecture-map.md`
- `docs/user-profile-tool-segmentation.md`
- `docs/algorithmic-cost-optimization-plan.md`
- `docs/moe-routing-system.md`
- `docs/ai-foundation-architecture.md`

Also inspected markdown inventory surface: **95 markdown files** including `docs/**/*.md`, `README.md`, and generated/audit reports.
