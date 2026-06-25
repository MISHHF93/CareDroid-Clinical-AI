import './canonicalRouteTree.testShared.jsx';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from '../config/unified-navigation.config';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared.jsx';

const originalEmergencyState = useEmergencyStore.getState();
const PILOT_VISIBLE_NAVIGATION_ITEMS = getPilotCustomerNavigationItems(NAVIGATION_ITEMS);

describe('canonical route tree — shell and workspace', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('keeps primary shell controls and representative sidebar links exposed', async () => {
    renderRoute('/emergency/whiteboard');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
    expect(
      await screen.findByRole('button', { name: /\+ Central Intake/i }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toBeEnabled();

    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Emergency desktop navigation',
    });
    expect(within(desktopNavigation).getByRole('link', { name: 'Analytics' })).toHaveAttribute(
      'href',
      '/emergency/analytics',
    );
    expect(within(desktopNavigation).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/emergency/settings',
    );

    for (const label of ['Whiteboard', 'Patients', 'Queues']) {
      const item = PILOT_VISIBLE_NAVIGATION_ITEMS.find((navItem) => navItem.label === label);
      expect(item, label).toBeTruthy();
      expect(within(desktopNavigation).getByRole('link', { name: label })).toHaveAttribute(
        'href',
        item.path,
      );
    }
  }, ROUTE_LOAD_TIMEOUT);

  it('routes /workspace without an access-denied or error surface for clinical profiles', async () => {
    renderRoute('/workspace');

    const location = await screen.findByTestId('location');
    expect(['/workspace', '/emergency/whiteboard', '/emergency/reception']).toContain(
      location.textContent.split('?')[0],
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.queryByText('Access denied')).toBeNull();
    expect(screen.queryByText('CareDroid page unavailable')).toBeNull();
    expect(screen.queryByText(/unexpected error/i)).toBeNull();
  }, ROUTE_LOAD_TIMEOUT);

  it('redirects retired CareDroid routes to the whiteboard', async () => {
    renderRoute('/emergency/simulation');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/whiteboard');
  });
});