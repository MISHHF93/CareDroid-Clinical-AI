/**
 * Orphan detection — routes, pages, components, domain modules, services, APIs, docs.
 * Regenerate: npm run orphan-detection:write-docs
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANONICAL_APP_ROUTE_TREE,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
  ROUTE_ALIAS_REDIRECTS,
} from '../config/routes.config';
import {
  getCanonicalToolInventory,
  getUserFacingToolInventory,
  TOOL_EXECUTOR_STATUS,
} from './toolInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { BACKEND_HTTP_ROUTES, findBackendRoute } from './backendHttpRouteInventory';
import { runBackendFrontendExposureScan } from './backendFrontendExposure';
import {
  BACKEND_ROUTE_EXPOSURE_POLICY,
  getBackendOnlyRoutes,
  routePolicyKey,
} from './backendRouteExposurePolicy';
import { ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from './clinicalToolIdContract';
import { BACKEND_EXECUTOR_NLU_TOOL_IDS } from '../config/backendApiCapabilities';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../..');

export const ORPHAN_CLASSIFICATIONS = Object.freeze({
  WIRE: 'wire',
  MERGE: 'merge',
  QUARANTINE: 'quarantine',
  LEGACY: 'legacy',
});

const MERGE_DUPLICATES = Object.freeze([
  {
    id: 'dashboard-dual-home',
    primary: 'src/pages/CommandDashboard.jsx',
    duplicate: 'removed: src/pages/Dashboard.jsx',
    route: '/assistant vs /dashboard',
    note: 'Former assistant page duplicate removed; ED Copilot now lives in src/components/ChatInterface.jsx.',
  },
  {
    id: 'pack-marketplace-dual',
    primary: 'src/pages/organization/OrganizationPages.jsx (PackMarketplace)',
    duplicate: '/asset-packs vs /settings/organization/packs',
    route: 'organization packs',
    note: 'Intentional dual context: product discovery and organization entitlement management share PackMarketplace.',
  },
  {
    id: 'notification-services-dual',
    primary: 'src/services/NotificationService.js',
    duplicate: 'src/services/notifications/NotificationService.js',
    route: '—',
    note: 'Nested service is legacy queue-style compatibility only; active app client is src/services/NotificationService.js.',
  },
]);

const EXPECTED_LEGACY_NON_ROUTE_FILES = new Set([
  'src/pages/tools/Calculators.jsx',
  'src/pages/CommandDashboard.jsx',
  'src/pages/fleet/FleetDashboardWidgets.jsx',
  'src/pages/SimulationLaboratoryViewer.css',
]);

const LEGACY_ROUTE_PREFIXES = ['/login', '/signin', '/home', '/chat', '/calculator/', '/medical-simulation', '/lab', '/anatomy-viewer'];

function readRepoFile(relPath) {
  const full = join(REPO_ROOT, relPath);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function walkFiles(dir, { extensions, excludeTest = false }) {
  const results = [] as any[];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
      results.push(...walkFiles(full, { extensions, excludeTest }));
      continue;
    }
    if (excludeTest && /\.(test|spec)\.[jt]sx?$/.test(entry)) continue;
    if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function buildProductionCorpus() {
  const dirs = [
    join(REPO_ROOT, 'src'),
    join(REPO_ROOT, 'backend', 'src'),
  ];
  const files = dirs.flatMap((d) => walkFiles(d, { extensions: ['.js', '.jsx', '.ts', '.tsx'], excludeTest: true }));
  return { files, text: files.map((f) => readFileSync(f, 'utf8')).join('\n') };
}

function parseAppRoutePaths() {
  const app = readRepoFile('src/app/router.jsx');
  const directPaths = [...app.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const jsxLiteralPaths = [...app.matchAll(/<Route\b[^>]*\spath=["']([^"']+)["']/g)].map((m) => m[1]);
  const jsxCanonicalRoutePaths = [...app.matchAll(/path=\{CANONICAL_ROUTES\.([A-Za-z0-9_]+)\}/g)]
    .map((m) => CANONICAL_ROUTES[m[1]])
    .filter(Boolean);
  const canonicalTreePaths = app.includes('CANONICAL_APP_ROUTE_TREE')
    ? CANONICAL_APP_ROUTE_TREE.map((route) => route.path)
    : [];
  const nonEdRedirectPaths = app.includes('NON_ED_WORKSPACE_REDIRECT_ROUTES')
    ? NON_ED_WORKSPACE_REDIRECT_ROUTES.map((route) => route.path)
    : [];
  const generatedAliasPaths = app.includes('ROUTE_ALIAS_REDIRECTS') ||
    app.includes('PROTECTED_ROUTE_ALIAS_REDIRECTS')
    ? ROUTE_ALIAS_REDIRECTS.map((entry) => entry.path)
    : [];
  const legacyEmergencyPaths = app.includes('LEGACY_EMERGENCY_ROUTE_REDIRECTS')
    ? LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((entry) => entry.path)
    : [];
  const futureReleasePaths = app.includes('FUTURE_RELEASE_ROUTES')
    ? [...app.matchAll(/\[\s*['"][^'"]+['"]\s*,\s*['"](\/[^'"]+)['"]\s*\]/g)].map((m) => m[1])
    : [];
  const redirectTargets = [
    ...app.matchAll(/LegacyProtectedRouteRedirect\s+to=['"]([^'"]+)['"]/g),
    ...app.matchAll(/LegacyProtectedRouteRedirect\s+to=\{([^}]+)\}/g),
  ].map((m) => m[1].replace(/['"]/g, '').trim());
  const lazyImports = [
    ...app.matchAll(/import\(['"](\.\/[^'"]+)['"]\)/g),
    ...app.matchAll(/from\s+['"](\.\/pages\/[^'"]+)['"]/g),
  ].map((m) => m[1]);
  return {
    paths: [
      ...new Set([
        ...directPaths,
        ...jsxLiteralPaths,
        ...jsxCanonicalRoutePaths,
        ...canonicalTreePaths,
        ...nonEdRedirectPaths,
        ...generatedAliasPaths,
        ...legacyEmergencyPaths,
        ...futureReleasePaths,
      ]),
    ],
    redirectTargets: [...new Set(redirectTargets.filter((t) => t.startsWith('/')))],
    lazyImports: [...new Set(lazyImports)],
  };
}

function normalizeImportToSrcPath(specifier) {
  let p = specifier.replace(/^\.\//, 'src/');
  if (!/\.(jsx|js|tsx|ts)$/.test(p)) {
    if (existsSync(join(REPO_ROOT, `${p}.jsx`))) p += '.jsx';
    else if (existsSync(join(REPO_ROOT, `${p}.js`))) p += '.js';
    else p += '.jsx';
  }
  return p.replace(/\\/g, '/');
}

function fileReferenceNeedles(relFromRepo) {
  const normalized = relFromRepo.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.(jsx|js|tsx|ts)$/, '');
  const base = withoutExt.split('/').pop();
  return [
    normalized,
    withoutExt,
    `./${withoutExt.replace(/^src\//, '')}`,
    `pages/${withoutExt.replace(/^src\/pages\//, '')}`,
    base,
  ];
}

function isReferenced(relPath, corpusText, appWiredPaths) {
  if (appWiredPaths.has(relPath.replace(/\\/g, '/'))) {
    return { referenced: true, via: 'App.jsx import' };
  }
  const needles = fileReferenceNeedles(relPath);
  for (const needle of needles) {
    if (needle.length < 4) continue;
    if (corpusText.includes(needle)) {
      return { referenced: true, via: `import:${needle}` };
    }
  }
  return { referenced: false, via: null };
}

function classifyItem({ referenced, inAppRoutes, inNav, inInventory, isRedirectAlias, mergeId, name }) {
  if (mergeId) return ORPHAN_CLASSIFICATIONS.MERGE;
  if (isRedirectAlias || LEGACY_ROUTE_PREFIXES.some((p) => name?.startsWith?.(p))) {
    return ORPHAN_CLASSIFICATIONS.LEGACY;
  }
  if (referenced && inAppRoutes) return null;
  if (inNav || inInventory) return ORPHAN_CLASSIFICATIONS.WIRE;
  if (referenced) return ORPHAN_CLASSIFICATIONS.LEGACY;
  return ORPHAN_CLASSIFICATIONS.QUARANTINE;
}

function collectCanonicalNavPaths() {
  const paths: Set<any> = new Set(Object.values(CANONICAL_ROUTES));
  const nav = readRepoFile('src/config/navigation.config.js');
  for (const m of nav.matchAll(/['"](\/[^'"]+)['"]/g)) {
    paths.add(m[1]);
  }
  for (const m of nav.matchAll(/legacyPaths:\s*\[([^\]]+)\]/g)) {
    for (const p of m[1].matchAll(/['"](\/[^'"]+)['"]/g)) {
      paths.add(p[1]);
    }
  }
  return paths;
}

function routePatternMatches(pattern, route) {
  if (!pattern || !route) return false;
  if (pattern === route) return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return route === prefix || route.startsWith(`${prefix}/`);
  }
  const patternParts = pattern.split('/').filter(Boolean);
  const routeParts = route.split('/').filter(Boolean);
  if (patternParts.length !== routeParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === routeParts[index]);
}

function routeIsCovered(route, appPaths) {
  return appPaths.some((pattern) => routePatternMatches(pattern, route));
}

function detectOrphanRoutes(appPaths, navPaths) {
  const appSet = new Set(appPaths);
  const rows = [] as any[];

  for (const path of navPaths) {
    if (!routeIsCovered(path, appPaths) && !appPaths.some((p) => p.startsWith(path))) {
      const isLegacy = LEGACY_ROUTE_PREFIXES.some((l) => path.startsWith(l));
      rows.push({
        id: path,
        route: path,
        classification: isLegacy ? ORPHAN_CLASSIFICATIONS.LEGACY : ORPHAN_CLASSIFICATIONS.WIRE,
        evidence: 'In navigation.config / CANONICAL_ROUTES but no exact App.jsx route',
      });
    }
  }

  for (const tool of getUserFacingToolInventory()) {
    const route = tool.route;
    if (!route || appSet.has(route) || routeIsCovered(route, appPaths)) continue;
    rows.push({
      id: tool.id,
      route,
      classification: ORPHAN_CLASSIFICATIONS.WIRE,
      evidence: 'toolInventory route not registered in App.jsx',
    });
  }

  for (const path of appPaths) {
    if (path.includes(':')) continue;
    const isLegacy =
      LEGACY_ROUTE_PREFIXES.some((l) => path.startsWith(l)) ||
      path === '/workspace' ||
      path === '/home';
    if (isLegacy) {
      rows.push({
        id: path,
        route: path,
        classification: ORPHAN_CLASSIFICATIONS.LEGACY,
        evidence: 'Redirect or alias route in App.jsx',
      });
    }
  }

  return rows;
}

function detectOrphanPages(corpus, appImports) {
  const pageFiles = walkFiles(join(REPO_ROOT, 'src/pages'), {
    extensions: ['.jsx', '.js'],
    excludeTest: true,
  });
  const appWired = new Set(
    [...appImports].map((spec) => normalizeImportToSrcPath(spec))
  );
  const inventoryComponents = new Set(
    getCanonicalToolInventory()
      .map((t) => t.component)
      .filter(Boolean)
  );

  return pageFiles.map((full) => {
    const rel = relative(REPO_ROOT, full).replace(/\\/g, '/');
    const ref = isReferenced(rel, corpus.text, appWired);
    const inInventory = inventoryComponents.has(rel);
    const mergeDuplicate = MERGE_DUPLICATES.find((m) => m.duplicate === rel);
    const mergePrimary = MERGE_DUPLICATES.find((m) => m.primary === rel);
    if (mergePrimary && appWired.has(rel)) return null;

    let classification =
      classifyItem({
        referenced: ref.referenced,
        inAppRoutes: appWired.has(rel),
        inInventory,
        mergeId: mergeDuplicate?.id,
        name: rel,
      } as any) || (ref.referenced ? null : ORPHAN_CLASSIFICATIONS.QUARANTINE);

    if (mergeDuplicate) classification = ORPHAN_CLASSIFICATIONS.MERGE;
    if (EXPECTED_LEGACY_NON_ROUTE_FILES.has(rel)) {
      classification = ORPHAN_CLASSIFICATIONS.LEGACY;
    }
    if (!classification) return null;
    if (appWired.has(rel) && classification === ORPHAN_CLASSIFICATIONS.LEGACY && !mergeDuplicate) {
      return null;
    }

    return {
      id: rel,
      path: rel,
      classification,
      evidence: ref.referenced ? ref.via : 'No production import path found',
      domain: domainForPath(rel),
    };
  }).filter(Boolean);
}

function domainForPath(rel) {
  if (/Simulation|simulation/.test(rel)) return 'simulation';
  if (/Laboratory|laboratory/.test(rel)) return 'laboratory';
  if (/3[Dd]|Medical3D|medical-3d/.test(rel)) return '3d-viewer';
  if (/Dashboard/.test(rel)) return 'dashboard';
  if (/fleet\//.test(rel)) return 'fleet';
  return 'page';
}

function detectDomainModuleOrphans(corpus, appImports) {
  const domains = {
    dashboards: walkFiles(join(REPO_ROOT, 'src/pages'), { extensions: ['.jsx'], excludeTest: true }).filter(
      (f) => /Dashboard/.test(f)
    ),
    simulations: walkFiles(join(REPO_ROOT, 'src/pages'), { extensions: ['.jsx'], excludeTest: true }).filter(
      (f) => /Simulation|MedicalSimulation/.test(f)
    ),
    laboratory: walkFiles(join(REPO_ROOT, 'src/pages'), { extensions: ['.jsx'], excludeTest: true }).filter(
      (f) => /Laboratory|Lab[A-Z]/.test(f)
    ),
    viewer3d: walkFiles(join(REPO_ROOT, 'src'), { extensions: ['.jsx', '.js', '.css'], excludeTest: true }).filter(
      (f) => /3[Dd]|Medical3D|SimulationLaboratoryViewer/.test(f)
    ),
  };

  const appWired = new Set([...appImports].map((spec) => normalizeImportToSrcPath(spec)));
  const rows = [] as any[];

  for (const [domain, files] of Object.entries(domains)) {
    for (const full of files) {
      const rel = relative(REPO_ROOT, full).replace(/\\/g, '/');
      const ref = isReferenced(rel, corpus.text, appWired);
      if (ref.referenced && appWired.has(rel)) continue;
      const classification = EXPECTED_LEGACY_NON_ROUTE_FILES.has(rel)
        ? ORPHAN_CLASSIFICATIONS.LEGACY
        : ref.referenced
        ? ORPHAN_CLASSIFICATIONS.WIRE
        : rel.endsWith('.css')
          ? ORPHAN_CLASSIFICATIONS.LEGACY
          : ORPHAN_CLASSIFICATIONS.QUARANTINE;
      rows.push({
        id: rel,
        domain,
        classification,
        evidence: ref.referenced ? ref.via : 'Unreferenced in production graph',
      });
    }
  }

  return rows;
}

function detectOrphanComponents(corpus) {
  const componentFiles = walkFiles(join(REPO_ROOT, 'src/components'), {
    extensions: ['.jsx', '.js'],
    excludeTest: true,
  }).filter((f) => !f.endsWith('index.js') && !f.endsWith('index.jsx'));

  return componentFiles
    .map((full) => {
      const rel = relative(REPO_ROOT, full).replace(/\\/g, '/');
      const ref = isReferenced(rel, corpus.text, new Set());
      if (ref.referenced) return null;
      const baseName = rel.split('/').pop();
      const inBarrel = corpus.text.includes(`from './charts/${baseName}'`) || corpus.text.includes(`from './data-display/${baseName}'`);
      return {
        id: rel,
        path: rel,
        classification: inBarrel ? ORPHAN_CLASSIFICATIONS.WIRE : ORPHAN_CLASSIFICATIONS.QUARANTINE,
        evidence: inBarrel ? 'Exported from barrel only' : 'No production import',
      };
    })
    .filter(Boolean);
}

function detectOrphanServices(corpus) {
  const serviceFiles = walkFiles(join(REPO_ROOT, 'src/services'), {
    extensions: ['.js'],
    excludeTest: true,
  });

  return serviceFiles
    .map((full) => {
      const rel = relative(REPO_ROOT, full).replace(/\\/g, '/');
      const ref = isReferenced(rel, corpus.text, new Set());
      if (ref.referenced) return null;
      const merge = MERGE_DUPLICATES.find((m) => rel.includes('NotificationService'));
      return {
        id: rel,
        path: rel,
        classification: merge ? ORPHAN_CLASSIFICATIONS.MERGE : ORPHAN_CLASSIFICATIONS.QUARANTINE,
        evidence: 'No production import of service module',
      };
    })
    .filter(Boolean);
}

function detectOrphanExecutors() {
  const registered = getUserFacingToolInventory().filter(
    (t) => t.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
  );
  const rows = [] as any[];
  for (const tool of registered) {
    const orchId = tool.orchestratorToolId || tool.id;
    if (!ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes(orchId) && !BACKEND_EXECUTOR_NLU_TOOL_IDS.includes(orchId)) {
      rows.push({
        id: tool.id,
        classification: ORPHAN_CLASSIFICATIONS.WIRE,
        evidence: `Inventory claims REGISTERED executor but ${orchId} is not in orchestrator registry`,
      });
    }
  }
  const scan = runBackendFrontendExposureScan();
  for (const row of scan.falseExecutorClaims || []) {
    rows.push({
      id: row.canonicalId,
      classification: ORPHAN_CLASSIFICATIONS.WIRE,
      evidence: 'Contract row claims backend executor without registration',
    });
  }
  return rows;
}

function detectOrphanApis() {
  const scan = runBackendFrontendExposureScan();
  const rows = [] as any[];

  for (const call of scan.unguarded) {
    rows.push({
      id: call.id,
      method: call.method,
      path: call.path,
      client: call.client,
      classification: ORPHAN_CLASSIFICATIONS.WIRE,
      evidence: 'Frontend client calls path with no backend route and capability not disabled',
    });
  }

  for (const call of scan.gatedStubs) {
    rows.push({
      id: call.id,
      method: call.method,
      path: call.path,
      client: call.client,
      classification: ORPHAN_CLASSIFICATIONS.LEGACY,
      evidence: 'Gated stub — intentional no-op until backend exists',
    });
  }

  const frontendPaths = new Set(FRONTEND_API_CALLS.map((c) => `${c.method} ${c.path}`));
  for (const route of getBackendOnlyRoutes().slice(0, 80)) {
    const key = `${route.method} ${route.path}`;
    if (!frontendPaths.has(key)) {
      rows.push({
        id: key,
        method: route.method,
        path: route.path,
        client: route.controller,
        classification: ORPHAN_CLASSIFICATIONS.LEGACY,
        evidence: 'Backend-only route (no SPA client)',
      });
    }
  }

  const missingFromInventory = BACKEND_HTTP_ROUTES.filter((r) => {
    return !FRONTEND_API_CALLS.some(
      (c) => findBackendRoute(c.method, c.path)?.path === r.path && c.method === r.method
    );
  });
  for (const route of missingFromInventory.filter((r) => r.path.includes('/api/platform') || r.path.includes('/api/products'))) {
    const policy = BACKEND_ROUTE_EXPOSURE_POLICY[routePolicyKey(route.method, route.path)];
    const shouldWire = policy?.strategy === 'expose-recommended';
    rows.push({
      id: `${route.method} ${route.path}`,
      method: route.method,
      path: route.path,
      client: route.controller,
      classification: shouldWire ? ORPHAN_CLASSIFICATIONS.WIRE : ORPHAN_CLASSIFICATIONS.LEGACY,
      evidence: shouldWire
        ? 'Platform/product API is expose-recommended but not listed in frontendApiCallsInventory'
        : `Platform/product API is ${policy?.strategy ?? 'deferred'} and not frontend-inventory wired`,
    });
  }

  return rows;
}

function detectOrphanMarkdown(srcCorpus) {
  const docFiles = walkFiles(join(REPO_ROOT, 'docs'), { extensions: ['.md'], excludeTest: false });
  const readme = readRepoFile('README.md');
  const docContents = docFiles.map((full) => ({
    full,
    rel: relative(REPO_ROOT, full).replace(/\\/g, '/'),
    text: readFileSync(full, 'utf8'),
  }));
  const allDocsBlob = docContents.map((d) => d.text).join('\n');

  return docContents
    .map(({ full, rel, text }) => {
      const base = rel.split('/').pop()!;
      if (readme.includes(rel) || readme.includes(base)) return null;
      if (allDocsBlob.includes(`](${rel})`) || allDocsBlob.includes(`](./${base})`) || srcCorpus.includes(rel)) {
        return null;
      }
      const inbound = docContents.some(
        (other) => other.full !== full && (other.text.includes(rel) || other.text.includes(base))
      );
      if (inbound) return null;

      const isGenerated = /Generated:|regenerate with/i.test(text.slice(0, 500));
      const isStaleReport = /report|investigation|scan-report/i.test(base);
      return {
        id: rel,
        path: rel,
        classification: isGenerated
          ? ORPHAN_CLASSIFICATIONS.LEGACY
          : isStaleReport
            ? ORPHAN_CLASSIFICATIONS.QUARANTINE
            : ORPHAN_CLASSIFICATIONS.QUARANTINE,
        evidence: 'No inbound links from README, src, or other docs',
      };
    })
    .filter(Boolean);
}

export function buildOrphanDetectionReport() {
  const corpus = buildProductionCorpus();
  const { paths: appPaths, lazyImports } = parseAppRoutePaths();
  const navPaths = collectCanonicalNavPaths();
  const appWiredSet = new Set(lazyImports.map((s) => normalizeImportToSrcPath(s)));

  const routes = detectOrphanRoutes(appPaths, navPaths);
  const pages = detectOrphanPages(corpus, lazyImports);
  const components = detectOrphanComponents(corpus);
  const domainModules = detectDomainModuleOrphans(corpus, lazyImports);
  const services = detectOrphanServices(corpus);
  const executors = detectOrphanExecutors();
  const apis = detectOrphanApis();
  const markdown = detectOrphanMarkdown(corpus.text);

  const all = [
    ...routes.map((r) => ({ ...r, category: 'route' })),
    ...pages.map((r) => ({ ...r, category: 'page' })),
    ...components.map((r) => ({ ...r, category: 'component' })),
    ...domainModules.map((r) => ({ ...r, category: r.domain })),
    ...services.map((r) => ({ ...r, category: 'service' })),
    ...executors.map((r) => ({ ...r, category: 'executor' })),
    ...apis.map((r) => ({ ...r, category: 'api' })),
    ...markdown.map((r) => ({ ...r, category: 'markdown' })),
  ];

  const byClass = Object.fromEntries(
    Object.values(ORPHAN_CLASSIFICATIONS).map((c) => [c, all.filter((r) => r.classification === c)])
  );

  return {
    summary: {
      total: all.length,
      routes: routes.length,
      pages: pages.length,
      components: components.length,
      domainModules: domainModules.length,
      services: services.length,
      executors: executors.length,
      apis: apis.length,
      markdown: markdown.length,
      appRouteCount: appPaths.length,
      byClass: Object.fromEntries(
        Object.entries(byClass).map(([k, v]) => [k, v.length])
      ),
    },
    routes,
    pages,
    components,
    domainModules,
    services,
    executors,
    apis,
    markdown,
    mergeCandidates: MERGE_DUPLICATES,
    all,
  };
}

function escapeCell(v) {
  return String(v ?? '—').replace(/\|/g, '\\|');
}

function formatSection(title, rows, columns) {
  if (!rows.length) return [`## ${title}`, '', '_None detected._', ''];
  const header = columns.map((c) => c.label);
  const lines = [
    `## ${title}`,
    '',
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) =>
      `| ${columns.map((c) => escapeCell(row[c.key])).join(' | ')} |`
    ),
    '',
  ];
  return lines;
}

export function formatOrphanDetectionMarkdown(report = buildOrphanDetectionReport()) {
  const { summary } = report;
  const generated = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Orphan Detection Report',
    '',
    `Generated: ${generated} (regenerate with \`npm run orphan-detection:write-docs\`)`,
    '',
    '## Classification key',
    '',
    '| Class | Meaning |',
    '|-------|---------|',
    '| **wire** | Reachable in product intent (nav/inventory) but missing route, import, or API contract |',
    '| **merge** | Duplicate surface or overlapping module — consolidate |',
    '| **quarantine** | No production consumer — archive or delete after review |',
    '| **legacy** | Redirect, alias, gated stub, or deprecated path kept for compatibility |',
    '',
    '## Executive summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Total orphan findings | ${summary.total} |`,
    `| App.jsx routes | ${summary.appRouteCount} |`,
    `| Orphan / gap routes | ${summary.routes} |`,
    `| Orphan pages | ${summary.pages} |`,
    `| Orphan components | ${summary.components} |`,
    `| Domain module findings (dashboard / simulation / lab / 3D) | ${summary.domainModules} |`,
    `| Orphan services | ${summary.services} |`,
    `| Executor contract gaps | ${summary.executors} |`,
    `| API orphans / stubs | ${summary.apis} |`,
    `| Weakly linked markdown | ${summary.markdown} |`,
    `| **wire** | ${summary.byClass.wire ?? 0} |`,
    `| **merge** | ${summary.byClass.merge ?? 0} |`,
    `| **quarantine** | ${summary.byClass.quarantine ?? 0} |`,
    `| **legacy** | ${summary.byClass.legacy ?? 0} |`,
    '',
    '## Merge candidates (explicit)',
    '',
    '| ID | Primary | Duplicate | Note |',
    '|----|---------|-----------|------|',
    ...report.mergeCandidates.map(
      (m) => `| ${m.id} | ${m.primary} | ${m.duplicate} | ${m.note} |`
    ),
    '',
    '## Critical findings',
    '',
    '1. **Simulation / lab / 3D workspace styles** — `SimulationLaboratoryViewer.css` is an intentional shared style module for active demo pages; no missing page component is required. Class: **legacy**.',
    '2. **AI agents / platform APIs** — platform/product clients are represented in `frontendApiCallsInventory`; current scan has no **wire** findings.',
    '3. **Chart/export components** — legacy barrel-only components have been removed; keep new chart surfaces route-owned. Class: **resolved**.',
    '4. **Dual registry** — hundreds of tools in inventory without dedicated page components (route-only). Class: **legacy** (inventory-first) unless promoting to assets.',
    '',
  ];

  const col = [
    { key: 'id', label: 'ID / Path' },
    { key: 'classification', label: 'Class' },
    { key: 'evidence', label: 'Evidence' },
  ];

  lines.push(
    ...formatSection('Orphan routes', report.routes, [
      { key: 'route', label: 'Route' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Orphan pages', report.pages, [
      { key: 'path', label: 'Page file' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Orphan components', report.components, [
      { key: 'path', label: 'Component' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Dashboards', report.domainModules.filter((r) => r.domain === 'dashboard'), [
      { key: 'id', label: 'Module' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Simulations', report.domainModules.filter((r) => r.domain === 'simulation'), [
      { key: 'id', label: 'Module' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Laboratory modules', report.domainModules.filter((r) => r.domain === 'laboratory'), [
      { key: 'id', label: 'Module' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('3D viewer code', report.domainModules.filter((r) => r.domain === '3d-viewer'), [
      { key: 'id', label: 'Module' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Orphan services', report.services, [
      { key: 'path', label: 'Service' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Orphan executors', report.executors, [
      { key: 'id', label: 'Tool ID' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
    ...formatSection('Orphan APIs', report.apis.slice(0, 120), [
      { key: 'id', label: 'API' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ]),
  );

  if (report.apis.length > 120) {
    lines.push(`_… and ${report.apis.length - 120} more API rows._`, '');
  }

  lines.push(
    ...formatSection('Orphan markdown (weak inbound links)', report.markdown.slice(0, 60), [
      { key: 'path', label: 'Doc' },
      { key: 'classification', label: 'Class' },
      { key: 'evidence', label: 'Evidence' },
    ])
  );
  if (report.markdown.length > 60) {
    lines.push(`_… and ${report.markdown.length - 60} more doc files._`, '');
  }

  lines.push(
    '## Appendix',
    '',
    '- Prior manual scan: [unwired-orphan-code-scan.md](./unwired-orphan-code-scan.md)',
    '- Backend-only exposure: [orphaned-backend-functions.md](./orphaned-backend-functions.md)',
    '- Generator: `src/data/orphanDetectionAudit.js`',
    ''
  );

  return lines.join('\n');
}
