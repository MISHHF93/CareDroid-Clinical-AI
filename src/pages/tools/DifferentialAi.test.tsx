import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DifferentialAi from './DifferentialAi';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { generateDifferentialAi } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  generateDifferentialAi: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/differential-ai']}>
      <DifferentialAi />
    </MemoryRouter>,
  );
}

describe('DifferentialAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateDifferentialAi.mockResolvedValue({
      ok: true,
      data: {
        runId: 'diff-run-1',
        status: 'ranked_differential_generated',
        rankedDifferentials: [
          {
            rank: 1,
            condition: 'Acute coronary syndrome',
            likelihood: 'higher',
            supportingEvidence: ['Chest pain pattern', 'Matched input keyword: troponin'],
            missingEvidence: ['Serial troponins', 'ECG interpretation'],
            urgencyFlags: ['Treat ongoing ischemic symptoms as time-sensitive.'],
          },
        ],
        suggestedCalculators: [
          {
            id: 'heart-score',
            label: 'HEART score',
            route: '/tools/calculators/heart-score',
            rationale: 'Chest pain risk stratification support.',
          },
        ],
        explainability: {
          reasoningTrace: ['Matched symptoms against curated presentation patterns.'],
          evidenceInputsUsed: ['symptoms', 'labs', 'history', 'demographics'],
          limitations: ['Decision support only; this is not a diagnosis.'],
        },
        safety: {
          warnings: ['Decision support only. Not a diagnosis.'],
        },
      },
    });
  });

  it('renders decision-support-only safety copy', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /differential diagnosis assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/decision support only/i)).toBeInTheDocument();
    expect(screen.getByText(/not diagnosis/i)).toBeInTheDocument();
  });

  it('generates ranked differentials, evidence, calculators, and explainability', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/symptoms/i), {
      target: { value: 'Chest pain with diaphoresis and nausea' },
    });
    fireEvent.change(screen.getByLabelText(/labs and studies/i), {
      target: { value: 'Troponin elevated' },
    });
    fireEvent.change(screen.getByLabelText(/history/i), {
      target: { value: 'Hypertension and diabetes' },
    });
    fireEvent.change(screen.getByLabelText(/age/i), { target: { value: '67' } });
    fireEvent.click(screen.getByRole('button', { name: /generate ranked differential/i }));

    await waitFor(() => {
      expect(generateDifferentialAi).toHaveBeenCalledWith(
        expect.objectContaining({
          symptoms: expect.stringContaining('Chest pain'),
          labs: 'Troponin elevated',
          history: 'Hypertension and diabetes',
          demographics: expect.objectContaining({ age: '67' }),
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: /acute coronary syndrome/i })).toBeInTheDocument();
    expect(screen.getByText(/Supporting evidence:/i)).toBeInTheDocument();
    expect(screen.getByText(/HEART score/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /explainability/i })).toBeInTheDocument();
  });
});
