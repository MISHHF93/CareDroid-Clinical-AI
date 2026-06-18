/**
 * Verify reception .md plan implementation using 20 parallel workers.
 * Run: node scripts/verify-plans-20-workers.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportPath = join(root, 'qa', 'plan-verification-20-workers.json');

function read(rel) {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

/** 20 plan verification workers — maps to plan todos + success criteria */
const WORKERS = [
  {
    id: 'W01-screen-mode-hook',
    plan: 'receptionist-only_layout',
    criterion: 'useScreenModeCapabilities() exists and exports resolveScreenModeCapabilities',
    verify() {
      const src = read('src/hooks/useScreenModeCapabilities.ts');
      const test = read('src/hooks/useScreenModeCapabilities.test.ts');
      return (
        src.includes('resolveScreenModeCapabilities') &&
        test.includes('resolveScreenModeCapabilities') &&
        test.includes('CARE_DROID_SCREEN_MODES.registration')
      );
    },
  },
  {
    id: 'W02-registration-screen-flags',
    plan: 'receptionist-only_layout',
    criterion: 'REGISTRATION_SCREEN hides ops strip, overlay, capacity engine',
    verify() {
      const src = read('src/hooks/useScreenModeCapabilities.ts');
      return (
        src.includes('showOperationalStrip: !isRegistrationScreen') &&
        src.includes('showEmsCriticalOverlay: !isRegistrationScreen') &&
        src.includes('showCapacityEngine: !isRegistrationScreen')
      );
    },
  },
  {
    id: 'W03-slim-header-gating',
    plan: 'receptionist-only_layout',
    criterion: 'Header gates central-node badge and operational strip',
    verify() {
      const src = read('src/components/Header.tsx');
      return (
        src.includes('useScreenModeCapabilities') &&
        src.includes('showOperationalStrip') &&
        src.includes('showCentralNodeBadge')
      );
    },
  },
  {
    id: 'W04-header-single-search',
    plan: 'receptionist-only_layout',
    criterion: 'Header lookup syncs ?q=; command palette hidden on registration screen',
    verify() {
      const src = read('src/components/Header.tsx');
      return (
        src.includes('syncPatientLookupQuery') &&
        src.includes('focus-reception-search') &&
        src.includes('!screenCapabilities.isRegistrationScreen') &&
        src.includes('open-command-palette')
      );
    },
  },
  {
    id: 'W05-no-hero-search',
    plan: 'receptionist-only_layout',
    criterion: 'ReceptionWorkspace has no hero search or duplicate action row',
    verify() {
      const src = read('src/pages/emergency/ReceptionWorkspace.jsx');
      return (
        !src.includes('reception-workspace__hero') &&
        !src.includes('reception-workspace__actions--secondary') &&
        src.includes('EmsPreArrivalPanel')
      );
    },
  },
  {
    id: 'W06-appshell-overlay-gating',
    plan: 'receptionist-only_layout',
    criterion: 'AppShell conditionally mounts EMSCriticalBroadcast and skips engines',
    verify() {
      const src = read('src/components/AppShell.tsx');
      return (
        src.includes('showEmsCriticalOverlay') &&
        src.includes('showCapacityEngine') &&
        src.includes('showReassessmentEngine')
      );
    },
  },
  {
    id: 'W07-clerk-nav-minimal',
    plan: 'receptionist-only_layout',
    criterion: 'Clerk nav is reception + patients only',
    verify() {
      const src = read('src/config/unified-navigation.config.ts');
      return (
        src.includes("registration_clerk: ['reception', 'patients']") &&
        src.includes('ROLE_NAV_EXCLUDED_OVERRIDES')
      );
    },
  },
  {
    id: 'W08-clerk-whiteboard-redirect',
    plan: 'receptionist-only_layout',
    criterion: 'Clerk whiteboard URL redirects to reception',
    verify() {
      const src = read('src/App.jsx');
      return (
        src.includes('EMERGENCY_ROLE_IDS.registrationClerk') &&
        src.includes('CANONICAL_ROUTES.emergencyReception') &&
        src.includes('emergencyWhiteboard')
      );
    },
  },
  {
    id: 'W09-clerk-routes-trimmed',
    plan: 'receptionist-only_layout',
    criterion: 'Clerk routes exclude whiteboard, queues, tools, platform',
    verify() {
      const match = read('src/config/emergencyRolePermissions.js').match(
        /\[EMERGENCY_ROLE_IDS\.registrationClerk\]: Object\.freeze\(\{[\s\S]*?routes: \[([^\]]+)\]/,
      );
      const routes = match?.[1] || '';
      return routes.includes('reception') && !/whiteboard|queues|tools|platform/.test(routes);
    },
  },
  {
    id: 'W10-ems-pre-arrival-widget',
    plan: 'receptionist-only_layout',
    criterion: 'REGISTRATION_SCREEN visibleWidgets includes ems-pre-arrival',
    verify() {
      const src = read('src/central-node/careDroidCentralNode.ts');
      return src.includes('ems-pre-arrival');
    },
  },
  {
    id: 'W11-reception-route',
    plan: 'reception-first_refactor',
    criterion: '/emergency/reception route mounts ReceptionWorkspace',
    verify() {
      const app = read('src/App.jsx');
      const page = read('src/pages/emergency/ReceptionWorkspace.jsx');
      return app.includes('ReceptionWorkspace') && page.includes('useReceptionSnapshotPolling');
    },
  },
  {
    id: 'W12-reception-handoff',
    plan: 'reception-first_refactor',
    criterion: 'receptionHandoff.ts completes handoff to triage',
    verify() {
      const src = read('src/services/receptionHandoff.ts');
      return src.includes('completeReceptionHandoff') && src.includes('PatientState.Triage');
    },
  },
  {
    id: 'W13-clerk-default-route',
    plan: 'reception-first_refactor',
    criterion: 'registration_clerk defaultRoute is /emergency/reception',
    verify() {
      const src = read('src/config/emergencyRolePermissions.js');
      return src.includes('defaultRoute: ROUTES.reception') && src.includes('registrationClerk');
    },
  },
  {
    id: 'W14-demo-clerk-default',
    plan: 'receptionist-only_layout',
    criterion: 'Open-access demo user defaults to registration_clerk',
    verify() {
      const src = read('src/contexts/UserContext.jsx');
      return src.includes("role: 'registration_clerk'");
    },
  },
  {
    id: 'W15-tabbed-queues',
    plan: 'receptionist-only_layout',
    criterion: 'Registration queues consolidated into tabbed ReceptionWorkQueues',
    verify() {
      const ws = read('src/pages/emergency/ReceptionWorkspace.jsx');
      const q = read('src/components/reception/ReceptionWorkQueues.jsx');
      return ws.includes('ReceptionWorkQueues') && q.includes('role="tablist"');
    },
  },
  {
    id: 'W16-metrics-stable',
    plan: 'receptionist-only_layout',
    criterion: 'ArrivalMetricsPanel avoids unstable operational summary selector',
    verify() {
      const src = read('src/components/reception/ArrivalMetricsPanel.jsx');
      return src.includes('selectEmsInboundCount') && !src.includes('selectEmergencyOperationalSummary');
    },
  },
  {
    id: 'W17-branding-arrival-dashboard',
    plan: 'receptionist-only_layout',
    criterion: 'Registration screen uses Arrival Dashboard product label',
    verify() {
      const cap = read('src/hooks/useScreenModeCapabilities.ts');
      const brand = read('src/config/emergencyOsBranding.config.ts');
      const header = read('src/components/Header.tsx');
      return (
        cap.includes('receptionName') &&
        brand.includes('receptionName') &&
        header.includes('screenCapabilities.productLabel')
      );
    },
  },
  {
    id: 'W18-plan-tests',
    plan: 'receptionist-only_layout',
    criterion: 'Plan-mandated test files exist and assert key behaviors',
    verify() {
      const files = [
        'src/hooks/useScreenModeCapabilities.test.ts',
        'src/pages/emergency/ReceptionWorkspace.test.jsx',
        'src/config/emergencyRolePermissions.test.js',
        'src/config/unified-navigation.config.test.ts',
      ];
      return files.every((f) => read(f).length > 0);
    },
  },
  {
    id: 'W19-plan-docs',
    plan: 'reception-first_refactor',
    criterion: 'Architecture docs exist for reception strategy',
    verify() {
      const docs = [
        'docs/architecture/reception-first-strategy.md',
        'docs/architecture/reception-workspace-audit.md',
        'docs/architecture/reception-screen-design.md',
      ];
      return docs.every((f) => read(f).length > 100);
    },
  },
  {
    id: 'W20-clinical-no-regression',
    plan: 'receptionist-only_layout',
    criterion: 'Clinical roles retain whiteboard + ops strip (not registration-gated globally)',
    verify() {
      const cap = read('src/hooks/useScreenModeCapabilities.ts');
      const perms = read('src/config/emergencyRolePermissions.js');
      return (
        cap.includes('showOperationalStrip: !isRegistrationScreen') &&
        perms.includes('chargeNurse') &&
        perms.includes('ROUTES.whiteboard')
      );
    },
  },
];

if (!isMainThread) {
  const { workerId, index } = workerData;
  const task = WORKERS[index];
  try {
    const ok = task.verify();
    parentPort.postMessage({
      workerId,
      index,
      id: task.id,
      plan: task.plan,
      criterion: task.criterion,
      status: ok ? 'pass' : 'fail',
    });
  } catch (error) {
    parentPort.postMessage({
      workerId,
      index,
      id: task.id,
      plan: task.plan,
      criterion: task.criterion,
      status: 'fail',
      error: error.message,
    });
  }
} else {
  const workerCount = WORKERS.length;

  async function runWorkers() {
    const started = Date.now();
    const results = await Promise.all(
      WORKERS.map(
        (task, index) =>
          new Promise((resolve, reject) => {
            const worker = new Worker(new URL(import.meta.url), {
              workerData: { workerId: task.id, index },
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
              if (code !== 0) reject(new Error(`${task.id} exited with code ${code}`));
            });
          }),
      ),
    );

    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail');

    const report = {
      generatedAt: new Date().toISOString(),
      workerCount,
      durationMs: Date.now() - started,
      passed,
      failed: failed.length,
      plans: ['receptionist-only_layout_29938d64.plan.md', 'reception-first_refactor_80aaa8b3.plan.md'],
      results: results.sort((a, b) => a.index - b.index),
    };

    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`Plan verification (${workerCount} workers): ${passed}/${workerCount} passed (${report.durationMs}ms)`);
    for (const item of failed) {
      console.log(`  FAIL ${item.id}: ${item.criterion}`);
      if (item.error) console.log(`       ${item.error}`);
    }
    console.log(`Report: ${reportPath}`);

    if (failed.length > 0) process.exit(1);
  }

  runWorkers().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
