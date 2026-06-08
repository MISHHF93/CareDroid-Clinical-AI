import { describe, expect, it } from 'vitest';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  buildClientWorkspaceProfile,
  getWorkspaceFunctionalityMode,
  filterWorkspacesForClient,
  getCareWorkspaceById,
  getWorkspacePresetForOrganizationType,
  getWorkspaceSubpageById,
  getWorkspaceSubpageEntries,
} from './workspaceArchitecture';

describe('workspaceArchitecture', () => {
  it('defines the requested workspace-centric IA', () => {
    expect(CARE_WORKSPACES.map((workspace) => workspace.id)).toEqual([
      'emergency',
      'icu',
      'cardiology',
      'laboratory',
      'pharmacy',
      'operations',
      'fleet',
      'medical-iot',
      'education',
      'research',
      'governance',
      'administration',
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
      'pharmacy',
      'operations',
      'medical-iot',
      'governance',
      'administration',
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

  it('keeps Emergency dashboard-first with reduced primary navigation', () => {
    const emergency = getCareWorkspaceById('emergency');
    const mode = getWorkspaceFunctionalityMode('emergency');

    expect(emergency.defaultNavigationGroups).toEqual(['dashboard', 'automations']);
    expect(emergency.defaultDashboardWidgets).toEqual([
      'waiting-patients',
      'high-risk-queue',
      'critical-alerts',
      'recent-assessments',
      'recommended-actions',
      'protocol-guidance',
    ]);
    expect(mode.dashboards).toEqual(emergency.defaultDashboardWidgets);
    expect(mode.subpages.map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['triage', 'evidence', 'automations'])
    );
  });

  it('surfaces emergency tools contextually instead of as sidebar entries', () => {
    const model = buildCareWorkspaceModel('emergency');
    const toolIds = model.toolEntries.map((tool) => tool.id);
    const routePaths = model.routeEntries.map((route) => route.path);

    expect(toolIds).toEqual(
      expect.arrayContaining([
        'qsofa',
        'news2',
        'nihss',
        'heart-score',
        'wells-pe',
        'wells-dvt-calculator',
        'shock-index',
        'guideline-rag',
        'clinical-documentation-assistant',
        'medical-iot-dashboard',
        'simulation-suite',
      ])
    );
    expect(routePaths).toEqual(expect.arrayContaining(['/assistant', '/tools/calculators', '/live-map']));
  });

  it('defines functionality modes and subpages for requested workspaces', () => {
    for (const workspaceId of [
      'emergency',
      'icu',
      'cardiology',
      'laboratory',
      'pharmacy',
      'operations',
      'fleet',
      'medical-iot',
      'education',
      'research',
      'governance',
      'administration',
    ]) {
      const mode = getWorkspaceFunctionalityMode(workspaceId);
      expect(mode).toEqual(
        expect.objectContaining({
          workspaceId,
          modeName: expect.any(String),
          purpose: expect.any(String),
          primaryUsers: expect.any(Array),
          primaryDataSources: expect.any(Array),
          dashboards: expect.any(Array),
          subpages: expect.any(Array),
          assets: expect.any(Array),
          workflows: expect.any(Array),
          aiAgents: expect.any(Array),
          backendServices: expect.any(Array),
          dataPipeline: expect.objectContaining({
            source: expect.any(Array),
            workspaceContext: expect.any(String),
            dashboardWidgets: expect.any(Array),
            aiContext: expect.any(Array),
          }),
          alerts: expect.any(Array),
          reports: expect.any(Array),
          permissions: expect.any(Array),
        })
      );
      expect(getWorkspaceSubpageEntries(workspaceId).map((subpage) => subpage.id)).toContain('dashboard');
      expect(getWorkspaceSubpageById(workspaceId, 'dashboard')).toEqual(
        expect.objectContaining({ path: `/workspace/${workspaceId}/dashboard` })
      );
    }
  });

  it('adds specialized subpages for operational workspaces without sidebar expansion', () => {
    expect(getWorkspaceSubpageEntries('emergency').map((subpage) => subpage.id)).toEqual([
      'dashboard',
      'triage',
      'patients',
      'referrals',
      'documentation',
      'evidence',
      'simulations',
      'iot',
      'analytics',
      'automations',
    ]);
    expect(getWorkspaceSubpageEntries('medical-iot').map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['devices', 'telemetry', 'maintenance'])
    );
    expect(getWorkspaceSubpageEntries('fleet').map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['map', 'dispatch', 'maintenance'])
    );
    expect(getWorkspaceSubpageEntries('laboratory').map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['results', 'specimens', 'trends'])
    );
    expect(getWorkspaceSubpageEntries('governance').map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['audit', 'security', 'risk', 'reviews'])
    );
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
