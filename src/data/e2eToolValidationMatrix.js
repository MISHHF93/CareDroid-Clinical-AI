/**
 * End-to-end validation matrix — complete shipped tool inventory and wiring facts.
 * Consumed by Vitest (`e2eToolValidationMatrix.test.js`) and QA checklists.
 */

import { toolRegistryById } from './toolRegistry';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools, toolIdAliases } from './sourceCodeToolDiscovery';
import { resolveCatalogLaunch, resolveRegistryId } from './clinicalCatalogWiring';
import {
  ALL_REGISTRY_TOOL_IDS,
  NLU_PROFILE_TOOL_IDS,
  CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS,
  CLINICAL_TIER_B_CHAT_REGISTRY_IDS,
  CLINICAL_AI_PAGE_REGISTRY_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY,
} from './clinicalToolIdContract';
import {
  KNOWN_TOOL_AREA_PATHS,
  expectedLaunchPath,
  isKnownToolAreaPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';
import { resolveToolInventoryRecord, TOOL_EXECUTOR_STATUS } from './toolInventory';

/** @typedef {'A'|'B'|'C'|'clinical-page'|'fleet-A'|'fleet-B'|'hub'|'nlu-hub-only'} ToolTier */

/**
 * Deterministic test file associations per registry id (not runtime coverage %).
 * @type {Record<string, readonly string[]>}
 */
export const TEST_COVERAGE_BY_REGISTRY_ID = Object.freeze({
  [REGISTRY.sofaScore]: [
    'clinicalCatalogLaunch.test.js',
    'clinicalToolIdContract.test.js',
    'sourceCodeToolDiscovery.test.js',
  ],
  [REGISTRY.drugCheck]: [
    'clinicalCatalogLaunch.test.js',
    'clinicalToolIdContract.test.js',
    'e2eToolValidationMatrix.test.js',
  ],
  [REGISTRY.labInterp]: [
    'clinicalCatalogLaunch.test.js',
    'clinicalToolIdContract.test.js',
    'e2eToolValidationMatrix.test.js',
  ],
  [REGISTRY.calcGfr]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.calcBmi]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.calcChads2vasc]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.qsofa]: ['pr1Coverage.test.js', 'pr1CalculatorsWiring.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.news2]: ['pr1Coverage.test.js', 'pr1CalculatorsWiring.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.childPugh]: ['pr1Coverage.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.hasBled]: ['pr1Coverage.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.meld]: ['meldCalculatorsWiring.test.js', 'pr2Comprehensive.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.meldNa]: ['meldCalculatorsWiring.test.js', 'pr2Comprehensive.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.timiUaNstemi]: ['timiCalculatorsWiring.test.js', 'pr2Comprehensive.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.ascvdRisk]: [
    'ascvdRiskWiring.test.js',
    'ascvdPceCalculator.test.js',
    'pr4aComprehensive.test.js',
    'pr4aTenAreaCoverage.test.js',
    'pr4aConsistency.test.js',
    'pr4aCoverage.test.js',
    'pr4aRegistrationAudit.test.js',
    'pr4aUxSafetyAccessibility.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.ckdStaging]: [
    'ckdStagingWiring.test.js',
    'ckdStagingCalculator.test.js',
    'pr4aComprehensive.test.js',
    'pr4aTenAreaCoverage.test.js',
    'pr4aConsistency.test.js',
    'pr4aCoverage.test.js',
    'pr4aRegistrationAudit.test.js',
    'pr4aUxSafetyAccessibility.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.stopBang]: [
    'stopBangWiring.test.js',
    'stopBangCalculator.test.js',
    'pr4aComprehensive.test.js',
    'pr4aTenAreaCoverage.test.js',
    'pr4aConsistency.test.js',
    'pr4aCoverage.test.js',
    'pr4aRegistrationAudit.test.js',
    'pr4aUxSafetyAccessibility.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.auditC]: [
    'auditCWiring.test.js',
    'auditCCalculator.test.js',
    'pr4aComprehensive.test.js',
    'pr4aTenAreaCoverage.test.js',
    'pr4aConsistency.test.js',
    'pr4aCoverage.test.js',
    'pr4aRegistrationAudit.test.js',
    'pr4aUxSafetyAccessibility.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.phq9]: [
    'phq9Wiring.test.js',
    'pr5Consistency.test.js',
    'pr5Coverage.test.js',
    'wiringAuditConsistency.test.js',
    'clinicalToolsComprehensive.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.gad7]: [
    'gad7Wiring.test.js',
    'pr5Consistency.test.js',
    'pr5Coverage.test.js',
    'wiringAuditConsistency.test.js',
    'clinicalToolsComprehensive.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.wellsPe]: ['wellsPeWiring.test.js', 'pr2Comprehensive.test.js', 'pr2Coverage.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.perc]: ['percWiring.test.js', 'pr2Comprehensive.test.js', 'pr2Coverage.test.js', 'clinicalCatalogLaunch.test.js'],
  [REGISTRY.graceAcs]: [
    'graceAcsWiring.test.js',
    'pr3Comprehensive.test.js',
    'pr3Consistency.test.js',
    'pr3LaunchAudit.test.js',
    'pr3TenAreaCoverage.test.js',
    'pr3Coverage.test.js',
    'pr3RegistrationAudit.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.nihss]: [
    'nihssWiring.test.js',
    'pr3Comprehensive.test.js',
    'pr3Consistency.test.js',
    'pr3LaunchAudit.test.js',
    'pr3TenAreaCoverage.test.js',
    'pr3Coverage.test.js',
    'pr3RegistrationAudit.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.canadianCSpine]: [
    'canadianCSpineWiring.test.js',
    'pr3Comprehensive.test.js',
    'pr3Consistency.test.js',
    'pr3LaunchAudit.test.js',
    'pr3TenAreaCoverage.test.js',
    'pr3Coverage.test.js',
    'pr3RegistrationAudit.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.ottawaAnkle]: [
    'ottawaAnkleWiring.test.js',
    'pr3Comprehensive.test.js',
    'pr3Consistency.test.js',
    'pr3LaunchAudit.test.js',
    'pr3TenAreaCoverage.test.js',
    'pr3Coverage.test.js',
    'pr3RegistrationAudit.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.copdGold]: [
    'copdGoldWiring.test.js',
    'pr6Consistency.test.js',
    'wiringAuditConsistency.test.js',
    'clinicalToolsComprehensive.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.romeIvIbs]: [
    'romeIvIbsWiring.test.js',
    'pr7Consistency.test.js',
    'wiringAuditConsistency.test.js',
    'clinicalToolsComprehensive.test.js',
    'clinicalCatalogLaunch.test.js',
  ],
  [REGISTRY.dispatchAi]: ['dispatchAiWiring.test.js', 'clinicalCatalogLaunch.test.js', 'prFleetConsistency.test.js'],
  [REGISTRY.routeOptimizer]: ['routeOptimizerWiring.test.js', 'prFleetConsistency.test.js'],
  [REGISTRY.predictiveMaintenance]: ['predictiveMaintenanceWiring.test.js', 'prFleetConsistency.test.js'],
  [REGISTRY.fleetCommand]: ['fleetCommandWiring.test.js', 'prFleetConsistency.test.js'],
  [REGISTRY.protocols]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.diagnosis]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.procedures]: ['clinicalCatalogLaunch.test.js', 'clinicalToolIdContract.test.js'],
  [REGISTRY.calculatorsHub]: [
    'medicalToolsCatalogIndex.test.js',
    'clinicalCatalogLaunch.test.js',
    'catalogSearch.test.js',
  ],
});

