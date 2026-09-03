import './_routeDeepLinkMocks';
import './canonicalRouteTree.testShared.tsx';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { AppRouteHarness, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical App routes deep links', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });
  it(
    'renders /emergency/ems inside the AppShell',
    async () => {
      render(<AppRouteHarness initialPath="/emergency/ems" />);

      await waitFor(
        () => expect(screen.getByTestId('location')).toHaveTextContent('/emergency/ems'),
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.queryByText('Access denied')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'redirects /settings/features to Feature Flags',
    async () => {
      render(<AppRouteHarness initialPath="/settings/features#feature-toolsShareResults" />);

      await waitFor(
        () =>
          expect(screen.getByTestId('location')).toHaveTextContent(
            '/feature-flags#feature-toolsShareResults',
          ),
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.queryByText('Access denied')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'redirects the retired assistant alias to the docked CareDroid Copilot experience',
    async () => {
      render(<AppRouteHarness initialPath="/assistant?agent=agent-emergency" />);

      await waitFor(
        () =>
          expect(screen.getByTestId('location')).toHaveTextContent(
            '/emergency/whiteboard?agent=agent-emergency',
          ),
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'redirects legacy auth paths into the demo landing flow',
    async () => {
      render(<AppRouteHarness initialPath="/auth" />);

      await waitFor(
        () => {
          expect(screen.getByTestId('location').textContent).not.toBe('/auth');
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.queryByText('Access denied')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it.each(['/auth-callback', '/welcome'])(
    'redirects %s away from the legacy auth surface',
    async (path) => {
      render(<AppRouteHarness initialPath={path} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('location').textContent).not.toBe(path);
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it.each(['/account/login', '/create-account'])(
    'mounts the real sign-in page at %s instead of redirecting away (HEAL-347.12)',
    async (path) => {
      // Before HEAL-347.12 every auth-style alias, including these two,
      // bounced straight to the demo landing hub. They now mount AuthPage
      // in place, so the location correctly stays put.
      render(<AppRouteHarness initialPath={path} />);

      await waitFor(
        () => {
          expect(document.querySelector('.auth-page')).toBeTruthy();
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.getByTestId('location').textContent).toBe(path);
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'keeps /discover on the capability discovery page',
    async () => {
      render(<AppRouteHarness initialPath="/discover" />);

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/discover'), {
        timeout: ROUTE_LOAD_TIMEOUT,
      });
      await waitFor(
        () => {
          expect(document.querySelector('.capability-discovery-page')).toBeTruthy();
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'redirects the AI command center into the ED OS (no standalone dashboard)',
    async () => {
      render(<AppRouteHarness initialPath="/ai-command-center" />);

      await waitFor(
        () => {
          const location = screen.getByTestId('location').textContent || '';
          expect(location).not.toContain('/ai-command-center');
          expect(location).toMatch(/\/emergency\//);
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    'mounts local shared tool sessions before wildcard redirects',
    async () => {
      render(<AppRouteHarness initialPath="/shared/tools/missing-share" />);

      expect(
        await screen.findByRole(
          'heading',
          { name: /session not found/i },
          { timeout: ROUTE_LOAD_TIMEOUT },
        ),
      ).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/shared/tools/missing-share');
    },
    ROUTE_LOAD_TIMEOUT,
  );
});
