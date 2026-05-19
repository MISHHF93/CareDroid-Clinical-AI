/**
 * Fleet Command route — /fleet/command renders FleetDashboard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FleetDashboard from './FleetDashboard';
import { buildFleetDashboardSnapshot } from '../../data/testHelpers/fleetToolsTestFixtures';

const mockFetchFleetCommandSnapshot = vi.fn();

vi.mock('../../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetCommandSnapshot: (...args) => mockFetchFleetCommandSnapshot(...args),
  };
});

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: vi.fn(),
    favorites: [],
    pinned: [],
    recentTools: [],
    toggleFavorite: vi.fn(),
    togglePinned: vi.fn(),
  }),
}));

function renderFleetRoute(initialPath = '/fleet/command') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/fleet/command" element={<FleetDashboard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Fleet Command route /fleet/command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it('renders FleetDashboard at /fleet/command', async () => {
    renderFleetRoute();

    expect(
      screen.getByRole('heading', { level: 1, name: /Fleet Command Dashboard/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fleet summary/i })).toBeInTheDocument();
    });
  });
});
