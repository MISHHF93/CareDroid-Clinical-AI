import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CapacityCrisisMode from './CapacityCrisisMode';
import { confirmCareDroidAction } from '../services/careDroidInteractionFeedback';
import { PatientState } from '../types/emergency';

vi.mock('../services/careDroidInteractionFeedback', () => ({
  confirmCareDroidAction: vi.fn(),
}));

const { movePatientToState, mockStoreState } = vi.hoisted(() => {
  const movePatientToState = vi.fn();
  const mockStoreState = {
    addNote: vi.fn(),
    movePatientToState,
    setActiveQueueFilter: vi.fn(),
    requestAdditionalStaff: vi.fn(),
    activeShift: { chargeStaffId: 'staff-1' },
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
  return { movePatientToState, mockStoreState };
});

vi.mock('../store/emergencyStore', () => {
  const useEmergencyStore = (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState);
  useEmergencyStore.getState = () => mockStoreState;
  return { useEmergencyStore };
});

function dischargeReadyPatient() {
  const staleArrival = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  return {
    id: 'patient-1',
    name: 'Jordan Rivera',
    state: PatientState.Disposition,
    arrivalTime: staleArrival,
  };
}

describe('CapacityCrisisMode discharge confirmation (HEAL-226)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // movePatientToState must wait for the confirmation promise to resolve.
    await vi.waitFor(() =>
      expect(movePatientToState).toHaveBeenCalledWith(
        'patient-1',
        PatientState.Discharge,
        expect.anything(),
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
    expect(movePatientToState).not.toHaveBeenCalled();
  });
});
