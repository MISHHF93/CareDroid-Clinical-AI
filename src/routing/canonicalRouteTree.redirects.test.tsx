import './canonicalRouteTree.testShared.tsx';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared.tsx';

const originalEmergencyState = useEmergencyStore.getState();

describe('canonical route tree — legacy redirects', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it.each([
    ['/tools/catalog', '/emergency/tools?source=catalog&filter=all'],
    ['/tools/calculators/qsofa', '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa'],
    ['/tools/calculator/sofa', '/emergency/tools?source=calculators&filter=calculator&q=sofa&open=sofa'],
    ['/tools/lab-interpreter', '/emergency/tools?source=tools&filter=clinical-tools&q=lab-interp&open=lab-interp'],
    ['/calculators', '/emergency/tools?source=calculators&filter=calculator'],
    ['/maps', '/emergency/tools?source=operations&filter=operations&q=live-tracking-map&open=live-tracking-map'],
    ['/operations/fleet-command', '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command'],
    ['/workflows', '/emergency/tools?source=workflows&filter=ai-workflows'],
    ['/recommendations', '/emergency/tools?source=recommendations&filter=recommended'],
  ])('%s redirects to Medical Tools with intent preserved', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath);

    expect(await screen.findByTestId('location')).toHaveTextContent(expectedPath);
    expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }, ROUTE_LOAD_TIMEOUT);

  it.each([
    ['/fleet/command', '/fleet/command'],
    ['/fleet/map', '/fleet/map'],
  ])('%s mounts the canonical fleet route', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath);

    expect(await screen.findByTestId('location')).toHaveTextContent(expectedPath);
    expect(document.getElementById('main-content')).toBeInTheDocument();
    expect(screen.queryByText('Access denied')).toBeNull();
  }, ROUTE_LOAD_TIMEOUT);
});