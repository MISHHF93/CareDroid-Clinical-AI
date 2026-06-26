/**
 * Canonical visibility matrix for medical calculators and clinical tools.
 * Source-derived — regenerate: npm run visibility-matrix:write-docs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolRegistryById } from './toolRegistry';
import { builtinUiCalculators, clinicalIntentTools } from './clinicalIntentToolCatalog';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from './sourceCodeToolDiscovery';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
} from './clinicalCatalogWiring';
import {
  ALL_REGISTRY_TOOL_IDS,
  BUILTIN_CALC_ID_TO_REGISTRY_ID,
  KEYWORD_ROUTED_REGISTRY_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  ORCHESTRATOR_TO_REGISTRY_ID,
  REGISTRY,
  registryToPrimaryNluToolId,
} from './clinicalToolIdContract';
import { tierForRegistryId } from './e2eToolValidationMatrix';
import { readToolPatternsSource } from './clinicalToolAliasSync';
import { parseClinicalToolPatternRecords } from './parseToolPatterns';
import {
  CALCULATOR_ROUTE_DEFS,
  getCalculatorRouteBySlug,
  isKnownToolAreaPath,
  matchCalculatorRoute,
} from '../routes/clinicalToolRoutes';
import { CHAT_ASSISTED_HUB_GROUPS } from './chatAssistedHubGroups';
import { PR_FLEET_TOOL_SPECS } from './prFleetTestConstants';
import { isOrchestratorPostExecutable } from './unsupportedOrchestratorTools';
import { resolveToolInventoryRecord, TOOL_EXECUTOR_STATUS } from './toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Prefer `gfr` over alias slug `egfr` for calc-gfr registry. */
const REGISTRY_ID_TO_BUILTIN_SLUG = Object.freeze(
  Object.fromEntries(
    Object.entries(BUILTIN_CALC_ID_TO_REGISTRY_ID)
      .filter(([slug]) => slug !== 'egfr')
      .map(([slug, registryId]) => [registryId, slug])
  )
);

const HUB_GROUP_TOOL_IDS = new Set(CHAT_ASSISTED_HUB_GROUPS.flatMap((g) => g.toolIds));

const REGISTRY_PAGE_COMPONENT = Object.freeze({
  [REGISTRY.drugCheck]: 'src/pages/tools/DrugChecker.jsx',
  [REGISTRY.labInterp]: 'src/pages/tools/LabInterpreter.jsx',
  [REGISTRY.protocols]: 'src/pages/tools/Protocols.jsx',
  [REGISTRY.diagnosis]: 'src/pages/tools/DiagnosisAssistant.jsx',
  [REGISTRY.procedures]: 'src/pages/tools/ProcedureGuide.jsx',
  [REGISTRY.calculatorsHub]: 'src/pages/tools/Calculators.jsx',
  [REGISTRY.sofaScore]: 'src/pages/tools/Calculators.jsx',
});

const appSource = readFileSync(join(__dirname, '../app/router.jsx'), 'utf8');
const calculatorsSource = readFileSync(join(__dirname, '../pages/tools/Calculators.jsx'), 'utf8');
const toolsOverviewSource = readFileSync(join(__dirname, '../pages/tools/ToolsOverview.jsx'), 'utf8');

function readPatternIds() {
  return new Set(
    parseClinicalToolPatternRecords(readToolPatternsSource()).map((r) => r.toolId)
  );
}

function catalogHasId(id) {
  const rows = getMedicalToolsCatalogRows();
  return rows.some((r) => r.id === id || r.primaryId === id || r.sidebarToolId === id);
}

function discoveryHasId(id) {
  const ids = new Set([id]);
  const reg = ORCHESTRATOR_TO_REGISTRY_ID[id] || id;
  ids.add(reg);
  return getAllDiscoveredTools().some(
    (row) => ids.has(row.id) || ids.has(row.mapsTo) || row.registryId === reg
  );
}

