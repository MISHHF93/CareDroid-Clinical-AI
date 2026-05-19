/**
 * Backend ↔ frontend tool contract matrix (documentation source of truth).
 *
 * Regenerate: npm run contract:write-docs
 * @see docs/backend-frontend-tool-contract.md
 */

import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
} from './clinicalIntentToolCatalog';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  REGISTRY,
} from './clinicalToolIdContract';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, phantomToolReferences } from './sourceCodeToolDiscovery';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';
import {
  TEST_COVERAGE_BY_REGISTRY_ID,
  tierForRegistryId,
  buildMatrixRowForRegistry,
} from './e2eToolValidationMatrix';
import { buildFrontendRenderingRow } from './frontendRenderingInventory';
import { PR_FLEET_TOOL_SPECS } from './prFleetTestConstants';
import { readToolPatternsSource } from './clinicalToolAliasSync';
import { parseClinicalToolPatterns } from './parseToolPatterns';

const MATRIX_BASE_TESTS = [
  'e2eToolValidationMatrix.test.js',
  'clinicalToolIdContract.test.js',
  'clinicalToolAliasSync.test.js',
  'medicalToolsCatalogIndex.test.js',
];

const EXECUTOR_DTO = {
  request: 'ExecuteToolDto (`toolId`, `parameters`, `userId?`, `conversationId?`)',
  response: 'ToolExecutionResponseDto (`success`, `toolId`, `result`, `errorCode?`, …)',
};

const EXECUTOR_API = {
  'sofa-calculator': {
    endpoint: 'POST /api/tools/sofa-calculator/execute',
    client: 'src/pages/tools/Calculators.jsx (`apiFetch`)',
    dto: EXECUTOR_DTO,
  },
  'drug-interactions': {
    endpoint: 'POST /api/tools/drug-interactions/execute',
    client: 'src/pages/tools/DrugChecker.jsx (`apiFetch`)',
    dto: EXECUTOR_DTO,
  },
  'lab-interpreter': {
    endpoint: 'POST /api/tools/lab-interpreter/execute',
    client: 'src/pages/tools/LabInterpreter.jsx (`apiFetch`)',
    dto: EXECUTOR_DTO,
  },
};

const REGISTRY_COMPONENT = Object.freeze({
  [REGISTRY.drugCheck]: 'src/pages/tools/DrugChecker.jsx',
  [REGISTRY.labInterp]: 'src/pages/tools/LabInterpreter.jsx',
  [REGISTRY.protocols]: 'src/pages/tools/Protocols.jsx',
  [REGISTRY.diagnosis]: 'src/pages/tools/DiagnosisAssistant.jsx',
  [REGISTRY.procedures]: 'src/pages/tools/ProcedureGuide.jsx',
  [REGISTRY.calculatorsHub]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.fleetCommand]: 'src/pages/fleet/FleetDashboard.jsx',
  [REGISTRY.predictiveMaintenance]: 'src/pages/fleet/PredictiveMaintenance.jsx',
  [REGISTRY.routeOptimizer]: 'src/pages/fleet/RouteOptimizer.jsx',
});

const NLU_PAGE_COMPONENT = Object.freeze({
  'protocol-lookup': REGISTRY_COMPONENT[REGISTRY.protocols],
  'acls-protocol': REGISTRY_COMPONENT[REGISTRY.protocols],
  'atls-protocol': REGISTRY_COMPONENT[REGISTRY.protocols],
  'differential-diagnosis': REGISTRY_COMPONENT[REGISTRY.diagnosis],
  'antibiotic-guide': REGISTRY_COMPONENT[REGISTRY.diagnosis],
  'abg-interpreter': REGISTRY_COMPONENT[REGISTRY.labInterp],
  'dose-calculator': REGISTRY_COMPONENT[REGISTRY.calculatorsHub],
});

const CHAT_API = {
  endpoint: 'POST /api/chat/message',
  client: 'src/services/apiClient.js (`apiFetch`)',
  dto: 'ChatMessageDto (message, conversationId, tool?, feature?)',
  response: 'QueryResponse (text, intentClassification, toolResult?, …)',
};

const LIST_TOOLS_API = {
  endpoint: 'GET /api/tools',
  client: 'src/services/clinicalToolsApi.js (`fetchBackendClinicalTools`)',
  dto: '—',
  response: 'ToolListDto',
};

