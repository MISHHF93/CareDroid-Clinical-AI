/**
 * Route Optimization Assistant UI tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RouteOptimizer from './RouteOptimizer';

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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/fleet/route-optimizer']}>
      <Routes>
        <Route path="/fleet/route-optimizer" element={<RouteOptimizer />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RouteOptimizer page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders route page with accessible title', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /Route Optimization Assistant/i })
    ).toBeInTheDocument();
  });

  it('validates /fleet/route-optimizer route renders planner inputs', () => {
    renderPage();
    expect(screen.getByLabelText(/Start depot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Traffic constraints/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Route planner/i })).toBeInTheDocument();
  });

  it('shows empty results state before optimization', () => {
    renderPage();
    expect(screen.getByText(/Add destinations and run Optimize route/i)).toBeInTheDocument();
  });

  it('validates labeled destinations on submit', async () => {
    const user = userEvent.setup();
    renderPage();

    const labels = screen.getAllByLabelText(/^Destination$/i);
    await user.clear(labels[0]);
    await user.clear(labels[1]);

    await user.click(screen.getByRole('button', { name: /Optimize route/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/at least one destination with a label/i);
  });

  it('renders optimized route sequence and savings', async () => {
    const user = userEvent.setup();
    renderPage();

    const labels = screen.getAllByLabelText(/^Destination$/i);
    await user.clear(labels[0]);
    await user.type(labels[0], 'Urgent Clinic');
    await user.clear(labels[1]);
    await user.type(labels[1], 'Routine Lab');

    const priorities = screen.getAllByLabelText(/^Priority$/i);
    await user.selectOptions(priorities[0], 'urgent');
    await user.selectOptions(priorities[1], 'low');

    await user.click(screen.getByRole('button', { name: /Optimize route/i }));

    const results = screen.getByRole('heading', { name: /^Optimized route$/i }).closest('section');
    const savingsGroup = within(results).getByRole('group', { name: /Route savings summary/i });
    expect(within(savingsGroup).getByText(/Time saved/i)).toBeInTheDocument();

    const routeList = within(results).getByRole('list', { name: /Optimized stop sequence/i });
    const items = within(routeList).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(/Urgent Clinic/i);
    expect(items[1]).toHaveTextContent(/Routine Lab/i);
  });

  it('resets planner and clears results', async () => {
    const user = userEvent.setup();
    renderPage();

    const labels = screen.getAllByLabelText(/^Destination$/i);
    await user.type(labels[0], 'Stop A');
    await user.click(screen.getByRole('button', { name: /Optimize route/i }));
    expect(screen.getByRole('list', { name: /Optimized stop sequence/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset route planner/i }));
    expect(screen.getByText(/Add destinations and run Optimize route/i)).toBeInTheDocument();
  });
});
