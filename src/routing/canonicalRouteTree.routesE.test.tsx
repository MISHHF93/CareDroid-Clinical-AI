import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { findRouteHeading, renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — tools, pulse, shift, analytics, settings', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/tools renders Medical Tools inside the active shell', async () => {
    renderRoute('/emergency/tools');

    expect(
      await screen.findByRole('heading', { level: 1, name: /medical tools/i }, { timeout: 45000 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/tools');
  }, 60000);

  it(
    '/emergency/pulse renders Department Pulse inside the active shell',
    async () => {
      renderRoute('/emergency/pulse');

      expect(await screen.findByRole('heading', { name: 'Department Pulse' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/emergency/pulse');
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it('/emergency/shift renders Shift Summary inside the active shell', async () => {
    renderRoute('/emergency/shift');

    // The page now mounts CareOperationsInboxPanel alongside its own module
    // graph, which pushes this route's cold lazy-import compile past
    // findByRole's default 1000ms wait under a cold/isolated test run --
    // same class of timing gap already given explicit headroom for
    // /emergency/tools above.
    expect(
      await screen.findByRole('heading', { name: 'Emergency Shift Summary' }, { timeout: 45000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/shift');
  }, 60000);

  it('/emergency/analytics renders the CareDroid analytics route', async () => {
    renderRoute('/emergency/analytics');

    expect(await findRouteHeading('Department Analytics')).toBeInTheDocument();
  });

  it('/emergency/settings renders settings inside the primary CareDroid route family', async () => {
    renderRoute('/emergency/settings');

    expect(await screen.findByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/emergency/settings');
  });
});
