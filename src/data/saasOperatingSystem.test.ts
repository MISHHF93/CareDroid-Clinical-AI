import { describe, expect, it } from 'vitest';
import {
  SAAS_OPERATING_SYSTEM_CHAIN,
  buildSaasOperatingSystemModel,
} from './saasOperatingSystem';

describe('saasOperatingSystem', () => {
  it('defines the required SaaS concept chain', () => {
    expect(SAAS_OPERATING_SYSTEM_CHAIN).toEqual([
      'organization',
      'subscription',
      'products',
      'asset-packs',
      'assets',
      'workspaces',
      'users',
      'ai-agents',
      'automations',
    ]);
  });

  it('builds required platform admin overviews and health score', () => {
    const model = buildSaasOperatingSystemModel({
      tenantContext: {
        organizationId: 'org-1',
        organizationName: 'North Memorial',
        workspaceId: 'emergency',
        role: 'owner',
        userId: 'user-1',
      },
      platformContext: {
        organization: { id: 'org-1', name: 'North Memorial' },
        assignedProducts: [{ id: 'clinical-os' }],
        entitledPacks: [{ id: 'emergency-pack' }],
        entitledAssetIds: ['asset-1', 'asset-2'],
        subscription: { tier: 'enterprise', status: 'active' },
      },
      workspaces: [{ id: 'emergency' }, { id: 'icu' }],
      users: [{ id: 'user-1' }, { id: 'user-2' }],
      integrations: [{ slug: 'fhir', status: 'enabled' }],
    });

    expect(model.healthScore).toBeGreaterThan(0);
    expect(model.overviews.map((overview) => overview.id)).toEqual([
      'organization',
      'products',
      'assets',
      'automations',
      'tenant',
      'health',
    ]);
    expect(model.metrics).toMatchObject({
      products: 1,
      assetPacks: 1,
      assets: 2,
      workspaces: 2,
      users: 2,
    });
  });
});
