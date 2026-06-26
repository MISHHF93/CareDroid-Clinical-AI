import { describe, expect, it } from 'vitest';
import {
  CARE_DROID_BRAIN_ACTION_TYPES,
  createCareDroidBrainService,
  buildCareDroidBrainSnapshot,
} from './careDroidBrainService';

const duplicateReport = {
  sections: [
    {
      id: 'routes',
      title: 'Route overlap',
      duplicates: [
        {
          name: 'Legacy learning routes',
          action: 'merge',
          risk: 'Multiple routes explain the same learning surface.',
          recommendation: 'Merge stale learning routes into the canonical dashboard.',
        },
      ],
    },
  ],
};

const orphanReport = {
  all: [
    {
      id: 'asset-orphan-1',
      name: 'Unlinked protocol asset',
      classification: 'route-missing-navigation',
      evidence: 'Asset is present but has no visible launch surface.',
    },
  ],
};

const brainInput = {
  role: 'clinical-admin',
  department: 'Care Operations',
  organization: { id: 'org-1', name: 'CareDroid Health', organizationType: 'health-system' },
  entitledPackIds: ['operations', 'ai'],
  memoryFabricContext: {
    organizationMemory: {
      accessibleAssetCount: 12,
      enabledPackCount: 3,
      commonSearches: [{ query: 'capacity forecast', count: 7 }],
    },
    roleMemory: {
      preferredAssetIds: ['hospital-command-assistant'],
    },
    userMemory: {
      recentAssets: ['medical-iot-dashboard'],
      savedWorkflows: [{ workflowId: 'capacity-rounding', count: 4 }],
    },
  },
  productRows: [
    {
      id: 'ops-command',
      name: 'Operations Command',
      slug: 'operations-command',
      description: 'Coordinate hospital operations and escalation workflows.',
    },
  ],
  agentRows: [{ id: 'agent-1', name: 'Capacity Agent' }],
  activity: {
    recentWorkflows: [{ workflowId: 'bed-readiness', count: 3 }],
    abandonedPages: [{ path: '/unused', count: 2 }],
    failedLaunches: [{ toolId: 'legacy-map', count: 2 }],
  },
};

describe('CareDroidBrainService', () => {
  it('builds the five requested Brain domains', () => {
    const snapshot = buildCareDroidBrainSnapshot(brainInput, { duplicateReport, orphanReport });

    expect(Object.keys(snapshot.domains)).toEqual([
      'platformKnowledge',
      'organizationKnowledge',
      'roleKnowledge',
      'assetKnowledge',
      'automationKnowledge',
    ]);
    expect(snapshot.domains.platformKnowledge.title).toBe('Platform Knowledge');
    expect(snapshot.domains.organizationKnowledge.title).toBe('Organization Knowledge');
    expect(snapshot.domains.roleKnowledge.title).toBe('Role Knowledge');
    expect(snapshot.domains.assetKnowledge.title).toBe('Asset Knowledge');
    expect(snapshot.domains.automationKnowledge.title).toBe('Automation Knowledge');
  });

  it('generates advisory actions for recommendation, duplicate, orphan, product, and workflow coverage', () => {
    const service = createCareDroidBrainService({ duplicateReport, orphanReport });
    const snapshot = service.buildSnapshot(brainInput);
    const actionTypes = snapshot.actions.map((action) => action.type);

    expect(actionTypes).toEqual(
      expect.arrayContaining([
        CARE_DROID_BRAIN_ACTION_TYPES.RECOMMEND_ACTION,
        CARE_DROID_BRAIN_ACTION_TYPES.DETECT_DUPLICATION,
        CARE_DROID_BRAIN_ACTION_TYPES.DETECT_ORPHAN_ASSET,
        CARE_DROID_BRAIN_ACTION_TYPES.SUGGEST_PRODUCT,
        CARE_DROID_BRAIN_ACTION_TYPES.OPTIMIZE_WORKFLOW,
      ]),
    );
    expect(snapshot.acceptance).toMatchObject({
      centralizedIntelligence: true,
      understandsPlatform: true,
      recommendsActions: true,
      detectsDuplication: true,
      detectsOrphanAssets: true,
      suggestsProducts: true,
      optimizesWorkflows: true,
    });
  });

  it('exposes platform, asset, organization, and automation evidence in the snapshot', () => {
    const snapshot = buildCareDroidBrainSnapshot(brainInput, { duplicateReport, orphanReport });

    expect(snapshot.summary.artifacts).toBeGreaterThan(0);
    expect(snapshot.summary.graphNodes).toBeGreaterThan(0);
    expect(snapshot.domains.platformKnowledge.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Duplicate findings', value: 1 }),
        expect.objectContaining({ label: 'Orphan findings', value: 1 }),
      ]),
    );
    expect(snapshot.domains.organizationKnowledge.metrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'AI agents', value: 1 })]),
    );
    expect(snapshot.domains.automationKnowledge.metrics).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Templates' })]),
    );
  });
});
