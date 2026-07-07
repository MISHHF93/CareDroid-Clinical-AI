/**
 * Render / execute smoke matrix — every shipped tool’s expected UX mode.
 * @see docs/tool-render-execute-matrix.md
 */

import toolRegistry, { toolRegistryById } from './toolRegistry';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  ALL_REGISTRY_TOOL_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  REGISTRY,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
} from './clinicalToolIdContract';
import { buildMatrixRowForRegistry, buildE2eToolInventory } from './e2eToolValidationMatrix';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import { matchCalculatorRoute, isKnownToolAreaPath } from '../routes/clinicalToolRoutes';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';
import { resolveToolInventoryRecord, TOOL_EXECUTOR_STATUS, TOOL_LAUNCH_TYPES } from './toolInventory';

export const EXECUTION_MODES = Object.freeze({
  LOCAL_CALCULATOR: 'local-calculator',
  POST_EXECUTOR: 'post-executor',
  CHAT_PAGE: 'chat-page',
  CHAT_HUB: 'chat-hub',
  FLEET_LOCAL: 'fleet-local',
  HUB: 'hub',
});

/** Manual + automated checklist columns (10 validation points). */
export const RENDER_EXECUTE_CHECK_COLUMNS = Object.freeze([
  { id: 'routeRenders', label: 'Route renders' },
  { id: 'nonEmpty', label: 'Page non-empty' },
  { id: 'tierAForm', label: 'Tier A form inputs' },
  { id: 'tierAResult', label: 'Tier A result after valid input' },
  { id: 'tierBChatSeed', label: 'Tier B chatSeed' },
  { id: 'tierCExecutor', label: 'Tier C backend executor' },
  { id: 'apiGraceful', label: 'API succeeds or graceful fail' },
  { id: 'catalogLaunch', label: 'Catalog launch works' },
  { id: 'sidebarVisible', label: 'Sidebar entry if visible' },
  { id: 'deepLink', label: 'Direct deep link works' },
]);

const builtinSlugByRegistry = Object.freeze(
  Object.fromEntries(
    builtinUiCalculators
      .filter((c) => c.path)
      .map((c) => {
        const regEntry = toolRegistry.find(
          (t) => t.initialCalc === c.id || t.path === c.path
        );
        return [regEntry?.id ?? c.id, c.id];
      })
      .filter(([regId]) => regId)
  )
);

/**
 * @param {string} registryId
 */
export function executionModeForRegistry(registryId) {
  const inventoryRecord = resolveToolInventoryRecord(registryId);
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED) {
    return EXECUTION_MODES.POST_EXECUTOR;
  }
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.FLEET_LOCAL) {
    return EXECUTION_MODES.FLEET_LOCAL;
  }
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) {
    return EXECUTION_MODES.CHAT_HUB;
  }
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.CLINICAL_PAGE) {
    return EXECUTION_MODES.CHAT_PAGE;
  }
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.HUB) {
    return EXECUTION_MODES.HUB;
  }
  if (inventoryRecord?.launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY) {
    return EXECUTION_MODES.LOCAL_CALCULATOR;
  }
  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) return EXECUTION_MODES.POST_EXECUTOR;
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) return EXECUTION_MODES.FLEET_LOCAL;
  if (registryId === REGISTRY.dispatchAi) return EXECUTION_MODES.CHAT_HUB;
  if (CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) return EXECUTION_MODES.CHAT_HUB;
  if (CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId)) return EXECUTION_MODES.CHAT_PAGE;
  if (registryId === REGISTRY.calculatorsHub) return EXECUTION_MODES.HUB;
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId)) {
    return EXECUTION_MODES.LOCAL_CALCULATOR;
  }
  return 'other';
}

/**
 * @param {string} registryId
 */
export function smokePathForRegistry(registryId) {
  const reg = toolRegistryById[registryId];
  if (reg?.path) return reg.path;
  const launch = resolveCatalogLaunch(registryId);
  return launch.path;
}

/**
 * @param {string} mode
 * @param {string} registryId
 */
export function buildChecklistFlags(mode, registryId) {
  const launch = resolveCatalogLaunch(registryId);
  const reg = toolRegistryById[registryId];
  const slug = builtinSlugByRegistry[registryId] || reg?.initialCalc;
  const path = smokePathForRegistry(registryId);

  return {
    routeRenders: Boolean(path && (isKnownToolAreaPath(path) || path === '/assistant')),
    nonEmpty: true,
    tierAForm: mode === EXECUTION_MODES.LOCAL_CALCULATOR,
    tierAResult: mode === EXECUTION_MODES.LOCAL_CALCULATOR,
    tierBChatSeed: mode === EXECUTION_MODES.CHAT_HUB,
    tierCExecutor: mode === EXECUTION_MODES.POST_EXECUTOR,
    apiGraceful:
      mode === EXECUTION_MODES.POST_EXECUTOR ||
      mode === EXECUTION_MODES.CHAT_PAGE,
    catalogLaunch: Boolean(launch.path || launch.chatSeed),
    sidebarVisible: Boolean(reg),
    deepLink: Boolean(path),
    calculatorSlug: slug || null,
    smokePath: path,
    orchestratorToolId: launch.orchestratorTool,
    usesPostExecute: mode === EXECUTION_MODES.POST_EXECUTOR,
    usesChatApi: mode === EXECUTION_MODES.CHAT_PAGE,
    usesLocalOnly:
      mode === EXECUTION_MODES.LOCAL_CALCULATOR || mode === EXECUTION_MODES.FLEET_LOCAL,
  };
}

