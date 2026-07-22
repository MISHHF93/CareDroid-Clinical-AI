import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PediatricDrugCalc from './PediatricDrugCalc';
import { useEmergencyStore } from '../../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../../types/emergency';

const originalState = useEmergencyStore.getState();

const patient: Patient = {
  id: 'pdc-patient-1',
  mrn: 'ED-PDC-1',
  firstName: 'Mia',
  lastName: 'Torres',
  dob: '2022-01-01',
  age: 4,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Fever',
  complaintCategory: 'Pediatric',
  state: PatientState.Assessment,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  assignedStaffId: 'peds-rn',
  notes: [],
  timeline: [],
};

afterEach(() => {
  useEmergencyStore.setState(originalState, true);
  vi.clearAllMocks();
});

function seedPatient() {
  useEmergencyStore.setState({ ...originalState, patients: [patient], alerts: [] }, true);
}

describe('PediatricDrugCalc', () => {
  it('shows "--" for every dose and marks the critical resus drugs before a weight is entered', () => {
    seedPatient();
    render(<PediatricDrugCalc patientId={patient.id} onClose={vi.fn()} />);

    expect(screen.getByText(/not entered/)).toBeTruthy();
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);

    const epiRow = screen.getByText('Epinephrine IV (arrest)').closest('tr');
    expect(epiRow?.className).toContain('pdc-drug-row--critical');

    const adenosineRow = screen.getByText('Adenosine').closest('tr');
    expect(adenosineRow?.className).not.toContain('pdc-drug-row--critical');
  });

  it('calculates weight-based doses once a weight is entered', async () => {
    const user = userEvent.setup();
    seedPatient();
    render(<PediatricDrugCalc patientId={patient.id} onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Enter weight in kg'), '20');

    // Levetiracetam: 20kg x 20 mg/kg = 400mg, under its 3000mg max.
    const levetiracetamRow = screen.getByText('Levetiracetam').closest('tr');
    expect(levetiracetamRow).toHaveTextContent('400.00');
  });

  it('saves a dosing reference note to the patient and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    seedPatient();
    render(<PediatricDrugCalc patientId={patient.id} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Enter weight in kg'), '20');
    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore.getState().patients.find((candidate) => candidate.id === patient.id);
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'Pediatric Drug Calculator: 12/12 — Dosing reference generated',
          authorId: 'peds-rn',
          type: 'Score',
        }),
      ]),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
