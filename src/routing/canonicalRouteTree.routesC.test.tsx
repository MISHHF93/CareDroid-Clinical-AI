import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { findRouteHeading, renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — queues params, reassessment, boarding, referrals', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/queues consumes queue filter search params', async () => {
    renderRoute('/emergency/queues?queue=Reassessment');

    expect(
      await screen.findByText(
        'Showing the Reassessment queue requested from the whiteboard.',
        {},
        { timeout: ROUTE_LOAD_TIMEOUT },
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useEmergencyStore.getState().activeQueueFilter).toBe('Reassessment');
    });
  });

  it('/emergency/reassessment renders a dedicated reassessment queue surface', async () => {
    renderRoute('/emergency/reassessment');

    // The shell chrome route-tab and the page's own (visually-hidden) accessibility
    // heading both render "Reassessment" — scope to <main> for the page's heading.
    const main = await screen.findByRole('main');
    expect(await screen.findByRole('heading', { name: 'Reassessment' })).toBeInTheDocument();
  });

  it('/emergency/boarding renders boarding and discharge capacity detail', async () => {
    renderRoute('/emergency/boarding');

    await waitFor(
      () => {
        expect(screen.getByTestId('location')).toHaveTextContent(
          '/emergency/capacity?view=boarding',
        );
      },
      { timeout: ROUTE_LOAD_TIMEOUT },
    );
    // One "Flow & Capacity" heading now (the shell chrome route-tab's), so this
    // queries document-wide rather than scoping to <main> to dodge a duplicate.
    // The shell heading resolves before the lazy page body, so the tab -- a
    // page-owned element -- is awaited rather than queried synchronously.
    const main = await screen.findByRole('main');
    expect(await screen.findByRole('heading', { name: 'Flow & Capacity' })).toBeInTheDocument();
    expect(
      await screen.findByRole('tab', { name: 'Boarding' }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it(
    '/emergency/referrals renders referral candidates from the active patient list',
    async () => {
      renderRoute('/emergency/referrals');

      expect(await findRouteHeading('Referrals')).toBeInTheDocument();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});
