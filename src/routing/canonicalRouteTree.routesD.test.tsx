import './_routeDeepLinkMocks';
import './canonicalRouteTree.testShared';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { AppRouteHarness, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — copilot aliases', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it(
    '/emergency/copilot redirects to the docked whiteboard copilot surface',
    async () => {
      render(<AppRouteHarness initialPath="/emergency/copilot" />);

      await waitFor(
        () => expect(screen.getByTestId('location')).toHaveTextContent('/emergency/whiteboard'),
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.queryByText('Access denied')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it.each(['/assistant', '/chat', '/ai', '/copilot'])(
    '%s redirects to the docked Emergency Copilot experience',
    async (aliasPath) => {
      render(<AppRouteHarness initialPath={aliasPath} />);

      await waitFor(
        () => expect(screen.getByTestId('location')).toHaveTextContent('/emergency/whiteboard'),
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.queryByText('Access denied')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});
