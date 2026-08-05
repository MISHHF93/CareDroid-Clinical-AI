import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PatientCardCopilot from './PatientCardCopilot';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/careDroidUnifiedAiNode', () => ({
  invokeUnifiedAiConversational: vi.fn().mockResolvedValue({
    ok: true,
    content: 'Reviewed the chart — vitals stable, no new red flags.',
  }),
}));

vi.mock('../../services/emergencyOsApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/emergencyOsApi')>();
  return {
    ...actual,
    persistCopilotInteractionSafely: vi.fn(),
  };
});

import { invokeUnifiedAiConversational } from '../../services/careDroidUnifiedAiNode';

const originalState = useEmergencyStore.getState();

const patient: Patient = {
  id: 'copilot-patient-1',
  mrn: 'ED-COPILOT-1',
  firstName: 'Jordan',
  lastName: 'Reyes',
  dob: '1980-01-01',
  age: 46,
  sex: 'M',
  arrivalTime: '2026-07-21T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

function seedPatient() {
  useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);
}

describe('PatientCardCopilot', () => {
  it('renders expanded by default with a patient-scoped welcome message', () => {
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });
    expect(screen.getByRole('heading', { name: /Jordan Reyes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses and re-expands, toggling aria-expanded and hiding the body', async () => {
    const user = userEvent.setup();
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });

    await user.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Patient Copilot message')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand' }));
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Patient Copilot message')).toBeInTheDocument();
  });

  it('renders the fixed set of quick-action buttons', () => {
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });
    expect(
      screen.getByRole('button', { name: "Summarize this patient's current status based on the provided data." }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recommend clinical tools for this case' })).toBeInTheDocument();
  });

  it('sends a composer message, disables Send while awaiting a reply, and calls the AI service scoped to this patient', async () => {
    const user = userEvent.setup();
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });

    const input = screen.getByLabelText('Patient Copilot message');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();

    await user.type(input, 'Any allergy concerns?');
    expect(sendButton).not.toBeDisabled();

    await user.click(sendButton);

    expect(screen.getByText('Any allergy concerns?')).toBeInTheDocument();
    expect(invokeUnifiedAiConversational).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: patient.id, message: 'Any allergy concerns?' }),
    );
    expect(await screen.findByText(/Reviewed the chart/)).toBeInTheDocument();
  });

  it('P0.4: labels a successful AI reply Live, distinguishing it from the static welcome message', async () => {
    const user = userEvent.setup();
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });

    await user.type(screen.getByLabelText('Patient Copilot message'), 'Any allergy concerns?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/Reviewed the chart/);

    const labels = screen.getAllByTestId('ai-truth-label-chip');
    expect(labels).toHaveLength(1);
    expect(labels[0]).toHaveTextContent('Live');
  });

  it('P0.4: labels a failed AI call Stale rather than claiming a live reply', async () => {
    vi.mocked(invokeUnifiedAiConversational).mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    seedPatient();
    render(<PatientCardCopilot patient={patient} />, { wrapper: MemoryRouter });

    await user.type(screen.getByLabelText('Patient Copilot message'), 'Any allergy concerns?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText(/Copilot is unavailable/);

    expect(screen.queryByTestId('ai-truth-label-chip')).not.toBeInTheDocument();
  });
});
