/**
 * Twenty reception-first workers: 8 static tech-stack checks + 12 Playwright clerk flows.
 * Run: node scripts/receptionist-worker-swarm.mjs
 * Requires: npm run dev (or QA_BASE_URL pointing at a running frontend)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'qa', 'screenshots', 'reception-workers');
const reportPath = join(root, 'qa', 'receptionist-worker-swarm-report.json');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

function read(rel) {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch {
    return '';
  }
}

/** W01–W08: inventory current stack + reception-first wiring (no browser). */
const STATIC_WORKERS = [
  {
    id: 'stack-01-frontend',
    name: 'React + Vite frontend',
    kind: 'static',
    verify() {
      const pkg = read('package.json');
      return pkg.includes('"react"') && pkg.includes('"vite"') && pkg.includes('react-router-dom');
    },
  },
  {
    id: 'stack-02-backend',
    name: 'NestJS backend module',
    kind: 'static',
    verify() {
      const pkg = read('backend/package.json');
      return pkg.includes('@nestjs/core') && read('backend/src/modules/emergency-os/emergency-os.module.ts').includes('EmergencyOsModule');
    },
  },
  {
    id: 'stack-03-reception-first-config',
    name: 'Reception-first UX enabled',
    kind: 'static',
    verify() {
      const src = read('src/config/receptionFirstUx.config.js');
      return src.includes('enabled: true') && src.includes('platformHomeRoute');
    },
  },
  {
    id: 'stack-04-reception-workspace',
    name: 'Reception workspace + copy deck',
    kind: 'static',
    verify() {
      const workspace = read('src/pages/emergency/ReceptionWorkspace.jsx');
      const copy = read('src/components/reception/receptionCopy.js');
      const desk = read('src/config/receptionDeskUi.config.js');
      return (
        workspace.includes('reception-workspace-title') &&
        workspace.includes('useReceptionDeskUi') &&
        copy.includes('Register walk-in') &&
        copy.includes('Arrivals & waiting lists') &&
        desk.includes('slimHiddenSurfaces')
      );
    },
  },
  {
    id: 'stack-05-clerk-nav-policy',
    name: 'Clerk nav demotes governance surfaces',
    kind: 'static',
    verify() {
      const policy = read('src/config/emergencyNavPolicy.js');
      return (
        policy.includes("registration_clerk: ['reception', 'patients'") &&
        policy.includes("'platform'") &&
        policy.includes("'whiteboard'")
      );
    },
  },
  {
    id: 'stack-06-route-guards',
    name: 'Whiteboard guard + patients redirect',
    kind: 'static',
    verify() {
      const app = read('src/App.jsx');
      const nav = read('src/services/navigateToEmergencySurface.js');
      return (
        app.includes('registrationClerk') &&
        app.includes('emergencyReception') &&
        nav.includes('redirectStandalonePatientsForClerk')
      );
    },
  },
  {
    id: 'stack-07-governance-hubs',
    name: 'Text-deck hubs wired (maturity + platform intelligence)',
    kind: 'static',
    verify() {
      const routes = read('src/config/routes.config.js');
      const app = read('src/App.jsx');
      return (
        routes.includes('trackmind') ||
        app.includes('TrackMindMaturity') ||
        app.includes('PlatformIntelligenceHub')
      );
    },
  },
  {
    id: 'stack-08-qa-tooling',
    name: 'Playwright swarm + store stack',
    kind: 'static',
    verify() {
      const pkg = read('package.json');
      return pkg.includes('@playwright/test') && read('src/store/emergencyStore.ts').includes('zustand');
    },
  },
];

