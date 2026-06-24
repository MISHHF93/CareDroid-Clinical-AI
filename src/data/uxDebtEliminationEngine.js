import { CANONICAL_ROUTES, ROUTE_ALIAS_GROUPS } from '../config/routes.config';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { builtinUiCalculators } from './clinicalIntentToolCatalog';
import {
  getCanonicalToolInventory,
  getUserFacingToolInventory,
} from './toolInventory';
import { RESPONSIVE_QA_PAGES, RESPONSIVE_QA_VIEWPORTS } from './responsiveQaMatrix';
import { E2E_MANUAL_QA_SECTIONS } from './e2eManualQaChecklist';

export const UX_DEBT_CLASSIFICATIONS = Object.freeze({
  DUPLICATE_UX: 'duplicate UX',
  CONFLICTING_UX: 'conflicting UX',
  HIDDEN_UX: 'hidden UX',
  OBSOLETE_UX: 'obsolete UX',
  ACCESSIBILITY_ISSUE: 'accessibility issue',
});

export const UX_SURFACE_TYPES = Object.freeze({
  NAVIGATION: 'navigation',
  ROUTES: 'routes',
  CARDS: 'cards',
  FORMS: 'forms',
  DIALOGS: 'dialogs',
  DRAWERS: 'drawers',
  TABLES: 'tables',
  MAPS: 'maps',
  CALCULATORS: 'calculators',
  DASHBOARDS: 'dashboards',
});

export const UX_DEBT_SEVERITY_WEIGHTS = Object.freeze({
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
});

const SHARED_ROUTE_ALLOWLIST = new Set(['/assistant', '/tools', '/tools/catalog']);
const HEAVY_HUB_THRESHOLD = 24;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function issue({
  id,
  classification,
  surface,
  severity = 'medium',
  title,
  evidence,
  recommendation,
  affected = [],
}) {
  return {
    id,
    classification,
    surface,
    severity,
    weight: UX_DEBT_SEVERITY_WEIGHTS[severity] || UX_DEBT_SEVERITY_WEIGHTS.medium,
    title,
    evidence,
    recommendation,
    affected,
  };
}

function countDashboards(tools) {
  return tools.filter((tool) => {
    const text = `${tool.name || ''} ${tool.label || ''} ${tool.id || ''}`.toLowerCase();
    return text.includes('dashboard') || text.includes('command center') || text.includes('analytics');
  }).length;
}

function countMaps(tools) {
  return tools.filter((tool) => {
    const text = `${tool.name || ''} ${tool.label || ''} ${tool.id || ''} ${tool.route || ''}`.toLowerCase();
    return text.includes('map') || text.includes('tracking') || text.includes('3d-viewer');
  }).length;
}