function catalogRowFor(nluToolId, registryId) {
  const rows = getMedicalToolsCatalogRows();
  return rows.find(
    (r) =>
      r.primaryId === nluToolId ||
      r.id === nluToolId ||
      r.sidebarToolId === registryId ||
      r.id === registryId
  );
}

function discoveryHas(id) {
  return getAllDiscoveredTools().some(
    (r) => r.id === id || r.mapsTo === id || r.registryId === id
  );
}

function patternFor(nluToolId, patterns) {
  return patterns.find((p) => p.toolId === nluToolId) ?? null;
}

function testFilesFor(registryId, nluToolId) {
  const specific = TEST_COVERAGE_BY_REGISTRY_ID[registryId] || [];
  const nluSpecific =
    registryId === nluToolId
      ? []
      : clinicalIntentTools.some((t) => t.toolId === nluToolId)
        ? ['clinicalCatalogLaunch.test.js']
        : [];
  return [...new Set([...MATRIX_BASE_TESTS, ...specific, ...nluSpecific])].sort();
}

function resolveComponent(registryId, nluToolId, builtinSlug) {
  if (REGISTRY_COMPONENT[registryId]) return REGISTRY_COMPONENT[registryId];
  if (NLU_PAGE_COMPONENT[nluToolId]) return NLU_PAGE_COMPONENT[nluToolId];
  if (FLEET_TIER_A(registryId)) return `src/pages/fleet/${PR_FLEET_TOOL_SPECS[registryId]?.appComponent}.jsx`;
  if (builtinSlug) {
    return `src/pages/tools/Calculators.jsx (case '${builtinSlug}')`;
  }
  if (
    registryId === REGISTRY.dispatchAi ||
    ['wells-pe', 'perc', 'grace-acs', 'nihss', 'canadian-c-spine', 'ottawa-ankle', 'copd-gold', 'rome-iv-ibs'].includes(
      registryId
    )
  ) {
    return 'src/pages/tools/Calculators.jsx (hub card) + src/pages/Dashboard.jsx (chat)';
  }
  if (registryId === REGISTRY.calculatorsHub) return REGISTRY_COMPONENT[REGISTRY.calculatorsHub];
  return '—';
}

function FLEET_TIER_A(registryId) {
  return Boolean(PR_FLEET_TOOL_SPECS[registryId]?.tier === 'A');
}

function apiBlock(nluToolId, registryId, postExecutor) {
  if (postExecutor && EXECUTOR_API[nluToolId]) {
    const block = EXECUTOR_API[nluToolId];
    return { ...block, dto: block.dto.request, response: block.dto.response };
  }
  if (postExecutor && EXECUTOR_API[REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]]) {
    const block = EXECUTOR_API[REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]];
    return { ...block, dto: block.dto.request, response: block.dto.response };
  }
  if (
    [REGISTRY.protocols, REGISTRY.diagnosis, REGISTRY.procedures].includes(registryId) ||
    NLU_PAGE_COMPONENT[nluToolId]
  ) {
    return CHAT_API;
  }
  if (registryId === REGISTRY.dispatchAi || tierForRegistryId(registryId) === 'B') {
    return { ...CHAT_API, note: 'Tier-B: catalog launch seeds dashboard chat; no tool POST' };
  }
  return { endpoint: '—', client: '—', dto: '—', response: '—' };
}

/**
 * @typedef {'fully wired'|'frontend-only'|'backend-only'|'broken'|'planned'} ContractStatus
 */

/**
 * @param {object} row
 * @returns {ContractStatus}
 */
export function deriveContractStatus(row) {
  if (row.kind === 'phantom') return 'planned';
  if (row.brokenReasons?.length) return 'broken';

  const hasFrontend =
    row.frontendComponent &&
    row.frontendComponent !== '—' &&
    row.frontendRoute &&
    row.frontendRoute !== '—';
  const hasNlu = row.nluProfile && row.backendIntentPattern;
  const hasRegistry = row.registryEntry !== '—';
  const hasCatalog = row.catalogEntry === 'yes';

  if (row.backendExecutor === 'yes' && hasFrontend && hasNlu && hasRegistry) {
    return 'fully wired';
  }
  if (row.backendExecutor === 'no' && hasFrontend && hasNlu) {
    return 'frontend-only';
  }
  if (row.backendExecutor === 'yes' && !hasFrontend) {
    return 'backend-only';
  }
  if (hasRegistry && hasCatalog && hasFrontend) {
    return row.nluProfile === '—' ? 'frontend-only' : 'fully wired';
  }
  return 'frontend-only';
}

