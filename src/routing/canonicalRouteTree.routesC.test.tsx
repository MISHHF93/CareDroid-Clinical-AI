import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { findRouteHeading, renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared.tsx';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — queues params, reassessment, boarding, referrals', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/queues consumes queue filter search params', async () => {
    renderRoute('/emergency/queues?queue=Reassessment');

    expect(
      await screen.findByText('Showing the Reassessment queue requested from the whiteboard.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(useEmergencyStore.getState().activeQueueFilter).toBe('Reassessment');
    });
  });

  it('/emergency/reassessment renders a dedicated reassessment queue surface', async () => {
    renderRoute('/emergency/reassessment');

    expect(await screen.findByRole('heading', { name: 'Reassessment' })).toBeInTheDocument();
  });

  it('/emergency/boarding renders boarding and discharge capacity detail', async () => {
    renderRoute('/emergency/boarding');

    expect(await screen.findByRole('heading', { name: 'Boarding' })).toBeInTheDocument();
  });

  it('/emergency/referrals renders referral candidates from the active patient list', async () => {
    renderRoute('/emergency/referrals');

    expect(await findRouteHeading('Referrals')).toBeInTheDocument();
  }, ROUTE_LOAD_TIMEOUT);
});