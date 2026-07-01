# Tool contract matrix

**Generated:** 2026-07-01T03:23:17.354Z

> **Source:** `src/data/toolContractMatrix.ts` (derived from `backendFrontendToolContract.ts`)
> **Regenerate:** `npm run contract:write-docs`

## Summary

| Metric | Count |
|--------|------:|
| Total rows | 252 |
| NLU profiles | 219 |
| Registry tools | 242 |
| POST executors | 3 |

### Status distribution

| Status | Count |
|--------|------:|
| fully wired | 4 |
| frontend-only | 240 |
| backend-only | 0 |
| broken | 0 |
| planned | 8 |

### Backend/frontend capability classification

| Classification | Count |
|----------------|------:|
| user-facing and wired | 292 |
| backend-only/internal | 236 |
| user-facing but missing frontend route | 0 |
| frontend-visible but backend missing | 0 |
| planned/unsupported | 36 |

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
| aa-gradient | /tools/calculators/aa-gradient | src/pages/tools/Calculators.tsx | yes | aa-gradient | aa-gradient | no | � | � → � | � | frontend-only |
| abcd2 | /tools/calculators/abcd2 | src/pages/tools/Calculators.tsx | yes | abcd2 | abcd2 | no | � | � → � | � | frontend-only |
| abg-interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.tsx | yes | abg-interpreter | abg-interpreter | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| acls-protocol | /protocols | src/pages/tools/Protocols.tsx | yes | acls-protocol | acls-protocol | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| acs-workflow-assistant | /tools/cardiology/acs-workflow-assistant | src/pages/tools/CardiologyAssistantPage.tsx | yes | acs-workflow-assistant | acs-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| adjusted-body-weight | /tools/calculators/adjusted-body-weight | src/pages/tools/Calculators.tsx | yes | adjusted-body-weight | adjusted-body-weight | no | � | � → � | � | frontend-only |
| ai-artifacts | /artifacts | src/pages/Artifacts.jsx | yes | ai-artifacts | ai-artifacts | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-command-center | /ai-command-center | src/pages/AiCommandCenterDashboard.jsx | yes | ai-command-center | ai-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-cost-optimization | /costs | src/pages/CostAnalyticsDashboard.jsx | yes | ai-cost-optimization | ai-cost-optimization | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-evaluation | /ai-evaluation | src/pages/AiEvaluationDashboard.jsx | yes | ai-evaluation | ai-evaluation | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-gateway | /assistant | src/pages/Assistant.jsx | yes | ai-gateway | ai-gateway | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-governance | /ai-governance | src/pages/platform/PlatformGovernanceWorkspace.tsx | yes | ai-governance | ai-governance | no | /api/ai-governance/summary | � → � | src/services/platformGovernanceApi.ts | frontend-only |
| ai-memory | /ai-memory | src/pages/MemoryDashboard.jsx | yes | ai-memory | ai-memory | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-rag | /tools/guideline-rag | src/pages/tools/GuidelineRag.tsx | yes | ai-rag | ai-rag | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-security | /security | src/pages/platform/PlatformGovernanceWorkspace.tsx | yes | ai-security | ai-security | no | /api/security/summary | � → � | src/services/platformGovernanceApi.ts | frontend-only |
| ai-tool-calling | /assistant | src/pages/Assistant.jsx | yes | ai-tool-calling | ai-tool-calling | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-training | /training | src/pages/TrainingDashboard.tsx | yes | ai-training | ai-training | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| aki-staging-assistant | /tools/nephrology/aki-staging-assistant | src/pages/tools/NephrologyAssistantPage.tsx | yes | aki-staging-assistant | aki-staging-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| anion-gap | /tools/calculators/anion-gap | src/pages/tools/Calculators.tsx | yes | anion-gap | anion-gap | no | � | � → � | � | frontend-only |
| antibiotic-guide | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.tsx | yes | antibiotic-guide | antibiotic-guide | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| apache2-calculator | /tools/calculators/apache-ii | src/pages/tools/Calculators.tsx | yes | apache2-calculator | apache2-calculator | no | � | � → � | � | frontend-only |
| apgar-score | /tools/calculators/apgar-score | src/pages/tools/Calculators.tsx | yes | apgar-score | apgar-score | no | � | � → � | � | frontend-only |
| apri | /tools/calculators/apri | src/pages/tools/Calculators.tsx | yes | apri | apri | no | � | � → � | � | frontend-only |
| arrhythmia-risk-classifier | /tools/cardiology/arrhythmia-risk-classifier | src/pages/tools/CardiologyAssistantPage.tsx | yes | arrhythmia-risk-classifier | arrhythmia-risk-classifier | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ascvd-risk | /tools/calculators/ascvd-risk | src/pages/tools/Calculators.tsx | yes | ascvd-risk | ascvd-risk | no | � | � → � | � | frontend-only |
| asthma-exacerbation-assistant | /tools/pulmonology/asthma-exacerbation-assistant | src/pages/tools/PulmonologyAssistantPage.tsx | yes | asthma-exacerbation-assistant | asthma-exacerbation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| asthma-severity-score | /tools/calculators/asthma-severity-score | src/pages/tools/Calculators.tsx | yes | asthma-severity-score | asthma-severity-score | no | � | � → � | � | frontend-only |
| atls-protocol | /protocols | src/pages/tools/Protocols.tsx | yes | atls-protocol | atls-protocol | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| atrial-fibrillation-assistant | /tools/cardiology/atrial-fibrillation-assistant | src/pages/tools/CardiologyAssistantPage.tsx | yes | atrial-fibrillation-assistant | atrial-fibrillation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| audit-c | /tools/calculators/audit-c | src/pages/tools/Calculators.tsx | yes | audit-c | audit-c | no | � | � → � | � | frontend-only |
| bed-occupancy-calculator | /tools/calculators/bed-occupancy-calculator | src/pages/tools/Calculators.tsx | yes | bed-occupancy-calculator | bed-occupancy-calculator | no | � | � → � | � | frontend-only |
| behavioral-analytics-dashboard | /tools/psychiatry/behavioral-analytics-dashboard | src/pages/tools/PsychiatryAssistantPage.tsx | yes | behavioral-analytics-dashboard | behavioral-analytics-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| bisap-score | /tools/calculators/bisap-score | src/pages/tools/Calculators.tsx | yes | bisap-score | bisap-score | no | � | � → � | � | frontend-only |
| bishop-score | /tools/calculators/bishop-score | src/pages/tools/Calculators.tsx | yes | bishop-score | bishop-score | no | � | � → � | � | frontend-only |
| bode-index | /tools/calculators/bode-index | src/pages/tools/Calculators.tsx | yes | bode-index | bode-index | no | � | � → � | � | frontend-only |
| braden-scale | /tools/calculators/braden-scale | src/pages/tools/Calculators.tsx | yes | braden-scale | braden-scale | no | � | � → � | � | frontend-only |
| bsa | /tools/calculators/bsa | src/pages/tools/Calculators.tsx | yes | bsa | bsa | no | � | � → � | � | frontend-only |
| bun-creatinine-ratio | /tools/calculators/bun-creatinine-ratio | src/pages/tools/Calculators.tsx | yes | bun-creatinine-ratio | bun-creatinine-ratio | no | � | � → � | � | frontend-only |
| cage | /tools/calculators/cage | src/pages/tools/Calculators.tsx | yes | cage | cage | no | � | � → � | � | frontend-only |
| calculator-recommender-ai | /tools/calculator-recommender | src/pages/tools/CalculatorRecommender.tsx | yes | calculator-recommender-ai | calculator-recommender-ai | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| canadian-c-spine | /tools/calculators | src/pages/tools/Calculators.tsx | yes | canadian-c-spine | canadian-c-spine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| cardiac-telemetry-analyzer | /tools/cardiology/cardiac-telemetry-analyzer | src/pages/tools/CardiologyAssistantPage.tsx | yes | cardiac-telemetry-analyzer | cardiac-telemetry-analyzer | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| cardiology-command-center | /tools/cardiology/cardiology-command-center | src/pages/tools/CardiologyAssistantPage.tsx | yes | cardiology-command-center | cardiology-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| centor-mcisaac | /tools/calculators/centor-mcisaac | src/pages/tools/Calculators.tsx | yes | centor-mcisaac | centor-mcisaac | no | � | � → � | � | frontend-only |
| cha2ds2vasc-calculator | /tools/calculators/chads2vasc | src/pages/tools/Calculators.tsx | yes | calc-chads2vasc | cha2ds2vasc-calculator | no | � | � → � | � | frontend-only |
| chads2 | /tools/calculators/chads2 | src/pages/tools/Calculators.tsx | yes | chads2 | chads2 | no | � | � → � | � | frontend-only |
| child-pugh | /tools/calculators/child-pugh | src/pages/tools/Calculators.tsx | yes | child-pugh | child-pugh | no | � | � → � | � | frontend-only |
| cirrhosis-monitoring-engine | /tools/gastroenterology/cirrhosis-monitoring-engine | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | cirrhosis-monitoring-engine | cirrhosis-monitoring-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ckd-progression-predictor | /tools/nephrology/ckd-progression-predictor | src/pages/tools/NephrologyAssistantPage.tsx | yes | ckd-progression-predictor | ckd-progression-predictor | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ckd-staging | /tools/calculators/ckd-staging | src/pages/tools/Calculators.tsx | yes | ckd-staging | ckd-staging | no | � | � → � | � | frontend-only |
| clinical-decision-support | /clinical-decision-support | src/pages/ClinicalDecisionSupport.jsx | yes | clinical-decision-support | clinical-decision-support | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| clinical-documentation-assistant | /documentation | src/pages/ClinicalDocumentationAssistant.tsx | yes | clinical-documentation-assistant | clinical-documentation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| clinical-knowledge-graph | /knowledge-graph | src/pages/ClinicalKnowledgeGraph.jsx | yes | clinical-knowledge-graph | clinical-knowledge-graph | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| cognitive-screening-assistant | /tools/psychiatry/cognitive-screening-assistant | src/pages/tools/PsychiatryAssistantPage.tsx | yes | cognitive-screening-assistant | cognitive-screening-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| columbia-suicide-severity-workflow | /tools/calculators/columbia-suicide-severity-workflow | src/pages/tools/Calculators.tsx | yes | columbia-suicide-severity-workflow | columbia-suicide-severity-workflow | no | � | � → � | � | frontend-only |
| competency-dashboard | /simulation/outcomes | src/pages/SimulationOutcomes.jsx | yes | competency-dashboard | competency-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| competency-platform | /competencies | src/pages/Competencies.jsx | yes | competency-platform | competency-platform | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| continuous-glucose-command-center | /tools/endocrine/continuous-glucose-command-center | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | continuous-glucose-command-center | continuous-glucose-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| copd-gold | /tools/calculators | src/pages/tools/Calculators.tsx | yes | copd-gold | copd-gold | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| copd-gold-assessment | /tools/calculators/copd-gold-assessment | src/pages/tools/Calculators.tsx | yes | copd-gold-assessment | copd-gold-assessment | no | � | � → � | � | frontend-only |
| copd-workflow-assistant | /tools/pulmonology/copd-workflow-assistant | src/pages/tools/PulmonologyAssistantPage.tsx | yes | copd-workflow-assistant | copd-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| corrected-calcium | /tools/calculators/corrected-calcium | src/pages/tools/Calculators.tsx | yes | corrected-calcium | corrected-calcium | no | � | � → � | � | frontend-only |
| corrected-sodium | /tools/calculators/corrected-sodium | src/pages/tools/Calculators.tsx | yes | corrected-sodium | corrected-sodium | no | � | � → � | � | frontend-only |
| creatinine-clearance-cg | /tools/calculators/creatinine-clearance-cg | src/pages/tools/Calculators.tsx | yes | creatinine-clearance-cg | creatinine-clearance-cg | no | � | � → � | � | frontend-only |
| credentialing-platform | /credentials | src/pages/Credentials.jsx | yes | credentialing-platform | credentialing-platform | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| crisis-escalation-audit-log | /tools/psychiatry/crisis-escalation-audit-log | src/pages/tools/PsychiatryAssistantPage.tsx | yes | crisis-escalation-audit-log | crisis-escalation-audit-log | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| curb65-calculator | /tools/calculators/curb-65 | src/pages/tools/Calculators.tsx | yes | curb65-calculator | curb65-calculator | no | � | � → � | � | frontend-only |
| debrief-dashboard | /simulation/sepsis-deterioration | src/pages/SimulationScenarioPlayer.jsx | yes | debrief-dashboard | debrief-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| device-recommendation-assistant | /tools/calculators | src/pages/tools/Calculators.tsx | yes | device-recommendation-assistant | device-recommendation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| diabetes-care-assistant | /tools/endocrine/diabetes-care-assistant | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | diabetes-care-assistant | diabetes-care-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| dialysis-readiness-helper | /tools/nephrology/dialysis-readiness-helper | src/pages/tools/NephrologyAssistantPage.tsx | yes | dialysis-readiness-helper | dialysis-readiness-helper | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| dialysis-utilization-tracker | /tools/nephrology/dialysis-utilization-tracker | src/pages/tools/NephrologyAssistantPage.tsx | yes | dialysis-utilization-tracker | dialysis-utilization-tracker | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| differential-ai | /tools/differential-ai | src/pages/tools/DifferentialAi.tsx | yes | differential-ai | differential-ai | no | /api/clinical-intelligence/differential-ai/generate | DifferentialAiRequestDto (`symptoms`, `labs?`, `history?`, `demographics?`) → DifferentialAiResponseDto (`runId`, `rankedDifferentials`, `suggestedCalculators`, `explainability`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| differential-diagnosis | /tools/diagnosis | src/pages/tools/DiagnosisAssistant.tsx | yes | diagnosis | differential-diagnosis | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| digital-operations-center | /operations | src/pages/Operations.jsx | yes | digital-operations-center | digital-operations-center | no | POST /api/chat/message | ChatMessageDto (message, conversationId, tool?, feature?) → QueryResponse (text, intentClassification, toolResult?, �) | src/services/hospitalMapService.ts | frontend-only |
| dispatch-ai | /tools/calculators | src/pages/tools/Calculators.jsx (hub card) + src/components/ChatInterface.jsx (ED Copilot) | yes | dispatch-ai | dispatch-ai | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| dka-pathway-assistant | /tools/endocrine/dka-pathway-assistant | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | dka-pathway-assistant | dka-pathway-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| dose-calculator | /tools/calculators | src/pages/tools/Calculators.tsx | yes | dose-calculator | dose-calculator | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| drug-interactions | /tools/drug-checker | src/pages/tools/DrugChecker.tsx | yes | drug-check | drug-interactions | drug-interactions | /api/tools/drug-interactions/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.ts | fully wired |
| duke-treadmill-score | /tools/calculators/duke-treadmill-score | src/pages/tools/Calculators.tsx | yes | duke-treadmill-score | duke-treadmill-score | no | � | � → � | � | frontend-only |
| ecg-interpretation-assistant | /tools/cardiology/ecg-interpretation-assistant | src/pages/tools/CardiologyAssistantPage.tsx | yes | ecg-interpretation-assistant | ecg-interpretation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ecg-trend-engine | /tools/cardiology/ecg-trend-engine | src/pages/tools/CardiologyAssistantPage.tsx | yes | ecg-trend-engine | ecg-trend-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| eeg-trend-dashboard | /tools/neurology/eeg-trend-dashboard | src/pages/tools/NeurologyAssistantPage.tsx | yes | eeg-trend-dashboard | eeg-trend-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| egfr-ckd-epi | /tools/calculators/egfr-ckd-epi | src/pages/tools/Calculators.tsx | yes | egfr-ckd-epi | egfr-ckd-epi | no | � | � → � | � | frontend-only |
| electrolyte-disorder-assistant | /tools/nephrology/electrolyte-disorder-assistant | src/pages/tools/NephrologyAssistantPage.tsx | yes | electrolyte-disorder-assistant | electrolyte-disorder-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| electrolyte-trend-engine | /tools/nephrology/electrolyte-trend-engine | src/pages/tools/NephrologyAssistantPage.tsx | yes | electrolyte-trend-engine | electrolyte-trend-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| endocrine-monitoring-system | /tools/endocrine/endocrine-monitoring-system | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | endocrine-monitoring-system | endocrine-monitoring-system | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| endoscopy-workflow-assistant | /tools/gastroenterology/endoscopy-workflow-assistant | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | endoscopy-workflow-assistant | endoscopy-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| epworth-sleepiness-scale | /tools/calculators/epworth-sleepiness-scale | src/pages/tools/Calculators.tsx | yes | epworth-sleepiness-scale | epworth-sleepiness-scale | no | � | � → � | � | frontend-only |
| fena | /tools/calculators/fena | src/pages/tools/Calculators.tsx | yes | fena | fena | no | � | � → � | � | frontend-only |
| fenton-growth-chart-helper | /tools/calculators/fenton-growth-chart-helper | src/pages/tools/Calculators.tsx | yes | fenton-growth-chart-helper | fenton-growth-chart-helper | no | � | � → � | � | frontend-only |
| feurea | /tools/calculators/feurea | src/pages/tools/Calculators.tsx | yes | feurea | feurea | no | � | � → � | � | frontend-only |
| fib4 | /tools/calculators/fib4 | src/pages/tools/Calculators.tsx | yes | fib4 | fib4 | no | � | � → � | � | frontend-only |
| fleet-command | /fleet/command | src/pages/fleet/FleetDashboard.jsx | yes | fleet-command | fleet-command | no | � | � → � | src/services/fleetTelemetryService.ts | frontend-only |
| fluid-balance-monitor | /tools/nephrology/fluid-balance-monitor | src/pages/tools/NephrologyAssistantPage.tsx | yes | fluid-balance-monitor | fluid-balance-monitor | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| four-score | /tools/calculators/four-score | src/pages/tools/Calculators.tsx | yes | four-score | four-score | no | � | � → � | � | frontend-only |
| framingham-risk | /tools/calculators/framingham-risk | src/pages/tools/Calculators.tsx | yes | framingham-risk | framingham-risk | no | � | � → � | � | frontend-only |
| free-water-deficit | /tools/calculators/free-water-deficit | src/pages/tools/Calculators.tsx | yes | free-water-deficit | free-water-deficit | no | � | � → � | � | frontend-only |
| gad7 | /tools/calculators/gad7 | src/pages/tools/Calculators.tsx | yes | gad7 | gad7 | no | � | � → � | � | frontend-only |
| gcs-calculator | /tools/calculators/gcs | src/pages/tools/Calculators.tsx | yes | gcs-calculator | gcs-calculator | no | � | � → � | � | frontend-only |
| gestational-age-calculator | /tools/calculators/gestational-age-calculator | src/pages/tools/Calculators.tsx | yes | gestational-age-calculator | gestational-age-calculator | no | � | � → � | � | frontend-only |
| gi-bleed-workflow-assistant | /tools/gastroenterology/gi-bleed-workflow-assistant | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | gi-bleed-workflow-assistant | gi-bleed-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| gi-command-center | /tools/gastroenterology/gi-command-center | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | gi-command-center | gi-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| gi-surveillance-dashboard | /tools/gastroenterology/gi-surveillance-dashboard | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | gi-surveillance-dashboard | gi-surveillance-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| glasgow-blatchford-score | /tools/calculators/glasgow-blatchford-score | src/pages/tools/Calculators.tsx | yes | glasgow-blatchford-score | glasgow-blatchford-score | no | � | � → � | � | frontend-only |
| glucose-telemetry-dashboard | /tools/endocrine/glucose-telemetry-dashboard | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | glucose-telemetry-dashboard | glucose-telemetry-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| grace-acs | /tools/calculators | src/pages/tools/Calculators.tsx | yes | grace-acs | grace-acs | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| growth-trend-analytics | /tools/pediatrics-obgyn/growth-trend-analytics | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | growth-trend-analytics | growth-trend-analytics | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| has-bled | /tools/calculators/has-bled | src/pages/tools/Calculators.tsx | yes | has-bled | has-bled | no | � | � → � | � | frontend-only |
| hcm-sudden-death-risk | /tools/calculators/hcm-sudden-death-risk | src/pages/tools/Calculators.tsx | yes | hcm-sudden-death-risk | hcm-sudden-death-risk | no | � | � → � | � | frontend-only |
| headache-red-flag-assistant | /tools/neurology/headache-red-flag-assistant | src/pages/tools/NeurologyAssistantPage.tsx | yes | headache-red-flag-assistant | headache-red-flag-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| heart-failure-assistant | /tools/cardiology/heart-failure-assistant | src/pages/tools/CardiologyAssistantPage.tsx | yes | heart-failure-assistant | heart-failure-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| heart-failure-staging | /tools/calculators/heart-failure-staging | src/pages/tools/Calculators.tsx | yes | heart-failure-staging | heart-failure-staging | no | � | � → � | � | frontend-only |
| heart-score | /tools/calculators/heart-score | src/pages/tools/Calculators.tsx | yes | heart-score | heart-score | no | � | � → � | � | frontend-only |
| hepatic-trend-analytics | /tools/gastroenterology/hepatic-trend-analytics | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | hepatic-trend-analytics | hepatic-trend-analytics | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| homa-ir | /tools/calculators/homa-ir | src/pages/tools/Calculators.tsx | yes | homa-ir | homa-ir | no | � | � → � | � | frontend-only |
| hospital-command-assistant | /tools/calculators | src/pages/tools/Calculators.tsx | yes | hospital-command-assistant | hospital-command-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| hunt-hess-scale | /tools/calculators/hunt-hess-scale | src/pages/tools/Calculators.tsx | yes | hunt-hess-scale | hunt-hess-scale | no | � | � → � | � | frontend-only |
| ich-score | /tools/calculators/ich-score | src/pages/tools/Calculators.tsx | yes | ich-score | ich-score | no | � | � → � | � | frontend-only |
| ideal-body-weight | /tools/calculators/ideal-body-weight | src/pages/tools/Calculators.tsx | yes | ideal-body-weight | ideal-body-weight | no | � | � → � | � | frontend-only |
| insulin-trend-engine | /tools/endocrine/insulin-trend-engine | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | insulin-trend-engine | insulin-trend-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| kfre | /tools/calculators/kfre | src/pages/tools/Calculators.tsx | yes | kfre | kfre | no | � | � → � | � | frontend-only |
| lab-interpreter | /tools/lab-interpreter | src/pages/tools/LabInterpreter.tsx | yes | lab-interp | lab-interpreter | lab-interpreter | /api/tools/lab-interpreter/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.ts | fully wired |
| laboratory-dashboard | /laboratory | src/pages/LaboratoryDashboard.jsx | yes | laboratory-dashboard | laboratory-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| liver-disease-assistant | /tools/gastroenterology/liver-disease-assistant | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | liver-disease-assistant | liver-disease-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| maddrey-discriminant-function | /tools/calculators/maddrey-discriminant-function | src/pages/tools/Calculators.tsx | yes | maddrey-discriminant-function | maddrey-discriminant-function | no | � | � → � | � | frontend-only |
| maternal-monitoring-dashboard | /tools/pediatrics-obgyn/maternal-monitoring-dashboard | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | maternal-monitoring-dashboard | maternal-monitoring-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| mdq | /tools/calculators/mdq | src/pages/tools/Calculators.tsx | yes | mdq | mdq | no | � | � → � | � | frontend-only |
| medical-3d-viewer | /3d-viewer | src/pages/Medical3DViewer.jsx | yes | medical-3d-viewer | medical-3d-viewer | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| meld | /tools/calculators/meld | src/pages/tools/Calculators.tsx | yes | meld | meld | no | � | � → � | � | frontend-only |
| meld-na | /tools/calculators/meld-na | src/pages/tools/Calculators.tsx | yes | meld-na | meld-na | no | � | � → � | � | frontend-only |
| mental-health-screening-assistant | /tools/psychiatry/mental-health-screening-assistant | src/pages/tools/PsychiatryAssistantPage.tsx | yes | mental-health-screening-assistant | mental-health-screening-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| metabolic-analytics | /tools/endocrine/metabolic-analytics | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | metabolic-analytics | metabolic-analytics | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| metabolic-syndrome-assistant | /tools/endocrine/metabolic-syndrome-assistant | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | metabolic-syndrome-assistant | metabolic-syndrome-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| mews | /tools/calculators/mews | src/pages/tools/Calculators.tsx | yes | mews | mews | no | � | � → � | � | frontend-only |
| mmse | /tools/calculators/mmse | src/pages/tools/Calculators.tsx | yes | mmse | mmse | no | � | � → � | � | frontend-only |
| moca-placeholder-workflow | /tools/calculators/moca-placeholder-workflow | src/pages/tools/Calculators.tsx | yes | moca-placeholder-workflow | moca-placeholder-workflow | no | � | � → � | � | frontend-only |
| modified-rankin-scale | /tools/calculators/modified-rankin-scale | src/pages/tools/Calculators.tsx | yes | modified-rankin-scale | modified-rankin-scale | no | � | � → � | � | frontend-only |
| moe-router | /assistant | src/pages/Assistant.jsx | yes | moe-router | moe-router | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| morse-fall-scale | /tools/calculators/morse-fall-scale | src/pages/tools/Calculators.tsx | yes | morse-fall-scale | morse-fall-scale | no | � | � → � | � | frontend-only |
| neonatal-assessment-assistant | /tools/pediatrics-obgyn/neonatal-assessment-assistant | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | neonatal-assessment-assistant | neonatal-assessment-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| neonatal-bilirubin-risk-helper | /tools/calculators/neonatal-bilirubin-risk-helper | src/pages/tools/Calculators.tsx | yes | neonatal-bilirubin-risk-helper | neonatal-bilirubin-risk-helper | no | � | � → � | � | frontend-only |
| neonatal-dashboard | /tools/pediatrics-obgyn/neonatal-dashboard | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | neonatal-dashboard | neonatal-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| neuro-exam-assistant | /tools/neurology/neuro-exam-assistant | src/pages/tools/NeurologyAssistantPage.tsx | yes | neuro-exam-assistant | neuro-exam-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| neuro-monitoring-engine | /tools/neurology/neuro-monitoring-engine | src/pages/tools/NeurologyAssistantPage.tsx | yes | neuro-monitoring-engine | neuro-monitoring-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| neuro-telemetry-dashboard | /tools/neurology/neuro-telemetry-dashboard | src/pages/tools/NeurologyAssistantPage.tsx | yes | neuro-telemetry-dashboard | neuro-telemetry-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| neurology-timeline-ai | /tools/neurology/neurology-timeline-ai | src/pages/tools/NeurologyAssistantPage.tsx | yes | neurology-timeline-ai | neurology-timeline-ai | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| news2 | /tools/calculators/news2 | src/pages/tools/Calculators.tsx | yes | news2 | news2 | no | � | � → � | � | frontend-only |
| nexus-cspine | /tools/calculators | src/pages/tools/Calculators.tsx | yes | nexus-cspine | nexus-cspine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| nihss | /tools/calculators | src/pages/tools/Calculators.tsx | yes | nihss | nihss | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| nihss-summary-view | /tools/calculators/nihss-summary-view | src/pages/tools/Calculators.tsx | yes | nihss-summary-view | nihss-summary-view | no | � | � → � | � | frontend-only |
| ob-triage-assistant | /tools/pediatrics-obgyn/ob-triage-assistant | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | ob-triage-assistant | ob-triage-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| osmolal-gap | /tools/calculators/osmolal-gap | src/pages/tools/Calculators.tsx | yes | osmolal-gap | osmolal-gap | no | � | � → � | � | frontend-only |
| ottawa-ankle | /tools/calculators | src/pages/tools/Calculators.tsx | yes | ottawa-ankle | ottawa-ankle | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| oxygen-escalation-helper | /tools/pulmonology/oxygen-escalation-helper | src/pages/tools/PulmonologyAssistantPage.tsx | yes | oxygen-escalation-helper | oxygen-escalation-helper | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pancreatitis-workflow-assistant | /tools/gastroenterology/pancreatitis-workflow-assistant | src/pages/tools/GastroenterologyAssistantPage.tsx | yes | pancreatitis-workflow-assistant | pancreatitis-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pao2-fio2-ratio | /tools/calculators/pao2-fio2-ratio | src/pages/tools/Calculators.tsx | yes | pao2-fio2-ratio | pao2-fio2-ratio | no | � | � → � | � | frontend-only |
| pcl5 | /tools/calculators/pcl5 | src/pages/tools/Calculators.tsx | yes | pcl5 | pcl5 | no | � | � → � | � | frontend-only |
| pecarn-head | /tools/calculators | src/pages/tools/Calculators.tsx | yes | pecarn-head | pecarn-head | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pediatric-bp-percentile | /tools/calculators/pediatric-bp-percentile | src/pages/tools/Calculators.tsx | yes | pediatric-bp-percentile | pediatric-bp-percentile | no | � | � → � | � | frontend-only |
| pediatric-command-center | /tools/pediatrics-obgyn/pediatric-command-center | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | pediatric-command-center | pediatric-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pediatric-dose-safety-checker | /tools/calculators/pediatric-dose-safety-checker | src/pages/tools/Calculators.tsx | yes | pediatric-dose-safety-checker | pediatric-dose-safety-checker | no | � | � → � | � | frontend-only |
| pediatric-gcs | /tools/calculators/pediatric-gcs | src/pages/tools/Calculators.tsx | yes | pediatric-gcs | pediatric-gcs | no | � | � → � | � | frontend-only |
| pediatric-sepsis-assistant | /tools/pediatrics-obgyn/pediatric-sepsis-assistant | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | pediatric-sepsis-assistant | pediatric-sepsis-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| perc | /tools/calculators | src/pages/tools/Calculators.tsx | yes | perc | perc | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| perinatal-risk-dashboard | /tools/pediatrics-obgyn/perinatal-risk-dashboard | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | perinatal-risk-dashboard | perinatal-risk-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pews | /tools/calculators/pews | src/pages/tools/Calculators.tsx | yes | pews | pews | no | � | � → � | � | frontend-only |
| phq9 | /tools/calculators/phq9 | src/pages/tools/Calculators.tsx | yes | phq9 | phq9 | no | � | � → � | � | frontend-only |
| pneumonia-severity-index | /tools/calculators/pneumonia-severity-index | src/pages/tools/Calculators.tsx | yes | pneumonia-severity-index | pneumonia-severity-index | no | � | � → � | � | frontend-only |
| population-screening-dashboard | /tools/psychiatry/population-screening-dashboard | src/pages/tools/PsychiatryAssistantPage.tsx | yes | population-screening-dashboard | population-screening-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| predictive-analytics-dashboard | /predictive-analytics | src/pages/PredictiveAnalyticsDashboard.jsx | yes | predictive-analytics-dashboard | predictive-analytics-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| predictive-maintenance | /fleet/predictive-maintenance | src/pages/fleet/PredictiveMaintenance.jsx | yes | predictive-maintenance | predictive-maintenance | no | � | � → � | src/services/fleetTelemetryService.ts | frontend-only |
| pregnancy-due-date-calculator | /tools/calculators/pregnancy-due-date-calculator | src/pages/tools/Calculators.tsx | yes | pregnancy-due-date-calculator | pregnancy-due-date-calculator | no | � | � → � | � | frontend-only |
| pregnancy-workflow-assistant | /tools/pediatrics-obgyn/pregnancy-workflow-assistant | src/pages/tools/PediatricsObgynAssistantPage.tsx | yes | pregnancy-workflow-assistant | pregnancy-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| procedures | /tools/procedures | src/pages/tools/ProcedureGuide.tsx | yes | procedures | procedures | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| protocol-lookup | /protocols | src/pages/tools/Protocols.tsx | yes | protocols | protocol-lookup | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| psychiatry-monitoring-dashboard | /tools/psychiatry/psychiatry-monitoring-dashboard | src/pages/tools/PsychiatryAssistantPage.tsx | yes | psychiatry-monitoring-dashboard | psychiatry-monitoring-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| pulmonary-trend-engine | /tools/pulmonology/pulmonary-trend-engine | src/pages/tools/PulmonologyAssistantPage.tsx | yes | pulmonary-trend-engine | pulmonary-trend-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| qsofa | /tools/calculators/qsofa | src/pages/tools/Calculators.tsx | yes | qsofa | qsofa | no | � | � → � | � | frontend-only |
| ranson-criteria | /tools/calculators/ranson-criteria | src/pages/tools/Calculators.tsx | yes | ranson-criteria | ranson-criteria | no | � | � → � | � | frontend-only |
| rass | /tools/calculators/rass | src/pages/tools/Calculators.tsx | yes | rass | rass | no | � | � → � | � | frontend-only |
| remote-cardiology-monitoring-dashboard | /tools/cardiology/remote-cardiology-monitoring-dashboard | src/pages/tools/CardiologyAssistantPage.tsx | yes | remote-cardiology-monitoring-dashboard | remote-cardiology-monitoring-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| renal-monitoring-dashboard | /tools/nephrology/renal-monitoring-dashboard | src/pages/tools/NephrologyAssistantPage.tsx | yes | renal-monitoring-dashboard | renal-monitoring-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| research-evidence-hub | /research | src/pages/ResearchEvidenceHub.jsx | yes | research-evidence-hub | research-evidence-hub | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| resource-allocation-assistant | /tools/calculators | src/pages/tools/Calculators.tsx | yes | resource-allocation-assistant | resource-allocation-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| resource-utilization-index | /tools/calculators/resource-utilization-index | src/pages/tools/Calculators.tsx | yes | resource-utilization-index | resource-utilization-index | no | � | � → � | � | frontend-only |
| respiratory-command-center | /tools/pulmonology/respiratory-command-center | src/pages/tools/PulmonologyAssistantPage.tsx | yes | respiratory-command-center | respiratory-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| respiratory-telemetry-dashboard | /tools/pulmonology/respiratory-telemetry-dashboard | src/pages/tools/PulmonologyAssistantPage.tsx | yes | respiratory-telemetry-dashboard | respiratory-telemetry-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| revised-trauma-score | /tools/calculators/revised-trauma-score | src/pages/tools/Calculators.tsx | yes | revised-trauma-score | revised-trauma-score | no | � | � → � | � | frontend-only |
| reynolds-risk-score | /tools/calculators/reynolds-risk-score | src/pages/tools/Calculators.tsx | yes | reynolds-risk-score | reynolds-risk-score | no | � | � → � | � | frontend-only |
| rockall-score | /tools/calculators/rockall-score | src/pages/tools/Calculators.tsx | yes | rockall-score | rockall-score | no | � | � → � | � | frontend-only |
| rome-iv-ibs | /tools/calculators | src/pages/tools/Calculators.tsx | yes | rome-iv-ibs | rome-iv-ibs | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| route-optimizer | /fleet/route-optimizer | src/pages/fleet/RouteOptimizer.jsx | yes | route-optimizer | route-optimizer | no | � | � → � | src/services/fleetTelemetryService.ts | frontend-only |
| rox-index | /tools/calculators/rox-index | src/pages/tools/Calculators.tsx | yes | rox-index | rox-index | no | � | � → � | � | frontend-only |
| scenario-player | /simulation/sepsis-deterioration | src/pages/SimulationScenarioPlayer.jsx | yes | scenario-player | scenario-player | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| screening-trend-engine | /tools/psychiatry/screening-trend-engine | src/pages/tools/PsychiatryAssistantPage.tsx | yes | screening-trend-engine | screening-trend-engine | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| seizure-assistant | /tools/neurology/seizure-assistant | src/pages/tools/NeurologyAssistantPage.tsx | yes | seizure-assistant | seizure-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| serum-osmolality | /tools/calculators/serum-osmolality | src/pages/tools/Calculators.tsx | yes | serum-osmolality | serum-osmolality | no | � | � → � | � | frontend-only |
| shock-index | /tools/calculators/shock-index | src/pages/tools/Calculators.tsx | yes | shock-index | shock-index | no | � | � → � | � | frontend-only |
| simulation-outcomes | /simulation/outcomes | src/pages/SimulationOutcomes.jsx | yes | simulation-outcomes | simulation-outcomes | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| simulation-suite | /simulation | src/pages/MedicalSimulationSuite.jsx | yes | simulation-suite | simulation-suite | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| sleep-apnea-analytics | /tools/pulmonology/sleep-apnea-analytics | src/pages/tools/PulmonologyAssistantPage.tsx | yes | sleep-apnea-analytics | sleep-apnea-analytics | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| sofa-calculator | /tools/calculators/sofa | src/pages/tools/Calculators.tsx | yes | sofa-score | sofa-calculator | sofa-calculator | /api/tools/sofa-calculator/execute | ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`) → ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, ...) | src/services/clinicalOrchestratorApi.ts | fully wired |
| staffing-ratio-calculator | /tools/calculators/staffing-ratio-calculator | src/pages/tools/Calculators.tsx | yes | staffing-ratio-calculator | staffing-ratio-calculator | no | � | � → � | � | frontend-only |
| stemi-pathway-assistant | /tools/cardiology/stemi-pathway-assistant | src/pages/tools/CardiologyAssistantPage.tsx | yes | stemi-pathway-assistant | stemi-pathway-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| stop-bang | /tools/calculators/stop-bang | src/pages/tools/Calculators.tsx | yes | stop-bang | stop-bang | no | � | � → � | � | frontend-only |
| stroke-command-center | /tools/neurology/stroke-command-center | src/pages/tools/NeurologyAssistantPage.tsx | yes | stroke-command-center | stroke-command-center | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| stroke-workflow-assistant | /tools/neurology/stroke-workflow-assistant | src/pages/tools/NeurologyAssistantPage.tsx | yes | stroke-workflow-assistant | stroke-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| substance-use-screening-assistant | /tools/psychiatry/substance-use-screening-assistant | src/pages/tools/PsychiatryAssistantPage.tsx | yes | substance-use-screening-assistant | substance-use-screening-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| suicide-risk-workflow-assistant | /tools/psychiatry/suicide-risk-workflow-assistant | src/pages/tools/PsychiatryAssistantPage.tsx | yes | suicide-risk-workflow-assistant | suicide-risk-workflow-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| thyroid-disorder-assistant | /tools/endocrine/thyroid-disorder-assistant | src/pages/tools/EndocrineMetabolicAssistantPage.tsx | yes | thyroid-disorder-assistant | thyroid-disorder-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| timi-ua-nstemi | /tools/calculators/timi-ua-nstemi | src/pages/tools/Calculators.tsx | yes | timi-ua-nstemi | timi-ua-nstemi | no | � | � → � | � | frontend-only |
| turnaround-time-calculator | /tools/calculators/turnaround-time-calculator | src/pages/tools/Calculators.tsx | yes | turnaround-time-calculator | turnaround-time-calculator | no | � | � → � | � | frontend-only |
| ventilator-monitoring-dashboard | /tools/pulmonology/ventilator-monitoring-dashboard | src/pages/tools/PulmonologyAssistantPage.tsx | yes | ventilator-monitoring-dashboard | ventilator-monitoring-dashboard | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ventilator-support-assistant | /tools/pulmonology/ventilator-support-assistant | src/pages/tools/PulmonologyAssistantPage.tsx | yes | ventilator-support-assistant | ventilator-support-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| vertigo-hints-assistant | /tools/neurology/vertigo-hints-assistant | src/pages/tools/NeurologyAssistantPage.tsx | yes | vertigo-hints-assistant | vertigo-hints-assistant | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| waist-hip-ratio | /tools/calculators/waist-hip-ratio | src/pages/tools/Calculators.tsx | yes | waist-hip-ratio | waist-hip-ratio | no | � | � → � | � | frontend-only |
| wells-dvt-calculator | /tools/calculators | src/pages/tools/Calculators.tsx | yes | wells-dvt-calculator | wells-dvt-calculator | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| wells-pe | /tools/calculators | src/pages/tools/Calculators.tsx | yes | wells-pe | wells-pe | no | /api/chat/message | ChatMessageDto (`message`, `conversationId`, `tool?`, `feature?`) → QueryResponse (`text`, `intentClassification`, `toolResult?`, ...) | src/services/clinicalChatService.ts | frontend-only |
| ai-explainability | /tools/ai-explainability | src/pages/tools/AiExplainability.tsx | yes | ai-explainability | � | no | /api/clinical-intelligence/ai-explainability/trace | AiExplainabilityQueryDto (`toolId?`, `clinicalQuestion?`, `limit?`) → AiExplainabilityResponseDto (`runId`, `confidence`, `source`, `reasoning`, `toolChain`, `executionLogs`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| ambient-scribe | /tools/ambient-scribe | src/pages/tools/AmbientScribe.tsx | yes | ambient-scribe | � | no | /api/clinical-intelligence/ambient-scribe/generate | AmbientScribeGenerateDto (`noteType`, `transcriptText`, `patientContext?`) → AmbientScribeResponseDto (`runId`, `status`, `draft`, `safety`, `reviewRequired`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| asset-tracking-dashboard | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | asset-tracking-dashboard | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| calc-bmi | /tools/calculators/bmi | src/pages/tools/Calculators.tsx | yes | calc-bmi | � | no | � | � → � | � | frontend-only |
| calc-gfr | /tools/calculators/gfr | src/pages/tools/Calculators.tsx | yes | calc-gfr | � | no | � | � → � | � | frontend-only |
| calculators | /tools/calculators | src/pages/tools/Calculators.tsx | yes | calculators | � | no | � | � → � | � | frontend-only |
| capacity-prediction-engine | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | capacity-prediction-engine | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| clinical-audit | /tools/clinical-audit | src/pages/tools/ClinicalAudit.tsx | yes | clinical-audit | � | no | /api/clinical-intelligence/clinical-audit/execution-logs | ClinicalAuditQueryDto (`action?`, `limit?`) → ClinicalAuditResponseDto (`runId`, `summary`, `toolChain`, `executionLogs`, `safety`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| device-battery-intelligence | /medical-iot | src/pages/MedicalIotDashboard.jsx | yes | device-battery-intelligence | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| device-fleet-management | /devices | src/pages/DeviceFleetManagement.jsx | yes | device-fleet-management | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| device-maintenance | /devices | src/pages/DeviceFleetManagement.jsx | yes | device-maintenance | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| fleet-live-map | /fleet/map | src/pages/fleet/FleetLiveMap.jsx | yes | fleet-live-map | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| guideline-rag | /tools/guideline-rag | src/pages/tools/GuidelineRag.tsx | yes | guideline-rag | � | no | /api/clinical-intelligence/guideline-rag/query | GuidelineRagQueryDto (`query`, `specialty?`, `topK?`, `minScore?`) → GuidelineRagResponseDto (`runId`, `summary`, `citations`, `sources`, `explainability`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| hospital-map | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | hospital-map | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| hospital-operations-cockpit | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | hospital-operations-cockpit | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| hospital-operations-command | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | hospital-operations-command | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| incident-command-center | /hospital-map | src/pages/HospitalMapDashboard.jsx | yes | incident-command-center | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| live-tracking-map | /live-map | src/pages/LiveTrackingMap.jsx | yes | live-tracking-map | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| medical-iot-dashboard | /medical-iot | src/pages/MedicalIotDashboard.jsx | yes | medical-iot-dashboard | � | no | � | � → � | src/services/medicalIotService.ts | frontend-only |
| order-set-ai | /tools/order-set-ai | src/pages/tools/OrderSetAi.tsx | yes | order-set-ai | � | no | /api/clinical-intelligence/order-set-ai/generate | OrderSetAiRequestDto (`clinicalScenario`, `diagnosis?`, `patientContext?`, `constraints?`) → OrderSetAiResponseDto (`runId`, `orderBundles`, `protocolPathways`, `explainability`, `safety`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| patient-summary-ai | /tools/patient-summary-ai | src/pages/tools/PatientSummaryAi.tsx | yes | patient-summary-ai | � | no | /api/clinical-intelligence/patient-summary-ai/generate | PatientSummaryAiRequestDto (`patientContext?`, `problems?`, `medications?`, `labs?`, `alerts?`, `riskFactors?`, `notes?`) → PatientSummaryAiResponseDto (`runId`, `activeProblems`, `medications`, `recentLabs`, `alerts`, `riskFactors`, `safety`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| telemetry-monitoring | /medical-iot | src/pages/HospitalMapDashboard.jsx | yes | telemetry-monitoring | � | no | � | � → � | src/services/hospitalMapService.ts | frontend-only |
| timeline-ai | /tools/timeline-ai | src/pages/tools/TimelineAi.tsx | yes | timeline-ai | � | no | /api/clinical-intelligence/timeline-ai/generate | TimelineAiRequestDto (`patientContext?`, `encounters`, `focus?`) → TimelineAiResponseDto (`runId`, `timeline`, `trends`, `abnormalProgression`, `safety`) | src/services/clinicalIntelligenceApi.ts | frontend-only |
| tools-list-api | � | src/pages/tools/ClinicalToolCatalog.tsx | � | � | � | n/a | GET /api/tools | � → ToolListDto | src/services/clinicalToolsApi.js (`fetchBackendClinicalTools`) | fully wired |
| tools-share-results | � | src/components/tools/ToolResultShare.tsx | � | � | � | no | POST /api/tools/share-results | � (undocumented) → � | src/components/tools/ToolResultShare.jsx (`apiFetch`) | frontend-only |
| abc-assessment | � | � | no | � | � | no | � | � → � | src/services/advancedRecommendationService.js, src/contexts/CostTrackingContext.jsx | planned |
| antibiotic-scripts | � | � | no | � | � | no | � | � → � | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| bleeding-risk | � | � | no | � | � | no | � | � → � | CostTrackingContext.jsx | planned |
| cancer-calculator | � | � | no | � | � | no | � | � → � | advancedRecommendationService.js | planned |
| chemo-calculator | � | � | no | � | � | no | � | � → � | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| medication-checker | � | � | no | � | � | no | � | � → � | src/contexts/OfflineProvider.jsx, OfflineSupport.jsx | planned |
| tumor-staging | � | � | no | � | � | no | � | � → � | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
| vitals-monitor | � | � | no | � | � | no | POST /api/chat/analyze-vitals | � → � | advancedRecommendationService.js, CostTrackingContext.jsx | planned |
<!-- markdownlint-enable MD013 -->

## Notes

- **aa-gradient:** Calculator slug: aa-gradient
- **abcd2:** Calculator slug: abcd2
- **acs-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **adjusted-body-weight:** Calculator slug: adjusted-body-weight
- **aki-staging-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **anion-gap:** Calculator slug: anion-gap
- **apgar-score:** Calculator slug: apgar-score
- **apri:** Calculator slug: apri
- **ascvd-risk:** Calculator slug: ascvd-risk
- **asthma-exacerbation-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **asthma-severity-score:** Calculator slug: asthma-severity-score
- **atrial-fibrillation-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **audit-c:** Calculator slug: audit-c
- **bed-occupancy-calculator:** Calculator slug: bed-occupancy-calculator
- **bisap-score:** Calculator slug: bisap-score
- **bishop-score:** Calculator slug: bishop-score
- **bode-index:** Calculator slug: bode-index
- **braden-scale:** Calculator slug: braden-scale
- **bsa:** Calculator slug: bsa
- **bun-creatinine-ratio:** Calculator slug: bun-creatinine-ratio
- **cage:** Calculator slug: cage
- **canadian-c-spine:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **centor-mcisaac:** Calculator slug: centor-mcisaac
- **cha2ds2vasc-calculator:** Calculator slug: chads2vasc
- **chads2:** Calculator slug: chads2
- **child-pugh:** Calculator slug: child-pugh
- **ckd-staging:** Calculator slug: ckd-staging
- **cognitive-screening-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **columbia-suicide-severity-workflow:** Calculator slug: columbia-suicide-severity-workflow
- **copd-gold:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **copd-gold-assessment:** Calculator slug: copd-gold-assessment
- **copd-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **corrected-calcium:** Calculator slug: corrected-calcium
- **corrected-sodium:** Calculator slug: corrected-sodium
- **creatinine-clearance-cg:** Calculator slug: creatinine-clearance-cg
- **diabetes-care-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **dialysis-readiness-helper:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **dispatch-ai:** Tier-B: catalog launch seeds dashboard chat; no tool POST; NLU backendExecutable flag (chat routing only)
- **dka-pathway-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **duke-treadmill-score:** Calculator slug: duke-treadmill-score
- **ecg-interpretation-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **egfr-ckd-epi:** Calculator slug: egfr-ckd-epi
- **electrolyte-disorder-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **epworth-sleepiness-scale:** Calculator slug: epworth-sleepiness-scale
- **fena:** Calculator slug: fena
- **fenton-growth-chart-helper:** Calculator slug: fenton-growth-chart-helper
- **feurea:** Calculator slug: feurea
- **fib4:** Calculator slug: fib4
- **four-score:** Calculator slug: four-score
- **framingham-risk:** Calculator slug: framingham-risk
- **free-water-deficit:** Calculator slug: free-water-deficit
- **gad7:** Calculator slug: gad7
- **gestational-age-calculator:** Calculator slug: gestational-age-calculator
- **gi-bleed-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST; Launch nav may use /tools/gastroenterology/gi-bleed-workflow-assistant
- **glasgow-blatchford-score:** Calculator slug: glasgow-blatchford-score
- **grace-acs:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **has-bled:** Calculator slug: has-bled
- **hcm-sudden-death-risk:** Calculator slug: hcm-sudden-death-risk
- **headache-red-flag-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **heart-failure-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **heart-failure-staging:** Calculator slug: heart-failure-staging
- **heart-score:** Calculator slug: heart-score
- **homa-ir:** Calculator slug: homa-ir
- **hunt-hess-scale:** Calculator slug: hunt-hess-scale
- **ich-score:** Calculator slug: ich-score
- **ideal-body-weight:** Calculator slug: ideal-body-weight
- **kfre:** Calculator slug: kfre
- **liver-disease-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST; Launch nav may use /tools/gastroenterology/liver-disease-assistant
- **maddrey-discriminant-function:** Calculator slug: maddrey-discriminant-function
- **mdq:** Calculator slug: mdq
- **meld:** Calculator slug: meld
- **meld-na:** Calculator slug: meld-na
- **mental-health-screening-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **metabolic-syndrome-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **mews:** Calculator slug: mews
- **mmse:** Calculator slug: mmse
- **moca-placeholder-workflow:** Calculator slug: moca-placeholder-workflow
- **modified-rankin-scale:** Calculator slug: modified-rankin-scale
- **morse-fall-scale:** Calculator slug: morse-fall-scale
- **neonatal-assessment-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **neonatal-bilirubin-risk-helper:** Calculator slug: neonatal-bilirubin-risk-helper
- **neuro-exam-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **news2:** Calculator slug: news2
- **nexus-cspine:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **nihss:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **nihss-summary-view:** Calculator slug: nihss-summary-view
- **ob-triage-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **osmolal-gap:** Calculator slug: osmolal-gap
- **ottawa-ankle:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **oxygen-escalation-helper:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **pancreatitis-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST; Launch nav may use /tools/gastroenterology/pancreatitis-workflow-assistant
- **pao2-fio2-ratio:** Calculator slug: pao2-fio2-ratio
- **pcl5:** Calculator slug: pcl5
- **pecarn-head:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **pediatric-bp-percentile:** Calculator slug: pediatric-bp-percentile
- **pediatric-dose-safety-checker:** Calculator slug: pediatric-dose-safety-checker
- **pediatric-gcs:** Calculator slug: pediatric-gcs
- **pediatric-sepsis-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **perc:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **pews:** Calculator slug: pews
- **phq9:** Calculator slug: phq9
- **pneumonia-severity-index:** Calculator slug: pneumonia-severity-index
- **pregnancy-due-date-calculator:** Calculator slug: pregnancy-due-date-calculator
- **pregnancy-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **qsofa:** Calculator slug: qsofa
- **ranson-criteria:** Calculator slug: ranson-criteria
- **rass:** Calculator slug: rass
- **resource-utilization-index:** Calculator slug: resource-utilization-index
- **revised-trauma-score:** Calculator slug: revised-trauma-score
- **reynolds-risk-score:** Calculator slug: reynolds-risk-score
- **rockall-score:** Calculator slug: rockall-score
- **rome-iv-ibs:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **rox-index:** Calculator slug: rox-index
- **seizure-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **serum-osmolality:** Calculator slug: serum-osmolality
- **shock-index:** Calculator slug: shock-index
- **sofa-calculator:** Calculator slug: sofa
- **staffing-ratio-calculator:** Calculator slug: staffing-ratio-calculator
- **stemi-pathway-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **stop-bang:** Calculator slug: stop-bang
- **stroke-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **substance-use-screening-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **suicide-risk-workflow-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **thyroid-disorder-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **timi-ua-nstemi:** Calculator slug: timi-ua-nstemi
- **turnaround-time-calculator:** Calculator slug: turnaround-time-calculator
- **ventilator-support-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **vertigo-hints-assistant:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **waist-hip-ratio:** Calculator slug: waist-hip-ratio
- **wells-dvt-calculator:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **wells-pe:** Tier-B: catalog launch seeds dashboard chat; no tool POST
- **ai-explainability:** No dedicated clinicalIntentTools row
- **ambient-scribe:** No dedicated clinicalIntentTools row
- **asset-tracking-dashboard:** No dedicated clinicalIntentTools row
- **calc-bmi:** No dedicated clinicalIntentTools row
- **calc-gfr:** No dedicated clinicalIntentTools row
- **calculators:** No dedicated clinicalIntentTools row
- **capacity-prediction-engine:** No dedicated clinicalIntentTools row
- **clinical-audit:** No dedicated clinicalIntentTools row
- **device-battery-intelligence:** No dedicated clinicalIntentTools row
- **device-fleet-management:** No dedicated clinicalIntentTools row
- **device-maintenance:** No dedicated clinicalIntentTools row
- **fleet-live-map:** No dedicated clinicalIntentTools row
- **guideline-rag:** No dedicated clinicalIntentTools row
- **hospital-map:** No dedicated clinicalIntentTools row
- **hospital-operations-cockpit:** No dedicated clinicalIntentTools row
- **hospital-operations-command:** No dedicated clinicalIntentTools row
- **incident-command-center:** No dedicated clinicalIntentTools row
- **live-tracking-map:** No dedicated clinicalIntentTools row
- **medical-iot-dashboard:** No dedicated clinicalIntentTools row
- **order-set-ai:** No dedicated clinicalIntentTools row
- **patient-summary-ai:** No dedicated clinicalIntentTools row
- **telemetry-monitoring:** No dedicated clinicalIntentTools row
- **timeline-ai:** No dedicated clinicalIntentTools row
- **tools-list-api:** Catalog executor panel
- **tools-share-results:** Email share gated via backendApiCapabilities.toolsShareResults; use Share Link or client export
- **abc-assessment:** Recommended for emergency_assessment intent; no UI or backend executor.
- **antibiotic-scripts:** Overlaps NLU antibiotic-guide ? diagnosis page; separate id unused in UI.
- **bleeding-risk:** Cost category id; launch resolves to HAS-BLED registry (/tools/calculators/has-bled) via NLU_TO_REGISTRY_ID + toolIdAliases.
- **cancer-calculator:** NLU recommendations only; not in tool.patterns or Calculators.jsx.
- **chemo-calculator:** Recommendation + cost tracking only.
- **medication-checker:** Offline cache category label; alias of drug-check conceptually.
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