function buildRowFromNlu(nlu, patterns) {
  const registryId =
    nlu.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[nlu.toolId] || nlu.toolId;
  const reg = toolRegistryById[registryId];
  const launch = resolveCatalogLaunch(nlu.toolId);
  const builtin = builtinUiCalculators.find(
    (c) =>
      c.id === registryId ||
      c.orchestratorId === nlu.toolId ||
      (nlu.toolId === 'cha2ds2vasc-calculator' && c.id === 'chads2vasc') ||
      (nlu.toolId === 'sofa-calculator' && c.id === 'sofa')
  );
  const builtinSlug = builtin?.id ?? null;
  /** POST execute applies only when this NLU id is registered — not sibling profiles on the same page. */
  const postExecutor = isOrchestratorPostExecutable(nlu.toolId);
  const orchestratorId = postExecutor
    ? nlu.toolId
    : REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] &&
        isOrchestratorPostExecutable(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId])
      ? `${REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]} (registry sibling)`
      : '—';
  const pat = patternFor(nlu.toolId, patterns);
  const api = apiBlock(nlu.toolId, registryId, postExecutor);
  const render = buildFrontendRenderingRow(registryId);

  const row = {
    kind: 'nlu',
    canonicalId: nlu.toolId,
    displayName: nlu.toolName,
    frontendRoute: nlu.path || launch.path || reg?.path || '—',
    frontendComponent: resolveComponent(registryId, nlu.toolId, builtinSlug),
    registryEntry: reg ? registryId : registryId !== nlu.toolId ? registryId : '—',
    catalogEntry: catalogRowFor(nlu.toolId, registryId) ? 'yes' : 'no',
    discoveryEntry: discoveryHas(nlu.toolId) || discoveryHas(registryId) ? 'yes' : 'no',
    nluProfile: nlu.toolId,
    backendIntentPattern: pat ? `tool.patterns.ts → ${pat.toolId}` : '—',
    orchestratorToolId: orchestratorId || '—',
    backendExecutor: postExecutor ? 'yes' : 'no',
    apiEndpoint: api.endpoint,
    requestDto: api.dto || '—',
    responseDto: api.response || '—',
    frontendApiClient: api.client || '—',
    testCoverage: testFilesFor(registryId, nlu.toolId).join(', '),
    tier: tierForRegistryId(registryId),
    notes: [
      api.note,
      nlu.backendExecutable && !postExecutor ? 'NLU backendExecutable flag (chat routing only)' : null,
      builtinSlug ? `Calculator slug: ${builtinSlug}` : null,
      launch.path !== (nlu.path || reg?.path) ? `Launch nav may use ${launch.path}` : null,
    ]
      .filter(Boolean)
      .join('; '),
    brokenReasons: [],
    renderIssues: render ? [] : [],
  };

  row.status = deriveContractStatus(row);
  return row;
}

