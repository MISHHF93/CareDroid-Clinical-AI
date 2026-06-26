import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ContextInsightCard from './ContextInsightCard';

function renderCard(props: any = {}) {
  return render(
    <MemoryRouter>
      <ContextInsightCard
        title="Telemetry review"
        message="Review stale devices before action."
        source="Local summary"
        actionLabel="Open devices"
        actionRoute="/devices"
        {...props}
      />
    </MemoryRouter>
  );
}

describe('ContextInsightCard', () => {
  it('renders a route-backed action', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: /telemetry review/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open devices/i })).toHaveAttribute('href', '/devices');
  });

  it('labels demo insights honestly', () => {
    renderCard({ demo: true, source: 'Demo fixture' });

    expect(screen.getByText(/demo insight/i)).toBeInTheDocument();
    expect(screen.getByText(/demo fixture/i)).toBeInTheDocument();
  });

  it('uses unavailable state when an error is present', () => {
    renderCard({ error: 'Backend telemetry unavailable.' });

    expect(screen.getByText(/^unavailable$/i)).toBeInTheDocument();
    expect(screen.getByText(/backend telemetry unavailable/i)).toBeInTheDocument();
  });
});

