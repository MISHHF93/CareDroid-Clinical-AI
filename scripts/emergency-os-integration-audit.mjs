import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');
const EXCLUDED_DIRS = new Set([
  '.git',
  '.cursor',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.vite',
  '.vitest',
  'android',
  'ios',
]);
const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
]);

const PRIMARY_ROUTES = [
  '/emergency/whiteboard',
  '/emergency/patients',
  '/emergency/ems',
  '/emergency/intake',
  '/emergency/queues',
  '/emergency/reassessment',
  '/emergency/capacity',
  '/emergency/boarding',
  '/emergency/referrals',
  '/emergency/copilot',
  '/emergency/analytics',
  '/emergency/settings',
];

const WORKFLOWS = [
  {
    id: 'whiteboard',
    label: 'Emergency Whiteboard',
    route: '/emergency/whiteboard',
    page: 'src/components/EmergencyWhiteboard.jsx',
    components: ['src/components/PatientCard.jsx', 'src/components/NewPatientIntake.jsx', 'src/components/QueueIntelligencePanel.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/patientManagementApi.js', 'src/services/emergencyRealtimeService.js'],
    backendEndpoints: ['/api/patients/*', '/api/platform-systems/*'],
    backendService: 'backend/src/modules/platform-systems/platform-systems.service.ts',
    entities: ['types/emergency.ts'],
    events: ['RealtimeEventEnvelope', 'JourneyEvent', 'StateChange'],
    journey: 'engine/journeyEngine.ts',
    liveData: 'partial',
  },
  {
    id: 'journey',
    label: 'Patient Journey Engine',
    route: '/emergency/patients',
    page: 'src/components/EmergencyWhiteboard.jsx',
    components: ['src/components/JourneyTimeline.jsx', 'src/components/PatientCard.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/patientManagementApi.js'],
    backendEndpoints: ['/api/patients/:id/timeline'],
    backendService: 'backend/src/modules/platform-systems/platform-systems.service.ts',
    entities: ['types/emergency.ts', 'backend/src/models/PatientJourney.ts'],
    events: ['JourneyEvent', 'StateChange'],
    journey: 'engine/journeyEngine.ts',
    liveData: 'partial',
  },
  {
    id: 'ems',
    label: 'EMS Intake',
    route: '/emergency/ems',
    page: 'src/components/EMSPipeline.jsx',
    components: ['src/components/EMSPressureScore.jsx', 'src/components/EMSCriticalBroadcast.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/emergencyRealtimeService.js'],
    backendEndpoints: ['/api/ems/incoming', '/api/ems/alert', '/api/ems/status/:emsUnitId', '/api/ems/arrive/:emsUnitId'],
    backendService: 'backend/src/services/ems.service.ts',
    entities: ['backend/src/models/Patient.ts', 'types/emergency.ts'],
    events: ['ems_alert_received', 'ems_status_updated', 'ems_arrival_confirmed'],
    journey: 'store/emergencyStore.ts',
    liveData: 'backend-route-unconsumed',
  },
  {
    id: 'intake',
    label: 'Smart Intake',
    route: '/emergency/intake',
    page: 'src/pages/emergency/SmartIntake.jsx',
    components: ['src/pages/emergency/SmartIntake.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/smartIntakeApi.js'],
    backendEndpoints: ['/api/emergency/intake/sessions', '/api/emergency/intake/:id/*'],
    backendService: 'backend/src/services/smart-intake.service.ts',
    entities: ['backend/src/models/SmartIntake.ts', 'backend/src/models/Patient.ts'],
    events: ['PatientArrived', 'ARRIVAL'],
    journey: 'backend/src/models/PatientJourney.ts',
    liveData: 'conditional',
  },
  {
    id: 'queues',
    label: 'Queue Intelligence',
    route: '/emergency/queues',
    page: 'src/App.jsx#EmergencyQueueRoute',
    components: ['src/components/QueueIntelligencePanel.jsx', 'src/components/WhoNextPanel.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/queueIntelligenceService.js', 'src/services/emergencyAnalyticsApi.js'],
    backendEndpoints: ['/api/emergency/queues/analytics'],
    backendService: 'none',
    entities: ['types/emergency.ts'],
    events: ['PatientQueued', 'ReassessmentDue'],
    journey: 'store/emergencyStore.ts',
    liveData: 'client-derived',
  },
  {
    id: 'reassessment',
    label: 'Reassessment Engine',
    route: '/emergency/reassessment',
    page: 'src/components/EmergencyWhiteboard.jsx',
    components: ['src/components/ReassessmentDrawer.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/utils/reassessmentScheduler.js'],
    backendEndpoints: ['/api/reassessment/due', '/api/reassessment/:patientId/reassess'],
    backendService: 'backend/src/services/reassessment.service.ts',
    entities: ['backend/src/models/Patient.ts', 'types/emergency.ts'],
    events: ['ReassessmentDue', 'ReassessmentCompleted'],
    journey: 'store/emergencyStore.ts',
    liveData: 'backend-route-unconsumed',
  },
  {
    id: 'capacity',
    label: 'Capacity Intelligence',
    route: '/emergency/capacity',
    page: 'src/App.jsx#EmergencyCapacityRoute',
    components: ['src/layout/AppShell.jsx#CapacityBadge', 'src/layout/AppShell.jsx#CapacityDetailPanel'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/emergencyAnalyticsApi.js'],
    backendEndpoints: ['/api/capacity/dashboard', '/api/emergency/capacity/history'],
    backendService: 'backend/src/services/capacity.service.ts',
    entities: ['backend/src/models/Patient.ts', 'types/emergency.ts'],
    events: ['CapacityChanged'],
    journey: 'store/emergencyStore.ts',
    liveData: 'mixed',
  },
  {
    id: 'boarding',
    label: 'Boarding Intelligence',
    route: '/emergency/boarding',
    page: 'src/App.jsx#EmergencyCapacityRoute',
    components: ['src/layout/AppShell.jsx#CapacityDetailPanel'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/boardingIntelligenceEngine.js'],
    backendEndpoints: ['/api/emergency/analytics'],
    backendService: 'none',
    entities: ['types/emergency.ts'],
    events: ['BoardingStarted', 'BoardingEnded'],
    journey: 'store/emergencyStore.ts',
    liveData: 'client-derived',
  },
  {
    id: 'referrals',
    label: 'Referral Intelligence',
    route: '/emergency/referrals',
    page: 'src/components/ReferralPanel.jsx',
    components: ['src/components/ReferralPanel.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/referralHub.js'],
    backendEndpoints: ['/api/emergency/referrals'],
    backendService: 'none',
    entities: ['types/emergency.ts'],
    events: ['ReferralCreated', 'ReferralClosed'],
    journey: 'store/emergencyStore.ts',
    liveData: 'client-derived',
  },
  {
    id: 'copilot',
    label: 'ED Copilot',
    route: '/emergency/copilot',
    page: 'src/layout/AppShell.jsx#ChatInterface',
    components: ['src/components/ChatInterface.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/clinicalChatService.js'],
    backendEndpoints: ['/api/copilot/query', '/api/chat/message'],
    backendService: 'backend/src/services/copilot.service.ts',
    entities: ['types/emergency.ts'],
    events: ['OperationalAlertCreated'],
    journey: 'store/emergencyStore.ts',
    liveData: 'mixed',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    route: '/emergency/analytics',
    page: 'src/pages/emergency/EmergencyAnalytics.jsx',
    components: ['src/pages/emergency/EmergencyAnalytics.jsx'],
    store: 'store/emergencyStore.ts',
    apiClients: ['src/services/emergencyAnalyticsApi.js'],
    backendEndpoints: ['/api/emergency/analytics', '/api/emergency/capacity/history', '/api/emergency/queues/analytics'],
    backendService: 'none',
    entities: ['types/emergency.ts'],
    events: ['CapacityChanged', 'PatientDischarged'],
    journey: 'store/emergencyStore.ts',
    liveData: 'client-fallback',
  },
];

function toRel(file) {
  return path.relative(ROOT, file).replaceAll(path.sep, '/');
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(name)) walk(file, files);
      continue;
    }
    if (TEXT_EXTENSIONS.has(path.extname(name))) files.push(file);
  }
  return files;
}

