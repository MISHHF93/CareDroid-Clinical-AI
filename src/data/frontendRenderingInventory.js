/**
 * Frontend rendering inventory — PR1–PR6 roadmap tools + fleet operations.
 * Validates UI render paths (routes, hub cards, forms, disclaimers) atop wiring matrices.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import toolRegistry, { toolRegistryById } from './toolRegistry';
import {
  builtinUiCalculators,
  clinicalIntentTools,
  nluCalculatorHubOnly,
} from './clinicalIntentToolCatalog';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import { resolveCatalogLaunch } from './clinicalCatalogWiring';
import {
  PR1_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR2_TIER_B_CHAT_CALCULATOR_IDS,
  PR3_TIER_B_CHAT_CALCULATOR_IDS,
  PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  PR6_TIER_B_CHAT_CALCULATOR_IDS,
  PR7_TIER_B_CHAT_CALCULATOR_IDS,
  FLEET_TIER_A_REGISTRY_IDS,
  TIER_B_CHAT_CALCULATOR_REGISTRY_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  REGISTRY,
} from './clinicalToolIdContract';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { PR_FLEET_TOOL_SPECS } from './prFleetTestConstants';
import { tierForRegistryId } from './e2eToolValidationMatrix';
import {
  getCalculatorRouteBySlug,
  isKnownToolAreaPath,
} from '../routes/clinicalToolRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));

const appSource = readFileSync(join(__dirname, '../App.jsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const toolPageLayoutSource = readFileSync(join(__dirname, '../pages/tools/ToolPageLayout.jsx'), 'utf8');
const catalogSource = readFileSync(join(__dirname, '../pages/tools/ClinicalToolCatalog.jsx'), 'utf8');
const toolNotFoundSource = readFileSync(join(__dirname, '../pages/tools/ToolNotFound.jsx'), 'utf8');
const fleetPageChromeSource = readFileSync(join(__dirname, '../pages/fleet/FleetPageChrome.jsx'), 'utf8');

/** User-facing roadmap scope (PR1–PR5 calculators + PR5/6 chat + fleet PR6). */
export const ROADMAP_FRONTEND_REGISTRY_IDS = Object.freeze([
  ...PR1_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR2_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR3_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS,
  ...PR6_TIER_B_CHAT_CALCULATOR_IDS,
  ...PR7_TIER_B_CHAT_CALCULATOR_IDS,
  ...FLEET_TIER_A_REGISTRY_IDS,
  REGISTRY.dispatchAi,
]);

/** @type {Record<string, string>} */
export const ROADMAP_PR_SLICE_BY_REGISTRY_ID = Object.freeze(
  Object.fromEntries([
    ...PR1_CALCULATOR_REGISTRY_IDS.map((id) => [id, 'PR1']),
    ...PR2_TIER_A_CALCULATOR_REGISTRY_IDS.map((id) => [id, 'PR2']),
    ...PR2_TIER_B_CHAT_CALCULATOR_IDS.map((id) => [id, 'PR2']),
    ...PR3_TIER_B_CHAT_CALCULATOR_IDS.map((id) => [id, 'PR3']),
    ...PR4A_TIER_A_CALCULATOR_REGISTRY_IDS.map((id) => [id, 'PR4A']),
    ...PR5_TIER_A_CALCULATOR_REGISTRY_IDS.map((id) => [id, 'PR5']),
    ...PR6_TIER_B_CHAT_CALCULATOR_IDS.map((id) => [id, 'PR5']),
    ...PR7_TIER_B_CHAT_CALCULATOR_IDS.map((id) => [id, 'PR5']),
    [REGISTRY.fleetCommand, 'PR6-fleet'],
    [REGISTRY.predictiveMaintenance, 'PR6-fleet'],
    [REGISTRY.routeOptimizer, 'PR6-fleet'],
    [REGISTRY.dispatchAi, 'PR6-fleet'],
  ])
);

const REGISTRY_ID_TO_BUILTIN_SLUG = Object.freeze(
  Object.fromEntries(
    Object.entries(BUILTIN_CALC_ID_TO_REGISTRY_ID).map(([slug, registryId]) => [registryId, slug])
  )
);

const HUB_GROUP_TOOL_IDS = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));

const catalogRows = () => getMedicalToolsCatalogRows();
const discoveredRows = () => getAllDiscoveredTools();

