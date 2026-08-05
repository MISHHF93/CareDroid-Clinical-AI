import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AiChiefRouteRecommendationsPanel } from './AiChiefRouteRecommendationsPanel';

const mockEscalate = vi.fn();
const mockSelectPatient = vi.fn();
const mockProfileNavigate = vi.fn();

vi.mock('../../hooks/useAiChiefOrchestrator', () => ({
  default: () => ({
    snapshot: {
      recommendations: [
        {
          id: 'rec-1',
          domain: 'patient_prioritization',
          action: 'Assign physician to P1 patient',
          rationale: 'Priority 1 patient awaiting assessment.',
          reasonCodes: ['p1-wait'],
          confidence: 0.9,
          route: '/emergency/whiteboard',
          patientId: 'patient-1',
          ownerRole: 'Charge nurse',
          priority: 'P0',
          tone: 'critical',
          humanReviewRequired: true,
          advisoryOnly: true,
          modelOrRuleId: 'ai-chief-v1',
        },
      ],
      metrics: {
        activePatients: 1,
        p1p2Patients: 1,
      },
      generatedAt: '2026-07-03T12:00:00.000Z',
    },
  }),
}));

vi.mock('../../hooks/useProfileNavigate', () => ({
  default: () => ({
    profileNavigate: mockProfileNavigate,
    rawNavigate: vi.fn(),
    saasRole: 'practitioner',
  }),
}));

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      patients: [
        {
          id: 'patient-1',
          firstName: 'Alex',
          lastName: 'Rivera',
          name: 'Rivera, Alex',
        },
      ],
      escalatePatient: mockEscalate,
      selectPatient: mockSelectPatient,
    }),
}));

vi.mock('../../services/careDroidInteractionFeedback', () => ({
  confirmCareDroidAction: vi.fn(async () => true),
  showActionSuccess: vi.fn(),
}));

describe('AiChiefRouteRecommendationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders orchestrator recommendations with advisory safety copy', () => {
    render(
      <MemoryRouter>
        <AiChiefRouteRecommendationsPanel />
      </MemoryRouter>,
    );

    expect(screen.getByRole('region', { name: /ai chief route recommendations/i })).toBeInTheDocument();
    expect(screen.getByText('Assign physician to P1 patient')).toBeInTheDocument();
    expect(screen.getByText(/priority 1 patient awaiting assessment/i)).toBeInTheDocument();
    expect(screen.getByRole('note', { name: /ai safety review notice/i })).toBeInTheDocument();
  });

  it('labels the recommendation as Manual (rule-based, not a trained model)', () => {
    render(
      <MemoryRouter>
        <AiChiefRouteRecommendationsPanel />
      </MemoryRouter>,
    );

    const chip = screen.getByTestId('ai-truth-label-chip');
    expect(chip).toHaveTextContent('Manual');
    expect(chip.getAttribute('title')).toMatch(/rule-based/i);
    expect(chip.getAttribute('title')).toMatch(/not a trained model/i);
  });

  it('accepts patient-linked escalation recommendations after confirmation', async () => {
    const user = userEvent.setup();
    const { confirmCareDroidAction, showActionSuccess } = await import(
      '../../services/careDroidInteractionFeedback'
    );

    render(
      <MemoryRouter>
        <AiChiefRouteRecommendationsPanel />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /^accept$/i }));

    expect(confirmCareDroidAction).toHaveBeenCalled();
    expect(mockEscalate).toHaveBeenCalledWith('patient-1', {
      staffId: 'charge-nurse-current',
      staffName: 'Charge Nurse',
    });
    expect(mockSelectPatient).toHaveBeenCalledWith('patient-1');
    expect(mockProfileNavigate).toHaveBeenCalledWith('/emergency/whiteboard');
    expect(showActionSuccess).toHaveBeenCalled();
    expect(screen.getByText(/accepted — clinician review still required/i)).toBeInTheDocument();
  });
});