import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_SECTION_IDS,
  buildCapabilityDiscovery,
  getCareDroidDidYouKnowSuggestions,
} from './capabilityDiscoveryEngine';
import { buildUserToolProfile } from './profileToolSegmentation';
import { getUserFacingToolRegistryProjection } from './toolInventory';

function profile(overrides: any = {}) {
  return buildUserToolProfile({
    user: { role: 'cardiologist' },
    toolPreferences: {
      favorites: [],
      pinned: [],
      recentTools: ['heart-score'],
      hiddenTools: [],
      profileSettings: { role: 'cardiologist', specialty: 'cardiology', ...overrides },
    },
  });
}

describe('capabilityDiscoveryEngine', () => {
  it('builds all required discovery sections', () => {
    const discovery = buildCapabilityDiscovery({
      profile: profile(),
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds: ['heart-score'],
    });

    expect(discovery.sections.map((section) => section.id)).toEqual([
      DISCOVERY_SECTION_IDS.NEW_TOOLS,
      DISCOVERY_SECTION_IDS.RECOMMENDED_TOOLS,
      DISCOVERY_SECTION_IDS.UNDERUSED_TOOLS,
      DISCOVERY_SECTION_IDS.SIMULATIONS,
      DISCOVERY_SECTION_IDS.WORKFLOWS,
      DISCOVERY_SECTION_IDS.PROTOCOLS,
    ]);
    expect(discovery.summary.totalItems).toBeGreaterThan(0);
    expect(discovery.summary.simulations).toBeGreaterThan(0);
    expect(discovery.summary.protocols).toBeGreaterThan(0);
  });

  it('keeps underused tools out of recent activity', () => {
    const recentToolIds = ['heart-score', 'has-bled'];
    const discovery = buildCapabilityDiscovery({
      profile: profile(),
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds,
    });
    const underused = discovery.sections.find(
      (section) => section.id === DISCOVERY_SECTION_IDS.UNDERUSED_TOOLS
    );

    expect(underused.items.map((item) => item.id)).not.toEqual(expect.arrayContaining(recentToolIds));
  });

  it('creates Did you know assistant prompts from discovery data', () => {
    const suggestions = getCareDroidDidYouKnowSuggestions({
      profile: profile(),
      tools: getUserFacingToolRegistryProjection(),
      recentToolIds: ['heart-score'],
      limit: 2,
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].label).toMatch(/^Did you know CareDroid can also/);
    expect(suggestions[0].source).toContain('capability-discovery:');
  });

  it('filters discovery tools through the profile compiler when saasRole is set', () => {
    const tools = getUserFacingToolRegistryProjection();
    const clerkDiscovery = buildCapabilityDiscovery({
      saasRole: 'registration-clerk',
      tools,
      recentToolIds: [],
    });
    const recommendedIds = clerkDiscovery.sections
      .find((section) => section.id === DISCOVERY_SECTION_IDS.RECOMMENDED_TOOLS)
      ?.items.map((item) => item.id);

    expect(recommendedIds).not.toContain('protocols');
    expect(recommendedIds).not.toContain('simulation-suite');
  });
});
