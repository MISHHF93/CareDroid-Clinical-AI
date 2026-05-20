/**
 * Aggregated medical-tool references found by scanning this repository.
 * NOT an external 188-tool import — this is everything grep/code search locates today.
 *
 * Canonical NLU: backend/.../patterns/tool.patterns.ts
 * Canonical UI: src/data/toolRegistry.js, src/pages/tools/Calculators.jsx
 * Canonical executors: tool-orchestrator.service.ts (3 registered tools)
 */

import toolRegistry from './toolRegistry';
import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  chatAndAiCapabilities,
  clinicalDataApis,
  emergencyCapabilities,
  platformFeatures,
} from './platformCapabilitiesCatalog';
import { emergencyPatternGroups } from './emergencyPatternCatalog';
import {
  offlineClinicalFeatures,
  workspaceTemplateCatalog,
} from './clinicalCatalogWiring';
import { nluCalculatorHubOnly } from './clinicalIntentToolCatalog';

/**
 * Phantom / roadmap IDs referenced in cost tracking, NLU recommendations, or tests
 * but with NO page, NO orchestrator, and NO tool.patterns entry.
 */
export const phantomToolReferences = [
  {
    id: 'abc-assessment',
    name: 'ABC Emergency Assessment',
    source: 'src/services/advancedRecommendationService.js, src/contexts/CostTrackingContext.jsx',
    status: 'phantom',
    category: 'emergency',
    notes: 'Recommended for emergency_assessment intent; no UI or backend executor.',
  },
  {
    id: 'trauma-score',
    name: 'Trauma Severity Score',
    source: 'advancedRecommendationService.js, CostTrackingContext.jsx, WorkspaceContext.test.jsx',
    status: 'phantom',
    category: 'calculator',
    notes: 'Maps to calculators hub in recommendations only; no trauma calculator form.',
  },
  {
    id: 'vitals-monitor',
    name: 'Vitals Monitor',
    source: 'advancedRecommendationService.js, CostTrackingContext.jsx',
    status: 'phantom',
    category: 'monitoring',
    notes: 'POST /api/chat/analyze-vitals exists; no dedicated vitals tool page.',
    relatedApi: 'POST /api/chat/analyze-vitals',
  },
  {
    id: 'bleeding-risk',
    name: 'Bleeding Risk Calculator',
    source: 'CostTrackingContext.jsx',
    status: 'phantom',
    category: 'calculator',
    notes:
      'Cost category id; launch resolves to HAS-BLED registry (/tools/calculators/has-bled) via NLU_TO_REGISTRY_ID + toolIdAliases.',
  },
  {
    id: 'cancer-calculator',
    name: 'Oncology Risk Calculator',
    source: 'advancedRecommendationService.js',
    status: 'phantom',
    category: 'oncology',
    notes: 'NLU recommendations only; not in tool.patterns or Calculators.jsx.',
  },
  {
    id: 'tumor-staging',
    name: 'Tumor Staging Guide',
    source: 'advancedRecommendationService.js, CostTrackingContext.jsx',
    status: 'phantom',
    category: 'oncology',
    notes: 'Recommendation + cost tracking only.',
  },
  {
    id: 'chemo-calculator',
    name: 'Chemotherapy Dosing Calculator',
    source: 'advancedRecommendationService.js, CostTrackingContext.jsx',
    status: 'phantom',
    category: 'oncology',
    notes: 'Recommendation + cost tracking only.',
  },
  {
    id: 'antibiotic-scripts',
    name: 'Antibiotic Scripts',
    source: 'advancedRecommendationService.js, CostTrackingContext.jsx',
    status: 'phantom',
    category: 'medication',
    notes: 'Overlaps NLU antibiotic-guide → diagnosis page; separate id unused in UI.',
  },
  {
    id: 'medication-checker',
    name: 'Medication Checker (offline label)',
    source: 'src/contexts/OfflineProvider.jsx, OfflineSupport.jsx',
    status: 'phantom',
    category: 'medication',
    notes: 'Offline cache category label; alias of drug-check conceptually.',
  },
];

/** Marketing / legal copy not backed by code */
export const marketingOnlyMentions = [];

