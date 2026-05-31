import { CANONICAL_ROUTES } from '../config/routes.config';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { getCanonicalToolInventory, TOOL_EXECUTOR_STATUS } from './toolInventory';

export const DEPENDENCY_ISSUE_TYPES = Object.freeze({
  ORPHAN_UI: 'orphan-ui',
  ORPHAN_BACKEND: 'orphan-backend',
  BROKEN_DEPENDENCY: 'broken-dependency',
  DUPLICATE_DEPENDENCY: 'duplicate-dependency',
});

const ROUTE_LABELS = Object.freeze({
  dashboard: 'Dashboard',
  discover: 'Capability Discovery',
  automation: 'Workflow Automation',
  dependencyMap: 'Dependency Map',
  assistant: 'Assistant',
  tools: 'Tools',
  operations: 'Operations',
  operationsCenter: 'Digital Operations Center',
  workflows: 'Workflows',
});

function keyFor(method, path) {
  return `${method} ${path}`;
}

function serviceNameFor(controller) {
  if (!controller || controller === '—') return '—';
  return controller.replace(/Controller$/, 'Service');
}

function backendRouteMatches(route, method, path) {
  if (route.method !== method) return false;
  if (route.path === path) return true;
  const pattern = new RegExp(`^${route.path.replace(/:[^/]+/g, '[^/]+')}$`);
  return pattern.test(path);
}

function findBackendRoute(backendRoutes, method, path) {
  return backendRoutes.find((route) => backendRouteMatches(route, method, path)) || null;
}

function findFrontendCall(frontendApiCalls, path) {
  return frontendApiCalls.find((call) => call.path === path) || null;
}

function endpointFromRow(row) {
  if (!row?.apiEndpoint || row.apiEndpoint === '—') return null;
  const [method, ...pathParts] = row.apiEndpoint.split(' ');
  if (!method || !pathParts.length) return null;
  return { method, path: pathParts.join(' ') };
}

function frontendRouteFor(row) {
  return row.frontendRoute && row.frontendRoute !== '—' ? row.frontendRoute : null;
}

function makeUiDependency(row, backendByKey) {
  const endpoint = endpointFromRow(row);
  const backend = endpoint ? backendByKey.get(keyFor(endpoint.method, endpoint.path)) : null;

  return {
    id: `ui-${row.canonicalId}`,
    kind: 'ui',
    frontendRoute: frontendRouteFor(row),
    inventoryEntry: row.canonicalInventoryId || row.registryEntry || row.canonicalId,
    displayName: row.displayName,
    apiClient: row.frontendApiClient || '—',
    backendEndpoint: endpoint ? keyFor(endpoint.method, endpoint.path) : '—',
    backendController: backend?.controller || '—',
    service: serviceNameFor(backend?.controller),
    executor:
      row.backendExecutor === 'yes'
        ? row.orchestratorToolId || 'registered executor'
        : row.backendExecutor === 'n/a'
          ? 'n/a'
          : '—',
    status: row.status,
    source: row.kind,
  };
}

function makeInventoryDependency(record, backendRoutes, frontendApiCalls) {
  const frontendCall = record.endpoint ? findFrontendCall(frontendApiCalls, record.endpoint) : null;
  const method = frontendCall?.method || (record.endpoint?.includes('/execute') ? 'POST' : 'GET');
  const backend = record.endpoint ? findBackendRoute(backendRoutes, method, record.endpoint) : null;

  return {
    id: `inventory-${record.id}`,
    kind: 'inventory',
    frontendRoute: record.route || record.navigationPath || null,
    inventoryEntry: record.id,
    displayName: record.label || record.id,
    apiClient: record.apiClient || '—',
    backendEndpoint: record.endpoint ? keyFor(method, record.endpoint) : '—',
    backendController: backend?.controller || '—',
    service: serviceNameFor(backend?.controller),
    executor:
      record.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
        ? record.orchestratorToolId || 'registered executor'
        : record.executorStatus === TOOL_EXECUTOR_STATUS.PLATFORM
          ? 'platform capability'
          : '—',
    status: record.status,
    source: record.sourceKind || 'inventory',
  };
}

function buildRouteNodes(recordsOrRows) {
  const routeCounts = recordsOrRows.reduce((acc, item) => {
    const route = item.route || frontendRouteFor(item);
    if (!route) return acc;
    acc.set(route, (acc.get(route) || 0) + 1);
    return acc;
  }, new Map());

  return Object.entries(CANONICAL_ROUTES).map(([id, path]) => ({
    id,
    label: ROUTE_LABELS[id] || id.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
    path,
    inventoryLinks: routeCounts.get(path) || 0,
  }));
}

