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

  it('renders without throwing when an arrival has no status (same gap shape as HEAL-321, found in EmsUnitTrackGraphic)', () => {
    // EMSArrival.status is typed as required, but reaches this render path
    // from several loosely-typed sources (the realtime normalizer, and the
    // `any`-cast demo-scenario builder's SEED_EMS_UNITS/scenario fallback
    // chain in setActiveScenario) with no runtime validation. A missing
    // status crashed EmsUnitTrackGraphic's resolveEmsPhaseProgress
    // (status.toLowerCase()) in cdlGraphicModel.ts, taking down the whole
    // /emergency/ems route -- confirmed live via Playwright at 3440px.
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        emsArrivals: [
          {
            id: 'ems-missing-status',
            unitId: 'Medic 7',
            unitName: 'Medic 7',
            severity: 'High',
            eta: 4,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date().toISOString(),
            chiefComplaint: 'Shortness of breath',
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

  it('renders without throwing when arrival.notes is an object instead of a string (2nd latent bug found behind the HEAL-321-shaped status crash)', () => {
    // mechanismOfInjury/notes are both typed as plain strings on EMSArrival,
    // but this exact page previously crashed with "Objects are not valid as
    // a React child" once the status crash above was fixed and rendering
    // reached this row for real -- a note/log-shaped object had reached
    // `arrival.notes` instead of text. Confirmed live; the render now
    // coerces via safeArrivalText() instead of assuming the field is a
    // string.
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        emsArrivals: [
          {
            id: 'ems-object-notes',
            unitId: 'Medic 3',
            unitName: 'Medic 3',
            status: 'Inbound',
            severity: 'Moderate',
            eta: 5,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date().toISOString(),
            chiefComplaint: 'Fall injury',
            notes: {
              id: 'note-1',
              type: 'operational',
              body: 'Crew reports patient combative on scene.',
              authorId: 'staff-9',
              createdAt: new Date().toISOString(),
              metadata: {},
            },
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

  it('renders a "Physician-Requested (Simulated)" badge on a physician-initiated transport request, and never on a real EMS-initiated arrival', () => {
    // Live-verified end-to-end (curl against the real running backend, not
    // mocked): EMSIntakeService.requestPhysicianTransport() sets
    // simulated/requestSource/requestedByName/requestReason/requestLocation
    // on the arrival record it returns from getEMSIntake(). This is the
    // real-rendering counterpart proving EMSPipeline.tsx surfaces that data
    // as an explicit, distinguishing badge -- never silently indistinguishable
    // from a genuine EMS-initiated arrival.
    useEmergencyStore.setState(
      {
        ...originalState,
        patients: [],
        emsArrivals: [
          {
            id: 'ems-arrival-patient-simulated-1',
            unitId: 'ED-000001',
            unitName: 'ED-000001',
            status: 'Inbound',
            severity: 'Critical',
            eta: 14,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date(Date.now() + 14 * 60000).toISOString(),
            chiefComplaint: 'Worsening chest pain reported by phone',
            simulated: true,
            requestSource: 'physician_initiated_simulated',
            requestedByName: 'Dr. Rivera',
            requestReason: 'Worsening chest pain reported by phone',
            requestLocation: '123 Verification St, QA City',
          } as any,
          {
            id: 'ems-arrival-patient-real-1',
            unitId: 'Medic 12',
            unitName: 'Medic 12',
            status: 'Inbound',
            severity: 'High',
            eta: 8,
            dispatchTime: new Date().toISOString(),
            estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
            chiefComplaint: 'MVC with trauma',
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

    const { getAllByText, getByText, queryByText } = render(
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

    // Exactly one badge -- only the simulated arrival gets it, not the real one.
    const badges = getAllByText('Physician-Requested (Simulated)');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveAttribute(
      'title',
      expect.stringContaining('SIMULATED transport request'),
    );

    // The row-level SIMULATED note names the requester and states plainly
    // that no real EMS/CAD/911 system is connected.
    expect(getByText(/simulated — requested by dr\. rivera/i)).toBeInTheDocument();
    expect(
      getByText(/no real ambulance, ems unit, or 911\/cad dispatch system is connected/i),
    ).toBeInTheDocument();

    // Never anything that could read as a real dispatch outcome.
    expect(queryByText(/ambulance dispatched/i)).not.toBeInTheDocument();
  });
});
