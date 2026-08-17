import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EMSPipeline from './EMSPipeline';
import { HelpHubProvider } from '../contexts/HelpHubContext';
import { PractitionerVisibilityProvider } from '../contexts/PractitionerVisibilityContext';
import { RouteChromeProvider } from '../contexts/RouteChromeContext';
import { useEmergencyStore } from '../store/emergencyStore';
import type { EmsScreenCapabilities } from '../config/emsScreenModel';

const emsScreenCapabilities: EmsScreenCapabilities = {
  isEmsScreen: false,
  screenMode: 'emergency' as any,
  role: 'paramedic',
  roleLabel: 'Paramedic',
  defaultFocus: 'incoming',
  defaultLandingRoute: '/emergency/ems',
  emsPath: '/emergency/ems',
  showWidget: () => true,
  canPerform: () => true,
  showInboundAmbulances: true,
  showEtaDisplay: true,
  showHandoffChecklist: true,
  showOffloadTimers: true,
  showReceivingArea: true,
  showEncounterConversion: true,
  showEmsPressure: true,
  showOperationalStrip: true,
  canPrepareEmsBay: true,
  canConvertArrival: true,
  canCompleteHandoff: true,
  canCreatePatient: true,
  canFocusReceivingArea: true,
  canOpenOffloadTracker: true,
  visibleOperationalSurfaces: [],
};

vi.mock('../hooks/useEmsScreen', () => ({
  useEmsScreen: () => emsScreenCapabilities,
  default: () => emsScreenCapabilities,
}));

vi.mock('../hooks/useEmergencyOs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useEmergencyOs')>();
  return {
    ...actual,
    useEMSIntake: () => ({
      data: { source: 'fixture', generatedAt: new Date().toISOString(), arrivals: [] },
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
  };
});

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'paramedic',
    roleLabel: 'Paramedic',
    staffId: 'staff-ems-1',
    can: () => true,
    canMutate: () => true,
    canAccessRoute: () => true,
    nearestRoute: (path: string) => path,
    presentAction: () => ({ visible: true, enabled: true }),
    canonicalProfile: {
      id: 'staff-ems-1',
      employeeId: 'staff-ems-1',
      preferredName: 'EMS Test',
      fullName: 'EMS Test',
      hospitalSite: 'Test Hospital',
      shiftStatus: 'On shift',
    },
  }),
}));

vi.mock('../hooks/useProfileNavigate', () => ({
  default: () => ({
    profileNavigate: vi.fn(),
    rawNavigate: vi.fn(),
    saasRole: 'paramedic',
  }),
}));

const originalState = useEmergencyStore.getState();

beforeEach(() => {
  useEmergencyStore.setState(
    {
      ...originalState,
      patients: [],
      emsArrivals: [],
      staff: [],
      rooms: [],
      alerts: [],
      capacity: originalState.capacity,
      emergencySettings: originalState.emergencySettings,
    },
    true,
  );
});

describe('EMSPipeline render', () => {
  it('renders without throwing', () => {
    let error: unknown;
    try {
      render(
        <MemoryRouter initialEntries={['/emergency/ems']}>
          <RouteChromeProvider>
            <PractitionerVisibilityProvider>
              <HelpHubProvider>
                <EMSPipeline />
              </HelpHubProvider>
            </PractitionerVisibilityProvider>
          </RouteChromeProvider>
        </MemoryRouter>,
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
  });

  it('renders the empty-inbound state when there are no active arrivals', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/emergency/ems']}>
        <RouteChromeProvider>
          <PractitionerVisibilityProvider>
            <HelpHubProvider>
              <EMSPipeline />
            </HelpHubProvider>
          </PractitionerVisibilityProvider>
        </RouteChromeProvider>
      </MemoryRouter>,
    );
    expect(getByText('No inbound EMS units in the active CareDroid state.')).toBeInTheDocument();
  });

  it('HEAL-276: excludes an arrival already converted to a patient from "Awaiting Handoff", matching EMSPressureScore', () => {
    // convertEMSArrivalToPatient() assigns patientId but leaves
    // status: 'Handoff' -- this arrival has already become a live patient
    // (bed assigned, in the ED), so it should not show as a phantom
    // "still waiting" ambulance.
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        emsArrivals: [
          {
            id: 'ems-already-converted',
            unitId: 'Medic 9',
            unitName: 'Medic 9',
            status: 'Handoff',
            severity: 'Moderate',
            eta: 0,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date().toISOString(),
            arrivedAt: new Date().toISOString(),
            patientId: 'patient-already-converted',
            chiefComplaint: 'Abdominal pain',
          } as any,
        ],
        staff: [],
        rooms: [],
        alerts: [],
        capacity: originalState.capacity,
        emergencySettings: originalState.emergencySettings,
      },
      true,
    );

    const { getByText } = render(
      <MemoryRouter initialEntries={['/emergency/ems']}>
        <RouteChromeProvider>
          <PractitionerVisibilityProvider>
            <HelpHubProvider>
              <EMSPipeline />
            </HelpHubProvider>
          </PractitionerVisibilityProvider>
        </RouteChromeProvider>
      </MemoryRouter>,
    );

    const heading = getByText('Awaiting Handoff');
    const countBadge = heading.parentElement?.querySelector('span');
    expect(countBadge?.textContent).toBe('0');
  });

  it('HEAL-321: renders without throwing when an arrival has no severity (real backend/CAD feed gap)', () => {
    // EMSArrival.severity is typed as required, but the normalizer that
    // builds arrivals from raw backend/CAD data (extractEmsIncomingPatients
    // in emergencyStore.ts) spread whatever the feed sent with no
    // validation -- a real arrival missing this field crashed the whole
    // route via arrival.severity.toLowerCase(). This test exercises the
    // render directly (the store-level normalizer fix has its own
    // coverage) so a future regression at either layer still gets caught.
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        emsArrivals: [
          {
            id: 'ems-missing-severity',
            unitId: 'Medic 4',
            unitName: 'Medic 4',
            status: 'Inbound',
            eta: 6,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date().toISOString(),
            chiefComplaint: 'Chest pain',
          } as any,
        ],
        staff: [],
        rooms: [],
        alerts: [],
        capacity: originalState.capacity,
        emergencySettings: originalState.emergencySettings,
      },
      true,
    );

    let error: unknown;
    try {
      render(
        <MemoryRouter initialEntries={['/emergency/ems']}>
          <RouteChromeProvider>
            <PractitionerVisibilityProvider>
              <HelpHubProvider>
                <EMSPipeline />
              </HelpHubProvider>
            </PractitionerVisibilityProvider>
          </RouteChromeProvider>
        </MemoryRouter>,
      );
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
  });
});
