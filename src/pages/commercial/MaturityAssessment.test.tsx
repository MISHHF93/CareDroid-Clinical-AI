import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaturityAssessmentPage } from './MaturityAssessment';
import { ProductCatalogApi } from '../../services/productCatalogApi';

vi.mock('../../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getMaturityQuestionnaire: vi.fn(),
    submitMaturityAssessment: vi.fn(),
  },
}));

const mockQuestionnaire = {
  questions: [
    {
      id: 'q1',
      question: 'How mature is your EHR integration?',
      options: [
        { value: 1, label: 'Basic' },
        { value: 3, label: 'Advanced' },
      ],
    },
  ],
};

describe('MaturityAssessmentPage (HEAL-218)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ProductCatalogApi.getMaturityQuestionnaire).mockResolvedValue(mockQuestionnaire);
    vi.mocked(ProductCatalogApi.submitMaturityAssessment).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 30)),
    );
  });

  it('calls submitMaturityAssessment exactly once even when the submit button is clicked twice rapidly', async () => {
    render(
      <MemoryRouter>
        <MaturityAssessmentPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('How mature is your EHR integration?');
    fireEvent.change(screen.getByLabelText('How mature is your EHR integration?'), {
      target: { value: '3' },
    });

    const submitButton = screen.getByRole('button', { name: 'Calculate readiness score' });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(ProductCatalogApi.submitMaturityAssessment).toHaveBeenCalledTimes(1);
    });
  });

  it('disables the submit button while a submission is in flight', async () => {
    render(
      <MemoryRouter>
        <MaturityAssessmentPage />
      </MemoryRouter>,
    );

    await screen.findByLabelText('How mature is your EHR integration?');
    fireEvent.change(screen.getByLabelText('How mature is your EHR integration?'), {
      target: { value: '3' },
    });

    const submitButton = screen.getByRole('button', { name: 'Calculate readiness score' });
    fireEvent.click(submitButton);

    expect(await screen.findByRole('button', { name: 'Calculating…' })).toBeDisabled();
  });
});