function appRouteRegistered(path, registryId, builtinSlug) {
  if (!path) return false;
  if (PR_FLEET_TOOL_SPECS[registryId]?.routePath) {
    const spec = PR_FLEET_TOOL_SPECS[registryId];
    return appSource.includes(`path: '${spec.routePath}'`);
  }
  if (builtinSlug) {
    const def = getCalculatorRouteBySlug(builtinSlug);
    if (
      def &&
      appSource.includes("path: '/tools/calculators/:slug'") &&
      appSource.includes('<LegacyCalculatorRouteRedirect />')
    ) {
      return true;
    }
  }
  return appSource.includes(`path: '${path}'`);
}

function calculatorsSwitchExists(slug) {
  return slug ? calculatorsSource.includes(`case '${slug}':`) : false;
}

function hubCardExists(registryId) {
  return HUB_GROUP_TOOL_IDS.has(registryId);
}

function resolveFrontendComponent(registryId, tier, builtinSlug, canonicalId) {
  if (PR_FLEET_TOOL_SPECS[registryId]?.appComponent) {
    return `src/pages/fleet/${PR_FLEET_TOOL_SPECS[registryId].appComponent}.jsx`;
  }
  if (tier === 'A' && builtinSlug) {
    return 'src/pages/tools/Calculators.jsx';
  }
  if (tier === 'C' && REGISTRY_PAGE_COMPONENT[registryId]) {
    return REGISTRY_PAGE_COMPONENT[registryId];
  }
  if (tier === 'clinical-page' && REGISTRY_PAGE_COMPONENT[registryId]) {
    return REGISTRY_PAGE_COMPONENT[registryId];
  }
  if ((tier === 'B' || tier === 'fleet-B') && hubCardExists(registryId)) {
    return 'src/pages/tools/Calculators.jsx (chat-assisted hub card)';
  }
  if (tier === 'hub') {
    return REGISTRY_PAGE_COMPONENT[REGISTRY.calculatorsHub];
  }
  if (tier === 'fleet-A' && PR_FLEET_TOOL_SPECS[registryId]?.appComponent) {
    return `src/pages/fleet/${PR_FLEET_TOOL_SPECS[registryId].appComponent}.jsx`;
  }
  if (tier === 'nlu-hub-only' || NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(canonicalId)) {
    return 'src/pages/tools/ToolsOverview.jsx (chat-assisted grid); src/pages/tools/ClinicalToolCatalog.jsx';
  }
  if (tier === 'nlu-profile' && registryId && REGISTRY_PAGE_COMPONENT[registryId]) {
    return REGISTRY_PAGE_COMPONENT[registryId];
  }
  return null;
}

function rendersInUi(row) {
  const { tier, calculatorSlug, registryId, canonicalId } = row;
  if (tier === 'A') return calculatorsSwitchExists(calculatorSlug);
  if (tier === 'C') return Boolean(REGISTRY_PAGE_COMPONENT[registryId] || calculatorSlug === 'sofa');
  if (tier === 'B' || tier === 'fleet-B') return hubCardExists(registryId);
  if (tier === 'clinical-page' || tier === 'fleet-A') return Boolean(row.frontendComponent);
  if (tier === 'hub') return calculatorsSource.includes('CALCULATORS');
  if (tier === 'nlu-hub-only' || NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(canonicalId)) {
    return (
      hubCardExists(registryId) ||
      hubCardExists(canonicalId) ||
      (calculatorsSource.includes('nluCalculatorHubOnly') &&
        toolsOverviewSource.includes('nluCalculatorHubOnly'))
    );
  }
  if (tier === 'nlu-profile') return Boolean(row.catalogEntryExists);
  return false;
}

function launchPathWorks(row) {
  const launch = resolveCatalogLaunch(row.canonicalId);
  const navPath = resolveNavigationPathForLaunch(launch);
  if (!navPath && !launch.path) return false;
  const effective = navPath || launch.path;
  if (effective === '/assistant') return Boolean(launch.chatSeed?.length > 20);
  if (effective.startsWith('/tools') || effective.startsWith('/fleet')) return false;
  return isKnownToolAreaPath(effective);
}

