import { describe, expect, it } from 'vitest';
import {
  CARE_WORKSPACES,
  buildCareWorkspaceModel,
  buildClientWorkspaceProfile,
  getWorkspaceFunctionalityMode,
  filterWorkspacesForClient,
  FUTURE_WORKSPACE_IDS,
  getActiveWorkspaceRegistry,
  getCareWorkspaceById,
  getWorkspacePresetForOrganizationType,
  getWorkspaceSubpageById,
  getWorkspaceSubpageEntries,
  isFutureWorkspace,
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
          lifecycleStage: expect.any(String),
          status: expect.any(String),
        })
      );
    }
  });

  it('marks non-Emergency focus areas as future modules without deleting them', () => {
    expect(FUTURE_WORKSPACE_IDS).toEqual([
      'research',
      'education',
      'governance',
      'fleet',
      'medical-iot',
      'laboratory',
    ]);
    for (const workspaceId of FUTURE_WORKSPACE_IDS) {
      const workspace = getCareWorkspaceById(workspaceId);
      expect(isFutureWorkspace(workspace)).toBe(true);
      expect(workspace).toEqual(
        expect.objectContaining({
          status: 'roadmap',
          lifecycleStage: 'future-module',
          roadmapLabel: 'Future Module',
          availabilityLabel: 'Coming Later',
        })
      );
    }
    expect(getActiveWorkspaceRegistry().map((workspace) => workspace.id)).not.toEqual(
      expect.arrayContaining(FUTURE_WORKSPACE_IDS)
    );
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

    expect(filtered).toEqual(['operations']);
    expect(filtered).not.toContain('governance');
    expect(filtered).not.toContain('fleet');
  });

  it('falls back to Emergency for unknown workspace ids', () => {
    expect(getCareWorkspaceById('missing').id).toBe('emergency');
  });

  it('keeps Emergency whiteboard-first with reduced dashboard hopping', () => {
    const emergency = getCareWorkspaceById('emergency');
    const mode = getWorkspaceFunctionalityMode('emergency');

    expect(emergency.defaultNavigationGroups).toEqual(['whiteboard', 'patients', 'ems', 'operations', 'copilot']);
    expect(mode.modeName).toBe('Emergency OS');
    expect(mode.purpose).toMatch(/patient flow, queue flow, EMS flow, capacity flow, and decision support/i);
    expect(emergency.defaultDashboardWidgets).toEqual([
      'current-patients',
      'waiting-room',
      'high-risk-queue',
      'ems-arrivals',
      'referral-queue',
      'bed-pressure',
      'equipment-status',
      'staffing-pressure',
      'flow-alerts',
    ]);
    expect(mode.dashboards).toEqual(emergency.defaultDashboardWidgets);
    expect(mode.subpages.map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining([
        'whiteboard',
        'command-center',
        'patient-path',
        'pre-arrival',
        'queues',
        'capacity',
        'boarding',
        'triage',
        'knowledge',
        'automations',
        'automation-roi',
        'director',
        'charge-nurse',
      ])
    );
    expect(mode.workflows).toContain('EMS pre-arrival pipeline');
    expect(mode.workflows).toContain('capacity intelligence');
    expect(mode.workflows).toContain('boarding intelligence');
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
    expect(routePaths).toEqual(expect.arrayContaining(['/emergency/copilot', '/emergency/whiteboard', '/live-map']));
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
      'whiteboard',
      'dashboard',
      'command-center',
      'patient-path',
      'intake',
      'patient-context',
      'director',
      'charge-nurse',
      'waiting-room',
      'triage',
      'queues',
      'throughput',
      'patients',
      'ems',
      'pre-arrival',
      'capacity',
      'boarding',
      'resources',
      'escalations',
      'iot',
      'shift-summary',
      'referrals',
      'knowledge',
      'evidence',
      'documentation',
      'simulations',
      'automations',
      'automation-roi',
      'analytics',
      'intake-analytics',
      'demo',
      'flow',
      'onboarding',
      'roi',
      'deployment',
      'implementation',
    ]);
    expect(getWorkspaceSubpageEntries('emergency').filter((subpage) => subpage.quickTask)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'whiteboard',
          taskLabel: 'Open Emergency Whiteboard',
        }),
      ])
    );
    expect(getWorkspaceSubpageEntries('emergency').map((subpage) => subpage.group)).toEqual(
      expect.arrayContaining(['command', 'flow', 'operations', 'clinical', 'proof'])
    );
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
