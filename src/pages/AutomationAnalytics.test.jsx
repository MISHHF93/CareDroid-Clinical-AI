import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AutomationAnalytics from './AutomationAnalytics';

vi.mock('./AutomationAnalytics.css', () => ({}));

describe('AutomationAnalytics', () => {
  it('renders sellable solution packages and automation adoption metrics', () => {
    render(<AutomationAnalytics />);

    expect(screen.getByRole('heading', { name: /automation analytics/i })).toBeInTheDocument();
    expect(screen.getByText(/automation runs, success, failures, adoption/i)).toBeInTheDocument();
    expect(screen.getByText(/Emergency Department Solution/i)).toBeInTheDocument();
    expect(screen.getByText(/Laboratory Intelligence Solution/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical IoT Solution/i)).toBeInTheDocument();
    expect(screen.getByText(/Fleet Operations Solution/i)).toBeInTheDocument();
    expect(screen.getByText(/Governance Solution/i)).toBeInTheDocument();
    expect(screen.getAllByText(/AI accepted/i).length).toBeGreaterThan(0);
  });
});