function catalogLaunchDiffersFromSidebar(registryId, tier) {
  if (!['B', 'fleet-B'].includes(tier)) return false;
  // Sidebar uses applyRegistryToolLaunch (same as catalog) since registryToolLaunch centralization.
  return false;
}

/**
 * @param {string} canonicalId
 * @param {object} opts
 */
function buildVisibilityRow(canonicalId, opts: any = {}) {
  const inventoryRecord = resolveToolInventoryRecord(canonicalId);
  const registryId =
    opts.registryId ??
    (toolRegistryById[canonicalId] ? canonicalId : ORCHESTRATOR_TO_REGISTRY_ID[canonicalId]) ??
    null;
  const reg = registryId ? toolRegistryById[registryId] : null;
  const nlu =
    opts.nluRow ?? clinicalIntentTools.find((t) => t.toolId === canonicalId) ?? null;
  const tier =
    opts.tier ??
    inventoryRecord?.tier ??
    (NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(canonicalId) && !toolRegistryById[canonicalId]
      ? 'nlu-hub-only'
      : registryId
        ? tierForRegistryId(registryId)
        : 'nlu-profile');
  const builtinSlug =
    opts.calculatorSlug ??
    (registryId ? REGISTRY_ID_TO_BUILTIN_SLUG[registryId] : null) ??
    (builtinUiCalculators.some((c) => c.id === canonicalId) ? canonicalId : null);

  const route = inventoryRecord?.route ?? reg?.path ?? nlu?.path ?? resolveCatalogLaunch(canonicalId).path;
  const dedicatedRegistryEntry = Boolean(toolRegistryById[canonicalId]);
  const sidebarVisible = inventoryRecord?.sidebarVisible ?? dedicatedRegistryEntry;
  const nluProfiles = registryId
    ? clinicalIntentTools.filter(
        (t) => t.sidebarToolId === registryId || t.toolId === registryId
      )
    : nlu
      ? [nlu]
      : [];
  const nluProfileExists =
    nluProfiles.length > 0 ||
    (registryId && KEYWORD_ROUTED_REGISTRY_IDS.includes(registryId));
  const patternIds = readPatternIds();
  const backendPatternExists =
    patternIds.has(canonicalId) ||
    nluProfiles.some((t) => patternIds.has(t.toolId)) ||
    (registryId &&
      registryToPrimaryNluToolId(registryId) &&
      patternIds.has(registryToPrimaryNluToolId(registryId)));
  const primaryNlu = registryId ? registryToPrimaryNluToolId(registryId) : null;
  const backendExecutorExists =
    inventoryRecord?.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED ||
    isOrchestratorPostExecutable(canonicalId) ||
    (canonicalId === registryId &&
      primaryNlu &&
      isOrchestratorPostExecutable(primaryNlu));

  const frontendComponent = inventoryRecord?.component || resolveFrontendComponent(
    registryId || canonicalId,
    tier,
    builtinSlug,
    canonicalId
  );
  const routeExists = appRouteRegistered(route, registryId, builtinSlug);

  const row = {
    canonicalId,
    displayName:
      opts.displayName ??
      inventoryRecord?.label ??
      reg?.name ??
      nlu?.toolName ??
      builtinUiCalculators.find((c) => c.id === builtinSlug)?.name ??
      canonicalId,
    category: inventoryRecord?.category ?? normalizeCategory(reg?.category ?? nlu?.category ?? 'tool'),
    tier: formatTierLabel(tier),
    route: route || '—',
    calculatorSlug: builtinSlug || '—',
    registryEntryExists: dedicatedRegistryEntry,
    catalogEntryExists: catalogHasId(canonicalId) || (registryId && catalogHasId(registryId)),
    discoveryEntryExists:
      discoveryHasId(canonicalId) || (registryId && discoveryHasId(registryId)),
    sidebarVisible,
    nluProfileExists,
    backendPatternExists,
    backendExecutorExists,
    frontendComponentExists: Boolean(frontendComponent),
    frontendComponent: frontendComponent || '—',
    rendersInUi: false,
    launchPathWorks: false,
    currentStatus: '—',
    notes: opts.notes || '',
  };

  row.rendersInUi = rendersInUi({ ...row, registryId, calculatorSlug: builtinSlug });
  row.launchPathWorks = launchPathWorks(row);

  row.currentStatus = deriveStatus(row, {
    registryId,
    tier,
    routeExists,
    catalogLaunchDiffers: registryId
      ? catalogLaunchDiffersFromSidebar(registryId as any, tier)
      : false,
  } as any);

  return row;
}

