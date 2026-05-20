import { describe, it, expect } from 'vitest';
import toolRegistry from '../data/toolRegistry';
import { getRegistryToolNavigation } from './registryToolLaunch';
import { TIER_B_CHAT_CALCULATOR_REGISTRY_IDS } from '../data/clinicalCatalogWiring';
import { NLU_PROFILE_TOOL_IDS } from '../data/clinicalToolIdContract';
import {
  getFrontendVisibleToolInventory,
  getUserFacingToolInventory,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from '../data/toolInventory';
import { isKnownToolAreaPath, matchCalculatorRoute } from '../routes/clinicalToolRoutes';

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

  it('does not produce blank navigation for any frontend-visible inventory record', () => {
    for (const record of getFrontendVisibleToolInventory()) {
      if (!record.sidebarVisible && !record.nluToolId) continue;
      const plan = getRegistryToolNavigation(record.id);
      expect(plan.pathname, record.id).toBeTruthy();
      expect(plan.launch, record.id).toBeTruthy();
      expect(plan.launch.path || plan.launch.chatSeed || record.fallbackRoute, record.id).toBeTruthy();
    }
  });

  it('does not produce blank launch targets for any user-facing inventory record', () => {
    const allowedModes = new Set(['calculator-route', 'chat-assisted', 'tool-page', 'calculator-hub', 'fallback']);

    for (const record of getUserFacingToolInventory()) {
      const plan = getRegistryToolNavigation(record.id);
      expect(allowedModes.has(plan.mode), record.id).toBe(true);
      expect(plan.pathname, record.id).toBeTruthy();
      expect(plan.launch, record.id).toBeTruthy();
      expect(plan.registryId, record.id).toBeTruthy();

      if (record.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED) {
        expect(plan.mode, record.id).toBe('chat-assisted');
        expect(plan.pathname, record.id).toBe('/dashboard');
        expect(plan.shouldSeedChat, record.id).toBe(true);
        expect(plan.launch.chatSeed, record.id).toBeTruthy();
      }

      if (record.surface === TOOL_SURFACES.CALCULATOR_FORM && record.hasDedicatedForm) {
        expect(plan.mode, record.id).toBe('calculator-route');
        expect(matchCalculatorRoute(plan.pathname), record.id).toBeTruthy();
      }

      if ([TOOL_SURFACES.TOOL_PAGE, TOOL_SURFACES.FLEET_PAGE, TOOL_SURFACES.HUB].includes(record.surface)) {
        expect(isKnownToolAreaPath(plan.pathname), record.id).toBe(true);
      }
    }
  });
});
