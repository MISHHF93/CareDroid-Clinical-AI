import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PredictiveAnalyticsDashboard from './PredictiveAnalyticsDashboard';
import { sendClinicalChatMessage } from '../services/clinicalChatService';

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn(),
}));

function renderPredictiveAnalytics() {
  return render(
    <MemoryRouter initialEntries={['/predictive-analytics']}>
      <PredictiveAnalyticsDashboard />
    </MemoryRouter>
  );
}

describe('PredictiveAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendClinicalChatMessage.mockResolvedValue({
      ok: true,
      data: { response: 'AI explanation for demo predictive analytics risk.' },
    });
  });

  it('renders clearly labeled demo predictions for all required risks', () => {
    renderPredictiveAnalytics();

    expect(screen.getByRole('heading', { name: /predictive analytics dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/demo predictions - not live patient, device, or fleet data/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /deterioration risk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /readmission risk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sepsis risk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /icu transfer risk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /device failure risk/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fleet maintenance risk/i })).toBeInTheDocument();
    expect(screen.getAllByText(/clearly labeled prediction/i).length).toBeGreaterThan(0);
  });

  it('searches predictions and keeps linked workflows accessible', () => {
    renderPredictiveAnalytics();

    fireEvent.change(screen.getByLabelText(/search predictive analytics/i), {
      target: { value: 'battery' },
    });

    expect(screen.getByRole('heading', { name: /device failure risk/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /readmission risk/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open linked workflow/i })).toHaveAttribute('href', '/medical-iot');
  });

  it('integrates with AI assistant explanation for selected prediction', async () => {
    renderPredictiveAnalytics();

    fireEvent.click(screen.getAllByRole('button', { name: /explain prediction/i })[0]);

    await waitFor(() => {
      expect(sendClinicalChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'predictive-analytics-dashboard',
          message: expect.stringMatching(/deterioration risk/i),
        })
      );
    });
    expect(await screen.findByText(/ai explanation for demo predictive analytics risk/i)).toBeInTheDocument();
  });
});