function normalizeCategory(category) {
  const c = String(category || 'tool').toLowerCase();
  if (c === 'calculator') return 'calculator';
  if (c === 'checker') return 'checker';
  if (c === 'interpreter') return 'interpreter';
  if (c === 'protocol') return 'protocol';
  if (c === 'reference') return 'reference';
  if (c === 'fleet') return 'fleet';
  if (c === 'diagnostic') return 'diagnostic';
  return c;
}

function formatTierLabel(tier) {
  if (tier === 'C') return 'C';
  if (tier === 'A') return 'A';
  if (tier === 'B') return 'B';
  if (tier === 'fleet-A') return 'fleet-A';
  if (tier === 'fleet-B') return 'fleet-B';
  if (tier === 'clinical-page') return 'clinical-page';
  if (tier === 'hub') return 'hub';
  if (tier === 'nlu-hub-only') return 'nlu-hub-only';
  return tier;
}

/**
 * @param {ReturnType<typeof buildVisibilityRow>} row
 */
function deriveStatus(row, { tier, routeExists, catalogLaunchDiffers }) {
  if (!routeExists && row.route !== '—' && isKnownToolAreaPath(row.route)) return 'archived route';
  if (!routeExists && row.route !== '—') return 'route missing';
  if (!row.catalogEntryExists) return 'catalog missing';
  if (!row.frontendComponentExists) return 'component missing';
  if (!row.registryEntryExists && NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(row.canonicalId)) {
    return row.rendersInUi ? 'hidden by layout' : 'registry missing';
  }
  if (tier === 'nlu-profile' && !row.registryEntryExists && row.rendersInUi && row.launchPathWorks) {
    return 'hidden by layout';
  }
  if (!row.launchPathWorks) return 'broken launch';
  if (catalogLaunchDiffers) return 'broken launch';
  if (!row.sidebarVisible && row.nluProfileExists) return 'hidden by layout';
  if (row.backendExecutorExists && !row.frontendComponentExists) return 'backend-only';
  if (
    !row.backendExecutorExists &&
    row.frontendComponentExists &&
    ['A', 'B', 'fleet-B', 'clinical-page', 'fleet-A', 'hub', 'nlu-hub-only'].includes(tier)
  ) {
    if (tier === 'A' || tier === 'B' || tier === 'fleet-B' || tier === 'nlu-hub-only') {
      if (row.rendersInUi && row.launchPathWorks) {
        if (tier === 'A' && !row.backendExecutorExists) return 'frontend-only';
        if (tier === 'B' || tier === 'fleet-B' || tier === 'nlu-hub-only') {
          if (catalogLaunchDiffers) return 'broken launch';
          if (!row.sidebarVisible) return 'hidden by layout';
          return row.sidebarVisible ? 'fully visible' : 'hidden by layout';
        }
        return 'fully visible';
      }
    }
  }
  if (tier === 'C' && row.backendExecutorExists && row.rendersInUi) return 'fully visible';
  if (tier === 'clinical-page' && row.rendersInUi) return 'fully visible';
  if (tier === 'fleet-A' && row.rendersInUi) return 'fully visible';
  if (tier === 'hub' && row.rendersInUi) return 'fully visible';
  if (row.rendersInUi && row.launchPathWorks && row.catalogEntryExists) {
    if (!row.sidebarVisible) return 'hidden by layout';
    return 'fully visible';
  }
  return 'hidden by layout';
}

