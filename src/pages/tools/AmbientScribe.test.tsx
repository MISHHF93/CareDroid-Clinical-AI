import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AmbientScribe from './AmbientScribe';
import {
  mockConversationValue,
  mockToolPreferencesValue,
} from '../../test/testRenderUtils';
import { generateAmbientScribeDraft } from '../../services/clinicalIntelligenceApi';

vi.mock('./ToolPageLayout.css', () => ({}));

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../../services/clinicalIntelligenceApi', () => ({
  generateAmbientScribeDraft: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/tools/ambient-scribe']}>
      <AmbientScribe />
    </MemoryRouter>,
  );
}

describe('AmbientScribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateAmbientScribeDraft.mockResolvedValue({
      ok: true,
      data: {
        runId: 'run-1',
        status: 'review_required',
        reviewRequired: true,
        draft: {
          title: 'SOAP Note Draft',
          sections: {
            Subjective: 'Patient reports cough and fever.',
            Objective: 'Review required.',
            Assessment: 'Draft assessment requires clinician review.',
            Plan: 'Include return precautions.',
          },
        },
        safety: {
          warnings: ['Human clinician review is required.'],
          blockedActions: ['auto_sign_note', 'ehr_write_back'],
          requiresHumanReview: true,
        },
      },
    });
  });

  it('renders safety warnings for no auto-signing and no autonomous chart modification', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /ambient clinical scribe/i })).toBeInTheDocument();
    expect(screen.getByText(/no auto-signing/i)).toBeInTheDocument();
    expect(screen.getByText(/human review is required/i)).toBeInTheDocument();
    expect(screen.getByText(/no autonomous chart modification/i)).toBeInTheDocument();
  });

  it('generates a review-required draft and requires acknowledgement before copy-forward', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/transcript or dictation/i), {
      target: {
        value:
          'Patient reports cough and fever for three days. Denies chest pain. Discussed hydration and return precautions.',
      },
    });
    fireEvent.change(screen.getByLabelText(/clinician instructions/i), {
      target: { value: 'Include return precautions.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate draft for clinician review/i }));

    await waitFor(() => {
      expect(generateAmbientScribeDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          noteType: 'soap',
          transcriptText: expect.stringContaining('Patient reports cough'),
          safetyAcknowledged: true,
        }),
      );
    });

    expect(await screen.findByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Review required:/i)).toBeInTheDocument();
    const readyButton = screen.getByRole('button', { name: /ready for clinician copy-forward/i });
    expect(readyButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/I reviewed this draft/i));
    expect(readyButton).not.toBeDisabled();
  });
});
