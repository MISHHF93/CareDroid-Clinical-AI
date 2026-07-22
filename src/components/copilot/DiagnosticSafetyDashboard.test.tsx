import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiagnosticSafetyDashboard from './DiagnosticSafetyDashboard';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1945-01-01',
    age: 81,
    sex: 'M',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P2,
    vitals: [{ hr: 128, sbp: 88, spo2: 91, recordedAt: '2026-06-24T08:05:00.000Z' }],
    flags: [PatientFlag.ReassessmentDue],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('DiagnosticSafetyDashboard', () => {
  it('renders each patient with their MRN, priority, and risk score', () => {
    render(<DiagnosticSafetyDashboard patients={[patient()]} />);
    expect(screen.getByRole('heading', { name: 'Diagnostic Safety Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
    expect(screen.getByText(/ED-1/)).toBeInTheDocument();
  });

  it('renders the patient name as a clickable button that calls onSelectPatient with the patient id', async () => {
    const user = userEvent.setup();
    const onSelectPatient = vi.fn();
    render(<DiagnosticSafetyDashboard patients={[patient()]} onSelectPatient={onSelectPatient} />);

    await user.click(screen.getByRole('button', { name: 'Sam Lee' }));
    expect(onSelectPatient).toHaveBeenCalledWith('p1');
  });

  it('renders the patient name as plain text, not a button, when onSelectPatient is omitted', () => {
    render(<DiagnosticSafetyDashboard patients={[patient()]} />);
    expect(screen.queryByRole('button', { name: 'Sam Lee' })).not.toBeInTheDocument();
    expect(screen.getByText('Sam Lee')).toBeInTheDocument();
  });

  it('renders an empty list without crashing when there are no patients', () => {
    render(<DiagnosticSafetyDashboard patients={[]} />);
    expect(screen.getByRole('heading', { name: 'Diagnostic Safety Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeEmptyDOMElement();
  });
});