const MATRIX_BASE_TESTS = Object.freeze([
  'e2eToolValidationMatrix.test.js',
  'clinicalToolIdContract.test.js',
  'clinicalToolAliasSync.test.js',
  'medicalToolsCatalogIndex.test.js',
]);

/** @param {string} registryId */
export function tierForRegistryId(registryId) {
  const inventoryRecord = resolveToolInventoryRecord(registryId);
  if (inventoryRecord?.tier && inventoryRecord.tier !== 'platform') return inventoryRecord.tier;
  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) return 'C';
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) return 'fleet-A';
  if (registryId === REGISTRY.dispatchAi) return 'fleet-B';
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId)) return 'A';
  if (CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) return 'B';
  if (CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId)) return 'clinical-page';
  if (registryId === REGISTRY.calculatorsHub) return 'hub';
  return 'other';
}

export function accessModesForRegistry(registryId) {
  const modes = [];
  if (CLINICAL_TIER_A_CALCULATOR_REGISTRY_IDS.includes(registryId)) modes.push('tier-a-form');
  if (REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId]) modes.push('tier-c-executor');
  if (CLINICAL_TIER_B_CHAT_REGISTRY_IDS.includes(registryId)) modes.push('tier-b-chat');
  if (registryId === REGISTRY.dispatchAi) modes.push('fleet-chat');
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) modes.push('fleet-page');
  if (CLINICAL_AI_PAGE_REGISTRY_IDS.includes(registryId)) modes.push('clinical-page');
  if (registryId === REGISTRY.calculatorsHub) modes.push('hub');
  return modes;
}

