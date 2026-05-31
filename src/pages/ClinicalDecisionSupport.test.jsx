import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ClinicalDecisionSupport from './ClinicalDecisionSupport';

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: {
      role: 'emergency physician',
      profile: { specialty: 'emergency medicine' },
    },
  }),
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    activeWorkspaceId: 'diagnostic',
    workspaces: [{ id: 'diagnostic', name: 'Diagnostic' }],
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicalDecisionSupport />
    </MemoryRouter>
  );
}

describe('ClinicalDecisionSupport', () => {
  it('renders patient-context-aware recommendations and explainability', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /clinical decision support engine/i })).toBeInTheDocument();
    expect(screen.getByText(/clinical decision support only/i)).toBeInTheDocument();
    expect(screen.getAllByText(/risk stratification/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /calculator recommendations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /workflow recommendations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /lab recommendations/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /imaging recommendations/i })).toBeInTheDocument();
    expect(screen.getByText(/why these recommendations appeared/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ask ai assistant/i })).toHaveAttribute('href', expect.stringContaining('/assistant'));
  });

  it('updates signals when symptom intake changes', async () => {
    const user = userEvent.setup();
    renderPage();

    const symptoms = screen.getByLabelText(/symptoms/i);
    await user.clear(symptoms);
    await user.type(symptoms, 'Fever with hypotension, confusion, and elevated lactate');

    expect(screen.getAllByText(/possible infection \/ sepsis deterioration/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/qsofa/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/sepsis screening workflow/i)).toBeInTheDocument();
  });
});
