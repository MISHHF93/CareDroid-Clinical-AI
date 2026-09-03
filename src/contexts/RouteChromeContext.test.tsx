/**
 * Route chrome — regression tests for the lost-registration race behind the
 * pilot walkthrough's intermittently-missing "New Referral" header action.
 *
 * Pages register chrome (title/header actions) in a PASSIVE effect
 * (useRouteChromeRegistration). AppShell's RouteChromeReset clears chrome on
 * every pathname change — and when that clear also ran as a passive effect, it
 * could land AFTER the incoming route's registration whenever the lazy route
 * chunk was already cached (both effects in one commit), erasing the freshly
 * registered actions with nothing left to re-register. The fix pins the reset
 * to the LAYOUT phase, which React always runs before passive effects in the
 * same commit, making the order clear-then-register in every interleaving.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useLayoutEffect, useMemo } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  RouteChromeProvider,
  useRouteChrome,
  useRouteChromeRegistration,
  type RouteChromeState,
} from './RouteChromeContext';

const __dirname = dirname(fileURLToPath(import.meta.url));

function ChromeConsumer() {
  const { chrome } = useRouteChrome();
  return (
    <div data-testid="chrome-actions">
      {chrome.title ? <span>{chrome.title}</span> : null}
      {chrome.actions}
    </div>
  );
}

function Registrant({ title, action }: { title: string; action: string }) {
  // Memoized like real pages' routeChrome (emergencyRouteShared.tsx).
  const chrome: RouteChromeState = useMemo(
    () => ({
      title,
      actions: <button type="button">{action}</button>,
    }),
    [action, title],
  );
  useRouteChromeRegistration(chrome);
  return null;
}

/** Mirrors AppShell's RouteChromeReset: a layout-phase clear keyed on a "navigation". */
function LayoutPhaseReset({ navKey }: { navKey: string }) {
  const { clearChrome } = useRouteChrome();
  useLayoutEffect(() => {
    clearChrome();
  }, [clearChrome, navKey]);
  return null;
}

describe('RouteChromeContext registration vs navigation reset', () => {
  it('keeps the incoming route&apos;s actions when the reset and the registration land in the same commit (the New Referral race)', () => {
    // Commit 1: route A registered, reset keyed to /a.
    const { rerender } = render(
      <RouteChromeProvider>
        <LayoutPhaseReset navKey="/a" />
        <Registrant title="Whiteboard" action="Add Patient" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Add Patient' })).toBeInTheDocument();

    // Commit 2: pathname change AND the new page mounting in the SAME commit —
    // the cached-chunk case that raced. The layout-phase clear must run before
    // the new page's passive registration, never after it.
    rerender(
      <RouteChromeProvider>
        <LayoutPhaseReset navKey="/b" />
        <Registrant title="Referrals" action="New Referral" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    expect(screen.getByRole('button', { name: 'New Referral' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Patient' })).not.toBeInTheDocument();
  });

  it('clears stale chrome when navigating to a route that registers none', () => {
    const { rerender } = render(
      <RouteChromeProvider>
        <LayoutPhaseReset navKey="/a" />
        <Registrant title="Referrals" action="New Referral" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    expect(screen.getByRole('button', { name: 'New Referral' })).toBeInTheDocument();

    rerender(
      <RouteChromeProvider>
        <LayoutPhaseReset navKey="/b" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    expect(screen.queryByRole('button', { name: 'New Referral' })).not.toBeInTheDocument();
    expect(screen.getByTestId('chrome-actions')).toBeEmptyDOMElement();
  });

  it('a plain route swap (no reset involved) replaces the actions', () => {
    const { rerender } = render(
      <RouteChromeProvider>
        <Registrant title="Whiteboard" action="Add Patient" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    rerender(
      <RouteChromeProvider>
        <Registrant title="Referrals" action="New Referral" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );
    expect(screen.getByRole('button', { name: 'New Referral' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Patient' })).not.toBeInTheDocument();
  });

  it('does not infinite-loop when a caller passes a fresh inline object literal every render', () => {
    // Reproduces the real bug: a page calling
    // useRouteChromeRegistration({ title: 'X' }) with a NEW literal on every
    // render (not memoized, unlike Registrant above). setChrome's resulting
    // context-value change re-renders this component's own caller (it uses
    // useContext internally) -- without value-stabilizing `chrome` inside
    // the hook, that recreates the literal and re-fires the effect forever.
    let renderCount = 0;
    function UnmemoizedRegistrant({ title }: { title: string }) {
      renderCount += 1;
      useRouteChromeRegistration({ title });
      return null;
    }

    render(
      <RouteChromeProvider>
        <UnmemoizedRegistrant title="Departments" />
        <ChromeConsumer />
      </RouteChromeProvider>,
    );

    expect(screen.getByText('Departments')).toBeInTheDocument();
    // A genuine loop would run into the thousands (or hang the test/OOM);
    // a handful of settling renders is normal React behavior.
    expect(renderCount).toBeLessThan(10);
  });

  it('AppShell&apos;s RouteChromeReset clears in the layout phase, not the passive phase', () => {
    const appShellSource = readFileSync(join(__dirname, '../components/AppShell.tsx'), 'utf8');
    const resetStart = appShellSource.indexOf('function RouteChromeReset');
    expect(resetStart).toBeGreaterThan(-1);
    const resetBody = appShellSource.slice(
      resetStart,
      appShellSource.indexOf('function AppShellFrame'),
    );
    expect(resetBody).toContain('useLayoutEffect(');
    expect(resetBody).not.toContain('useEffect(');
  });
});
