import { describe, expect, it } from 'vitest';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  buildClientWorkspaceProfile,
  filterWorkspacesForClient,
  getCareWorkspaceById,
  getWorkspacePresetForOrganizationType,
} from './workspaceArchitecture';

describe('workspaceArchitecture', () => {
  it('defines the requested workspace-centric IA', () => {
    expect(CARE_WORKSPACES.map((workspace) => workspace.id)).toEqual([
      'emergency',
      'icu',
      'cardiology',
      'laboratory',
      'operations',
      'fleet',
      'medical-iot',
      'education',
      'research',
      'governance',
      'simulation',
      'ai-evaluation',
    ]);
  });

  it('keeps each canonical workspace on the SaaS workspace contract', () => {
    for (const workspace of CARE_WORKSPACES) {
      expect(workspace).toEqual(
        expect.objectContaining({
          workspaceId: workspace.id,
          label: expect.any(String),
          description: expect.any(String),
          allowedOrganizationTypes: expect.any(Array),
          allowedRoles: expect.any(Array),
          defaultAssetPacks: expect.any(Array),
          defaultAssets: expect.any(Array),
          defaultDashboardWidgets: expect.any(Array),
          defaultAIAgents: expect.any(Array),
          defaultNavigationGroups: expect.any(Array),
          subscriptionTier: expect.any(String),
          status: 'active',
        })
      );
    }
  });

  it('builds organization workspace presets from the canonical registry', () => {
    expect(getWorkspacePresetForOrganizationType('hospital')).toEqual([
      'emergency',
      'icu',
      'cardiology',
      'laboratory',
      'operations',
      'medical-iot',
      'governance',
    ]);
    expect(getWorkspacePresetForOrganizationType('ems')).toEqual(['emergency', 'fleet', 'operations']);
    expect(getWorkspacePresetForOrganizationType('university')).toEqual([
      'education',
      'research',
      'simulation',
      'governance',
    ]);
    expect(getWorkspacePresetForOrganizationType('research-center')).toEqual([
      'research',
      'governance',
      'ai-evaluation',
    ]);
  });

  it('filters workspace dropdown options by organization, tier, role, and assignment', () => {
    const clientProfile = buildClientWorkspaceProfile({
      organizationType: 'ems',
      subscriptionPlan: 'professional',
      enabledWorkspaces: ['emergency', 'fleet', 'operations', 'governance'],
      roles: ['fleet-operator'],
    });

    const filtered = filterWorkspacesForClient({
      clientProfile,
      role: 'fleet-operator',
      userWorkspaceIds: ['fleet', 'operations'],
    }).map((workspace) => workspace.id);

    expect(filtered).toEqual(['operations', 'fleet']);
    expect(filtered).not.toContain('governance');
  });

  it('falls back to Emergency for unknown workspace ids', () => {
    expect(getCareWorkspaceById('missing').id).toBe('emergency');
  });

  it('surfaces emergency tools contextually instead of as sidebar entries', () => {
    const model = buildCareWorkspaceModel('emergency');
    const toolIds = model.toolEntries.map((tool) => tool.id);
    const routePaths = model.routeEntries.map((route) => route.path);

    expect(toolIds).toEqual(
      expect.arrayContaining(['qsofa', 'news2', 'sofa-score', 'nihss', 'heart-score', 'grace-acs'])
    );
    expect(routePaths).toEqual(expect.arrayContaining(['/assistant', '/tools/calculators', '/live-map']));
  });

  it('defines specialty and acuity workspaces for AI launcher intents', () => {
    const emergency = buildCareWorkspaceModel('emergency');
    const cardiology = buildCareWorkspaceModel('cardiology');
    const icu = buildCareWorkspaceModel('icu');

    expect(emergency.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['nihss', 'ecg-interpretation-assistant', 'acs-workflow-assistant'])
    );
    expect(cardiology.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['heart-score', 'timi-ua-nstemi', 'acs-workflow-assistant'])
    );
    expect(icu.toolEntries.map((tool) => tool.id)).toEqual(
      expect.arrayContaining(['rox-index', 'pao2-fio2-ratio', 'ventilator-support-assistant'])
    );
  });
});