/** ID aliases (same capability, different string in tests vs registry) */
export const toolIdAliases = [
  { id: 'drug-checker', mapsTo: 'drug-check', source: 'CostTrackingContext, advancedRecommendationService' },
  {
    id: 'drug-interaction-checker',
    mapsTo: 'drug-check',
    source: 'e2e tests, ToolCard; NLU executor id drug-interactions → registry drug-check',
  },
  { id: 'drug-interactions', mapsTo: 'drug-check', source: 'tool.patterns vs registry drug-check' },
  { id: 'lab-interpreter', mapsTo: 'lab-interp', source: 'Throughout backend + frontend' },
  { id: 'sofa-calculator', mapsTo: 'sofa-score', source: 'Orchestrator id vs registry id' },
  { id: 'quick-sofa', mapsTo: 'qsofa', source: 'NLU alias — quick sofa' },
  { id: 'quick-sepsis-score', mapsTo: 'qsofa', source: 'NLU alias — quick sepsis score' },
  { id: 'sepsis-bedside-score', mapsTo: 'qsofa', source: 'NLU alias — sepsis bedside score' },
  { id: 'q-sofa', mapsTo: 'qsofa', source: 'NLU alias — q sofa' },
  { id: 'news-2', mapsTo: 'news2', source: 'NLU alias — news 2' },
  { id: 'national-early-warning-score', mapsTo: 'news2', source: 'NLU alias — national early warning score' },
  { id: 'early-warning-score', mapsTo: 'news2', source: 'NLU alias — early warning score' },
  { id: 'deterioration-score', mapsTo: 'news2', source: 'NLU alias — deterioration score' },
  { id: 'ctp-score', mapsTo: 'child-pugh', source: 'NLU alias — ctp score' },
  { id: 'cirrhosis-score', mapsTo: 'child-pugh', source: 'NLU alias — cirrhosis score' },
  { id: 'liver-severity-score', mapsTo: 'child-pugh', source: 'NLU alias — liver severity score' },
  { id: 'hasbled', mapsTo: 'has-bled', source: 'NLU alias — hasbled' },
  { id: 'af-bleeding-risk', mapsTo: 'has-bled', source: 'NLU alias — af bleeding risk' },
  {
    id: 'anticoagulation-bleeding-risk',
    mapsTo: 'has-bled',
    source: 'NLU alias — anticoagulation bleeding risk',
  },
  { id: 'sofa_calculator', mapsTo: 'sofa-calculator', source: 'ai.service.ts OpenAI function name, Android' },
  { id: 'calculator', mapsTo: 'calculators', source: 'advancedRecommendationService intent map' },
  { id: 'diagnosis-assistant', mapsTo: 'diagnosis', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'procedure-guide', mapsTo: 'procedures', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'protocol-lookup', mapsTo: 'protocols', source: 'NLU id vs registry' },
  {
    id: 'bleeding-risk',
    mapsTo: 'has-bled',
    source: 'CostTrackingContext — canonical UI is HAS-BLED (see NLU_TO_REGISTRY_ID)',
  },
  { id: 'meld-score', mapsTo: 'meld', source: 'NLU alias — meld score' },
  { id: 'liver-transplant-score', mapsTo: 'meld-na', source: 'NLU alias — liver transplant score' },
  { id: 'meld-sodium', mapsTo: 'meld-na', source: 'NLU alias — meld sodium / meld na' },
  {
    id: 'end-stage-liver-disease-score',
    mapsTo: 'meld',
    source: 'NLU alias — end stage liver disease score',
  },
  { id: 'timi', mapsTo: 'timi-ua-nstemi', source: 'NLU alias — timi' },
  { id: 'timi-score', mapsTo: 'timi-ua-nstemi', source: 'NLU alias — timi score' },
  { id: 'timi-acs', mapsTo: 'timi-ua-nstemi', source: 'NLU alias — timi acs' },
  { id: 'timi-nstemi', mapsTo: 'timi-ua-nstemi', source: 'NLU alias — timi nstemi' },
  { id: 'timi-unstable-angina', mapsTo: 'timi-ua-nstemi', source: 'NLU alias — timi unstable angina' },
  { id: 'wells-pe-score', mapsTo: 'wells-pe', source: 'NLU alias — wells pe / pe score' },
  { id: 'pulmonary-embolism-wells', mapsTo: 'wells-pe', source: 'NLU alias — pulmonary embolism wells' },
  { id: 'wells-pulmonary-embolism', mapsTo: 'wells-pe', source: 'NLU alias — wells pulmonary embolism' },
  { id: 'pe-score', mapsTo: 'wells-pe', source: 'NLU alias — pe score (Wells PE context)' },
  { id: 'perc-rule', mapsTo: 'perc', source: 'NLU alias — perc rule' },
  { id: 'pe-rule-out', mapsTo: 'perc', source: 'NLU alias — pe rule out' },
  { id: 'pulmonary-embolism-rule-out', mapsTo: 'perc', source: 'NLU alias — pulmonary embolism rule out' },
  { id: 'grace-score', mapsTo: 'grace-acs', source: 'NLU alias — grace score' },
  { id: 'grace-acs-risk', mapsTo: 'grace-acs', source: 'NLU alias — grace acs risk' },
  { id: 'acs-mortality-risk', mapsTo: 'grace-acs', source: 'NLU alias — acs mortality risk' },
  {
    id: 'acute-coronary-syndrome-risk',
    mapsTo: 'grace-acs',
    source: 'NLU alias — acute coronary syndrome risk',
  },
  { id: 'nih-stroke-scale', mapsTo: 'nihss', source: 'NLU alias — nih stroke scale' },
  {
    id: 'national-institutes-of-health-stroke-scale',
    mapsTo: 'nihss',
    source: 'NLU alias — national institutes of health stroke scale',
  },
  { id: 'stroke-scale', mapsTo: 'nihss', source: 'NLU alias — stroke scale' },
  { id: 'stroke-severity-score', mapsTo: 'nihss', source: 'NLU alias — stroke severity score' },
  { id: 'canadian-c-spine-rule', mapsTo: 'canadian-c-spine', source: 'NLU alias — canadian c-spine rule' },
  { id: 'c-spine-rule', mapsTo: 'canadian-c-spine', source: 'NLU alias — c spine rule' },
  { id: 'cervical-spine-rule', mapsTo: 'canadian-c-spine', source: 'NLU alias — cervical spine rule' },
  {
    id: 'neck-trauma-imaging-rule',
    mapsTo: 'canadian-c-spine',
    source: 'NLU alias — neck trauma imaging rule',
  },
  { id: 'ottawa-ankle-rule', mapsTo: 'ottawa-ankle', source: 'NLU alias — ottawa ankle rule' },
  { id: 'ankle-xray-rule', mapsTo: 'ottawa-ankle', source: 'NLU alias — ankle xray rule' },
  { id: 'ankle-injury-imaging', mapsTo: 'ottawa-ankle', source: 'NLU alias — ankle injury imaging' },
  { id: 'foot-xray-rule', mapsTo: 'ottawa-ankle', source: 'NLU alias — foot xray rule' },
  { id: 'ascvd', mapsTo: 'ascvd-risk', source: 'NLU alias — ascvd' },
  { id: 'cardiovascular-risk', mapsTo: 'ascvd-risk', source: 'NLU alias — cardiovascular risk' },
  { id: 'heart-disease-risk', mapsTo: 'ascvd-risk', source: 'NLU alias — heart disease risk' },
  { id: 'cv-risk', mapsTo: 'ascvd-risk', source: 'NLU alias — cv risk' },
  { id: 'ascvd-score', mapsTo: 'ascvd-risk', source: 'NLU alias — ascvd score' },
  { id: 'heart-score', mapsTo: 'heart-score', source: 'NLU — HEART chest pain score' },
  { id: 'centor-score', mapsTo: 'centor-mcisaac', source: 'NLU alias — centor score' },
  { id: 'mcisaac-score', mapsTo: 'centor-mcisaac', source: 'NLU alias — mcisaac score' },
  { id: 'bishop-score', mapsTo: 'bishop-score', source: 'NLU — Bishop score' },
  { id: 'apgar-score', mapsTo: 'apgar-score', source: 'NLU — Apgar score' },
  { id: 'braden-scale', mapsTo: 'braden-scale', source: 'NLU — Braden scale' },
  { id: 'morse-fall-scale', mapsTo: 'morse-fall-scale', source: 'NLU — Morse Fall Scale' },
  { id: 'ranson-criteria', mapsTo: 'ranson-criteria', source: 'NLU — Ranson criteria' },
  { id: 'bisap-score', mapsTo: 'bisap-score', source: 'NLU — BISAP score' },
  { id: 'fib-4', mapsTo: 'fib4', source: 'NLU alias — fib-4' },
  { id: 'framingham-risk', mapsTo: 'framingham-risk', source: 'NLU — Framingham CHD risk' },
  { id: 'framingham-score', mapsTo: 'framingham-risk', source: 'NLU alias — framingham score' },
  { id: 'ckd-stage', mapsTo: 'ckd-staging', source: 'NLU alias — ckd stage' },
  { id: 'kidney-stage', mapsTo: 'ckd-staging', source: 'NLU alias — kidney stage' },
  { id: 'kidney-disease-staging', mapsTo: 'ckd-staging', source: 'NLU alias — kidney disease staging' },
  { id: 'gfr-stage', mapsTo: 'ckd-staging', source: 'NLU alias — gfr stage' },
  { id: 'albuminuria-stage', mapsTo: 'ckd-staging', source: 'NLU alias — albuminuria stage' },
  { id: 'stop-bang', mapsTo: 'stop-bang', source: 'NLU alias — stop bang' },
  { id: 'sleep-apnea-score', mapsTo: 'stop-bang', source: 'NLU alias — sleep apnea score' },
  { id: 'osa-risk', mapsTo: 'stop-bang', source: 'NLU alias — osa risk' },
  { id: 'sleep-risk-score', mapsTo: 'stop-bang', source: 'NLU alias — sleep risk score' },
  { id: 'audit-c', mapsTo: 'audit-c', source: 'NLU alias — audit c' },
  { id: 'alcohol-screen', mapsTo: 'audit-c', source: 'NLU alias — alcohol screen' },
  { id: 'alcohol-use-screen', mapsTo: 'audit-c', source: 'NLU alias — alcohol use screen' },
  { id: 'drinking-screen', mapsTo: 'audit-c', source: 'NLU alias — drinking screen' },
  { id: 'phq9', mapsTo: 'phq9', source: 'NLU alias — phq9' },
  { id: 'phq-9', mapsTo: 'phq9', source: 'NLU alias — phq-9' },
  { id: 'depression-screen', mapsTo: 'phq9', source: 'NLU alias — depression screen' },
  { id: 'depression-questionnaire', mapsTo: 'phq9', source: 'NLU alias — depression questionnaire' },
  { id: 'mood-screen', mapsTo: 'phq9', source: 'NLU alias — mood screen' },
  { id: 'gad7', mapsTo: 'gad7', source: 'NLU alias — gad7' },
  { id: 'gad-7', mapsTo: 'gad7', source: 'NLU alias — gad-7' },
  { id: 'anxiety-screen', mapsTo: 'gad7', source: 'NLU alias — anxiety screen' },
  { id: 'anxiety-questionnaire', mapsTo: 'gad7', source: 'NLU alias — anxiety questionnaire' },
  {
    id: 'generalized-anxiety-screen',
    mapsTo: 'gad7',
    source: 'NLU alias — generalized anxiety screen',
  },
  { id: 'copd-gold', mapsTo: 'copd-gold', source: 'NLU alias — copd gold' },
  { id: 'gold-copd', mapsTo: 'copd-gold', source: 'NLU alias — gold copd' },
  { id: 'copd-assessment', mapsTo: 'copd-gold', source: 'NLU alias — copd assessment' },
  { id: 'copd-risk', mapsTo: 'copd-gold', source: 'NLU alias — copd risk' },
  { id: 'gold-classification', mapsTo: 'copd-gold', source: 'NLU alias — gold classification' },
  { id: 'rome-iv-ibs', mapsTo: 'rome-iv-ibs', source: 'NLU alias — rome iv ibs' },
  { id: 'rome-iv', mapsTo: 'rome-iv-ibs', source: 'NLU alias — rome iv' },
  { id: 'ibs-criteria', mapsTo: 'rome-iv-ibs', source: 'NLU alias — ibs criteria' },
  {
    id: 'irritable-bowel-syndrome-criteria',
    mapsTo: 'rome-iv-ibs',
    source: 'NLU alias — irritable bowel syndrome criteria',
  },
  { id: 'fleet-command', mapsTo: 'fleet-command', source: 'NLU alias — fleet command' },
  { id: 'fleet-dashboard', mapsTo: 'fleet-command', source: 'NLU alias — fleet dashboard' },
  { id: 'fleet-overview', mapsTo: 'fleet-command', source: 'NLU alias — fleet overview' },
  {
    id: 'predictive-maintenance',
    mapsTo: 'predictive-maintenance',
    source: 'NLU alias — predictive maintenance',
  },
  {
    id: 'maintenance-assistant',
    mapsTo: 'predictive-maintenance',
    source: 'NLU alias — maintenance assistant',
  },
  {
    id: 'fleet-maintenance-risk',
    mapsTo: 'predictive-maintenance',
    source: 'NLU alias — fleet maintenance risk',
  },
  { id: 'route-optimizer', mapsTo: 'route-optimizer', source: 'NLU alias — route optimizer' },
  {
    id: 'route-optimization',
    mapsTo: 'route-optimizer',
    source: 'NLU alias — route optimization',
  },
  {
    id: 'fleet-route-planner',
    mapsTo: 'route-optimizer',
    source: 'NLU alias — fleet route planner',
  },
  { id: 'dispatch-ai', mapsTo: 'dispatch-ai', source: 'NLU alias — dispatch ai' },
  { id: 'dispatch', mapsTo: 'dispatch-ai', source: 'NLU alias — dispatch' },
  {
    id: 'dispatch-assistant',
    mapsTo: 'dispatch-ai',
    source: 'NLU alias — dispatch assistant',
  },
  {
    id: 'vehicle-dispatch',
    mapsTo: 'dispatch-ai',
    source: 'NLU alias — vehicle dispatch',
  },
  { id: 'fleet-dispatch', mapsTo: 'dispatch-ai', source: 'NLU alias — fleet dispatch' },
  {
    id: 'dispatch-intelligence',
    mapsTo: 'dispatch-ai',
    source: 'NLU alias — dispatch intelligence',
  },
];

