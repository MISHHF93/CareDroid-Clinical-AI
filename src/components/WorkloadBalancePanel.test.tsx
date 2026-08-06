import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PatientState, Priority } from '../types/emergency';
import WorkloadBalancePanel from './WorkloadBalancePanel';

const mocks = vi.hoisted(() => ({
  showActionSuccess: vi.fn(),
}));

vi.mock('../services/careDroidInteractionFeedback', () => ({
  showActionSuccess: mocks.showActionSuccess,
}));

function patient(id, assignedStaffId) {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    chiefComplaint: 'Chest pain',
    state: PatientState.Assessment,
    priority: Priority.P2,
    assignedStaffId,
  };
}

const drOkonkwoPatient = patient('pt-overload-1', 'staff-okonkwo');
const workloads = [
  {
    id: 'staff-okonkwo',
    displayName: 'Dr. Okonkwo',
    initials: 'DO',
    roleLabel: 'MD',
    assignedCount: 6,
    assignedPatients: [drOkonkwoPatient],
    workloadTone: 'red',
    workloadPercent: 100,
  },
  {
    id: 'staff-singh',
    displayName: 'Dr. Singh',
    initials: 'DS',
    roleLabel: 'MD',
    assignedCount: 3,
    assignedPatients: [],
    workloadTone: 'green',
    workloadPercent: 50,
  },
];

describe('WorkloadBalancePanel', () => {
  it('expands a staff row and reassigns a patient', () => {
    const onAssignStaff = vi.fn();

    render(
      <WorkloadBalancePanel
        open
        activeShift={{ startTime: '2026-06-11T18:00:00-04:00', chargeStaffId: 'charge-rn' }}
        workloads={workloads}
        rebalanceSuggestion={{
          name: 'Dr. Okonkwo',
          assignedCount: 6,
          teamAverage: 4.5,
        }}
        currentStaffProfile={{ id: 'charge-rn', displayName: 'Charge RN' }}
        onClose={vi.fn()}
        onAssignStaff={onAssignStaff}
      />
    );

    expect(screen.getByText(/Imbalance detected - Dr. Okonkwo has 6 patients/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dr. Okonkwo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reassign/i }));
    fireEvent.change(screen.getByLabelText(/Reassign to/i), {
      target: { value: 'staff-singh' },
    });

    expect(onAssignStaff).toHaveBeenCalledWith(
      'pt-overload-1',
      'staff-singh',
      expect.objectContaining({
        actorStaffId: 'charge-rn',
        fromStaffName: 'Dr. Okonkwo',
        toStaffName: 'Dr. Singh',
        reason: 'Workload balance panel reassignment',
      })
    );
    expect(mocks.showActionSuccess).toHaveBeenCalledWith(
      'Test pt-overload-1 reassigned',
      'Now assigned to Dr. Singh.',
    );
  });
});
