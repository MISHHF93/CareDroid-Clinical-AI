/**
 * Horizontal overflow detection for responsive QA.
 * Allows scroll inside `.catalog-table-wrap` (data tables only).
 */

const TOLERANCE_PX = 2;

/**
 * @param {import('@playwright/test').Page} page
 */
export async function measurePageOverflow(page) {
  return page.evaluate((tolerance) => {
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
      if (el.closest('.catalog-table-wrap')) continue;

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
  }, TOLERANCE_PX);
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
 * @param {import('@playwright/test').Page} page
 */
export async function dismissOverlays(page) {
  const backdrop = page.locator('.app-shell-nav-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ force: true }).catch(() => {});
  }
}
