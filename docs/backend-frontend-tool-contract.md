# Backend ↔ frontend tool contract matrix

Generated: 2026-05-20T20:48:44.985Z

> **Source:** `src/data/backendFrontendToolContract.js` — regenerate with `npm run contract:write-docs`.
> **Related:** [clinical-tool-executors.md](./clinical-tool-executors.md), [e2e-tool-validation-matrix.md](./e2e-tool-validation-matrix.md).

## Summary

| Metric | Value |
|--------|------:|
| NLU profiles (`clinicalIntentTools`) | 54 |
| NLU contract ids (`NLU_PROFILE_TOOL_IDS`) | 54 |
| Sidebar registry tools | 57 |
| POST executors (`registerTool`) | 3 |
| Matrix rows (incl. phantom + platform) | 68 |

### Status distribution

- **frontend-only**: 55
- **fully wired**: 4
- **planned**: 9

## Status definitions

| Status | Meaning |
|--------|---------|
| **fully wired** | Shipped UI route/component, catalog + NLU + patterns; POST executor present only when `Backend executor = yes`. |
| **frontend-only** | Client form and/or chat launch; no `registerTool()` POST executor. |
| **backend-only** | Executor or API without a dedicated UI (none today for clinical tools). |
| **broken** | Client calls missing API, or misleading executor flags documented in code. |
| **planned** | Phantom / roadmap ids (recommendations, cost tracking) — no production surface. |

## POST executor reference

Only these NLU ids have `registerTool()` in `tool-orchestrator.service.ts`:

- `sofa-calculator` → POST /api/tools/sofa-calculator/execute
- `drug-interactions` → POST /api/tools/drug-interactions/execute
- `lab-interpreter` → POST /api/tools/lab-interpreter/execute

Chat NLU for other tools: `chat.service.ts` → `handleClinicalTool` → `NotFoundException` → general AI fallback (no structured executor).

## Full contract matrix