/** All matrix rows (registry + secondary NLU profiles). */
export function buildToolVisibilityMatrix() {
  const rows = [] as any[];
  const seenCanonical = new Set();

  for (const registryId of ALL_REGISTRY_TOOL_IDS) {
    rows.push(buildVisibilityRow(registryId));
    seenCanonical.add(registryId);
  }

  for (const nlu of clinicalIntentTools) {
    const registryId = nlu.sidebarToolId || ORCHESTRATOR_TO_REGISTRY_ID[nlu.toolId];
    const primary = registryId ? registryToPrimaryNluToolId(registryId) : null;
    const isPrimary = nlu.toolId === primary || nlu.toolId === registryId;
    if (isPrimary && seenCanonical.has(registryId)) continue;
    if (seenCanonical.has(nlu.toolId)) continue;

    const tier = NLU_HUB_ONLY_PROFILE_TOOL_IDS.includes(nlu.toolId as any)
      ? 'nlu-hub-only'
      : !isPrimary
        ? 'nlu-profile'
        : registryId
          ? tierForRegistryId(registryId)
          : 'nlu-profile';

    rows.push(
      buildVisibilityRow(nlu.toolId, {
        registryId,
        tier,
        nluRow: nlu,
        displayName: nlu.toolName,
        notes: isPrimary ? '' : `Secondary NLU profile; sidebar registry: ${registryId}`,
      })
    );
    seenCanonical.add(nlu.toolId);
  }

  for (const registryId of KEYWORD_ROUTED_REGISTRY_IDS) {
    if (seenCanonical.has(registryId)) continue;
    rows.push(
      buildVisibilityRow(registryId, {
        notes: 'Keyword-routed in NLU; no dedicated clinicalIntentTools row',
      })
    );
    seenCanonical.add(registryId);
  }

  return rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function getToolVisibilityMatrixDocument() {
  const rows = buildToolVisibilityMatrix();
  const statusCounts = rows.reduce((acc, row) => {
    acc[row.currentStatus] = (acc[row.currentStatus] || 0) + 1;
    return acc;
  }, ({} as Record<string, number>));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: rows.length,
      registryToolCount: ALL_REGISTRY_TOOL_IDS.length,
      nluProfileCount: clinicalIntentTools.length,
      builtinCalculatorForms: builtinUiCalculators.length,
      backendExecutors: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length,
      statusCounts,
    },
    rows,
  };
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

/**
 * @param {ReturnType<typeof getToolVisibilityMatrixDocument>} [doc]
 */
