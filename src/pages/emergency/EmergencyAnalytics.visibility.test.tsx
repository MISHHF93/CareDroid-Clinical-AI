import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as cleanupConfig from '../../config/practitionerCleanup.config';
import { PractitionerVisibilityProvider } from '../../contexts/PractitionerVisibilityContext';
import EmergencyAnalytics from './EmergencyAnalytics';

vi.mock('../../hooks/useEmergencyOs', () => ({
  useAdvancedEmergencyOsUpgradeHarness: () => ({ data: null, loading: false, error: null }),
}));

vi.mock('../../hooks/useOperationalIntelligence', () => ({
  default: () => ({
    centralSnapshot: {
      sync: { lastSyncedAt: null, message: 'local', source: 'local' },
      generatedAt: null,
      capacityStatus: { score: 0, band: 'Green', occupiedRooms: 0, totalPatients: 0 },
      emsPressure: { status: 'normal', inbound: 0, criticalInbound: 0 },
      boardingStatus: { boarders: 0, risk: 'low' },
      queueHealth: [],
      reassessmentStatus: { due: 0, overdue: 0 },
      operationalAlerts: [],
      operationalSummary: { metrics: [] },
    },
    snapshot: { mode: 'rule_based', recommendations: [], disclaimers: { operational: '' } },
  }),
}));

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'physician',
    canAccessRoute: () => true,
  }),
}));

vi.mock('../../hooks/useRouteScreenMode', () => ({
  default: () => 'clinical_workstation',
}));

describe('EmergencyAnalytics visibility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders compact KPI strip and hides secondary charts during pilot cleanup', async () => {
    vi.spyOn(cleanupConfig, 'isPractitionerCleanupEnabled').mockReturnValue(true);

    const { container } = render(
      <MemoryRouter>
        <PractitionerVisibilityProvider>
          <EmergencyAnalytics />
        </PractitionerVisibilityProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Department Analytics' })).toBeInTheDocument();
    expect(container.querySelector('.emergency-analytics__kpi-strip')).toBeTruthy();
    expect(screen.queryByText('Hourly Arrival Heatmap')).not.toBeInTheDocument();
    expect(screen.queryByText('Top Chief Complaints')).not.toBeInTheDocument();
    expect(screen.getByText('Daily Patient Volume')).toBeInTheDocument();
  });
});