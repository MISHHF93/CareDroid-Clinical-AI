import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute } from './canonicalRouteTree.testShared.tsx';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — intake, capacity, queues', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it('/emergency/intake renders Smart Intake inside the route tree', async () => {
    renderRoute('/emergency/intake');

    expect(await screen.findByTestId('location')).toHaveTextContent('/emergency/intake');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('/emergency/capacity renders capacity, rooms, boarding, and discharge pipeline from store', async () => {
    renderRoute('/emergency/capacity');

    expect(await screen.findByRole('heading', { name: 'Flow & Capacity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Capacity' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist', { name: 'Flow and capacity views' })).toBeInTheDocument();
  });

  it('/emergency/queues renders queue intelligence from store state', async () => {
    renderRoute('/emergency/queues');

    expect(await screen.findByRole('heading', { name: 'Department Queues' })).toBeInTheDocument();
    expect(screen.getAllByText('Waiting').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Triage').length).toBeGreaterThan(0);
    expect(screen.getByText('Movement stage: Waiting')).toBeInTheDocument();
  });

  it('/emergency/queues consumes the active whiteboard queue filter', async () => {
    useEmergencyStore.setState({ activeQueueFilter: 'Waiting' });

    renderRoute('/emergency/queues');

    expect(
      await screen.findByText('Showing the Waiting queue requested from the whiteboard.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear queue filter' })).toBeEnabled();
  });
});