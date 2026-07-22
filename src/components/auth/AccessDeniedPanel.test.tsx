import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessDeniedPanel } from './AccessDeniedPanel';

describe('AccessDeniedPanel', () => {
  it('renders the default title and a roleLabel-derived message when none are given', () => {
    render(
      <MemoryRouter>
        <AccessDeniedPanel roleLabel="Charge Nurse" fallbackPath="/emergency/whiteboard" />
      </MemoryRouter>,
    );
    expect(screen.getByText('CareDroid page unavailable')).toBeInTheDocument();
    expect(screen.getByText('Charge Nurse does not have access to this CareDroid page.')).toBeInTheDocument();
  });

  it('renders a custom title and message when provided, overriding the roleLabel default', () => {
    render(
      <MemoryRouter>
        <AccessDeniedPanel
          roleLabel="Reception"
          fallbackPath="/start"
          title="Admin console unavailable"
          message="This tenant has not enabled admin access."
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Admin console unavailable')).toBeInTheDocument();
    expect(screen.getByText('This tenant has not enabled admin access.')).toBeInTheDocument();
    expect(screen.queryByText(/does not have access to this CareDroid page/)).not.toBeInTheDocument();
  });

  it('links back to the given fallbackPath', () => {
    render(
      <MemoryRouter>
        <AccessDeniedPanel roleLabel="Physician" fallbackPath="/emergency/queues" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Go to permitted CareDroid page' })).toHaveAttribute(
      'href',
      '/emergency/queues',
    );
  });

  it('exposes an assertive alert role for assistive tech', () => {
    render(
      <MemoryRouter>
        <AccessDeniedPanel roleLabel="Physician" fallbackPath="/emergency/queues" />
      </MemoryRouter>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});
