import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import {
  buildBackendFrontendContractRows,
  getContractGaps,
} from './backendFrontendToolContract';
import toolRegistry from './toolRegistry';

const EMPTY = '—';

function present(value) {
  return value !== undefined && value !== null && value !== '' && value !== EMPTY;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function duplicateGroups(values) {
  const grouped = new Map();
  for (const value of values.filter(present)) {
    grouped.set(value, (grouped.get(value) || 0) + 1);
  }
  return [...grouped.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function groupRowsBy(rows, getter) {
  const grouped = new Map();
  for (const row of rows) {
    const value = getter(row);
    if (!present(value)) continue;
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row);
  }
  return [...grouped.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([value, group]) => ({
      value,
      ids: group.map((row) => row.canonicalId).sort(),
      count: group.length,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function backendConnectionFor(row) {
  if (row.backendExecutor === 'yes') return 'post-executor';
  if (present(row.apiEndpoint) && String(row.apiEndpoint).includes('/api/chat/')) return 'chat-action';
  if (present(row.apiEndpoint)) return 'platform-or-shared-api';
  return 'none';
}

function statusFor(row) {
  if (row.status === 'broken') return 'broken';
  if (row.status === 'fully wired') return 'wired';
  if (row.status === 'backend-only' || row.status === 'planned') return 'partially wired';
  if (backendConnectionFor(row) === 'none') return 'missing backend';
  return 'partially wired';
}

function inputSchemaFor(row) {
  if (present(row.requestDto)) return row.requestDto;
  if (String(row.frontendComponent || '').includes('Calculators.jsx')) {
    return 'Client-side calculator form/utility validation';
  }
  if (row.kind === 'nlu') return 'NLU/chat prompt contract; no formal field schema';
  return 'No formal schema found';
}

function outputSchemaFor(row) {
  if (present(row.responseDto)) return row.responseDto;
  if (String(row.frontendComponent || '').includes('Calculators.jsx')) {
    return 'Client-side calculator result object';
  }
  if (backendConnectionFor(row) === 'chat-action') return 'Chat response / assistant launch seed';
  return 'No formal output schema found';
}

function uiStateFor(row) {
  const component = String(row.frontendComponent || '');
  if (row.backendExecutor === 'yes') {
    return 'Orchestrator loading/success/error via executeClinicalTool and ClinicalExecutorFeedback';
  }
  if (component.includes('Calculators.jsx')) {
    return 'Calculator form with local validation, reset/calculate, and result panel';
  }
  if (backendConnectionFor(row) === 'chat-action') {
    return 'Assistant/chat launch state; result rendered by conversation UI';
  }
  if (present(row.frontendComponent)) {
    return 'Dedicated or shared frontend page state';
  }
  return 'No frontend UI state found';
}

function registryStatusRows(rows) {
  return rows.map((row) => {
    const backendConnection = backendConnectionFor(row);
    return {
      toolId: row.canonicalId,
      displayName: row.displayName || row.canonicalId,
      category: row.tier || row.kind || 'unknown',
      frontend: {
        route: present(row.frontendRoute) ? row.frontendRoute : null,
        componentPath: present(row.frontendComponent) ? row.frontendComponent : null,
        registryId: present(row.registryEntry) ? row.registryEntry : null,
        catalogEntry: row.catalogEntry === 'yes',
      },
      backend: {
        connection: backendConnection,
        endpointOrActionPath: present(row.apiEndpoint) ? row.apiEndpoint : null,
        orchestratorToolId: present(row.orchestratorToolId) ? row.orchestratorToolId : null,
        executorRegistered: row.backendExecutor === 'yes',
      },
      schemas: {
        input: inputSchemaFor(row),
        output: outputSchemaFor(row),
      },
      quality: {
        hasFrontendEntryPoint: present(row.frontendRoute) && present(row.frontendComponent),
        hasBackendEndpointOrAction: backendConnection !== 'none',
        hasValidationSchema: present(row.requestDto) || String(row.frontendComponent || '').includes('Calculators.jsx'),
        hasOutputSchema: present(row.responseDto) || String(row.frontendComponent || '').includes('Calculators.jsx'),
        errorHandling: uiStateFor(row),
        loadingSuccessErrorUi: uiStateFor(row),
      },
      testCoverage: present(row.testCoverage) ? row.testCoverage : null,
      notes: present(row.notes) ? row.notes : null,
      status: statusFor(row),
    };
  });
}

function buildConflictSummary(rows) {
  const calculatorSlugDuplicates = duplicateGroups(builtinUiCalculators.map((calc) => calc.id));
  const rowIdDuplicates = duplicateGroups(rows.map((row) => row.canonicalId));
  const registryIdDuplicates = duplicateGroups(toolRegistry.map((tool) => tool.id));
  const nluIdDuplicates = duplicateGroups(clinicalIntentTools.map((tool) => tool.toolId));
  const duplicateRoutes = groupRowsBy(rows, (row) => row.frontendRoute);
  const duplicateBackendEndpoints = groupRowsBy(rows, (row) => row.apiEndpoint);

  return {
    duplicateToolIds: rowIdDuplicates,
    duplicateRegistryIds: registryIdDuplicates,
    duplicateNluIds: nluIdDuplicates,
    duplicateCalculatorSlugs: calculatorSlugDuplicates,
    sharedFrontendRoutes: duplicateRoutes,
    sharedBackendEndpoints: duplicateBackendEndpoints,
  };
}

export function buildToolAuditData() {
  const sourceRows = buildBackendFrontendContractRows();
  const registryRows = registryStatusRows(sourceRows);
  const statusCounts = countBy(registryRows, 'status');
  const brokenRows = registryRows.filter((row) => row.status === 'broken');
  const missingBackendConnections = registryRows.filter(
    (row) => row.status === 'missing backend' && row.frontend.hasFrontendEntryPoint !== false
  );
  const gaps = getContractGaps(sourceRows);
  const conflictSummary = buildConflictSummary(sourceRows);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: registryRows.length,
      registryTools: toolRegistry.length,
      nluProfiles: clinicalIntentTools.length,
      calculatorForms: builtinUiCalculators.length,
      postExecutors: registryRows.filter((row) => row.backend.executorRegistered).length,
      statusCounts,
      automatedGapCount: gaps.length,
    },
    conflictSummary,
    brokenConnections: brokenRows.map((row) => ({
      toolId: row.toolId,
      displayName: row.displayName,
      status: row.status,
      endpointOrActionPath: row.backend.endpointOrActionPath,
      notes: row.notes,
    })),
    missingBackendConnections: missingBackendConnections.map((row) => ({
      toolId: row.toolId,
      displayName: row.displayName,
      frontendRoute: row.frontend.route,
      frontendComponentPath: row.frontend.componentPath,
      reason: 'No registered backend POST executor, chat action, or documented backend API endpoint.',
    })),
    recommendedPatches: [
      {
        priority: 'high',
        title: 'Preserve orchestrator result metadata in the frontend adapter',
        status: 'implemented in this pass',
        rationale:
          'Backend tools return interpretation, warnings, citations, disclaimer, and timestamp outside data; the current adapter can drop them.',
      },
      {
        priority: 'high',
        title: 'Connect existing source-backed trauma/PE/ACS/neuro calculator forms to canonical routes',
        status: 'recommended; broad contract migration',
        rationale:
          'Several calculator form components exist in source code while catalog records still present them as hub/chat-only.',
      },
      {
        priority: 'medium',
        title: 'Standardize calculator result payloads around score/value, interpretation, warnings, disclaimer, and citations',
        status: 'recommended',
        rationale:
          'Local calculators use varied field names, which complicates copy/share/result rendering.',
      },
      {
        priority: 'medium',
        title: 'Move repeated calculator panel primitives into a shared component module',
        status: 'recommended',
        rationale:
          'Multiple calculator packs duplicate validation summaries, decision-support notices, and result panel shells.',
      },
    ],
    tools: registryRows,
  };
}

function mdList(items, empty = '_None found._') {
  if (!items.length) return [empty];
  return items.map((item) => `- ${item}`);
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ];
}

export function formatToolAuditMarkdown(data = buildToolAuditData()) {
  const statusRows = Object.entries(data.summary.statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => [status, count]);
  const brokenRows = data.brokenConnections.map((row) => [
    row.toolId,
    row.displayName,
    row.endpointOrActionPath || EMPTY,
    row.notes || EMPTY,
  ]);
  const missingRows = data.missingBackendConnections.slice(0, 40).map((row) => [
    row.toolId,
    row.displayName,
    row.frontendRoute || EMPTY,
    row.frontendComponentPath || EMPTY,
  ]);
  const sharedRoutes = data.conflictSummary.sharedFrontendRoutes.slice(0, 25).map((group) => [
    group.value,
    group.count,
    group.ids.slice(0, 8).join(', ') + (group.ids.length > 8 ? ', ...' : ''),
  ]);

  return [
    '# Tool Audit Report',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    '## Scope',
    '',
    'This audit is generated from the canonical frontend/backend contract sources and covers registry tools, NLU medical profiles, calculator forms, platform/shared API rows, and phantom/planned discovery rows. It does not delete tools or change medical formulas.',
    '',
    '## Summary',
    '',
    ...markdownTable(
      ['Metric', 'Count'],
      [
        ['Total audit rows', data.summary.totalRows],
        ['Sidebar registry tools', data.summary.registryTools],
        ['NLU medical profiles', data.summary.nluProfiles],
        ['Calculator forms', data.summary.calculatorForms],
        ['Registered backend POST executors', data.summary.postExecutors],
        ['Automated contract gaps', data.summary.automatedGapCount],
      ]
    ),
    '',
    '## Status Distribution',
    '',
    ...markdownTable(['Status', 'Count'], statusRows),
    '',
    '## Backend Executor Reality',
    '',
    'Only three medical tools currently have registered `POST /api/tools/:id/execute` executors: `sofa-calculator`, `drug-interactions`, and `lab-interpreter`. Most of the 270+ tool set is intentionally frontend-only, chat-assisted, shared-page, or platform/demo routed. The JSON status file marks those as `missing backend` or `partially wired` depending on whether a chat/API action exists.',
    '',
    '## Duplicate And Conflict Checks',
    '',
    ...mdList([
      `Duplicate audit row IDs: ${data.conflictSummary.duplicateToolIds.length}`,
      `Duplicate registry IDs: ${data.conflictSummary.duplicateRegistryIds.length}`,
      `Duplicate NLU IDs: ${data.conflictSummary.duplicateNluIds.length}`,
      `Duplicate calculator slugs: ${data.conflictSummary.duplicateCalculatorSlugs.length}`,
      `Shared frontend route groups: ${data.conflictSummary.sharedFrontendRoutes.length}`,
      `Shared backend endpoint groups: ${data.conflictSummary.sharedBackendEndpoints.length}`,
    ]),
    '',
    'Shared route groups are expected for hub/chat/shared pages such as `/tools/calculators`, `/tools/lab-interpreter`, `/protocols`, and specialty assistant surfaces. They are still listed in `TOOL_REGISTRY_STATUS.json` for review.',
    '',
    '## Broken Connections',
    '',
    ...(brokenRows.length
      ? markdownTable(['Tool ID', 'Display name', 'Endpoint/action', 'Notes'], brokenRows)
      : ['_No rows are currently classified as broken by the automated contract builder._']),
    '',
    '## Missing Backend Connections',
    '',
    `The JSON file contains ${data.missingBackendConnections.length} rows without a registered backend endpoint/action. The first 40 are listed here for triage.`,
    '',
    ...(missingRows.length
      ? markdownTable(['Tool ID', 'Display name', 'Frontend route', 'Frontend component'], missingRows)
      : ['_No missing backend connections found._']),
    '',
    '## Shared Frontend Routes',
    '',
    ...(sharedRoutes.length
      ? markdownTable(['Route', 'Count', 'Example tool IDs'], sharedRoutes)
      : ['_No shared frontend routes found._']),
    '',
    '## Recommended Patches',
    '',
    ...data.recommendedPatches.map(
      (patch) => `- **${patch.priority}: ${patch.title}** (${patch.status}) — ${patch.rationale}`
    ),
    '',
    '## Generated Artifacts',
    '',
    '- `TOOL_REGISTRY_STATUS.json` contains the complete per-tool map with frontend, backend, schema, quality, conflict, and status fields.',
    '- This report intentionally summarizes high-signal findings and leaves full row-level detail to the JSON artifact.',
    '',
  ].join('\n');
}