/**
 * @param {string} registryId
 */
export function buildRenderExecuteRow(registryId) {
  const mode = executionModeForRegistry(registryId);
  const matrixRow = buildMatrixRowForRegistry(registryId);
  const checks = buildChecklistFlags(mode, registryId);
  const inventoryRecord = resolveToolInventoryRecord(registryId);

  return {
    id: registryId,
    tier: matrixRow.tier,
    executionMode: mode,
    route: matrixRow.route,
    smokePath: checks.smokePath,
    calculatorSlug: checks.calculatorSlug,
    checks,
    launch: matrixRow.launch,
    backendPostExecutor: matrixRow.backendPostExecutor,
    backendPlatformEndpoint: matrixRow.backendPlatformEndpoint,
    endpoint: inventoryRecord?.endpoint || null,
    executorStatus: inventoryRecord?.executorStatus || null,
    orchestratorToolId: matrixRow.orchestratorToolId,
  };
}

export function buildRenderExecuteMatrix() {
  return ALL_REGISTRY_TOOL_IDS.map(buildRenderExecuteRow).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * @param {ReturnType<typeof buildRenderExecuteRow>} row
 */
export function validateRenderExecuteRow(row) {
  const issues = [] as any[];

  if (!row.checks.routeRenders) issues.push('no-smoke-route');
  if (row.executionMode === EXECUTION_MODES.POST_EXECUTOR) {
    const hasPlatformEndpoint =
      row.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM && Boolean(row.endpoint);
    if (!row.backendPostExecutor && !hasPlatformEndpoint) issues.push('tier-c-missing-executor');
    if (
      !hasPlatformEndpoint &&
      (!row.orchestratorToolId || !isOrchestratorPostExecutable(row.orchestratorToolId))
    ) {
      issues.push('tier-c-invalid-orchestrator-id');
    }
  }
  if (row.executionMode === EXECUTION_MODES.LOCAL_CALCULATOR && row.backendPostExecutor) {
    issues.push('tier-a-false-post-executor');
  }
  if (row.executionMode === EXECUTION_MODES.LOCAL_CALCULATOR && row.orchestratorToolId) {
    const allowed = row.id === REGISTRY.sofaScore;
    if (!allowed) issues.push('tier-a-unexpected-orchestrator-launch');
  }
  if (row.executionMode === EXECUTION_MODES.CHAT_HUB && !row.launch?.hasChatSeed) {
    issues.push('tier-b-missing-chat-seed');
  }
  if (
    row.executionMode === EXECUTION_MODES.LOCAL_CALCULATOR &&
    row.checks.smokePath &&
    !matchCalculatorRoute(row.checks.smokePath) &&
    !row.checks.smokePath.startsWith('/tools/calculator/')
  ) {
    issues.push('tier-a-unregistered-calculator-path');
  }
  if (
    [EXECUTION_MODES.CHAT_HUB, EXECUTION_MODES.FLEET_LOCAL, EXECUTION_MODES.HUB].includes(
      row.executionMode
    ) &&
    row.backendPostExecutor
  ) {
    issues.push('non-tier-c-post-executor');
  }

  return issues;
}

export function runRenderExecuteValidation() {
  const rows = buildRenderExecuteMatrix();
  const findings = rows.map((row) => ({
    id: row.id,
    issues: validateRenderExecuteRow(row),
  }));
  const failing = findings.filter((f) => f.issues.length > 0);
  return {
    rows,
    findings,
    ok: failing.length === 0,
    failing: failing.length,
  };
}

/** Paths for automated page smoke (unique, registered). */
export function getToolPageSmokeRoutes() {
  const rows = buildRenderExecuteMatrix();
  const paths = new Set([
    '/tools',
    '/tools/catalog',
    '/tools/calculators',
    '/assistant',
  ]);
  for (const row of rows) {
    if (row.smokePath && row.checks.routeRenders) paths.add(row.smokePath);
  }
  return [...paths].sort();
}

export function formatRenderExecuteMarkdown() {
  const { rows, ok, failing } = runRenderExecuteValidation();
  const lines = [
    '# Tool render / execute matrix',
    '',
    `Generated from \`src/data/toolRenderExecuteMatrix.js\`. Validation: **${ok ? 'PASS' : `FAIL (${failing} tools)`}**.`,
    '',
    '| Tool | Tier | Mode | Smoke path | POST | Chat seed | Local only |',
    '|------|------|------|------------|------|-----------|------------|',
  ];
  for (const row of rows) {
    lines.push(
      `| \`${row.id}\` | ${row.tier} | ${row.executionMode} | \`${row.smokePath || '—'}\` | ${row.checks.usesPostExecute ? 'yes' : '—'} | ${row.checks.tierBChatSeed ? 'yes' : '—'} | ${row.checks.usesLocalOnly ? 'yes' : '—'} |`,
    );
  }
  lines.push('', '## Checklist columns', '');
  for (const col of RENDER_EXECUTE_CHECK_COLUMNS) {
    lines.push(`- **${col.id}**: ${col.label}`);
  }
  lines.push('', '## Registered POST executors', '', ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.map((id) => `- \`${id}\``).join('\n'));
  return lines.join('\n');
}

/** Per-tool manual QA rows (registry tools). */
export function buildPerToolManualQaRows() {
  return buildRenderExecuteMatrix().map((row) => ({
    toolId: row.id,
    tier: row.tier,
    executionMode: row.executionMode,
    ...row.checks,
    deepLink: row.smokePath,
  }));
}

export { buildE2eToolInventory };
