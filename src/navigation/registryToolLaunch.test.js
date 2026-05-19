import { describe, it, expect } from 'vitest';
import toolRegistry from '../data/toolRegistry';
import { getRegistryToolNavigation } from './registryToolLaunch';
import { TIER_B_CHAT_CALCULATOR_REGISTRY_IDS } from '../data/clinicalCatalogWiring';
import { NLU_PROFILE_TOOL_IDS } from '../data/clinicalToolIdContract';

describe('registryToolLaunch', () => {
  it.each([
    ['qsofa', 'calculator-route', '/tools/calculators/qsofa'],
    ['sofa-score', 'calculator-route', '/tools/calculator/sofa'],
    ['drug-check', 'tool-page', '/tools/drug-checker'],
    ['fleet-command', 'tool-page', '/fleet/command'],
  ])('getRegistryToolNavigation(%s) → %s %s', (id, mode, pathname) => {
    const plan = getRegistryToolNavigation(id);
    expect(plan.mode).toBe(mode);
    expect(plan.pathname).toBe(pathname);
  });

  it.each(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS)('Tier B %s launches chat-assisted dashboard', (id) => {
    const plan = getRegistryToolNavigation(id);
    expect(plan.mode).toBe('chat-assisted');
    expect(plan.pathname).toBe('/dashboard');
    expect(plan.shouldSeedChat).toBe(true);
    expect(plan.launch.chatSeed?.length).toBeGreaterThan(20);
  });

  it('dispatch-ai uses chat-assisted dashboard', () => {
    const plan = getRegistryToolNavigation('dispatch-ai');
    expect(plan.mode).toBe('chat-assisted');
    expect(plan.pathname).toBe('/dashboard');
  });

  it.each(NLU_PROFILE_TOOL_IDS)('NLU profile %s resolves via getRegistryToolNavigation', (nluId) => {
    const plan = getRegistryToolNavigation(nluId);
    expect(plan.pathname).toBeTruthy();
    expect(['calculator-route', 'chat-assisted', 'tool-page', 'calculator-hub', 'fallback']).toContain(
      plan.mode
    );
    if (plan.launch.chatSeed && plan.mode === 'chat-assisted') {
      expect(plan.shouldSeedChat).toBe(true);
    }
  });

  it('covers every toolRegistry path with a known launch mode', () => {
    for (const tool of toolRegistry) {
      const plan = getRegistryToolNavigation(tool.id);
      expect(['calculator-route', 'chat-assisted', 'tool-page', 'calculator-hub', 'fallback']).toContain(
        plan.mode
      );
      expect(plan.pathname).toBeTruthy();
    }
  });
});
