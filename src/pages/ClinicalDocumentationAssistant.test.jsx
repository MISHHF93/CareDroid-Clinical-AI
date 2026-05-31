import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalDocumentationAssistant from './ClinicalDocumentationAssistant';
import { sendClinicalChatMessage } from '../services/clinicalChatService';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderDocumentationAssistant() {
  return render(
    <MemoryRouter initialEntries={['/documentation']}>
      <ClinicalDocumentationAssistant />
    </MemoryRouter>
  );
}

describe('ClinicalDocumentationAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      data: {
        response: 'Draft SOAP note with assessment and plan. Clinician review required.',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders requested note types, AI actions, and export support', () => {
    renderDocumentationAssistant();

    expect(screen.getByRole('heading', { name: /clinical documentation assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /soap note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /h&p note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /progress note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discharge summary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultation note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /procedure note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /draft note/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize encounter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate patient instructions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export draft/i })).toBeDisabled();
  });

  it('drafts selected note type through assistant and exports text', async () => {
    renderDocumentationAssistant();

    fireEvent.click(screen.getByRole('button', { name: /h&p note/i }));
    fireEvent.click(screen.getByRole('button', { name: /draft note/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'clinical-documentation-assistant',
          message: expect.stringMatching(/H&P note/i),
        })
      );
    });
    expect(await screen.findByText(/draft soap note with assessment and plan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /export draft/i }));
    expect(screen.getAllByText(/ed-follow-up-documentation-draft-note.txt/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/CareDroid Clinical Documentation Assistant Export/i)).toBeInTheDocument();
  });

  it('generates patient instructions with the selected AI action', async () => {
    sendClinicalChatMessage.mockResolvedValueOnce({
      ok: true,
      data: {
        response: 'Patient instructions: complete antibiotics and return for worsening breathing.',
      },
    });
    renderDocumentationAssistant();

    fireEvent.click(screen.getByRole('button', { name: /generate patient instructions/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Generate patient instructions/i),
        })
      );
    });
    expect(await screen.findByText(/complete antibiotics/i)).toBeInTheDocument();
  });
});
