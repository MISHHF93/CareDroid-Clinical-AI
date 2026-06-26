import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKEND_HTTP_ROUTES, findBackendRoute } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { PLATFORM_DASHBOARDS } from './platformOperatingSystem';
import { PLATFORM_SYSTEM_CAPABILITIES, PLATFORM_SYSTEM_CAPABILITY_BY_ID } from './platformSystems';
import { getCanonicalToolInventory } from './toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

export const PLATFORM_CAPABILITY_MATRIX_STATUSES = Object.freeze({
  ACTIVE: 'Active',
  DEMO: 'Demo',
  CONTRACTED: 'Contracted',
  FRONTEND_ACTIVE: 'Frontend Active',
  PLANNED: 'Planned',
});

const DEFAULT_PLATFORM_TEST_COVERAGE = Object.freeze([
  'src/data/platformSystemsExpansionPlan.test.js',
  'src/data/backendFrontendExposure.test.js',
  'backend/src/modules/platform-systems/platform-systems.controller.spec.ts',
]);

const DASHBOARD_TEST_COVERAGE = Object.freeze([
  'src/data/platformOperatingSystem.test.js',
  'src/test/routePagesSmoke.test.jsx',
  'src/routing/routeHealth.test.js',
]);

const TEST_COVERAGE_PATH_ALIASES = Object.freeze({
  'platformSystemsExpansionPlan.test.js': 'src/data/platformSystemsExpansionPlan.test.js',
  'routePagesSmoke.test.jsx': 'src/test/routePagesSmoke.test.jsx',
  'App.permissions.test.jsx': 'src/App.permissions.test.jsx',
  'platformResponsive.test.jsx': 'src/styles/responsiveUx.test.js',
});

