import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalculatorRecommender from './CalculatorRecommender';
import { mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/calculator-recommender']}>
      <CalculatorRecommender />
    </MemoryRouter>,
  );
}

describe('CalculatorRecommender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendClinicalChatMessage).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        response: 'Recommended calculators',
        toolResult: {
          result: {
            recommendations: [
              { id: 'heart-score', label: 'HEART score', route: '/tools/calculators/heart-score' },
            ],
            matchedContexts: [{ id: 'chest-pain', label: 'Chest pain / ACS risk' }],
            safety: { warnings: ['Tool-selection support only.'] },
          },
        },
      },
    });
  });

  it('renders calculator recommendation safety scope', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /calculator recommendation ai/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/suggests existing caredroid calculators only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not diagnose/i)).toBeInTheDocument();
  });

  it('suggests real chest pain calculators from local workflow', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: 'Chest pain' },
    });
    fireEvent.change(screen.getByLabelText(/symptoms/i), {
      target: { value: 'Substernal pressure, diaphoresis, elevated troponin' },
    });
    fireEvent.change(screen.getByLabelText(/clinical keywords/i), {
      target: { value: 'ACS NSTEMI' },
    });
    fireEvent.click(screen.getByRole('button', { name: /suggest tools/i }));

    expect(screen.getByRole('heading', { name: /heart score/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /timi/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /grace acs/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ascvd/i })).toBeInTheDocument();
  });

  // Regression coverage: this tool is named "Calculator Recommendation AI", but the
  // primary "Suggest tools" path is confirmed keyword-table matching (no model call).
  // A prior audit found zero disclosure of that anywhere in the results. Since the
  // "Start chat workflow" button can populate the SAME result state via a real chat
  // service call, the label must only appear for the deterministic path.
  it('labels "Suggest tools" results as Manual (rule-based), not silently AI-branded', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /suggest tools/i }));

    expect(screen.getByRole('heading', { name: /heart score/i })).toBeInTheDocument();
    const chips = screen.getAllByTestId('ai-truth-label-chip').map((el) => el.textContent);
    expect(chips).toContain('Manual');
  });

  it('does not show the deterministic "Manual" label for chat-workflow-sourced results (a separate, pre-existing page-level label already discloses the chat path)', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /start chat workflow/i }));

    expect(await screen.findByRole('heading', { name: /heart score/i })).toBeInTheDocument();
    const chips = screen.getAllByTestId('ai-truth-label-chip').map((el) => el.textContent);
    expect(chips).not.toContain('Manual');
  });

  it('starts chat workflow with calculator-recommender-ai tool and feature hints', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: 'Chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /start chat workflow/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'calculator-recommender-ai',
          feature: 'calculator-recommender-ai',
          message: expect.stringContaining('Chief complaint: Chest pain'),
        }),
      );
    });
    expect(await screen.findByText(/recommended calculators/i)).toBeInTheDocument();
  });
});