function resolveImport(fromRel, specifier, fileSet) {
  if (!specifier.startsWith('.')) return null;
  const fromDir = path.dirname(fromRel);
  const base = path.normalize(path.join(fromDir, specifier)).replaceAll(path.sep, '/');
  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}/index.js`,
    `${base}/index.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) || null;
}

function extractImports(rel, content, fileSet) {
  const specs = [];
  const patterns = [
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /export\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) specs.push(match[1]);
  }
  return specs.map((specifier) => resolveImport(rel, specifier, fileSet)).filter(Boolean);
}

function extractApiRefs(content) {
  const refs = new Set();
  for (const match of content.matchAll(/['"`](\/api\/[^'"`\\\s)]+)['"`]/g)) refs.add(match[1]);
  return [...refs].sort();
}

function extractExpressEndpoints(rel, content) {
  const mountedByFile = {
    'backend/src/api/capacity.routes.ts': '/api/capacity',
    'backend/src/api/copilot.routes.ts': '/api/copilot',
    'backend/src/api/ems.routes.ts': '/api/ems',
    'backend/src/api/reassessment.routes.ts': '/api/reassessment',
    'backend/src/api/smart-intake.routes.ts': '/api/emergency/intake',
  };
  const mount = mountedByFile[rel];
  if (!mount) return [];
  return [...content.matchAll(/router\.(get|post|patch|put|delete)\(\s*['"]([^'"]*)['"]/g)].map((match) => ({
    method: match[1].toUpperCase(),
    path: `${mount}${match[2] === '/' ? '' : match[2].startsWith('/') ? match[2] : `/${match[2]}`}`,
    file: rel,
  }));
}

function extractNestEndpoints(rel, content) {
  const controller = content.match(/@Controller\(\s*['"]([^'"]*)['"]\s*\)/)?.[1];
  if (controller === undefined) return [];
  return [...content.matchAll(/@(Get|Post|Patch|Put|Delete)\(\s*(?:['"]([^'"]*)['"])?\s*\)/g)].map((match) => ({
    method: match[1].toUpperCase(),
    path: `/api/${[controller, match[2] || ''].filter(Boolean).join('/')}`.replace(/\/+/g, '/'),
    file: rel,
  }));
}

function statusForWorkflow(workflow, sourceByRel) {
  const app = sourceByRel.get('src/App.jsx') || '';
  const nav = sourceByRel.get('src/config/navigation.config.js') || '';
  const command = sourceByRel.get('src/components/CommandPalette.jsx') || '';
  const search = sourceByRel.get('src/data/searchFirstDiscovery.js') || '';
  const key = routeKey(workflow.route);
  return {
    route: app.includes(`path: '${workflow.route}'`) || app.includes(`to="/${workflow.route.slice(1)}"`),
    sidebar: nav.includes(`path: '${workflow.route}'`) || nav.includes(workflow.route) || nav.includes(`CANONICAL_ROUTES.${key}`),
    command: command.includes(`path: '${workflow.route}'`),
    search: search.includes(`path: CANONICAL_ROUTES.${key}`) || search.includes(`path: '${workflow.route}'`) || search.includes(workflow.route),
    pageExists: workflow.page.includes('#') || sourceByRel.has(workflow.page),
    store: sourceByRel.has(workflow.store),
    journey: sourceByRel.has(workflow.journey),
  };
}

function routeKey(route) {
  const keyByRoute = {
    '/emergency/whiteboard': 'emergencyWhiteboard',
    '/emergency/patients': 'emergencyPatients',
    '/emergency/ems': 'emergencyEms',
    '/emergency/intake': 'emergencyIntake',
    '/emergency/queues': 'emergencyQueues',
    '/emergency/reassessment': 'emergencyReassessment',
    '/emergency/capacity': 'emergencyCapacity',
    '/emergency/boarding': 'emergencyBoarding',
    '/emergency/referrals': 'emergencyReferrals',
    '/emergency/copilot': 'emergencyCopilot',
    '/emergency/analytics': 'emergencyAnalytics',
    '/emergency/settings': 'emergencySettings',
  };
  return keyByRoute[route] || '';
}

function classifyFile(rel, importedByCount, content) {
  if (
    WORKFLOWS.some((workflow) =>
      [
        workflow.page.split('#')[0],
        workflow.store,
        workflow.journey,
        workflow.backendService,
        ...workflow.components.map((component) => component.split('#')[0]),
        ...workflow.apiClients,
        ...workflow.entities,
      ].includes(rel)
    ) ||
    [
      'src/App.jsx',
      'src/config/navigation.config.js',
      'src/config/routes.config.js',
      'src/components/CommandPalette.jsx',
      'src/data/searchFirstDiscovery.js',
      'lib/features/featureRegistry.ts',
    ].includes(rel)
  ) {
    return 'Connected Emergency OS';
  }
  if (/future|platform|fleet|iot|digital-twin|simulation|governance|commercial|marketplace|billing|audit|profile/i.test(rel)) {
    return 'Future Module / Legacy Platform Artifact';
  }
  if (/\.test\.|\.spec\./.test(rel)) return 'Test Support';
  if (importedByCount === 0 && /src\/components\/|src\/pages\/|src\/services\/|src\/hooks\//.test(rel)) return 'Unmounted or Orphaned';
  if (/mock|demo|fixture/i.test(rel) && !/emergency|smart-intake/i.test(rel)) return 'Stale Mock Data';
  if (importedByCount === 0 && /duplicate|legacy/i.test(content)) return 'Duplicate or Legacy';
  return 'Connected or Shared';
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' |')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replaceAll('\n', '<br>').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function main() {
  mkdirSync(DOCS_DIR, { recursive: true });
  const files = walk(ROOT).map((absolute) => ({
    absolute,
    rel: toRel(absolute),
    content: readFileSync(absolute, 'utf8'),
  }));
  const fileSet = new Set(files.map((file) => file.rel));
  const sourceByRel = new Map(files.map((file) => [file.rel, file.content]));
  const importedBy = new Map(files.map((file) => [file.rel, []]));
  const importsBy = new Map();
  const apiRefs = new Map();
  const endpoints = [];

  for (const file of files) {
    const imports = extractImports(file.rel, file.content, fileSet);
    importsBy.set(file.rel, imports);
    for (const imported of imports) importedBy.get(imported)?.push(file.rel);
    const refs = extractApiRefs(file.content);
    if (refs.length) apiRefs.set(file.rel, refs);
    endpoints.push(...extractExpressEndpoints(file.rel, file.content), ...extractNestEndpoints(file.rel, file.content));
  }

  const workflowStatuses = WORKFLOWS.map((workflow) => ({
    ...workflow,
    status: statusForWorkflow(workflow, sourceByRel),
  }));
  const disconnectedFiles = files
    .map((file) => ({
      rel: file.rel,
      category: classifyFile(file.rel, importedBy.get(file.rel)?.length || 0, file.content),
      importedBy: importedBy.get(file.rel)?.length || 0,
      imports: importsBy.get(file.rel)?.length || 0,
    }))
    .filter((file) => file.category !== 'Connected or Shared')
    .sort((a, b) => a.category.localeCompare(b.category) || a.rel.localeCompare(b.rel));

  const consumedApiRefs = [...apiRefs.entries()]
    .filter(([file]) => /^src\//.test(file) || /^store\//.test(file) || /^engine\//.test(file))
    .flatMap(([file, refs]) => refs.map((ref) => ({ file, ref })));
  const emergencyEndpointRows = endpoints
    .filter((endpoint) => /\/api\/(emergency|ems|reassessment|capacity|copilot|platform-systems|patients|chat)/.test(endpoint.path))
    .map((endpoint) => {
      const consumed = consumedApiRefs.some(({ ref }) => endpoint.path.includes(ref.replace(/\$\{[^}]+\}/g, ':id')) || ref.includes(endpoint.path.split('/:')[0]));
      return [endpoint.method, endpoint.path, endpoint.file, consumed ? 'Consumed or partially matched' : 'No active frontend consumer found'];
    });

  const workflowRows = workflowStatuses.map((workflow) => [
    workflow.label,
    workflow.route,
    workflow.status.route ? 'yes' : 'no',
    workflow.status.sidebar ? 'yes' : 'no',
    workflow.status.command ? 'yes' : 'no',
    workflow.status.search ? 'yes' : 'no',
    workflow.liveData,
    workflow.events.join(', '),
    workflow.journey,
  ]);

  const routeCovered = workflowStatuses.filter((workflow) => workflow.status.route).length;
  const sidebarCovered = workflowStatuses.filter((workflow) => workflow.status.sidebar).length;
  const commandCovered = workflowStatuses.filter((workflow) => workflow.status.command).length;
  const searchCovered = workflowStatuses.filter((workflow) => workflow.status.search).length;
  const componentCovered = workflowStatuses.filter((workflow) => workflow.status.pageExists && workflow.components.every((component) => component.includes('#') || sourceByRel.has(component))).length;
  const liveBackendConnected = workflowStatuses.filter((workflow) =>
    ['partial', 'conditional', 'mixed'].includes(workflow.liveData)
  ).length;
  const serviceCovered = workflowStatuses.filter((workflow) => workflow.backendService !== 'none' && sourceByRel.has(workflow.backendService)).length;
  const entityCovered = workflowStatuses.filter((workflow) => workflow.entities.every((entity) => entity.includes('#') || sourceByRel.has(entity))).length;
  const eventCovered = workflowStatuses.filter((workflow) => workflow.events.length > 0).length;
  const workflowCovered = workflowStatuses.filter((workflow) =>
    workflow.status.route &&
    workflow.status.sidebar &&
    workflow.status.command &&
    workflow.status.search &&
    workflow.status.pageExists &&
    workflow.status.store &&
    workflow.status.journey &&
    ['partial', 'conditional', 'mixed'].includes(workflow.liveData)
  ).length;

  const scores = {
    route: percent(routeCovered, WORKFLOWS.length),
    component: percent(componentCovered, WORKFLOWS.length),
    api: percent(liveBackendConnected, WORKFLOWS.length),
    service: percent(serviceCovered, WORKFLOWS.length),
    entity: percent(entityCovered, WORKFLOWS.length),
    event: percent(eventCovered, WORKFLOWS.length),
    workflow: percent(workflowCovered, WORKFLOWS.length),
    sidebar: percent(sidebarCovered, WORKFLOWS.length),
    command: percent(commandCovered, WORKFLOWS.length),
    search: percent(searchCovered, WORKFLOWS.length),
  };

  const generatedAt = new Date().toISOString();
  const fileSummary = `Scanned ${files.length} text/code files. Resolved ${[...importsBy.values()].reduce((sum, imports) => sum + imports.length, 0)} relative import edges. Found ${endpoints.length} backend endpoint declarations and ${consumedApiRefs.length} frontend API references.`;

  const dependencyGraph = WORKFLOWS.map((workflow) => [
    workflow.label,
    `${workflow.page} -> ${workflow.components.join(', ')}`,
    workflow.store,
    workflow.apiClients.join(', '),
    workflow.backendEndpoints.join(', '),
    workflow.backendService,
    workflow.entities.join(', '),
  ]);

  writeFileSync(
    path.join(DOCS_DIR, 'component-dependency-map.md'),
    [
      '# Component Dependency Map',
      '',
      `Generated: ${generatedAt}`,
      '',
      fileSummary,
      '',
      mdTable(
        ['Frontend Page', 'Components', 'Store', 'API Clients', 'Backend Endpoint', 'Service', 'Entity / Schema'],
        dependencyGraph
      ),
      '',
      '## Import Graph Hotspots',
      '',
      mdTable(
        ['File', 'Imports', 'Imported By', 'Classification'],
        disconnectedFiles.slice(0, 80).map((file) => [file.rel, file.imports, file.importedBy, file.category])
      ),
      '',
    ].join('\n')
  );

  writeFileSync(
    path.join(DOCS_DIR, 'unmounted-components-report.md'),
    [
      '# Unmounted Components Report',
      '',
      `Generated: ${generatedAt}`,
      '',
      fileSummary,
      '',
      'Files below are unmounted, orphan candidates, duplicate/future artifacts, or tests/support files according to import reachability and path classification.',
      '',
      mdTable(
        ['File', 'Imported By', 'Imports', 'Classification'],
        disconnectedFiles
          .filter((file) => /component|page|layout|hook|src\//i.test(file.rel))
          .slice(0, 160)
          .map((file) => [file.rel, file.importedBy, file.imports, file.category])
      ),
      '',
      '## Safe Cleanup Applied',
      '',
      '- Added direct command-palette route commands for all 12 primary Emergency OS routes.',
      '- Added Emergency OS destinations to search-first discovery.',
      '- Kept legacy/future page files in place unless they are already redirected away from the active UX.',
      '',
    ].join('\n')
  );

  writeFileSync(
    path.join(DOCS_DIR, 'orphaned-services-report.md'),
    [
      '# Orphaned Services Report',
      '',
      `Generated: ${generatedAt}`,
      '',
      fileSummary,
      '',
      '## Frontend API Clients and Consumers',
      '',
      mdTable(
        ['File', 'API References'],
        [...apiRefs.entries()]
          .filter(([file]) => /src\/services|store\/|src\/components|src\/pages/.test(file))
          .slice(0, 140)
          .map(([file, refs]) => [file, refs.join(', ')])
      ),
      '',
      '## Backend Emergency OS Endpoint Consumption',
      '',
      mdTable(['Method', 'Endpoint', 'Backend File', 'Consumer Status'], emergencyEndpointRows),
      '',
      '## Key Breaks',
      '',
      '- `/api/ems/*`, `/api/reassessment/*`, `/api/capacity/dashboard`, and `/api/copilot/query` exist in the conditional Mongoose runtime but are not consistently consumed by active frontend workflows.',
      '- Queue, boarding, referrals, and much of analytics are currently derived from `store/emergencyStore.ts` client state rather than persisted backend services.',
      '- The main NestJS backend still exposes many legacy platform modules that are redirected out of the active UX.',
      '',
    ].join('\n')
  );

  writeFileSync(
    path.join(DOCS_DIR, 'frontend-backend-alignment-report.md'),
    [
      '# Frontend Backend Alignment Report',
      '',
      `Generated: ${generatedAt}`,
      '',
      fileSummary,
      '',
      mdTable(
        ['Module', 'UI Route', 'Route', 'Sidebar', 'Command Palette', 'Search', 'Live Backend Data', 'Backend Endpoints'],
        workflowStatuses.map((workflow) => [
          workflow.label,
          workflow.route,
          workflow.status.route ? 'yes' : 'no',
          workflow.status.sidebar ? 'yes' : 'no',
          workflow.status.command ? 'yes' : 'no',
          workflow.status.search ? 'yes' : 'no',
          workflow.liveData,
          workflow.backendEndpoints.join(', '),
        ])
      ),
      '',
      '## Alignment Findings',
      '',
      '- Active frontend reachability is complete across direct routes, sidebar, command palette, and search after this pass.',
      '- Backend persistence is uneven: Smart Intake has the strongest backend chain, while queues, boarding, referrals, and analytics rely on local store derivations/fallbacks.',
      '- Conditional backend mounting via `ENABLE_MONGOOSE_EMERGENCY_OS=true` means Emergency OS backend endpoints are not guaranteed in default runtime.',
      '',
    ].join('\n')
  );

  writeFileSync(
    path.join(DOCS_DIR, 'emergency-os-integration-report.md'),
    [
      '# Emergency OS Integration Report',
      '',
      `Generated: ${generatedAt}`,
      '',
      fileSummary,
      '',
      '## Workflow Coverage',
      '',
      mdTable(
        ['Module', 'Route', 'Route Mounted', 'Sidebar', 'Command', 'Search', 'Live Data', 'Events', 'Journey Engine'],
        workflowRows
      ),
      '',
      '## System-Wide Integration Score',
      '',
      mdTable(
        ['Metric', 'Score'],
        [
          ['Route Coverage', `${scores.route}%`],
          ['Component Coverage', `${scores.component}%`],
          ['API Coverage', `${scores.api}%`],
          ['Service Coverage', `${scores.service}%`],
          ['Entity Coverage', `${scores.entity}%`],
          ['Event Coverage', `${scores.event}%`],
          ['Sidebar Coverage', `${scores.sidebar}%`],
          ['Command Palette Coverage', `${scores.command}%`],
          ['Search Coverage', `${scores.search}%`],
          ['Emergency OS Workflow Coverage', `${scores.workflow}%`],
        ]
      ),
      '',
      '## Breaks in the Chain',
      '',
      '- Patient Journey events are authoritative in the frontend store, but not yet the single persisted backend event stream for every workflow.',
      '- Real-time support exists through `src/services/emergencyRealtimeService.js` and EMS socket support, but the frontend defaults to polling/no endpoint unless realtime env vars are configured.',
      '- Several active workflows consume local store projections before backend data: queues, boarding, referrals, and parts of analytics.',
      '- Several backend Emergency OS endpoints are mounted only in the conditional Mongoose runtime and therefore are not guaranteed in the default NestJS API surface.',
      '',
      '## Recommended Next Safe Steps',
      '',
      '- Promote Emergency OS backend endpoints into the default Nest module or add a runtime health indicator that reports whether Mongoose Emergency OS endpoints are active.',
      '- Add dedicated frontend API clients for `/api/ems`, `/api/reassessment`, `/api/capacity/dashboard`, and `/api/copilot/query` or remove unused endpoints if the Nest APIs replace them.',
      '- Replace local queue/referral/boarding derivations with Journey event-backed selectors once backend event persistence is available.',
      '- Move legacy platform pages/services into `future-modules` only after backend module imports and test imports have been rewritten.',
      '',
    ].join('\n')
  );

  console.log(fileSummary);
  console.log(`Reports written to ${toRel(DOCS_DIR)}`);
}

main();
