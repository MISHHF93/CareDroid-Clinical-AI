/**
 * Duplicate system audit — competing sources of truth across routes, nav, inventories, etc.
 * Regenerate: npm run duplicate-system-audit:write-docs
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_ROUTES, ROUTE_ALIAS_GROUPS } from '../config/routes.config';
import { TOOL_LAUNCH_PATHS } from './clinicalToolIdContract';
import { AUTH_CONFIG } from '../config/auth.config';
import { CALCULATOR_ROUTE_DEFS } from '../routes/clinicalToolRoutes';
import {
  PRIMARY_NAV_ITEMS,
  QUICK_COMMAND_DESTINATION_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { CARE_WORKSPACES } from '../config/workspace.config';
import {
  ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS,
  REGISTRY_ID_TO_ORCHESTRATOR_TOOL,
} from './clinicalToolIdContract';
import { BACKEND_EXECUTOR_NLU_TOOL_IDS } from '../config/backendApiCapabilities';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

function readRepo(rel) {
  const full = join(REPO_ROOT, rel);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function parseAppPaths() {
  const app = readRepo('src/App.jsx');
  return [...new Set([...app.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]))];
}

function pathOverlap(a, b) {
  const setA = new Set(Object.values(a));
  const overlaps = [];
  for (const [key, path] of Object.entries(b)) {
    if (setA.has(path)) overlaps.push({ key, path, sources: 'both' });
  }
  return overlaps;
}

export const DUPLICATE_AUDIT_SECTIONS = Object.freeze([
  {
    id: 'routes',
    title: 'Routes',
    canonical: '`src/config/routes.config.js` (`CANONICAL_ROUTES`, alias groups)',
    secondary: '`src/App.jsx` (React Router mount table only — must not invent new paths)',
    duplicates: [
      {
        name: 'Canonical route map vs tool launch paths',
        instances: ['routes.config.js → CANONICAL_ROUTES', 'clinicalToolIdContract.js → TOOL_LAUNCH_PATHS'],
        overlap: pathOverlap(CANONICAL_ROUTES, TOOL_LAUNCH_PATHS).length,
        risk: 'Drift when adding fleet/simulation paths to one file only',
        action: 'merge',
        recommendation:
          'Import CANONICAL_ROUTES into clinicalToolIdContract (or shared routes module); deprecate overlapping TOOL_LAUNCH_PATHS keys.',
      },
      {
        name: 'App.jsx inline route table',
        instances: ['src/App.jsx routes[] (~212 paths)', 'routes.config.js'],
        overlap: null,
        risk: 'New routes added only in App.jsx bypass alias + nav contracts',
        action: 'wire',
        recommendation:
          'Keep App.jsx as renderer; validate every `path:` exists in CANONICAL_ROUTES or ROUTE_ALIAS_GROUPS via routeHealth tests.',
      },
      {
        name: 'Calculator deep links',
        instances: [
          'clinicalToolRoutes.js → CALCULATOR_ROUTE_DEFS',
          'App.jsx LegacyCalculatorRouteRedirect for /tools/calculators',
          'toolInventory per-tool `route`',
        ],
        overlap: CALCULATOR_ROUTE_DEFS.length,
        risk: 'Slug/path mismatch between hub and inventory',
        action: 'merge',
        recommendation:
          'Canonical: `clinicalToolRoutes.js` indexes calculator slugs; App.jsx keeps one Copilot redirect surface for calculator paths.',
      },
      {
        name: 'Pack marketplace URLs',
        instances: ['/asset-packs', '/settings/organization/packs'],
        overlap: 2,
        risk: 'Same component is mounted in product discovery and organization-admin contexts',
        action: 'legacy',
        recommendation:
          'Keep `/asset-packs` as product/pack discovery and `/settings/organization/packs` as organization entitlement management; both must share `PackMarketplace` and route-health coverage.',
      },
      {
        name: 'Workflow surfaces',
        instances: ['/automation → WorkflowAutomationBuilder', '/workflows → WorkflowBuilderPage (PlatformOS)'],
        overlap: 2,
        risk: 'Two workflow UIs under different nav ids',
        action: 'merge',
        recommendation:
          'Pick one workflow builder (Platform OS `WorkflowBuilderPage` or legacy `WorkflowAutomationBuilder`); alias the other route.',
      },
      {
        name: 'Operations entry points',
        instances: ['/operations', '/operations-center', 'WORKSPACE_ROUTE_SHORTCUTS.commandCenter → /dashboard'],
        overlap: 3,
        risk: 'Ops vs command center naming confusion',
        action: 'legacy',
        recommendation:
          'Canonical ops hub: `CANONICAL_ROUTES.operations`; document /operations-center as digital ops center alias.',
      },
    ],
  },
  {
    id: 'layouts',
    title: 'Layouts',
    canonical: '`src/components/AppShell.tsx` (active CareDroid app chrome)',
    secondary: '`src/layout/AppShell.jsx` (legacy/manual-review shell helper, not runtime-mounted)',
    duplicates: [
      {
        name: 'Shell variants',
        instances: ['src/components/AppShell.tsx', 'src/layout/AppShell.jsx'],
        overlap: null,
        risk: 'Legacy shell is not mounted but retained for tests/manual migration review.',
        action: 'legacy',
        recommendation:
          'Canonical shell: src/components/AppShell.tsx; do not wire src/layout/AppShell.jsx back into runtime.',
      },
      {
        name: 'Ops demo layout class',
        instances: ['.ops-demo-page on simulation/lab/3D pages'],
        overlap: null,
        risk: 'Parallel layout CSS systems',
        action: 'merge',
        recommendation: 'Migrate ops-demo pages to shared design tokens and CareDroid primitives.',
      },
    ],
  },
  {
    id: 'sidebars',
    title: 'Sidebars',
    canonical:
      '`src/components/AppShell.tsx` + `NAVIGATION_ITEMS` from unified-navigation.config.ts',
    secondary: '`src/config/navigation.config.js` compatibility projections',
    duplicates: [
      {
        name: 'Sidebar nav item sources',
        instances: [
          'APP_SHELL_NAV_ITEMS',
          'PRIMARY_SIDEBAR_NAV_ITEMS',
          'QUICK_COMMAND_DESTINATION_ITEMS',
        ],
        overlap: PRIMARY_SIDEBAR_NAV_ITEMS.length,
        risk: 'Route surfaces can drift if they bypass unified-navigation.config.ts',
        action: 'done',
        recommendation:
          'Canonical AppShell rail: NAVIGATION_ITEMS; compatibility projections must derive from unified-navigation.config.ts.',
      },
      {
        name: 'Tool list in sidebar',
        instances: ['sidebarToolPresentation.js', 'historical getSidebarToolRegistryProjection in tests'],
        overlap: null,
        risk: 'Tests may reference removed sidebar tool partition API',
        action: 'legacy',
        recommendation: 'Canonical tool sidebar data: getUserFacingToolRegistryProjection + sidebarToolPresentation.',
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    canonical: '`src/config/navigation.config.js`',
    secondary: '`src/navigation/primaryNavigation.js` (re-export shim only)',
    duplicates: [
      {
        name: 'Primary nav vs quick command',
        instances: ['PRIMARY_NAV_ITEMS', 'QUICK_COMMAND_DESTINATION_ITEMS'],
        overlap: null,
        risk: 'Duplicate destinations with different labels',
        action: 'merge',
        recommendation:
          'Derive QUICK_COMMAND_DESTINATION_ITEMS from PRIMARY_NAV_ITEMS + tool inventory search index.',
      },
      {
        name: 'Legacy path matching',
        instances: ['navigation.config legacyPaths/matchPaths', 'routes.config ROUTE_ALIAS_GROUPS'],
        overlap: ASSISTANT_ROUTE_ALIASES_COUNT(),
        risk: 'Alias defined in two modules',
        action: 'merge',
        recommendation: 'Canonical aliases: routes.config.js; navigation imports getRouteAliasTarget().',
      },
      {
        name: 'Compatibility re-export',
        instances: ['navigation/primaryNavigation.js', 'navigation.config.js'],
        overlap: null,
        risk: 'Low if re-export only',
        action: 'legacy',
        recommendation: 'Keep primaryNavigation.js as thin re-export; ban new constants there.',
      },
    ],
  },
  {
    id: 'inventories',
    title: 'Inventories',
    canonical:
      'Pipeline: `clinicalToolIdContract.js` → `toolRegistry.js` → `toolInventory.js` (canonical launch records)',
    secondary: null,
    duplicates: [
      {
        name: 'Tool metadata layers',
        instances: [
          'toolRegistry.js',
          'clinicalIntentToolCatalog.js',
          'toolInventory.js',
          'segmentInventory.js',
          'toolVisibilityMatrix.js',
        ],
        overlap: null,
        risk: 'Five layers can disagree on id, path, executor',
        action: 'merge',
        recommendation:
          'Canonical runtime: toolInventory only; catalog/segment/matrix are generated projections or test artifacts.',
      },
      {
        name: 'Sidebar/catalog projections',
        instances: [
          'getUserFacingToolRegistryProjection',
          'getSidebarToolRegistryProjection',
          'getCatalogToolInventory',
        ],
        overlap: null,
        risk: 'Different filters for same ids',
        action: 'wire',
        recommendation: 'Canonical: getUserFacingToolRegistryProjection; others call it internally.',
      },
      {
        name: 'Backend tools API',
        instances: ['GET /api/tools', 'toolInventory static registry'],
        overlap: null,
        risk: 'API list can drift from SPA registry',
        action: 'wire',
        recommendation: 'Generate /api/tools from same build step as toolInventory or treat API as read-only mirror.',
      },
    ],
  },
  {
    id: 'calculators',
    title: 'Calculators',
    canonical:
      '`toolInventory.js` (calculator records) + `calculatorHubManifest.js` (hub cards/forms projection)',
    secondary: '`Calculators.jsx` + `CalculatorInterface` for UI',
    duplicates: [
      {
        name: 'Builtin calculator definitions',
        instances: [
          'clinicalToolIdContract BUILTIN_CALC_*',
          'clinicalIntentToolCatalog builtinUiCalculators',
          'calculatorHubManifest BUILTIN_CALCULATOR_SWITCH_SLUGS',
        ],
        overlap: null,
        risk: 'Slug/id drift (e.g. registry id vs hub slug)',
        action: 'merge',
        recommendation:
          'Canonical slugs: BUILTIN_CALC in clinicalToolIdContract; hub manifest reads toolInventory only.',
      },
      {
        name: 'Specialty calculator modules',
        instances: [
          'cardiologyCalculators.jsx',
          'pulmonologyCalculators.jsx',
          'nephrologyCalculators.jsx',
          '…12 pack JSX group files',
        ],
        overlap: 12,
        risk: 'Parallel registration vs hub — ids must match inventory',
        action: 'legacy',
        recommendation:
          'Keep as composition modules imported by Calculators.jsx; do not register routes separately.',
      },
      {
        name: 'Route registration',
        instances: ['CALCULATOR_ROUTE_DEFS', 'Calculators hub route /tools/calculators', 'App wildcard tools routes'],
        overlap: CALCULATOR_ROUTE_DEFS.length,
        risk: 'Hub-only tools lack dedicated App route (by design)',
        action: 'legacy',
        recommendation: 'Dedicated routes only when hasDedicatedForm; hub resolves ?calc= slug.',
      },
    ],
  },
  {
    id: 'dashboards',
    title: 'Dashboards',
    canonical: '`/dashboard` → CommandDashboard.jsx + `commandDashboardModel.js`',
    secondary: null,
    duplicates: [
      {
        name: 'Home vs assistant',
        instances: ['CommandDashboard (/dashboard)', 'ChatInterface ED Copilot panel'],
        overlap: 1,
        risk: 'Resolved — former Dashboard.jsx assistant page was removed.',
        action: 'legacy',
        recommendation:
          'Keep /dashboard owned by CommandDashboard and /assistant as an ED Copilot alias into the shell.',
      },
      {
        name: 'Platform dashboard registry',
        instances: ['platformOperatingSystem.js PLATFORM_DASHBOARDS', 'commandDashboardModel widgets'],
        overlap: null,
        risk: 'Demo OS dashboards vs command dashboard tiles',
        action: 'wire',
        recommendation:
          'Canonical command UX: commandDashboardModel; platformOperatingSystem for Platform OS pages only.',
      },
      {
        name: 'Domain dashboards (15+ pages)',
        instances: [
          'AnalyticsDashboard',
          'CostAnalyticsDashboard',
          'AiCommandCenterDashboard',
          'MemoryDashboard',
          'TrainingDashboard',
          'LaboratoryDashboard',
          'MedicalIotDashboard',
          'HospitalMapDashboard',
          'FleetDashboard',
          'DigitalOperationsCenter',
          'OutcomesDashboardPage',
        ],
        overlap: null,
        risk: 'Overlapping KPIs across ops/analytics pages',
        action: 'wire',
        recommendation:
          'Map each dashboard to one asset id in platform_assets; link from command dashboard via assetRecommendation.',
      },
    ],
  },
  {
    id: 'auth-configs',
    title: 'Auth configs',
    canonical: '`src/config/auth.config.js` + `src/config/routes.config.js` (auth paths)',
    secondary: '`src/config/api.config.js` (endpoints), `env.config.js` + `featureFlags.config.js` (gates)',
    duplicates: [
      {
        name: 'Auth path aliases',
        instances: ['AUTH_PATH_ALIASES', 'AUTH_SIGNUP_PATH_ALIASES'],
        overlap: countOverlap(AUTH_CONFIG.aliases, AUTH_CONFIG.signupAliases),
        risk: 'Shared /signup paths registered twice in App',
        action: 'legacy',
        recommendation:
          'Canonical: AUTH_PATH_ALIASES; signup subset should reference same array or dedupe in routes.config.',
      },
      {
        name: 'Token storage keys',
        instances: ['caredroid_access_token', 'authToken (legacy)'],
        overlap: 2,
        risk: 'Stale sessions after key migration',
        action: 'legacy',
        recommendation: 'Canonical: AUTH_CONFIG.tokenStorageKey; read legacy once on boot then migrate.',
      },
      {
        name: 'Demo/dev auth',
        instances: ['auth.config demo getters', 'featureFlags enableDevAuthBypass', 'devAuthBypass.js'],
        overlap: 3,
        risk: 'Bypass enabled via multiple flags',
        action: 'merge',
        recommendation: 'Single gate: featureFlags.config → env.config → auth.config demo.exposed.',
      },
    ],
  },
  {
    id: 'workspace-configs',
    title: 'Workspace configs',
    canonical: 'Backend `GET/POST /api/workspaces` + `enabledToolIds` / `enabledModules` (tenant authority)',
    secondary: null,
    duplicates: [
      {
        name: 'Three workspace models',
        instances: [
          'WorkspaceContext.jsx (localStorage careDroid.workspaces.v1)',
          'workspaceArchitecture.js CARE_WORKSPACES',
          'Backend workspace entities + UserIdentityContext',
        ],
        overlap: CARE_WORKSPACES.length,
        risk: 'UI filter workspace ≠ server workspace ≠ care workspace cards',
        action: 'merge',
        recommendation:
          'Canonical: API workspace for enforcement; CARE_WORKSPACES for UX labels; migrate WorkspaceContext to read API.',
      },
      {
        name: 'Legacy tool id aliases (duplicated)',
        instances: [
          'platform-asset-seed.data.ts LEGACY_TOOL_ID_ALIASES',
          'assetEntitlements.js LEGACY_TOOL_ID_ALIASES',
        ],
        overlap: 22,
        risk: 'Alias map drift breaks launch gating',
        action: 'merge',
        recommendation:
          'Generate frontend map from backend seed at build time, or share JSON artifact in /shared.',
      },
      {
        name: 'Workspace route shortcuts',
        instances: ['WORKSPACE_ROUTE_SHORTCUTS', 'CANONICAL_ROUTES', 'PRIMARY_NAV_ITEMS.matchPaths'],
        overlap: null,
        risk: 'Same path in three configs',
        action: 'wire',
        recommendation: 'WORKSPACE_ROUTE_SHORTCUTS should import paths from CANONICAL_ROUTES.',
      },
    ],
  },
  {
    id: 'asset-registries',
    title: 'Asset registries',
    canonical:
      'Backend `platform_assets` + `asset_packs` (seed: platform-asset-seed.data.ts) for entitlements',
    secondary: 'Frontend launch: `toolInventory.js`',
    duplicates: [
      {
        name: 'Dual registry (tools vs assets)',
        instances: ['toolInventory.js user-facing launch rows', 'SEED_PLATFORM_ASSETS', 'assetInventory.js mounted projection'],
        overlap: null,
        risk: 'Manual projection drift if backend seed and frontend launch metadata diverge',
        action: 'wire',
        recommendation:
          'Canonical launch: toolInventory; canonical entitlement: platform_assets; canonical frontend mount: assetInventory projection.',
      },
      {
        name: 'Frontend projections',
        instances: ['assetInventory.js', 'assetAccess.js', 'assetEntitlements.js', 'buildAssetRegistry() demo'],
        overlap: null,
        risk: 'Projection must continue to include pack/product/workspace/role metadata for every user-facing asset',
        action: 'wire',
        recommendation:
          'Canonical client context: UserIdentityContext + platformAssetsApi GET /api/platform/context; assetInventory derives offline/demo metadata when backend context is unavailable.',
      },
      {
        name: 'Duplicate asset packs',
        instances: ['emergency-medicine pack', 'emergency-department-pack (same assetIds)'],
        overlap: null,
        risk: 'Duplicate SKUs and entitlements',
        action: 'merge',
        recommendation: 'Merge to one ED pack id; keep other slug as alias in product catalog.',
      },
      {
        name: 'Product catalog vs platform assets',
        instances: ['product-catalog Product entities', 'platform_assets', 'solution packs docs'],
        overlap: null,
        risk: 'Commercial product id ≠ asset id',
        action: 'wire',
        recommendation: 'Canonical commercial: Product maps to packIds; assets remain operational unit.',
      },
    ],
  },
  {
    id: 'executor-mappings',
    title: 'Executor mappings',
    canonical:
      'Backend `tool-orchestrator.registry.ts` (`REGISTERED_EXECUTOR_TOOL_IDS`, `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`)',
    secondary: null,
    duplicates: [
      {
        name: 'Frontend orchestrator mirror',
        instances: [
          'clinicalToolIdContract ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS',
          'REGISTRY_ID_TO_ORCHESTRATOR_TOOL',
          'backendApiCapabilities BACKEND_EXECUTOR_NLU_TOOL_IDS',
        ],
        overlap: ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.length,
        risk: 'Copy-paste drift (tests catch)',
        action: 'legacy',
        recommendation:
          'Canonical: backend registry; frontend parses it in drift tests (already in executorMappingAudit.test.js).',
      },
      {
        name: 'Registry id vs executor id',
        instances: ['sofa-score (registry)', 'sofa-calculator (executor)', 'drug-check / drug-interactions'],
        overlap: REGISTRY_ID_TO_ORCHESTRATOR_TOOL_COUNT(),
        risk: 'Inventory TOOL_EXECUTOR_STATUS.REGISTERED uses registry id',
        action: 'wire',
        recommendation:
          'Canonical POST id: executor id; map at boundary via REGISTRY_ID_TO_ORCHESTRATOR_TOOL only.',
      },
      {
        name: 'NLU catalog postExecutable flags',
        instances: ['clinicalIntentToolCatalog postExecutable', 'ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS'],
        overlap: null,
        risk: 'Catalog claims executable without backend registerTool()',
        action: 'wire',
        recommendation: 'Generate postExecutable from backend registry in CI.',
      },
    ],
  },
]);

function ASSISTANT_ROUTE_ALIASES_COUNT() {
  const group = ROUTE_ALIAS_GROUPS?.assistant;
  return group?.aliases?.length ?? 0;
}

function countOverlap(a, b) {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x)).length;
}

function REGISTRY_ID_TO_ORCHESTRATOR_TOOL_COUNT() {
  return Object.keys(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).length;
}

export function buildDuplicateSystemReport() {
  const appPaths = parseAppPaths();
  const canonicalPaths = Object.values(CANONICAL_ROUTES);
  const notInCanonical = appPaths.filter(
    (p) => !canonicalPaths.includes(p) && !p.includes(':') && !p.startsWith('/tools/')
  );

  return {
    generated: new Date().toISOString().slice(0, 10),
    sections: DUPLICATE_AUDIT_SECTIONS,
    routePathOverlap: pathOverlap(CANONICAL_ROUTES, TOOL_LAUNCH_PATHS),
    appPathsNotInCanonical: notInCanonical.slice(0, 40),
    executorParity: {
      frontend: [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort(),
      backendCapability: [...BACKEND_EXECUTOR_NLU_TOOL_IDS].sort(),
      maps: Object.keys(REGISTRY_ID_TO_ORCHESTRATOR_TOOL).length,
    },
    summary: {
      sectionCount: DUPLICATE_AUDIT_SECTIONS.length,
      duplicateFindings: DUPLICATE_AUDIT_SECTIONS.reduce((n, s) => n + s.duplicates.length, 0),
      routeOverlapCount: pathOverlap(CANONICAL_ROUTES, TOOL_LAUNCH_PATHS).length,
    },
  };
}

function escapeCell(v) {
  return String(v ?? '—').replace(/\|/g, '\\|');
}

export function formatDuplicateSystemAuditMarkdown(report = buildDuplicateSystemReport()) {
  const lines = [
    '# Duplicate System Audit',
    '',
    `Generated: ${report.generated} (regenerate with \`npm run duplicate-system-audit:write-docs\`)`,
    '',
    '## Purpose',
    '',
    'Identify competing sources of truth that cause drift, double registration, or ambiguous ownership. Each section lists duplicates, risk, recommended action (**wire** | **merge** | **quarantine** | **legacy**), and the **canonical source** to keep.',
    '',
    '## Executive summary',
    '',
    '| Metric | Value |',
    '|--------|------:|',
    `| Audit sections | ${report.summary.sectionCount} |`,
    `| Duplicate findings documented | ${report.summary.duplicateFindings} |`,
    `| CANONICAL_ROUTES ∩ TOOL_LAUNCH_PATHS (same path string) | ${report.summary.routeOverlapCount} |`,
    `| POST executor ids (frontend) | ${report.executorParity.frontend.join(', ')} |`,
    `| REGISTRY_ID_TO_ORCHESTRATOR_TOOL entries | ${report.executorParity.maps} |`,
    '',
    '### Top consolidation priorities',
    '',
    '1. **Routes** — Single path map in `routes.config.js`; stop duplicating in `TOOL_LAUNCH_PATHS`.',
    '2. **Inventories** — `toolInventory.js` is the SPA launch authority; `assetInventory.js` mounts it into product/pack/workspace/role metadata.',
    '3. **Workspace** — Merge three workspace models under API `enabledToolIds`; dedupe `LEGACY_TOOL_ID_ALIASES`.',
    '4. **Dashboards** — Keep `CommandDashboard` as home; ED Copilot owns assistant chat in the shell.',
    '5. **Executors** — Backend `tool-orchestrator.registry.ts` owns ids; frontend mirrors via contract tests only.',
    '6. **Pack routes** — One pack marketplace URL under organization settings.',
    '',
    '## Canonical source matrix',
    '',
    '| Domain | Canonical source | Do not duplicate in |',
    '|--------|------------------|---------------------|',
    '| Routes | `src/config/routes.config.js` | App.jsx (paths only), TOOL_LAUNCH_PATHS |',
    '| Router mount | `src/App.jsx` | — |',
    '| Layouts | `src/components/AppShell.tsx` | `src/layout/AppShell.jsx`, page-level shells |',
    '| AppShell rail | `src/components/AppShell.tsx` + `NAVIGATION_ITEMS` | Inline nav arrays |',
    '| Navigation | `src/config/unified-navigation.config.ts` | `navigation.config.js`, `primaryNavigation.js` (shims/projections only) |',
    '| Tool inventory | `src/data/toolInventory.js` | Ad-hoc tool lists in pages |',
    '| Tool ids / NLU | `src/data/clinicalToolIdContract.js` | Random string ids in components |',
    '| NLU catalog | `src/data/clinicalIntentToolCatalog.js` | Duplicate registry rows |',
    '| Calculator hub | `src/data/calculatorHubManifest.js` | Calculators.jsx card arrays |',
    '| Calculator routes | `src/routes/clinicalToolRoutes.js` | App.jsx one-off paths |',
    '| Command home | `src/pages/CommandDashboard.jsx` + `commandDashboardModel.js` | platformOperatingSystem tiles |',
    '| Assistant UI | `src/components/ChatInterface.jsx` (ED Copilot panel) | Removed `Dashboard.jsx` assistant page |',
    '| Auth | `src/config/auth.config.js` + `routes.config.js` | Inline token keys |',
    '| API paths | `src/config/api.config.js` | Hard-coded `/api/...` strings |',
    '| Workspace (server) | `GET/POST /api/workspaces` | localStorage-only gating |',
    '| Workspace (UX) | `src/data/workspaceArchitecture.js` via `workspace.config.js` | Duplicate CARE_WORKSPACES |',
    '| Asset entitlements | `backend/.../platform-asset-seed.data.ts` + DB | `buildAssetRegistry()` demo |',
    '| Asset access (client) | `platformAssetsApi` + `UserIdentityContext` + `assetInventory.js` | Empty pack/product projections |',
    '| Tool launch (client) | `toolInventory.js` + `registryToolLaunch.js` | — |',
    '| Executors | `backend/.../tool-orchestrator.registry.ts` | Extra REGISTERED lists in frontend |',
    '',
  ];

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, '');
    lines.push(`**Canonical:** ${section.canonical}`, '');
    if (section.secondary) lines.push(`**Secondary (allowed):** ${section.secondary}`, '');
    lines.push('');
    lines.push('| Duplicate | Instances | Risk | Action | Recommendation |');
    lines.push('|-----------|-----------|------|--------|----------------|');
    for (const d of section.duplicates) {
      const instances = Array.isArray(d.instances) ? d.instances.join('; ') : d.instances;
      lines.push(
        `| ${escapeCell(d.name)} | ${escapeCell(instances)} | ${escapeCell(d.risk)} | ${escapeCell(d.action)} | ${escapeCell(d.recommendation)} |`
      );
    }
    lines.push('');
  }

  if (report.routePathOverlap.length) {
    lines.push('## Route path overlap detail (CANONICAL_ROUTES ∩ TOOL_LAUNCH_PATHS)', '');
    lines.push('| Key | Path |');
    lines.push('|-----|------|');
    for (const row of report.routePathOverlap) {
      lines.push(`| ${row.key} | ${row.path} |`);
    }
    lines.push('');
  }

  if (report.appPathsNotInCanonical.length) {
    lines.push('## App.jsx paths not listed in CANONICAL_ROUTES (sample)', '');
    lines.push(
      report.appPathsNotInCanonical.map((p) => `- \`${p}\``).join('\n'),
      '',
      '_Many are dynamic tool routes, org/commercial pages, or profile subpaths — extend CANONICAL_ROUTES or document as extensions._',
      ''
    );
  }

  lines.push(
    '## Action legend',
    '',
    '| Action | Meaning |',
    '|--------|---------|',
    '| **wire** | Connect existing duplicate to canonical source (import, generate, or validate) |',
    '| **merge** | Collapse two modules/URLs into one; keep redirects during migration |',
    '| **quarantine** | Mark deprecated; no new references; remove in cleanup pass |',
    '| **legacy** | Intentional alias/compat layer; document and test only |',
    '',
    '## Appendix',
    '',
    '- Related: [orphan-detection-report.md](./orphan-detection-report.md), [saas-compliance-audit.md](./saas-compliance-audit.md)',
    '- Contract tests: `src/config/canonicalConfig.contract.test.js`, `src/data/executorMappingAudit.test.js`',
    '- Generator: `src/data/duplicateSystemAudit.js`',
    ''
  );

  return lines.join('\n');
}
