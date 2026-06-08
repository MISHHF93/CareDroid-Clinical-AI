import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DependencyGraph from './DependencyGraph';
import { ProductCatalogApi } from '../services/productCatalogApi';

vi.mock('./DependencyGraph.css', () => ({}));

vi.mock('../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getAssetDependencyGraph: vi.fn(),
  },
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization: { id: 'org-1' },
  }),
}));

const graph = {
  summary: {
    products: 1,
    assetPacks: 1,
    assets: 2,
    routes: 1,
    backendServices: 2,
    integrations: 1,
    issues: 3,
  },
  issueCounts: {
    'missing-dependency': 1,
    'duplicate-dependency': 1,
    'orphan-asset': 1,
  },
  issues: [
    {
      id: 'missing-pack',
      type: 'missing-dependency',
      severity: 'high',
      title: 'Missing product pack dependency',
      detail: 'Emergency Flow Intelligence Platform references missing asset pack missing-pack.',
    },
    {
      id: 'duplicate-pack',
      type: 'duplicate-dependency',
      severity: 'medium',
      title: 'Duplicate dependency',
      detail: 'product product-emergency references pack emergency-pack more than once.',
    },
    {
      id: 'orphan-asset',
      type: 'orphan-asset',
      severity: 'medium',
      title: 'Orphan asset',
      detail: 'Orphan Asset is not linked by any product or asset pack.',
    },
  ],
  chains: [
    {
      id: 'product-emergency:emergency-pack:qsofa',
      product: { id: 'product-emergency', name: 'Emergency Flow Intelligence Platform' },
      assetPack: { id: 'emergency-pack', name: 'Emergency Department Pack' },
      asset: { id: 'qsofa', title: 'qSOFA', assetType: 'calculator', dependencies: [] },
      route: '/tools/calculators/qsofa',
      backendServices: ['backend:wired', 'ClinicalTools'],
      integrations: [{ id: 'int-fhir', name: 'FHIR', category: 'fhir', status: 'available' }],
    },
  ],
};

describe('DependencyGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductCatalogApi.getAssetDependencyGraph.mockResolvedValue(graph);
  });

  it('renders asset dependency stages and summary counts', async () => {
    render(<DependencyGraph />);

    expect(await screen.findByRole('heading', { name: /asset dependency graph/i })).toBeInTheDocument();
    expect(ProductCatalogApi.getAssetDependencyGraph).toHaveBeenCalledWith('org-1');
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Asset Packs')).toBeInTheDocument();
    expect(screen.getByText('Backend Services')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getAllByText('Emergency Flow Intelligence Platform').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Emergency Department Pack').length).toBeGreaterThan(0);
    expect(screen.getAllByText('qSOFA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/tools/calculators/qsofa').length).toBeGreaterThan(0);
    expect(screen.getByText(/backend:wired, ClinicalTools/i)).toBeInTheDocument();
    expect(screen.getByText('FHIR')).toBeInTheDocument();
  });

  it('filters dependency issues by issue type', async () => {
    const user = userEvent.setup();
    render(<DependencyGraph />);

    await screen.findByText(/missing product pack dependency/i);
    await user.selectOptions(screen.getByLabelText(/issue type/i), 'orphan-asset');

    await waitFor(() => {
      expect(screen.getByLabelText(/issue type/i)).toHaveValue('orphan-asset');
    });
    expect(screen.getByText(/orphan asset is not linked/i)).toBeInTheDocument();
    expect(screen.queryByText(/references missing asset pack/i)).not.toBeInTheDocument();
  });
});
