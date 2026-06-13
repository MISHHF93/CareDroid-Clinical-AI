import { render, screen } from '@testing-library/react';
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
  it('keeps scenario and role switching out of the top bar for input-only users', () => {
    renderHeader();

    expect(screen.getByText(/Central Node: Input only/i)).toBeInTheDocument();
    expect(screen.getByText(/Physician input/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Emergency OS demo scenario')).toBeNull();
    expect(screen.queryByLabelText('Demo Emergency OS role')).toBeNull();
  });
});
