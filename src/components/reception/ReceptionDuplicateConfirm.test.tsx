import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReceptionDuplicateConfirm from './ReceptionDuplicateConfirm';
import type { PatientDuplicateCandidate } from '../../utils/patientDuplicateDetection';

function candidate(overrides: Partial<PatientDuplicateCandidate> = {}): PatientDuplicateCandidate {
  return {
    patientId: 'p-1',
    displayName: 'Sam Lee',
    matchScore: 87,
    matchedFields: ['dob', 'lastName'],
    conflictingFields: [],
    recommendedAction: 'possible_duplicate_review',
    explanation: 'DOB and last name match an existing chart.',
    ...overrides,
  };
}

// Regression coverage: the matchScore% figure is computed by
// scorePatientDuplicate() (weighted field-comparison arithmetic, no model
// call) but had zero truth-label disclosure, reading as a measured
// probabilistic match confidence to reception staff.
describe('ReceptionDuplicateConfirm', () => {
  it('labels the duplicate match score as Manual (deterministic), not silently AI-branded', () => {
    render(
      <ReceptionDuplicateConfirm
        open
        candidates={[candidate()]}
        onUseExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/possible duplicate review/)).toBeInTheDocument();
    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/weighted field-comparison arithmetic/i);
  });

  it('renders nothing when closed or with no candidates', () => {
    const { container, rerender } = render(
      <ReceptionDuplicateConfirm
        open={false}
        candidates={[candidate()]}
        onUseExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <ReceptionDuplicateConfirm
        open
        candidates={[]}
        onUseExisting={vi.fn()}
        onCreateAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
