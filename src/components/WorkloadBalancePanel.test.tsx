import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatientState, Priority } from '../types/emergency';
import WorkloadBalancePanel from './WorkloadBalancePanel';

const mocks = vi.hoisted(() => ({
  showActionSuccess: vi.fn(),
  invokeUnifiedAiRequest: vi.fn(),
}));

vi.mock('../services/careDroidInteractionFeedback', () => ({
  showActionSuccess: mocks.showActionSuccess,
}));

vi.mock('../services/careDroidUnifiedAiNode', () => ({
  invokeUnifiedAiRequest: mocks.invokeUnifiedAiRequest,
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

  it('HEAL-174: discloses a failed AI rebalance call instead of silently presenting the rule-based fallback as "AI suggestions"', async () => {
    mocks.invokeUnifiedAiRequest.mockRejectedValueOnce(new Error('AI backend unreachable'));

    render(
      <WorkloadBalancePanel
        open
        activeShift={{ startTime: '2026-06-11T18:00:00-04:00', chargeStaffId: 'charge-rn' }}
        workloads={workloads}
        rebalanceSuggestion={{ name: 'Dr. Okonkwo', assignedCount: 6, teamAverage: 4.5 }}
        currentStaffProfile={{ id: 'charge-rn', displayName: 'Charge RN' }}
        onClose={vi.fn()}
        onAssignStaff={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Suggest rebalance/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI rebalance suggestions are unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Rule-based suggestions - requires review/i)).toBeInTheDocument();
    expect(screen.queryByText(/^AI suggestions - requires review$/i)).not.toBeInTheDocument();
  });

  it('HEAL-174: discloses an empty/malformed AI response the same way as an outright failure', async () => {
    mocks.invokeUnifiedAiRequest.mockResolvedValueOnce({ content: '', data: {} });

    render(
      <WorkloadBalancePanel
        open
        activeShift={{ startTime: '2026-06-11T18:00:00-04:00', chargeStaffId: 'charge-rn' }}
        workloads={workloads}
        rebalanceSuggestion={{ name: 'Dr. Okonkwo', assignedCount: 6, teamAverage: 4.5 }}
        currentStaffProfile={{ id: 'charge-rn', displayName: 'Charge RN' }}
        onClose={vi.fn()}
        onAssignStaff={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Suggest rebalance/i }));

    await waitFor(() => {
      expect(screen.getByText(/Rule-based suggestions - requires review/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/^AI suggestions - requires review$/i)).not.toBeInTheDocument();
  });

  it('HEAL-174: labels a real, well-formed AI response as AI suggestions', async () => {
    mocks.invokeUnifiedAiRequest.mockResolvedValueOnce({
      content: JSON.stringify({
        suggestions: [
          {
            patientId: 'pt-overload-1',
            fromStaffId: 'staff-okonkwo',
            toStaffId: 'staff-singh',
            patientName: 'Test pt-overload-1',
            fromStaffName: 'Dr. Okonkwo',
            toStaffName: 'Dr. Singh',
            reason: 'Balances active load.',
          },
        ],
      }),
    });

    render(
      <WorkloadBalancePanel
        open
        activeShift={{ startTime: '2026-06-11T18:00:00-04:00', chargeStaffId: 'charge-rn' }}
        workloads={workloads}
        rebalanceSuggestion={{ name: 'Dr. Okonkwo', assignedCount: 6, teamAverage: 4.5 }}
        currentStaffProfile={{ id: 'charge-rn', displayName: 'Charge RN' }}
        onClose={vi.fn()}
        onAssignStaff={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Suggest rebalance/i }));

    await waitFor(() => {
      expect(screen.getByText(/^AI suggestions - requires review$/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/AI rebalance suggestions are unavailable/i)).not.toBeInTheDocument();
  });
});
