import { render, screen } from '@testing-library/react';
import AdmissionProbabilityBadge from './AdmissionProbabilityBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/predictiveAdmissionModel', () => ({
  assessPatientAdmissionProbability: vi.fn(),
}));

import { assessPatientAdmissionProbability } from '../../services/predictiveAdmissionModel';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1950-01-01',
  age: 75,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Shortness of breath',
  complaintCategory: 'Respiratory',
  state: PatientState.Waiting,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('AdmissionProbabilityBadge', () => {
  it('P0.4: always labels itself Manual, since the score blends two rule-based heuristics, not a trained model', () => {
    vi.mocked(assessPatientAdmissionProbability).mockReturnValue({
      patientId: 'p1',
      patientLabel: 'Sam Lee',
      probabilityPercent: 82,
      admitScore: 8,
      admitScoreMax: 10,
      band: 'high',
      thresholdBreached: true,
      rationale: ['Elderly with respiratory complaint'],
    });

    render(<AdmissionProbabilityBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/not a trained model/i);
  });

  it('renders nothing (including no truth label) when the score is low and no threshold was breached', () => {
    vi.mocked(assessPatientAdmissionProbability).mockReturnValue({
      patientId: 'p1',
      patientLabel: 'Sam Lee',
      probabilityPercent: 10,
      admitScore: 1,
      admitScoreMax: 10,
      band: 'low',
      thresholdBreached: false,
      rationale: [],
    });

    const { container } = render(<AdmissionProbabilityBadge patient={patient} />);
    expect(container).toBeEmptyDOMElement();
  });
});