function catalogHasRegistry(registryId) {
  return catalogRows().some((r) => r.sidebarToolId === registryId || r.id === registryId);
}

function discoveryHasRegistry(registryId) {
  const ids = new Set([registryId]);
  for (const nlu of clinicalIntentTools.filter(
    (t) => t.sidebarToolId === registryId || t.toolId === registryId
  )) {
    ids.add(nlu.toolId);
  }
  return discoveredRows().some(
    (row) => ids.has(row.id) || ids.has(row.mapsTo) || row.registryId === registryId
  );
}

function nluApplies(registryId) {
  return clinicalIntentTools.some(
    (t) => t.toolId === registryId || t.sidebarToolId === registryId
  );
}

function appUsesCalculatorRedirectRoutes() {
  return (
    appSource.includes("path: '/tools/calculators'") &&
    appSource.includes("path: '/tools/calculators/:slug'") &&
    appSource.includes('<LegacyCalculatorRouteRedirect />')
  );
}

function appRouteRegistered(registryId, builtinSlug, regPath) {
  if (FLEET_TIER_A_REGISTRY_IDS.includes(registryId)) {
    const spec = PR_FLEET_TOOL_SPECS[registryId];
    if (!spec?.routePath) return false;
    return isKnownToolAreaPath(spec.routePath) && Boolean(spec.appComponent);
  }
  if (builtinSlug) {
    const def = getCalculatorRouteBySlug(builtinSlug);
    if (def && appUsesCalculatorRedirectRoutes()) return true;
    if (appSource.includes(`initialCalculatorId="${builtinSlug}"`)) return true;
    if (def && appSource.includes(`path: '${def.path}'`)) return true;
  }
  if (regPath && appSource.includes(`path: '${regPath}'`)) return true;
  return false;
}

function calculatorsSwitchRegistered(builtinSlug) {
  if (!builtinSlug) return false;
  return calculatorsSource.includes(`case '${builtinSlug}':`);
}

function hubCardRegistered(registryId) {
  if (!TIER_B_CHAT_CALCULATOR_REGISTRY_IDS.includes(registryId)) return null;
  const inHubOnly = nluCalculatorHubOnly.some((h) => h.toolId === registryId);
  const inHubGroups = HUB_GROUP_TOOL_IDS.has(registryId);
  const inCalculatorsFilter = calculatorsSource.includes('getHubChatAssistedTools');
  const ariaPresent =
    calculatorsSource.includes('chatAssistedLaunchAriaLabelForTool') ||
    calculatorsSource.includes('fleetChatAssistedLaunchAriaLabel');
  return inHubOnly && inHubGroups && inCalculatorsFilter && ariaPresent;
}

function sidebarDestinationOk(reg) {
  if (!reg?.path) return false;
  if (isKnownToolAreaPath(reg.path)) return true;
  return appRouteRegistered(reg.id, REGISTRY_ID_TO_BUILTIN_SLUG[reg.id], reg.path);
}

function disclaimerLayerOk(registryId, tier) {
  if (tier === 'fleet-A') {
    const spec = PR_FLEET_TOOL_SPECS[registryId];
    return (
      fleetPageChromeSource.includes('FleetOperationalBanner') &&
      (spec?.appComponent
        ? readFileSync(
            join(__dirname, `../pages/fleet/${spec.appComponent}.jsx`),
            'utf8'
          ).includes('fleet-operational') ||
          readFileSync(
            join(__dirname, `../pages/fleet/${spec.appComponent}.jsx`),
            'utf8'
          ).includes('FleetOperationalBanner')
        : false)
    );
  }
  if (tier === 'fleet-B' || tier === 'B') {
    if (registryId === REGISTRY.dispatchAi) {
      return (
        calculatorsSource.includes('fleet-dispatch') &&
        calculatorsSource.includes('fleetChatAssistedLaunchAriaLabel')
      );
    }
    return (
      toolPageLayoutSource.includes('ClinicalDecisionSupportDisclaimer') &&
      calculatorsSource.includes('calc-chat-assisted')
    );
  }
  if (tier === 'A') {
    return toolPageLayoutSource.includes('ClinicalDecisionSupportDisclaimer');
  }
  return true;
}

/**
 * @param {string} registryId
 */