function nluProfilesForRegistry(registryId) {
  return clinicalIntentTools.filter(
    (t) => t.sidebarToolId === registryId || t.toolId === registryId
  );
}

function discoveryIdsForRegistry(registryId, nluIds) {
  const discovered = getAllDiscoveredTools();
  const ids = new Set([registryId, ...nluIds]);
  return discovered.some((row) => {
    if (ids.has(row.id)) return true;
    if (row.mapsTo && ids.has(row.mapsTo)) return true;
    if (row.registryId === registryId) return true;
    return false;
  });
}

function catalogHasRegistry(registryId) {
  return getMedicalToolsCatalogRows().some(
    (r) => r.sidebarToolId === registryId || r.id === registryId
  );
}

function testCoverageFor(registryId) {
  const specific = TEST_COVERAGE_BY_REGISTRY_ID[registryId] || [];
  return [...new Set([...MATRIX_BASE_TESTS, ...specific])].sort();
}

/**
 * @param {string} registryId
 */
export function buildMatrixRowForRegistry(registryId) {
  const inventoryRecord = resolveToolInventoryRecord(registryId);
  const reg = toolRegistryById[registryId];
  const nlus = nluProfilesForRegistry(registryId);
  const nluToolIds = [...new Set(inventoryRecord?.nluProfileIds?.length ? inventoryRecord.nluProfileIds : nlus.map((t) => t.toolId))].sort();
  const launch = resolveCatalogLaunch(registryId);
  const orchestratorNluId =
    inventoryRecord?.orchestratorToolId ?? REGISTRY_ID_TO_ORCHESTRATOR_TOOL[registryId] ?? null;
  const postExecutor =
    inventoryRecord?.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED ||
    (orchestratorNluId ? isOrchestratorPostExecutable(orchestratorNluId) : false);
  const platformEndpoint =
    (inventoryRecord?.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM && Boolean(inventoryRecord?.endpoint)) ||
    (inventoryRecord?.tier === 'C' && inventoryRecord?.endpoint === '/api/chat/message');

  return {
    id: registryId,
    kind: 'registry',
    tier: inventoryRecord?.tier ?? tierForRegistryId(registryId),
    accessModes: accessModesForRegistry(registryId),
    route: inventoryRecord?.route ?? reg?.path ?? launch.path,
    registryPresence: Boolean(reg),
    catalogPresence: inventoryRecord?.catalogVisible ?? catalogHasRegistry(registryId),
    discoveryPresence: discoveryIdsForRegistry(registryId, nluToolIds),
    nluPresence: nluToolIds.length > 0,
    nluToolIds,
    backendPostExecutor: postExecutor,
    backendPlatformEndpoint: platformEndpoint,
    backendNluExecutable: nluToolIds.some((id) =>
      clinicalIntentTools.find((t) => t.toolId === id)?.backendExecutable
    ),
    orchestratorToolId: inventoryRecord?.orchestratorToolId ?? launch.orchestratorTool,
    launch: {
      path: inventoryRecord?.route ?? launch.path,
      registryId: launch.registryId,
      orchestratorTool: inventoryRecord?.orchestratorToolId ?? launch.orchestratorTool,
      openLabel: launch.openLabel,
      hasChatSeed: Boolean(launch.chatSeed && launch.chatSeed.length > 20),
    },
    testCoverage: testCoverageFor(registryId),
  };
}

/**
 * NLU profiles that share the calculators hub registry but need distinct matrix rows.
 */
