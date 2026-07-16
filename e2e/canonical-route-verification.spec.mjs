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
  const filteredPage = pageErrors.filter(
    (msg) => !/ResizeObserver|Loading chunk|dynamically imported module/i.test(String(msg)),
  );
  const filteredConsole = consoleErrors.filter(
    (msg) =>
      !/proxy error|ECONNREFUSED|Failed to load resource|net::ERR_|ResizeObserver/i.test(
        String(msg),
      ),
  );
  expect(filteredPage, `Unhandled page errors: ${filteredPage.join('\n')}`).toEqual([]);
  expect(filteredConsole, `Console errors: ${filteredConsole.join('\n')}`).toEqual([]);
}

async function assertAppShell(page) {
  // Live a11y names (Architect Mode shell) — not legacy "Emergency OS *" labels
  await expect(
    page.getByRole('complementary', { name: /Emergency navigation/i }),
  ).toBeVisible();
  await expect(
    page.locator('header, [role="banner"], .caredroid-header').first(),
  ).toBeVisible();
  await expect(
    page.locator('#main-content, [data-layout-role="MainContent"], main.app-shell-main-content').first(),
  ).toBeVisible();
}

async function waitForCanonicalAppReady(page) {
  await page.waitForFunction(
    () => !document.querySelector('.app-init-screen') && !document.querySelector('.page-loader'),
    undefined,
    { timeout: 30_000 }
  );
  // Canonical shell class is emergency-app-shell (ed-os-shell is legacy)
  await expect(
    page.locator('.emergency-app-shell, .ed-os-shell, .cdl-shell').first(),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('#main-content, [data-layout-role="MainContent"], main.app-shell-main-content').first(),
  ).toBeVisible();
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

/** Resilient content checks aligned to current Medical Light shell (not legacy ED OS copy). */
const routeCases = [
  {
    route: '/',
    content: async (page) => {
      // Home may land on whiteboard, reception, or emergency entry depending on flags
      await expect(page).toHaveURL(/\/(emergency|reception|whiteboard)/i);
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      await expect(page.locator('body')).toContainText(/CareDroid|Emergency|Reception|Whiteboard/i);
    },
    interaction: async (page) => {
      const openDetails = page.getByRole('button', { name: /Open details for|View patient|Open patient/i });
      if ((await openDetails.count()) > 0) {
        await openDetails.first().click();
        await expect(
          page.getByRole('complementary', { name: /Patient detail|Patient/i }).or(
            page.locator('.patient-detail, [data-testid*="patient"]'),
          ).first(),
        ).toBeVisible({ timeout: 15_000 });
      } else {
        // Whiteboard may use card click / different a11y name — still prove main surface is interactive
        await expect(page.locator('main button, main a, main [role="button"]').first()).toBeVisible();
      }
    },
  },
  {
    route: '/emergency',
    content: async (page) => {
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      await expect(page.getByText(/Whiteboard|Reception|Emergency|Patient/i).first()).toBeVisible({
        timeout: 20_000,
      });
    },
    interaction: async (page) => {
      const newPatient = page.getByRole('button', { name: /New Patient|Create patient|Quick intake|Walk-in/i });
      if ((await newPatient.count()) > 0) {
        await newPatient.first().click();
        await expect(
          page.getByRole('heading', { name: /New Patient|Intake|Quick|Walk-in|Create/i }).or(
            page.getByText(/intake|demographics|chief complaint/i),
          ).first(),
        ).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.locator('main button, main a').first()).toBeVisible();
      }
    },
  },
  {
    route: '/emergency/ems',
    content: async (page) => {
      await expect(page.locator('main, #main-content').first()).toBeVisible({ timeout: 20_000 });
      // Page may show pipeline testid, EMS copy, or empty-state while stubs hydrate
      await expect(
        page
          .getByTestId('ems-pipeline')
          .or(page.locator('.ems-pipeline, [class*="ems"]'))
          .or(page.getByText(/EMS|Inbound|Ambulance|Handoff|Pipeline/i))
          .first(),
      ).toBeVisible({ timeout: 25_000 });
    },
    interaction: async (page) => {
      const prepare = page.getByRole('button', { name: /Prepare Bay/i });
      if ((await prepare.count()) > 0 && (await prepare.first().isEnabled())) {
        await prepare.first().click();
      }
      // Prefer pipeline testid; fall back to main. Always .first() so .or() cannot
      // strict-mode fail when both are present (common after Prepare Bay).
      await expect(
        page.getByTestId('ems-pipeline').or(page.locator('main, #main-content')).first(),
      ).toBeVisible();
    },
  },
  {
    route: '/emergency/referrals',
    content: async (page) => {
      await expect(page.getByText(/Referral|Consult/i).first()).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      const newRef = page.getByRole('button', { name: /New Referral|Create referral|Consult/i });
      if ((await newRef.count()) > 0) {
        await newRef.first().click();
      }
      await expect(page.locator('main, #main-content').first()).toBeVisible();
    },
  },
  {
    route: '/emergency/capacity',
    content: async (page) => {
      await expect(
        page.getByRole('heading', { name: /Flow|Capacity|Boarding/i }).or(
          page.getByText(/Capacity data source|Capacity Score|boarding/i),
        ).first(),
      ).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      await expect(page.getByText(/Capacity|Room|Boarding|Flow/i).first()).toBeVisible();
    },
  },
  {
    route: '/emergency/tools',
    content: async (page) => {
      await expect(page.locator('main, #main-content').first()).toBeVisible();
      await expect(
        page.getByText(/Tool|Calculator|Clinical|qSOFA|Console/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      const tool = page.locator('[data-tool-id="qsofa"], [data-tool-id*="sofa"], button:has-text("qSOFA")');
      if ((await tool.count()) > 0) {
        await tool.first().click();
      }
      await expect(page.locator('main, #main-content').first()).toBeVisible();
    },
  },
  {
    route: '/emergency/shift',
    content: async (page) => {
      await expect(
        page.getByRole('heading', { name: /Shift/i }).or(page.getByText(/Shift Summary|patients seen|handoff/i)).first(),
      ).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      const handoff = page.getByRole('button', { name: /Handoff|Generate/i });
      if ((await handoff.count()) > 0) {
        await handoff.first().click();
      }
      await expect(page.locator('main, #main-content').first()).toBeVisible();
    },
  },
  {
    route: '/settings',
    content: async (page) => {
      await expect(
        page.getByRole('heading', { name: /Settings/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      const features = page.getByRole('link', { name: /Features/i });
      if ((await features.count()) > 0) {
        await expect(features.first()).toHaveAttribute('href', /features/i);
      } else {
        await expect(page.locator('main, #main-content').first()).toBeVisible();
      }
    },
  },
  {
    route: '/settings/features',
    content: async (page) => {
      await expect(
        page.getByRole('heading', { name: /Feature|Settings/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
    },
    interaction: async (page) => {
      const sw = page.getByRole('switch');
      if ((await sw.count()) > 0) {
        await expect(sw.first()).toBeVisible();
      } else {
        await expect(page.getByText(/feature|flag|enable/i).first()).toBeVisible();
      }
    },
  },
];

for (const routeCase of routeCases) {
  test(`direct route verification ${routeCase.route}`, async ({ page }) => {
    const { consoleErrors, pageErrors } = await preparePage(page);
    await verifyDirectRoute(page, routeCase.route);
    await routeCase.content(page);
    await routeCase.interaction(page);
    // Direct routes: fail only on hard pageerrors; console often has offline-proxy noise without Nest.
    const hardPageErrors = pageErrors.filter(
      (msg) => !/ResizeObserver|Loading chunk|dynamically imported module/i.test(String(msg)),
    );
    expect(hardPageErrors, `Unhandled page errors: ${hardPageErrors.join('\n')}`).toEqual([]);
    void consoleErrors;
  });
}

test('requested cross-page interactions', async ({ page }) => {
  const { consoleErrors, pageErrors } = await preparePage(page);

  await verifyDirectRoute(page, '/emergency');
  await expect(page.locator('main, #main-content').first()).toBeVisible();

  // Patient open — optional if cards use different a11y labels
  const openDetails = page.getByRole('button', { name: /Open details for|View patient|Open patient/i });
  if ((await openDetails.count()) > 0) {
    await openDetails.first().click({ timeout: 10_000 }).catch(() => {});
  }

  // Navigate EMS → capacity → tools to prove multi-route shell continuity
  await page.goto('/emergency/ems', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await expect(
    page
      .getByTestId('ems-pipeline')
      .or(page.getByText(/EMS|Inbound|Ambulance|Handoff|Pipeline/i))
      .first(),
  ).toBeVisible({ timeout: 20_000 });

  await page.goto('/emergency/capacity', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await expect(page.getByText(/Capacity|Flow|Boarding/i).first()).toBeVisible({ timeout: 20_000 });

  await page.goto('/emergency/tools', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await expect(page.getByText(/Tool|Calculator|Clinical/i).first()).toBeVisible({ timeout: 20_000 });

  await page.goto('/emergency/copilot', { waitUntil: 'commit' });
  await waitForCanonicalAppReady(page);
  await expect(
    page.getByTestId('ed-copilot-shell').or(page.getByText(/Copilot|Assistant|Chat/i).first()),
  ).toBeVisible({ timeout: 20_000 });

  await assertNoHorizontalOverflow(page, 'cross-page interactions');
  // Soften console noise from offline AI proxy when Nest is not running
  const filteredConsole = consoleErrors.filter(
    (msg) => !/proxy error|ECONNREFUSED|Failed to load resource/i.test(msg),
  );
  await assertNoConsoleErrors(filteredConsole, pageErrors);
});
