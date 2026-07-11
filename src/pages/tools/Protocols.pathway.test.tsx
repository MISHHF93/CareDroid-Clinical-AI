import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Protocols from './Protocols';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';

vi.mock('./ToolPageLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../../services/clinicalContentApi', () => ({
  fetchProtocols: vi.fn().mockResolvedValue({ ok: true, items: [], total: 0, fromServer: true }),
}));

vi.mock('../../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderProtocols() {
  return render(
    <MemoryRouter initialEntries={['/protocols']}>
      <Protocols />
    </MemoryRouter>
  );
}

describe('Protocols pathway library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendClinicalChatMessage).mockResolvedValue({
      ok: true,
      status: 200,
      data: { response: 'AI explanation for selected protocol pathway.' },
    });
  });

  it('renders protocol viewer with categories, version history, calculators, and simulations', async () => {
    renderProtocols();

    expect(screen.getByRole('heading', { name: /protocol and clinical pathway library/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /sepsis management/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/linked calculators/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/linked simulations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/version history/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /qsofa/i })).toHaveAttribute('href', '/tools/calculators/qsofa');
    expect(screen.getByRole('link', { name: /sepsis deterioration simulation/i })).toHaveAttribute(
      'href',
      '/simulation/sepsis-deterioration'
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading protocol catalog/i)).not.toBeInTheDocument();
    });
  });

  it('quick launches a category pathway and requests AI explanation', async () => {
    renderProtocols();

    fireEvent.click(screen.getByRole('button', { name: /^DKA$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^DKA Management$/i }));
    expect(screen.getByRole('heading', { name: /dka management pathway/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /anion gap/i })).toHaveAttribute(
      'href',
      '/tools/calculators/anion-gap'
    );

    fireEvent.click(screen.getByRole('button', { name: /generate ai explanation/i }));

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'protocols',
          message: expect.stringMatching(/DKA Management Pathway/i),
        })
      );
    });
    expect(await screen.findByText(/ai explanation for selected protocol pathway/i)).toBeInTheDocument();
  });
});