const FOUNDATION_CAPABILITIES = Object.freeze([
  {
    id: 'dashboard',
    capability: 'CareDroid Command Center',
    frontendRoute: '/dashboard',
    inventoryEntry: 'dashboard',
    aiLaunchAlias: 'open command center',
    backendService: 'PersonalizationService',
    apiEndpoint: 'GET /api/personalization/me/recommendations',
    testCoverage: ['src/pages/CommandDashboard.test.jsx', 'src/data/commandDashboardModel.test.js'],
  },
  {
    id: 'assistant',
    capability: 'AI Assistant Launcher',
    frontendRoute: '/assistant',
    inventoryEntry: 'assistant',
    aiLaunchAlias: 'ask caredroid',
    backendService: 'ChatService',
    apiEndpoint: 'POST /api/chat/message',
    testCoverage: ['src/components/ChatInterface.nlu.test.jsx', 'src/utils/chatCapabilitySuggestions.test.js'],
  },
  {
    id: 'hospital-map',
    capability: 'Hospital Map',
    frontendRoute: '/hospital-map',
    inventoryEntry: 'hospital-map',
    aiLaunchAlias: 'show map',
    backendService: 'FloorService / RoomService / DeviceLocationService',
    apiEndpoint: 'GET /api/hospital-map/floors',
    testCoverage: ['src/pages/HospitalMapDashboard.test.jsx', 'src/services/hospitalMapService.test.js'],
    status: PLATFORM_CAPABILITY_MATRIX_STATUSES.DEMO,
  },
  {
    id: 'medical-iot',
    capability: 'Medical IoT',
    frontendRoute: '/medical-iot',
    inventoryEntry: 'medical-iot-dashboard',
    aiLaunchAlias: 'show telemetry',
    backendService: 'TelemetryService / DeviceRegistryService / AlertService',
    apiEndpoint: 'GET /api/telemetry/live',
    testCoverage: ['src/pages/MedicalIotDashboard.test.jsx', 'src/services/medicalIotService.test.js'],
    status: PLATFORM_CAPABILITY_MATRIX_STATUSES.DEMO,
  },
  {
    id: 'devices',
    capability: 'Device Fleet',
    frontendRoute: '/devices',
    inventoryEntry: 'device-fleet-management',
    aiLaunchAlias: 'show devices',
    backendService: 'DeviceRegistryService',
    apiEndpoint: 'GET /api/devices/live',
    testCoverage: ['src/pages/DeviceFleetManagement.test.jsx', 'src/services/medicalIotService.test.js'],
  },
  {
    id: 'live-tracking-map',
    capability: 'Live Tracking Map',
    frontendRoute: '/live-map',
    inventoryEntry: 'live-tracking-map',
    aiLaunchAlias: 'show live tracking',
    backendService: 'FleetService / VehicleTrackingService',
    apiEndpoint: 'GET /api/fleet/vehicles/live',
    testCoverage: ['src/pages/LiveTrackingMaps.test.jsx', 'src/services/liveTrackingApi.test.js'],
    status: PLATFORM_CAPABILITY_MATRIX_STATUSES.DEMO,
  },
  {
    id: 'fleet-map',
    capability: 'Fleet Map',
    frontendRoute: '/fleet/map',
    inventoryEntry: 'fleet-live-map',
    aiLaunchAlias: 'show fleet map',
    backendService: 'FleetService / VehicleTrackingService',
    apiEndpoint: 'GET /api/fleet/vehicles/live',
    testCoverage: ['src/pages/fleet/FleetLiveMap.test.jsx', 'src/services/liveTrackingApi.test.js'],
    status: PLATFORM_CAPABILITY_MATRIX_STATUSES.DEMO,
  },
  {
    id: 'fleet-command',
    capability: 'Fleet Command',
    frontendRoute: '/fleet/command',
    inventoryEntry: 'fleet-command',
    aiLaunchAlias: 'show fleet command',
    backendService: 'FleetService',
    apiEndpoint: 'GET /api/fleet/snapshot',
    testCoverage: ['src/pages/fleet/FleetDashboard.test.jsx', 'src/data/fleetCommandWiring.test.js'],
  },
  {
    id: 'predictive-maintenance',
    capability: 'Predictive Maintenance',
    frontendRoute: '/fleet/predictive-maintenance',
    inventoryEntry: 'predictive-maintenance',
    aiLaunchAlias: 'show maintenance risk',
    backendService: 'FleetService',
    apiEndpoint: 'GET /api/fleet/alerts',
    testCoverage: ['src/pages/fleet/PredictiveMaintenance.test.jsx', 'src/data/predictiveMaintenanceWiring.test.js'],
  },
  {
    id: 'route-optimizer',
    capability: 'Route Optimizer',
    frontendRoute: '/fleet/route-optimizer',
    inventoryEntry: 'route-optimizer',
    aiLaunchAlias: 'optimize route',
    backendService: 'VehicleTrackingService',
    apiEndpoint: 'GET /api/fleet/routes/active',
    testCoverage: ['src/pages/fleet/RouteOptimizer.test.jsx', 'src/services/routeOptimizationService.test.js'],
  },
  {
    id: 'digital-twin',
    capability: 'Hospital Digital Twin',
    frontendRoute: '/digital-twin',
    inventoryEntry: 'digital-twin',
    aiLaunchAlias: 'show digital twin',
    backendService: 'PlatformSystemsService',
    apiEndpoint: 'GET /api/platform-systems/capabilities/:capabilityId',
    testCoverage: DASHBOARD_TEST_COVERAGE,
  },
  {
    id: 'timeline',
    capability: 'Clinical Timeline',
    frontendRoute: '/timeline',
    inventoryEntry: 'timeline',
    aiLaunchAlias: 'show timeline',
    backendService: 'TimelineService / PlatformSystemsService',
    apiEndpoint: 'GET /api/patients/:patientId/timeline',
    testCoverage: ['backend/src/modules/clinical-intelligence/timeline.service.spec.ts', 'src/pages/PlatformOSPages.test.jsx'],
  },
  {
    id: 'workflows',
    capability: 'Workflow Builder',
    frontendRoute: '/workflows',
    inventoryEntry: 'workflow-builder',
    aiLaunchAlias: 'build workflow',
    backendService: 'ClinicalIntelligenceService',
    apiEndpoint: 'POST /api/clinical-intelligence/workflow-builder/generate',
    testCoverage: ['src/pages/PlatformOSPages.test.jsx', 'src/data/platformSystemsExpansionPlan.test.js'],
  },
  {
    id: 'search',
    capability: 'Global Search',
    frontendRoute: '/search',
    inventoryEntry: 'search',
    aiLaunchAlias: 'search everything',
    backendService: 'SearchService',
    apiEndpoint: 'GET /api/platform-systems/capabilities/:capabilityId',
    testCoverage: ['backend/src/modules/workspace-intelligence/search.service.spec.ts', 'src/pages/PlatformOSPages.test.jsx'],
  },
  {
    id: 'assets',
    capability: 'Asset Library',
    frontendRoute: '/assets',
    inventoryEntry: 'ai-artifacts',
    aiLaunchAlias: 'show assets',
    backendService: 'AssetRegistryService / ArtifactsService',
    apiEndpoint: 'GET /api/artifacts',
    testCoverage: ['backend/src/modules/artifacts/asset-registry.service.spec.ts', 'src/pages/Artifacts.test.jsx'],
  },
  {
    id: 'notifications',
    capability: 'Notification Center',
    frontendRoute: '/notifications',
    inventoryEntry: 'notifications',
    aiLaunchAlias: 'show notifications',
    backendService: 'NotificationService',
    apiEndpoint: 'GET /api/notifications',
    testCoverage: ['src/test/routePagesSmoke.test.jsx', 'src/test/NotificationService.test.js'],
  },
  {
    id: 'workspaces',
    capability: 'Workspace Index',
    frontendRoute: '/workspaces',
    inventoryEntry: 'workspaces',
    aiLaunchAlias: 'show workspaces',
    backendService: 'WorkspacesService',
    apiEndpoint: 'GET /api/workspaces',
    testCoverage: ['src/pages/WorkspaceHome.test.jsx', 'src/data/workspaceArchitecture.test.js'],
  },
  {
    id: 'system-health',
    capability: 'System Health',
    frontendRoute: '/system-health',
    inventoryEntry: 'system-health',
    aiLaunchAlias: 'show system health',
    backendService: 'ObservabilityService',
    apiEndpoint: 'GET /api/system-health',
    testCoverage: ['src/services/platformGovernanceApi.test.js', 'src/test/routePagesSmoke.test.jsx'],
  },
  {
    id: 'artifacts',
    capability: 'CareDroid Artifacts',
    frontendRoute: '/artifacts',
    inventoryEntry: 'ai-artifacts',
    aiLaunchAlias: 'show artifacts',
    backendService: 'ArtifactsService',
    apiEndpoint: 'GET /api/artifacts',
    testCoverage: ['src/pages/Artifacts.test.jsx', 'backend/src/modules/artifacts/asset-registry.service.spec.ts'],
  },
  {
    id: 'memory',
    capability: 'AI Memory',
    frontendRoute: '/ai-memory',
    inventoryEntry: 'ai-memory',
    aiLaunchAlias: 'show memory',
    backendService: 'ShortMemoryService / LongMemoryService / ClinicalMemoryService',
    apiEndpoint: 'GET /api/memory/dashboard',
    testCoverage: ['src/pages/MemoryDashboard.test.jsx', 'src/data/fullPlatformConsolidation.test.js'],
  },
  {
    id: 'training',
    capability: 'Training Dashboard',
    frontendRoute: '/training',
    inventoryEntry: 'ai-training',
    aiLaunchAlias: 'show training',
    backendService: 'TrainingService',
    apiEndpoint: 'GET /api/training/dashboard',
    testCoverage: ['src/pages/TrainingDashboard.test.jsx', 'src/data/fullPlatformConsolidation.test.js'],
  },
  {
    id: 'ai-evaluation',
    capability: 'AI Evaluation',
    frontendRoute: '/ai-evaluation',
    inventoryEntry: 'ai-evaluation',
    aiLaunchAlias: 'show evaluations',
    backendService: 'EvaluationService',
    apiEndpoint: 'GET /api/evaluation/dashboard',
    testCoverage: ['src/pages/AiEvaluationDashboard.test.jsx', 'src/services/evaluationApi.test.js'],
  },
  {
    id: 'ai-command-center',
    capability: 'AI Command Center',
    frontendRoute: '/ai-command-center',
    inventoryEntry: 'ai-command-center',
    aiLaunchAlias: 'show ai command center',
    backendService: 'RoutingOptimizerService',
    apiEndpoint: 'GET /api/cost-optimizer/dashboard',
    testCoverage: ['src/pages/AiCommandCenterDashboard.test.jsx', 'src/services/aiCommandCenterApi.test.js'],
  },
  {
    id: 'costs',
    capability: 'Cost Analytics',
    frontendRoute: '/costs',
    inventoryEntry: 'ai-cost-optimization',
    aiLaunchAlias: 'show costs',
    backendService: 'CostPredictionService / RoutingOptimizerService',
    apiEndpoint: 'GET /api/cost-optimizer/dashboard',
    testCoverage: ['src/pages/AiCommandCenterDashboard.test.jsx', 'src/services/aiCommandCenterApi.test.js'],
  },
]);

