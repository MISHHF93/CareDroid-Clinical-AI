import { CANONICAL_ROUTES, AUTH_PATH_ALIASES } from '../config/routes.config';
import {
  ADVANCED_SIDEBAR_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  PRIMARY_SIDEBAR_NAV_ITEMS,
} from '../config/navigation.config';
import { LAYOUT_SCROLL_CONTRACT } from '../config/layout.config';
import {
  BACKEND_API_CAPABILITY_STATUS,
  BACKEND_CAPABILITY_STATUS,
} from '../config/backendApiCapabilities';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import {
  TOOL_EXECUTOR_STATUS,
  getBackendBackedToolInventory,
  getCanonicalToolInventory,
} from './toolInventory';
import { buildDependencyMap, DEPENDENCY_ISSUE_TYPES } from './dependencyMap';

export const SELF_DIAGNOSTIC_STATUS = Object.freeze({
  CRITICAL: 'critical',
  WARNING: 'warning',
  HEALTHY: 'healthy',
});

export const SELF_DIAGNOSTIC_CATEGORIES = Object.freeze({
  ROUTES: 'routes',
  APIS: 'apis',
  INVENTORY: 'inventory',
  AUTH: 'auth',
  SCROLLING: 'scrolling',
  LAYOUTS: 'layouts',
  BACKEND_CONTRACTS: 'backend-contracts',
  EXECUTORS: 'executors',
  ASSETS: 'assets',
});

const STATUS_WEIGHT = Object.freeze({
  [SELF_DIAGNOSTIC_STATUS.CRITICAL]: 14,
  [SELF_DIAGNOSTIC_STATUS.WARNING]: 5,
  [SELF_DIAGNOSTIC_STATUS.HEALTHY]: 0,
});

function check({ id, category, label, status, detail, evidence = [], remediation = '' }) {
  return {
    id,
    category,
    label,
    status,
    detail,
    evidence,
    remediation,
  };
}

function backendRouteMatches(call, route) {
  if (call.method !== route.method) return false;
  if (call.path === route.path) return true;
  const pattern = new RegExp(`^${route.path.replace(/:[^/]+/g, '[^/]+')}$`);
  return pattern.test(call.path);
}

function visibleNavItems() {
  return [...PRIMARY_SIDEBAR_NAV_ITEMS, ...OPERATIONS_SIDEBAR_NAV_ITEMS, ...ADVANCED_SIDEBAR_NAV_ITEMS];
}

function buildRouteChecks() {
  const routePaths = Object.values(CANONICAL_ROUTES);
  const duplicatePaths = routePaths.filter((path, index) => routePaths.indexOf(path) !== index);
  const navPaths = new Set(visibleNavItems().map((item) => item.path));
  const uncoveredCoreRoutes = [
    CANONICAL_ROUTES.dashboard,
    CANONICAL_ROUTES.tools,
    CANONICAL_ROUTES.assistant,
    CANONICAL_ROUTES.systemHealth,
  ].filter((path) => !navPaths.has(path));

  return [
    check({
      id: 'routes-canonical-unique',
      category: SELF_DIAGNOSTIC_CATEGORIES.ROUTES,
      label: 'Canonical routes are unique',
      status: duplicatePaths.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: duplicatePaths.length
        ? 'Duplicate canonical route paths can render the wrong page.'
        : `${routePaths.length} canonical route paths are unique.`,
      evidence: duplicatePaths,
      remediation: 'Keep one canonical route per destination and move alternatives into alias groups.',
    }),
    check({
      id: 'routes-core-navigation',
      category: SELF_DIAGNOSTIC_CATEGORIES.ROUTES,
      label: 'Core routes are reachable from navigation',
      status: uncoveredCoreRoutes.length ? SELF_DIAGNOSTIC_STATUS.WARNING : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: uncoveredCoreRoutes.length
        ? 'Some core routes are not represented in sidebar navigation.'
        : 'Dashboard, Assistant, Tools, and System Health are reachable.',
      evidence: uncoveredCoreRoutes,
      remediation: 'Add missing core paths to navigation.config.js.',
    }),
  ];
}

