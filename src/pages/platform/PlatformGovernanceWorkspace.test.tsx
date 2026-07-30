import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlatformGovernanceWorkspace from './PlatformGovernanceWorkspace';

vi.mock('./PlatformGovernanceWorkspace.css', () => ({}));

const platformGovernanceApiMock = vi.hoisted(() => ({
  fetchPlatformGovernanceSurface: vi.fn(),
}));

vi.mock('../../services/platformGovernanceApi', () => ({
  fetchPlatformGovernanceSurface: platformGovernanceApiMock.fetchPlatformGovernanceSurface,
}));

function renderRoute(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<PlatformGovernanceWorkspace />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformGovernanceWorkspace governance/security dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders /ai-governance dashboard panels from governance backend summary', async () => {
    platformGovernanceApiMock.fetchPlatformGovernanceSurface.mockResolvedValue({
      ok: true,
      sourceStatus: 'live',
      data: {
        status: 'guarded',
        readiness: { blocked: false },
        panels: {
          approvalWorkflow: { required: true, reasons: ['phi_access'] },
          riskClassification: { level: 'high', category: 'high_risk_cds' },
        },
      },
    });

    renderRoute('/ai-governance');

    expect(
      await screen.findByRole('heading', { level: 1, name: /ai governance center/i }),
    ).toBeVisible();
    expect(screen.getByRole('heading', { name: /dashboard panels/i })).toBeVisible();
    expect(screen.getAllByText(/approval Workflow/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/risk Classification/i).length).toBeGreaterThan(0);
    expect(platformGovernanceApiMock.fetchPlatformGovernanceSurface).toHaveBeenCalledWith(
      'governance',
      '/ai-governance',
    );
  });

  it('renders /security dashboard panels for prompt injection and PHI protection', async () => {
    platformGovernanceApiMock.fetchPlatformGovernanceSurface.mockResolvedValue({
      ok: true,
      sourceStatus: 'live',
      data: {
        status: 'guarded',
        readiness: { blocked: false },
        panels: {
          promptInjection: { status: 'blocking', blocked: true },
          phiProtection: { action: 'minimize_or_redact', findings: ['mrn'] },
        },
      },
    });

    renderRoute('/security');

    expect(
      await screen.findByRole('heading', { level: 1, name: /llm security dashboard/i }),
    ).toBeVisible();
    expect(screen.getAllByText(/prompt Injection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/phi Protection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/minimize_or_redact/i).length).toBeGreaterThan(0);
    expect(platformGovernanceApiMock.fetchPlatformGovernanceSurface).toHaveBeenCalledWith(
      'ai-security',
      '/security',
    );
  });

  it('does not claim governance/consent controls block production action (Cycle 235 — evaluateGate() is only acted on, not blocking, at 1 of 4 real call sites)', async () => {
    platformGovernanceApiMock.fetchPlatformGovernanceSurface.mockResolvedValue({
      ok: true,
      sourceStatus: 'live',
      data: { status: 'guarded', readiness: { blocked: false }, panels: {} },
    });

    renderRoute('/ai-governance');

    expect(await screen.findByRole('heading', { name: /human review gate/i })).toBeVisible();
    expect(screen.queryByText(/controls block production action/i)).not.toBeInTheDocument();
    expect(screen.getByText(/always marked as requiring human review/i)).toBeVisible();
  });
});
