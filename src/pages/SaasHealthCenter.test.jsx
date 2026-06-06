import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SaasHealthCenter from './SaasHealthCenter';
import { fetchSaasHealthCenter } from '../services/saasHealthApi';

vi.mock('../services/saasHealthApi', () => ({
  SAAS_HEALTH_FALLBACK: {
    status: 'critical',
    label: 'Critical',
    summary: { healthy: 0, warning: 0, critical: 7, total: 7 },
    checks: [],
  },
  fetchSaasHealthCenter: vi.fn(),
}));

describe('SaasHealthCenter', () => {
  beforeEach(() => {
    fetchSaasHealthCenter.mockResolvedValue({
      ok: true,
      message: '',
      data: {
        status: 'warning',
        label: 'Warning',
        generatedAt: '2026-06-06T13:00:00.000Z',
        summary: { healthy: 4, warning: 2, critical: 1, total: 7 },
        checks: [
          {
            id: 'frontend',
            label: 'Frontend Health',
            status: 'healthy',
            displayStatus: 'Healthy',
            summary: 'Frontend build metadata is published.',
            evidence: ['frontendVersion=1.0.0'],
          },
          {
            id: 'backend',
            label: 'Backend Health',
            status: 'healthy',
            displayStatus: 'Healthy',
            summary: 'Backend health endpoint is responding.',
            evidence: ['backendVersion=1.0.0'],
          },
          {
            id: 'api',
            label: 'API Health',
            status: 'critical',
            displayStatus: 'Critical',
            summary: 'Authenticated API health contract is degraded.',
            evidence: ['apiHealth=failed'],
          },
          {
            id: 'integrations',
            label: 'Integrations',
            status: 'warning',
            displayStatus: 'Warning',
            summary: 'Integration layer is guarded by synthetic or demo connectors.',
            evidence: ['externalConnectors=synthetic'],
          },
          {
            id: 'tenant',
            label: 'Tenant Health',
            status: 'healthy',
            displayStatus: 'Healthy',
            summary: 'Tenant guards are active.',
            evidence: ['tenantGuards=active'],
          },
          {
            id: 'ai',
            label: 'AI Health',
            status: 'warning',
            displayStatus: 'Warning',
            summary: 'AI gateway is guarded.',
            evidence: ['aiGateway=guarded'],
          },
          {
            id: 'simulation',
            label: 'Simulation Health',
            status: 'healthy',
            displayStatus: 'Healthy',
            summary: 'Simulation assets and scenario routes are included.',
            evidence: ['simulationStatus=healthy'],
          },
        ],
      },
    });
  });

  it('renders all SaaS health domains and status groups', async () => {
    render(<SaasHealthCenter />);

    expect(screen.getByRole('heading', { name: /saas health center/i })).toBeInTheDocument();
    await waitFor(() => expect(fetchSaasHealthCenter).toHaveBeenCalledTimes(1));

    for (const label of [
      'Frontend Health',
      'Backend Health',
      'API Health',
      'Integrations',
      'Tenant Health',
      'AI Health',
      'Simulation Health',
    ]) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }

    expect(screen.getByRole('status')).toHaveTextContent(/warning/i);
    expect(within(screen.getByLabelText(/critical saas checks/i)).getByText('API Health')).toBeInTheDocument();
    expect(within(screen.getByLabelText(/warning saas checks/i)).getByText('AI Health')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText(/healthy saas checks/i)).getByText('Simulation Health')
    ).toBeInTheDocument();
  });
});
