import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReceptionWorkspace from './ReceptionWorkspace';
import { useEmergencyStore } from '../../store/emergencyStore';

vi.mock('../../hooks/useEmergencyOs', () => ({
  useReceptionSnapshotPolling: () => ({
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'registration_clerk',
    roleLabel: 'Registration Clerk',
    staffId: 'staff-1',
    can: () => true,
    canMutate: () => true,
    canAccessRoute: () => true,
    nearestRoute: (path) => path,
    canonicalProfile: {
      id: 'staff-1',
      employeeId: 'staff-1',
      preferredName: 'Reception Test',
      fullName: 'Reception Test',
      hospitalSite: 'Test Hospital',
      shiftStatus: 'On shift',
    },
  }),
}));

vi.mock('../../hooks/useProfileNavigate', () => ({
  default: () => ({
    profileNavigate: vi.fn(),
    rawNavigate: vi.fn(),
    saasRole: 'registration-clerk',
  }),
}));

vi.mock('../../hooks/useReceptionDeskUi', () => ({
  default: () => ({
    enabled: true,
    slim: false,
    inlineQuickIntake: false,
    stripMetricIds: null,
    show: () => true,
  }),
}));

vi.mock('../../hooks/useRouteScreenMode', () => ({
  default: () => 'reception',
}));

const originalState = useEmergencyStore.getState();

beforeEach(() => {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [],
      emsArrivals: [],
      alerts: [],
      workflowLogs: [],
      referrals: [],
      staff: [],
      rooms: [],
      capacity: originalState.capacity,
      emergencySettings: originalState.emergencySettings,
    },
    true,
  );
});

describe('ReceptionWorkspace render', () => {
  it('renders without throwing', () => {
    let error;
    try {
      render(
        <MemoryRouter initialEntries={['/emergency/reception']}>
          <ReceptionWorkspace />
        </MemoryRouter>,
      );
    } catch (e: any) {
      error = e;
    }
    expect(error).toBeUndefined();
  });
});