/** Client-side clinical helpers on tool pages and chat */
export const clientClinicalCapabilities = [
  {
    id: 'compute-risk-score',
    name: 'Risk score engine',
    source: 'src/utils/riskScoring.js',
    status: 'client',
    category: 'clinical',
    path: '/tools',
    notes: 'computeRiskScore(), categorizeRiskSeverity() — used by ToolPageLayout on all tool pages.',
  },
  {
    id: 'generate-clinical-alerts',
    name: 'Clinical alerts generator',
    source: 'src/utils/riskScoring.js',
    status: 'client',
    category: 'clinical',
    path: '/tools',
    notes: 'generateClinicalAlerts() from tool results + risk data.',
  },
  {
    id: 'build-clinical-insights',
    name: 'Clinical insights builder',
    source: 'src/utils/clinicalInsights.js',
    status: 'client',
    category: 'clinical',
    path: '/tools',
    notes: 'buildClinicalInsights() — severity, alerts, recommendations from tool output.',
  },
  {
    id: 'viz-drug-interaction',
    name: 'Visualization: drug interaction',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Chat/tool viz type drug-interaction',
  },
  {
    id: 'viz-calculator',
    name: 'Visualization: calculator',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Chat/tool viz type calculator',
  },
  {
    id: 'viz-protocol',
    name: 'Visualization: protocol',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Chat/tool viz type protocol',
  },
  {
    id: 'viz-lab-order',
    name: 'Visualization: lab order',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Chat/tool viz type lab-order',
  },
  {
    id: 'viz-vitals',
    name: 'Visualization: vitals',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Chat/tool viz type vitals',
  },
  {
    id: 'viz-anomaly-detection',
    name: 'Visualization: anomaly detection',
    source: 'src/components/ToolVisualization.jsx',
    status: 'client',
    category: 'clinical',
    path: '/dashboard',
    notes: 'Ties to chat.service anomalyDetection config and AnomalyBanner.jsx',
  },
  {
    id: 'tool-result-share',
    name: 'Tool result share / export',
    source: 'src/components/tools/ToolResultShare.jsx',
    status: 'client',
    category: 'collaboration',
    path: '/tools',
    notes: 'Share tool outputs from ToolPageLayout.',
  },
];

