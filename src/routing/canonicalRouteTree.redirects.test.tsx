import './canonicalRouteTree.testShared';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useEmergencyStore } from '../store/emergencyStore';
import { renderRoute, ROUTE_LOAD_TIMEOUT } from './canonicalRouteTree.testShared';

interface InShellRouteExpectation {
  path: string;
  marker?: RegExp | string;
  markerRole?: string;
}

const originalEmergencyState = useEmergencyStore.getState();

describe.sequential('canonical route tree — legacy redirects', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it.each([
    ['/tools/catalog', '/emergency/tools?source=catalog&filter=all'],
    [
      '/tools/calculators/qsofa',
      '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=qsofa',
    ],
    [
      '/tools/calculator/sofa',
      '/emergency/tools?source=calculators&filter=calculator&q=sofa&open=sofa',
    ],
    ['/calculators', '/emergency/tools?source=calculators&filter=calculator'],
    [
      '/operations/fleet-command',
      '/emergency/tools?source=operations&filter=operations&q=fleet-command&open=fleet-command',
    ],
  ])(
    '%s redirects to Medical Tools with intent preserved',
    async (legacyPath, expectedPath) => {
      renderRoute(legacyPath);

      // The redirect happens after LazyAppRoutes finishes its async module load and
      // the RootLayout guards (ProfileRouteGuard/PilotExtensionRouteGuard) resolve, so
      // the location output can still hold its pre-redirect text the instant it mounts.
      // findByTestId resolves as soon as the (always-present) element exists, not once
      // it reaches this content, so the actual wait has to happen here instead.
      await waitFor(
        () => {
          expect(screen.getByTestId('location')).toHaveTextContent(expectedPath);
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(await screen.findByRole('link', { name: 'Medical Tools' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it.each([
    ['/tools/lab-interpreter', { path: '/tools/lab-interpreter', marker: /lab values input/i }],
    ['/maps', { path: '/maps', marker: /live tracking map/i, markerRole: 'heading' }],
    ['/recommendations', { path: '/recommendations', marker: '.tools-overview' }],
    ['/workflows', { path: '/workflows', marker: /^workflows$/i, markerRole: 'heading' }],
    ['/fleet/command', { path: '/fleet/command' }],
    ['/fleet/map', { path: '/fleet/map' }],
  ] as [string, InShellRouteExpectation][])(
    '%s mounts the in-shell canonical route',
    async (legacyPath, expected) => {
      renderRoute(legacyPath);

      expect(await screen.findByTestId('location')).toHaveTextContent(expected.path);
      expect(document.getElementById('main-content')).toBeInTheDocument();
      expect(screen.queryByText('Access denied')).toBeNull();

      if (typeof expected.marker === 'string') {
        const markerSelector = expected.marker;
        await waitFor(
          () => {
            expect(document.querySelector(markerSelector)).toBeTruthy();
          },
          { timeout: ROUTE_LOAD_TIMEOUT },
        );
        return;
      }

      if (expected.marker) {
        if (expected.markerRole === 'heading') {
          expect(
            await screen.findByRole(
              'heading',
              { name: expected.marker },
              { timeout: ROUTE_LOAD_TIMEOUT },
            ),
          ).toBeInTheDocument();
        } else {
          expect(
            await screen.findByText(expected.marker, {}, { timeout: ROUTE_LOAD_TIMEOUT }),
          ).toBeInTheDocument();
        }
      }
    },
    ROUTE_LOAD_TIMEOUT,
  );
});

describe.sequential('canonical route tree — governance workspace mounts', () => {
  afterEach(() => {
    cleanup();
    useEmergencyStore.setState(originalEmergencyState, true);
  });

  it.each([
    [
      '/ai-governance',
      { path: '/ai-governance', marker: /ai governance center/i, markerRole: 'heading' },
    ],
    ['/security', { path: '/security', marker: /llm security dashboard/i, markerRole: 'heading' }],
    ['/privacy', { path: '/privacy', marker: /consent \+ privacy center/i, markerRole: 'heading' }],
    [
      '/human-review',
      { path: '/human-review', marker: /human review queue/i, markerRole: 'heading' },
    ],
    ['/audit', { path: '/audit', marker: /audit trail spine/i, markerRole: 'heading' }],
    ['/equity', { path: '/equity', marker: /bias and equity monitoring/i, markerRole: 'heading' }],
    [
      '/integrations/fhir',
      { path: '/integrations/fhir', marker: /fhir \+ hl7 integration/i, markerRole: 'heading' },
    ],
    [
      '/system-health',
      { path: '/system-health', marker: /deployment observability/i, markerRole: 'heading' },
    ],
  ])(
    '%s mounts PlatformGovernanceWorkspace in-shell',
    async (legacyPath, expected) => {
      renderRoute(legacyPath);

      expect(await screen.findByTestId('location')).toHaveTextContent(expected.path);
      expect(document.getElementById('main-content')).toBeInTheDocument();
      await waitFor(
        () => {
          expect(document.querySelector('.governance-workspace-page')).toBeTruthy();
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );

      if (expected.markerRole === 'heading') {
        expect(
          await screen.findByRole(
            'heading',
            { name: expected.marker },
            { timeout: ROUTE_LOAD_TIMEOUT },
          ),
        ).toBeInTheDocument();
      }
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it.each([
    ['/discover', { path: '/discover', marker: '.capability-discovery-page' }],
    ['/knowledge-graph', { path: '/knowledge-graph', marker: '.knowledge-graph-page' }],
    ['/simulation', { path: '/simulation', marker: '.simulation-suite-page' }],
    ['/competencies', { path: '/competencies', marker: '.competencies-page' }],
    ['/operations', { path: '/operations', marker: '.operations-hub' }],
    ['/maps', { path: '/maps', marker: '.live-map-page' }],
  ])(
    '%s mounts the in-shell platform page',
    async (legacyPath, expected) => {
      renderRoute(legacyPath);

      expect(await screen.findByTestId('location')).toHaveTextContent(expected.path);
      await waitFor(
        () => {
          expect(document.querySelector(expected.marker)).toBeTruthy();
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
    },
    ROUTE_LOAD_TIMEOUT,
  );

  it(
    '/integrations/hub keeps the dedicated Integration Hub page',
    async () => {
      renderRoute('/integrations/hub');

      expect(await screen.findByTestId('location')).toHaveTextContent('/integrations/hub');
      expect(document.querySelector('.governance-workspace-page')).toBeNull();
      await waitFor(
        () => {
          expect(document.querySelector('.integration-hub-page')).toBeTruthy();
        },
        { timeout: ROUTE_LOAD_TIMEOUT },
      );
      expect(
        await screen.findByRole(
          'heading',
          { name: /integration hub/i },
          { timeout: ROUTE_LOAD_TIMEOUT },
        ),
      ).toBeInTheDocument();
    },
    ROUTE_LOAD_TIMEOUT,
  );
});