<!-- markdownlint-disable MD013 -->
| Canonical ID | Display name | Frontend route | Frontend component | Registry entry | Catalog entry | Discovery entry | NLU profile | Backend intent pattern | Orchestrator tool ID | Backend executor | API endpoint | Request DTO | Response DTO | Frontend API client | Test coverage | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abcd2 | ABCD² score | /tools/calculators/abcd2 | src/pages/tools/Calculators.jsx | abcd2 | yes | yes | abcd2 | tool.patterns.ts → abcd2 | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| abg-interpreter | ABG Interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.jsx | abg-interpreter | yes | yes | abg-interpreter | tool.patterns.ts → abg-interpreter | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| acls-protocol | ACLS Protocol | /tools/protocols | src/pages/tools/Protocols.jsx | acls-protocol | yes | yes | acls-protocol | tool.patterns.ts → acls-protocol | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| antibiotic-guide | Antibiotic Selection Guide | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.jsx | antibiotic-guide | yes | yes | antibiotic-guide | tool.patterns.ts → antibiotic-guide | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| apache2-calculator | APACHE-II Score | /tools/calculators | src/pages/tools/Calculators.jsx | apache2-calculator | yes | yes | apache2-calculator | tool.patterns.ts → apache2-calculator | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| apgar-score | Apgar score | /tools/calculators/apgar-score | src/pages/tools/Calculators.jsx | apgar-score | yes | yes | apgar-score | tool.patterns.ts → apgar-score | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| ascvd-risk | ASCVD 10-year risk (PCE) | /tools/calculators/ascvd-risk | src/pages/tools/Calculators.jsx | ascvd-risk | yes | yes | ascvd-risk | tool.patterns.ts → ascvd-risk | — | no | — | — | — | — | 13 files (ascvdPceCalculator.test.js, ascvdRiskWiring.test.js, …) | frontend-only |
| atls-protocol | ATLS Protocol | /tools/protocols | src/pages/tools/Protocols.jsx | atls-protocol | yes | yes | atls-protocol | tool.patterns.ts → atls-protocol | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| audit-c | AUDIT-C (alcohol screen) | /tools/calculators/audit-c | src/pages/tools/Calculators.jsx | audit-c | yes | yes | audit-c | tool.patterns.ts → audit-c | — | no | — | — | — | — | 13 files (auditCCalculator.test.js, auditCWiring.test.js, …) | frontend-only |
| bisap-score | BISAP score | /tools/calculators/bisap-score | src/pages/tools/Calculators.jsx | bisap-score | yes | yes | bisap-score | tool.patterns.ts → bisap-score | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| bishop-score | Bishop score | /tools/calculators/bishop-score | src/pages/tools/Calculators.jsx | bishop-score | yes | yes | bishop-score | tool.patterns.ts → bishop-score | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| braden-scale | Braden scale | /tools/calculators/braden-scale | src/pages/tools/Calculators.jsx | braden-scale | yes | yes | braden-scale | tool.patterns.ts → braden-scale | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| canadian-c-spine | Canadian C-Spine Rule | /tools/calculators | src/pages/tools/Calculators.jsx | canadian-c-spine | yes | yes | canadian-c-spine | tool.patterns.ts → canadian-c-spine | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 12 files (canadianCSpineWiring.test.js, clinicalCatalogLaunch.test.js, …) | frontend-only |
| centor-mcisaac | Centor / McIsaac score | /tools/calculators/centor-mcisaac | src/pages/tools/Calculators.jsx | centor-mcisaac | yes | yes | centor-mcisaac | tool.patterns.ts → centor-mcisaac | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| cha2ds2vasc-calculator | CHA2DS2-VASc Score | /tools/calculator/chads2vasc | src/pages/tools/Calculators.jsx | calc-chads2vasc | yes | yes | cha2ds2vasc-calculator | tool.patterns.ts → cha2ds2vasc-calculator | — | no | — | — | — | — | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| child-pugh | Child-Pugh score | /tools/calculators/child-pugh | src/pages/tools/Calculators.jsx | child-pugh | yes | yes | child-pugh | tool.patterns.ts → child-pugh | — | no | — | — | — | — | 6 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| ckd-staging | CKD staging (KDIGO) | /tools/calculators/ckd-staging | src/pages/tools/Calculators.jsx | ckd-staging | yes | yes | ckd-staging | tool.patterns.ts → ckd-staging | — | no | — | — | — | — | 13 files (ckdStagingCalculator.test.js, ckdStagingWiring.test.js, …) | frontend-only |
| copd-gold | COPD GOLD Assessment | /tools/calculators | src/pages/tools/Calculators.jsx | copd-gold | yes | yes | copd-gold | tool.patterns.ts → copd-gold | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 9 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| curb65-calculator | CURB-65 Score | /tools/calculators | src/pages/tools/Calculators.jsx | curb65-calculator | yes | yes | curb65-calculator | tool.patterns.ts → curb65-calculator | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| differential-diagnosis | Differential Diagnosis Generator | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.jsx | diagnosis | yes | yes | differential-diagnosis | tool.patterns.ts → differential-diagnosis | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| dispatch-ai | Dispatch Intelligence Assistant | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | dispatch-ai | yes | yes | dispatch-ai | tool.patterns.ts → dispatch-ai | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| dose-calculator | Medication Dose Calculator | /tools/calculators | src/pages/tools/Calculators.jsx | dose-calculator | yes | yes | dose-calculator | tool.patterns.ts → dose-calculator | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| drug-interactions | Drug Interaction Checker | /tools/drug-checker | src/pages/tools/DrugChecker.jsx | drug-check | yes | yes | drug-interactions | tool.patterns.ts → drug-interactions | drug-interactions | yes | /api/tools/drug-interactions/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) | ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.js | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | fully wired |
| fib4 | FIB-4 index | /tools/calculators/fib4 | src/pages/tools/Calculators.jsx | fib4 | yes | yes | fib4 | tool.patterns.ts → fib4 | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| fleet-command | Fleet Command Dashboard | /fleet/command | src/pages/fleet/FleetDashboard.jsx | fleet-command | yes | yes | fleet-command | tool.patterns.ts → fleet-command | — | no | — | — | — | src/services/fleetTelemetryService.js | 6 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| framingham-risk | Framingham 10-year CHD risk | /tools/calculators/framingham-risk | src/pages/tools/Calculators.jsx | framingham-risk | yes | yes | framingham-risk | tool.patterns.ts → framingham-risk | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| gad7 | GAD-7 (anxiety screen) | /tools/calculators/gad7 | src/pages/tools/Calculators.jsx | gad7 | yes | yes | gad7 | tool.patterns.ts → gad7 | — | no | — | — | — | — | 10 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| gcs-calculator | Glasgow Coma Scale | /tools/calculators | src/pages/tools/Calculators.jsx | gcs-calculator | yes | yes | gcs-calculator | tool.patterns.ts → gcs-calculator | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| grace-acs | GRACE ACS Risk | /tools/calculators | src/pages/tools/Calculators.jsx | grace-acs | yes | yes | grace-acs | tool.patterns.ts → grace-acs | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 12 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| has-bled | HAS-BLED score | /tools/calculators/has-bled | src/pages/tools/Calculators.jsx | has-bled | yes | yes | has-bled | tool.patterns.ts → has-bled | — | no | — | — | — | — | 6 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| heart-score | HEART score | /tools/calculators/heart-score | src/pages/tools/Calculators.jsx | heart-score | yes | yes | heart-score | tool.patterns.ts → heart-score | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| lab-interpreter | Lab Results Interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.jsx | lab-interp | yes | yes | lab-interpreter | tool.patterns.ts → lab-interpreter | lab-interpreter | yes | /api/tools/lab-interpreter/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) | ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.js | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | fully wired |
| meld | MELD score | /tools/calculators/meld | src/pages/tools/Calculators.jsx | meld | yes | yes | meld | tool.patterns.ts → meld | — | no | — | — | — | — | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| meld-na | MELD-Na score | /tools/calculators/meld-na | src/pages/tools/Calculators.jsx | meld-na | yes | yes | meld-na | tool.patterns.ts → meld-na | — | no | — | — | — | — | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| morse-fall-scale | Morse Fall Scale | /tools/calculators/morse-fall-scale | src/pages/tools/Calculators.jsx | morse-fall-scale | yes | yes | morse-fall-scale | tool.patterns.ts → morse-fall-scale | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| news2 | NEWS2 (National Early Warning Score 2) | /tools/calculators/news2 | src/pages/tools/Calculators.jsx | news2 | yes | yes | news2 | tool.patterns.ts → news2 | — | no | — | — | — | — | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| nexus-cspine | NEXUS C-Spine Rule | /tools/calculators | src/pages/tools/Calculators.jsx | nexus-cspine | yes | yes | nexus-cspine | tool.patterns.ts → nexus-cspine | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| nihss | NIH Stroke Scale (NIHSS) | /tools/calculators | src/pages/tools/Calculators.jsx | nihss | yes | yes | nihss | tool.patterns.ts → nihss | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 12 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| ottawa-ankle | Ottawa Ankle Rule | /tools/calculators | src/pages/tools/Calculators.jsx | ottawa-ankle | yes | yes | ottawa-ankle | tool.patterns.ts → ottawa-ankle | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 12 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| pecarn-head | PECARN Head Injury Rule | /tools/calculators | src/pages/tools/Calculators.jsx | pecarn-head | yes | yes | pecarn-head | tool.patterns.ts → pecarn-head | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| perc | PERC (PE rule-out criteria) | /tools/calculators | src/pages/tools/Calculators.jsx | perc | yes | yes | perc | tool.patterns.ts → perc | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 8 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| phq9 | PHQ-9 (depression screen) | /tools/calculators/phq9 | src/pages/tools/Calculators.jsx | phq9 | yes | yes | phq9 | tool.patterns.ts → phq9 | — | no | — | — | — | — | 10 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| predictive-maintenance | Predictive Maintenance Assistant | /fleet/predictive-maintenance | src/pages/fleet/PredictiveMaintenance.jsx | predictive-maintenance | yes | yes | predictive-maintenance | tool.patterns.ts → predictive-maintenance | — | no | — | — | — | src/services/fleetTelemetryService.js | 6 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| procedures | Procedure Guide | /tools/procedures | src/pages/tools/ProcedureGuide.jsx | procedures | yes | yes | procedures | tool.patterns.ts → procedures | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| protocol-lookup | Clinical Protocol Lookup | /tools/protocols | src/pages/tools/Protocols.jsx | protocols | yes | yes | protocol-lookup | tool.patterns.ts → protocol-lookup | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| qsofa | qSOFA (quick SOFA) | /tools/calculators/qsofa | src/pages/tools/Calculators.jsx | qsofa | yes | yes | qsofa | tool.patterns.ts → qsofa | — | no | — | — | — | — | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| ranson-criteria | Ranson criteria | /tools/calculators/ranson-criteria | src/pages/tools/Calculators.jsx | ranson-criteria | yes | yes | ranson-criteria | tool.patterns.ts → ranson-criteria | — | no | — | — | — | — | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| rome-iv-ibs | Rome IV IBS Criteria | /tools/calculators | src/pages/tools/Calculators.jsx | rome-iv-ibs | yes | yes | rome-iv-ibs | tool.patterns.ts → rome-iv-ibs | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 9 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| route-optimizer | Route Optimization Assistant | /fleet/route-optimizer | src/pages/fleet/RouteOptimizer.jsx | route-optimizer | yes | yes | route-optimizer | tool.patterns.ts → route-optimizer | — | no | — | — | — | src/services/fleetTelemetryService.js | 6 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| sofa-calculator | SOFA Score Calculator | /tools/calculator/sofa | src/pages/tools/Calculators.jsx | sofa-score | yes | yes | sofa-calculator | tool.patterns.ts → sofa-calculator | sofa-calculator | yes | /api/tools/sofa-calculator/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) | ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.js | 6 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | fully wired |
| stop-bang | STOP-Bang (OSA screening) | /tools/calculators/stop-bang | src/pages/tools/Calculators.jsx | stop-bang | yes | yes | stop-bang | tool.patterns.ts → stop-bang | — | no | — | — | — | — | 13 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| timi-ua-nstemi | TIMI risk score (UA/NSTEMI) | /tools/calculators/timi-ua-nstemi | src/pages/tools/Calculators.jsx | timi-ua-nstemi | yes | yes | timi-ua-nstemi | tool.patterns.ts → timi-ua-nstemi | — | no | — | — | — | — | 7 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| wells-dvt-calculator | Wells DVT Score | /tools/calculators | src/pages/tools/Calculators.jsx | wells-dvt-calculator | yes | yes | wells-dvt-calculator | tool.patterns.ts → wells-dvt-calculator | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 4 files (clinicalToolAliasSync.test.js, clinicalToolIdContract.test.js, …) | frontend-only |
| wells-pe | Wells PE Score | /tools/calculators | src/pages/tools/Calculators.jsx | wells-pe | yes | yes | wells-pe | tool.patterns.ts → wells-pe | — | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) | QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.js | 8 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| calc-bmi | BMI | /tools/calculator/bmi | src/pages/tools/Calculators.jsx | calc-bmi | yes | yes | — | — | — | no | — | — | — | — | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| calc-gfr | eGFR (CKD-EPI) | /tools/calculator/gfr | src/pages/tools/Calculators.jsx | calc-gfr | yes | yes | — | — | — | no | — | — | — | — | 5 files (clinicalCatalogLaunch.test.js, clinicalToolAliasSync.test.js, …) | frontend-only |
| calculators | All calculators | /tools/calculators | src/pages/tools/Calculators.jsx | calculators | yes | yes | — | — | — | no | — | — | — | — | 6 files (catalogSearch.test.js, clinicalCatalogLaunch.test.js, …) | frontend-only |
| tools-list-api | List orchestrator tools | — | src/pages/tools/ClinicalToolCatalog.jsx | — | — | yes | — | — | — | n/a | GET /api/tools | — | ToolListDto | src/services/clinicalToolsApi.js (`fetchBackendClinicalTools`) | clinicalToolCatalog.launch.test.jsx | fully wired |
| tools-share-results | Share tool results (client) | — | src/components/tools/ToolResultShare.jsx | — | — | no | — | — | — | no | POST /api/tools/share-results | — (undocumented) | — | src/components/tools/ToolResultShare.jsx (`apiFetch`) | — | frontend-only |
| abc-assessment | ABC Emergency Assessment | — | — | — | no | yes | — | — | — | no | — | — | — | src/services/advancedRecommendationService.js, src/contexts/CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
| antibiotic-scripts | Antibiotic Scripts | — | — | — | no | yes | — | — | — | no | — | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
| bleeding-risk | Bleeding Risk Calculator | — | — | — | no | yes | — | — | — | no | — | — | — | CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
| cancer-calculator | Oncology Risk Calculator | — | — | — | no | yes | — | — | — | no | — | — | — | advancedRecommendationService.js | sourceCodeToolDiscovery.test.js | planned |
| chemo-calculator | Chemotherapy Dosing Calculator | — | — | — | no | yes | — | — | — | no | — | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
| medication-checker | Medication Checker (offline label) | — | — | — | no | yes | — | — | — | no | — | — | — | src/contexts/OfflineProvider.jsx, OfflineSupport.jsx | sourceCodeToolDiscovery.test.js | planned |
| trauma-score | Trauma Severity Score | — | — | — | no | yes | — | — | — | no | — | — | — | advancedRecommendationService.js, CostTrackingContext.jsx, WorkspaceContext.test.jsx | sourceCodeToolDiscovery.test.js | planned |
| tumor-staging | Tumor Staging Guide | — | — | — | no | yes | — | — | — | no | — | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
| vitals-monitor | Vitals Monitor | — | — | — | no | yes | — | — | — | no | POST /api/chat/analyze-vitals | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | sourceCodeToolDiscovery.test.js | planned |
<!-- markdownlint-enable MD013 -->

