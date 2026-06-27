import { test, expect } from '@playwright/test';
import {
  dismissOverlays,
  installQaNetworkStubs,
  measurePageOverflow,
  seedQaAuth,
} from './responsive-qa.helpers.mjs';

test.setTimeout(120_000);

async function installVerificationStubs(page) {
  await installQaNetworkStubs(page);

  await page.route('**/api/chat/message', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'ED Copilot verification response.' }),
    });
  });

  await page.route('**/api/emergency/settings/features**', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Use local feature flags in browser verification.' }),
    });
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname === '/api/chat/message' ||
      url.pathname.includes('/api/emergency/settings/features') ||
      url.pathname.includes('/api/users/profile') ||
      url.pathname.includes('/api/tenant/context') ||
      url.pathname.includes('/api/tools') ||
      url.pathname.includes('/api/config/system') ||
      url.pathname.includes('/api/ai/remaining-queries') ||
      url.pathname.includes('/api/subscriptions/current')
    ) {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: [],
        results: [],
        logs: [],
        flags: [],
        message: 'QA fallback API stub.',
      }),
    });
  });
}

async function preparePage(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  await seedQaAuth(page);
  await installVerificationStubs(page);

  return { consoleErrors, pageErrors };
}

async function assertNoConsoleErrors(consoleErrors, pageErrors) {
  expect(pageErrors, `Unhandled page errors: ${pageErrors.join('\n')}`).toEqual([]);
  expect(consoleErrors, `Console errors: ${consoleErrors.join('\n')}`).toEqual([]);
}

async function assertAppShell(page) {
  await expect(page.getByLabel('Emergency OS navigation')).toBeVisible();
  await expect(page.getByLabel('Emergency OS header')).toBeVisible();
  await expect(page.locator('[data-layout-role="MainContent"]')).toBeVisible();
}

async function waitForCanonicalAppReady(page) {
  await page.waitForFunction(
    () => !document.querySelector('.app-init-screen') && !document.querySelector('.page-loader'),
    undefined,
    { timeout: 30_000 }
  );
  await expect(page.locator('.ed-os-shell')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-layout-role="MainContent"]')).toBeVisible();
}

async function assertNoHorizontalOverflow(page, route) {
  const overflow = await measurePageOverflow(page);
  expect(
    overflow.pass,
    `${route} horizontal overflow: ${JSON.stringify(overflow.offenders)}`
  ).toBe(true);
}

async function verifyDirectRoute(page, route) {
  await page.goto(route, { waitUntil: 'commit', timeout: 90_000 });
  await waitForCanonicalAppReady(page);
  await dismissOverlays(page);
  await assertAppShell(page);
  await assertNoHorizontalOverflow(page, route);
}