function buildRowFromRegistryOnly(registryId, patterns) {
  const reg = toolRegistryById[registryId];
  const launch = resolveCatalogLaunch(registryId);
  const nlus = clinicalIntentTools.filter(
    (t) => t.sidebarToolId === registryId || t.toolId === registryId
  );
  const builtin = builtinUiCalculators.find(
    (c) => c.id === reg?.initialCalc || c.id === registryId
  );

  const row = {
    kind: 'registry-only',
    canonicalId: registryId,
    displayName: reg?.name ?? registryId,
    frontendRoute: reg?.path ?? launch.path ?? '—',
    frontendComponent: resolveComponent(registryId, registryId, builtin?.id),
    registryEntry: registryId,
    catalogEntry: catalogRowFor(registryId, registryId) ? 'yes' : 'no',
    discoveryEntry: discoveryHas(registryId) ? 'yes' : 'no',
    nluProfile: nlus.length ? nlus.map((t) => t.toolId).join(', ') : '—',
    backendIntentPattern: nlus.length
      ? nlus.map((t) => (patternFor(t.toolId, patterns) ? t.toolId : 'missing')).join(', ')
      : '—',
    orchestratorToolId: REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] || '—',
    backendExecutor: REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]
      ? isOrchestratorPostExecutable(REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId])
        ? 'yes'
        : 'no'
      : 'no',
    apiEndpoint: '—',
    requestDto: '—',
    responseDto: '—',
    frontendApiClient: '—',
    testCoverage: testFilesFor(registryId, registryId).join(', '),
    tier: tierForRegistryId(registryId),
    notes: nlus.length ? '' : 'No dedicated clinicalIntentTools row',
    brokenReasons: [],
    catalogGap: registryId === 'procedures' ? 'no-nlu-profile' : null,
  };

  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) {
    const api = apiBlock(
      REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId],
      registryId,
      row.backendExecutor === 'yes'
    );
    row.apiEndpoint = api.endpoint;
    row.requestDto = api.dto || '—';
    row.responseDto = api.response || '—';
    row.frontendApiClient = api.client || '—';
  }

  row.status = deriveContractStatus(row);
  return row;
}

function buildPhantomRows() {
  return phantomToolReferences.map((p) => ({
    kind: 'phantom',
    canonicalId: p.id,
    displayName: p.name,
    frontendRoute: '—',
    frontendComponent: '—',
    registryEntry: '—',
    catalogEntry: 'no',
    discoveryEntry: 'yes',
    nluProfile: '—',
    backendIntentPattern: '—',
    orchestratorToolId: '—',
    backendExecutor: 'no',
    apiEndpoint: p.relatedApi || '—',
    requestDto: '—',
    responseDto: '—',
    frontendApiClient: p.source || '—',
    testCoverage: 'sourceCodeToolDiscovery.test.js',
    tier: 'phantom',
    notes: p.notes,
    brokenReasons: [],
    status: 'planned',
  }));
}

/** Shared platform API (not a clinical tool). */
function buildPlatformRows() {
  return [
    {
      kind: 'platform',
      canonicalId: 'tools-list-api',
      displayName: 'List orchestrator tools',
      frontendRoute: '—',
      frontendComponent: 'src/pages/tools/ClinicalToolCatalog.jsx',
      registryEntry: '—',
      catalogEntry: '—',
      discoveryEntry: 'yes',
      nluProfile: '—',
      backendIntentPattern: '—',
      orchestratorToolId: '—',
      backendExecutor: 'n/a',
      apiEndpoint: LIST_TOOLS_API.endpoint,
      requestDto: LIST_TOOLS_API.dto,
      responseDto: LIST_TOOLS_API.response,
      frontendApiClient: LIST_TOOLS_API.client,
      testCoverage: 'clinicalToolCatalog.launch.test.jsx',
      tier: 'platform',
      notes: 'Catalog executor panel',
      brokenReasons: [],
      status: 'fully wired',
    },
    {
      kind: 'platform',
      canonicalId: 'tools-share-results',
      displayName: 'Share tool results (client)',
      frontendRoute: '—',
      frontendComponent: 'src/components/tools/ToolResultShare.jsx',
      registryEntry: '—',
      catalogEntry: '—',
      discoveryEntry: 'no',
      nluProfile: '—',
      backendIntentPattern: '—',
      orchestratorToolId: '—',
      backendExecutor: 'no',
      apiEndpoint: 'POST /api/tools/share-results',
      requestDto: '— (undocumented)',
      responseDto: '—',
      frontendApiClient: 'src/components/tools/ToolResultShare.jsx (`apiFetch`)',
      testCoverage: '—',
      tier: 'platform',
      notes: 'No matching route in tool-orchestrator.controller.ts',
      brokenReasons: ['missing-backend-route'],
      status: 'broken',
    },
  ];
}

