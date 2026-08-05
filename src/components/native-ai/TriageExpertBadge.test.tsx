import { render, screen } from '@testing-library/react';
import TriageExpertBadge from './TriageExpertBadge';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/nativeAiCore', () => ({
  inferTriageFromExpertSystem: vi.fn(),
}));

import { inferTriageFromExpertSystem } from '../../services/nativeAiCore';

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
  triagePending: true,
};

describe('TriageExpertBadge', () => {
  it('P0.4: labels a live-sourceState inference Manual, since the NLP triage engine is a heuristic, not a trained model', () => {
    vi.mocked(inferTriageFromExpertSystem).mockReturnValue({
      suggestedPriority: Priority.P2,
      matchedRules: ['Elderly chest pain'],
      confidence: 0.84,
      rationale: ['Matched rule: elderly chest pain'],
      requiresHumanReview: true,
      sourceState: 'live',
    });

    render(<TriageExpertBadge patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/staff confirmation required|human review/i);
  });

  it('labels a demo-sourceState inference Demo', () => {
    vi.mocked(inferTriageFromExpertSystem).mockReturnValue({
      suggestedPriority: Priority.P2,
      matchedRules: [],
      confidence: 0.62,
      rationale: ['Baseline triage engine applied'],
      requiresHumanReview: true,
      sourceState: 'demo',
    });

    render(<TriageExpertBadge patient={patient} />);
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Demo');
  });
});
