import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GovernanceRegistry from './GovernanceRegistry';
import { PlatformAssetsApi } from '../services/platformAssetsApi';

vi.mock('./GovernanceRegistry.css', () => ({}));

vi.mock('../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    getGovernanceRegistry: vi.fn(),
  },
}));

const registry = {
  generatedAt: '2026-06-06T13:30:00.000Z',
  summary: {
    totalAssets: 2,
    complete: 2,
    incomplete: 0,
    auditRequired: 1,
    humanReviewRequired: 1,
    byRiskLevel: {
      'clinical-decision-support': 1,
      operational: 1,
    },
  },
  requiredFields: [
    'owner',
    'steward',
    'approver',
    'riskLevel',
    'evidenceSource',
    'version',
    'auditRequirement',
    'reviewSchedule',
  ],
  rows: [
    {
      assetId: 'qsofa',
      title: 'qSOFA',
      route: '/tools/calculators/qsofa',
      owner: 'ED Director',
      steward: 'Emergency Medicine Steward',
      approver: 'Clinical Governance Lead',
      riskLevel: 'clinical-decision-support',
      evidenceSource: 'validated protocol library',
      version: '2.1.0',
      auditRequirement: 'required',
      reviewSchedule: 'quarterly',
    },
    {
      assetId: 'fhir-connector',
      title: 'FHIR Connector',
      route: '/integrations/fhir',
      owner: 'CIO',
      steward: 'Interoperability Steward',
      approver: 'Operations Governance Lead',
      riskLevel: 'operational',
      evidenceSource: 'Asset registry route: /integrations/fhir',
      version: '1.0.0',
      auditRequirement: 'required',
      reviewSchedule: 'annual',
    },
  ],
};

describe('GovernanceRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlatformAssetsApi.getGovernanceRegistry.mockResolvedValue(registry);
  });

  it('renders required governance fields for every asset', async () => {
    render(<GovernanceRegistry />);

    expect(
      await screen.findByRole('heading', { name: /platform governance registry/i })
    ).toBeInTheDocument();
    expect(PlatformAssetsApi.getGovernanceRegistry).toHaveBeenCalledWith({
      query: '',
      riskLevel: 'all',
    });

    for (const label of [
      'Owner',
      'Steward',
      'Approver',
      'Risk Level',
      'Evidence Source',
      'Version',
      'Audit Requirement',
      'Review Schedule',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getByText('qSOFA')).toBeInTheDocument();
    expect(screen.getByText('ED Director')).toBeInTheDocument();
    expect(screen.getByText('validated protocol library')).toBeInTheDocument();
    expect(screen.getByText('FHIR Connector')).toBeInTheDocument();
  });

  it('refetches when filtering by risk level', async () => {
    const user = userEvent.setup();
    render(<GovernanceRegistry />);

    await screen.findByText('qSOFA');
    await user.selectOptions(screen.getByLabelText(/risk level/i), 'operational');

    await waitFor(() => {
      expect(PlatformAssetsApi.getGovernanceRegistry).toHaveBeenLastCalledWith({
        query: '',
        riskLevel: 'operational',
      });
    });
  });
});
