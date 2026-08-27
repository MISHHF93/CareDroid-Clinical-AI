import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlatformGovernanceWorkspace from './PlatformGovernanceWorkspace';
import { RouteChromeProvider } from '../../contexts/RouteChromeContext';

vi.mock('./PlatformGovernanceWorkspace.css', () => ({}));

const platformGovernanceApiMock = vi.hoisted(() => ({
  fetchPlatformGovernanceSurface: vi.fn(),
}));

vi.mock('../../services/platformGovernanceApi', () => ({
  fetchPlatformGovernanceSurface: platformGovernanceApiMock.fetchPlatformGovernanceSurface,
}));

function renderRoute(path) {
  render(
    <RouteChromeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={<PlatformGovernanceWorkspace />} />
        </Routes>
      </MemoryRouter>
    </RouteChromeProvider>,
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

    expect(await screen.findByText(/ai governance center/i)).toBeVisible();
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

    expect(await screen.findByText(/llm security dashboard/i)).toBeVisible();
    expect(screen.getAllByText(/prompt Injection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/phi Protection/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/minimize_or_redact/i).length).toBeGreaterThan(0);
    expect(platformGovernanceApiMock.fetchPlatformGovernanceSurface).toHaveBeenCalledWith(
      'ai-security',
      '/security',
    );
  });

  it('renders the AI Model Inventory panel as real, readable fields instead of truncated JSON', async () => {
    platformGovernanceApiMock.fetchPlatformGovernanceSurface.mockResolvedValue({
      ok: true,
      sourceStatus: 'live',
      data: {
        status: 'guarded',
        readiness: { blocked: false },
        panels: {
          modelInventory: [
            {
              modelId: 'mdl-claude-sonnet-4-6-v1',
              modelName: 'Anthropic Claude Sonnet 4.6 (CareDroid default generation)',
              version: 'claude-sonnet-4-6',
              status: 'approved',
              purpose: 'Conversational ED copilot / chat under human confirmation.',
              regulatoryClass: 'informational_cds',
              owner: 'Clinical Informatics',
              knownLimitations: ['Requires human review on all clinical outputs.'],
              expiresAt: '2027-07-11',
              retirementPlan: 'Rotate to next approved model via registry entry + canary.',
            },
          ],
        },
      },
    });

    renderRoute('/ai-governance');

    expect(await screen.findByRole('heading', { name: /ai model inventory/i })).toBeVisible();
    expect(
      screen.getByText(/anthropic claude sonnet 4\.6 \(caredroid default generation\)/i),
    ).toBeVisible();
    expect(screen.getByText('claude-sonnet-4-6')).toBeVisible();
    expect(
      screen.getByText(/conversational ed copilot \/ chat under human confirmation/i),
    ).toBeVisible();
    expect(screen.getByText('informational_cds')).toBeVisible();
    expect(screen.getByText('Clinical Informatics')).toBeVisible();
    expect(screen.getByText(/requires human review on all clinical outputs/i)).toBeVisible();
    expect(screen.getByText(/rotate to next approved model via registry entry/i)).toBeVisible();

    // The old fallback rendering (truncated JSON.stringify of the whole array) must
    // not appear anywhere on the page once the real fields are rendered.
    expect(screen.queryByText(/"modelId":"mdl-claude-sonnet-4-6-v1"/)).not.toBeInTheDocument();
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