/** W09–W20: registration-clerk Playwright flows. */
const BROWSER_WORKERS = [
  {
    id: 'clerk-01-arrival-landing',
    name: 'Amina Reyes',
    path: '/emergency/reception',
    async run(page) {
      await expectVisible(page, '#reception-workspace-title', 'Reception title');
      await expectVisible(page, 'text=Arrivals & waiting lists', 'Arrival section');
      await expectVisible(page, 'text=Register walk-in', 'Primary register action');
      const navIds = await page.locator('[data-nav-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-nav-id')),
      );
      const allowed = new Set(['reception', 'patients', 'pulse', 'shift']);
      const blocked = new Set(['whiteboard', 'platform', 'copilot', 'analytics']);
      if (!navIds.every((id) => allowed.has(id))) {
        throw new Error(`Unexpected clerk nav: ${navIds.join(', ')}`);
      }
      if (navIds.some((id) => blocked.has(id))) {
        throw new Error(`Governance/clinical nav leaked for clerk: ${navIds.join(', ')}`);
      }
    },
  },
  {
    id: 'clerk-02-smart-intake',
    name: 'Jordan Park',
    path: '/emergency/reception',
    async run(page) {
      await page.getByRole('button', { name: 'Check ID & documents' }).click();
      await page.waitForTimeout(800);
      const overlay = await page.locator('.reception-smart-intake-overlay, .smart-intake').count();
      if (overlay === 0) throw new Error('Smart Intake overlay did not open');
    },
  },
  {
    id: 'clerk-03-express-register',
    name: 'Sofia Mendez',
    path: '/emergency/reception',
    async run(page) {
      await page.locator('.reception-workspace__action--wide').click();
      await page.waitForTimeout(600);
      const modal = await page.getByText('Register walk-in').count();
      if (modal === 0) throw new Error('Express registration did not open');
    },
  },
  {
    id: 'clerk-04-quick-create',
    name: 'Chris Okafor',
    path: '/emergency/reception',
    async run(page) {
      await page.getByRole('button', { name: 'Other arrivals' }).click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Register with symptoms' }).click();
      await page.waitForTimeout(600);
      const modal = await page.getByText(/quick create|register & send/i).count();
      if (modal === 0) throw new Error('Quick create did not open');
    },
  },
  {
    id: 'clerk-05-prepare-chooser',
    name: 'Priya Nair',
    path: '/emergency/reception',
    async run(page) {
      await page.getByRole('button', { name: 'Other arrivals' }).click();
      await page.waitForTimeout(500);
      const chooser = await page.getByText('How is this patient arriving?').count();
      if (chooser === 0) throw new Error('Prepare patient chooser did not open');
    },
  },
  {
    id: 'clerk-06-ems-tab',
    name: 'Liam Chen',
    path: '/emergency/reception?queue=ems',
    async run(page) {
      await expectVisible(page, '#reception-queue-tab-ems', 'EMS registration tab');
      await expectVisible(page, 'text=Incoming ambulances', 'EMS pre-arrival panel');
    },
  },
  {
    id: 'clerk-07-verification-tab',
    name: 'Elena Volkov',
    path: '/emergency/reception?queue=verification',
    async run(page) {
      await expectVisible(page, 'role=tab[name=/Need ID check/i]', 'Verification tab');
      const selected = await page.locator('#reception-queue-tab-verification[aria-selected="true"]').count();
      if (selected === 0) throw new Error('Verification tab not active from deep link');
    },
  },
  {
    id: 'clerk-08-pretriage-tab',
    name: 'Marcus Bell',
    path: '/emergency/reception?queue=pretriage',
    async run(page) {
      await expectVisible(page, 'role=tab[name=/Waiting for nurse/i]', 'Awaiting triage tab');
      const selected = await page.locator('#reception-queue-tab-pretriage[aria-selected="true"]').count();
      if (selected === 0) throw new Error('Pre-triage tab not active from deep link');
    },
  },
  {
    id: 'clerk-09-patients-route',
    name: 'Hannah Brooks',
    path: '/emergency/patients',
    async run(page) {
      if (!page.url().includes('/emergency/reception')) {
        throw new Error(`Clerk patients route should redirect to reception, got ${page.url()}`);
      }
      await expectVisible(page, '#reception-workspace-title', 'Reception after patients redirect');
    },
  },
  {
    id: 'clerk-10-whiteboard-guard',
    name: 'Noah Singh',
    path: '/emergency/whiteboard',
    async run(page) {
      if (!page.url().includes('/emergency/reception')) {
        throw new Error(`Clerk should be redirected to reception, got ${page.url()}`);
      }
    },
  },
  {
    id: 'clerk-11-no-triage-assist',
    name: 'Riley Ortiz',
    path: '/emergency/reception?queue=pretriage',
    async run(page) {
      await expectVisible(page, 'role=tab[name=/Waiting for nurse/i]', 'Awaiting triage tab');
      const assistPanel = await page.locator('[data-testid="ai-triage-assist-panel"]').count();
      if (assistPanel > 0) {
        throw new Error('Registration clerk must not see AI triage assist panel');
      }
    },
  },
  {
    id: 'clerk-12-search-dominance',
    name: 'Tessa Grant',
    path: '/emergency/reception',
    async run(page) {
      const search = page.getByRole('searchbox', { name: 'Patient search' });
      await search.fill('Amara');
      await page.waitForTimeout(800);
      const results = await page.locator('.patient-search-results, [data-patient-search-result]').count();
      if (results === 0) {
        const fallback = await page.getByText(/Amara/i).count();
        if (fallback === 0) throw new Error('Header patient search returned no results for Amara');
      }
      await expectVisible(page, '.reception-search-hint', 'Reception search hint');
    },
  },
];

