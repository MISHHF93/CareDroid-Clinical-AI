import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CapacityCrisisMode from './CapacityCrisisMode';
import { confirmCareDroidAction } from '../services/careDroidInteractionFeedback';
import { PatientState } from '../types/emergency';
import {
  PERMISSIVE_EMERGENCY_ROLE_MOCK,
  withEmergencyRoleMock,
} from '../test/permissiveEmergencyRoleMock';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';

vi.mock('../services/careDroidInteractionFeedback', () => ({
  confirmCareDroidAction: vi.fn(),
}));

// HEAL-347.85: CapacityCrisisMode's action buttons (Complete Discharge,
// Contact admitting team) now check emergencyRole.presentAction() before
// allowing the action, mirroring PatientDetailPanel.tsx's existing gate for
// the same discharge transition. Defaults to a permissive role (the real
// hook needs a <Router> context via useSearchParams(), which this render
// tree doesn't provide) so the existing discharge-flow tests below keep
// exercising an allowed role; the dedicated authorization test at the
// bottom of this file overrides it per-test to prove the gate itself works.
let currentRoleMock: any = PERMISSIVE_EMERGENCY_ROLE_MOCK;
vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => currentRoleMock,
  default: () => currentRoleMock,
}));

function dischargeReadyPatient() {
  const staleArrival = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  return {
    id: 'patient-1',
    name: 'Jordan Rivera',
    state: PatientState.Disposition,
    arrivalTime: staleArrival,
    flags: [],
  };
}

// dischargePatientSafely (via journeyEngine's validated movePatientToState) reads
// store.patients/dischargePatient/updateCapacity directly through
// useEmergencyStore.getState(), so the mock has to cover that whole surface, not
// just the props CapacityCrisisMode itself destructures.
const { dischargePatient, mockStoreState } = vi.hoisted(() => {
  const dischargePatient = vi.fn();
  const mockStoreState = {
    addNote: vi.fn(),
    movePatientToState: vi.fn(),
    dischargePatient,
    updateCapacity: vi.fn(),
    setActiveQueueFilter: vi.fn(),
    requestAdditionalStaff: vi.fn(),
    activeShift: { chargeStaffId: 'staff-1' },
    patients: [] as unknown[],
    thresholds: {
      capacityOrangePct: 0.8,
      capacityRedPct: 0.9,
      emsOffloadTargetMin: 15,
      reassessP1Min: 0,
      reassessP2Min: 15,
      reassessP3Min: 30,
      reassessP4Min: 60,
      reassessP5Min: 120,
    },
  };
  return { dischargePatient, mockStoreState };
});

vi.mock('../store/emergencyStore', () => {
  const useEmergencyStore = (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState);
  useEmergencyStore.getState = () => mockStoreState;
  return { useEmergencyStore };
});

describe('CapacityCrisisMode discharge confirmation (HEAL-226)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.patients = [dischargeReadyPatient()];
    currentRoleMock = PERMISSIVE_EMERGENCY_ROLE_MOCK;
  });

  it('requires a danger-tone confirmation before completing a discharge', async () => {
    vi.mocked(confirmCareDroidAction).mockResolvedValue(true);

    render(
      <CapacityCrisisMode
        capacity={{ score: 95, band: 'Red' } as any}
        patients={[dischargeReadyPatient() as any]}
        rooms={[]}
        referrals={[]}
        emsArrivals={[]}
        emsIncomingPatients={[]}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View Emergency Actions' }));
    const dischargeButton = await screen.findByRole('button', { name: 'Complete Discharge' });
    fireEvent.click(dischargeButton);

    expect(confirmCareDroidAction).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'danger', confirmLabel: 'Confirm discharge' }),
    );

    // The store's dischargePatient action must wait for the confirmation promise
    // to resolve -- reached via dischargePatientSafely's journey-rules-validated
    // path now (Disposition -> Discharge is a legal transition for this fixture,
    // so journeyEngine's movePatientToState calls store.dischargePatient with
    // {flags, timelineEvent}, not the raw {staffId, note} the override path uses).
    await vi.waitFor(() =>
      expect(dischargePatient).toHaveBeenCalledWith(
        'patient-1',
        expect.objectContaining({
          timelineEvent: expect.objectContaining({ staffId: 'staff-1' }),
        }),
      ),
    );
  });

  it('does not discharge the patient when the confirmation is declined', async () => {
    vi.mocked(confirmCareDroidAction).mockResolvedValue(false);

    render(
      <CapacityCrisisMode
        capacity={{ score: 95, band: 'Red' } as any}
        patients={[dischargeReadyPatient() as any]}
        rooms={[]}
        referrals={[]}
        emsArrivals={[]}
        emsIncomingPatients={[]}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View Emergency Actions' }));
    const dischargeButton = await screen.findByRole('button', { name: 'Complete Discharge' });
    fireEvent.click(dischargeButton);

    await vi.waitFor(() => expect(confirmCareDroidAction).toHaveBeenCalled());
    expect(dischargePatient).not.toHaveBeenCalled();
  });
});

describe('HEAL-347.85: CapacityCrisisMode action buttons respect per-action clinical authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.patients = [dischargeReadyPatient()];
  });

  it('disables Complete Discharge and never calls the store even if clicked, for a role without dischargePatient permission', async () => {
    currentRoleMock = withEmergencyRoleMock({
      presentAction: (actionId: string) => ({
        state: 'A',
        visible: true,
        enabled: actionId !== EMERGENCY_ACTIONS.dischargePatient,
        readOnly: false,
        permission: null,
      }),
    });

    render(
      <CapacityCrisisMode
        capacity={{ score: 95, band: 'Red' } as any}
        patients={[dischargeReadyPatient() as any]}
        rooms={[]}
        referrals={[]}
        emsArrivals={[]}
        emsIncomingPatients={[]}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View Emergency Actions' }));
    const dischargeButton = await screen.findByRole('button', { name: 'Complete Discharge' });
    expect(dischargeButton).toBeDisabled();

    fireEvent.click(dischargeButton);
    expect(confirmCareDroidAction).not.toHaveBeenCalled();
    expect(dischargePatient).not.toHaveBeenCalled();
  });
});