/** Tool orchestrator REST surface beyond execute */
export const orchestratorApiCapabilities = [
  {
    id: 'tools-list',
    name: 'List registered tools',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'GET /api/tools',
    notes: 'Used by clinicalToolsApi.js fetchBackendClinicalTools',
  },
  {
    id: 'tools-available',
    name: 'List tier-available tools',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'GET /api/tools/available',
    notes: 'Subscription-tier filtered tool list',
  },
  {
    id: 'tools-get-metadata',
    name: 'Tool metadata by ID',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'GET /api/tools/:id',
    notes: 'Parameter schema and metadata',
  },
  {
    id: 'tools-validate',
    name: 'Validate tool parameters',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'POST /api/tools/:id/validate',
    notes: 'Pre-execution validation',
  },
  {
    id: 'tools-execute',
    name: 'Execute clinical tool',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'POST /api/tools/:id/execute',
    notes: 'SOFA, drug-interactions, lab-interpreter',
  },
  {
    id: 'tools-statistics',
    name: 'Tool usage statistics',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'GET /api/tools/statistics',
    notes: 'Aggregated execution stats',
  },
  {
    id: 'tools-results',
    name: 'Store / query tool results',
    source: 'tool-orchestrator.controller.ts',
    status: 'orchestrator',
    category: 'api',
    apiPath: 'POST /api/tools/results',
    notes: 'Persisted tool result entities',
  },
];

