import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { getCanonicalToolInventory } from './toolInventory';

export const DATA_LINEAGE_STAGES = Object.freeze({
  INPUT: 'input',
  AI: 'ai',
  TOOL: 'tool',
  BACKEND: 'backend',
  OUTPUT: 'output',
});

export const DATA_LINEAGE_STAGE_LABELS = Object.freeze({
  [DATA_LINEAGE_STAGES.INPUT]: 'Input',
  [DATA_LINEAGE_STAGES.AI]: 'AI',
  [DATA_LINEAGE_STAGES.TOOL]: 'Tool',
  [DATA_LINEAGE_STAGES.BACKEND]: 'Backend',
  [DATA_LINEAGE_STAGES.OUTPUT]: 'Output',
});

const STAGE_ORDER = Object.values(DATA_LINEAGE_STAGES);

function iso(minutesOffset) {
  return new Date(Date.UTC(2026, 4, 31, 4, minutesOffset, 0)).toISOString();
}

function byId(records) {
  return new Map(records.map((record) => [record.id, record]));
}

function findBackendRoute(endpoint, backendRoutes) {
  if (!endpoint) return null;
  const [method, ...pathParts] = endpoint.split(' ');
  const path = pathParts.join(' ');
  return backendRoutes.find((route) => route.method === method && route.path === path) || null;
}

function findFrontendCall(endpoint, frontendApiCalls) {
  if (!endpoint) return null;
  const [method, ...pathParts] = endpoint.split(' ');
  const path = pathParts.join(' ');
  return frontendApiCalls.find((call) => call.method === method && call.path === path) || null;
}

function lineageStage({ stage, source, transformations = [] as any[], model = null, calculator = null, timestamp, metadata = {} as any }) {
  return {
    stage,
    label: DATA_LINEAGE_STAGE_LABELS[stage],
    source,
    transformations,
    model,
    calculator,
    timestamp,
    metadata,
  };
}

function makeFlow({
  id,
  title,
  category,
  inventoryId,
  endpoint,
  model,
  calculator,
  inputSource,
  output,
  timestamps,
  transformations,
  inventoryRecords,
  backendRoutes,
  frontendApiCalls,
}) {
  const inventory: any = byId(inventoryRecords).get(inventoryId);
  const backendRoute = findBackendRoute(endpoint, backendRoutes);
  const frontendCall = findFrontendCall(endpoint, frontendApiCalls);

  const stages = [
    lineageStage({
      stage: DATA_LINEAGE_STAGES.INPUT,
      source: inputSource,
      transformations: transformations.input,
      timestamp: timestamps.input,
      metadata: {
        route: inventory?.route || inventory?.navigationPath || '—',
        sourceKind: inventory?.sourceKind || 'inventory',
      },
    }),
    lineageStage({
      stage: DATA_LINEAGE_STAGES.AI,
      source: model ? 'CareDroid AI orchestration' : 'No AI model invoked',
      transformations: transformations.ai,
      model,
      timestamp: timestamps.ai,
      metadata: {
        chatSeed: inventory?.chatSeed || null,
        confidencePolicy: model ? 'decision-support, clinician-review-required' : 'not-applicable',
      },
    }),
    lineageStage({
      stage: DATA_LINEAGE_STAGES.TOOL,
      source: inventory?.label || inventoryId,
      transformations: transformations.tool,
      calculator,
      timestamp: timestamps.tool,
      metadata: {
        inventoryId,
        launchType: inventory?.launchType || '—',
        executorStatus: inventory?.executorStatus || '—',
      },
    }),
    lineageStage({
      stage: DATA_LINEAGE_STAGES.BACKEND,
      source: endpoint || 'Local/browser execution',
      transformations: transformations.backend,
      timestamp: timestamps.backend,
      metadata: {
        apiClient: frontendCall?.client || inventory?.apiClient || '—',
        controller: backendRoute?.controller || '—',
        service: backendRoute?.controller?.replace(/Controller$/, 'Service') || '—',
      },
    }),
    lineageStage({
      stage: DATA_LINEAGE_STAGES.OUTPUT,
      source: output.source,
      transformations: transformations.output,
      timestamp: timestamps.output,
      metadata: {
        output: output.summary,
        retention: output.retention,
      },
    }),
  ];

  return {
    id,
    title,
    category,
    inventoryId,
    endpoint,
    model,
    calculator,
    source: inputSource,
    output: output.summary,
    stages,
    transformations: stages.flatMap((stage) => stage.transformations),
    timestamps: {
      firstSeen: timestamps.input,
      completedAt: timestamps.output,
    },
  };
}

