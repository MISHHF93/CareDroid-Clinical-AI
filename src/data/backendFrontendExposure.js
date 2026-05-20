/**
 * Production exposure scan — matches frontend API inventory to backend routes and capability gates.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BACKEND_API_CAPABILITIES,
  BACKEND_EXECUTOR_NLU_TOOL_IDS,
  isBackendCapabilityEnabled,
} from '../config/backendApiCapabilities';
import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from './clinicalToolIdContract';
import { buildBackendFrontendContractRows, getContractGaps } from './backendFrontendToolContract';
import { findBackendRoute, BACKEND_HTTP_ROUTES, listBackendRoutePaths } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');

/**
 * @returns {import('./frontendApiCallsInventory.js').FrontendApiCall & {
 *   hasBackendRoute: boolean,
 *   capabilityEnabled: boolean|null,
 *   exposure: 'wired'|'gated-stub'|'unguarded-missing'
 * }}
 */
export function analyzeFrontendApiCall(call) {
  const route = findBackendRoute(call.method, call.path);
  const hasBackendRoute = Boolean(route);
  const capabilityEnabled =
    call.capability === undefined ? null : isBackendCapabilityEnabled(call.capability);

  let exposure = 'wired';
  if (!hasBackendRoute) {
    exposure = capabilityEnabled === false ? 'gated-stub' : 'unguarded-missing';
  }

  return {
    ...call,
    hasBackendRoute,
    capabilityEnabled,
    exposure,
    backendController: route?.controller ?? null,
  };
}

export function runBackendFrontendExposureScan() {
  const analyzed = FRONTEND_API_CALLS.map(analyzeFrontendApiCall);
  const unguarded = analyzed.filter((c) => c.exposure === 'unguarded-missing');
  const gatedStubs = analyzed.filter((c) => c.exposure === 'gated-stub');
  const wired = analyzed.filter((c) => c.exposure === 'wired');

  const contractRows = buildBackendFrontendContractRows();
  const falseExecutorClaims = contractRows.filter(
    (r) => r.kind === 'nlu' && r.backendExecutor === 'yes' && !ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(r.canonicalId)
  );

  const backendOnlyRoutes = BACKEND_HTTP_ROUTES.filter(
    (r) => !FRONTEND_API_CALLS.some((c) => findBackendRoute(c.method, c.path)?.path === r.path && c.method === r.method)
  );

  return {
    analyzed,
    unguarded,
    gatedStubs,
    wired,
    falseExecutorClaims,
    contractGaps: getContractGaps(contractRows),
    backendRouteCount: BACKEND_HTTP_ROUTES.length,
    frontendCallCount: FRONTEND_API_CALLS.length,
    executorNluIds: [...BACKEND_EXECUTOR_NLU_TOOL_IDS],
    backendOnlyRouteCount: backendOnlyRoutes.length,
  };
}

