import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsDashboard from './AnalyticsDashboard';

vi.mock('../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'user-1', role: 'admin' } }),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({ recentTools: ['qsofa', 'news2'] }),
}));

vi.mock('../services/apiClient', () => ({
  apiFetchJson: vi.fn(),
}));

vi.mock('../services/offlineService', () => ({
  default: {
    getToolResults: vi.fn(),
  },
}));

vi.mock('../services/analyticsService', () => ({
  default: {
    trackPageView: vi.fn(),
  },
}));

import { apiFetchJson } from '../services/apiClient';
import offlineService from '../services/offlineService';
import analyticsService from '../services/analyticsService';

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { totalEvents: 88, dailyActiveUsers: 12 },
    });
    offlineService.getToolResults.mockResolvedValue([
      { toolType: 'qsofa', createdAt: '2026-05-30T10:00:00Z' },
      { toolType: 'clinical-decision-support', createdAt: '2026-05-30T11:00:00Z' },
    ]);
  });

  it('renders privacy-safe platform analytics dashboards', async () => {
    render(<AnalyticsDashboard />);

    expect(screen.getByRole('heading', { level: 1, name: /platform analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /privacy-safe telemetry/i })).toBeInTheDocument();
    expect(screen.getByText(/query text never stored/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /most used tools/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /least used tools/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /orphan tools/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /adoption trends/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /feature engagement/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(apiFetchJson).toHaveBeenCalledWith('/api/analytics/metrics', expect.any(Object));
    });
  });

  it('tracks only privacy-safe page metadata', async () => {
    render(<AnalyticsDashboard />);

    expect(analyticsService.trackPageView).toHaveBeenCalledWith(
      'platform_analytics',
      expect.objectContaining({
        telemetryMode: 'privacy-safe-aggregate',
        storesPhi: false,
        storesUserIdentifiers: false,
      })
    );
    await waitFor(() => {
      expect(offlineService.getToolResults).toHaveBeenCalledWith('user-1');
    });
  });

  it('falls back to demo/local aggregate telemetry when backend metrics fail', async () => {
    apiFetchJson.mockResolvedValueOnce({
      response: { ok: false, status: 503 },
      data: { message: 'Unavailable' },
    });

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(apiFetchJson).toHaveBeenCalledWith('/api/analytics/metrics', expect.any(Object));
    });
    expect(screen.getByRole('heading', { name: /most used tools/i })).toBeInTheDocument();
    expect(screen.getAllByText(/no phi/i).length).toBeGreaterThan(0);
  });
});