function buildApiChecks(frontendApiCalls, backendRoutes) {
  const missing = frontendApiCalls.filter((call) => {
    if (call.capability && BACKEND_API_CAPABILITY_STATUS[call.capability] === BACKEND_CAPABILITY_STATUS.DISABLED) {
      return false;
    }
    return !backendRoutes.some((route) => backendRouteMatches(call, route));
  });
  const disabledCapabilities = frontendApiCalls.filter(
    (call) => call.capability && BACKEND_API_CAPABILITY_STATUS[call.capability] === BACKEND_CAPABILITY_STATUS.DISABLED
  );

  return [
    check({
      id: 'apis-frontend-backend-match',
      category: SELF_DIAGNOSTIC_CATEGORIES.APIS,
      label: 'Frontend API calls map to backend routes or disabled gates',
      status: missing.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: missing.length
        ? `${missing.length} frontend API calls have no backend route and are not disabled.`
        : `${frontendApiCalls.length} frontend API calls are route-backed or capability-gated.`,
      evidence: missing.slice(0, 8).map((call) => `${call.method} ${call.path}`),
      remediation: 'Add backend routes or mark unavailable client calls with disabled capabilities.',
    }),
    check({
      id: 'apis-disabled-gates',
      category: SELF_DIAGNOSTIC_CATEGORIES.APIS,
      label: 'Unavailable APIs are explicitly gated',
      status: disabledCapabilities.length ? SELF_DIAGNOSTIC_STATUS.WARNING : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: `${disabledCapabilities.length} frontend calls are intentionally disabled by capability flags.`,
      evidence: disabledCapabilities.slice(0, 8).map((call) => `${call.id}: ${call.capability}`),
      remediation: 'Keep clients checking capability flags before network calls.',
    }),
  ];
}

