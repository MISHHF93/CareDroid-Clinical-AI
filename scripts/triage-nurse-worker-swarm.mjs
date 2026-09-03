/**
 * Triage nurse worker validates AI-assist confirm → waiting flow.
 * Run: node scripts/triage-nurse-worker-swarm.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'qa', 'screenshots', 'triage-nurse-workers');
const reportPath = join(root, 'qa', 'triage-nurse-worker-swarm-report.json');
const baseURL = process.env.QA_BASE_URL || 'http://localhost:3000';

const WORKER = {
  id: 'triage-nurse-01-assist-accept',
  name: 'Casey Morgan',
  role: 'triage_nurse',
};

function authStorage(worker) {
  return {
    caredroid_access_token: `triage-worker-${worker.id}`,
    caredroid_user_profile: JSON.stringify({
      id: worker.id,
      email: `${worker.id}@caredroid.local`,
      name: worker.name,
      fullName: worker.name,
      role: worker.role,
      isEmailVerified: true,
      twoFactorEnabled: false,
    }),
  };
}

async function mockApi(route) {
  const url = route.request().url();
  if (url.includes('/emergency/reception/snapshot')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        emsArrivals: [],
        patients: [],
        metrics: {},
      }),
    });
    return;
  }
  if (url.includes('/emergency/triage/assist') || url.includes('/emergency/reception/handoff')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        module: 'Triage Assist',
        data: { ok: true },
      }),
    });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, data: {} }),
  });
}

async function run() {
  const startedAt = Date.now();
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const jsErrors = [];

  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      localStorage.setItem(key, value);
    }
  }, authStorage(WORKER));

  await page.route('**/api/**', mockApi);
  page.on('pageerror', (error) => jsErrors.push(error.message));

  let status = 'pass';
  let error = null;

  try {
    await page.goto(`${baseURL}/emergency/reception`, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const store = window.__CAREDROID_EMERGENCY_STORE__;
      if (!store) throw new Error('Emergency store QA hook unavailable');
      const state = store.getState();
      let target =
        state.patients.find(
          (patient) =>
            patient.state === 'Triage' && patient.triageAssist && !patient.triageAssist.dismissedAt,
        ) || state.patients.find((patient) => patient.state === 'Triage');
      if (!target) {
        throw new Error(`No triage patient in store (${state.patients.length} patients)`);
      }
      if (!target.triageAssist || target.triageAssist.dismissedAt) {
        state.updatePatient(target.id, {
          triageAssist: {
            suggestedPriority: target.priority || 'P2',
            suggestedQueue: 'Emergent',
            rationale: ['QA worker seeded triage assist'],
            confidence: 'high',
            ruleTriggered: 'qa-seed',
            disclaimers: [
              'Human review required. This is not a replacement for clinical judgment.',
            ],
            requiresHumanReview: true,
            generatedAt: new Date().toISOString(),
            source: 'rules',
          },
        });
      }
      window.__QA_TRIAGE_PATIENT_ID__ = target.id;
    });

    const patientId = await page.evaluate(() => window.__QA_TRIAGE_PATIENT_ID__);
    if (!patientId) throw new Error('Failed to resolve triage patient id');

    await page.goto(`${baseURL}/emergency/reception?queue=pretriage&patient=${patientId}`, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });
    await page.waitForTimeout(1500);

    if (jsErrors.length) {
      throw new Error(`JavaScript errors: ${jsErrors.join('; ')}`);
    }

    const pretriageTab = page.locator('#reception-queue-tab-pretriage');
    await pretriageTab.waitFor({ state: 'visible', timeout: 10000 });
    await pretriageTab.click();
    await page.waitForTimeout(400);

    const patientRow = page.locator('.reception-work-queues__item').first();
    if (await patientRow.count()) {
      await patientRow.click();
      await page.waitForTimeout(600);
    }

    const assistPanel = page.locator('[data-testid="ai-triage-assist-panel"]');
    await assistPanel.waitFor({ state: 'visible', timeout: 15000 });

    await page.getByRole('button', { name: /Accept suggestion/i }).click();
    await page.waitForTimeout(1000);

    const stillVisible = await assistPanel.isVisible().catch(() => false);
    if (stillVisible) {
      throw new Error('Assist panel still visible after accept — patient may not have advanced');
    }

    await page.screenshot({ path: join(outDir, `${WORKER.id}.png`), fullPage: true });
  } catch (err) {
    status = 'fail';
    error = err.message;
    await page
      .screenshot({ path: join(outDir, `${WORKER.id}-fail.png`), fullPage: true })
      .catch(() => {});
  } finally {
    await context.close();
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseURL,
    durationMs: Date.now() - startedAt,
    workers: [
      {
        ...WORKER,
        status,
        error,
        jsErrors,
      },
    ],
    summary: {
      total: 1,
      passed: status === 'pass' ? 1 : 0,
      failed: status === 'pass' ? 0 : 1,
    },
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Triage nurse worker: ${status}`);
  if (error) console.error(error);
  process.exit(status === 'pass' ? 0 : 1);
}

run();
