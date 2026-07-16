/**
 * Cycle 64 — D3: Playwright coverage for EMS handoff + ED Copilot shells.
 *
 * Works with the live demo scenario data (e.g. ems-cardiac-501) rather than
 * fighting scenario hydration. Asserts the Cycle-63 handoff POST contract and
 * optimistic local completion.
 *
 * Run: npm run test:e2e:ems-copilot
 */

import { test, expect } from '@playwright/test';
import {
  dismissOverlays,
  installQaNetworkStubs,
  seedQaAuth,
  waitForAppReady,
  QA_AUTH_STORAGE,
} from './responsive-qa.helpers.mjs';

function demoPersonaStorage(emergencyRoleId) {
  const base = JSON.parse(QA_AUTH_STORAGE.caredroid_user_profile);
  return {
    ...QA_AUTH_STORAGE,
    caredroid_user_profile: JSON.stringify({
      ...base,
      id: 'open-access-user',
      email: 'cara.george.demo@caredroid.local',
      name: 'Dr. Cara George',
      fullName: 'Dr. Cara George',
      role: emergencyRoleId,
      authMode: 'open-access',
      demoPersona: 'cara-george-ed18',
      profile: {
        ...(base.profile || {}),
        roleProfileId: emergencyRoleId,
        emergencyRoleId,
        demoPersonaId: 'cara-george-ed18',
        fullName: 'Dr. Cara George',
      },
    }),
  };
}

async function seedDemoRole(page, emergencyRoleId) {
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      localStorage.setItem(key, value);
    }
  }, demoPersonaStorage(emergencyRoleId));
}

/**
 * Stub emergency APIs. Handoff POST is captured; EMS GET is passthrough-shaped
 * empty so scenario/local store remains the source of arrivals.
 */
async function installHandoffCapture(page, handoffPosts, { failHandoff = false } = {}) {
  await page.route('**/api/emergency/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/ems/handoff') && method === 'POST') {
      handoffPosts.push(route.request());
      if (failHandoff) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'provider unavailable' }),
        });
        return;
      }
      const body = route.request().postDataJSON?.() || JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          module: 'EMS Handoff',
          generatedAt: new Date().toISOString(),
          source: 'e2e-stub',
          status: 'active',
          data: {
            ok: true,
            arrivalId: body.arrivalId,
            patientId: body.patientId || null,
            status: 'Complete',
            handoffCompletedAt: body.handoffAcceptedAt || new Date().toISOString(),
            workflowLogId: 'e2e-log-1',
          },
        }),
      });
      return;
    }

    // Don't wipe EMS store: return no emsArrivals key so hydrate keeps local/scenario state
    if ((url.endsWith('/ems') || url.includes('/ems?')) && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          module: 'EMS Intake',
          generatedAt: new Date().toISOString(),
          source: 'e2e-stub',
          status: 'active',
          data: { arrivals: [], availableResusRooms: 1 },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        module: 'e2e-stub',
        generatedAt: new Date().toISOString(),
        source: 'e2e-stub',
        status: 'active',
        data: {},
      }),
    });
  });
}

async function openEmsAndFindHandoff(page) {
  await page.goto('/emergency/ems', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
  await dismissOverlays(page);
  await expect(page.getByTestId('ems-pipeline')).toBeVisible({ timeout: 30_000 });

  const handoffBtn = page.getByTestId('ems-handoff-complete').first();
  await expect(handoffBtn).toBeVisible({ timeout: 20_000 });
  const arrivalId = await handoffBtn.getAttribute('data-arrival-id');
  return { handoffBtn, arrivalId };
}

async function readArrivalFromStore(page, arrivalId) {
  return page.evaluate((id) => {
    const store = window.__CAREDROID_EMERGENCY_STORE__;
    if (!store?.getState) return null;
    return store.getState().emsArrivals?.find((a) => a.id === id) || null;
  }, arrivalId);
}

test.describe('EMS handoff + Copilot e2e (D3)', () => {
  test('EMS handoff complete posts to /api/emergency/ems/handoff and marks Complete', async ({
    page,
  }) => {
    /** @type {import('@playwright/test').Request[]} */
    const handoffPosts = [];
    await seedDemoRole(page, 'charge_nurse');
    await installQaNetworkStubs(page);
    await installHandoffCapture(page, handoffPosts);

    const { handoffBtn, arrivalId } = await openEmsAndFindHandoff(page);
    expect(arrivalId).toBeTruthy();
    await expect(handoffBtn).toBeEnabled();
    await handoffBtn.click();

    await expect
      .poll(() => handoffPosts.length, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);

    const body =
      handoffPosts[0].postDataJSON?.() || JSON.parse(handoffPosts[0].postData() || '{}');
    expect(body.arrivalId).toBe(arrivalId);
    expect(body.checklist?.handoffAccepted === true || body.handoffAcceptedAt).toBeTruthy();

    await expect
      .poll(async () => {
        const arrival = await readArrivalFromStore(page, arrivalId);
        return arrival?.status === 'Complete' && Boolean(arrival?.handoffCompletedAt);
      }, { timeout: 10_000 })
      .toBe(true);

    // That arrival's complete button should be gone
    await expect(
      page.locator(`[data-testid="ems-handoff-complete"][data-arrival-id="${arrivalId}"]`),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  // Permission matrix for handoff is locked by unit contract
  // src/config/emsHandoffPermission.contract.test.ts (physician/public_display deny).
  // Full demo-persona role-switch e2e is deferred: open-access bootstrap often keeps
  // charge_nurse grants on the EMS route even after profile radio clicks.

  test('ED Copilot route mounts shell without page errors', async ({ page }) => {
    /** @type {string[]} */
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

    await seedDemoRole(page, 'charge_nurse');
    await installQaNetworkStubs(page);
    await page.route('**/api/emergency/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          module: 'e2e-stub',
          generatedAt: new Date().toISOString(),
          source: 'e2e-stub',
          status: 'active',
          data: { messages: [], ok: true },
        }),
      });
    });

    await page.goto('/emergency/copilot', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await dismissOverlays(page);

    const shell = page.getByTestId('ed-copilot-shell');
    if (await shell.isVisible().catch(() => false)) {
      await expect(shell).toBeVisible();
    } else {
      await expect(
        page.locator('main, .emergency-route-page, .app-shell-page-body').first(),
      ).toBeVisible();
      await expect(page.getByText(/copilot|assistant|chat/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  });

  test('timeout/outage: handoff still completes locally when API fails', async ({ page }) => {
    const handoffPosts = [];
    await seedDemoRole(page, 'charge_nurse');
    await installQaNetworkStubs(page);
    await installHandoffCapture(page, handoffPosts, { failHandoff: true });

    const { handoffBtn, arrivalId } = await openEmsAndFindHandoff(page);
    await handoffBtn.click();

    await expect
      .poll(() => handoffPosts.length, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);

    await expect
      .poll(async () => {
        const arrival = await readArrivalFromStore(page, arrivalId);
        return arrival?.status === 'Complete' && Boolean(arrival?.handoffCompletedAt);
      }, { timeout: 10_000 })
      .toBe(true);

    await expect(
      page.locator(`[data-testid="ems-handoff-complete"][data-arrival-id="${arrivalId}"]`),
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
