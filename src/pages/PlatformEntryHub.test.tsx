import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('PlatformEntryHub / EntryShell wiring (Cycle 154)', () => {
  it('does not call useRouteChromeRegistration — EntryShell (its real mount, router.tsx) has no RouteChromeProvider', () => {
    // Regression guard for a real crash found via a full-app route crawl:
    // useRouteChromeRegistration -> useRouteChrome() throws "must be used within
    // RouteChromeProvider" outside AppShell. RouteChromeProvider only wraps
    // AppShell's own routes; EntryShell ("Minimal shell for optional platform
    // orientation (/start)... kept out of the operational AppShell") has its own
    // static header instead and was never meant to receive chrome registration.
    const hubSrc = readFileSync(join(__dirname, 'PlatformEntryHub.tsx'), 'utf8');
    expect(hubSrc).not.toContain('useRouteChromeRegistration');
    expect(hubSrc).not.toContain('RouteChromeContext');
  });

  it('EntryShell has no RouteChromeProvider of its own, confirming the constraint above is real', () => {
    const shellSrc = readFileSync(join(__dirname, '../layouts/EntryShell.tsx'), 'utf8');
    expect(shellSrc).not.toContain('RouteChromeProvider');
  });

  it('/start is EntryShell’s only mount point in router.tsx — if that ever changes, re-check every page it wraps for the same hook', () => {
    const routerSrc = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
    const mounts = routerSrc.match(/<EntryShell>/g) || [];
    expect(mounts.length).toBe(1);
  });
});
