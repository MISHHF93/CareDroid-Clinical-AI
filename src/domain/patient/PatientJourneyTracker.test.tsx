import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientJourneyTracker, getPatientJourneyStage } from './PatientJourneyTracker';
import { PatientState, Priority, type Patient } from '../../types/emergency';

const basePatient: Patient = {
  id: 'p1',
  mrn: 'ED-1001',
  firstName: 'Avery',
  lastName: 'Chen',
  dob: '1988-04-14',
  age: 38,
  sex: 'F',
  arrivalTime: '2026-06-27T10:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('PatientJourneyTracker', () => {
  it('maps patient state to the current journey stage', () => {
    expect(getPatientJourneyStage(basePatient).label).toBe('Triage');
    expect(
      getPatientJourneyStage({
        ...basePatient,
        state: PatientState.Results,
      }).label,
    ).toBe('Labs / Imaging');
  });

  it('renders a semantic step tracker with current-stage context', () => {
    render(<PatientJourneyTracker patient={basePatient} />);

    expect(screen.getByLabelText(/current stage triage/i)).toBeInTheDocument();
    expect(screen.getByText('Registration')).toBeInTheDocument();
    expect(screen.getByText('Discharge')).toBeInTheDocument();
    expect(screen.getByText('Triage').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