export function buildDataLineageExplorer({
  inventoryRecords = getCanonicalToolInventory(),
  backendRoutes = BACKEND_HTTP_ROUTES,
  frontendApiCalls = FRONTEND_API_CALLS,
}: any = {}) {
  const flows = [
    makeFlow({
      id: 'guideline-rag-trace',
      title: 'Guideline RAG Evidence Answer',
      category: 'AI extension',
      inventoryId: 'guideline-rag',
      endpoint: 'POST /api/clinical-intelligence/guideline-rag/query',
      model: 'CareDroid Guideline RAG demo model',
      calculator: null,
      inputSource: 'Clinician question + selected specialty context',
      output: {
        source: 'Cited guideline summary',
        summary: 'Evidence-backed answer with citations, confidence, and safety limitations.',
        retention: 'Sanitized trace only; raw prompt and PHI excluded.',
      },
      timestamps: { input: iso(0), ai: iso(1), tool: iso(2), backend: iso(3), output: iso(4) },
      transformations: {
        input: ['Normalize clinical question', 'Remove unsupported PHI fields', 'Attach specialty filter'],
        ai: ['Retrieve guideline snippets', 'Rank evidence by relevance', 'Generate cited summary'],
        tool: ['Map request to guideline-rag inventory record', 'Apply clinician-review safety copy'],
        backend: ['POST request via clinicalIntelligenceApi', 'Controller validates query DTO'],
        output: ['Return answer with citations', 'Expose confidence and source limitations'],
      },
      inventoryRecords,
      backendRoutes,
      frontendApiCalls,
    }),
    makeFlow({
      id: 'news2-calculator-trace',
      title: 'NEWS2 Calculator Escalation Context',
      category: 'Calculator',
      inventoryId: 'news2',
      endpoint: null,
      model: null,
      calculator: 'NEWS2',
      inputSource: 'Vitals entered by clinician',
      output: {
        source: 'Local calculator result panel',
        summary: 'NEWS2 score, risk band, and escalation context without diagnostic certainty.',
        retention: 'Local form state; optional offline tool result if saved.',
      },
      timestamps: { input: iso(8), ai: iso(8), tool: iso(9), backend: iso(9), output: iso(10) },
      transformations: {
        input: ['Validate numeric vitals', 'Mark incomplete or invalid fields'],
        ai: ['No AI model used for scoring'],
        tool: ['Apply NEWS2 scoring rules', 'Create risk interpretation and safety footer'],
        backend: ['No backend call; browser-local calculation'],
        output: ['Render score panel', 'Label result as decision support only'],
      },
      inventoryRecords,
      backendRoutes,
      frontendApiCalls,
    }),
    makeFlow({
      id: 'order-set-ai-trace',
      title: 'Order Set AI Draft',
      category: 'AI workflow',
      inventoryId: 'order-set-ai',
      endpoint: 'POST /api/clinical-intelligence/order-set/generate',
      model: 'CareDroid Order Set AI demo model',
      calculator: 'Recommended calculators from inventory context',
      inputSource: 'Clinical scenario, diagnosis context, patient constraints',
      output: {
        source: 'Draft order bundle response',
        summary: 'Order bundle suggestions, protocol pathways, explainability, and safety warnings.',
        retention: 'Draft only; no orders placed automatically.',
      },
      timestamps: { input: iso(15), ai: iso(16), tool: iso(17), backend: iso(18), output: iso(19) },
      transformations: {
        input: ['Structure scenario fields', 'Attach constraint list', 'Separate missing data'],
        ai: ['Generate candidate order bundles', 'Check safety limitations', 'Attach rationale'],
        tool: ['Link protocol pathway IDs', 'Attach calculator recommendations'],
        backend: ['Validate OrderSetAiRequestDto', 'Return OrderSetAiResponseDto'],
        output: ['Display draft bundles', 'Require clinician review before use'],
      },
      inventoryRecords,
      backendRoutes,
      frontendApiCalls,
    }),
    makeFlow({
      id: 'simulation-protocol-trace',
      title: 'Simulation to Protocol Debrief',
      category: 'Simulation',
      inventoryId: 'simulation-suite',
      endpoint: null,
      model: 'AI tutor debrief model',
      calculator: 'qSOFA / NEWS2 references',
      inputSource: 'Simulation scenario decisions and timestamps',
      output: {
        source: 'Simulation debrief',
        summary: 'Scenario score, missed actions, linked protocol, and next recommended simulation.',
        retention: 'Training/debrief record; no patient chart writeback.',
      },
      timestamps: { input: iso(24), ai: iso(25), tool: iso(26), backend: iso(26), output: iso(27) },
      transformations: {
        input: ['Capture scenario events', 'Sequence decision timestamps'],
        ai: ['Compare actions with scenario rubric', 'Generate debrief coaching'],
        tool: ['Link simulation catalog item', 'Attach protocol and calculator references'],
        backend: ['No live backend dependency for demo scenario'],
        output: ['Render debrief and recommendations', 'Label as training content'],
      },
      inventoryRecords,
      backendRoutes,
      frontendApiCalls,
    }),
  ];

  return {
    flows,
    stages: STAGE_ORDER.map((stage) => ({ stage, label: DATA_LINEAGE_STAGE_LABELS[stage] })),
    summary: {
      flows: flows.length,
      sources: new Set(flows.map((flow) => flow.source)).size,
      transformations: flows.reduce((total, flow) => total + flow.transformations.length, 0),
      models: flows.filter((flow) => flow.model).length,
      calculators: flows.filter((flow) => flow.calculator).length,
      backendTouchpoints: flows.filter((flow) => flow.endpoint).length,
    },
  };
}

export function filterDataLineageFlows(flows, query = '', category = 'all') {
  const normalized = query.trim().toLowerCase();
  return flows.filter((flow) => {
    const matchesCategory = category === 'all' || flow.category === category;
    const haystack = [
      flow.title,
      flow.category,
      flow.source,
      flow.output,
      flow.model,
      flow.calculator,
      ...flow.transformations,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchesCategory && (!normalized || haystack.includes(normalized));
  });
}
