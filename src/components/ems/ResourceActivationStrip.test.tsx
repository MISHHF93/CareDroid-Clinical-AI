import { render, screen } from '@testing-library/react';
import ResourceActivationStrip from './ResourceActivationStrip';
import { Priority, type EMSArrival } from '../../types/emergency';

/**
 * P0.4 truth-label coverage: deriveResourceActivations (resourceActivation.ts)
 * computes "NN% confidence" purely from regex complaint matching with a fixed
 * literal confidence per rule branch -- zero model call. Confirms the strip
 * discloses that via AiTruthLabel rather than presenting the bare percentage
 * as unlabeled probabilistic output.
 */
function buildArrival(overrides: Partial<EMSArrival> = {}): EMSArrival {
  return {
    id: 'ems-1',
    unitId: 'unit-12',
    unitName: 'Medic 12',
    crewNames: ['Alvarez', 'Cho'],
    patientAge: 58,
    patientSex: 'M',
    chiefComplaint: 'Chest pain, suspected STEMI',
    eta: 6,
    severity: 'Critical',
    dispatchTime: '2026-08-10T08:00:00.000Z',
    estimatedArrivalTime: '2026-08-10T08:06:00.000Z',
    notes: '',
    status: 'Inbound',
    prearrivalComplaint: 'Chest pain, suspected STEMI',
    priority: Priority.P1,
    ...overrides,
  };
}

describe('ResourceActivationStrip', () => {
  it('discloses the deterministic rule engine via AiTruthLabel, not a bare unlabeled confidence percentage', () => {
    render(<ResourceActivationStrip arrival={buildArrival()} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/regex complaint matching/i);
    expect(label.getAttribute('title')).toMatch(/not a trained model/i);

    // The confidence percentage itself is still shown (additive, not replaced).
    expect(screen.getByText(/\d+% confidence/)).toBeInTheDocument();
  });

  it('renders nothing (no orphaned truth label) when no activation is derived', () => {
    const { container } = render(
      <ResourceActivationStrip
        arrival={buildArrival({ chiefComplaint: '', prearrivalComplaint: '' })}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('ai-truth-label-chip')).not.toBeInTheDocument();
  });
});
