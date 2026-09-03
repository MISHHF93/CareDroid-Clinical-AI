import { render, screen } from '@testing-library/react';
import SpecialistInferenceBadge from './SpecialistInferenceBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/nativeAiCore', () => ({
  buildNativeAiPatientSnapshot: vi.fn(),
}));

import { buildNativeAiPatientSnapshot } from '../../services/nativeAiCore';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1980-01-01',
  age: 45,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

function mockSnapshot(
  overrides: Partial<{ sourceState: 'live' | 'demo' | 'simulated' | 'shadow' }> = {},
) {
  vi.mocked(buildNativeAiPatientSnapshot).mockReturnValue({
    specialistInferences: [
      {
        domainId: 'cardiac_vascular',
        specialistLabel: 'Cardiac-Vascular',
        prediction: 'ACS pathway review',
        confidence: 0.72,
        keyPredictors: ['Complaint: chest pain'],
        recommendedTools: [],
        modelId: 'native-ai-cardiac-vascular-v1',
        modelVersion: '1.0.0',
        requiresHumanReview: true,
        sourceState: overrides.sourceState || 'live',
      },
    ],
  } as any);
}

describe('SpecialistInferenceBadge', () => {
  it('P0.4: labels a live-sourceState inference Manual, since the domain specialist is keyword/regex matching, not a trained model', () => {
    mockSnapshot({ sourceState: 'live' });
    render(<SpecialistInferenceBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/native-ai-cardiac-vascular-v1@1\.0\.0/);
  });

  it('labels a demo-sourceState inference Demo', () => {
    mockSnapshot({ sourceState: 'demo' });
    render(<SpecialistInferenceBadge patient={patient} />);
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Demo');
  });
});
