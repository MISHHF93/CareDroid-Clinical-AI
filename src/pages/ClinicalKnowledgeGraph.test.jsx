import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalKnowledgeGraph from './ClinicalKnowledgeGraph';
import { sendClinicalChatMessage } from '../services/clinicalChatService';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderKnowledgeGraph() {
  return render(
    <MemoryRouter initialEntries={['/knowledge-graph']}>
      <ClinicalKnowledgeGraph />
    </MemoryRouter>
  );
}

describe('ClinicalKnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      data: { response: 'AI graph explanation connecting calculators, protocols, simulations, labs, devices, and workflows.' },
    });
  });

  it('renders graph explorer, node categories, and relationship visualization', () => {
    renderKnowledgeGraph();

    expect(screen.getByRole('heading', { name: /clinical knowledge graph/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /graph explorer/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /qsofa/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /sepsis pathway/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /lactate/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /bedside monitor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/visible graph relationships/i)).toBeInTheDocument();
  });

  it('searches nodes, filters by type, and explores selected neighbors', () => {
    renderKnowledgeGraph();

    fireEvent.change(screen.getByLabelText(/search knowledge graph/i), {
      target: { value: 'stroke' },
    });

    expect(screen.getByRole('button', { name: /stroke alert pathway/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lactate/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search knowledge graph/i), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^laboratory$/i }));
    expect(screen.getByRole('button', { name: /lactate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /troponin/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /lactate/i }));
    expect(screen.getByRole('heading', { name: /lactate/i })).toBeInTheDocument();
    expect(screen.getByText(/critical perfusion/i)).toBeInTheDocument();
  });

  it('integrates with AI assistant explanation for selected graph node', async () => {
    renderKnowledgeGraph();

    fireEvent.click(screen.getByRole('button', { name: /clinical decision support engine/i }));
    fireEvent.click(screen.getByRole('button', { name: /explain selected with ai/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'clinical-knowledge-graph',
          message: expect.stringMatching(/Clinical Decision Support Engine/i),
        })
      );
    });
    expect(await screen.findByText(/ai graph explanation/i)).toBeInTheDocument();
  });
});