export function assertExposureScanPasses() {
  const scan = runBackendFrontendExposureScan();
  const errors = [];

  if (scan.unguarded.length > 0) {
    errors.push(
      `Unguarded frontend calls without backend routes: ${scan.unguarded.map((c) => c.id).join(', ')}`
    );
  }

  if (scan.falseExecutorClaims.length > 0) {
    errors.push(
      `False POST executor claims: ${scan.falseExecutorClaims.map((r) => r.canonicalId).join(', ')}`
    );
  }

  for (const call of FRONTEND_API_CALLS) {
    if (call.capability && !(call.capability in BACKEND_API_CAPABILITIES)) {
      errors.push(`Unknown capability key on ${call.id}: ${call.capability}`);
    }
  }

  if (
    JSON.stringify([...BACKEND_EXECUTOR_NLU_TOOL_IDS].sort()) !==
    JSON.stringify([...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort())
  ) {
    errors.push('BACKEND_EXECUTOR_NLU_TOOL_IDS drift from ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS');
  }

  return { ok: errors.length === 0, errors, scan };
}

export function readViteDevConfig() {
  const vitePath = join(repoRoot, 'vite.config.js');
  const source = readFileSync(vitePath, 'utf8');
  const portMatch = source.match(/server:\s*\{[\s\S]*?port:\s*(\d+)/);
  const proxyMatch = source.match(/VITE_API_PROXY_TARGET\s*\|\|\s*['"]([^'"]+)['"]/);
  return {
    devPort: portMatch ? Number(portMatch[1]) : null,
    proxyTarget: proxyMatch ? proxyMatch[1] : null,
    proxiesApi: source.includes("'/api'"),
    proxiesHealth: source.includes("'/health'"),
    proxiesSocketIo: source.includes("'/socket.io'"),
  };
}

export function formatBackendExposureReportMarkdown(scan = runBackendFrontendExposureScan()) {
  const vite = readViteDevConfig();
  const lines = [
    '# Backend exposure report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '> Regenerate: `npm run exposure:write-docs`',
    '',
    '## Executive summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Backend HTTP routes (inventory) | ${scan.backendRouteCount} |`,
    `| Frontend API calls (inventory) | ${scan.frontendCallCount} |`,
    `| Wired (route exists) | ${scan.wired.length} |`,
    `| Gated stubs (no route, capability off) | ${scan.gatedStubs.length} |`,
    `| Unguarded missing routes | ${scan.unguarded.length} |`,
    `| POST executors (backend) | ${scan.executorNluIds.length} |`,
    `| Contract gaps (matrix) | ${scan.contractGaps.length} |`,
    '',
    '## Vite dev proxy',
    '',
    '| Setting | Value |',
    '|---------|-------|',
    `| Frontend dev port | ${vite.devPort ?? '—'} |`,
    `| Proxy target | ${vite.proxyTarget ?? '—'} |`,
    `| Proxies \`/api\` | ${vite.proxiesApi ? 'yes' : 'no'} |`,
    `| Proxies \`/health\` | ${vite.proxiesHealth ? 'yes' : 'no'} |`,
    `| Proxies \`/socket.io\` | ${vite.proxiesSocketIo ? 'yes' : 'no'} |`,
    '',
    '## Registered POST executors',
    '',
    ...scan.executorNluIds.map((id) => `- \`${id}\` → \`POST /api/tools/${id}/execute\``),
    '',
    '## Frontend calls without backend routes (gated)',
    '',
    '| ID | Method | Path | Capability | Client |',
    '|----|--------|------|------------|--------|',
    ...scan.gatedStubs.map(
      (c) => `| ${c.id} | ${c.method} | \`${c.path}\` | ${c.capability} | ${c.client} |`
    ),
    '',
  ];

  if (scan.unguarded.length > 0) {
    lines.push('## ⚠️ Unguarded missing routes', '', '| ID | Method | Path | Client |', '|----|--------|------|--------|');
    for (const c of scan.unguarded) {
      lines.push(`| ${c.id} | ${c.method} | \`${c.path}\` | ${c.client} |`);
    }
    lines.push('');
  }

  if (scan.contractGaps.length > 0) {
    lines.push('## Contract gaps', '');
    for (const g of scan.contractGaps) {
      lines.push(`- **${g.id}** (${g.severity}): ${g.issue}`);
    }
    lines.push('');
  }

  lines.push('## Related docs', '', '- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md)', '- [endpoint-to-frontend-matrix.md](./endpoint-to-frontend-matrix.md)', '- [backend-api-inventory.md](./backend-api-inventory.md)', '');

  return lines.join('\n');
}

export function formatEndpointMatrixMarkdown(scan = runBackendFrontendExposureScan()) {
  const lines = [
    '# Endpoint-to-frontend matrix',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '| Method | Path | Backend | Frontend client | Exposure |',
    '|--------|------|---------|-----------------|----------|',
    ...scan.analyzed.map((c) => {
      const exposure =
        c.exposure === 'wired' ? '✅' : c.exposure === 'gated-stub' ? '⚠️ gated' : '❌ unguarded';
      return `| ${c.method} | \`${c.path}\` | ${c.backendController ?? '—'} | ${c.client} | ${exposure} |`;
    }),
    '',
    '## Backend route inventory (reference)',
    '',
    ...listBackendRoutePaths().slice(0, 20).map((r) => `- \`${r}\``),
    '',
    `_…and ${listBackendRoutePaths().length - 20} more in src/data/backendHttpRouteInventory.js_`,
    '',
  ];
  return lines.join('\n');
}
