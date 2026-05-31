import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResearchEvidenceHub from './ResearchEvidenceHub';
import { sendClinicalChatMessage } from '../services/clinicalChatService';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderResearchHub() {
  return render(
    <MemoryRouter initialEntries={['/research']}>
      <ResearchEvidenceHub />
    </MemoryRouter>
  );
}

describe('ResearchEvidenceHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      data: { response: 'AI generated evidence brief with guideline comparison.' },
    });
  });

  it('renders the requested evidence hub sections and workflow links', () => {
    renderResearchHub();

    expect(screen.getByRole('heading', { name: /research and evidence hub/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /literature library/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /guideline library/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /evidence summaries/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /study tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /citation explorer/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /protocol: sepsis management/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /simulation: sepsis deterioration/i }).length).toBeGreaterThan(0);
  });

  it('searches evidence content', () => {
    renderResearchHub();

    fireEvent.change(screen.getByLabelText(/search research evidence/i), {
      target: { value: 'stroke' },
    });

    expect(screen.getByText(/stroke alert workflow/i)).toBeInTheDocument();
    expect(screen.queryByText(/chest pain risk stratification cohort/i)).not.toBeInTheDocument();
  });

  it('runs AI evidence summary, guideline comparison, and brief actions', async () => {
    renderResearchHub();

    fireEvent.click(screen.getAllByRole('button', { name: /^summarize evidence$/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^compare guidelines$/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^generate evidence brief$/i })[0]);

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'research-evidence-hub',
          message: expect.stringMatching(/evidence|guideline/i),
        })
      );
    });
    expect(await screen.findByText(/ai generated evidence brief/i)).toBeInTheDocument();
  });
});