const BACKEND_SERVICE_BY_ENDPOINT_PREFIX = Object.freeze([
  ['/api/hospital-map', 'FloorService / RoomService / DeviceLocationService'],
  ['/api/telemetry', 'TelemetryService'],
  ['/api/medical-iot', 'TelemetryService'],
  ['/api/devices', 'DeviceRegistryService'],
  ['/api/fleet/routes', 'VehicleTrackingService'],
  ['/api/fleet/vehicles', 'LiveTrackingService'],
  ['/api/fleet', 'FleetService'],
  ['/api/artifacts', 'ArtifactsService / AssetRegistryService'],
  ['/api/memory', 'ShortMemoryService / LongMemoryService / ClinicalMemoryService'],
  ['/api/training', 'TrainingService'],
  ['/api/evaluation', 'EvaluationService'],
  ['/api/cost-optimizer', 'CostPredictionService / RoutingOptimizerService'],
  ['/api/clinical-intelligence', 'ClinicalIntelligenceService'],
  ['/api/platform-governance', 'PlatformGovernanceService'],
  ['/api/platform-systems', 'PlatformSystemsService'],
  ['/api/integrations', 'PlatformSystemsService'],
  ['/api/patients', 'PlatformSystemsService'],
  ['/api/governance', 'PlatformSystemsService'],
  ['/api/documentation', 'PlatformSystemsService'],
  ['/api/operations', 'PlatformSystemsService'],
  ['/api/review', 'PlatformSystemsService'],
  ['/api/privacy', 'PlatformGovernanceService / PrivacyService'],
  ['/api/security', 'LlmSecurityService'],
  ['/api/ai-governance', 'GovernanceService'],
  ['/api/system-health', 'ObservabilityService'],
  ['/api/workspaces', 'WorkspacesService'],
  ['/api/notifications', 'NotificationService'],
  ['/api/chat', 'ChatService'],
]);

