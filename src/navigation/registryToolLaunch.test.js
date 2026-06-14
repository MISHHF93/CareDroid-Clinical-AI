import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import toolRegistry from '../data/toolRegistry';
import {
  applyRegistryToolLaunch,
  getRegistryToolNavigation,
  isRegistryToolLaunchAllowed,
  resolveRegistryToolLaunchAccess,
} from './registryToolLaunch';
import { TIER_B_CHAT_CALCULATOR_REGISTRY_IDS } from '../data/clinicalCatalogWiring';
import { NLU_PROFILE_TOOL_IDS } from '../data/clinicalToolIdContract';
import { setPlatformEntitlementContext } from '../data/assetEntitlements';
import {
  getFrontendVisibleToolInventory,
  getUserFacingToolInventory,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from '../data/toolInventory';
import { getMountedCapabilityGraph } from '../data/mountedCapabilityGraph';
import { CANONICAL_ROUTES } from '../config/routes.config';

const ACTIVE_EMERGENCY_LAUNCH_ROUTES = new Set([
  CANONICAL_ROUTES.emergencyCopilot,
  CANONICAL_ROUTES.emergencyTools,
]);

describe('registryToolLaunch', () => {
  beforeEach(() => {
    setPlatformEntitlementContext(null);
  });

  afterEach(() => {
    setPlatformEntitlementContext(null);
  });

  it.each([
    ['qsofa', 'calculator-route', '/emergency/tools', '?source=calculators&filter=calculator&q=qsofa'],
    ['sofa-score', 'calculator-route', '/emergency/tools', '?source=calculators&filter=calculator&q=sofa'],
    ['drug-check', 'tool-page', '/emergency/tools', '?source=tools&filter=clinical-tools&q=drug-check'],
    ['fleet-command', 'tool-page', '/emergency/tools', '?source=operations&filter=operations&q=fleet-command'],
  ])('getRegistryToolNavigation(%s) → %s %s', (id, mode, pathname, search) => {
    const plan = getRegistryToolNavigation(id);
    expect(plan.mode).toBe(mode);
    expect(plan.pathname).toBe(pathname);
    expect(plan.search).toBe(search);
  });

  it.each(TIER_B_CHAT_CALCULATOR_REGISTRY_IDS)('Tier B %s launches chat-assisted flow', (id) => {
    const plan = getRegistryToolNavigation(id);
    expect(plan.mode).toBe('chat-assisted');
    expect(plan.pathname).toBe(CANONICAL_ROUTES.emergencyCopilot);
    expect(plan.shouldSeedChat).toBe(true);
    expect(plan.launch.chatSeed?.length).toBeGreaterThan(20);
  });

  it('dispatch-ai uses chat-assisted flow', () => {
    const plan = getRegistryToolNavigation('dispatch-ai');
    expect(plan.mode).toBe('chat-assisted');
    expect(plan.pathname).toBe(CANONICAL_ROUTES.emergencyCopilot);
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
        expect(plan.pathname, record.id).toBe(CANONICAL_ROUTES.emergencyCopilot);
        expect(plan.shouldSeedChat, record.id).toBe(true);
        expect(plan.launch.chatSeed, record.id).toBeTruthy();
      }

      if (record.surface === TOOL_SURFACES.CALCULATOR_FORM && record.hasDedicatedForm) {
        expect(plan.mode, record.id).toBe('calculator-route');
        expect(plan.pathname, record.id).toBe(CANONICAL_ROUTES.emergencyTools);
        expect(plan.search, record.id).toContain('filter=calculator');
      }

      if ([TOOL_SURFACES.TOOL_PAGE, TOOL_SURFACES.FLEET_PAGE, TOOL_SURFACES.HUB].includes(record.surface)) {
        expect(ACTIVE_EMERGENCY_LAUNCH_ROUTES.has(plan.pathname), record.id).toBe(true);
      }
    }
  });

  it('resolves launch plans for every command-visible mounted capability', () => {
    const allowedModes = new Set(['calculator-route', 'chat-assisted', 'tool-page', 'calculator-hub', 'fallback']);
    const launchableCapabilities = getMountedCapabilityGraph().capabilities.filter(
      (capability) => capability.commandVisible
    );

    expect(launchableCapabilities.length).toBeGreaterThan(0);
    for (const capability of launchableCapabilities) {
      const plan = getRegistryToolNavigation(capability.capabilityId);
      expect(allowedModes.has(plan.mode), capability.capabilityId).toBe(true);
      expect(plan.pathname, capability.capabilityId).toBeTruthy();
      expect(plan.registryId, capability.capabilityId).toBeTruthy();
      expect(plan.launch, capability.capabilityId).toBeTruthy();
    }
  });

  it('denies strict SaaS launches when org entitlements exclude the asset', () => {
    const context = {
      organization: { id: 'org-1' },
      entitledAssetIds: ['qsofa'],
      strictSaasEntitlements: true,
      role: 'admin',
      effectivePermissions: ['USE_CALCULATORS'],
    };

    expect(isRegistryToolLaunchAllowed('news2', context)).toBe(false);
    expect(resolveRegistryToolLaunchAccess('news2', context)).toMatchObject({
      allowed: false,
      accessState: 'locked',
    });
  });

  it('does not record, select, seed, or navigate to denied tools', () => {
    const entitlementContext = {
      organization: { id: 'org-1' },
      entitledAssetIds: [],
      strictSaasEntitlements: true,
      role: 'admin',
      effectivePermissions: ['USE_CALCULATORS'],
    };
    const handlers = {
      navigate: vi.fn(),
      addMessage: vi.fn(),
      selectTool: vi.fn(),
      setActiveTool: vi.fn(),
      recordToolAccess: vi.fn(),
      entitlementContext,
    };

    applyRegistryToolLaunch('qsofa', handlers);

    expect(handlers.recordToolAccess).not.toHaveBeenCalled();
    expect(handlers.selectTool).not.toHaveBeenCalled();
    expect(handlers.setActiveTool).not.toHaveBeenCalled();
    expect(handlers.addMessage).not.toHaveBeenCalled();
    expect(handlers.navigate).toHaveBeenCalledWith(
      { pathname: '/emergency/tools', search: '?entitlement=denied&reason=locked' },
      { replace: true }
    );
  });

  it('blocks deep links when platform context marks a feature subscription-required', () => {
    const context = {
      organization: { id: 'org-1' },
      role: 'admin',
      assetAccessDecisions: {
        'simulation-suite': {
          state: 'subscription-required',
          isVisible: true,
          isLaunchable: false,
          reason: 'subscription-required',
        },
      },
    };

    expect(isRegistryToolLaunchAllowed('simulation-suite', context)).toBe(false);
    expect(resolveRegistryToolLaunchAccess('simulation-suite', context)).toMatchObject({
      allowed: false,
      accessState: 'subscription-required',
    });
  });
});