const WORKERS = [...STATIC_WORKERS, ...BROWSER_WORKERS];

function authStorage(worker) {
  return {
    caredroid_access_token: `reception-worker-${worker.id}`,
    caredroid_user_profile: JSON.stringify({
      id: worker.id,
      email: `${worker.id}@caredroid.local`,
      name: worker.name,
      fullName: worker.name,
      role: 'registration_clerk',
      profile: { roleProfileId: 'registration_clerk' },
      isEmailVerified: true,
      twoFactorEnabled: false,
    }),
  };
}

async function expectVisible(page, selector, label, timeout = 30000) {
  const locator =
    selector.startsWith('text=') || selector.startsWith('role=')
      ? page.locator(selector).first()
      : page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout });
}

async function waitForReceptionReady(page) {
  await page.locator('#reception-workspace-title').waitFor({ state: 'visible', timeout: 45000 });
}

async function mockApi(route) {
  const url = route.request().url();
  if (url.includes('/emergency/reception/snapshot')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          emsArrivals: [
            {
              id: 'ems-demo-1',
              unitId: 'Medic 12',
              status: 'Inbound',
              etaMinutes: 9,
              estimatedArrivalTime: new Date(Date.now() + 9 * 60000).toISOString(),
              chiefComplaint: 'Chest pain',
              severity: 'High',
            },
          ],
          metrics: {},
        },
      }),
    });
    return;
  }
  if (url.includes('/patients/') && url.includes('/workspace')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { patient: { id: 'p5', firstName: 'Amara', lastName: 'Singh' } } }),
    });
    return;
  }
  await route.continue();
}

function runStaticWorker(worker) {
  const startedAt = Date.now();
  try {
    const ok = worker.verify();
    if (!ok) throw new Error(`Static check failed: ${worker.name}`);
    return {
      id: worker.id,
      name: worker.name,
      kind: 'static',
      status: 'pass',
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      id: worker.id,
      name: worker.name,
      kind: 'static',
      status: 'fail',
      durationMs: Date.now() - startedAt,
      error: error.message,
    };
  }
}

