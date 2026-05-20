/**
 * Horizontal overflow detection for responsive QA.
 * Allows scroll inside designated data-table / chart scroll hosts only.
 */

const TOLERANCE_PX = 2;

/** Selectors where horizontal scroll is permitted (must match page CSS). */
const ALLOWED_OVERFLOW_ANCESTORS = [
  '.catalog-table-wrap',
  '.fleet-data-table-wrap',
  '.logs-table-container',
  '.tool-card-table-wrap',
  '.cost-chart',
];

/**
 * @param {import('@playwright/test').Page} page
 */
export async function measurePageOverflow(page) {
  return page.evaluate(({ tolerance, allowedAncestors }) => {
    const doc = document.documentElement;
    const docOverflow = doc.scrollWidth - doc.clientWidth;

    /** @type {{ selector: string, overflowPx: number, right: number, viewport: number }[]} */
    const offenders = [];

    if (docOverflow > tolerance) {
      offenders.push({
        selector: 'documentElement',
        overflowPx: docOverflow,
        right: doc.scrollWidth,
        viewport: doc.clientWidth,
      });
    }

    const vw = doc.clientWidth;
    const nodes = document.querySelectorAll('body *');

    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.closest('[data-qa-ignore-overflow]')) continue;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;

      if (el.closest('table')) continue;
      let allowed = false;
      for (const sel of allowedAncestors) {
        if (el.closest(sel)) {
          allowed = true;
          break;
        }
      }
      if (allowed) continue;

      const overflowRight = rect.right - vw;
      if (overflowRight > tolerance) {
        const id = el.id ? `#${el.id}` : '';
        const cls =
          typeof el.className === 'string' && el.className
            ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
            : el.tagName.toLowerCase();
        offenders.push({
          selector: `${el.tagName.toLowerCase()}${id}${cls}`,
          overflowPx: Math.round(overflowRight),
          right: Math.round(rect.right),
          viewport: vw,
        });
      }
    }

    offenders.sort((a, b) => b.overflowPx - a.overflowPx);
    return {
      pass: offenders.length === 0,
      docOverflowPx: docOverflow,
      offenders: offenders.slice(0, 8),
    };
  }, { tolerance: TOLERANCE_PX, allowedAncestors: ALLOWED_OVERFLOW_ANCESTORS });
}

export const QA_AUTH_STORAGE = {
  caredroid_access_token: 'responsive-qa-token',
  caredroid_user_profile: JSON.stringify({
    id: 'responsive-qa-user',
    email: 'qa@caredroid.local',
    name: 'Responsive QA',
    role: 'physician',
    fullName: 'Responsive QA',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
};

/**
 * @param {import('@playwright/test').Page} page
 */
export async function seedQaAuth(page) {
  await page.addInitScript((storage) => {
    for (const [key, value] of Object.entries(storage)) {
      localStorage.setItem(key, value);
    }
  }, QA_AUTH_STORAGE);
}

/**
 * Stub slow backend calls so layout QA does not flake when API is down.
 * @param {import('@playwright/test').Page} page
 */
export async function installQaNetworkStubs(page) {
  const profile = JSON.parse(QA_AUTH_STORAGE.caredroid_user_profile);
  await page.route('**/api/users/profile**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile),
    });
  });
  await page.route('**/api/tools**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tools: [], count: 0 }),
    });
  });

  await page.route('**/api/config/system**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ rag: { enabled: true }, session: { idleTimeoutMs: 1800000 } }),
    });
  });

  await page.route('**/api/ai/remaining-queries**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ remaining: 100, limit: 100 }),
    });
  });

  await page.route('**/api/subscriptions/current**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plan: 'professional', status: 'active' }),
    });
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function dismissOverlays(page) {
  const backdrop = page.locator('.app-shell-nav-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ force: true }).catch(() => {});
  }
}

/**
 * Wait until route shell and lazy chunks finish (Suspense `PageLoader` cleared).
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAppReady(page) {
  await page.waitForFunction(
    () => !document.querySelector('.app-init-screen'),
    undefined,
    { timeout: 30_000 }
  );

  await page.waitForFunction(
    () => {
      const loader = document.querySelector('.page-loader');
      const shell = document.querySelector('.app-shell-page-body');
      if (loader) return false;
      if (!shell) return false;
      const rect = shell.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: 120_000 }
  );
}
