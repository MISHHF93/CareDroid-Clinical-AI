import './canonicalRouteTree.testShared';
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

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

    // There is now exactly ONE "Flow & Capacity" heading -- the shell chrome
    // route-tab's -- so this queries document-wide. It previously had to scope
    // to <main> to disambiguate a duplicate visually-hidden copy the page also
    // rendered; that duplicate was removed (two elements with the same heading
    // role and name is what a screen reader announces twice).
    // The lazy-loaded route module + hook chain here can take longer than the
    // default findByRole timeout to resolve, so use the shared ROUTE_LOAD_TIMEOUT.
    const main = await screen.findByRole('main', {}, { timeout: ROUTE_LOAD_TIMEOUT });
    expect(
      await screen.findByRole('heading', { name: 'Flow & Capacity' }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toBeInTheDocument();
    // The shell heading now resolves as soon as the chrome registers, which is
    // EARLIER than the lazy page body -- so wait on a page-owned element too,
    // a job the old within(main) heading query was quietly doing.
    expect(
      await screen.findByRole('tab', { name: 'Capacity' }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist', { name: 'Flow and capacity views' })).toBeInTheDocument();
  });

  it('/emergency/queues renders queue intelligence from store state', async () => {
    renderRoute('/emergency/queues');

    // Same single-heading + slow-lazy-load situation as the capacity test
    // above: one shell-rendered "Department Queues" heading, queried
    // document-wide, with the shared ROUTE_LOAD_TIMEOUT rather than the
    // default findByRole timeout.
    const main = await screen.findByRole('main', {}, { timeout: ROUTE_LOAD_TIMEOUT });
    expect(
      await screen.findByRole('heading', { name: 'Department Queues' }, { timeout: ROUTE_LOAD_TIMEOUT }),
    ).toBeInTheDocument();
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