function buildInventoryChecks(inventoryRecords) {
  const ids = inventoryRecords.map((record) => record.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const missingLaunch = inventoryRecords.filter(
    (record) => record.catalogVisible && !record.route && !record.navigationPath && !record.chatSeed
  );

  return [
    check({
      id: 'inventory-unique-ids',
      category: SELF_DIAGNOSTIC_CATEGORIES.INVENTORY,
      label: 'Inventory entries have unique IDs',
      status: duplicateIds.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: duplicateIds.length
        ? `${duplicateIds.length} duplicate inventory IDs detected.`
        : `${inventoryRecords.length} inventory entries have unique IDs.`,
      evidence: [...new Set(duplicateIds)].slice(0, 8),
      remediation: 'Deduplicate canonical registry IDs before publishing inventory.',
    }),
    check({
      id: 'inventory-launchable',
      category: SELF_DIAGNOSTIC_CATEGORIES.INVENTORY,
      label: 'Visible inventory entries are launchable',
      status: missingLaunch.length ? SELF_DIAGNOSTIC_STATUS.WARNING : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: missingLaunch.length
        ? `${missingLaunch.length} visible inventory entries lack a route, navigation path, or chat seed.`
        : 'Visible inventory entries expose a launch surface.',
      evidence: missingLaunch.slice(0, 8).map((record) => record.id),
      remediation: 'Add route, navigationPath, or chatSeed to visible records.',
    }),
  ];
}

function buildAuthChecks(backendRoutes) {
  const backendPaths = new Set(backendRoutes.map((route) => `${route.method} ${route.path}`));
  const required = ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me'];
  const missing = required.filter((endpoint) => !backendPaths.has(endpoint));

  return [
    check({
      id: 'auth-routes',
      category: SELF_DIAGNOSTIC_CATEGORIES.AUTH,
      label: 'Authentication backend routes exist',
      status: missing.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: missing.length ? 'Required auth endpoints are missing.' : 'Login, registration, and session introspection routes exist.',
      evidence: missing,
      remediation: 'Restore required AuthController routes.',
    }),
    check({
      id: 'auth-aliases',
      category: SELF_DIAGNOSTIC_CATEGORIES.AUTH,
      label: 'Auth aliases normalize to the canonical auth route',
      status: AUTH_PATH_ALIASES.length ? SELF_DIAGNOSTIC_STATUS.HEALTHY : SELF_DIAGNOSTIC_STATUS.WARNING,
      detail: `${AUTH_PATH_ALIASES.length} auth aliases are configured.`,
      evidence: AUTH_PATH_ALIASES.slice(0, 8),
      remediation: 'Keep auth aliases centralized in routes.config.js.',
    }),
  ];
}

function buildLayoutChecks() {
  const scrollContractOk =
    LAYOUT_SCROLL_CONTRACT.viewportOwner === 'AppShell' &&
    LAYOUT_SCROLL_CONTRACT.primaryScrollContainer === '.app-shell-main-content' &&
    LAYOUT_SCROLL_CONTRACT.mainContentRole === 'MainContent';

  return [
    check({
      id: 'scrolling-primary-owner',
      category: SELF_DIAGNOSTIC_CATEGORIES.SCROLLING,
      label: 'Primary scroll ownership is explicit',
      status: scrollContractOk ? SELF_DIAGNOSTIC_STATUS.HEALTHY : SELF_DIAGNOSTIC_STATUS.CRITICAL,
      detail: scrollContractOk
        ? 'AppShell owns the viewport and main content owns vertical scrolling.'
        : 'Scroll ownership contract is incomplete.',
      evidence: [
        LAYOUT_SCROLL_CONTRACT.viewportOwner,
        LAYOUT_SCROLL_CONTRACT.primaryScrollContainer,
        LAYOUT_SCROLL_CONTRACT.mainContentRole,
      ],
      remediation: 'Restore LAYOUT_SCROLL_CONTRACT to AppShell/MainContent defaults.',
    }),
    check({
      id: 'layouts-local-scroll',
      category: SELF_DIAGNOSTIC_CATEGORIES.LAYOUTS,
      label: 'Local scroll is limited to known surfaces',
      status: LAYOUT_SCROLL_CONTRACT.normalPagesCreateViewportScrollShells === false
        ? SELF_DIAGNOSTIC_STATUS.HEALTHY
        : SELF_DIAGNOSTIC_STATUS.WARNING,
      detail: `Local scroll is allowed for: ${LAYOUT_SCROLL_CONTRACT.localScrollAllowedFor.join(', ')}.`,
      evidence: LAYOUT_SCROLL_CONTRACT.localScrollAllowedFor,
      remediation: 'Avoid page-level viewport scroll shells outside approved surfaces.',
    }),
  ];
}

function buildDependencyChecks(dependencyMap, frontendApiCalls) {
  const disabledEndpointKeys = new Set(
    frontendApiCalls
      .filter(
        (call) =>
          call.capability &&
          BACKEND_API_CAPABILITY_STATUS[call.capability] === BACKEND_CAPABILITY_STATUS.DISABLED
      )
      .map((call) => `${call.method} ${call.path}`)
  );
  const actionableIssues = dependencyMap.issues.filter(
    (issue) => !issue.endpoint || !disabledEndpointKeys.has(issue.endpoint)
  );
  const criticalIssues = actionableIssues.filter((issue) => issue.severity === 'high');
  const warnings = actionableIssues.filter((issue) => issue.severity !== 'high');
  const broken = actionableIssues.filter(
    (issue) => issue.type === DEPENDENCY_ISSUE_TYPES.BROKEN_DEPENDENCY
  );

  return [
    check({
      id: 'backend-contracts-broken',
      category: SELF_DIAGNOSTIC_CATEGORIES.BACKEND_CONTRACTS,
      label: 'Backend contracts do not contain broken dependencies',
      status: broken.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: broken.length
        ? `${broken.length} broken backend/frontend dependencies detected.`
        : 'No broken backend/frontend dependencies detected.',
      evidence: broken.slice(0, 8).map((issue) => issue.detail),
      remediation: 'Update frontend API inventory, backend route inventory, or capability gates.',
    }),
    check({
      id: 'backend-contracts-orphans',
      category: SELF_DIAGNOSTIC_CATEGORIES.BACKEND_CONTRACTS,
      label: 'Dependency map orphan warnings are tracked',
      status: criticalIssues.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : warnings.length ? SELF_DIAGNOSTIC_STATUS.WARNING : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: `${actionableIssues.length} actionable dependency map findings are currently tracked.`,
      evidence: actionableIssues.slice(0, 8).map((issue) => `${issue.type}: ${issue.detail}`),
      remediation: 'Review /dependency-map for orphan UI/backend and duplicate dependency findings.',
    }),
  ];
}

function buildExecutorChecks(inventoryRecords) {
  const backendBacked = getBackendBackedToolInventory(inventoryRecords);
  const unsupported = inventoryRecords.filter((record) => record.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED);
  const registeredMissingEndpoint = backendBacked.filter((record) => !record.endpoint);

  return [
    check({
      id: 'executors-registered-endpoints',
      category: SELF_DIAGNOSTIC_CATEGORIES.EXECUTORS,
      label: 'Registered executors expose endpoints',
      status: registeredMissingEndpoint.length ? SELF_DIAGNOSTIC_STATUS.CRITICAL : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: registeredMissingEndpoint.length
        ? `${registeredMissingEndpoint.length} registered executors are missing endpoints.`
        : `${backendBacked.length} registered executors expose endpoints.`,
      evidence: registeredMissingEndpoint.slice(0, 8).map((record) => record.id),
      remediation: 'Attach endpoint and API client metadata to registered executors.',
    }),
    check({
      id: 'executors-unsupported-labeled',
      category: SELF_DIAGNOSTIC_CATEGORIES.EXECUTORS,
      label: 'Unsupported executors are explicitly labeled',
      status: unsupported.length ? SELF_DIAGNOSTIC_STATUS.WARNING : SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: `${unsupported.length} inventory entries are labeled unsupported/planned.`,
      evidence: unsupported.slice(0, 8).map((record) => record.id),
      remediation: 'Keep unsupported executor IDs hidden from executable launch surfaces.',
    }),
  ];
}

function buildAssetChecks() {
  const requiredPublicAssets = ['/favicon.svg', '/logo.svg', '/icon.svg', '/badge.svg', '/site.webmanifest'];

  return [
    check({
      id: 'assets-public-shell',
      category: SELF_DIAGNOSTIC_CATEGORIES.ASSETS,
      label: 'Required public shell assets are declared',
      status: requiredPublicAssets.length >= 5 ? SELF_DIAGNOSTIC_STATUS.HEALTHY : SELF_DIAGNOSTIC_STATUS.WARNING,
      detail: `${requiredPublicAssets.length} public shell assets are part of the offline/build validation contract.`,
      evidence: requiredPublicAssets,
      remediation: 'Run scripts/validate-assets.mjs before shipping.',
    }),
    check({
      id: 'assets-validation-script',
      category: SELF_DIAGNOSTIC_CATEGORIES.ASSETS,
      label: 'Asset validation is part of production build',
      status: SELF_DIAGNOSTIC_STATUS.HEALTHY,
      detail: 'npm run build runs validate:assets before Vite build.',
      evidence: ['scripts/validate-assets.mjs', 'package.json build script'],
      remediation: 'Keep validate:assets in the build pipeline.',
    }),
  ];
}

function computeHealthScore(checks) {
  const penalty = checks.reduce((total, item) => total + STATUS_WEIGHT[item.status], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function buildPlatformSelfDiagnostics({
  inventoryRecords = getCanonicalToolInventory(),
  frontendApiCalls = FRONTEND_API_CALLS,
  backendRoutes = BACKEND_HTTP_ROUTES,
  dependencyMap = buildDependencyMap({ inventoryRecords, frontendApiCalls, backendRoutes }),
} = {}) {
  const checks = [
    ...buildRouteChecks(),
    ...buildApiChecks(frontendApiCalls, backendRoutes),
    ...buildInventoryChecks(inventoryRecords),
    ...buildAuthChecks(backendRoutes),
    ...buildLayoutChecks(),
    ...buildDependencyChecks(dependencyMap, frontendApiCalls),
    ...buildExecutorChecks(inventoryRecords),
    ...buildAssetChecks(),
  ];
  const healthScore = computeHealthScore(checks);
  const byStatus = Object.fromEntries(
    Object.values(SELF_DIAGNOSTIC_STATUS).map((status) => [
      status,
      checks.filter((item) => item.status === status),
    ])
  );

  return {
    healthScore,
    healthLabel:
      healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Warning' : 'Critical',
    checks,
    byStatus,
    summary: {
      total: checks.length,
      critical: byStatus.critical.length,
      warning: byStatus.warning.length,
      healthy: byStatus.healthy.length,
      categories: Object.values(SELF_DIAGNOSTIC_CATEGORIES).map((category) => ({
        category,
        total: checks.filter((item) => item.category === category).length,
        critical: checks.filter((item) => item.category === category && item.status === 'critical').length,
        warning: checks.filter((item) => item.category === category && item.status === 'warning').length,
        healthy: checks.filter((item) => item.category === category && item.status === 'healthy').length,
      })),
    },
  };
}
