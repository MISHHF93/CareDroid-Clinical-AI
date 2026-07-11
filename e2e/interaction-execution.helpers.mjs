/**
 * Helpers for interaction-execution Playwright suite.
 */

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ token?: string, profile?: Record<string, unknown> }} [options]
 */
export async function seedInteractionAuth(page, options = {}) {
  const token = options.token || process.env.QA_AUTH_TOKEN || 'interaction-execution-token';
  const profile = options.profile || {
    id: 'interaction-execution-user',
    email: 'interaction-execution@caredroid.local',
    name: 'Interaction Execution',
    role: 'physician',
    fullName: 'Interaction Execution',
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  await page.addInitScript(
    ({ authToken, userProfile }) => {
      localStorage.setItem('caredroid_access_token', authToken);
      localStorage.setItem('caredroid_user_profile', JSON.stringify(userProfile));
    },
    { authToken: token, userProfile: profile },
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForShellReady(page) {
  await page.waitForLoadState('domcontentloaded');
  // Prefer shell landmarks when present; fall back to body.
  const shell = page.locator('.app-shell, [data-testid="app-shell"], main, #root');
  await shell.first().waitFor({ state: 'visible', timeout: 45_000 });
  // Give React a beat for route content
  await page.waitForTimeout(400);
}

/**
 * Dismiss common overlays that block clicks.
 * @param {import('@playwright/test').Page} page
 */
export async function dismissBlockingOverlays(page) {
  const candidates = [
    page.getByRole('button', { name: /close|dismiss|got it|accept|continue/i }).first(),
    page.locator('[aria-label="Close"], .modal-close, .drawer-close').first(),
  ];
  for (const loc of candidates) {
    try {
      if (await loc.isVisible({ timeout: 500 })) {
        await loc.click({ timeout: 1000 }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * Collect visible actionable controls on the page.
 * @param {import('@playwright/test').Page} page
 * @param {{ max?: number }} [options]
 */
export async function collectActionableControls(page, options = {}) {
  const max = options.max ?? 24;
  return page.evaluate((limit) => {
    const selectors = [
      'button:not([disabled])',
      '[role="button"]:not([aria-disabled="true"])',
      'a[href]',
      'input[type="submit"]:not([disabled])',
    ];
    /** @type {{ selector: string, name: string, tag: string, href: string | null, disabled: boolean }[]} */
    const items = [];
    const seen = new Set();

    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.closest('[data-interaction-skip="true"]')) continue;
        if (el.closest('[aria-hidden="true"]')) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          continue;
        }
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

        const name = (
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.textContent ||
          ''
        )
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);
        const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') : null;
        // Skip external and pure hash
        if (href && /^(https?:|mailto:|tel:)/i.test(href)) continue;
        const key = `${el.tagName}:${name}:${href || ''}:${Math.round(rect.top)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Build a stable locator hint
        let selector = el.tagName.toLowerCase();
        if (el.id) selector = `#${CSS.escape(el.id)}`;
        else if (name) selector = `${selector} >> text=${JSON.stringify(name).slice(0, 40)}`;

        items.push({
          selector,
          name: name || '(unnamed)',
          tag: el.tagName.toLowerCase(),
          href,
          disabled: el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true',
          hasDisabledReason: Boolean(
            el.getAttribute('title') ||
              el.getAttribute('aria-describedby') ||
              el.getAttribute('data-disabled-reason'),
          ),
        });
        if (items.length >= limit) return items;
      }
    }
    return items;
  }, max);
}

/**
 * Snapshot of observable page state for delta detection.
 * @param {import('@playwright/test').Page} page
 */
export async function captureObservableSnapshot(page) {
  return page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], dialog[open], .modal, .drawer--open')
      .length;
    const live = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'))
      .map((el) => (el.textContent || '').trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 6);
    return {
      url: location.href,
      dialogs,
      liveText: live.join('|'),
      bodyLen: (document.body?.innerText || '').length,
    };
  });
}

/**
 * @param {{ before: any, after: any, networkDelta: number }} input
 */
export function hasObservableOutcome({ before, after, networkDelta }) {
  if (before.url !== after.url) return { ok: true, kind: 'navigation' };
  if (after.dialogs !== before.dialogs) return { ok: true, kind: 'dialog' };
  if (after.liveText !== before.liveText && after.liveText.length > 0) {
    return { ok: true, kind: 'live-region' };
  }
  if (networkDelta > 0) return { ok: true, kind: 'network' };
  // DOM text length change (filter, open panel, etc.)
  if (Math.abs(after.bodyLen - before.bodyLen) > 40) return { ok: true, kind: 'dom-delta' };
  return { ok: false, kind: 'none' };
}

/** ED routes exercised by the interaction suite (high-traffic first). */
export const ED_INTERACTION_ROUTES = Object.freeze([
  { path: '/emergency/whiteboard', label: 'Whiteboard', maxControls: 16 },
  { path: '/emergency/reception', label: 'Reception', maxControls: 14 },
  { path: '/emergency/ems', label: 'EMS Pipeline', maxControls: 14 },
  { path: '/emergency/command-center', label: 'Command Center', maxControls: 12 },
  { path: '/emergency/alerts', label: 'Clinical Alerts', maxControls: 12 },
  { path: '/emergency/tools', label: 'Tools', maxControls: 12 },
  { path: '/emergency/dispatch', label: 'Dispatch', maxControls: 12 },
  { path: '/emergency/settings', label: 'Settings', maxControls: 10 },
]);

/** Control names that are allowed to have no delta (toggles already active, pure focus, etc.) */
export const INTERACTION_SOFT_ALLOW_NAMES =
  /copy|print|refresh|reload|filter|sort|view|layout|theme|collapse|expand|more options|optional/i;