export function buildBackendFrontendContractRows() {
  const patterns = parseClinicalToolPatterns(readToolPatternsSource());
  const seenNlu = new Set();
  const rows = [];

  for (const nlu of clinicalIntentTools) {
    seenNlu.add(nlu.toolId);
    rows.push(buildRowFromNlu(nlu, patterns));
  }

  for (const reg of toolRegistry) {
    const hasNlu = clinicalIntentTools.some(
      (t) => t.sidebarToolId === reg.id || t.toolId === reg.id
    );
    if (!hasNlu) {
      rows.push(buildRowFromRegistryOnly(reg.id, patterns));
    }
  }

  rows.push(...buildPhantomRows());
  rows.push(...buildPlatformRows());

  return rows.sort((a, b) => {
    const rank = { nlu: 0, 'registry-only': 1, platform: 2, phantom: 3 };
    const dr = (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
    if (dr !== 0) return dr;
    return a.canonicalId.localeCompare(b.canonicalId);
  });
}

export function getContractGaps(rows = buildBackendFrontendContractRows()) {
  const gaps = [];

  const dispatch = rows.find((r) => r.canonicalId === 'dispatch-ai');
  if (dispatch?.nluProfile && dispatch.backendExecutor === 'no') {
    gaps.push({
      id: 'dispatch-ai',
      severity: 'low',
      issue: 'clinicalIntentToolCatalog backendExecutable: true but no POST executor',
      fix: gapFixFor(dispatch),
    });
  }

  for (const row of rows) {
    if (row.status === 'broken') {
      gaps.push({
        id: row.canonicalId,
        severity: 'high',
        issue: row.brokenReasons.join(', ') || 'broken contract',
        fix: gapFixFor(row),
      });
    }
    if (row.catalogGap === 'no-nlu-profile' || row.brokenReasons?.includes('no-nlu-profile')) {
      gaps.push({
        id: row.canonicalId,
        severity: 'medium',
        issue: 'Registry tool without NLU profile or tool.patterns entry',
        fix: gapFixFor(row),
      });
    }
    if (row.catalogEntry === 'no' && row.kind === 'nlu') {
      gaps.push({
        id: row.canonicalId,
        severity: 'medium',
        issue: 'NLU profile missing from medical catalog index',
        fix: 'Ensure row appears in getMedicalToolsCatalogRows() via clinicalIntentTools',
      });
    }
  }

  return gaps;
}

function gapFixFor(row) {
  if (row.brokenReasons?.includes('missing-backend-route')) {
    return 'Implement POST /api/tools/share-results in ToolOrchestratorController or remove/guard ToolResultShare.jsx call';
  }
  if (row.canonicalId === 'dispatch-ai') {
    return 'Set backendExecutable: false in clinicalIntentToolCatalog.js or relabel catalog badge as NLU-only (no POST executor)';
  }
  if (row.catalogGap === 'no-nlu-profile' || row.canonicalId === 'procedures') {
    return 'Add `procedures` NLU row to clinicalIntentToolCatalog.js + matching entry in tool.patterns.ts, or document registry-only in catalog UI';
  }
  return 'See docs/backend-frontend-tool-contract.md';
}

function mdCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const CONTRACT_COLUMNS = [
  ['canonicalId', 'Canonical ID'],
  ['displayName', 'Display name'],
  ['frontendRoute', 'Frontend route'],
  ['frontendComponent', 'Frontend component'],
  ['registryEntry', 'Registry entry'],
  ['catalogEntry', 'Catalog entry'],
  ['discoveryEntry', 'Discovery entry'],
  ['nluProfile', 'NLU profile'],
  ['backendIntentPattern', 'Backend intent pattern'],
  ['orchestratorToolId', 'Orchestrator tool ID'],
  ['backendExecutor', 'Backend executor'],
  ['apiEndpoint', 'API endpoint'],
  ['requestDto', 'Request DTO'],
  ['responseDto', 'Response DTO'],
  ['frontendApiClient', 'Frontend API client'],
  ['testCoverage', 'Test coverage'],
  ['status', 'Status'],
];

export function formatBackendFrontendContractMarkdown(
  rows = buildBackendFrontendContractRows(),
  gaps = getContractGaps(rows)
) {
  const generatedAt = new Date().toISOString();
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# Backend ↔ frontend tool contract matrix',
    '',
    `Generated: ${generatedAt}`,
    '',
    '> **Source:** `src/data/backendFrontendToolContract.js` — regenerate with `npm run contract:write-docs`.',
    '> **Related:** [clinical-tool-executors.md](./clinical-tool-executors.md), [e2e-tool-validation-matrix.md](./e2e-tool-validation-matrix.md).',
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| NLU profiles (\`clinicalIntentTools\`) | ${clinicalIntentTools.length} |`,
    `| NLU contract ids (\`NLU_PROFILE_TOOL_IDS\`) | ${NLU_PROFILE_TOOL_IDS.length} |`,
    `| Sidebar registry tools | ${toolRegistry.length} |`,
    `| POST executors (\`registerTool\`) | ${ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length} |`,
    `| Matrix rows (incl. phantom + platform) | ${rows.length} |`,
    '',
    '### Status distribution',
    '',
    ...Object.entries(statusCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, n]) => `- **${status}**: ${n}`),
    '',
    '## Status definitions',
    '',
    '| Status | Meaning |',
    '|--------|---------|',
    '| **fully wired** | Shipped UI route/component, catalog + NLU + patterns; POST executor present only when `Backend executor = yes`. |',
    '| **frontend-only** | Client form and/or chat launch; no `registerTool()` POST executor. |',
    '| **backend-only** | Executor or API without a dedicated UI (none today for clinical tools). |',
    '| **broken** | Client calls missing API, or misleading executor flags documented in code. |',
    '| **planned** | Phantom / roadmap ids (recommendations, cost tracking) — no production surface. |',
    '',
    '## POST executor reference',
    '',
    'Only these NLU ids have `registerTool()` in `tool-orchestrator.service.ts`:',
    '',
    ...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.map(
      (id) => `- \`${id}\` → ${EXECUTOR_API[id]?.endpoint ?? 'POST /api/tools/:id/execute'}`
    ),
    '',
    'Chat NLU for other tools: `chat.service.ts` → `handleClinicalTool` → `NotFoundException` → general AI fallback (no structured executor).',
    '',
    '## Full contract matrix',
    '',
    '<!-- markdownlint-disable MD013 -->',
    `| ${CONTRACT_COLUMNS.map(([, h]) => h).join(' | ')} |`,
    `| ${CONTRACT_COLUMNS.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    const cells = CONTRACT_COLUMNS.map(([key]) => {
      let v = row[key];
      if (key === 'testCoverage' && v && v.length > 80) {
        const parts = v.split(', ');
        v = `${parts.length} files (${parts.slice(0, 2).join(', ')}, …)`;
      }
      return mdCell(v);
    });
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('<!-- markdownlint-enable MD013 -->', '');

  if (rows.some((r) => r.notes)) {
    lines.push('## Row notes', '');
    for (const row of rows.filter((r) => r.notes)) {
      lines.push(`- **${row.canonicalId}:** ${row.notes}`);
    }
    lines.push('');
  }

  lines.push('## Gaps and recommended fixes', '');

  if (gaps.length === 0) {
    lines.push('_No automated gaps detected._', '');
  } else {
    lines.push('| ID | Severity | Issue | Recommended fix |');
    lines.push('|----|----------|-------|-----------------|');
    for (const g of gaps) {
      lines.push(`| ${g.id} | ${g.severity} | ${mdCell(g.issue)} | ${mdCell(g.fix)} |`);
    }
    lines.push('');
  }

  lines.push(
    '### Manual follow-ups (not auto-flagged)',
    '',
    '- **Keyboard shortcuts:** duplicate `Ctrl+Shift+*` bindings in `toolRegistry.js` (PERC/PHQ-9, GRACE/GAD-7, etc.).',
    '- **Route duality:** legacy `/tools/calculator/*` vs `/tools/calculators/*` — both valid; keep redirects in `clinicalToolRoutes.js`.',
    '- **Env:** align `backend/.env.example` `FRONTEND_URL` with Vite port **8000** when using default dev proxy.',
    '- **dispatch-ai:** fleet Tier-B chat; `backendExecutable: true` in catalog is NLU/chat routing only — not POST execute (documented in row notes).',
    '',
    '## Regeneration',
    '',
    '```bash',
    'npm run contract:write-docs',
    'npm run test:contract-matrix',
    '```',
    '',
    'Drift gates: `npm run test:alias-sync`, `npm run test:executor-mapping`, `npm run test:e2e-matrix`.',
    ''
  );

  return lines.join('\n');
}

export function getBackendFrontendContractDocument() {
  const rows = buildBackendFrontendContractRows();
  return {
    generatedAt: new Date().toISOString(),
    rows,
    gaps: getContractGaps(rows),
  };
}