const FOUNDATION_BY_ID = new Map(FOUNDATION_CAPABILITIES.map((row) => [row.id, row]));

function endpointParts(apiEndpoint) {
  const [method, ...pathParts] = String(apiEndpoint || '').split(' ');
  return { method, path: pathParts.join(' ') };
}

function endpointExists(apiEndpoint) {
  const { method, path } = endpointParts(apiEndpoint);
  return Boolean(method && path && findBackendRoute(method, path));
}

function frontendCallExists(apiEndpoint) {
  const { method, path } = endpointParts(apiEndpoint);
  return FRONTEND_API_CALLS.some((call) => call.method === method && call.path === path);
}

function statusFor(apiEndpoint) {
  if (endpointExists(apiEndpoint)) return PLATFORM_CAPABILITY_MATRIX_STATUSES.ACTIVE;
  return PLATFORM_CAPABILITY_MATRIX_STATUSES.CONTRACTED;
}

function backendServiceFor(endpoint) {
  const path = endpointParts(endpoint).path;
  const match = BACKEND_SERVICE_BY_ENDPOINT_PREFIX.find(([prefix]) => path.startsWith(prefix));
  if (match) return match[1];
  const backendRoute = BACKEND_HTTP_ROUTES.find((route) => route.path === path);
  return backendRoute?.controller?.replace('Controller', 'Service') || 'PlatformSystemsService';
}

