import './canonicalRouteTree.testShared.jsx';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { findRouteHeading, renderRoute } from './canonicalRouteTree.testShared.jsx';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — copilot aliases', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/copilot renders the active Copilot route context', async () => {
    renderRoute('/emergency/copilot');

    expect(await findRouteHeading('CareDroid Copilot')).toBeInTheDocument();
    expect(screen.getByText(/Use the docked CareDroid Copilot/i)).toBeInTheDocument();
  });

  it.each(['/assistant', '/chat', '/ai', '/copilot'])(
    '%s redirects to the active Emergency Copilot route',
    async (aliasPath) => {
      renderRoute(aliasPath);

      expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/copilot');
      expect(await findRouteHeading('CareDroid Copilot')).toBeInTheDocument();
    },
  );
});