/** NLU routing intents (before tool selection) */
export const routingCapabilities = [
  {
    id: 'intent-emergency',
    name: 'Primary intent: EMERGENCY',
    source: 'intent-classification.dto.ts',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'Phase 0 emergency keyword scan; may block or escalate before clinical tools.',
  },
  {
    id: 'intent-clinical-tool',
    name: 'Primary intent: CLINICAL_TOOL',
    source: 'intent-classification.dto.ts',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'Routes to one of 15 tool.patterns profiles.',
  },
  {
    id: 'intent-medical-reference',
    name: 'Primary intent: MEDICAL_REFERENCE',
    source: 'intent-classification.dto.ts',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'RAG + general medical Q&A.',
  },
  {
    id: 'intent-administrative',
    name: 'Primary intent: ADMINISTRATIVE',
    source: 'intent-classification.dto.ts',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'Non-clinical app questions.',
  },
  {
    id: 'intent-general-query',
    name: 'Primary intent: GENERAL_QUERY',
    source: 'intent-classification.dto.ts',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'Fallback conversational intent.',
  },
  {
    id: 'chat-feature-param',
    name: 'Chat feature parameter',
    source: 'chat.controller.ts ChatMessageDto',
    status: 'routing',
    category: 'nlu',
    path: '/dashboard',
    notes: 'POST /api/chat/message accepts feature?: string (featureInventory ids).',
  },
  {
    id: 'chat-rag-context',
    name: 'RAG citations in chat',
    source: 'chat.service.ts, rag module',
    status: 'routing',
    category: 'ai',
    path: '/dashboard',
    apiPath: 'Embedded in POST /api/chat/message response.ragContext',
    notes: 'Medical source citations and chunk counts on chat responses.',
  },
];