function normalizeTestCoverage(testCoverage) {
  return [
    ...new Set(
      [...(testCoverage || DEFAULT_PLATFORM_TEST_COVERAGE)].map(
        (testPath) => TEST_COVERAGE_PATH_ALIASES[testPath] || testPath
      )
    ),
  ];
}

function platformSystemToMatrixRow(capability) {
  const endpoint = `${capability.method || 'GET'} ${capability.endpoint}`;
  const override = FOUNDATION_BY_ID.get(capability.id);
  return {
    id: capability.id,
    capability: capability.name,
    frontendRoute: capability.route,
    inventoryEntry: override?.inventoryEntry || capability.id,
    aiLaunchAlias: override?.aiLaunchAlias || capability.chatSeed || `open ${capability.name.toLowerCase()}`,
    backendService: override?.backendService || backendServiceFor(endpoint),
    apiEndpoint: endpoint,
    testCoverage: normalizeTestCoverage(override?.testCoverage || capability.testCoverage),
    status: statusFor(endpoint),
    frontendApiCall: frontendCallExists(endpoint),
    source: 'platform-system-capability',
  };
}

function foundationToMatrixRow(row) {
  return {
    ...row,
    testCoverage: normalizeTestCoverage(row.testCoverage),
    status: row.status || statusFor(row.apiEndpoint),
    frontendApiCall: frontendCallExists(row.apiEndpoint),
    source: 'platform-foundation',
  };
}

export function buildPlatformCapabilityMatrix() {
  const rowsById = new Map(PLATFORM_SYSTEM_CAPABILITIES.map((capability) => [capability.id, platformSystemToMatrixRow(capability)]));
  for (const row of FOUNDATION_CAPABILITIES) {
    rowsById.set(row.id, foundationToMatrixRow(row));
  }
  for (const dashboard of PLATFORM_DASHBOARDS) {
    if (rowsById.has(dashboard.id)) continue;
    rowsById.set(
      dashboard.id,
      foundationToMatrixRow({
        id: dashboard.id,
        capability: dashboard.label,
        frontendRoute: dashboard.path,
        inventoryEntry: dashboard.id,
        aiLaunchAlias: `open ${dashboard.label.toLowerCase()}`,
        backendService: 'PlatformSystemsService',
        apiEndpoint: 'GET /api/platform-systems/capabilities/:capabilityId',
        testCoverage: DASHBOARD_TEST_COVERAGE,
      })
    );
  }
  return [...rowsById.values()].sort((a, b) => a.capability.localeCompare(b.capability));
}

export const platformCapabilityMatrix = Object.freeze(buildPlatformCapabilityMatrix());

export function listMissingPlatformCapabilityTraceability(rows = platformCapabilityMatrix) {
  const inventoryIds = new Set(getCanonicalToolInventory().map((record) => record.id));
  const platformCapabilityIds = new Set(PLATFORM_SYSTEM_CAPABILITIES.map((capability) => capability.id));
  const dashboardIds = new Set(PLATFORM_DASHBOARDS.map((dashboard) => dashboard.id));

  return rows.flatMap((row) => {
    const missing = [] as any[];
    if (!row.capability) missing.push('capability');
    if (!row.frontendRoute) missing.push('frontendRoute');
    if (!row.inventoryEntry) missing.push('inventoryEntry');
    if (!row.aiLaunchAlias) missing.push('aiLaunchAlias');
    if (!row.backendService) missing.push('backendService');
    if (!row.apiEndpoint) missing.push('apiEndpoint');
    if (!row.testCoverage?.length) missing.push('testCoverage');
    if (!row.status) missing.push('status');
    if (!endpointExists(row.apiEndpoint)) missing.push('registeredBackendRoute');
    if (
      !inventoryIds.has(row.inventoryEntry) &&
      !platformCapabilityIds.has(row.inventoryEntry) &&
      !dashboardIds.has(row.inventoryEntry) &&
      !['dashboard', 'assistant', 'timeline', 'search', 'notifications', 'workspaces', 'system-health', 'workflow-builder', 'digital-twin'].includes(row.inventoryEntry)
    ) {
      missing.push('knownInventoryEntry');
    }
    return missing.length ? [{ id: row.id, capability: row.capability, missing }] : [];
  });
}

