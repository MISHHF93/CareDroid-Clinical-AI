import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  NAVIGATION_ITEMS,
  getPilotCustomerNavigationItems,
} from '../config/unified-navigation.config';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();
const PILOT_VISIBLE_NAVIGATION_ITEMS = getPilotCustomerNavigationItems(NAVIGATION_ITEMS);
const SIDEBAR_BATCH_A = PILOT_VISIBLE_NAVIGATION_ITEMS.slice(0, 7);
const SIDEBAR_BATCH_B = PILOT_VISIBLE_NAVIGATION_ITEMS.slice(7);
const RESOLVED_ROUTE_PATHS = {
  '/emergency/copilot': '/emergency/whiteboard',
};

describe('canonical route tree — sidebar destinations (batch A)', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it.each(
    SIDEBAR_BATCH_A.map((item) => ({
      label: item.label,
      path: item.path,
    })),
  )(
    'loads sidebar destination $label ($path) without an access-denied surface',
    async ({ path }) => {
      renderRoute(path);

      const expectedPath = RESOLVED_ROUTE_PATHS[path] || path;
      // The location output mounts before any redirect settles, so findByTestId
      // resolves immediately with pre-redirect content — wait for the real value.
      await waitFor(
        () => {
          expect(screen.getByTestId('location')).toHaveTextContent(expectedPath);
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Operational command context')).toBeInTheDocument();
      expect(screen.queryByText('Access denied')).toBeNull();
      expect(screen.queryByText('CareDroid page unavailable')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});

describe('canonical route tree — sidebar destinations (batch B)', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it.each(
    SIDEBAR_BATCH_B.map((item) => ({
      label: item.label,
      path: item.path,
    })),
  )(
    'loads sidebar destination $label ($path) without an access-denied surface',
    async ({ path }) => {
      renderRoute(path);

      const expectedPath = RESOLVED_ROUTE_PATHS[path] || path;
      // The location output mounts before any redirect settles, so findByTestId
      // resolves immediately with pre-redirect content — wait for the real value.
      await waitFor(
        () => {
          expect(screen.getByTestId('location')).toHaveTextContent(expectedPath);
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Operational command context')).toBeInTheDocument();
      expect(screen.queryByText('Access denied')).toBeNull();
      expect(screen.queryByText('CareDroid page unavailable')).toBeNull();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});