/** Collaboration and clinical-adjacent routes */
export const collaborationCapabilities = [
  {
    id: 'shared-tool-session',
    name: 'Shared tool session',
    source: 'src/pages/tools/SharedToolSession.jsx',
    status: 'collaboration',
    category: 'collaboration',
    path: '/shared/tools/:shareId',
    notes: 'Public read-only link to a shared tool session (local storage).',
  },
  {
    id: 'cost-analytics-dashboard',
    name: 'Cost analytics (per tool)',
    source: 'src/pages/CostAnalyticsDashboard.jsx, CostTrackingContext.jsx',
    status: 'collaboration',
    category: 'analytics',
    path: '/costs',
    notes: 'Tracks per-tool execution costs including phantom IDs.',
  },
  {
    id: 'clinical-analytics',
    name: 'Clinical analytics',
    source: 'src/App.jsx route /analytics',
    status: 'collaboration',
    category: 'analytics',
    path: '/analytics',
    notes: 'Usage analytics dashboard.',
  },
  {
    id: 'android-clinical-tools',
    name: 'Android clinical tools client',
    source: 'android/.../ToolsDto.kt, CareDroidApiService.kt',
    status: 'collaboration',
    category: 'mobile',
    path: null,
    notes: 'Same 3 API tools: drug check, lab interpreter, SOFA — not additional web calculators.',
  },
];

