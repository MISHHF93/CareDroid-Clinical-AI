/**
 * Twelve parallel receptionist workers exercise the registration-clerk experience.
 * Run: node scripts/receptionist-worker-swarm.mjs
 * Requires: npm run dev (or QA_BASE_URL pointing at a running frontend)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'qa', 'screenshots', 'reception-workers');
const reportPath = join(root, 'qa', 'receptionist-worker-swarm-report.json');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:8000';

const WORKERS = [
  {
    id: 'clerk-01-arrival-landing',
    name: 'Amina Reyes',
    path: '/emergency/reception',
    async run(page) {
      await expectVisible(page, '#reception-workspace-title', 'Reception title');
      await expectVisible(page, 'text=Queues & arrivals', 'Arrival section');
      await expectVisible(page, 'text=Register walk-in', 'Primary register action');
      const navIds = await page.locator('[data-nav-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-nav-id')),
      );
      if (!navIds.every((id) => ['reception', 'patients'].includes(id))) {
        throw new Error(`Unexpected clerk nav: ${navIds.join(', ')}`);
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
      if (page.url().includes('/emergency/reception')) {
        throw new Error('Patients route redirected away unexpectedly');
      }
      await expectVisible(page, 'text=/patient/i', 'Patients page content');
    },
  },
  {
    id: 'clerk-10-whiteboard-guard',
    name: 'Noah Singh',
    path: '/emergency/whiteboard',
    async run(page) {
      await page.waitForTimeout(1200);
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
      await page.waitForTimeout(500);
      const results = await page.locator('.patient-search-results, [data-patient-search-result]').count();
      if (results === 0) {
        const fallback = await page.getByText(/Amara/i).count();
        if (fallback === 0) throw new Error('Header patient search returned no results for Amara');
      }
      await expectVisible(page, '.reception-search-hint', 'Reception search hint');
    },
  },
];

function authStorage(worker) {
  return {
    caredroid_access_token: `reception-worker-${worker.id}`,
    caredroid_user_profile: JSON.stringify({
      id: worker.id,
      email: `${worker.id}@caredroid.local`,
      name: worker.name,
      fullName: worker.name,
      role: 'registration_clerk',
      isEmailVerified: true,
      twoFactorEnabled: false,
    }),
  };
}

async function expectVisible(page, selector, label) {
  const locator = selector.startsWith('text=') || selector.startsWith('role=')
    ? page.locator(selector).first()
    : page.locator(selector).first();
  const count = await locator.count();
  if (count === 0) throw new Error(`${label} not found (${selector})`);
}

async function mockApi(route) {
  const url = route.request().url();
  if (url.includes('/emergency/reception/snapshot')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
        patients: [],
        metrics: {},
      }),
    });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: {} }) });
}

async function runWorker(browser, worker) {
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
    await page.goto(`${baseURL}${worker.path}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1000);

    const crash = await page.getByText(/encountered an error/i).count();
    if (crash > 0) throw new Error('Error boundary displayed');

    if (jsErrors.length) throw new Error(`JavaScript errors: ${jsErrors.join('; ')}`);

    await worker.run(page);

    mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: join(outDir, `${worker.id}.png`), fullPage: true });

    return {
      id: worker.id,
      name: worker.name,
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
  console.log(`Waiting for frontend at ${baseURL}...`);
  await waitForServer();

  const browser = await chromium.launch();
  console.log(`Launching ${WORKERS.length} receptionist workers in parallel...`);

  const results = await Promise.all(WORKERS.map((worker) => runWorker(browser, worker)));
  await browser.close();

  const summary = {
    generatedAt: new Date().toISOString(),
    baseURL,
    role: 'registration_clerk',
    workers: WORKERS.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: results.filter((result) => result.status === 'fail').length,
    results,
    simplicity: {
      navItems: ['reception', 'patients'],
      primaryAction: 'Register walk-in',
      blockedRoutes: ['/emergency/whiteboard'],
      intakeSurfaces: ['Check ID & documents', 'Register walk-in', 'Register with symptoms', 'Other arrivals'],
    },
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`\nReceptionist worker swarm: ${summary.passed}/${summary.workers} passed`);
  for (const result of results) {
    const mark = result.status === 'pass' ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${result.id} (${result.name}) — ${result.durationMs}ms`);
    if (result.error) console.log(`         ${result.error}`);
  }
  console.log(`\nReport: ${reportPath}`);
  console.log(`Screenshots: ${outDir}`);

  if (summary.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