function buildSurfaceInventory({
  routes,
  navItems,
  tools,
  calculators,
  responsivePages,
  manualQaSections,
}) {
  return [
    {
      type: UX_SURFACE_TYPES.NAVIGATION,
      count: navItems.length,
      sources: ['src/config/navigation.config.js', 'src/layout/AppShell.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.ROUTES,
      count: Object.keys(routes).length,
      sources: ['src/config/routes.config.js', 'src/App.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.CARDS,
      count: tools.length,
      sources: ['src/data/toolInventory.js', 'src/data/toolRegistry.js', 'src/components/ToolCard.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.FORMS,
      count: calculators.length,
      sources: ['src/pages/tools/Calculators.jsx', 'src/data/clinicalIntentToolCatalog.js'],
    },
    {
      type: UX_SURFACE_TYPES.DIALOGS,
      count: 2,
      sources: ['src/components/QuickCommandLauncher.jsx', 'src/components/ui/Drawer.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.DRAWERS,
      count: 2,
      sources: ['src/layout/AppShell.jsx', 'src/components/ui/Drawer.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.TABLES,
      count: responsivePages.length,
      sources: ['src/data/responsiveQaMatrix.js', 'src/styles/layout-visibility.css'],
    },
    {
      type: UX_SURFACE_TYPES.MAPS,
      count: countMaps(tools),
      sources: ['src/pages/HospitalMapDashboard.jsx', 'src/pages/LiveTrackingMap.jsx', 'src/pages/fleet/FleetLiveMap.jsx'],
    },
    {
      type: UX_SURFACE_TYPES.CALCULATORS,
      count: calculators.length,
      sources: ['src/pages/tools/Calculators.jsx', 'src/data/responsiveQaMatrix.js'],
    },
    {
      type: UX_SURFACE_TYPES.DASHBOARDS,
      count: countDashboards(tools),
      sources: ['src/pages/CommandDashboard.jsx', 'src/components/ChatInterface.jsx', 'src/data/toolRegistry.js'],
    },
    {
      type: 'manual QA',
      count: manualQaSections.length,
      sources: ['src/data/e2eManualQaChecklist.js'],
    },
  ];
}

function duplicateNavFindings(navItems) {
  const byLabel = groupBy(navItems, (item) => normalize(item.label));
  return [...byLabel.entries()]
    .filter(([, items]) => unique(items.map((item) => item.path)).length > 1)
    .map(([label, items]) =>
      issue({
        id: `duplicate-nav-label-${label.replace(/\s+/g, '-')}`,
        classification: UX_DEBT_CLASSIFICATIONS.DUPLICATE_UX,
        surface: UX_SURFACE_TYPES.NAVIGATION,
        severity: 'medium',
        title: `Navigation label "${items[0].label}" points to multiple destinations`,
        evidence: `Paths: ${unique(items.map((item) => item.path)).join(', ')}`,
        recommendation: 'Use one canonical destination per visible navigation label or rename the secondary destination.',
        affected: items.map((item) => item.id),
      })
    );
}

function duplicateRouteFindings(routes) {
  const byPath = groupBy(
    Object.entries(routes).map(([id, path]) => ({ id, path })),
    (route) => route.path
  );
  return [...byPath.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([path, items]) =>
      issue({
        id: `duplicate-canonical-route-${path.replace(/[^a-z0-9]+/gi, '-')}`,
        classification: UX_DEBT_CLASSIFICATIONS.DUPLICATE_UX,
        surface: UX_SURFACE_TYPES.ROUTES,
        severity: 'high',
        title: `Canonical route "${path}" is declared by multiple route IDs`,
        evidence: `Route IDs: ${items.map((item) => item.id).join(', ')}`,
        recommendation: 'Keep one canonical route owner and move alternatives into route alias groups.',
        affected: items.map((item) => item.id),
      })
    );
}

function sharedRouteFindings(tools) {
  const byRoute = groupBy(tools, (tool) => tool.route || tool.navigationPath || tool.path);
  return [...byRoute.entries()]
    .filter(([route, items]) => items.length >= HEAVY_HUB_THRESHOLD && !SHARED_ROUTE_ALLOWLIST.has(route))
    .map(([route, items]) =>
      issue({
        id: `hidden-heavy-route-${route.replace(/[^a-z0-9]+/gi, '-')}`,
        classification: UX_DEBT_CLASSIFICATIONS.HIDDEN_UX,
        surface: route.includes('calculator') ? UX_SURFACE_TYPES.CALCULATORS : UX_SURFACE_TYPES.ROUTES,
        severity: 'medium',
        title: `${items.length} tools share "${route}" as their visible launch surface`,
        evidence: `First tools: ${items.slice(0, 8).map((tool) => tool.name || tool.label || tool.id).join(', ')}`,
        recommendation:
          'Keep the shared hub, but add clear in-page grouping, deep links, and search anchors so individual tools do not feel buried.',
        affected: items.map((tool) => tool.id).slice(0, 30),
      })
    );
}

function routeCoverageFindings(routes, responsivePages) {
  const responsivePaths = new Set(responsivePages.map((page) => page.path));
  const excluded = new Set(['/auth', '/auth-callback']);
  const missing = Object.entries(routes)
    .filter(([, path]) => !path.includes(':'))
    .filter(([, path]) => !excluded.has(path))
    .filter(([, path]) => !responsivePaths.has(path));

  if (missing.length === 0) return [];

  return [
    issue({
      id: 'hidden-responsive-route-coverage',
      classification: UX_DEBT_CLASSIFICATIONS.HIDDEN_UX,
      surface: UX_SURFACE_TYPES.ROUTES,
      severity: missing.length > 12 ? 'medium' : 'low',
      title: `${missing.length} canonical routes are not in the responsive route smoke matrix`,
      evidence: `Missing examples: ${missing.slice(0, 10).map(([id, path]) => `${id} (${path})`).join(', ')}`,
      recommendation:
        'Add responsive smoke coverage for high-traffic routes or mark intentionally internal routes in the audit allowlist.',
      affected: missing.map(([id]) => id),
    }),
  ];
}

function sourceSnapshotFindings(sourceSnapshot = {}) {
  const findings = [];
  const appShellJsx = sourceSnapshot.appShellJsx || '';
  const appShellCss = sourceSnapshot.appShellCss || '';
  const quickCommandCss = sourceSnapshot.quickCommandCss || '';
  const drawerJsx = sourceSnapshot.drawerJsx || '';

  if (appShellJsx.includes('ed-nav-rail') && appShellJsx.includes('app-shell-bottom-nav')) {
    findings.push(
      issue({
        id: 'conflicting-sidebar-bottom-nav',
        classification: UX_DEBT_CLASSIFICATIONS.CONFLICTING_UX,
        surface: UX_SURFACE_TYPES.NAVIGATION,
        severity: 'critical',
        title: 'Navigation rail and bottom navigation can render from the same shell',
        evidence: 'AppShell contains both ed-nav-rail and app-shell-bottom-nav.',
        recommendation: 'Use the AppShell navigation rail as canonical navigation and keep bottom nav disabled.',
      })
    );
  }

  if (appShellCss.includes('app-shell-bottom-nav') || appShellCss.includes('--app-bottom-nav-height')) {
    findings.push(
      issue({
        id: 'obsolete-bottom-nav-spacing',
        classification: UX_DEBT_CLASSIFICATIONS.OBSOLETE_UX,
        surface: UX_SURFACE_TYPES.NAVIGATION,
        severity: 'high',
        title: 'Bottom navigation styles or spacing remain in the app shell',
        evidence: 'AppShell.css still references app-shell-bottom-nav or --app-bottom-nav-height.',
        recommendation: 'Remove obsolete bottom-nav CSS and reserve only safe-area/keyboard spacing.',
      })
    );
  }

  if (quickCommandCss.includes('--app-bottom-nav-height')) {
    findings.push(
      issue({
        id: 'obsolete-quick-command-bottom-nav-offset',
        classification: UX_DEBT_CLASSIFICATIONS.OBSOLETE_UX,
        surface: UX_SURFACE_TYPES.DIALOGS,
        severity: 'medium',
        title: 'Quick Command still offsets above a removed bottom nav',
        evidence: 'QuickCommandLauncher.css references --app-bottom-nav-height.',
        recommendation: 'Anchor compact command UI to safe-area bottom spacing instead.',
      })
    );
  }

  if (appShellJsx && !appShellJsx.includes('data-layout-role="MainContent"')) {
    findings.push(
      issue({
        id: 'conflicting-main-content-contract',
        classification: UX_DEBT_CLASSIFICATIONS.CONFLICTING_UX,
        surface: UX_SURFACE_TYPES.ROUTES,
        severity: 'high',
        title: 'Authenticated pages lack a single main content scroll contract',
        evidence: 'AppShell.jsx does not expose data-layout-role="MainContent".',
        recommendation: 'Keep one main content scrollport for all protected routes.',
      })
    );
  }

  if (appShellJsx && !appShellJsx.includes('aria-label="CareDroid navigation"')) {
    findings.push(
      issue({
        id: 'a11y-nav-rail-label',
        classification: UX_DEBT_CLASSIFICATIONS.ACCESSIBILITY_ISSUE,
        surface: UX_SURFACE_TYPES.NAVIGATION,
        severity: 'high',
        title: 'AppShell navigation rail lacks an accessible label',
        evidence: 'Missing aria-label="CareDroid navigation".',
        recommendation: 'Keep the AppShell rail labelled so collapsed icon navigation is announced.',
      })
    );
  }

  if (drawerJsx && (!drawerJsx.includes('role="dialog"') || !drawerJsx.includes('aria-modal="true"'))) {
    findings.push(
      issue({
        id: 'a11y-drawer-dialog-contract',
        classification: UX_DEBT_CLASSIFICATIONS.ACCESSIBILITY_ISSUE,
        surface: UX_SURFACE_TYPES.DRAWERS,
        severity: 'high',
        title: 'Drawer lacks modal dialog semantics',
        evidence: 'Drawer.jsx must include role="dialog" and aria-modal="true".',
        recommendation: 'Keep modal semantics on drawer surfaces and preserve close button labels.',
      })
    );
  }

  return findings;
}

function aliasFindings(aliasGroups) {
  const aliasCount = Object.values(aliasGroups).reduce((total, group) => total + group.aliases.length, 0);
  if (aliasCount <= 20) return [];

  return [
    issue({
      id: 'obsolete-route-alias-volume',
      classification: UX_DEBT_CLASSIFICATIONS.OBSOLETE_UX,
      surface: UX_SURFACE_TYPES.ROUTES,
      severity: 'low',
      title: `${aliasCount} legacy route aliases remain in the routing layer`,
      evidence: 'Aliases preserve compatibility but can hide obsolete UX entry points if left undocumented.',
      recommendation: 'Keep redirects, but document owner, canonical target, and removal criteria for each alias group.',
      affected: Object.keys(aliasGroups),
    }),
  ];
}

function summarizeByClassification(findings) {
  return Object.values(UX_DEBT_CLASSIFICATIONS).reduce((acc, classification) => {
    acc[classification] = findings.filter((finding) => finding.classification === classification).length;
    return acc;
  }, {});
}

function summarizeBySurface(findings) {
  return Object.values(UX_SURFACE_TYPES).reduce((acc, surface) => {
    acc[surface] = findings.filter((finding) => finding.surface === surface).length;
    return acc;
  }, {});
}

function calculateHealthScore(findings) {
  const penalty = findings.reduce((total, finding) => total + finding.weight, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function buildUxDebtAudit({
  routes = CANONICAL_ROUTES,
  aliasGroups = ROUTE_ALIAS_GROUPS,
  navItems = [
    ...PRIMARY_NAV_ITEMS,
    ...PRIMARY_SIDEBAR_NAV_ITEMS,
    ...OPERATIONS_SIDEBAR_NAV_ITEMS,
    ...ADVANCED_SIDEBAR_NAV_ITEMS,
  ],
  canonicalTools = getCanonicalToolInventory(),
  userFacingTools = getUserFacingToolInventory(canonicalTools),
  calculators = builtinUiCalculators,
  responsivePages = RESPONSIVE_QA_PAGES,
  responsiveViewports = RESPONSIVE_QA_VIEWPORTS,
  manualQaSections = E2E_MANUAL_QA_SECTIONS,
  sourceSnapshot = {},
} = {}) {
  const findings = [
    ...duplicateNavFindings(navItems),
    ...duplicateRouteFindings(routes),
    ...sharedRouteFindings(userFacingTools),
    ...routeCoverageFindings(routes, responsivePages),
    ...aliasFindings(aliasGroups),
    ...sourceSnapshotFindings(sourceSnapshot),
  ].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  const healthScore = calculateHealthScore(findings);
  const auditedSurfaces = buildSurfaceInventory({
    routes,
    navItems,
    tools: userFacingTools,
    calculators,
    responsivePages,
    manualQaSections,
  });

  return {
    generatedAt: new Date().toISOString(),
    healthScore,
    healthGrade:
      healthScore >= 90 ? 'strong' : healthScore >= 75 ? 'watch' : healthScore >= 60 ? 'at risk' : 'critical',
    summary: {
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === 'critical').length,
      highFindings: findings.filter((finding) => finding.severity === 'high').length,
      classifications: summarizeByClassification(findings),
      surfaces: summarizeBySurface(findings),
      auditedSurfaceCount: auditedSurfaces.reduce((total, surface) => total + surface.count, 0),
      responsiveCoverage: {
        pages: responsivePages.length,
        viewports: responsiveViewports.length,
      },
    },
    auditedSurfaces,
    findings,
    automatedChecks: [
      'No AppShell bottom navigation when the canonical rail exists.',
      'No obsolete bottom-nav spacing tokens in authenticated shell CSS.',
      'Canonical route paths are unique.',
      'Navigation labels do not point to conflicting destinations.',
      'High-volume hub routes are flagged as hidden UX for grouping/deep-link review.',
      'AppShell rail and generic Drawer retain accessibility semantics.',
      'Canonical routes are compared against responsive smoke coverage.',
    ],
  };
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

export function formatUxDebtReportMarkdown(audit = buildUxDebtAudit()) {
  const lines = [
    '# UX Debt Report',
    '',
    `Generated from \`src/data/uxDebtEliminationEngine.js\`. UX health score: **${audit.healthScore}/100 (${audit.healthGrade})**.`,
    '',
    '## Scope',
    '',
    'Audited navigation, routes, cards, forms, dialogs, drawers, tables, maps, calculators, and dashboards.',
    '',
    '## Summary',
    '',
    `- Findings: ${audit.summary.findings}`,
    `- Critical findings: ${audit.summary.criticalFindings}`,
    `- High findings: ${audit.summary.highFindings}`,
    `- Audited surface count: ${audit.summary.auditedSurfaceCount}`,
    `- Responsive smoke coverage: ${audit.summary.responsiveCoverage.pages} pages across ${audit.summary.responsiveCoverage.viewports} viewport widths`,
    '',
    '## Classification Counts',
    '',
    ...Object.entries(audit.summary.classifications).map(([classification, count]) => `- ${classification}: ${count}`),
    '',
    '## Surface Counts',
    '',
    ...audit.auditedSurfaces.map((surface) => `- ${surface.type}: ${surface.count}`),
    '',
    '## Findings',
    '',
  ];

  if (audit.findings.length === 0) {
    lines.push('_No UX debt findings generated by automated checks._', '');
  } else {
    for (const finding of audit.findings) {
      lines.push(
        `### ${finding.title}`,
        '',
        `- Classification: ${finding.classification}`,
        `- Surface: ${finding.surface}`,
        `- Severity: ${finding.severity}`,
        `- Evidence: ${finding.evidence}`,
        `- Recommendation: ${finding.recommendation}`,
        ''
      );
      if (finding.affected.length) {
        lines.push(`Affected examples: ${finding.affected.slice(0, 12).map(mdCell).join(', ')}`, '');
      }
    }
  }

  lines.push(
    '## Automated Checks',
    '',
    ...audit.automatedChecks.map((check) => `- ${check}`),
    '',
    '## Acceptance Rule',
    '',
    'No page should feel like it belongs to a different application. The engine enforces that by keeping navigation single-source, route paths canonical, responsive coverage visible, drawers/dialogs accessible, and high-volume hubs explicitly reviewed.'
  );

  return lines.join('\n');
}