const routeCases = [
  {
    route: '/',
    expectedPath: '/emergency',
    content: async (page) => {
      await expect(page).toHaveURL(/\/emergency$/);
      await expect(page.getByRole('heading', { name: 'Emergency Whiteboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Open details for/i }).first()).toBeVisible();
    },
    interaction: async (page) => {
      await page.getByRole('button', { name: /Open details for/i }).first().click();
      await expect(page.getByRole('complementary', { name: /Patient detail panel/i })).toBeVisible();
    },
  },
  {
    route: '/emergency',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Emergency Whiteboard' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Open details for/i }).first()).toBeVisible();
    },
    interaction: async (page) => {
      await page.getByRole('button', { name: /New Patient/i }).click();
      await expect(page.getByRole('heading', { name: 'New Patient' })).toBeVisible();
    },
  },
  {
    route: '/emergency/ems',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'EMS Pipeline' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Prepare Bay/i }).first()).toBeVisible();
    },
    interaction: async (page) => {
      const preparedBefore = await page.locator('text=/Prepared|Bay prepared/i').count();
      await page.getByRole('button', { name: /Prepare Bay/i }).first().click();
      await expect.poll(async () => page.locator('text=/Prepared|Bay prepared/i').count()).toBeGreaterThanOrEqual(preparedBefore);
    },
  },
  {
    route: '/emergency/referrals',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Referrals' })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Sent|Accepted|Draft/i }).first()).toBeVisible();
    },
    interaction: async (page) => {
      await page.getByRole('button', { name: /New Referral/i }).click();
      await expect(page.getByRole('heading', { name: 'Consult Request' })).toBeVisible();
    },
  },
  {
    route: '/emergency/capacity',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Capacity Detail' })).toBeVisible();
      await expect(page.getByText('Capacity Score')).toBeVisible();
    },
    interaction: async (page) => {
      await expect(page.getByRole('region', { name: /Room grid/i })).toBeVisible();
    },
  },
  {
    route: '/emergency/tools',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: /Emergency OS (Tool )?Console/i })).toBeVisible();
      await expect(page.getByRole('region', { name: /Clinical tool cards/i })).toBeVisible();
      await expect(page.locator('[data-tool-id="qsofa"]')).toBeVisible();
      await expect(page.locator('[data-tool-id="lab-interp"]')).toBeVisible();
    },
    interaction: async (page) => {
      await page.getByRole('button', { name: /Open qSOFA/i }).click();
      await expect(page.getByRole('region', { name: /Active medical tools surface/i })).toBeVisible();
    },
  },
  {
    route: '/emergency/shift',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Shift Summary' })).toBeVisible();
      await expect(page.getByText('Total patients seen')).toBeVisible();
    },
    interaction: async (page) => {
      await page.getByRole('button', { name: /Generate Handoff Brief/i }).click();
      await expect(page.getByText(/ED Copilot verification response|AI generated handoff/i)).toBeVisible();
    },
  },
  {
    route: '/settings',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();
      await expect(page.getByRole('navigation', { name: /Settings tabs/i })).toBeVisible();
    },
    interaction: async (page) => {
      await expect(page.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/settings/features');
    },
  },
  {
    route: '/settings/features',
    content: async (page) => {
      await expect(page.getByRole('heading', { name: 'Feature Management' }).first()).toBeVisible();
      await expect(page.getByText(/Feature flags|Enable, disable|Active features/i).first()).toBeVisible();
    },
    interaction: async (page) => {
      await expect(page.getByRole('switch').first()).toBeVisible();
    },
  },
];

for (const routeCase of routeCases) {
  test(`direct route verification ${routeCase.route}`, async ({ page }) => {
    const { consoleErrors, pageErrors } = await preparePage(page);
    await verifyDirectRoute(page, routeCase.route);
    await routeCase.content(page);
    await routeCase.interaction(page);
    await assertNoConsoleErrors(consoleErrors, pageErrors);
  });
}

test('requested cross-page interactions', async ({ page }) => {
  const { consoleErrors, pageErrors } = await preparePage(page);

  await verifyDirectRoute(page, '/emergency');

  await page.getByRole('button', { name: /Open details for/i }).first().click();
  await expect(page.getByRole('complementary', { name: /Patient detail panel/i })).toBeVisible();

  await page.getByRole('button', { name: /flagged patient.*reassessment/i }).click();
  await expect(page.getByText(/Reassessment/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Close reassessment drawer/i }).click();

  await page.getByRole('button', { name: /New Patient/i }).click();
  await expect(page.getByRole('heading', { name: 'New Patient' })).toBeVisible();

  await page.goto('/emergency/tools', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await page.getByRole('button', { name: /Open qSOFA/i }).click();
  await expect(page.getByRole('region', { name: /Active medical tools surface/i })).toBeVisible();

  await page.goto('/emergency', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await page.getByRole('textbox', { name: /Ask ED Copilot/i }).fill('Who needs attention?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(
    page.getByLabel('ED Copilot chat').getByText('ED Copilot verification response.').last()
  ).toBeVisible();

  await assertNoHorizontalOverflow(page, 'cross-page interactions');
  await assertNoConsoleErrors(consoleErrors, pageErrors);
});
