/**
 * Horizontal overflow detection for responsive QA.
 * Allows scroll inside designated data-table / chart scroll hosts only.
 */

const TOLERANCE_PX = 2;
const OVERLAP_TOLERANCE_PX = 3;

/** Selectors where horizontal scroll is permitted (must match page CSS). */
const ALLOWED_OVERFLOW_ANCESTORS = [
  '.catalog-table-wrap',
  '.fleet-data-table-wrap',
  '.logs-table-container',
  '.tool-card-table-wrap',
  '.cost-chart',
  '.dashboard-recs-row',
  '.journey-timeline__scroller',
  '.patient-detail__data-tabs',
];

/**
 * @param {import('@playwright/test').Page} page
 */
export async function measurePageOverflow(page) {
  return page.evaluate(({ tolerance, allowedAncestors }) => {
    const doc = document.documentElement;
    const docOverflow = doc.scrollWidth - doc.clientWidth;

    /** @type {{ selector: string, overflowPx: number, left?: number, width?: number, right: number, viewport: number }[]} */
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
          text: el.textContent?.trim().slice(0, 80) || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          overflowPx: Math.round(overflowRight),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
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

/**
 * Verify the app exposes a usable vertical scrollport when content exceeds the viewport.
 * @param {import('@playwright/test').Page} page
 */
export async function measureVerticalScrollAccess(page) {
  return page.evaluate(({ tolerance }) => {
    const scrollport =
      document.querySelector('.app-shell-page-body:not(.app-shell-page-body--conversation)') ||
      document.querySelector('.public-main') ||
      document.querySelector('.auth-shell') ||
      document.scrollingElement ||
      document.documentElement;
    const style = getComputedStyle(scrollport);
    const overflowAmount = scrollport.scrollHeight - scrollport.clientHeight;
    const needsScroll = overflowAmount > tolerance;
    const canScroll = /(auto|scroll)/.test(style.overflowY);
    const rect = scrollport.getBoundingClientRect();

    return {
      pass: rect.width > 0 && rect.height > 0 && (!needsScroll || canScroll),
      selector:
        scrollport.className && typeof scrollport.className === 'string'
          ? `.${scrollport.className.trim().split(/\s+/).join('.')}`
          : scrollport.tagName.toLowerCase(),
      clientHeight: Math.round(scrollport.clientHeight),
      scrollHeight: Math.round(scrollport.scrollHeight),
      overflowY: style.overflowY,
      needsScroll,
      canScroll,
    };
  }, { tolerance: TOLERANCE_PX });
}

/**
 * Detect suspicious visible overlaps where an interactive control covers sibling text
 * or another control. Parent-child intersections are expected and ignored.
 * @param {import('@playwright/test').Page} page
 */
export async function measureVisibleElementOverlaps(page) {
  return page.evaluate(({ tolerance }) => {
    const CONTROL_SELECTOR = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      'summary',
      '[role="button"]',
      '[role="link"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const TEXT_SELECTOR = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'label',
      'li',
      '.sidebar-tool-card-name',
      '.sidebar-tool-card-shortcut',
      '.sidebar-tool-card-desc',
      '.tool-meta h3',
      '.tool-shortcut',
    ].join(',');
    const IGNORE_SELECTOR = [
      '[data-qa-ignore-overlap]',
      '.notification-badge',
      '.app-shell-theme-fab',
      '.app-shell-menu-btn',
      '.app-shell-dev-mode-banner',
      '.app-shell-bottom-nav',
    ].join(',');

    const visibleRect = (el) => {
      if (!(el instanceof HTMLElement)) return null;
      if (el.closest(IGNORE_SELECTOR)) return null;
      const style = getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity || '1') === 0 ||
        style.pointerEvents === 'none'
      ) {
        return null;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) return null;
      if (rect.bottom <= 0 || rect.right <= 0) return null;
      if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) return null;
      return rect;
    };

    const selectorFor = (el) => {
      const id = el.id ? `#${el.id}` : '';
      const cls =
        typeof el.className === 'string' && el.className
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
          : '';
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 48);
      return `${el.tagName.toLowerCase()}${id}${cls}${label ? ` "${label}"` : ''}`;
    };

    const overlap = (a, b) => {
      const left = Math.max(a.left, b.left);
      const right = Math.min(a.right, b.right);
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      const width = right - left;
      const height = bottom - top;
      if (width <= tolerance || height <= tolerance) return null;
      return { left, top, width, height, area: width * height };
    };

    const controls = [...document.querySelectorAll(CONTROL_SELECTOR)]
      .map((el) => ({ el, rect: visibleRect(el) }))
      .filter((entry) => entry.rect);
    const textNodes = [...document.querySelectorAll(TEXT_SELECTOR)]
      .filter((el) => !el.closest(CONTROL_SELECTOR))
      .map((el) => ({ el, rect: visibleRect(el) }))
      .filter((entry) => entry.rect && (entry.el.textContent || '').trim().length > 0);
    const candidates = [...controls, ...textNodes];
    const offenders = [];

    for (let i = 0; i < controls.length; i += 1) {
      const a = controls[i];
      for (let j = 0; j < candidates.length; j += 1) {
        const b = candidates[j];
        if (a.el === b.el) continue;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (a.el.closest('[data-qa-overlap-group]') === b.el.closest('[data-qa-overlap-group]')) {
          continue;
        }
        const hit = overlap(a.rect, b.rect);
        if (!hit) continue;

        const controlArea = a.rect.width * a.rect.height;
        const otherArea = b.rect.width * b.rect.height;
        const areaRatio = hit.area / Math.min(controlArea, otherArea);
        if (areaRatio < 0.12) continue;

        offenders.push({
          control: selectorFor(a.el),
          overlapped: selectorFor(b.el),
          overlapPx: {
            width: Math.round(hit.width),
            height: Math.round(hit.height),
          },
          areaRatio: Number(areaRatio.toFixed(2)),
        });
      }
    }

    return {
      pass: offenders.length === 0,
      offenders: offenders.slice(0, 12),
      checked: {
        controls: controls.length,
        textNodes: textNodes.length,
      },
    };
  }, { tolerance: OVERLAP_TOLERANCE_PX });
}

export const QA_AUTH_STORAGE = {
  caredroid_access_token: 'responsive-qa-token',
  caredroid_user_profile: JSON.stringify({
    id: 'responsive-qa-user',
    email: 'qa@caredroid.local',
    name: 'Responsive QA',
    role: 'admin',
    fullName: 'Responsive QA',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }),
};

export const QA_TENANT_CONTEXT = {
  organizationId: 'qa-organization',
  organizationName: 'Responsive QA Hospital',
  workspaceId: 'operations',
  workspaceName: 'Operations Workspace',
  userId: 'responsive-qa-user',
  role: 'admin',
  subscriptionPlan: 'enterprise',
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
  await page.route('**/api/tenant/context**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(QA_TENANT_CONTEXT),
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
      const shell =
        document.querySelector('.app-shell-page-body') ||
        document.querySelector('.public-main') ||
        document.querySelector('.legal-page');
      if (loader) return false;
      if (!shell) return false;
      const rect = shell.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: 120_000 }
  );
}