function workspaceRows() {
  return workspaceTemplateCatalog.map((w) => ({
    id: w.id,
    name: w.name,
    source: w.source,
    status: 'configuration',
    category: 'workspace',
    path: '/tools',
    notes: `Tools: ${w.toolIds.join(', ')}`,
    toolIds: w.toolIds,
  }));
}

function offlineRows() {
  return offlineClinicalFeatures.map((f) => ({
    id: f.id,
    name: f.name,
    source: 'OfflineProvider.jsx',
    status: 'configuration',
    category: 'platform',
    path: '/settings',
    notes: `Maps to: ${f.mapsTo}`,
  }));
}

function nluHubOnlyRows() {
  return nluCalculatorHubOnly.map((c) => ({
    id: c.toolId,
    name: `${c.name} (NLU hub)`,
    source: 'clinicalIntentToolCatalog.nluCalculatorHubOnly',
    status: 'nlu-chat',
    category: 'chat-assisted',
    path: c.hubPath,
    chatOnly: true,
    notes: 'No Calculators.jsx form — launch via guided chat from calculators hub',
  }));
}

function aliasRows() {
  return toolIdAliases.map((a) => ({
    id: a.id,
    name: `Alias: ${a.id}`,
    source: a.source,
    status: 'alias',
    category: 'alias',
    mapsTo: a.mapsTo,
    notes: `Canonical id: ${a.mapsTo}`,
  }));
}

function platformRows() {
  return platformFeatures.map((item) => ({
    id: item.id,
    name: item.name,
    source: 'src/data/featureInventory.js',
    status: 'platform',
    category: item.category?.toLowerCase() || 'platform',
    type: item.type,
    path: item.path,
    notes: item.description,
  }));
}

function emergencyPatternRows() {
  return emergencyPatternGroups.map((g) => ({
    id: g.id,
    name: g.name,
    source: g.source,
    status: 'emergency-pattern',
    category: g.category,
    severity: g.severity,
    protocolReference: g.protocolReference,
    path: '/clinical/alerts',
    notes: `Keywords e.g. ${g.sampleKeywords}. Runs on every chat message.`,
  }));
}

function registryRows() {
  return toolRegistry.map((t) => ({
    id: t.id,
    name: t.name,
    source: 'src/data/toolRegistry.js',
    status: t.path?.includes('/calculator/') ? 'shipped-calculator' : 'shipped-page',
    category: t.category?.toLowerCase() || 'tool',
    path: t.path,
    notes: 'Sidebar / suite shortcut',
  }));
}

function calculatorRows() {
  return builtinUiCalculators.map((c) => ({
    id: c.id,
    name: c.name,
    source: 'src/pages/tools/Calculators.jsx',
    status: c.orchestratorId ? 'shipped-calculator' : 'shipped-calculator',
    category: 'calculator',
    path: c.path,
    orchestratorId: c.orchestratorId,
    notes: c.orchestratorId
      ? `${c.implementation} · POST executor registered separately (sofa-calculator)`
      : c.implementation,
  }));
}

function nluRows() {
  return clinicalIntentTools.map((t) => ({
    id: t.toolId,
    name: t.toolName,
    source: 'backend/.../tool.patterns.ts (mirrored clinicalIntentToolCatalog.js)',
    status: t.backendExecutable ? 'backend-executor' : 'nlu-chat',
    category: t.category,
    path: t.path,
    chatOnly: !t.path,
    notes: t.path ? 'NLU + dedicated or shared page' : 'NLU only — chat / AI',
  }));
}

