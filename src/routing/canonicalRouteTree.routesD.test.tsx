import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared.tsx';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — copilot aliases', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/copilot opens the docked copilot on the whiteboard', async () => {
    renderRoute('/emergency/copilot');

    expect(
      await screen.findByTestId('location', { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toHaveTextContent('/emergency/whiteboard');
    expect(screen.getByLabelText('CareDroid Copilot controls')).toBeInTheDocument();
  }, ROUTE_LOAD_TIMEOUT);

  it.each(['/assistant', '/chat', '/ai', '/copilot'])(
    '%s redirects to the docked Emergency Copilot experience',
    async (aliasPath) => {
      renderRoute(aliasPath);

      expect(await screen.findByTestId('location', {}, { timeout: ROUTE_LOAD_TIMEOUT })).toHaveTextContent(
        '/emergency/whiteboard',
      );
      expect(screen.getByLabelText('CareDroid Copilot controls')).toBeInTheDocument();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});