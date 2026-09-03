import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PatientFlowStatusPanel } from './PatientFlowStatusPanel';

const mockUseContinuousPatientFlow = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/useContinuousPatientFlow', () => ({
  default: (...args: unknown[]) => mockUseContinuousPatientFlow(...args),
}));

function renderPanel(props: Parameters<typeof PatientFlowStatusPanel>[0] = {}) {
  return render(
    <MemoryRouter>
      <PatientFlowStatusPanel {...props} />
    </MemoryRouter>,
  );
}

describe('PatientFlowStatusPanel', () => {
  it('P0.4: labels the fleet-wide "AI operational recommendations" list Manual, not an unlabeled AI claim', () => {
    mockUseContinuousPatientFlow.mockReturnValue({
      snapshot: {
        metrics: {
          trackedPatients: 5,
          activeDetections: 2,
          congestedDepartments: 1,
          overloadedDepartments: 0,
          delayedHandoffs: 0,
        },
      },
      patientSnapshot: null,
      detections: [],
      aiRecommendations: [
        {
          id: 'r1',
          action: 'Escalate triage',
          rationale: 'Queue overload detected',
          priority: 'high',
        },
      ],
    });

    renderPanel();

    expect(screen.getByText('AI operational recommendations')).toBeInTheDocument();
    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/continuous patient flow engine/i);
  });

  it('labels a single-patient aiRecommendation the same way, not just the fleet-wide list', () => {
    mockUseContinuousPatientFlow.mockReturnValue({
      snapshot: { metrics: {} },
      patientSnapshot: {
        workflowStateLabel: 'Awaiting results',
        bottleneckStatus: 'watch',
        ownerRole: 'RN',
        ownerName: 'J. Rivera',
        stageWaitMinutes: 20,
        targetMinutes: 30,
        waitMinutes: 45,
        predictedNextStep: 'Review labs',
        aiRecommendation: 'Flag for early provider review',
        bottleneckReason: null,
      },
      detections: [],
      aiRecommendations: [],
    });

    renderPanel({ patientId: 'p1' });

    expect(screen.getByText('Flag for early provider review')).toBeInTheDocument();
    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Manual');
  });
});
