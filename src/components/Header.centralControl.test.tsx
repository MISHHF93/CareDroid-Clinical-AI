import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { UserProvider } from '../contexts/UserContext';
import { Header } from './Header';

function renderHeader() {
  return render(
    <MemoryRouter>
      <UserProvider>
        <Header />
      </UserProvider>
    </MemoryRouter>,
  );
}

describe('Header central control', () => {
  it('hides advanced central controls from the pilot top bar', () => {
    renderHeader();

    expect(screen.queryByText(/Central Node: Input only/i)).toBeNull();
    expect(screen.queryByText(/Physician input/i)).toBeNull();
    expect(screen.queryByLabelText('Emergency OS demo scenario')).toBeNull();
    expect(screen.queryByLabelText('Demo Emergency OS role')).toBeNull();
  });

  it('renders the global operational command metrics', () => {
    renderHeader();

    const commandContext = screen.getByLabelText('Operational command context');
    for (const label of [
      'Patients Today',
      'Waiting',
      'Longest Wait',
      'Average Wait',
      'EMS Inbound',
      'Reassessments Due',
      'Capacity Score',
      'Boarders',
      'Referrals Pending',
    ]) {
      expect(commandContext).toHaveTextContent(label);
    }
  });

  it('opens the mounted Notification Center from the header bell', () => {
    renderHeader();

    fireEvent.click(screen.getByRole('button', { name: /notification center/i }));

    const dialog = screen.getByRole('dialog', { name: /notification center/i });
    expect(within(dialog).getByRole('heading', { name: /notification center/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});
