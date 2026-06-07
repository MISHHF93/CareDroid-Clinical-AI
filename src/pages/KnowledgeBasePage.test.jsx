import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KnowledgeBasePage from './KnowledgeBasePage';

describe('KnowledgeBasePage', () => {
  it('renders required training categories and article search', () => {
    render(
      <MemoryRouter>
        <KnowledgeBasePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /knowledge base/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Workflows' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Calculators' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Simulations' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AI Agents' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Troubleshooting' })).toBeInTheDocument();
  });

  it('filters articles by search query', () => {
    render(
      <MemoryRouter>
        <KnowledgeBasePage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/search training content/i), {
      target: { value: 'SSO FHIR connector' },
    });

    expect(screen.getByText(/request and track integrations/i)).toBeInTheDocument();
    expect(screen.queryByText(/run simulation training/i)).not.toBeInTheDocument();
  });
});