## Row notes

- **abcd2:** Calculator slug: abcd2
- **apache2-calculator:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **apgar-score:** Calculator slug: apgar-score
- **ascvd-risk:** Calculator slug: ascvd-risk
- **audit-c:** Calculator slug: audit-c
- **bisap-score:** Calculator slug: bisap-score
- **bishop-score:** Calculator slug: bishop-score
- **braden-scale:** Calculator slug: braden-scale
- **canadian-c-spine:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **centor-mcisaac:** Calculator slug: centor-mcisaac
- **cha2ds2vasc-calculator:** Calculator slug: chads2vasc
- **child-pugh:** Calculator slug: child-pugh
- **ckd-staging:** Calculator slug: ckd-staging
- **copd-gold:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **curb65-calculator:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **dispatch-ai:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **fib4:** Calculator slug: fib4
- **framingham-risk:** Calculator slug: framingham-risk
- **gad7:** Calculator slug: gad7
- **gcs-calculator:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **grace-acs:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **has-bled:** Calculator slug: has-bled
- **heart-score:** Calculator slug: heart-score
- **meld:** Calculator slug: meld
- **meld-na:** Calculator slug: meld-na
- **morse-fall-scale:** Calculator slug: morse-fall-scale
- **news2:** Calculator slug: news2
- **nexus-cspine:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **nihss:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **ottawa-ankle:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **pecarn-head:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **perc:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **phq9:** Calculator slug: phq9
- **qsofa:** Calculator slug: qsofa
- **ranson-criteria:** Calculator slug: ranson-criteria
- **rome-iv-ibs:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **sofa-calculator:** Calculator slug: sofa
- **stop-bang:** Calculator slug: stop-bang
- **timi-ua-nstemi:** Calculator slug: timi-ua-nstemi
- **wells-dvt-calculator:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **wells-pe:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **calc-bmi:** No dedicated clinicalIntentTools row
- **calc-gfr:** No dedicated clinicalIntentTools row
- **calculators:** No dedicated clinicalIntentTools row
- **tools-list-api:** Catalog executor panel
- **tools-share-results:** Email share gated via backendApiCapabilities.toolsShareResults; use Share Link or client export
- **abc-assessment:** Recommended for emergency_assessment intent; no UI or backend executor.
- **antibiotic-scripts:** Overlaps NLU antibiotic-guide → diagnosis page; separate id unused in UI.
- **bleeding-risk:** Cost category id; launch resolves to HAS-BLED registry (/tools/calculators/has-bled) via NLU_TO_REGISTRY_ID + toolIdAliases.
- **cancer-calculator:** NLU recommendations only; not in tool.patterns or Calculators.jsx.
- **chemo-calculator:** Recommendation + cost tracking only.
- **medication-checker:** Offline cache category label; alias of drug-check conceptually.
- **trauma-score:** Maps to calculators hub in recommendations only; no trauma calculator form.
- **tumor-staging:** Recommendation + cost tracking only.
- **vitals-monitor:** POST /api/chat/analyze-vitals exists; no dedicated vitals tool page.

## Gaps and recommended fixes

_No automated gaps detected._

### Manual follow-ups (not auto-flagged)

- **Keyboard shortcuts:** duplicate `Ctrl+Shift+*` bindings in `toolRegistry.js` (PERC/PHQ-9, GRACE/GAD-7, etc.).
- **Route duality:** legacy `/tools/calculator/*` vs `/tools/calculators/*` — both valid; keep redirects in `clinicalToolRoutes.js`.
- **Env:** align `backend/.env.example` `FRONTEND_URL` with Vite port **8000** when using default dev proxy.
- **dispatch-ai:** fleet Tier-B chat; `backendExecutable: true` in catalog is NLU/chat routing only — not POST execute (documented in row notes).

## Regeneration

```bash
npm run contract:write-docs
npm run test:contract-matrix
```

Drift gates: `npm run test:alias-sync`, `npm run test:executor-mapping`, `npm run test:e2e-matrix`.