export function buildFrontendRenderingRow(registryId) {
  const reg = toolRegistryById[registryId];
  const tier = tierForRegistryId(registryId);
  const builtinSlug = REGISTRY_ID_TO_BUILTIN_SLUG[registryId] ?? null;
  const launch = resolveCatalogLaunch(registryId);
  const uiCalc = builtinSlug
    ? builtinUiCalculators.find((c) => c.id === builtinSlug)
    : builtinUiCalculators.find((c) => c.id === registryId);

  return {
    registryId,
    prSlice: ROADMAP_PR_SLICE_BY_REGISTRY_ID[registryId] ?? 'other',
    displayLabel: reg?.name ?? uiCalc?.name ?? registryId,
    category: reg?.category ?? null,
    tier,
    builtinSlug,
    route: reg?.path ?? launch.path,
    launchPath: launch.path,
    layers: {
      appRoute: appRouteRegistered(registryId, builtinSlug, reg?.path),
      sidebarPath: sidebarDestinationOk(reg),
      registry: Boolean(reg),
      catalog: catalogHasRegistry(registryId),
      discovery: discoveryHasRegistry(registryId),
      nlu: nluApplies(registryId),
      catalogLaunchHandler: catalogSource.includes('applyRegistryToolLaunch'),
      calculatorHub: Boolean(
        uiCalc || TIER_B_CHAT_CALCULATOR_REGISTRY_IDS.includes(registryId)
      ),
      tierAFormSwitch: tier === 'A' ? calculatorsSwitchRegistered(builtinSlug) : null,
      tierBHubCard: ['B', 'fleet-B'].includes(tier) ? hubCardRegistered(registryId) : null,
      tierBChatSeed:
        ['B', 'fleet-B'].includes(tier) &&
        Boolean(launch.chatSeed && launch.chatSeed.length > 20),
      fleetPage: tier === 'fleet-A' ? appRouteRegistered(registryId, null, reg?.path) : null,
      clinicalDisclaimer: ['A', 'B'].includes(tier) ? disclaimerLayerOk(registryId, tier) : null,
      operationalDisclaimer: ['fleet-A', 'fleet-B'].includes(tier)
        ? disclaimerLayerOk(registryId, tier)
        : null,
      toolNotFoundFallback:
        calculatorsSource.includes('<ToolNotFound') && toolNotFoundSource.includes('resolveCatalogLaunch'),
      mobileSafeLayout:
        catalogSource.includes('clinical-tool-catalog') &&
        (fleetPageChromeSource.includes('min-height: 44px') ||
          readFileSync(join(__dirname, '../pages/fleet/fleetUxShared.css'), 'utf8').includes(
            'min-height: 44px'
          )),
    },
  };
}

/**
 * @param {ReturnType<typeof buildFrontendRenderingRow>} row
 * @returns {string[]}
 */
export function validateFrontendRenderingRow(row) {
  const issues = [];
  const { layers: L, tier, registryId } = row;

  if (!L.registry) issues.push('missing-registry');
  if (!row.displayLabel || row.displayLabel === registryId) {
    if (!toolRegistryById[registryId]?.name) issues.push('missing-display-label');
  }
  if (!row.category) issues.push('missing-category');
  if (!L.catalog) issues.push('missing-catalog');
  if (!L.discovery) issues.push('missing-discovery');
  if (!L.catalogLaunchHandler) issues.push('missing-catalog-launch');
  if (!L.sidebarPath) issues.push('sidebar-dead-link');
  if (!L.appRoute) issues.push('missing-app-route');
  if (tier === 'A' && !L.tierAFormSwitch) issues.push('tier-a-no-form-switch');
  if (tier === 'A' && !L.clinicalDisclaimer) issues.push('missing-clinical-disclaimer');
  if ((tier === 'B' || tier === 'fleet-B') && !L.tierBHubCard) issues.push('tier-b-no-hub-card');
  if ((tier === 'B' || tier === 'fleet-B') && !L.tierBChatSeed) issues.push('tier-b-no-chat-seed');
  if (tier === 'B' && !L.clinicalDisclaimer) issues.push('missing-clinical-disclaimer');
  if (tier === 'fleet-A' && !L.fleetPage) issues.push('fleet-page-not-wired');
  if (tier === 'fleet-A' && !L.operationalDisclaimer) issues.push('missing-operational-disclaimer');
  if (tier === 'fleet-B' && !L.operationalDisclaimer) issues.push('missing-operational-disclaimer');
  if (!L.toolNotFoundFallback) issues.push('missing-not-found-fallback');
  if (row.launchPath && !isKnownToolAreaPath(row.launchPath) && tier !== 'fleet-B') {
    issues.push('launch-unknown-path');
  }

  return issues;
}

