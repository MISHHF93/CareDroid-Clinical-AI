import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSISTANT_ROUTE_ALIASES,
  AUTH_PATH_ALIASES,
  CALCULATORS_ROUTE_ALIASES,
  FLEET_MAP_ROUTE_ALIASES,
  LIVE_MAP_ROUTE_ALIASES,
  TOOLS_ROUTE_ALIASES,
} from '../config/routes.config';
import {
  CALCULATOR_ROUTE_DEFS,
  LEGACY_CALCULATOR_ROUTE_ALIASES,
  REGISTRY_TOOL_PATHS,
} from '../routes/clinicalToolRoutes';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
} from '../config/navigation.config';
import { PLATFORM_DASHBOARDS } from '../data/platformOperatingSystem';
import { CARE_WORKSPACES, getCareWorkspaceRouteEntries } from '../config/workspace.config';
import { getFrontendVisibleToolInventory } from '../data/toolInventory';
import { CORE_ROUTE_SMOKE } from '../test/responsiveRegression.routes';
import { BACKEND_HTTP_ROUTES } from '../data/backendHttpRouteInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const repoRoot = join(srcRoot, '..');
const appPath = join(srcRoot, 'App.jsx');
const appSource = readFileSync(appPath, 'utf8');

export const ROUTE_HEALTH_STATES = Object.freeze({
  ACTIVE: 'active',
  ALIAS: 'alias',
  DEPRECATED: 'deprecated',
  HIDDEN: 'hidden',
  ORPHANED: 'orphaned',
});

const DEPRECATED_LEGACY_PATHS = new Set([
  '/home',
  '/chat',
  '/catalog',
  '/calculators',
  '/fleet',
  '/fleet/live-map',
  '/fleet/tracking',
  ...LEGACY_CALCULATOR_ROUTE_ALIASES.map((alias) => alias.path),
]);

const HIDDEN_PREFIXES = ['/governance', '/audit'];
const HIDDEN_PATHS = new Set([
  '/privacy',
  '/regulatory',
  '/human-review',
  '/review',
  '/operations/observability',
  '/clinical/alerts',
]);
const NAVIGATION_VISIBLE_PATHS = new Set([
  ...PRIMARY_NAV_ITEMS.map((item) => item.path),
  ...OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => item.path),
  ...ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => item.path),
]);
const NAVIGATION_ENTRY_BY_PATH = new Map(
  [...PRIMARY_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS].map((item) => [
    normalizePath(item.path),
    item.label,
  ])
);

const BACKEND_CONTRACT_BY_APP_PATH = Object.freeze({
  '/assistant': ['/api/chat/message', '/api/chat/intent-classify'],
  '/dashboard': ['/api/profile/me', '/api/personalization/me/recommendations'],
  '/profile': ['/api/profile/me'],
  '/settings': ['/api/users/profile', '/api/profile/me/preferences'],
  '/tools': ['/api/chat/message'],
  '/tools/calculators': ['/api/chat/message'],
  '/hospital-map': ['/api/hospital-map/floors', '/api/hospital-map/devices', '/api/hospital-map/rooms'],
  '/medical-iot': ['/api/medical-iot/snapshot'],
  '/devices': ['/api/hospital-map/devices'],
  '/fleet/map': ['/api/fleet/vehicles/live', '/api/fleet/routes/active'],
  '/system-health': ['/health', '/api/config/system'],
  '/audit-logs': ['/api/audit/logs', '/api/audit/statistics'],
  '/ai-governance': ['/api/ai-governance/summary', '/api/platform-governance/summary'],
  '/security': ['/api/security/summary', '/api/governance/ai-security/summary'],
});
const BACKEND_ROUTE_PATHS = new Set(BACKEND_HTTP_ROUTES.map((route) => route.path));

const ROUTE_OWNERSHIP_GROUPS = Object.freeze({
  PlatformGovernanceWorkspace: 'platform-governance-workspace',
  PlatformSystemPage: 'platform-system-page',
  Calculators: 'calculator-routes',
  LegacyProtectedRouteRedirect: 'legacy-redirect',
  Navigate: 'router-redirect',
  ToolNotFound: 'tools-fallback',
  ToolsAreaFallback: 'area-fallback',
});

const SUPPORT_PAGE_PATTERNS = [
  /\.test\.jsx$/,
  /Widgets\.jsx$/,
  /ToolPageLayout\.jsx$/,
  /FleetPageChrome\.jsx$/,
  /Operations\.jsx$/,
  /platform\/components\//,
  /Calculators\.jsx$/,
  /Calculators\.route\.test\.jsx$/,
  /cardiologyCalculators\.jsx$/,
  /pulmonologyCalculators\.jsx$/,
  /nephrologyCalculators\.jsx$/,
  /hospitalOperationsCalculators\.jsx$/,
  /psychiatryScreeningCalculators\.jsx$/,
  /endocrineMetabolicCalculators\.jsx$/,
  /pediatricsObgynCalculators\.jsx$/,
  /mentalHealthCalculators\.jsx$/,
  /nextWaveCalculators\.jsx$/,
  /pr4aCalculators\.jsx$/,
  /pr8ClinicalBatchCalculators\.jsx$/,
  /Auth\.jsx$/,
];

