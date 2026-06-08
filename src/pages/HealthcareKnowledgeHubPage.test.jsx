import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HealthcareKnowledgeHubPage } from './PlatformOSPages';

describe('HealthcareKnowledgeHubPage', () => {
  it('renders centralized knowledge categories and search facets', () => {
    render(<HealthcareKnowledgeHubPage />);

    expect(screen.getByRole('heading', { level: 1, name: /knowledge hub/i })).toBeInTheDocument();
    expect(screen.getAllByText('protocol').length).toBeGreaterThan(0);
    expect(screen.getAllByText('pathway').length).toBeGreaterThan(0);
    expect(screen.getAllByText('calculator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('simulation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ai guidance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('documentation').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Specialty')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Department')).toBeInTheDocument();
    expect(screen.getByText('Sepsis escalation protocol')).toBeInTheDocument();
    expect(screen.getByText('Code Blue simulation readiness')).toBeInTheDocument();
  });

  it('filters knowledge by search text and facets', () => {
    render(<HealthcareKnowledgeHubPage />);

    fireEvent.change(screen.getByPlaceholderText(/search knowledge/i), {
      target: { value: 'FHIR' },
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'compliance-leader' },
    });
    fireEvent.change(screen.getByLabelText('Workspace'), {
      target: { value: 'governance' },
    });

    expect(screen.getByText('Integration readiness documentation')).toBeInTheDocument();
    expect(screen.queryByText('qSOFA calculator')).not.toBeInTheDocument();
  });
});
