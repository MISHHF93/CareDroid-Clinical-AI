/**
 * IX12 — browser proof for the Interactive Intelligence workspaces.
 *
 * Runs against the hermetic Vite server (no backend): the workspace must
 * degrade honestly, never fake liveness, and stay operable. Covers: mount on
 * Reception + EMS, named stream phases (no anonymous spinner), seeded
 * workflow-card acknowledge via keyboard, live-region semantics, and a
 * scoped axe scan of the workspace itself.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installQaNetworkStubs,
  seedQaAuth,
  waitForAppReady,
} from './responsive-qa.helpers.mjs';

test.setTimeout(90_000);

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, '..', 'qa', 'interactive-ai-results');

const RECEPTION_PATH = '/emergency/reception';
const EMS_PATH = '/emergency/ems';

test.beforeEach(async ({ page }) => {
  await seedQaAuth(page);
  await installQaNetworkStubs(page);
});

async function openWorkspace(page, path) {
  await page.goto(path);
  await waitForAppReady(page);
  const workspace = page.getByTestId('interactive-ai-workspace').first();
  await expect(workspace).toBeVisible({ timeout: 30_000 });
  return workspace;
}

test('reception: workspace mounts with realtime status, context bar, and correct live-region semantics', async ({
  page,
}) => {
  const workspace = await openWorkspace(page, RECEPTION_PATH);

  const realtimeStatus = workspace.getByTestId('interactive-realtime-status');
  await expect(realtimeStatus).toBeVisible();
  await expect(realtimeStatus).not.toHaveText('');

  await expect(workspace.getByTestId('interactive-context-bar')).toBeVisible();

  // Polite, atomic live region for announcements — required semantics.
  const liveRegion = workspace.getByTestId('interactive-live-region');
  await expect(liveRegion).toHaveAttribute('role', 'status');
  await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
});

test('reception: seeded workflow card renders and Acknowledge works from the keyboard', async ({
  page,
}) => {
  const workspace = await openWorkspace(page, RECEPTION_PATH);

  const card = workspace.getByTestId('workflow-ai-card').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText(/registration/i);

  const before = await workspace.getByTestId('workflow-ai-card').count();
  const acknowledge = card.getByRole('button', { name: 'Acknowledge' });
  await acknowledge.focus();
  await expect(acknowledge).toBeFocused();
  await page.keyboard.press('Enter');

  // Acknowledged cards leave the active list (or lose their action) — the
  // control must produce an observable result either way.
  await expect
    .poll(async () => {
      const count = await workspace.getByTestId('workflow-ai-card').count();
      if (count < before) return 'removed';
      const stillHasButton = await card
        .getByRole('button', { name: 'Acknowledge' })
        .count();
      return stillHasButton === 0 ? 'acknowledged' : 'unchanged';
    })
    .not.toBe('unchanged');
});

test('reception: an assist run names its stream phases and reaches a terminal outcome — never an anonymous spinner', async ({
  page,
}) => {
  const workspace = await openWorkspace(page, RECEPTION_PATH);

  const composer = workspace.getByPlaceholder('Ask for help completing this workflow…');
  await composer.fill('Show missing registration information for the current patient');
  await workspace.locator('button.cd-iaw__send').click();

  // The progress element must appear AND carry a named phase, immediately.
  const progress = workspace.getByTestId('interactive-stream-progress');
  await expect(progress).toBeVisible({ timeout: 10_000 });
  const firstPhaseText = (await progress.innerText()).trim();
  expect(firstPhaseText.length).toBeGreaterThan(0);

  // The run must end in an observable outcome: a response, a proposal, or a
  // named terminal phase (failed/insufficient evidence are honest outcomes
  // in hermetic mode — an eternal spinner is not).
  await expect
    .poll(
      async () => {
        if (await workspace.getByTestId('interactive-response').count()) return 'response';
        if (await workspace.getByTestId('action-proposal-card').count()) return 'proposal';
        const text = ((await progress.innerText().catch(() => '')) || '').toLowerCase();
        if (/completed|failed|blocked|insufficient|cancelled|timed/.test(text)) {
          return 'terminal';
        }
        return 'pending';
      },
      { timeout: 30_000 },
    )
    .not.toBe('pending');

  // Whatever happened, the progress element never showed an unnamed state.
  const finalText = ((await progress.innerText().catch(() => '')) || '').trim();
  if (await progress.isVisible().catch(() => false)) {
    expect(finalText.length).toBeGreaterThan(0);
  }
});

test('reception: realtime status never claims live without a connection, and the workspace survives an offline/online cycle', async ({
  page,
  context,
}) => {
  const workspace = await openWorkspace(page, RECEPTION_PATH);
  const status = workspace.getByTestId('interactive-realtime-status');

  // Hermetic mode has no backend: the status must not present as live.
  await expect(status).toHaveAttribute('data-live', 'false');
  await expect(status).not.toHaveText('');

  // Hard network loss on top of that — still truthful, still operable.
  await context.setOffline(true);
  await expect(status).toHaveAttribute('data-live', 'false');

  const composer = workspace.getByPlaceholder('Ask for help completing this workflow…');
  await composer.fill('Summarize current registration status');
  await workspace.locator('button.cd-iaw__send').click();

  const progress = workspace.getByTestId('interactive-stream-progress');
  await expect(progress).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(
      async () => {
        if (await workspace.getByTestId('interactive-response').count()) return 'response';
        if (await workspace.getByTestId('action-proposal-card').count()) return 'proposal';
        const text = ((await progress.innerText().catch(() => '')) || '').toLowerCase();
        if (/completed|failed|blocked|insufficient|cancelled|timed/.test(text)) {
          return 'terminal';
        }
        return 'pending';
      },
      { timeout: 30_000 },
    )
    .not.toBe('pending');

  // Back online: no crash, status still present and truthful.
  await context.setOffline(false);
  await expect(status).toBeVisible();
  await expect(status).not.toHaveText('');
});

test('reception: a typed AI command from the command palette runs in the workspace — id-only handoff, no text execution (IX14)', async ({
  page,
}) => {
  const workspace = await openWorkspace(page, RECEPTION_PATH);

  // Reception autofocuses its search input; global shortcuts deliberately
  // ignore keys typed into editable fields, so release focus first.
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible({ timeout: 10_000 });

  // Searching surfaces the typed AI command through the normal ranking pipeline.
  await palette.getByRole('textbox').fill('draft triage handoff');
  const aiCommand = palette.getByRole('option', { name: /AI: Draft triage handoff/ });
  await expect(aiCommand).toBeVisible({ timeout: 10_000 });
  await aiCommand.click();
  await expect(palette).not.toBeVisible();

  // The workspace runs the registry's FIXED template — the palette only sent
  // the command id, so the composer must NOT contain the typed search text.
  const composer = workspace.getByPlaceholder('Ask for help completing this workflow…');
  await expect(composer).not.toHaveValue(/draft triage handoff/);

  const progress = workspace.getByTestId('interactive-stream-progress');
  await expect(progress).toBeVisible({ timeout: 10_000 });
  expect((await progress.innerText()).trim().length).toBeGreaterThan(0);

  await expect
    .poll(
      async () => {
        if (await workspace.getByTestId('interactive-response').count()) return 'response';
        if (await workspace.getByTestId('action-proposal-card').count()) return 'proposal';
        const text = ((await progress.innerText().catch(() => '')) || '').toLowerCase();
        if (/completed|failed|blocked|insufficient|cancelled|timed/.test(text)) {
          return 'terminal';
        }
        return 'pending';
      },
      { timeout: 30_000 },
    )
    .not.toBe('pending');
});

test('ems: the same workspace architecture mounts on the EMS pipeline', async ({ page }) => {
  const workspace = await openWorkspace(page, EMS_PATH);
  await expect(workspace.getByTestId('interactive-realtime-status')).toBeVisible();
  await expect(workspace.getByTestId('interactive-live-region')).toHaveAttribute(
    'aria-live',
    'polite',
  );
});

test('reception: axe scan of the workspace — zero serious/critical violations', async ({
  page,
}, testInfo) => {
  await openWorkspace(page, RECEPTION_PATH);

  const results = await new AxeBuilder({ page })
    .include('[data-testid="interactive-ai-workspace"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(RESULTS_DIR, `reception-workspace-${testInfo.retry}.json`),
    JSON.stringify(
      {
        page: RECEPTION_PATH,
        scannedAt: new Date().toISOString(),
        violations: results.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
          help: violation.help,
        })),
      },
      null,
      2,
    ),
  );

  const seriousOrWorse = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    seriousOrWorse.map((violation) => `${violation.id} (${violation.nodes.length} nodes)`),
  ).toEqual([]);
});
