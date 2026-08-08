import { render, screen } from '@testing-library/react';
import ClinicalAcuityLeaderboard from './ClinicalAcuityLeaderboard';
import type { Patient } from '../../types/emergency';
import { PatientState, Priority } from '../../types/emergency';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1980-01-01',
  age: 45,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Abdominal pain',
  complaintCategory: 'GI',
  state: PatientState.Results,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('ClinicalAcuityLeaderboard', () => {
  it('P0.4: each row shows an AI truth label instead of a raw sourceState string', () => {
    render(<ClinicalAcuityLeaderboard patients={[patient]} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    // buildClinicalAcuityEntry() always defaults to 'demo' unless explicitly
    // 'simulated' -- it must never silently read as Live, since none of the
    // 3 heuristics behind this composite score are trained-model-backed.
    expect(label).toHaveTextContent('Demo');
    expect(label.getAttribute('title')).toMatch(/composite acuity score/i);
  });

  it('does not render a raw, unlabeled sourceState string anywhere in the row', () => {
    render(<ClinicalAcuityLeaderboard patients={[patient]} />);
    expect(screen.queryByText('demo', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('simulated', { exact: true })).not.toBeInTheDocument();
  });
});