async function runBrowserWorker(browser, worker) {
  const startedAt = Date.now();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const jsErrors = [];

  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      localStorage.setItem(key, value);
    }
  }, authStorage(worker));

  await page.route('**/api/**', mockApi);
  page.on('pageerror', (error) => jsErrors.push(error.message));

  try {
    await page.goto(`${baseURL}${worker.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitForReceptionReady(page);

    const crash = await page.getByText(/encountered an error/i).count();
    if (crash > 0) throw new Error('Error boundary displayed');

    if (jsErrors.length) throw new Error(`JavaScript errors: ${jsErrors.join('; ')}`);

    await worker.run(page);

    mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: join(outDir, `${worker.id}.png`), fullPage: true });

    return {
      id: worker.id,
      name: worker.name,
      kind: 'browser',
      path: worker.path,
      status: 'pass',
      durationMs: Date.now() - startedAt,
      finalUrl: page.url(),
    };
  } catch (error) {
    mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: join(outDir, `${worker.id}-fail.png`), fullPage: true }).catch(() => {});
    return {
      id: worker.id,
      name: worker.name,
      kind: 'browser',
      path: worker.path,
      status: 'fail',
      durationMs: Date.now() - startedAt,
      finalUrl: page.url(),
      error: error.message,
      jsErrors,
    };
  } finally {
    await context.close();
  }
}

async function waitForServer() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL, { method: 'GET' });
      if (response.ok || response.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Frontend not reachable at ${baseURL}`);
}

async function main() {
  console.log(`Reception-first 20-worker swarm`);
  console.log(`Static stack inventory: ${STATIC_WORKERS.length} workers`);
  console.log(`Playwright clerk flows: ${BROWSER_WORKERS.length} workers\n`);

  const staticResults = STATIC_WORKERS.map(runStaticWorker);
  for (const result of staticResults) {
    const mark = result.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${result.id} (${result.name}) — ${result.durationMs}ms`);
    if (result.error) console.log(`         ${result.error}`);
  }

  const staticFailed = staticResults.filter((result) => result.status === 'fail').length;
  if (staticFailed > 0) {
    console.log(`\nStatic checks failed (${staticFailed}); skipping browser workers.`);
    writeReport(staticResults, []);
    process.exit(1);
  }

  console.log(`\nWaiting for frontend at ${baseURL}...`);
  await waitForServer();

  const browser = await chromium.launch();
  console.log(`Launching ${BROWSER_WORKERS.length} receptionist browser workers in parallel...\n`);

  const browserResults = await Promise.all(BROWSER_WORKERS.map((worker) => runBrowserWorker(browser, worker)));
  await browser.close();

  const allResults = [...staticResults, ...browserResults];
  writeReport(allResults, browserResults);

  const passed = allResults.filter((result) => result.status === 'pass').length;
  const failed = allResults.filter((result) => result.status === 'fail').length;

  console.log(`\nReception-first swarm: ${passed}/${WORKERS.length} passed (${staticResults.length} static + ${browserResults.length} browser)`);
  for (const result of browserResults) {
    const mark = result.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${result.id} (${result.name}) — ${result.durationMs}ms`);
    if (result.error) console.log(`         ${result.error}`);
  }
  console.log(`\nReport: ${reportPath}`);
  console.log(`Screenshots: ${outDir}`);

  if (failed > 0) process.exit(1);
}

function writeReport(allResults, browserResults) {
  const summary = {
    generatedAt: new Date().toISOString(),
    baseURL,
    role: 'registration_clerk',
    workers: WORKERS.length,
    staticWorkers: STATIC_WORKERS.length,
    browserWorkers: BROWSER_WORKERS.length,
    passed: allResults.filter((result) => result.status === 'pass').length,
    failed: allResults.filter((result) => result.status === 'fail').length,
    techStack: {
      frontend: 'React 18 + Vite + React Router + Zustand',
      backend: 'NestJS Emergency OS modules',
      qa: 'Playwright reception swarm + vitest audits',
      receptionFirst: 'receptionFirstUx.config.js enabled',
      governanceDeck: 'TrackMind / Customer Success / Enterprise / Platform Intelligence hubs',
    },
    results: allResults,
    browserSummary: browserResults.length
      ? {
          passed: browserResults.filter((result) => result.status === 'pass').length,
          failed: browserResults.filter((result) => result.status === 'fail').length,
        }
      : null,
    simplicity: {
      navItems: ['reception', 'patients', 'pulse', 'shift'],
      primaryAction: 'Register walk-in',
      blockedRoutes: ['/emergency/whiteboard'],
      intakeSurfaces: ['Check ID & documents', 'Register walk-in', 'Register with symptoms', 'Other arrivals'],
    },
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
