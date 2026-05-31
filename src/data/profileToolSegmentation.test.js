import { describe, expect, it } from 'vitest';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import {
  buildProfileToolGraph,
  buildUserToolProfile,
  filterToolsForProfileGraph,
  getProfileAssistantRecommendations,
} from './profileToolSegmentation';

function profileFor(role, overrides = {}) {
  return buildUserToolProfile({
    user: { role },
    toolPreferences: {
      favorites: [],
      pinned: overrides.pinnedTools || [],
      recentTools: overrides.recentTools || [],
      hiddenTools: overrides.hiddenTools || [],
      profileSettings: {
        role,
        specialty: overrides.specialty,
        department: overrides.department,
        defaultWorkspace: overrides.workspace,
        permissionLevel: overrides.permissionLevel,
      },
    },
  });
}

describe('profile tool segmentation', () => {
  it('adds segmentation metadata to every user-facing tool', () => {
    const tools = getUserFacingToolRegistryProjection();

    expect(tools.length).toBeGreaterThan(100);
    for (const tool of tools) {
      expect(tool.intendedRoles?.length, tool.id).toBeGreaterThan(0);
      expect(Array.isArray(tool.specialties), tool.id).toBe(true);
      expect(tool.workspaceTags?.length, tool.id).toBeGreaterThan(0);
      expect(Array.isArray(tool.requiredPermissions), tool.id).toBe(true);
      expect(['low', 'medium', 'high']).toContain(tool.clinicalRiskLevel);
      expect(typeof tool.defaultVisible).toBe('boolean');
      expect(Array.isArray(tool.recommendedFor), tool.id).toBe(true);
      expect(Array.isArray(tool.hiddenFor), tool.id).toBe(true);
      expect(typeof tool.requiresBackend).toBe('boolean');
      expect(typeof tool.requiresHumanReview).toBe('boolean');
    }
  });

  it('prioritizes operations tools for fleet users without making them disappear for clinicians', () => {
    const tools = getUserFacingToolRegistryProjection();
    const fleetGraph = buildProfileToolGraph({ tools, profile: profileFor('fleet operator', { workspace: 'fleet' }) });
    const nurseGraph = buildProfileToolGraph({ tools, profile: profileFor('nurse') });

    expect(fleetGraph.visibleTools.some((tool) => /fleet/i.test(`${tool.name} ${tool.id}`))).toBe(true);
    expect(nurseGraph.visibleTools.some((tool) => tool.id === 'fleet-live-map')).toBe(true);
    expect(fleetGraph.recommendedTools.some((tool) => tool.id === 'fleet-command')).toBe(true);
  });

  it('default profile has a safe useful baseline without admin-only tools', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({ tools, profile: profileFor('medical student') });
    const visibleIds = graph.visibleTools.map((tool) => tool.id);

    expect(graph.visibleTools.length).toBeGreaterThan(20);
    expect(graph.recommendedTools.length).toBeGreaterThan(5);
    expect(graph.visibleTools.some((tool) => tool.category === 'Calculator')).toBe(true);
    expect(visibleIds).toContain('lab-interp');
    expect(visibleIds).toContain('protocols');
    expect(graph.visibleTools.some((tool) => /governance|security|audit/i.test(`${tool.name} ${tool.id}`))).toBe(false);
  });

  it('ignores malformed persisted preference lists instead of throwing', () => {
    const profile = buildUserToolProfile({
      user: { role: 'physician' },
      toolPreferences: {
        favorites: { bad: true },
        pinned: null,
        recentTools: 'lab-interp',
        hiddenTools: 42,
        profileSettings: { role: 'physician' },
      },
      preferences: {
        toolPreferences: {
          favoriteToolIds: { bad: true },
          pinnedToolIds: 'qsofa',
          recentToolIds: null,
          hiddenToolIds: 42,
        },
      },
      permissions: { invalid: true },
    });

    expect(profile.preferredTools).toEqual([]);
    expect(profile.pinnedTools).toEqual([]);
    expect(profile.recentTools).toEqual([]);
    expect(profile.hiddenTools).toEqual([]);
    expect(profile.permissions).toEqual(expect.arrayContaining(['READ_PHI', 'USE_CALCULATORS']));
  });

  it('surfaces emergency physician tools', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('emergency physician', { specialty: 'emergency medicine', department: 'emergency' }),
    });
    const recommendedIds = graph.recommendedTools.map((tool) => tool.id);

    expect(recommendedIds).toEqual(expect.arrayContaining(['heart-score', 'nihss', 'qsofa', 'perc']));
  });

  it('filters specialty-specific tools for cardiology', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('cardiologist', { specialty: 'cardiology', workspace: 'all' }),
    });
    const recommendedIds = graph.recommendedTools.map((tool) => tool.id);

    expect(recommendedIds).toContain('has-bled');
    expect(recommendedIds).toContain('grace-acs');
  });

  it('surfaces bedside workflow tools for nurses', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('nurse', { specialty: 'hospital medicine', department: 'inpatient' }),
    });
    const visibleText = graph.visibleTools.map((tool) => `${tool.id} ${tool.name}`).join(' ');

    expect(graph.recommendedTools.length).toBeGreaterThan(5);
    expect(visibleText).toMatch(/braden|morse|fall|drug-check|lab-interp/i);
    expect(graph.visibleTools.some((tool) => /governance|security|audit/i.test(`${tool.name} ${tool.id}`))).toBe(false);
  });

  it('surfaces IoT, device, and system-health style tools for biomedical engineers', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('biomedical engineer', {
        specialty: 'biomedical engineering',
        department: 'biomedical engineering',
        workspace: 'hospital-operations',
      }),
    });
    const visibleText = graph.visibleTools.map((tool) => `${tool.id} ${tool.name}`).join(' ');

    expect(visibleText).toMatch(/iot|device|telemetry|system health|battery/i);
    expect(graph.visibleTools.some((tool) => tool.category === 'IoT' || /device/i.test(`${tool.id} ${tool.name}`))).toBe(true);
  });

  it('filters workspace-specific tools', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('fleet operator', { workspace: 'fleet' }),
    });

    expect(graph.workspaceTools.length).toBeGreaterThan(0);
    expect(graph.workspaceTools.every((tool) => tool.workspaceTags.includes('fleet') || tool.category === 'Fleet')).toBe(true);
  });

  it('hides restricted governance and security tools from normal users but allows admins', () => {
    const tools = getUserFacingToolRegistryProjection();
    const adminTool = tools.find((tool) => /governance|security|audit/i.test(`${tool.name} ${tool.id}`));
    const normalGraph = buildProfileToolGraph({ tools, profile: profileFor('nurse') });
    const adminGraph = buildProfileToolGraph({ tools, profile: profileFor('administrator') });

    expect(adminTool).toBeTruthy();
    expect(normalGraph.visibleTools.map((tool) => tool.id)).not.toContain(adminTool.id);
    expect(adminGraph.visibleTools.map((tool) => tool.id)).toContain(adminTool.id);
  });

  it('admin restricted filter exposes tools unavailable to normal clinical users', () => {
    const tools = getUserFacingToolRegistryProjection();
    const normalGraph = buildProfileToolGraph({ tools, profile: profileFor('nurse') });
    const adminGraph = buildProfileToolGraph({ tools, profile: profileFor('administrator') });

    expect(filterToolsForProfileGraph(normalGraph, 'restricted')).toHaveLength(0);
    expect(adminGraph.visibleTools.some((tool) => /governance|security|audit/i.test(`${tool.name} ${tool.id}`))).toBe(true);
  });

  it('keeps pinned and recent tools in the profile graph and removes hidden tools', () => {
    const tools = getUserFacingToolRegistryProjection();
    const calc = tools.find((tool) => tool.category === 'Calculator');
    const profile = profileFor('emergency physician', {
      pinnedTools: [calc.id],
      recentTools: [calc.id],
      hiddenTools: [calc.id],
    });
    const graph = buildProfileToolGraph({ tools, profile });

    expect(graph.visibleTools.map((tool) => tool.id)).not.toContain(calc.id);
    expect(graph.pinnedTools).toHaveLength(0);
    expect(graph.recentTools).toHaveLength(0);
  });

  it('All view preserves broad discovery without duplicates or broken routes', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({ tools, profile: profileFor('administrator') });
    const allTools = filterToolsForProfileGraph(graph, 'all');
    const ids = allTools.map((tool) => tool.id);

    expect(allTools.length).toBeGreaterThan(100);
    expect(new Set(ids).size).toBe(ids.length);
    for (const tool of allTools) {
      expect(tool.path || tool.navigationPath || tool.chatSeed, tool.id).toBeTruthy();
    }
  });

  it('graph counts match filter buckets', () => {
    const tools = getUserFacingToolRegistryProjection();
    const graph = buildProfileToolGraph({
      tools,
      profile: profileFor('cardiologist', { specialty: 'cardiology', pinnedTools: ['has-bled'], recentTools: ['grace-acs'] }),
    });

    expect(filterToolsForProfileGraph(graph, 'all')).toHaveLength(graph.counts.visible);
    expect(filterToolsForProfileGraph(graph, 'recommended')).toHaveLength(graph.counts.recommended);
    expect(filterToolsForProfileGraph(graph, 'pinned')).toHaveLength(graph.counts.pinned);
    expect(filterToolsForProfileGraph(graph, 'recent')).toHaveLength(graph.counts.recent);
    expect(filterToolsForProfileGraph(graph, 'favorites')).toHaveLength(graph.counts.favorites);
    expect(filterToolsForProfileGraph(graph, 'specialty')).toHaveLength(graph.counts.specialtyCoverage);
  });

  it('uses profile context for assistant recommendations', () => {
    const tools = getUserFacingToolRegistryProjection();
    const emergency = getProfileAssistantRecommendations(profileFor('emergency physician'), tools, 4).map((item) => item.toolId);
    const cardiology = getProfileAssistantRecommendations(profileFor('cardiologist'), tools, 4).map((item) => item.toolId);
    const fleet = getProfileAssistantRecommendations(profileFor('fleet operator', { workspace: 'fleet' }), tools, 4).map((item) => item.toolId);

    expect(emergency).toEqual(expect.arrayContaining(['heart-score', 'nihss', 'qsofa', 'perc']));
    expect(cardiology).toEqual(expect.arrayContaining(['has-bled', 'grace-acs']));
    expect(fleet).toEqual(expect.arrayContaining(['dispatch-ai', 'predictive-maintenance']));
  });
});