function normalizePath(path) {
  if (!path) return '';
  return path === '/' ? '/' : String(path).replace(/\/+$/, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function routeBlockForPath(path) {
  const index = appSource.indexOf(`path: '${path}'`);
  if (index < 0) return '';
  const nextRoute = appSource.indexOf('\n    {', index + 8);
  const end = nextRoute > index ? nextRoute : appSource.indexOf('\n  ];', index);
  return appSource.slice(index, end > index ? end : index + 800);
}

function extractOwner(block, fallback = 'GeneratedRoute') {
  if (!block) return fallback;
  const redirect = block.match(/<LegacyProtectedRouteRedirect\b/);
  if (redirect) return 'LegacyProtectedRouteRedirect';
  const navigate = block.match(/<Navigate\b/);
  if (navigate) return 'Navigate';
  const components = [...block.matchAll(/<([A-Z][A-Za-z0-9]+)\b/g)]
    .map((match) => match[1])
    .filter((name) => !['AppShellPage', 'AuthShell', 'PublicShell', 'PermissionGate', 'Route'].includes(name));
  return components.at(-1) || fallback;
}

function inferStatus({ path, owner, block, generatedKind }) {
  const normalized = normalizePath(path);
  if (normalized.includes('*')) return ROUTE_HEALTH_STATES.HIDDEN;
  if (DEPRECATED_LEGACY_PATHS.has(normalized)) return ROUTE_HEALTH_STATES.DEPRECATED;
  if (generatedKind === 'auth-alias' || owner === 'Navigate') return ROUTE_HEALTH_STATES.ALIAS;
  if (owner === 'LegacyProtectedRouteRedirect') return ROUTE_HEALTH_STATES.ALIAS;
  if (NAVIGATION_VISIBLE_PATHS.has(normalized)) return ROUTE_HEALTH_STATES.ACTIVE;
  if (HIDDEN_PATHS.has(normalized) || HIDDEN_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return ROUTE_HEALTH_STATES.HIDDEN;
  }
  if (/permission:\s*/.test(block || '')) return ROUTE_HEALTH_STATES.HIDDEN;
  return ROUTE_HEALTH_STATES.ACTIVE;
}

function buildRouteEntry({ path, source, generatedKind, owner, block = '', target = '' }) {
  const normalized = normalizePath(path);
  const backendContracts = (BACKEND_CONTRACT_BY_APP_PATH[normalized] || []).filter((contractPath) =>
    BACKEND_ROUTE_PATHS.has(contractPath)
  );
  const resolvedOwner = owner || extractOwner(block, generatedKind || 'GeneratedRoute');
  return {
    path: normalized,
    status: inferStatus({ path: normalized, owner: resolvedOwner, block, generatedKind }),
    owner: ROUTE_OWNERSHIP_GROUPS[resolvedOwner] || resolvedOwner,
    component: resolvedOwner,
    source,
    target,
    blank: /element:\s*(null|undefined)/.test(block),
    wildcard: normalized.includes('*'),
    authRequired: /requiresAuth:\s*true/.test(block),
    permissioned: /permission:\s*/.test(block),
    navigationEntry: NAVIGATION_ENTRY_BY_PATH.get(normalized) || '',
    inventoryEntry: '',
    backendContract: backendContracts.join(', '),
  };
}

function directAppRouteEntries() {
  return [...appSource.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map((match) => {
    const path = match[1];
    const block = routeBlockForPath(path);
    return buildRouteEntry({
      path,
      block,
      source: 'App.jsx',
    });
  });
}

function generatedAliasEntries() {
  const aliasEntries = [
    ...AUTH_PATH_ALIASES.map((path) => ({ path, target: '/auth', generatedKind: 'auth-alias' })),
    ...ASSISTANT_ROUTE_ALIASES.map((path) => ({
      path,
      target: '/assistant',
      generatedKind: 'assistant-alias',
    })),
    ...TOOLS_ROUTE_ALIASES.map((path) => ({
      path,
      target: '/tools',
      generatedKind: 'tools-alias',
    })),
    ...CALCULATORS_ROUTE_ALIASES.map((path) => ({
      path,
      target: '/tools/calculators',
      generatedKind: 'calculator-alias',
    })),
    ...LIVE_MAP_ROUTE_ALIASES.map((path) => ({
      path,
      target: '/live-map',
      generatedKind: 'map-alias',
    })),
    ...FLEET_MAP_ROUTE_ALIASES.map((path) => ({
      path,
      target: '/fleet/map',
      generatedKind: 'fleet-alias',
    })),
    ...LEGACY_CALCULATOR_ROUTE_ALIASES.map((alias) => ({
      path: alias.path,
      target: alias.to,
      generatedKind: 'legacy-calculator-alias',
    })),
  ];

  return aliasEntries.map((entry) =>
    buildRouteEntry({
      ...entry,
      owner: 'LegacyProtectedRouteRedirect',
      source: entry.generatedKind,
    })
  );
}

function generatedActiveRouteEntries() {
  const calculatorEntries = CALCULATOR_ROUTE_DEFS.map((route) =>
    buildRouteEntry({
      path: route.path,
      source: 'CALCULATOR_ROUTE_DEFS',
      generatedKind: 'calculator-route',
      owner: 'Calculators',
    })
  );
  const toolEntries = REGISTRY_TOOL_PATHS.map((path) =>
    buildRouteEntry({
      path,
      source: 'tool-inventory-route',
      generatedKind: 'tool-inventory-route',
      owner: path.startsWith('/fleet') ? 'FleetRoute' : 'ToolRoute',
    })
  );
  const visibleTools = getFrontendVisibleToolInventory();
  for (const entry of toolEntries) {
    const tool = visibleTools.find(
      (candidate) =>
        normalizePath(candidate.route) === entry.path ||
        normalizePath(candidate.navigationPath) === entry.path
    );
    if (tool?.id) entry.inventoryEntry = tool.id;
  }
  return [...calculatorEntries, ...toolEntries];
}

function mergeRouteEntries(entries) {
  const byPath = new Map();
  for (const entry of entries) {
    const existing = byPath.get(entry.path);
    if (!existing) {
      byPath.set(entry.path, { ...entry, sources: [entry.source] });
      continue;
    }
    const statusPriority = [
      ROUTE_HEALTH_STATES.ACTIVE,
      ROUTE_HEALTH_STATES.HIDDEN,
      ROUTE_HEALTH_STATES.ALIAS,
      ROUTE_HEALTH_STATES.DEPRECATED,
      ROUTE_HEALTH_STATES.ORPHANED,
    ];
    const preferred =
      statusPriority.indexOf(entry.status) < statusPriority.indexOf(existing.status) ? entry : existing;
    byPath.set(entry.path, {
      ...preferred,
      sources: unique([...(existing.sources || [existing.source]), entry.source]),
    });
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function referencedRoutePaths() {
  return new Set(
    unique([
      '/',
      '/auth',
      ...PRIMARY_NAV_ITEMS.map((item) => item.path),
      ...OPERATIONS_SIDEBAR_NAV_ITEMS.map((item) => item.path),
      ...ADVANCED_SIDEBAR_NAV_ITEMS.map((item) => item.path),
      ...PLATFORM_DASHBOARDS.map((item) => item.path),
      ...CARE_WORKSPACES.map((workspace) => workspace.path),
      ...CARE_WORKSPACES.flatMap((workspace) =>
        getCareWorkspaceRouteEntries(workspace.id).map((entry) => entry.path)
      ),
      ...getFrontendVisibleToolInventory().map((tool) => tool.route),
      ...getFrontendVisibleToolInventory().map((tool) => tool.navigationPath),
      ...CORE_ROUTE_SMOKE.map((route) => route.path),
      ...CALCULATOR_ROUTE_DEFS.map((route) => route.path),
    ]).map(normalizePath)
  );
}

function routePathMatches(routePath, concretePath) {
  if (routePath === concretePath) return true;
  if (routePath.includes('*')) {
    const prefix = routePath.replace(/\/?\*$/, '');
    return concretePath === prefix || concretePath.startsWith(`${prefix}/`);
  }
  if (!routePath.includes(':')) return false;
  const routeParts = routePath.split('/').filter(Boolean);
  const concreteParts = concretePath.split('/').filter(Boolean);
  if (routeParts.length !== concreteParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(':') || part === concreteParts[index]);
}

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function pageFiles() {
  return listFiles(join(srcRoot, 'pages'))
    .filter((file) => file.endsWith('.jsx'))
    .map((file) => relative(srcRoot, file).split(sep).join('/'))
    .filter((file) => !SUPPORT_PAGE_PATTERNS.some((pattern) => pattern.test(file)));
}

function sourceCorpus() {
  return listFiles(srcRoot)
    .filter((file) => /\.(js|jsx)$/.test(file))
    .filter((file) => !/\.test\.(js|jsx)$/.test(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}

function orphanPageEntries() {
  const corpus = sourceCorpus();
  return pageFiles()
    .filter((file) => {
      const importPath = `./${file.replace(/^pages\//, 'pages/')}`;
      const modulePath = `./${file.replace(/\.jsx$/, '')}`;
      const basename = file.split('/').at(-1).replace(/\.jsx$/, '');
      return (
        !corpus.includes(modulePath) &&
        !corpus.includes(importPath) &&
        !corpus.includes(`./${basename}`) &&
        !corpus.includes(`../${basename}`) &&
        !corpus.includes(`<${basename}`)
      );
    })
    .map((file) => ({
      path: file,
      status: ROUTE_HEALTH_STATES.ORPHANED,
      owner: 'unreferenced-page-file',
      component: file.split('/').at(-1).replace(/\.jsx$/, ''),
      source: 'pages-scan',
      blank: false,
      wildcard: false,
      authRequired: false,
      permissioned: false,
    }));
}

export function buildRouteHealthGraph() {
  const rawRoutes = [
    ...directAppRouteEntries(),
    ...generatedAliasEntries(),
    ...generatedActiveRouteEntries(),
  ];
  const routes = mergeRouteEntries(rawRoutes);
  const referenced = referencedRoutePaths();
  const duplicateOwnership = Object.values(
    rawRoutes.reduce((acc, route) => {
      if (!route.path || route.status === ROUTE_HEALTH_STATES.ALIAS || route.status === ROUTE_HEALTH_STATES.DEPRECATED) {
        return acc;
      }
      if (route.source !== 'App.jsx') return acc;
      acc[route.path] = acc[route.path] || [];
      acc[route.path].push(route);
      return acc;
    }, {})
  ).filter((owners) => new Set(owners.map((owner) => owner.owner)).size > 1);
  const routePaths = routes.map((route) => route.path);
  const unreachableRoutes = [...referenced]
    .filter((path) => !routePaths.some((routePath) => routePathMatches(routePath, path)))
    .map((path) => ({
      path,
      status: ROUTE_HEALTH_STATES.ORPHANED,
      owner: 'missing-route-registration',
      component: 'MissingRoute',
      source: 'route-reference-scan',
      blank: false,
      wildcard: false,
      authRequired: false,
      permissioned: false,
    }));
  const blankRoutes = routes.filter((route) => route.blank);
  const orphanPages = orphanPageEntries();
  const allEntries = [...routes, ...orphanPages];
  const counts = allEntries.reduce((acc, route) => {
    acc[route.status] = (acc[route.status] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    appPath: relative(repoRoot, appPath).split(sep).join('/'),
    routes,
    orphanPages,
    blankRoutes,
    unreachableRoutes,
    duplicateOwnership,
    counts,
    totalRoutes: routes.length,
  };
}

export function formatRouteHealthReport(graph = buildRouteHealthGraph()) {
  const lines = [
    '# Route Health Report',
    '',
    `Generated: ${graph.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Total route entries: ${graph.totalRoutes}`,
    `- Active: ${graph.counts.active || 0}`,
    `- Alias: ${graph.counts.alias || 0}`,
    `- Deprecated: ${graph.counts.deprecated || 0}`,
    `- Hidden: ${graph.counts.hidden || 0}`,
    `- Orphaned pages: ${graph.orphanPages.length}`,
    `- Blank routes: ${graph.blankRoutes.length}`,
    `- Unreachable active/hidden routes: ${graph.unreachableRoutes.length}`,
    `- Duplicate route ownership conflicts: ${graph.duplicateOwnership.length}`,
    '',
    '## Route Inventory',
    '',
    '| Route | Component | Navigation Entry | Inventory Entry | Backend Contract | Health | Source |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...graph.routes.map(
      (route) =>
        `| \`${route.path}\` | ${route.component} | ${route.navigationEntry || 'none'} | ${route.inventoryEntry || 'none'} | ${route.backendContract || 'none'} | ${route.status} | ${route.sources?.join(', ') || route.source} |`
    ),
    '',
    '## Orphan Pages',
    '',
    graph.orphanPages.length
      ? graph.orphanPages.map((route) => `- \`${route.path}\``).join('\n')
      : 'No orphan page files detected.',
    '',
    '## Validation Gates',
    '',
    `- No blank routes: ${graph.blankRoutes.length === 0 ? 'pass' : 'fail'}`,
    `- No unreachable active/hidden routes: ${graph.unreachableRoutes.length === 0 ? 'pass' : 'fail'}`,
    `- No duplicate route ownership: ${graph.duplicateOwnership.length === 0 ? 'pass' : 'fail'}`,
    `- No orphan pages: ${graph.orphanPages.length === 0 ? 'pass' : 'fail'}`,
    '',
  ];
  return lines.join('\n');
}
