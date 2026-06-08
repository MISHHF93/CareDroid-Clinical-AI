import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MaturityAssessmentPage } from './CommercialPages';
import { ProductCatalogApi } from '../../services/productCatalogApi';

vi.mock('./CommercialPages.css', () => ({}));

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getMaturityQuestionnaire: vi.fn().mockRejectedValue(new Error('offline')),
    submitMaturityAssessment: vi.fn().mockRejectedValue(new Error('offline')),
  },
}));

describe('MaturityAssessmentPage', () => {
  it('renders hospital readiness score and consultative recommendations', async () => {
    render(
      <MemoryRouter>
        <MaturityAssessmentPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /hospital maturity assessment/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/hospital readiness score/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/digital maturity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ai maturity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/interoperability/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/simulation readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/iot readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/governance readiness/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /get readiness recommendations/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /hospital readiness score/i })).toBeInTheDocument();
    });

    expect(ProductCatalogApi.submitMaturityAssessment).toHaveBeenCalled();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Packs')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Emergency Department Solution')).toBeInTheDocument();
    expect(screen.getByText('Simulation Pack')).toBeInTheDocument();
    expect(screen.getByText('FHIR Patient Context')).toBeInTheDocument();
    expect(screen.getByText('AI governance enablement')).toBeInTheDocument();
  });
});
