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
    notes: 'Cost category only; HAS-BLED mentioned in TermsOfService, not implemented.',
  },
  {
    id: 'cancer-calculator',
    name: 'Oncology Risk Calculator',
    source: 'advancedRecommendationService.js, PHASE_3_ARCHITECTURE.md',
    status: 'phantom',
    category: 'oncology',
    notes: 'Documented in phase docs; not in tool.patterns or Calculators.jsx.',
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
export const marketingOnlyMentions = [
  {
    id: 'qsofa',
    name: 'qSOFA',
    source: 'src/pages/legal/TermsOfService.jsx, toolRecommendations.js',
    status: 'marketing-copy',
    category: 'calculator',
    notes: 'Keyword routes to SOFA sidebar entry; no qSOFA-specific calculator UI.',
    mapsTo: 'sofa-score',
  },
  {
    id: 'has-bled',
    name: 'HAS-BLED',
    source: 'src/pages/legal/TermsOfService.jsx',
    status: 'marketing-copy',
    category: 'calculator',
    notes: 'Listed in terms; not in Calculators.jsx or tool.patterns.',
  },
];

/** ID aliases (same capability, different string in tests vs registry) */
export const toolIdAliases = [
  { id: 'drug-checker', mapsTo: 'drug-check', source: 'CostTrackingContext, advancedRecommendationService' },
  {
    id: 'drug-interaction-checker',
    mapsTo: 'drug-interactions',
    source: 'e2e tests, ToolCard; executor metadata id drug-interactions',
  },
  { id: 'drug-interactions', mapsTo: 'drug-check', source: 'tool.patterns vs registry drug-check' },
  { id: 'lab-interpreter', mapsTo: 'lab-interp', source: 'Throughout backend + frontend' },
  { id: 'sofa-calculator', mapsTo: 'sofa-score', source: 'Orchestrator id vs registry id' },
  { id: 'sofa_calculator', mapsTo: 'sofa-calculator', source: 'ai.service.ts OpenAI function name, Android' },
  { id: 'calculator', mapsTo: 'calculators', source: 'advancedRecommendationService intent map' },
  { id: 'diagnosis-assistant', mapsTo: 'diagnosis', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'procedure-guide', mapsTo: 'procedures', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'protocol-lookup', mapsTo: 'protocols', source: 'NLU id vs registry' },
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
    category: 'calculator',
    path: c.hubPath,
    notes: 'No Calculators.jsx form — launch via chat from catalog',
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
    status: c.orchestratorId ? 'backend-executor' : 'shipped-calculator',
    category: 'calculator',
    path: c.path,
    orchestratorId: c.orchestratorId,
    notes: c.implementation,
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
  { label: 'NLU clinical tools', path: 'backend/.../tool.patterns.ts', count: 15 },
  { label: 'Backend executors', path: 'backend/.../tool-orchestrator/', count: 3 },
  { label: 'Calculator UI slugs', path: 'src/pages/tools/Calculators.jsx', count: 4 },
  { label: 'Sidebar registry', path: 'src/data/toolRegistry.js', count: toolRegistry.length },
  { label: 'Emergency NLU patterns', path: 'src/data/emergencyPatternCatalog.js', count: emergencyPatternGroups.length },
  { label: 'Phantom / roadmap IDs', path: 'CostTrackingContext, advancedRecommendationService', count: phantomToolReferences.length },
  { label: 'Client clinical helpers', path: 'riskScoring.js, clinicalInsights.js, ToolVisualization.jsx', count: clientClinicalCapabilities.length },
  { label: 'Orchestrator API endpoints', path: 'tool-orchestrator.controller.ts', count: orchestratorApiCapabilities.length },
  { label: 'Platform features', path: 'src/data/featureInventory.js', count: platformFeatures.length },
  { label: 'ID aliases', path: 'sourceCodeToolDiscovery.toolIdAliases', count: toolIdAliases.length },
];
