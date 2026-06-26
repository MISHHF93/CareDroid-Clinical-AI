import { readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
} from '../config/routes.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..');
const repoRoot = join(srcRoot, '..');
const appPath = join(srcRoot, 'app', 'router.jsx');
const appSource = readFileSync(appPath, 'utf8');
const canonicalRouteByExpression = new Map(
  Object.entries(CANONICAL_ROUTES).map(([key, value]) => [`CANONICAL_ROUTES.${key}`, value]),
);
const ACTIVE_EMERGENCY_ROUTE_PATHS = new Set(
  CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path),
);

export const ROUTE_HEALTH_STATES = Object.freeze({
  ACTIVE: 'active',
  ALIAS: 'alias',
  DEPRECATED: 'deprecated',
  HIDDEN: 'hidden',
  ORPHANED: 'orphaned',
});

const HIDDEN_PREFIXES = ['/governance', '/audit'];
const HIDDEN_PATHS = new Set([
  '/privacy',
  '/regulatory',
  '/human-review',
  '/review',
  '/operations/observability',
  '/clinical/alerts',
]);

const ROUTE_OWNERSHIP_GROUPS = Object.freeze({
  PlatformGovernanceWorkspace: 'platform-governance-workspace',
  PlatformSystemPage: 'platform-system-page',
  LegacyProtectedRouteRedirect: 'legacy-redirect',
  Navigate: 'router-redirect',
  ToolsRedirect: 'tools-redirect',
  ToolNotFound: 'tools-fallback',
  ToolsAreaFallback: 'area-fallback',
});

function normalizePath(path) {
  if (!path) return '';
  return path === '/' ? '/' : String(path).replace(/\/+$/, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function resolveRoutePathValue(value) {
  const expression = value.trim();
  if (!expression || expression === 'path') return '';
  if (expression === '*' || expression.startsWith('/')) return expression;
  if (
    (expression.startsWith("'") && expression.endsWith("'")) ||
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith('`') && expression.endsWith('`'))
  ) {
    return expression.slice(1, -1);
  }
  return canonicalRouteByExpression.get(expression) || '';
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
    .filter((name) => !['AppShellPage', 'PermissionGate', 'Route'].includes(name));
  return components.at(-1) || fallback;
}

function inferStatus({ path, owner, block, generatedKind }) {
  const normalized = normalizePath(path);
  if (owner === 'Navigate') return ROUTE_HEALTH_STATES.ALIAS;
  if (owner === 'LegacyProtectedRouteRedirect') return ROUTE_HEALTH_STATES.ALIAS;
  if (owner === 'ToolsRedirect') return ROUTE_HEALTH_STATES.ALIAS;
  if (generatedKind?.endsWith('-alias')) return ROUTE_HEALTH_STATES.ALIAS;
  if (ACTIVE_EMERGENCY_ROUTE_PATHS.has(normalized)) return ROUTE_HEALTH_STATES.ACTIVE;
  if (normalized.includes('*')) return ROUTE_HEALTH_STATES.HIDDEN;
  if (
    HIDDEN_PATHS.has(normalized) ||
    HIDDEN_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return ROUTE_HEALTH_STATES.HIDDEN;
  }
  if (/permission:\s*/.test(block || '')) return ROUTE_HEALTH_STATES.HIDDEN;
  return ROUTE_HEALTH_STATES.ACTIVE;
}

function buildRouteEntry({ path, source, generatedKind = undefined as string | undefined, owner = undefined as string | undefined, block = '', target = '' }) {
  const normalized = normalizePath(path);
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
    authRequired: ACTIVE_EMERGENCY_ROUTE_PATHS.has(normalized),
    permissioned: /permission:\s*/.test(block),
    navigationEntry: ACTIVE_EMERGENCY_ROUTE_PATHS.has(normalized) ? 'CareDroid' : '',
    inventoryEntry: '',
    backendContract: '',
  };
}

function directAppRouteEntries() {
  const objectEntries = [...appSource.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map((match) => {
    const path = match[1];
    const block = routeBlockForPath(path);
    return buildRouteEntry({
      path,
      block,
      source: 'app/router.jsx',
    });
  });

  const jsxEntries = [
    ...appSource.matchAll(/<Route\b[^>]*\bpath=(?:"([^"]+)"|'([^']+)'|\{([^}]+)\})[^>]*>/g),
  ]
    .map((match) => {
      const path = resolveRoutePathValue(match[1] || match[2] || match[3] || '');
      if (!path) return null;
      return buildRouteEntry({
        path,
        block: match[0],
        source: 'app/router.jsx',
      });
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [...objectEntries, ...jsxEntries];
}

function generatedAliasEntries() {
  const aliasEntries = [
    ...LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((alias) => ({
      path: alias.path,
      target: alias.to,
      generatedKind: `${alias.routeId}-alias`,
    })),
  ];

  return aliasEntries.map((entry) =>
    buildRouteEntry({
      ...entry,
      owner: 'Navigate',
      source: entry.generatedKind,
    }),
  );
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
      existing.source === 'app/router.jsx' && entry.source !== 'app/router.jsx'
        ? existing
        : entry.source === 'app/router.jsx' && existing.source !== 'app/router.jsx'
          ? entry
          : statusPriority.indexOf(entry.status) < statusPriority.indexOf(existing.status)
            ? entry
            : existing;
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
      ...CANONICAL_APP_ROUTE_TREE.filter((route) => route.path !== '*').map((route) => route.path),
      ...LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((route) => route.path),
      '/dashboard',
      '/home',
      '/app',
      '/workspace',
      '/mobile',
      '/general-healthcare',
      '/tools/calculators/qsofa',
    ]).map(normalizePath),
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

function orphanPageEntries(): Array<{ path: string; [key: string]: any }> {
  return [];
}

export function buildRouteHealthGraph() {
  const rawRoutes = [...directAppRouteEntries(), ...generatedAliasEntries()];
  const routes = mergeRouteEntries(rawRoutes);
  const referenced = referencedRoutePaths();
  const duplicateOwnership = Object.values(
    rawRoutes.reduce((acc: Record<string, any[]>, route) => {
      if (
        !route.path ||
        (route.status as string) === ROUTE_HEALTH_STATES.ALIAS ||
        (route.status as string) === ROUTE_HEALTH_STATES.DEPRECATED
      ) {
        return acc;
      }
      if (route.source !== 'app/router.jsx') return acc;
      acc[route.path] = acc[route.path] || [];
      acc[route.path].push(route);
      return acc;
    }, {}),
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
  const counts = allEntries.reduce((acc: Record<string, number>, route) => {
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
        `| \`${route.path}\` | ${route.component} | ${route.navigationEntry || 'none'} | ${route.inventoryEntry || 'none'} | ${route.backendContract || 'none'} | ${route.status} | ${route.sources?.join(', ') || route.source} |`,
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