export function buildNluHubOnlyMatrixRows() {
  const hubOnlyIds = [
    'apache2-calculator',
    'curb65-calculator',
    'gcs-calculator',
    'wells-dvt-calculator',
    'dose-calculator',
    'abg-interpreter',
    'protocol-lookup',
    'acls-protocol',
    'atls-protocol',
    'differential-diagnosis',
    'antibiotic-guide',
  ];

  return hubOnlyIds
    .filter((nluId) => clinicalIntentTools.some((t) => t.toolId === nluId))
    .map((nluId) => {
      const nlu = clinicalIntentTools.find((t) => t.toolId === nluId);
      const registryId = ORCHESTRATOR_TO_REGISTRY_ID[nluId] ?? REGISTRY.calculatorsHub;
      const launch = resolveCatalogLaunch(nluId);
      return {
        id: nluId,
        kind: 'nlu-profile',
        registryId,
        tier: registryId === REGISTRY.calculatorsHub ? 'nlu-hub-only' : tierForRegistryId(registryId),
        route: launch.path,
        registryPresence: Boolean(toolRegistryById[registryId]),
        catalogPresence: getMedicalToolsCatalogRows().some((r) => r.primaryId === nluId || r.id === nluId),
        discoveryPresence: getAllDiscoveredTools().some((r) => r.id === nluId),
        nluPresence: true,
        nluToolIds: [nluId],
        backendPostExecutor: isOrchestratorPostExecutable(nluId),
        backendNluExecutable: Boolean(nlu?.backendExecutable),
        orchestratorToolId: launch.orchestratorTool,
        launch: {
          path: launch.path,
          registryId: launch.registryId,
          orchestratorTool: launch.orchestratorTool,
          openLabel: launch.openLabel,
          hasChatSeed: Boolean(launch.chatSeed && launch.chatSeed.length > 20),
        },
        testCoverage: [
          ...MATRIX_BASE_TESTS,
          'clinicalCatalogLaunch.test.js',
          'sourceCodeToolDiscovery.test.js',
        ].sort(),
      };
    });
}

/** Complete shipped-tool inventory (registry rows + supplemental NLU-only rows). */
export function buildE2eToolInventory() {
  const registryRows = ALL_REGISTRY_TOOL_IDS.map(buildMatrixRowForRegistry);
  const nluRows = buildNluHubOnlyMatrixRows().filter(
    (row) => !registryRows.some((r) => r.nluToolIds?.includes(row.id))
  );
  return [...registryRows, ...nluRows].sort((a, b) => a.id.localeCompare(b.id));
}

export function getE2eValidationMatrixDocument() {
  const inventory = buildE2eToolInventory();
  const registryRows = inventory.filter((r) => r.kind === 'registry');

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: inventory.length,
      registryTools: registryRows.length,
      nluSupplementalRows: inventory.length - registryRows.length,
      tierCounts: registryRows.reduce((acc, row) => {
        acc[row.tier] = (acc[row.tier] || 0) + 1;
        return acc;
      }, {}),
      withPostExecutor: inventory.filter((r) => r.backendPostExecutor).length,
      withCatalog: inventory.filter((r) => r.catalogPresence).length,
      withDiscovery: inventory.filter((r) => r.discoveryPresence).length,
    },
    knownToolAreaPathCount: KNOWN_TOOL_AREA_PATHS.length,
    nluProfileCount: NLU_PROFILE_TOOL_IDS.length,
    orchestratorExecutors: [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS],
    inventory,
  };
}

/** Validate a matrix row — returns issue codes (empty = ok). */
export function validateMatrixRow(row) {
  const issues = [];

  if (row.kind === 'registry' && !row.registryPresence) {
    issues.push('missing-registry');
  }

  if (row.route && !isKnownToolAreaPath(row.route)) {
    issues.push('unknown-route');
  }

  if (row.launch?.path && row.route && row.launch.path !== row.route && row.kind === 'registry') {
    const reg = toolRegistryById[row.id];
    if (reg?.path && row.launch.path !== reg.path) {
      issues.push('launch-path-mismatch');
    }
  }

  if (['A', 'B', 'C', 'clinical-page', 'fleet-A', 'fleet-B'].includes(row.tier) && !row.catalogPresence) {
    issues.push('missing-catalog');
  }

  if (row.tier === 'C' && !row.backendPostExecutor && !row.backendPlatformEndpoint) {
    issues.push('tier-c-without-executor');
  }

  if (row.backendPostExecutor && !ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(row.orchestratorToolId)) {
    issues.push('invalid-executor-flag');
  }

  if (row.tier === 'B' && row.kind === 'registry' && !row.launch?.hasChatSeed && row.id !== REGISTRY.calculatorsHub) {
    issues.push('tier-b-missing-chat-seed');
  }

  return issues;
}

