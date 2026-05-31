import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Competencies from './Competencies';
import Credentials from './Credentials';

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: {
      role: 'emergency physician',
      profile: { specialty: 'emergency medicine' },
    },
  }),
}));

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe('Competency and Credentialing pages', () => {
  it('renders competency status, completion tracking, and gaps', () => {
    renderPage(Competencies);

    expect(screen.getByRole('heading', { name: /competency platform/i })).toBeInTheDocument();
    expect(screen.getAllByText(/simulation completion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/skill completion/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/training status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/competency gaps/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/critical lab escalation speed/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view credentials/i })).toHaveAttribute('href', '/credentials');
  });

  it('renders credential records, certifications, CME credits, and readiness', () => {
    renderPage(Credentials);

    expect(screen.getByRole('heading', { name: /credentialing platform/i })).toBeInTheDocument();
    expect(screen.getAllByText(/certifications/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cme credits/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acls certification/i)).toBeInTheDocument();
    expect(screen.getByText(/stroke ready training/i)).toBeInTheDocument();
    expect(screen.getByText(/credentialing summary/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view competencies/i })).toHaveAttribute('href', '/competencies');
  });
});
