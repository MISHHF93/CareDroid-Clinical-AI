import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GuidelineRag from './GuidelineRag';
import { mockConversationValue, mockToolPreferencesValue } from '../../test/testRenderUtils';
import { queryGuidelineEvidence } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  queryGuidelineEvidence: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/guideline-rag']}>
      <GuidelineRag />
    </MemoryRouter>,
  );
}

describe('GuidelineRag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryGuidelineEvidence).mockResolvedValue({
      ok: true,
      data: {
        runId: 'rag-run-1',
        status: 'evidence_found',
        confidence: 0.88,
        summary: {
          recommendations: [
            {
              id: 'rec-1',
              text: 'Guidelines recommend prompt antimicrobial therapy after sepsis recognition.',
              citationIds: [1],
            },
          ],
          unsupportedClaimNotice: 'Summary statements are limited to retrieved guideline passages.',
        },
        citations: [
          {
            id: 1,
            sourceId: 'src-1',
            title: 'Sepsis Guideline',
            organization: 'Example Society',
            date: '2025',
            url: 'https://example.org/sepsis',
          },
        ],
        sources: [
          {
            chunkId: 'chunk-1',
            sourceId: 'src-1',
            title: 'Sepsis Guideline',
            score: 0.91,
            chunkIndex: 2,
            citationId: 1,
          },
        ],
        explainability: {
          retrievalMethod: 'Vector retrieval over guideline documents.',
          limitations: ['Does not generate recommendations beyond retrieved source text.'],
        },
        safety: { warnings: ['Citation-bound evidence support only.'] },
      },
    });
  });

  it('renders guardrails that avoid unsupported medical claims', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: /guideline retrieval \+ evidence engine/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/summaries are generated only from retrieved guideline passages/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/unsupported medical claims/i)).toBeInTheDocument();
  });

  it('retrieves evidence and displays recommendations, citations, attribution, and explainability', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/guideline question/i), {
      target: { value: 'What do sepsis guidelines say about antibiotics timing?' },
    });
    fireEvent.change(screen.getByLabelText(/specialty filter/i), {
      target: { value: 'emergency medicine' },
    });
    fireEvent.click(screen.getByRole('button', { name: /retrieve evidence/i }));

    await waitFor(() => {
      expect(queryGuidelineEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('sepsis guidelines'),
          specialty: 'emergency medicine',
          topK: 5,
          minScore: 0.6,
        }),
      );
    });

    expect(
      await screen.findByText(/Guidelines recommend prompt antimicrobial therapy/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Sepsis Guideline/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/chunk 2/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /explainability/i })).toBeInTheDocument();
  });
});
