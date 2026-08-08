import { render, screen } from '@testing-library/react';
import CopilotRiskLayerPanel from './CopilotRiskLayerPanel';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../services/nativeAiCore', () => ({
  buildNativeAiPatientSnapshot: vi.fn(),
  formatRoutingLabel: () => 'Cardiology',
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
  state: PatientState.Results,
  priority: Priority.P2,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
};

describe('CopilotRiskLayerPanel', () => {
  it('P0.4: shows an AI truth label for the CDS layer routing/specialist detail instead of unlabeled AI output', () => {
    vi.mocked(buildNativeAiPatientSnapshot).mockReturnValue({
      patientId: 'p1',
      sourceState: 'live',
      routing: {
        specialistDomains: ['cardiology'],
        confidence: 0.7,
        keySignals: ['Chest pain'],
        routerModelVersion: '1.0.0',
        sourceState: 'live',
        disclaimer: 'Panel-of-experts routing.',
      },
      specialistInferences: [
        {
          specialistLabel: 'Cardiology',
          prediction: 'Possible ACS',
          confidence: 0.72,
          modelId: 'cardiac-vascular',
          modelVersion: '1.0.0',
          keyPredictors: ['ST changes'],
          requiresHumanReview: true,
          sourceState: 'live',
        },
      ],
      triageInference: {} as any,
      orientation: {} as any,
      prolongedStay: {} as any,
      admissionMl: {} as any,
      textFeatures: {} as any,
    });

    render(
      <CopilotRiskLayerPanel
        activeLayerId="clinical_decision_support"
        patient={patient}
        compact
      />,
    );

    // 'live' sourceState from a heuristic panel/specialist engine must read
    // Manual, not Live -- neither is backed by a trained model.
    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/panel-of-experts routing/i);
  });

  it('renders no truth label when no patient is selected (nothing AI-derived to label)', () => {
    render(<CopilotRiskLayerPanel activeLayerId="clinical_decision_support" patient={null} compact />);
    expect(screen.queryByTestId('ai-truth-label-chip')).not.toBeInTheDocument();
  });
});
