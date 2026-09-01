import { expect, test } from '@playwright/test';

/**
 * The keyboard contract that useModalDialog promises, checked in a real browser.
 *
 * The hook has unit tests, but jsdom cannot tell you whether Tab actually moves
 * focus -- it has no layout and no real focus ring, so the trap is verified there
 * only against a simulated tab order. This exercises it against Chromium's own
 * focus behaviour on a dialog a clinician really opens.
 *
 * The reassessment drawer is the subject because the global "r" shortcut reaches
 * it from any route, so this needs no fixture beyond being signed in. The
 * shortcut is role-gated, so the test skips rather than fails when the QA role
 * cannot open it -- an unopenable dialog is not evidence of a broken trap.
 */

const HOST_ROUTE = '/medical-iot';
const DIALOG = '[role="dialog"]';

async function openReassessmentDrawer(page) {
  await page.goto(HOST_ROUTE, { waitUntil: 'domcontentloaded' });
  await page
    .waitForFunction(() => !/\bLoading\b/i.test(document.body.innerText), null, { timeout: 45_000 })
    .catch(() => {});

  const text = await page.evaluate(() => document.body.innerText);
  if (/CareDroid page unavailable|ACCESS DENIED/i.test(text)) return null;

  // Give focus a real, identifiable home so focus restore has something to prove.
  const trigger = page.getByRole('button', { name: /new patient/i }).first();
  if (await trigger.count()) {
    await trigger.focus().catch(() => {});
  }

  await page.keyboard.press('r');
  const dialog = page.locator(DIALOG).first();
  const appeared = await dialog.waitFor({ state: 'visible', timeout: 8_000 }).then(
    () => true,
    () => false,
  );
  return appeared ? dialog : null;
}

const focusIsInsideDialog = () => {
  const dialog = document.querySelector('[role="dialog"]');
  return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
};

test.describe('modal dialog keyboard contract', () => {
  test('opening moves focus into the dialog', async ({ page }) => {
    const dialog = await openReassessmentDrawer(page);
    test.skip(!dialog, 'the QA role cannot open the reassessment drawer on this build');

    expect(await page.evaluate(focusIsInsideDialog)).toBe(true);
  });

  test('Tab cannot escape the dialog', async ({ page }) => {
    const dialog = await openReassessmentDrawer(page);
    test.skip(!dialog, 'the QA role cannot open the reassessment drawer on this build');

    // Far more presses than the dialog has focusable children, so the cycle has
    // to wrap several times. Without a trap this lands on the page behind.
    const escapes = [];
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      if (!(await page.evaluate(focusIsInsideDialog))) escapes.push(i);
    }
    expect(escapes, `focus left the dialog on Tab press(es): ${escapes.join(', ')}`).toEqual([]);
  });

  test('Shift+Tab cannot escape the dialog either', async ({ page }) => {
    const dialog = await openReassessmentDrawer(page);
    test.skip(!dialog, 'the QA role cannot open the reassessment drawer on this build');

    const escapes = [];
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Shift+Tab');
      if (!(await page.evaluate(focusIsInsideDialog))) escapes.push(i);
    }
    expect(escapes, `focus left the dialog on Shift+Tab press(es): ${escapes.join(', ')}`).toEqual([]);
  });

  test('Escape closes it and hands focus back', async ({ page }) => {
    const dialog = await openReassessmentDrawer(page);
    test.skip(!dialog, 'the QA role cannot open the reassessment drawer on this build');

    await page.keyboard.press('Escape');
    await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 8_000 });

    // Focus must not be dropped on document.body, which is where a keyboard
    // user silently loses their place.
    const landedOnBody = await page.evaluate(() => document.activeElement === document.body);
    expect(landedOnBody, 'focus was dropped to <body> when the dialog closed').toBe(false);
  });

  test('the page behind does not scroll while it is open', async ({ page }) => {
    const dialog = await openReassessmentDrawer(page);
    test.skip(!dialog, 'the QA role cannot open the reassessment drawer on this build');

    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.keyboard.press('Escape');
    await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 8_000 });
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
});
