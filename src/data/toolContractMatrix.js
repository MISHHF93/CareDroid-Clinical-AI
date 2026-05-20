/**
 * Complete tool contract matrix — one row per tool with wiring status.
 *
 * @see docs/tool-contract-matrix.md
 */

import {
  buildBackendFrontendContractRows,
  deriveContractStatus,
  getContractGaps,
} from './backendFrontendToolContract';
import {
  NLU_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import toolRegistry from './toolRegistry';
import {
  BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS,
  buildBackendFrontendCapabilityRows,
} from './backendFrontendExposure';

/** @typedef {'fully wired'|'frontend-only'|'backend-only'|'broken'|'planned'} ToolContractStatus */

export const TOOL_CONTRACT_STATUSES = Object.freeze([
  'fully wired',
  'frontend-only',
  'backend-only',
  'broken',
  'planned',
]);

/**
 * @param {ReturnType<typeof buildBackendFrontendContractRows>[number]} row
 */
export function mapRowToToolContractMatrix(row) {
  const dto =
    row.requestDto !== '—' && row.responseDto !== '—'
      ? `${row.requestDto} → ${row.responseDto}`
      : row.requestDto !== '—'
        ? row.requestDto
        : '—';

  let executor = 'no';
  if (row.backendExecutor === 'yes') {
    executor =
      row.orchestratorToolId && row.orchestratorToolId !== '—'
        ? row.orchestratorToolId
        : row.canonicalId;
  } else if (row.backendExecutor === 'n/a') {
    executor = 'n/a';
  }

  return {
    id: row.canonicalId,
    route: row.frontendRoute,
    component: row.frontendComponent,
    catalog: row.catalogEntry,
    registry: row.registryEntry,
    nlu: row.nluProfile,
    executor,
    endpoint: row.apiEndpoint,
    dto,
    apiClient: row.frontendApiClient,
    status: row.status,
    kind: row.kind,
    displayName: row.displayName,
    notes: row.notes || '',
  };
}

export function buildToolContractMatrixRows() {
  return buildBackendFrontendContractRows().map(mapRowToToolContractMatrix);
}

function mdCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const MATRIX_HEADERS = [
  'ID',
  'Route',
  'Component',
  'Catalog',
  'Registry',
  'NLU',
  'Executor',
  'Endpoint',
  'DTO',
  'API client',
  'Status',
];

/**
 * @param {ReturnType<typeof buildToolContractMatrixRows>} [rows]
 * @param {ReturnType<typeof getContractGaps>} [gaps]
 */
export function formatToolContractMatrixMarkdown(
  rows = buildToolContractMatrixRows(),
  gaps = getContractGaps()
) {
  const generatedAt = new Date().toISOString();
  const statusCounts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const capabilityRows = buildBackendFrontendCapabilityRows();
  const capabilityCounts = capabilityRows.reduce((acc, row) => {
    acc[row.classification] = (acc[row.classification] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# Tool contract matrix',
    '',
    `**Generated:** ${generatedAt}`,
    '',
    '> **Source:** `src/data/toolContractMatrix.js` (derived from `backendFrontendToolContract.js`)',
    '> **Regenerate:** `npm run contract:write-docs`',
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Total rows | ${rows.length} |`,
    `| NLU profiles | ${clinicalIntentTools.length} |`,
    `| Registry tools | ${toolRegistry.length} |`,
    `| POST executors | ${ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length} |`,
    '',
    '### Status distribution',
    '',
    '| Status | Count |',
    '|--------|------:|',
    ...TOOL_CONTRACT_STATUSES.map((s) => `| ${s} | ${statusCounts[s] ?? 0} |`),
    '',
    '### Backend/frontend capability classification',
    '',
    '| Classification | Count |',
    '|----------------|------:|',
    ...Object.values(BACKEND_FRONTEND_CAPABILITY_CLASSIFICATIONS).map(
      (classification) => `| ${classification} | ${capabilityCounts[classification] ?? 0} |`
    ),
    '',
    '## Status definitions',
    '',
    '| Status | Meaning |',
    '|--------|---------|',
    '| **fully wired** | UI route + component, catalog + registry + NLU pattern; POST executor when executor column shows an NLU id. |',
    '| **frontend-only** | Shipped client UI and NLU; no `registerTool()` POST executor. |',
    '| **backend-only** | Server executor/API without dedicated UI surface. |',
    '| **broken** | Client references missing backend route or misleading executor wiring. |',
    '| **planned** | Phantom / roadmap id — not production-shipped. |',
    '',
    '## POST executors',
    '',
    ...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.map(
      (id) => `- \`${id}\` → \`POST /api/tools/${id}/execute\``
    ),
    '',
    '## Full matrix',
    '',
    '<!-- markdownlint-disable MD013 -->',
    `| ${MATRIX_HEADERS.join(' | ')} |`,
    `| ${MATRIX_HEADERS.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(
      `| ${[
        mdCell(row.id),
        mdCell(row.route),
        mdCell(row.component),
        mdCell(row.catalog),
        mdCell(row.registry),
        mdCell(row.nlu),
        mdCell(row.executor),
        mdCell(row.endpoint),
        mdCell(row.dto),
        mdCell(row.apiClient),
        mdCell(row.status),
      ].join(' | ')} |`
    );
  }

  lines.push('<!-- markdownlint-enable MD013 -->', '');

  const noted = rows.filter((r) => r.notes);
  if (noted.length > 0) {
    lines.push('## Notes', '');
    for (const row of noted) {
      lines.push(`- **${row.id}:** ${row.notes}`);
    }
    lines.push('');
  }

  lines.push('## Gaps', '');
  if (gaps.length === 0) {
    lines.push('_No automated gaps._', '');
  } else {
    lines.push('| ID | Severity | Issue | Fix |', '|----|----------|-------|-----|');
    for (const g of gaps) {
      lines.push(`| ${g.id} | ${g.severity} | ${mdCell(g.issue)} | ${mdCell(g.fix)} |`);
    }
    lines.push('');
  }

  lines.push(
    '## Related docs',
    '',
    '- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md) — extended columns (discovery, tests, tier)',
    '- [tool-visibility-matrix.md](./tool-visibility-matrix.md)',
    '- [e2e-tool-validation-matrix.md](./e2e-tool-validation-matrix.md)',
    '',
    '```bash',
    'npm run contract:write-docs',
    'npm run test:contract-matrix',
    '```',
    ''
  );

  return lines.join('\n');
}

export { deriveContractStatus, buildBackendFrontendContractRows, getContractGaps };