function mdCell(value) {
  if (Array.isArray(value)) return value.map((item) => `\`${item}\``).join('<br>');
  return String(value ?? '').replace(/\|/g, '\\|');
}

export function formatPlatformCapabilityMatrixDocument(rows = platformCapabilityMatrix) {
  const missing = listMissingPlatformCapabilityTraceability(rows);
  const active = rows.filter((row) => row.status === PLATFORM_CAPABILITY_MATRIX_STATUSES.ACTIVE).length;
  const demo = rows.filter((row) => (row.status as any) === PLATFORM_CAPABILITY_MATRIX_STATUSES.DEMO).length;
  const lines = [
    '# Platform Capability Matrix',
    '',
    'This matrix is generated from `src/data/platformCapabilityMatrix.js`, which is the source of truth for end-to-end platform feature traceability.',
    '',
    '## Summary',
    '',
    `- Total capabilities: ${rows.length}`,
    `- Active capabilities: ${active}`,
    `- Demo-labeled operational capabilities: ${demo}`,
    `- Traceability gaps: ${missing.length}`,
    '',
    '## Matrix',
    '',
    '| Capability | Frontend Route | Inventory Entry | AI Launch Alias | Backend Service | API Endpoint | Test Coverage | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (row) =>
        `| ${mdCell(row.capability)} | \`${mdCell(row.frontendRoute)}\` | \`${mdCell(row.inventoryEntry)}\` | "${mdCell(row.aiLaunchAlias)}" | ${mdCell(row.backendService)} | \`${mdCell(row.apiEndpoint)}\` | ${mdCell(row.testCoverage)} | ${mdCell(row.status)} |`
    ),
    '',
    '## Acceptance Gates',
    '',
    `- Every row has capability, route, inventory entry, AI alias, backend service, endpoint, tests, and status: ${missing.length === 0 ? 'pass' : 'fail'}`,
    `- Every API endpoint resolves to ` + '`BACKEND_HTTP_ROUTES`: ' + `${missing.every((item) => !item.missing.includes('registeredBackendRoute')) ? 'pass' : 'fail'}`,
    `- Every platform dashboard is represented: ${PLATFORM_DASHBOARDS.every((dashboard) => rows.some((row) => row.id === dashboard.id)) ? 'pass' : 'fail'}`,
    `- Every platform system capability is represented: ${PLATFORM_SYSTEM_CAPABILITIES.every((capability) => rows.some((row) => row.id === capability.id || row.inventoryEntry === capability.id)) ? 'pass' : 'fail'}`,
    '',
    '## Source Inputs',
    '',
    '- `src/data/platformOperatingSystem.js` for platform dashboards and workspace surfaces.',
    '- `src/data/platformSystems.js` for platform system capability contracts.',
    '- `src/data/toolInventory.js` for inventory entries, routes, aliases, endpoints, and lifecycle status.',
    '- `src/data/backendHttpRouteInventory.js` for backend HTTP endpoint registration.',
    '- `src/data/frontendApiCallsInventory.js` for client API call coverage.',
    '- Focused frontend/backend test files listed per row.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

export function platformCapabilityTestFilesExist(rows = platformCapabilityMatrix) {
  return rows.flatMap((row) =>
    row.testCoverage
      .filter((testPath) => !existsSync(join(repoRoot, testPath)))
      .map((testPath) => ({ id: row.id, capability: row.capability, testPath }))
  );
}

export function getPlatformCapabilityById(id) {
  return platformCapabilityMatrix.find((row) => row.id === id || row.inventoryEntry === id || PLATFORM_SYSTEM_CAPABILITY_BY_ID[id]?.id === row.id);
}