function apiCapabilityRows() {
  return [
    ...chatAndAiCapabilities.map((r) => ({
      id: r.id,
      name: r.name,
      source: 'backend chat + ai modules',
      status: 'chat-api',
      category: r.category,
      path: r.path,
      apiPath: r.apiPath,
      notes: r.description,
    })),
    ...clinicalDataApis.map((r) => ({
      id: r.id,
      name: r.name,
      source: 'backend drugs + protocols modules',
      status: 'chat-api',
      category: r.category,
      path: r.path,
      apiPath: r.apiPath,
      notes: r.description,
    })),
    ...emergencyCapabilities.map((r) => ({
      id: r.id,
      name: r.name,
      source: 'emergency.patterns.ts + ClinicalAlertsPage',
      status: 'chat-api',
      category: r.category,
      path: r.path,
      notes: r.description,
    })),
  ];
}

function mergeRows(rows) {
  const byId = new Map();
  for (const row of rows) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      continue;
    }
    byId.set(row.id, {
      ...existing,
      ...row,
      notes: [existing.notes, row.notes].filter(Boolean).join(' · '),
      sources: [...(existing.sources || [existing.source]), row.source].filter(Boolean),
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Flat deduplicated list for catalog tables */
export function getAllDiscoveredTools() {
  return mergeRows([
    ...registryRows(),
    ...calculatorRows(),
    ...nluRows(),
    ...phantomToolReferences,
    ...marketingOnlyMentions,
    ...apiCapabilityRows(),
    ...clientClinicalCapabilities,
    ...orchestratorApiCapabilities,
    ...routingCapabilities,
    ...collaborationCapabilities,
    ...emergencyPatternRows(),
    ...platformRows(),
    ...aliasRows(),
    ...workspaceRows(),
    ...offlineRows(),
    ...nluHubOnlyRows(),
  ]);
}

export function getSourceCodeDiscoverySummary() {
  const all = getAllDiscoveredTools();
  const count = (status) => all.filter((r) => r.status === status).length;
  return {
    totalUniqueIds: all.length,
    shippedPages: count('shipped-page'),
    shippedCalculators: count('shipped-calculator'),
    backendExecutors: count('backend-executor'),
    nluProfiles: clinicalIntentTools.length,
    chatApis: count('chat-api'),
    phantomOrPlanned: phantomToolReferences.length,
    marketingOnly: marketingOnlyMentions.length,
    aliases: toolIdAliases.length,
    clientCapabilities: clientClinicalCapabilities.length,
    orchestratorApis: orchestratorApiCapabilities.length,
    routingIntents: routingCapabilities.length,
    emergencyPatterns: emergencyPatternGroups.length,
    platformFeatures: platformFeatures.length,
    collaboration: collaborationCapabilities.length,
    nluPatternCount: clinicalIntentTools.length,
    orchestratorExecutorCount: 3,
    externalCatalogInRepo: 0,
  };
}

export const SOURCE_SCAN_LOCATIONS = [
  { label: 'NLU clinical tools', path: 'backend/.../tool.patterns.ts', count: 24 },
  { label: 'Backend executors', path: 'backend/.../tool-orchestrator/', count: 3 },
  { label: 'Calculator UI slugs', path: 'src/pages/tools/Calculators.jsx', count: 8 },
  { label: 'Sidebar registry', path: 'src/data/toolRegistry.js', count: toolRegistry.length },
  { label: 'Emergency NLU patterns', path: 'src/data/emergencyPatternCatalog.js', count: emergencyPatternGroups.length },
  { label: 'Phantom / roadmap IDs', path: 'CostTrackingContext, advancedRecommendationService', count: phantomToolReferences.length },
  { label: 'Client clinical helpers', path: 'riskScoring.js, clinicalInsights.js, ToolVisualization.jsx', count: clientClinicalCapabilities.length },
  { label: 'Orchestrator API endpoints', path: 'tool-orchestrator.controller.ts', count: orchestratorApiCapabilities.length },
  { label: 'Platform features', path: 'src/data/featureInventory.js', count: platformFeatures.length },
  { label: 'ID aliases', path: 'sourceCodeToolDiscovery.toolIdAliases', count: toolIdAliases.length },
];
