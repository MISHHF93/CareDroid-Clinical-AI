import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DigitalOperationsCenter from './DigitalOperationsCenter';

const mockUserContext = vi.hoisted(() => ({
  user: { id: 'user-1', role: 'admin', name: 'Ops Admin' },
  hasPermission: vi.fn(() => true),
}));

vi.mock('../contexts/UserContext', () => ({
  Permission: {
    MANAGE_INCIDENTS: 'MANAGE_INCIDENTS',
    VIEW_OBSERVABILITY: 'VIEW_OBSERVABILITY',
  },
  useUser: () => mockUserContext,
}));

function renderOperationsCenter() {
  return render(
    <MemoryRouter initialEntries={['/operations-center']}>
      <DigitalOperationsCenter />
    </MemoryRouter>
  );
}

describe('DigitalOperationsCenter', () => {
  beforeEach(() => {
    mockUserContext.user = { id: 'user-1', role: 'admin', name: 'Ops Admin' };
    mockUserContext.hasPermission.mockReset();
    mockUserContext.hasPermission.mockReturnValue(true);
  });

  it('renders one command center with all required operational surfaces', () => {
    renderOperationsCenter();

    expect(screen.getByRole('heading', { name: /digital operations center/i })).toBeInTheDocument();
    expect(screen.getAllByText(/single operational command center/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /digital twin/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /hospital map/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /medical iot/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /fleet/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /notifications/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /system health/i }).length).toBeGreaterThan(0);
  });

  it('adapts priority lane for nurse role', () => {
    mockUserContext.user = { id: 'user-2', role: 'nurse', name: 'Charge Nurse' };
    mockUserContext.hasPermission.mockImplementation((permission) => permission === 'VIEW_OPERATIONS');

    renderOperationsCenter();

    expect(screen.getByRole('heading', { name: /care team operations/i })).toBeInTheDocument();
    const priorityLane = screen.getByRole('heading', { name: /priority lane/i }).closest('article');
    expect(within(priorityLane).getByText(/hospital map/i)).toBeInTheDocument();
    expect(within(priorityLane).getByText(/medical iot/i)).toBeInTheDocument();
    expect(within(priorityLane).getByRole('link', { name: /^fleet$/i })).toBeInTheDocument();
    expect(within(priorityLane).queryByText(/system health/i)).not.toBeInTheDocument();
    expect(screen.getByText(/observability: limited/i)).toBeInTheDocument();
  });

  it('searches combined operational surfaces', () => {
    renderOperationsCenter();

    fireEvent.change(screen.getByLabelText(/search operations center/i), {
      target: { value: 'observability' },
    });

    const combinedSection = screen
      .getByRole('heading', { name: /combined operational surfaces/i })
      .closest('section');
    expect(within(combinedSection).getByRole('heading', { name: /system health/i })).toBeInTheDocument();
    expect(within(combinedSection).queryByRole('heading', { name: /fleet/i })).not.toBeInTheDocument();
  });
});
