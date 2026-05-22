import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiExplainability from './AiExplainability';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { fetchAiExplainabilityTrace } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  fetchAiExplainabilityTrace: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/ai-explainability']}>
      <AiExplainability />
    </MemoryRouter>,
  );
}

describe('AiExplainability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAiExplainabilityTrace.mockResolvedValue({
      ok: true,
      data: {
        runId: 'explain-1',
        confidence: {
          score: 0.86,
          label: 'high',
          rationale: 'Trace includes source metadata and verified execution logs.',
        },
        source: [{ label: 'guideline-rag', detail: 'clinical-intelligence/guideline-rag; hash abc...' }],
        reasoning: ['Reviewed sanitized execution logs.', 'Excluded raw prompts and PHI text.'],
        toolChain: ['guideline-rag -> evidence_found -> ai_query'],
        executionLogs: [
          {
            id: 'log-1',
            timestamp: '2026-05-22T05:00:00.000Z',
            action: 'ai_query',
            resource: 'clinical-intelligence/guideline-rag',
            capabilityId: 'guideline-rag',
            status: 'evidence_found',
            phiAccessed: false,
            integrityVerified: true,
            hashPreview: 'abcdef1234...',
          },
        ],
        safety: {
          warnings: ['Explainability summarizes audit metadata only.'],
        },
      },
    });
  });

  it('renders explainability scope and trace filters', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /ai explainability/i })).toBeInTheDocument();
    expect(screen.getAllByText(/confidence, source, reasoning, tool chain/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/tool id/i)).toBeInTheDocument();
  });

  it('loads confidence, source, reasoning, tool chain, and execution logs', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/tool id/i), {
      target: { value: 'guideline-rag' },
    });
    fireEvent.click(screen.getByRole('button', { name: /load explainability trace/i }));

    await waitFor(() => {
      expect(fetchAiExplainabilityTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          toolId: 'guideline-rag',
          clinicalQuestion: expect.stringContaining('Why did the AI'),
          limit: '25',
        }),
      );
    });

    expect(await screen.findByRole('heading', { name: /confidence/i })).toBeInTheDocument();
    expect(screen.getByText(/Trace includes source metadata/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /source/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reasoning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tool chain/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /execution logs/i })).toBeInTheDocument();
    expect(screen.getByText(/guideline-rag -> evidence_found -> ai_query/i)).toBeInTheDocument();
  });
});
