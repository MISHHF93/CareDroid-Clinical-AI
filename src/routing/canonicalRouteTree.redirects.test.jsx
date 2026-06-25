import './canonicalRouteTree.testShared.jsx';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared.jsx';

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
    ['/fleet/map', '/emergency/tools?source=operations&filter=operations&q=fleet-live-map&open=fleet-live-map'],
  ])('%s redirects to Medical Tools with intent preserved', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath);

    expect(await screen.findByTestId('location')).toHaveTextContent(expectedPath);
    expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  }, ROUTE_LOAD_TIMEOUT);

  it.each([
    ['/fleet/command', '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command'],
    ['/operations/fleet-command', '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command'],
    ['/maps', '/emergency/tools?source=operations&filter=operations&q=live-tracking-map&open=live-tracking-map'],
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
});