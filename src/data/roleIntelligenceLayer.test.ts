import { describe, expect, it } from 'vitest';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import {
  buildRoleIntelligenceProfile,
  getRoleDisplayName,
  getRoleIntelligenceAgentRecommendations,
  getRoleIntelligenceAssetRecommendations,
  getRoleIntelligencePackRecommendations,
  getRoleIntelligenceSimulationRecommendations,
  normalizeRole,
} from './roleIntelligenceLayer';

function profileFor(role, overrides: any = {}) {
  return buildRoleIntelligenceProfile({
    user: { role },
    preferences: {
      toolPreferences: {
        profileSettings: {
          role,
          specialty: overrides.specialty,
          defaultWorkspace: overrides.workspace,
        },
      },
    },
  });
}

describe('role intelligence layer', () => {
  it('normalizes requested role aliases into display names', () => {
    expect(normalizeRole('ED Physician')).toBe('emergency physician');
    expect(getRoleDisplayName('biomedical engineer')).toBe('Biomedical Engineer');
    expect(getRoleDisplayName('researcher')).toBe('Researcher');
  });

  it('recommends cardiology assets for cardiologists', () => {
    const profile = profileFor('cardiologist', { specialty: 'cardiology' });
    const recommendations = getRoleIntelligenceAssetRecommendations({
      tools: getUserFacingToolRegistryProjection(),
      profile,
      limit: 12,
    }).map((item) => item.id);

    expect(recommendations).toEqual(expect.arrayContaining(['grace-acs', 'has-bled']));
  });

  it('scores role-fit packs above general packs', () => {
    const profile = profileFor('biomedical engineer', {
      specialty: 'biomedical engineering',
      workspace: 'medical-iot',
    });
    const packs = [
      {
        id: 'core-platform',
        name: 'Core Platform',
        description: 'General clinical tools and dashboards.',
        targetRoles: ['clinician'],
      },
      {
        id: 'device-operations',
        name: 'Device Operations Pack',
        description: 'Medical IoT telemetry, device alarms, and maintenance workflows.',
        targetRoles: ['biomedical engineer'],
        defaultModules: ['medical-iot', 'telemetry'],
      },
    ];

    const [top] = getRoleIntelligencePackRecommendations({ packs, profile, limit: 2 });

    expect(top.id).toBe('device-operations');
    expect(top.roleIntelligence.reason).toMatch(/biomedical engineer/i);
  });

  it('recommends simulations and agents by role', () => {
    const biomedical = profileFor('biomedical engineer', {
      specialty: 'biomedical engineering',
      workspace: 'medical-iot',
    });
    const simulations = getRoleIntelligenceSimulationRecommendations({
      scenarios: SIMULATION_SCENARIOS,
      profile: biomedical,
      limit: 4,
    }).map((scenario) => scenario.id);
    const researcher = profileFor('researcher', { specialty: 'research', workspace: 'research' });
    const agents = getRoleIntelligenceAgentRecommendations({
      profile: researcher,
      agents: [
        { id: 'agent-clinical', title: 'CareDroid', roleAwareness: ['emergency physician'] },
        { id: 'agent-research', title: 'Research AI', roleAwareness: ['researcher'] },
      ],
    }).map((agent) => agent.id);

    expect(simulations).toContain('device-alarm-failure');
    expect(agents[0]).toBe('agent-research');
  });
});
