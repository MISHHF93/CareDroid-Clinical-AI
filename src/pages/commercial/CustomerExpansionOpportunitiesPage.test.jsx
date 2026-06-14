import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CustomerExpansionOpportunitiesPage } from './CommercialPages';

vi.mock('./CommercialPages.css', () => ({}));

describe('CustomerExpansionOpportunitiesPage', () => {
  it('renders commercial growth recommendations for hospital and university segments', () => {
    render(<CustomerExpansionOpportunitiesPage />);

    expect(screen.getByRole('heading', { level: 1, name: /expansion opportunities/i })).toBeInTheDocument();
    expect(screen.getByText('Emergency Pack')).toBeInTheDocument();
    expect(screen.getByText('ICU Pack')).toBeInTheDocument();
    expect(screen.getByText('Simulation Pack')).toBeInTheDocument();
    expect(screen.getByText('Education Pack')).toBeInTheDocument();
    expect(screen.getByText('Research Pack')).toBeInTheDocument();
    expect(screen.getByText('AI Evaluation Pack')).toBeInTheDocument();
    expect(screen.getAllByText(/^Score$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Motion$/i).length).toBeGreaterThan(0);
  });
});