export function formatToolVisibilityMatrixMarkdown(doc = getToolVisibilityMatrixDocument()) {
  const { summary, rows } = doc;
  const statusRows = Object.entries(summary.statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `| ${status} | ${count} |`)
    .join('\n');

  const lines = [
    '# Tool Visibility Matrix',
    '',
    `*Generated from shipped source on **${doc.generatedAt.slice(0, 10)}**. Regenerate:* \`npm run visibility-matrix:write-docs\``,
    '',
    '## Summary',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Matrix rows | ${summary.totalRows} |`,
    `| Sidebar registry tools | ${summary.registryToolCount} |`,
    `| NLU clinical profiles | ${summary.nluProfileCount} |`,
    `| Built-in calculator forms | ${summary.builtinCalculatorForms} |`,
    `| Backend POST executors | ${summary.backendExecutors} |`,
    '',
    '### Status distribution',
    '',
    '| Status | Count |',
    '|--------|------:|',
    statusRows,
    '',
    '## Tier semantics',
    '',
    '| Tier | Meaning |',
    '|------|---------|',
    '| **A** | Dedicated calculator form in `Calculators.jsx` |',
    '| **B** | Chat-assisted hub card (no standalone form) |',
    '| **C** | Full page + registered `POST /api/tools/:id/execute` |',
    '| **clinical-page** | Protocols, diagnosis, procedures (chat-first pages) |',
    '| **fleet-A** | Dedicated `/fleet/*` page |',
    '| **fleet-B** | Dispatch intelligence via calculators hub |',
    '| **hub** | Calculators overview (`/tools/calculators`) |',
    '| **nlu-hub-only** | NLU profile with no dedicated `toolRegistry` row |',
    '',
    '## Column definitions',
    '',
    '| Column | Meaning |',
    '|--------|---------|',
    '| Canonical ID | Registry id or NLU `toolId` when profile-specific |',
    '| Tier | Delivery tier (A/B/C, fleet, hub, nlu-hub-only) |',
    '| Route | Primary SPA path from registry or NLU catalog |',
    '| Calc slug | `Calculators.jsx` / `?calc=` slug when applicable |',
    '| Registry / Catalog / Discovery | Row present in respective indexes |',
    '| Sidebar | Listed in `toolRegistry.js` (workspace may filter) |',
    '| NLU / Pattern / Executor | Chat profile, `tool.patterns.ts`, POST execute |',
    '| Component / Renders | Frontend module and user-visible UI |',
    '| Launch OK | Catalog/sidebar launch resolves to a real destination |',
    '| Status | Derived visibility classification |',
    '',
    '## Full matrix',
    '',
    '| Canonical ID | Display name | Category | Tier | Route | Calc slug | Registry | Catalog | Discovery | Sidebar | NLU | Pattern | Executor | Component | Renders | Launch OK | Status |',
    '|--------------|--------------|----------|------|-------|-----------|----------|---------|-----------|---------|-----|---------|----------|-----------|---------|----------|--------|',
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.canonicalId} | ${row.displayName} | ${row.category} | ${row.tier} | ${row.route} | ${row.calculatorSlug} | ${yesNo(row.registryEntryExists)} | ${yesNo(row.catalogEntryExists)} | ${yesNo(row.discoveryEntryExists)} | ${yesNo(row.sidebarVisible)} | ${yesNo(row.nluProfileExists)} | ${yesNo(row.backendPatternExists)} | ${yesNo(row.backendExecutorExists)} | ${yesNo(row.frontendComponentExists)} | ${yesNo(row.rendersInUi)} | ${yesNo(row.launchPathWorks)} | ${row.currentStatus} |`
    );
  }

  lines.push(
    '',
    '## Recommended code fixes (priority order)',
    '',
    '1. **NLU hub-only sidebar rows** — Add `toolRegistry.js` entries (or a collapsible “More calculators” group) for `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator` mapped to hub + chat launch (`applyRegistryToolLaunch`).',
    '2. **Secondary NLU profiles** — Optional dedicated sidebar rows for ACLS/ATLS, ABG, dose calculator, antibiotic guide (currently catalog + parent page only).',
    '3. **`dispatch-ai` catalog flag** — use `backendRouted` for NLU/chat support and `postExecutable` for POST `/api/tools/:id/execute` badges.',
    '4. **Duplicate shortcut labels** — Deduplicate `shortcut` strings in `toolRegistry.js` (PERC/PHQ-9, GRACE/GAD-7, etc.) even if global hotkeys are not wired yet.',
    '5. **Account route discoverability** — Link `Profile` → `/profile-settings`, `Settings` → `/notifications`; expose `/gdpr` and `/hipaa` from AppShell/header-help navigation if they need authenticated discovery.',
    '6. **Cost analytics nav** — Add sidebar or Analytics sub-link to `/costs` for `VIEW_ANALYTICS` users.',
    '7. **Onboarding / biometric routes** — Link from `ProfileSettings` or `Settings` to `/onboarding` and `/biometric-setup` when product-ready.',
    '',
    '## Verification',
    '',
    '```bash',
    'npm run test:visibility-matrix',
    'npm run visibility-matrix:write-docs',
    'npm run inventory:report',
    '```',
    '',
    'See also: `docs/e2e-tool-validation-matrix.md`, `docs/backend-frontend-tool-contract.md`, `docs/tool-render-execute-matrix.md`.',
    ''
  );

  return lines.join('\n');
}

export { matchCalculatorRoute, CALCULATOR_ROUTE_DEFS };
