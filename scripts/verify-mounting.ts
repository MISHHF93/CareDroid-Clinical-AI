import fs from 'node:fs';
import path from 'node:path';

type MountType = 'service' | 'route' | 'scheduler' | 'page' | 'component' | 'navigation' | 'command' | 'search';

interface MountCheck {
  name: string;
  type: MountType;
  expectedParent: string;
  isMounted: boolean;
  location: string;
  details: string;
}

const root = process.cwd();
const docsDir = path.join(root, 'docs', 'architecture');

function read(relativePath: string): string {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function hasAll(content: string, values: string[]): boolean {
  return values.every((value) => content.includes(value));
}

function pushCheck(checks: MountCheck[], check: MountCheck) {
  checks.push(check);
}

function verifyMounting() {
  const checks: MountCheck[] = [];
  const backendMain = read('backend/src/main.ts');
  const app = read('src/App.jsx');
  const navigation = read('src/config/navigation.config.js');
  const commandPalette = read('src/components/CommandPalette.jsx');
  const searchDiscovery = read('src/data/searchFirstDiscovery.js');
  const appShell = read('src/layout/AppShell.jsx');
  const smartIntake = read('backend/src/services/smart-intake.service.ts');

  const backendServices = [
    {
      name: 'capacityService',
      file: 'backend/src/services/capacity.service.ts',
      route: 'backend/src/api/capacity.routes.ts',
      routeImport: "import { capacityService }",
      mount: "expressApp.use('/api/capacity', capacityRoutes)",
      exportText: 'export const capacityService = new CapacityService()',
    },
    {
      name: 'emsService',
      file: 'backend/src/services/ems.service.ts',
      route: 'backend/src/api/ems.routes.ts',
      routeImport: "import { emsService }",
      mount: "expressApp.use('/api/ems', emsRoutes)",
      exportText: 'export const emsService = new EMSService()',
    },
    {
      name: 'reassessmentService',
      file: 'backend/src/services/reassessment.service.ts',
      route: 'backend/src/api/reassessment.routes.ts',
      routeImport: "import { reassessmentService }",
      mount: "expressApp.use('/api/reassessment', reassessmentRoutes)",
      exportText: 'export const reassessmentService = new ReassessmentService()',
    },
    {
      name: 'smartIntakeService',
      file: 'backend/src/services/smart-intake.service.ts',
      route: 'backend/src/api/smart-intake.routes.ts',
      routeImport: "import { smartIntakeService }",
      mount: "expressApp.use('/api/emergency/intake', smartIntakeRoutes)",
      exportText: 'export const smartIntakeService = new SmartIntakeService()',
    },
    {
      name: 'copilotService',
      file: 'backend/src/services/copilot.service.ts',
      route: 'backend/src/api/copilot.routes.ts',
      routeImport: "import { copilotService }",
      mount: "expressApp.use('/api/copilot', copilotRoutes)",
      exportText: 'export const copilotService = new CopilotService()',
    },
  ];

  for (const service of backendServices) {
    const serviceContent = read(service.file);
    const routeContent = read(service.route);
    const isMounted =
      exists(service.file) &&
      serviceContent.includes(service.exportText) &&
      routeContent.includes(service.routeImport) &&
      backendMain.includes(service.mount);

    pushCheck(checks, {
      name: service.name,
      type: 'service',
      expectedParent: `${service.route} + backend/src/main.ts`,
      isMounted,
      location: service.file,
      details: `${service.exportText}; ${service.mount}`,
    });
  }

  const intakeDependencies = [
    {
      name: 'mpiService',
      file: 'backend/src/services/mpi.service.ts',
      importText: "import { mpiService } from './mpi.service'",
      usage: 'private matcher = mpiService',
      exportText: 'export const mpiService = new MPIService()',
    },
    {
      name: 'ocrService',
      file: 'backend/src/services/ocr.service.ts',
      importText: "import { ocrService } from './ocr.service'",
      usage: 'private ocr = ocrService',
      exportText: 'export const ocrService = new OCRService()',
    },
    {
      name: 'textMiningService',
      file: 'backend/src/services/text-mining.service.ts',
      importText: "import { textMiningService } from './text-mining.service'",
      usage: 'private textMining = textMiningService',
      exportText: 'export const textMiningService = new TextMiningService()',
    },
    {
      name: 'fhirService',
      file: 'backend/src/services/fhir.service.ts',
      importText: "import { fhirService } from './fhir.service'",
      usage: 'private fhir = fhirService',
      exportText: 'export const fhirService = new FHIRService()',
    },
  ];

  for (const dependency of intakeDependencies) {
    const content = read(dependency.file);
    pushCheck(checks, {
      name: dependency.name,
      type: 'service',
      expectedParent: 'backend/src/services/smart-intake.service.ts',
      isMounted:
        exists(dependency.file) &&
        content.includes(dependency.exportText) &&
        smartIntake.includes(dependency.importText) &&
        smartIntake.includes(dependency.usage),
      location: dependency.file,
      details: `${dependency.importText}; ${dependency.usage}`,
    });
  }

  pushCheck(checks, {
    name: 'reassessmentScheduler',
    type: 'scheduler',
    expectedParent: 'backend/src/main.ts',
    isMounted:
      exists('backend/src/scheduler/reassessment.scheduler.ts') &&
      backendMain.includes("import { reassessmentScheduler }") &&
      backendMain.includes('reassessmentScheduler.start()'),
    location: 'backend/src/scheduler/reassessment.scheduler.ts',
    details: 'Scheduler imported and started in Emergency OS runtime.',
  });

  pushCheck(checks, {
    name: 'ocrService.initialize',
    type: 'scheduler',
    expectedParent: 'backend/src/main.ts',
    isMounted: backendMain.includes("import { ocrService }") && backendMain.includes('await ocrService.initialize()'),
    location: 'backend/src/services/ocr.service.ts',
    details: 'OCR provider startup hook runs with Emergency OS runtime.',
  });

  const pages = [
    { name: 'EmergencyWhiteboard', route: '/emergency/whiteboard', shortRoute: '/', file: 'src/components/EmergencyWhiteboard.jsx' },
    { name: 'Patients', route: '/emergency/patients', shortRoute: '/patients', file: 'src/components/EmergencyWhiteboard.jsx' },
    { name: 'EMSIntake', route: '/emergency/ems', shortRoute: '/ems', file: 'src/components/EMSPipeline.jsx' },
    { name: 'SmartIntake', route: '/emergency/intake', shortRoute: '/intake', file: 'src/pages/emergency/SmartIntake.jsx' },
    { name: 'Queues', route: '/emergency/queues', shortRoute: '/queues', file: 'src/App.jsx#EmergencyQueueRoute' },
    { name: 'Reassessment', route: '/emergency/reassessment', shortRoute: '/reassessment', file: 'src/components/ReassessmentDrawer.jsx' },
    { name: 'Capacity', route: '/emergency/capacity', shortRoute: '/capacity', file: 'src/App.jsx#EmergencyCapacityRoute' },
    { name: 'Boarding', route: '/emergency/boarding', shortRoute: '/boarding', file: 'src/App.jsx#EmergencyCapacityRoute' },
    { name: 'Referrals', route: '/emergency/referrals', shortRoute: '/referrals', file: 'src/components/ReferralPanel.jsx' },
    { name: 'Copilot', route: '/emergency/copilot', shortRoute: '/copilot', file: 'src/layout/AppShell.jsx#ChatInterface' },
    { name: 'Analytics', route: '/emergency/analytics', shortRoute: '/analytics', file: 'src/pages/emergency/EmergencyAnalytics.jsx' },
    { name: 'Settings', route: '/emergency/settings', shortRoute: '/settings', file: 'src/App.jsx#SettingsRoute' },
  ];

  for (const page of pages) {
    const fileExists = page.file.includes('#') || exists(page.file);
    const hasRoute = app.includes(`path: '${page.route}'`);
    const hasShortRoute =
      page.shortRoute === '/' ? app.includes("path: '/'") : app.includes(`['${page.shortRoute}', '${page.route}']`);

    pushCheck(checks, {
      name: page.name,
      type: 'page',
      expectedParent: 'src/App.jsx',
      isMounted: fileExists && hasRoute && hasShortRoute,
      location: page.file,
      details: `${page.route}; short alias ${page.shortRoute}`,
    });

    pushCheck(checks, {
      name: `${page.name} navigation`,
      type: 'navigation',
      expectedParent: 'src/config/navigation.config.js',
      isMounted: navigation.includes(page.route) || navigation.includes(`CANONICAL_ROUTES.${routeKey(page.route)}`),
      location: 'src/config/navigation.config.js',
      details: `Sidebar destination for ${page.route}`,
    });

    pushCheck(checks, {
      name: `${page.name} command`,
      type: 'command',
      expectedParent: 'src/components/CommandPalette.jsx',
      isMounted: commandPalette.includes(`path: '${page.route}'`),
      location: 'src/components/CommandPalette.jsx',
      details: `Command palette destination for ${page.route}`,
    });

    pushCheck(checks, {
      name: `${page.name} search`,
      type: 'search',
      expectedParent: 'src/data/searchFirstDiscovery.js',
      isMounted: searchDiscovery.includes(page.route) || searchDiscovery.includes(`CANONICAL_ROUTES.${routeKey(page.route)}`),
      location: 'src/data/searchFirstDiscovery.js',
      details: `Search destination for ${page.route}`,
    });
  }

  pushCheck(checks, {
    name: 'AppShell',
    type: 'component',
    expectedParent: 'src/App.jsx',
    isMounted:
      app.includes('<AppShellPage>{resolvedElement}</AppShellPage>') &&
      appShell.includes('APP_SHELL_NAV_ITEMS.map') &&
      appShell.includes('<CommandPalette') &&
      appShell.includes('<ChatInterface') &&
      !appShell.includes('<Sidebar'),
    location: 'src/layout/AppShell.jsx',
    details: 'Single shell with nav, command palette, workspace area, and Copilot panel.',
  });

  return checks;
}

function routeKey(route: string): string {
  const keyByRoute: Record<string, string> = {
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

function writeReport(checks: MountCheck[]) {
  fs.mkdirSync(docsDir, { recursive: true });
  const grouped = checks.reduce<Record<string, MountCheck[]>>((groups, check) => {
    groups[check.type] ||= [];
    groups[check.type].push(check);
    return groups;
  }, {});

  const lines = [
    '# Emergency OS Mounting Verification',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total checks: ${checks.length}`,
    `Passing checks: ${checks.filter((check) => check.isMounted).length}`,
    `Failing checks: ${checks.filter((check) => !check.isMounted).length}`,
    '',
  ];

  for (const [type, rows] of Object.entries(grouped)) {
    lines.push(`## ${type}`, '', '| Status | Name | Expected Parent | Location | Details |', '| --- | --- | --- | --- | --- |');
    for (const row of rows) {
      lines.push(
        `| ${row.isMounted ? 'PASS' : 'FAIL'} | ${row.name} | ${row.expectedParent} | ${row.location} | ${row.details.replaceAll('|', '\\|')} |`,
      );
    }
    lines.push('');
  }

  fs.writeFileSync(path.join(docsDir, 'mounting-verification-report.md'), lines.join('\n'));
}

const checks = verifyMounting();
writeReport(checks);

console.log('\n=== Mounting Verification Results ===\n');
for (const check of checks) {
  const status = check.isMounted ? '[OK]' : '[FAIL]';
  console.log(`${status} ${check.name} (${check.type}) -> expected in ${check.expectedParent}`);
  if (!check.isMounted) {
    console.log(`       Missing or incomplete at: ${check.location}`);
    console.log(`       Expected: ${check.details}`);
  }
}

const allMounted = checks.every((check) => check.isMounted);
console.log('\n=== Summary ===');
console.log(allMounted ? '[OK] All Emergency OS mounting checks passed.' : '[FAIL] Some Emergency OS mounting checks failed.');
console.log('Report written to docs/architecture/mounting-verification-report.md');

process.exit(allMounted ? 0 : 1);
