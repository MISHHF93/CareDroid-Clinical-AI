# Tool contract matrix

**Generated:** 2026-05-20T01:24:54.890Z

> **Source:** `src/data/toolContractMatrix.js` (derived from `backendFrontendToolContract.js`)
> **Regenerate:** `npm run contract:write-docs`

## Summary

| Metric | Count |
|--------|------:|
| Total rows | 68 |
| NLU profiles | 54 |
| Registry tools | 57 |
| POST executors | 3 |

### Status distribution

| Status | Count |
|--------|------:|
| fully wired | 4 |
| frontend-only | 55 |
| backend-only | 0 |
| broken | 0 |
| planned | 9 |

## Status definitions

| Status | Meaning |
|--------|---------|
| **fully wired** | UI route + component, catalog + registry + NLU pattern; POST executor when executor column shows an NLU id. |
| **frontend-only** | Shipped client UI and NLU; no `registerTool()` POST executor. |
| **backend-only** | Server executor/API without dedicated UI surface. |
| **broken** | Client references missing backend route or misleading executor wiring. |
| **planned** | Phantom / roadmap id — not production-shipped. |

## POST executors

- `sofa-calculator` → `POST /api/tools/sofa-calculator/execute`
- `drug-interactions` → `POST /api/tools/drug-interactions/execute`
- `lab-interpreter` → `POST /api/tools/lab-interpreter/execute`

## Full matrix

