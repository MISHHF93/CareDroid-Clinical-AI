/**
 * Predictive Maintenance Assistant UI tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PredictiveMaintenance from './PredictiveMaintenance';

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: vi.fn(),
    favorites: [],
    pinned: [],
    recentTools: [],
    toggleFavorite: vi.fn(),
    togglePinned: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage(initialPath = '/fleet/predictive-maintenance') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/fleet/predictive-maintenance" element={<PredictiveMaintenance />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PredictiveMaintenance page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders route page with accessible title', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Predictive Maintenance Assistant/i })
    ).toBeInTheDocument();
  });

  it('shows empty assessment state before submit', () => {
    renderPage();
    expect(
      screen.getByText(/Enter vehicle data and run Calculate risk/i)
    ).toBeInTheDocument();
  });

  it('validates minimum input on submit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Calculate maintenance risk/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Enter at least vehicle age/i);
  });

  it('renders risk score and inspection widgets after scoring', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Vehicle age/i), '18');
    await user.type(screen.getByLabelText(/Mileage/i), '175000');
    await user.type(screen.getByLabelText(/Months since last service/i), '16');
    await user.clear(screen.getByLabelText(/Services in last 12 months/i));
    await user.type(screen.getByLabelText(/Services in last 12 months/i), '0');
    await user.type(screen.getByLabelText(/Diagnostic codes/i), 'P0301');
    await user.type(screen.getByLabelText(/Battery health/i), '55');

    await user.click(screen.getByRole('button', { name: /Calculate maintenance risk/i }));

    const assessment = screen.getByRole('heading', { name: /^Assessment$/i }).closest('section');
    expect(within(assessment).getByText(/Maintenance risk score/i)).toBeInTheDocument();
    expect(within(assessment).getByText(/High risk|Critical risk|Moderate risk/i)).toBeInTheDocument();
    expect(within(assessment).getByText(/Suggested inspection windows/i)).toBeInTheDocument();
    expect(within(assessment).getByText(/Anomaly indicators/i)).toBeInTheDocument();
  });

  it('resets form and results', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Vehicle age/i), '10');
    await user.click(screen.getByRole('button', { name: /Calculate maintenance risk/i }));
    expect(screen.queryByText(/Maintenance risk score/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset maintenance assessment/i }));

    expect(screen.getByLabelText(/Vehicle age/i)).toHaveValue(null);
    expect(screen.getByText(/Enter vehicle data and run Calculate risk/i)).toBeInTheDocument();
  });
});
