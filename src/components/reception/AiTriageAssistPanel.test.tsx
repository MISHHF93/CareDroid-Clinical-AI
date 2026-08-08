import { render, screen } from '@testing-library/react';
import AiTriageAssistPanel from './AiTriageAssistPanel';
import { NATIVE_AI_TRIAGE_RATIONALE_MARKER } from '../ai/AiTruthLabel';
import { PatientState, Priority, type Patient } from '../../types/emergency';

vi.mock('../../hooks/useTriageScreen', () => ({
  default: () => ({ showAiTriageAssist: true }),
}));
vi.mock('../../hooks/useReceptionScreen', () => ({
  default: () => ({ showClinicalTriageAssist: false }),
}));
vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({ roleLabel: 'Triage Nurse', can: () => true }),
}));
vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: Object.assign((selector: (state: any) => unknown) => selector({ patients: [] }), {
    getState: () => ({ patients: [], selectPatient: vi.fn(), copilotOpen: false, toggleCopilot: vi.fn() }),
  }),
}));

function basePatient(overrides: Partial<Patient> = {}): Patient {
  return {
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
    ...overrides,
  };
}

describe('AiTriageAssistPanel', () => {
  it('P0.4: shows a Manual truth label when the native-AI expert-system bridge contributed rationale', () => {
    const patient = basePatient({
      triageAssist: {
        suggestedPriority: Priority.P2,
        suggestedQueue: 'rapid',
        rationale: [
          'Rule matched: chest pain radiating.',
          `${NATIVE_AI_TRIAGE_RATIONALE_MARKER} P2 (82% confidence).`,
        ],
        confidence: 'high',
        ruleTriggered: 'chest-pain',
        disclaimers: ['Human review required.'],
        requiresHumanReview: true,
        generatedAt: new Date().toISOString(),
        source: 'rules',
        llmEnrichment: null,
        dismissedAt: null,
        acceptedAt: null,
      } as any,
    });

    render(<AiTriageAssistPanel patient={patient} />);

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/native-ai expert-system/i);
  });

  it('shows no truth label when the assist was never touched by the native-AI bridge', () => {
    const patient = basePatient({
      triageAssist: {
        suggestedPriority: Priority.P3,
        suggestedQueue: 'standard',
        rationale: ['Rule matched: standard triage.'],
        confidence: 'medium',
        ruleTriggered: 'default',
        disclaimers: ['Human review required.'],
        requiresHumanReview: true,
        generatedAt: new Date().toISOString(),
        source: 'rules',
        llmEnrichment: null,
        dismissedAt: null,
        acceptedAt: null,
      } as any,
    });

    render(<AiTriageAssistPanel patient={patient} />);

    expect(screen.getByTestId('ai-triage-assist-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-truth-label-chip')).not.toBeInTheDocument();
  });
});
