import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReceptionWorkspace from './ReceptionWorkspace';
import { HelpHubProvider } from '../../contexts/HelpHubContext';
import { PractitionerVisibilityProvider } from '../../contexts/PractitionerVisibilityContext';
import { RouteChromeProvider } from '../../contexts/RouteChromeContext';
import { useEmergencyStore } from '../../store/emergencyStore';

// HEAL follow-up: the standard create/route path's own createPatientAndRouteFromReception
// creates a patient record synchronously (store.addPatient, no await before it -- see
// receptionIntakeOrchestrator.ts), so it's mocked here to prove ReceptionWorkspace's own
// double-click guard (not the orchestrator) is what prevents a duplicate call.
const createPatientAndRouteFromReceptionMock = vi.hoisted(() => vi.fn());

vi.mock('../../services/receptionIntakeOrchestrator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/receptionIntakeOrchestrator')>();
  return {
    ...actual,
    createPatientAndRouteFromReception: createPatientAndRouteFromReceptionMock,
  };
});

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
    attentionStrip: true,
    taskSheet: true,
    showInlineCopilot: true,
    showNestedEscalationStrip: false,
    showNestedEscalationQuickActions: false,
    show: () => true,
    canUseRegistrationSkills: true,
    lookupBeforeCreateDefault: false,
    labelAssistAsDeskNotAi: true,
    staffProfile: { skillIds: ['registration'] },
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
  createPatientAndRouteFromReceptionMock.mockReset();
  // Never resolves within a test -- these tests only assert on how many
  // times create was CALLED, not on the create-succeeded UI flow.
  createPatientAndRouteFromReceptionMock.mockImplementation(() => new Promise(() => {}));
});

describe('ReceptionWorkspace render', () => {
  it('renders without throwing', () => {
    let error;
    try {
      render(
        <MemoryRouter initialEntries={['/emergency/reception']}>
          <RouteChromeProvider>
            <PractitionerVisibilityProvider>
              <HelpHubProvider>
                <ReceptionWorkspace />
              </HelpHubProvider>
            </PractitionerVisibilityProvider>
          </RouteChromeProvider>
        </MemoryRouter>,
      );
    } catch (e: any) {
      error = e;
    }
    expect(error).toBeUndefined();
  });

  it('HEAL follow-up: guards the standard create & route path against duplicate-patient double-submit', () => {
    render(
      <MemoryRouter initialEntries={['/emergency/reception']}>
        <RouteChromeProvider>
          <PractitionerVisibilityProvider>
            <HelpHubProvider>
              <ReceptionWorkspace />
            </HelpHubProvider>
          </PractitionerVisibilityProvider>
        </RouteChromeProvider>
      </MemoryRouter>,
    );

    const routeButton = screen.getByTestId('reception-create-route');

    // Simulate a real double-click: both clicks must land before React flushes
    // the `submitting` state update from the first one, so they're dispatched
    // inside the SAME act() batch -- two separate fireEvent.click() calls would
    // each be auto-flushed by RTL's act() wrapper in between and would no
    // longer reproduce the race a plain double-click actually causes.
    act(() => {
      fireEvent.click(routeButton);
      fireEvent.click(routeButton);
    });

    expect(createPatientAndRouteFromReceptionMock).toHaveBeenCalledTimes(1);
  });
});
