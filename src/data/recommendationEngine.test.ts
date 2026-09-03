import { describe, expect, it } from 'vitest';
import { buildRecommendationEngine } from './recommendationEngine';

const baseInput = {
  account: { role: 'nurse', specialty: 'Emergency Medicine' },
  activeWorkspace: { id: 'emergency', name: 'Emergency' },
  organization: { id: 'org-1', name: 'City Hospital', organizationType: 'hospital' },
  platformContext: { entitledAssetIds: ['qsofa', 'drug-check'] },
  toolPreferences: {
    pinned: ['qsofa'],
    recentTools: ['drug-check'],
    hiddenTools: ['hidden-tool'],
  },
  memoryFabricContext: {
    organizationMemory: {
      commonSearches: [{ title: 'sepsis searches', filter: 'sepsis', resultCount: 4 }],
    },
    workspaceMemory: {
      recentAssets: ['qsofa'],
      visibleAssetIds: ['qsofa', 'drug-check'],
    },
    userMemory: {
      pinnedAssets: ['qsofa'],
      recentAssets: ['drug-check'],
    },
  },
};

describe('recommendationEngine', () => {
  it('groups recommendations by tools, packs, products, AI agents, simulations, and protocols', () => {
    const result = buildRecommendationEngine({
      ...baseInput,
      tools: [
        {
          id: 'qsofa',
          title: 'qSOFA',
          name: 'qSOFA',
          description: 'Emergency sepsis screen',
          path: '/tools/calculators/qsofa',
          category: 'Calculator',
        },
        {
          id: 'hidden-tool',
          title: 'Hidden tool',
          description: 'Should not appear',
          path: '/tools/hidden',
        },
      ],
      marketplaceItems: [
        {
          id: 'pack-sepsis',
          category: 'asset-packs',
          title: 'Sepsis Pack',
          summary: 'Emergency sepsis tools and workflows',
          route: '/asset-packs',
          tags: ['sepsis', 'emergency'],
        },
        {
          id: 'agent-clinical',
          category: 'ai-agents',
          title: 'Clinical Copilot',
          summary: 'Emergency documentation and tool routing',
          route: '/agents',
          tags: ['nurse', 'clinical ai'],
        },
      ],
      productRows: [
        {
          product: {
            id: 'product-emergency',
            slug: 'emergency-suite',
            name: 'Emergency Suite',
            description: 'Hospital emergency product bundle',
            roles: ['nurse'],
            workspaces: ['emergency'],
            outcomes: ['sepsis readiness'],
          },
        },
      ],
      simulations: [
        {
          id: 'sepsis-deterioration',
          title: 'Sepsis Deterioration',
          specialty: 'Emergency Medicine',
          roles: ['nurse'],
          caseStem: 'Sepsis escalation',
        },
      ],
      protocols: [
        {
          id: 'sepsis',
          title: 'Sepsis Management',
          category: 'sepsis',
          summary: 'Emergency bundle protocol',
          indications: ['suspected infection'],
          redFlags: ['hypotension'],
          linkedCalculators: [],
          linkedSimulations: [],
        },
      ],
    });

    expect(result.groups.tools.map((item) => item.item.id)).toEqual(['qsofa']);
    expect(result.groups.packs[0]).toMatchObject({ title: 'Sepsis Pack', type: 'packs' });
    expect(result.groups.products[0]).toMatchObject({
      title: 'Emergency Suite',
      route: '/products/emergency-suite',
    });
    expect(result.groups.aiAgents[0]).toMatchObject({ title: 'Clinical Copilot' });
    expect(result.groups.simulations[0]).toMatchObject({ title: 'Sepsis Deterioration' });
    expect(result.groups.protocols[0]).toMatchObject({ title: 'Sepsis Management' });
    expect(result.summary.groups).toMatchObject({
      tools: 1,
      packs: 1,
      products: 1,
      aiAgents: 1,
      simulations: 1,
      protocols: 1,
    });
  });

  it('adds explainable source signals and scoring reasons', () => {
    const result = buildRecommendationEngine({
      ...baseInput,
      tools: [
        {
          id: 'qsofa',
          name: 'qSOFA',
          description: 'Emergency sepsis calculator for nurses',
          path: '/tools/calculators/qsofa',
        },
      ],
      marketplaceItems: [],
      productRows: [],
      simulations: [],
      protocols: [],
    });

    expect(result.groups.tools[0].score).toBeGreaterThan(20);
    expect(result.groups.tools[0].reasons.length).toBeGreaterThan(0);
    expect(result.groups.tools[0].sourceSignals).toEqual(
      expect.arrayContaining(['role', 'workspace', 'asset-usage']),
    );
  });
});
