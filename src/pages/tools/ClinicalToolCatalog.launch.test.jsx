import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalToolCatalog from './ClinicalToolCatalog';

const navigate = vi.fn();
const setActiveTool = vi.fn();
const addMessage = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => ({ setActiveTool, addMessage }),
}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
}));

function renderCatalog() {
  return render(
    <MemoryRouter>
      <ClinicalToolCatalog />
    </MemoryRouter>
  );
}

describe('ClinicalToolCatalog launch and search', () => {
  beforeEach(() => {
    navigate.mockClear();
    setActiveTool.mockClear();
    addMessage.mockClear();
  });

  it('finds wells-pe via alias search in the medical table', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'pe-score' } });
    const matches = await screen.findAllByText('Wells PE Score');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows global empty state when search has no matches', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'zzz-no-such-tool-xyz' } });
    expect(await screen.findByRole('status')).toHaveTextContent(/No tools match/i);
  });

  it('clears search from global empty state', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'zzz-no-such-tool-xyz' } });
    fireEvent.click(await screen.findByRole('button', { name: /clear search/i }));
    expect(input.value).toBe('');
  });
});
