import { render, screen } from '@testing-library/react';
import PostEdOrientationBadge from './PostEdOrientationBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/nativeAiCore', () => ({
  predictPostEdOrientation: vi.fn(),
}));

import { predictPostEdOrientation } from '../../services/nativeAiCore';

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

describe('PostEdOrientationBadge', () => {
  it('P0.4: labels a live-sourceState prediction Manual, since the classifier is deterministic, not a trained model', () => {
    vi.mocked(predictPostEdOrientation).mockReturnValue({
      patientId: 'p1',
      orientation: 'admit',
      probabilities: { admit: 80, edou: 15, discharge: 5 },
      confidence: 0.8,
      modelId: 'post-ed-orientation',
      modelVersion: '1.0.0',
      keyPredictors: ['Abnormal labs'],
      requiresHumanReview: true,
      sourceState: 'live',
    });

    render(<PostEdOrientationBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/post-ed-orientation@1\.0\.0/i);
  });

  it('labels a demo-sourceState prediction Demo, matching this function real default when no sourceState is passed', () => {
    vi.mocked(predictPostEdOrientation).mockReturnValue({
      patientId: 'p1',
      orientation: 'discharge',
      probabilities: { admit: 10, edou: 10, discharge: 80 },
      confidence: 0.6,
      modelId: 'post-ed-orientation',
      modelVersion: '1.0.0',
      keyPredictors: [],
      requiresHumanReview: true,
      sourceState: 'demo',
    });

    render(<PostEdOrientationBadge patient={patient} />);
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Demo');
  });
});