function detectDuplicateDependencies(dependencies) {
  const byRouteInventory = new Map();
  const byEndpointClient = new Map();

  dependencies.forEach((dependency) => {
    const routeKey = `${dependency.frontendRoute}|${dependency.inventoryEntry}`;
    if (dependency.frontendRoute) {
      byRouteInventory.set(routeKey, [...(byRouteInventory.get(routeKey) || []), dependency]);
    }
    if (dependency.backendEndpoint !== '—') {
      const endpointKey = `${dependency.backendEndpoint}|${dependency.apiClient}`;
      byEndpointClient.set(endpointKey, [...(byEndpointClient.get(endpointKey) || []), dependency]);
    }
  });

  return [...byRouteInventory, ...byEndpointClient]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      id: `duplicate-${key}`,
      type: DEPENDENCY_ISSUE_TYPES.DUPLICATE_DEPENDENCY,
      severity: 'medium',
      title: 'Duplicate dependency',
      detail: `${items.length} dependency rows share ${key}.`,
      relatedIds: items.map((item) => item.id),
    }));
}

export function detectDependencyIssues({
  dependencies,
  routeNodes,
  frontendApiCalls = FRONTEND_API_CALLS,
  backendRoutes = BACKEND_HTTP_ROUTES,
} = {}) {
  const backendKeys = new Set(backendRoutes.map((route) => keyFor(route.method, route.path)));
  const frontendKeys = new Set(frontendApiCalls.map((call) => keyFor(call.method, call.path)));
  const contractEndpointKeys = new Set(
    dependencies
      .map((dependency) => dependency.backendEndpoint)
      .filter((endpoint) => endpoint && endpoint !== '—')
  );

  const orphanUi = routeNodes
    .filter((route) => route.inventoryLinks === 0)
    .map((route) => ({
      id: `orphan-ui-${route.id}`,
      type: DEPENDENCY_ISSUE_TYPES.ORPHAN_UI,
      severity: route.path === CANONICAL_ROUTES.dependencyMap ? 'low' : 'medium',
      title: 'Orphan UI',
      detail: `${route.path} has no inventory dependency row in the contract matrix.`,
      route: route.path,
    }));

  const orphanBackend = backendRoutes
    .filter((route) => {
      const key = keyFor(route.method, route.path);
      return !frontendKeys.has(key) && !contractEndpointKeys.has(key);
    })
    .map((route) => ({
      id: `orphan-backend-${route.method}-${route.path}`,
      type: DEPENDENCY_ISSUE_TYPES.ORPHAN_BACKEND,
      severity: 'low',
      title: 'Orphan backend',
      detail: `${route.method} ${route.path} is exposed by ${route.controller} but is not referenced by the frontend API or tool contract inventories.`,
      endpoint: keyFor(route.method, route.path),
    }));

  const brokenFromApiCalls = frontendApiCalls
    .filter((call) => !backendKeys.has(keyFor(call.method, call.path)))
    .map((call) => ({
      id: `broken-api-${call.id}`,
      type: DEPENDENCY_ISSUE_TYPES.BROKEN_DEPENDENCY,
      severity: call.capability ? 'medium' : 'high',
      title: 'Broken dependency',
      detail: `${call.client} calls ${call.method} ${call.path}, but that endpoint is not in the backend route inventory.`,
      endpoint: keyFor(call.method, call.path),
    }));

  const brokenFromContract = dependencies
    .filter((dependency) => dependency.status === 'broken')
    .map((dependency) => ({
      id: `broken-contract-${dependency.id}`,
      type: DEPENDENCY_ISSUE_TYPES.BROKEN_DEPENDENCY,
      severity: 'high',
      title: 'Broken contract dependency',
      detail: `${dependency.displayName} is marked broken in the backend/frontend contract matrix.`,
      relatedIds: [dependency.id],
    }));

  return [
    ...orphanUi,
    ...orphanBackend,
    ...brokenFromApiCalls,
    ...brokenFromContract,
    ...detectDuplicateDependencies(dependencies),
  ];
}

export function buildDependencyMap({
  contractRows = null,
  inventoryRecords = getCanonicalToolInventory(),
  backendRoutes = BACKEND_HTTP_ROUTES,
  frontendApiCalls = FRONTEND_API_CALLS,
} = {}) {
  const backendByKey = new Map(backendRoutes.map((route) => [keyFor(route.method, route.path), route]));
  const dependencies = contractRows
    ? contractRows.map((row) => makeUiDependency(row, backendByKey))
    : inventoryRecords.map((record) => makeInventoryDependency(record, backendRoutes, frontendApiCalls));
  const routeNodes = buildRouteNodes(contractRows || inventoryRecords);
  const issues = detectDependencyIssues({ dependencies, routeNodes, frontendApiCalls, backendRoutes });
  const issueCounts = Object.values(DEPENDENCY_ISSUE_TYPES).reduce(
    (acc, type) => ({ ...acc, [type]: issues.filter((issue) => issue.type === type).length }),
    {}
  );

  return {
    routeNodes,
    dependencies,
    issues,
    issueCounts,
    summary: {
      routes: routeNodes.length,
      dependencies: dependencies.length,
      frontendApiCalls: frontendApiCalls.length,
      backendEndpoints: backendRoutes.length,
      services: new Set(backendRoutes.map((route) => serviceNameFor(route.controller))).size,
      executors: dependencies.filter((dependency) => dependency.executor !== '—' && dependency.executor !== 'n/a').length,
      issues: issues.length,
    },
  };
}