export function buildFrontendRenderingInventory() {
  return ROADMAP_FRONTEND_REGISTRY_IDS.map(buildFrontendRenderingRow);
}

export function findRoadmapDuplicateIds() {
  const seen = new Set();
  const dupes = [];
  for (const id of ROADMAP_FRONTEND_REGISTRY_IDS) {
    if (seen.has(id)) dupes.push(id);
    seen.add(id);
  }
  return dupes;
}

export function findRoadmapDuplicateLabels() {
  const byLabel = new Map();
  for (const id of ROADMAP_FRONTEND_REGISTRY_IDS) {
    const row = buildFrontendRenderingRow(id);
    const key = row.displayLabel?.toLowerCase();
    if (!key) continue;
    if (!byLabel.has(key)) byLabel.set(key, []);
    byLabel.get(key).push(id);
  }
  return [...byLabel.entries()].filter(([, ids]) => ids.length > 1);
}

const SHARED_HUB_PATHS = new Set(['/tools/calculators']);

export function findRoadmapRouteCollisions() {
  const byPath = new Map();
  for (const id of ROADMAP_FRONTEND_REGISTRY_IDS) {
    const row = buildFrontendRenderingRow(id);
    const path = row.route;
    if (!path || SHARED_HUB_PATHS.has(path)) continue;
    if (!byPath.has(path)) byPath.set(path, []);
    byPath.get(path).push(id);
  }
  return [...byPath.entries()].filter(([, ids]) => ids.length > 1);
}

export function runFrontendRenderingAudit() {
  const inventory = buildFrontendRenderingInventory();
  const findings = inventory.map((row) => ({
    registryId: row.registryId,
    prSlice: row.prSlice,
    issues: validateFrontendRenderingRow(row),
  }));
  const failing = findings.filter((f) => f.issues.length > 0);

  return {
    inventory,
    findings,
    duplicateIds: findRoadmapDuplicateIds(),
    duplicateLabels: findRoadmapDuplicateLabels(),
    routeCollisions: findRoadmapRouteCollisions(),
    passing: findings.length - failing.length,
    failing: failing.length,
    ok:
      failing.length === 0 &&
      findRoadmapDuplicateIds().length === 0 &&
      findRoadmapRouteCollisions().length === 0,
  };
}

/** Markdown-friendly inventory table rows for QA docs. */
export function formatRenderingInventoryTable() {
  return buildFrontendRenderingInventory().map((row) => ({
    id: row.registryId,
    pr: row.prSlice,
    label: row.displayLabel,
    tier: row.tier,
    route: row.route,
    catalog: row.layers.catalog ? 'yes' : 'no',
    form: row.layers.tierAFormSwitch === null ? 'chat' : row.layers.tierAFormSwitch ? 'yes' : 'no',
    hub: row.layers.tierBHubCard === null ? 'n/a' : row.layers.tierBHubCard ? 'yes' : 'no',
  }));
}

export function formatMissingRenderReport(audit = runFrontendRenderingAudit()) {
  const lines = [];
  if (audit.duplicateIds.length) {
    lines.push(`Duplicate canonical IDs: ${audit.duplicateIds.join(', ')}`);
  }
  for (const [label, ids] of audit.duplicateLabels) {
    lines.push(`Duplicate label "${label}": ${ids.join(', ')}`);
  }
  for (const [path, ids] of audit.routeCollisions) {
    lines.push(`Route collision ${path}: ${ids.join(', ')}`);
  }
  for (const f of audit.findings.filter((x) => x.issues.length)) {
    lines.push(`${f.registryId} (${f.prSlice}): ${f.issues.join(', ')}`);
  }
  return lines.length ? lines.join('\n') : 'No missing render paths.';
}

/** Sidebar-visible roadmap tools must resolve to a real destination. */
export function sidebarVisibleRoadmapTools() {
  return toolRegistry.filter((t) => ROADMAP_FRONTEND_REGISTRY_IDS.includes(t.id));
}
