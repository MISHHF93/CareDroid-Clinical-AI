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
  it('hides advanced central controls from the pilot top bar', () => {
    renderHeader();

    expect(screen.queryByText(/Central Node: Input only/i)).toBeNull();
    expect(screen.queryByText(/Physician input/i)).toBeNull();
    expect(screen.queryByLabelText('CareDroid demo scenario')).toBeNull();
    expect(screen.queryByLabelText('Demo CareDroid role')).toBeNull();
  });

  it('renders a slim contextual header with search and create actions', () => {
    renderHeader();

    expect(screen.getByRole('button', { name: /create patient/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /operational search/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Operational command context')).toBeNull();
    expect(screen.queryByRole('button', { name: /notification center/i })).toBeNull();
  });
});