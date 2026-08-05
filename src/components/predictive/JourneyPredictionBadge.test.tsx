import { render, screen } from '@testing-library/react';
import JourneyPredictionBadge from './JourneyPredictionBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../engine/patientJourneyPrediction', () => ({
  predictPatientJourney: vi.fn(),
}));

import { predictPatientJourney } from '../../engine/patientJourneyPrediction';

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

describe('JourneyPredictionBadge', () => {
  it('P0.4: labels a live-maturity envelope Manual, since journey prediction is an explainable heuristic, not a trained model', () => {
    vi.mocked(predictPatientJourney).mockReturnValue({
      admissionProbability: 70,
      admissionBand: 'high',
      prolongedStayRisk: 'high',
      prolongedStayProbability: 60,
      chestXrayUtilizationProbability: 20,
      thresholdBreached: true,
      humanReviewRequired: true,
      keyPredictors: ['Elderly', 'Respiratory complaint'],
      envelope: {
        value: { admissionProbability: 70, prolongedStayRisk: 'high' },
        maturity: 'live',
        humanReviewRequired: true,
        rationale: ['Elderly with respiratory complaint'],
        sourceFields: ['age', 'complaintCategory'],
        disclaimer: 'Operational estimate only.',
      },
    });

    render(<JourneyPredictionBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
  });

  it('labels a demo-maturity envelope Demo', () => {
    vi.mocked(predictPatientJourney).mockReturnValue({
      admissionProbability: 70,
      admissionBand: 'high',
      prolongedStayRisk: 'high',
      prolongedStayProbability: 60,
      chestXrayUtilizationProbability: 20,
      thresholdBreached: true,
      humanReviewRequired: true,
      keyPredictors: [],
      envelope: {
        value: { admissionProbability: 70, prolongedStayRisk: 'high' },
        maturity: 'demo',
        humanReviewRequired: true,
        rationale: [],
        sourceFields: [],
        disclaimer: 'Operational estimate only.',
      },
    });

    render(<JourneyPredictionBadge patient={patient} />);
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Demo');
  });
});