<!-- markdownlint-disable MD013 -->
| ID | Route | Component | Catalog | Registry | NLU | Executor | Endpoint | DTO | API client | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abcd2 | /tools/calculators/abcd2 | src/pages/tools/Calculators.jsx (case 'abcd2') | yes | abcd2 | abcd2 | no | — | — | — | frontend-only |
| abg-interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.jsx | yes | abg-interpreter | abg-interpreter | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| acls-protocol | /tools/protocols | src/pages/tools/Protocols.jsx | yes | acls-protocol | acls-protocol | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| antibiotic-guide | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.jsx | yes | antibiotic-guide | antibiotic-guide | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| apache2-calculator | /tools/calculators | — | yes | apache2-calculator | apache2-calculator | no | — | — | — | frontend-only |
| apgar-score | /tools/calculators/apgar-score | src/pages/tools/Calculators.jsx (case 'apgar-score') | yes | apgar-score | apgar-score | no | — | — | — | frontend-only |
| ascvd-risk | /tools/calculators/ascvd-risk | src/pages/tools/Calculators.jsx (case 'ascvd-risk') | yes | ascvd-risk | ascvd-risk | no | — | — | — | frontend-only |
| atls-protocol | /tools/protocols | src/pages/tools/Protocols.jsx | yes | atls-protocol | atls-protocol | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| audit-c | /tools/calculators/audit-c | src/pages/tools/Calculators.jsx (case 'audit-c') | yes | audit-c | audit-c | no | — | — | — | frontend-only |
| bisap-score | /tools/calculators/bisap-score | src/pages/tools/Calculators.jsx (case 'bisap-score') | yes | bisap-score | bisap-score | no | — | — | — | frontend-only |
| bishop-score | /tools/calculators/bishop-score | src/pages/tools/Calculators.jsx (case 'bishop-score') | yes | bishop-score | bishop-score | no | — | — | — | frontend-only |
| braden-scale | /tools/calculators/braden-scale | src/pages/tools/Calculators.jsx (case 'braden-scale') | yes | braden-scale | braden-scale | no | — | — | — | frontend-only |
| canadian-c-spine | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | canadian-c-spine | canadian-c-spine | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| centor-mcisaac | /tools/calculators/centor-mcisaac | src/pages/tools/Calculators.jsx (case 'centor-mcisaac') | yes | centor-mcisaac | centor-mcisaac | no | — | — | — | frontend-only |
| cha2ds2vasc-calculator | /tools/calculator/chads2vasc | src/pages/tools/Calculators.jsx (case 'chads2vasc') | yes | calc-chads2vasc | cha2ds2vasc-calculator | no | — | — | — | frontend-only |
| child-pugh | /tools/calculators/child-pugh | src/pages/tools/Calculators.jsx (case 'child-pugh') | yes | child-pugh | child-pugh | no | — | — | — | frontend-only |
| ckd-staging | /tools/calculators/ckd-staging | src/pages/tools/Calculators.jsx (case 'ckd-staging') | yes | ckd-staging | ckd-staging | no | — | — | — | frontend-only |
| copd-gold | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | copd-gold | copd-gold | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| curb65-calculator | /tools/calculators | — | yes | curb65-calculator | curb65-calculator | no | — | — | — | frontend-only |
| differential-diagnosis | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.jsx | yes | diagnosis | differential-diagnosis | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| dispatch-ai | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | dispatch-ai | dispatch-ai | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| dose-calculator | /tools/calculators | src/pages/tools/Calculators.jsx | yes | dose-calculator | dose-calculator | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| drug-interactions | /tools/drug-checker | src/pages/tools/DrugChecker.jsx | yes | drug-check | drug-interactions | drug-interactions | POST /api/tools/drug-interactions/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, …) | src/pages/tools/DrugChecker.jsx (`apiFetch`) | fully wired |
| fib4 | /tools/calculators/fib4 | src/pages/tools/Calculators.jsx (case 'fib4') | yes | fib4 | fib4 | no | — | — | — | frontend-only |
| fleet-command | /fleet/command | src/pages/fleet/FleetDashboard.jsx | yes | fleet-command | fleet-command | no | — | — | — | frontend-only |
| framingham-risk | /tools/calculators/framingham-risk | src/pages/tools/Calculators.jsx (case 'framingham-risk') | yes | framingham-risk | framingham-risk | no | — | — | — | frontend-only |
| gad7 | /tools/calculators/gad7 | src/pages/tools/Calculators.jsx (case 'gad7') | yes | gad7 | gad7 | no | — | — | — | frontend-only |
| gcs-calculator | /tools/calculators | — | yes | gcs-calculator | gcs-calculator | no | — | — | — | frontend-only |
| grace-acs | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | grace-acs | grace-acs | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| has-bled | /tools/calculators/has-bled | src/pages/tools/Calculators.jsx (case 'has-bled') | yes | has-bled | has-bled | no | — | — | — | frontend-only |
| heart-score | /tools/calculators/heart-score | src/pages/tools/Calculators.jsx (case 'heart-score') | yes | heart-score | heart-score | no | — | — | — | frontend-only |
| lab-interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.jsx | yes | lab-interp | lab-interpreter | lab-interpreter | POST /api/tools/lab-interpreter/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, …) | src/pages/tools/LabInterpreter.jsx (`apiFetch`) | fully wired |
| meld | /tools/calculators/meld | src/pages/tools/Calculators.jsx (case 'meld') | yes | meld | meld | no | — | — | — | frontend-only |
| meld-na | /tools/calculators/meld-na | src/pages/tools/Calculators.jsx (case 'meld-na') | yes | meld-na | meld-na | no | — | — | — | frontend-only |
| morse-fall-scale | /tools/calculators/morse-fall-scale | src/pages/tools/Calculators.jsx (case 'morse-fall-scale') | yes | morse-fall-scale | morse-fall-scale | no | — | — | — | frontend-only |
| news2 | /tools/calculators/news2 | src/pages/tools/Calculators.jsx (case 'news2') | yes | news2 | news2 | no | — | — | — | frontend-only |
| nexus-cspine | /tools/calculators | — | yes | nexus-cspine | nexus-cspine | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| nihss | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | nihss | nihss | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| ottawa-ankle | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | ottawa-ankle | ottawa-ankle | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| pecarn-head | /tools/calculators | — | yes | pecarn-head | pecarn-head | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| perc | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | perc | perc | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| phq9 | /tools/calculators/phq9 | src/pages/tools/Calculators.jsx (case 'phq9') | yes | phq9 | phq9 | no | — | — | — | frontend-only |
| predictive-maintenance | /fleet/predictive-maintenance | src/pages/fleet/PredictiveMaintenance.jsx | yes | predictive-maintenance | predictive-maintenance | no | — | — | — | frontend-only |
| procedures | /tools/procedures | src/pages/tools/ProcedureGuide.jsx | yes | procedures | procedures | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| protocol-lookup | /tools/protocols | src/pages/tools/Protocols.jsx | yes | protocols | protocol-lookup | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| qsofa | /tools/calculators/qsofa | src/pages/tools/Calculators.jsx (case 'qsofa') | yes | qsofa | qsofa | no | — | — | — | frontend-only |
| ranson-criteria | /tools/calculators/ranson-criteria | src/pages/tools/Calculators.jsx (case 'ranson-criteria') | yes | ranson-criteria | ranson-criteria | no | — | — | — | frontend-only |
| rome-iv-ibs | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | rome-iv-ibs | rome-iv-ibs | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| route-optimizer | /fleet/route-optimizer | src/pages/fleet/RouteOptimizer.jsx | yes | route-optimizer | route-optimizer | no | — | — | — | frontend-only |
| sofa-calculator | /tools/calculator/sofa | src/pages/tools/Calculators.jsx (case 'sofa') | yes | sofa-score | sofa-calculator | sofa-calculator | POST /api/tools/sofa-calculator/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, …) | src/pages/tools/Calculators.jsx (`apiFetch`) | fully wired |
| stop-bang | /tools/calculators/stop-bang | src/pages/tools/Calculators.jsx (case 'stop-bang') | yes | stop-bang | stop-bang | no | — | — | — | frontend-only |
| timi-ua-nstemi | /tools/calculators/timi-ua-nstemi | src/pages/tools/Calculators.jsx (case 'timi-ua-nstemi') | yes | timi-ua-nstemi | timi-ua-nstemi | no | — | — | — | frontend-only |
| wells-dvt-calculator | /tools/calculators | — | yes | wells-dvt-calculator | wells-dvt-calculator | no | — | — | — | frontend-only |
| wells-pe | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat) | yes | wells-pe | wells-pe | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, …) | src/services/apiClient.js (`apiFetch`) | frontend-only |
| calc-bmi | /tools/calculator/bmi | src/pages/tools/Calculators.jsx (case 'bmi') | yes | calc-bmi | — | no | — | — | — | frontend-only |
| calc-gfr | /tools/calculator/gfr | src/pages/tools/Calculators.jsx (case 'gfr') | yes | calc-gfr | — | no | — | — | — | frontend-only |
| calculators | /tools/calculators | src/pages/tools/Calculators.jsx | yes | calculators | — | no | — | — | — | frontend-only |
| tools-list-api | — | src/pages/tools/ClinicalToolCatalog.jsx | — | — | — | n/a | GET /api/tools | — | src/services/clinicalToolsApi.js (`fetchBackendClinicalTools`) | fully wired |
| tools-share-results | — | src/components/tools/ToolResultShare.jsx | — | — | — | no | POST /api/tools/share-results | — (undocumented) | src/components/tools/ToolResultShare.jsx (`apiFetch`) | frontend-only |
| abc-assessment | — | — | no | — | — | no | — | — | src/services/advancedRecommendationService.js, src/contexts/CostTrackingContext.jsx | planned |
| antibiotic-scripts | — | — | no | — | — | no | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| bleeding-risk | — | — | no | — | — | no | — | — | CostTrackingContext.jsx | planned |
| cancer-calculator | — | — | no | — | — | no | — | — | advancedRecommendationService.js | planned |
| chemo-calculator | — | — | no | — | — | no | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| medication-checker | — | — | no | — | — | no | — | — | src/contexts/OfflineProvider.jsx, OfflineSupport.jsx | planned |
| trauma-score | — | — | no | — | — | no | — | — | advancedRecommendationService.js, CostTrackingContext.jsx, WorkspaceContext.test.jsx | planned |
| tumor-staging | — | — | no | — | — | no | — | — | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| vitals-monitor | — | — | no | — | — | no | POST /api/chat/analyze-vitals | — | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
<!-- markdownlint-enable MD013 -->

## Notes

- **abcd2:** Calculator slug: abcd2
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
- **dispatch-ai:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **fib4:** Calculator slug: fib4
- **framingham-risk:** Calculator slug: framingham-risk
- **gad7:** Calculator slug: gad7
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

## Gaps

_No automated gaps._

## Related docs

- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md) — extended columns (discovery, tests, tier)
- [tool-visibility-matrix.md](./tool-visibility-matrix.md)
- [e2e-tool-validation-matrix.md](./e2e-tool-validation-matrix.md)

```bash
npm run contract:write-docs
npm run test:contract-matrix
```