export function runMatrixValidation() {
  const inventory = buildE2eToolInventory();
  const findings = inventory.map((row) => ({
    id: row.id,
    issues: validateMatrixRow(row),
  }));
  const failing = findings.filter((f) => f.issues.length > 0);
  return {
    inventory,
    findings,
    passing: findings.length - failing.length,
    failing: failing.length,
    ok: failing.length === 0,
  };
}

export function assertLaunchPathMatchesRoute(registryId) {
  const expected = expectedLaunchPath(registryId);
  const launch = resolveCatalogLaunch(registryId);
  return launch.path === expected;
}

export function assertNluResolvesToRegistry(nluToolId, expectedRegistryId) {
  return resolveRegistryId(nluToolId) === expectedRegistryId;
}

const MATRIX_COLUMNS = [
  'id',
  'tier',
  'route',
  'registry',
  'catalog',
  'discovery',
  'nlu',
  'postExecutor',
  'launchPath',
  'testCoverage',
];

function yesNo(value) {
  return value ? 'yes' : '—';
}

/**
 * Markdown inventory table for docs / CI reports (deterministic sort).
 * @param {ReturnType<typeof getE2eValidationMatrixDocument>} [doc]
 */
export function formatE2eMatrixMarkdown(doc = getE2eValidationMatrixDocument()) {
  const lines = [
    '# E2E tool validation matrix',
    '',
    `Generated: ${doc.generatedAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total inventory rows | ${doc.summary.totalRows} |`,
    `| Registry tools | ${doc.summary.registryTools} |`,
    `| NLU supplemental rows | ${doc.summary.nluSupplementalRows} |`,
    `| POST executors | ${doc.summary.withPostExecutor} |`,
    `| Catalog coverage | ${doc.summary.withCatalog} |`,
    `| Discovery coverage | ${doc.summary.withDiscovery} |`,
    '',
    '### Tier distribution (registry)',
    '',
    ...Object.entries(doc.summary.tierCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tier, count]) => `- **${tier}**: ${count}`),
    '',
    '## Column definitions',
    '',
    '| Column | Meaning |',
    '|--------|---------|',
    '| id | Canonical registry id or NLU-only profile id |',
    '| tier | A / B / C / clinical-page / fleet-A / fleet-B / hub / nlu-hub-only |',
    '| route | SPA path from registry or launch resolution |',
    '| registry | Row exists in `toolRegistry.js` |',
    '| catalog | Row in `getMedicalToolsCatalogRows()` |',
    '| discovery | Mentioned in `getAllDiscoveredTools()` |',
    '| nlu | NLU profile in `clinicalIntentTools` |',
    '| postExecutor | Registered POST `/api/tools/:id/execute` |',
    '| launchPath | `resolveCatalogLaunch` path |',
    '| testCoverage | Vitest files associated with the tool |',
    '',
    '## Inventory',
    '',
    `| ${MATRIX_COLUMNS.join(' | ')} |`,
    `| ${MATRIX_COLUMNS.map(() => '---').join(' | ')} |`,
  ];

  for (const row of doc.inventory) {
    const nlu = row.nluToolIds?.length ? row.nluToolIds.join(', ') : '—';
    const tests =
      row.testCoverage?.length > 4
        ? `${row.testCoverage.length} files`
        : row.testCoverage?.join(', ') || '—';
    lines.push(
      `| ${row.id} | ${row.tier} | ${row.route || '—'} | ${yesNo(row.registryPresence)} | ${yesNo(row.catalogPresence)} | ${yesNo(row.discoveryPresence)} | ${yesNo(row.nluPresence)}${row.nluPresence && nlu !== row.id ? ` (${nlu})` : ''} | ${yesNo(row.backendPostExecutor)} | ${row.launch?.path || '—'} | ${tests} |`
    );
  }

  lines.push(
    '',
    '## Automated gates',
    '',
    '```bash',
    'npm run test:e2e-matrix',
    'npm run e2e-matrix:report',
    '```',
    '',
    'See also: `docs/e2e-manual-qa-checklist.md`, `docs/e2e-regression-checklist.md`.',
    ''
  );

  return lines.join('\n');
}

export { KNOWN_TOOL_AREA_PATHS, expectedLaunchPath, matchCalculatorRoute, toolIdAliases, MATRIX_COLUMNS };
