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
import { chatAndAiCapabilities, clinicalDataApis, emergencyCapabilities } from './platformCapabilitiesCatalog';

/** @typedef {'shipped-page'|'shipped-calculator'|'backend-executor'|'nlu-chat'|'chat-api'|'phantom'|'alias'|'marketing-copy'} DiscoveryStatus */

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
  { id: 'drug-interactions', mapsTo: 'drug-check / sofa-calculator executor', source: 'tool.patterns vs registry' },
  { id: 'lab-interpreter', mapsTo: 'lab-interp', source: 'Throughout backend + frontend' },
  { id: 'sofa-calculator', mapsTo: 'sofa-score', source: 'Orchestrator id vs registry id' },
  { id: 'calculator', mapsTo: 'calculators', source: 'advancedRecommendationService intent map' },
  { id: 'diagnosis-assistant', mapsTo: 'diagnosis', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'procedure-guide', mapsTo: 'procedures', source: 'CostTrackingContext TOOL_ID_ALIASES' },
  { id: 'protocol-lookup', mapsTo: 'protocols', source: 'NLU id vs registry' },
];

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
    status: t.backendExecutable ? 'backend-executor' : t.path ? 'nlu-chat' : 'nlu-chat',
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

/** Flat deduplicated list for catalog tables */
export function getAllDiscoveredTools() {
  const rows = [
    ...registryRows(),
    ...calculatorRows(),
    ...nluRows(),
    ...phantomToolReferences,
    ...marketingOnlyMentions,
    ...apiCapabilityRows(),
  ];

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
    nluPatternCount: clinicalIntentTools.length,
    orchestratorExecutorCount: 3,
    /** Honest answer for "188 tools" */
    externalCatalogInRepo: 0,
  };
}

export const SOURCE_SCAN_LOCATIONS = [
  { label: 'NLU clinical tools', path: 'backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts', count: 15 },
  { label: 'Backend executors', path: 'backend/src/modules/medical-control-plane/tool-orchestrator/', count: 3 },
  { label: 'Calculator UI slugs', path: 'src/pages/tools/Calculators.jsx', count: 4 },
  { label: 'Sidebar registry', path: 'src/data/toolRegistry.js', count: toolRegistry.length },
  { label: 'Phantom / roadmap IDs', path: 'CostTrackingContext, advancedRecommendationService', count: phantomToolReferences.length },
  { label: 'Emergency pattern categories', path: 'backend/.../emergency.patterns.ts', count: 6 },
];
