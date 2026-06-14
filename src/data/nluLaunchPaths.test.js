import { describe, it, expect } from 'vitest';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  CATALOG_UNKNOWN_TOOL_LAUNCH,
} from './clinicalCatalogWiring';
import { NLU_LAUNCH_EXPECTATIONS, getNluLaunchExpectation } from './nluLaunchContract';
import {
  NLU_PROFILE_TOOL_IDS,
  NLU_HUB_ONLY_PROFILE_TOOL_IDS,
  TOOL_LAUNCH_PATHS,
} from './clinicalToolIdContract';
import { getRegistryToolNavigation } from '../navigation/registryToolLaunch';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';

const HUB = TOOL_LAUNCH_PATHS.calculatorsHub;

describe('nluLaunchPaths — every NLU profile resolves visibly', () => {
  it.each(NLU_PROFILE_TOOL_IDS)('%s has path or chatSeed (no silent empty launch)', (nluToolId) => {
    const launch = resolveCatalogLaunch(nluToolId);
    expect(launch.path || launch.chatSeed, `${nluToolId} must navigate or seed chat`).toBeTruthy();
    expect(launch.openLabel?.length).toBeGreaterThan(0);
  });

  it.each(NLU_LAUNCH_EXPECTATIONS)('$nluToolId matches launch contract ($kind)', (expectation) => {
    const launch = resolveCatalogLaunch(expectation.nluToolId);
    const navPath = resolveNavigationPathForLaunch(launch);
    const plan = getRegistryToolNavigation(expectation.nluToolId);

    expect(launch.registryId).toBe(expectation.registryId);

    if (expectation.expectsDedicatedCalculatorPath) {
      expect(matchCalculatorRoute(launch.path)).not.toBeNull();
      expect(plan.mode).toBe('calculator-route');
      expect(plan.pathname).toBe(CANONICAL_ROUTES.emergencyTools);
      expect(plan.search).toContain('filter=calculator');
    }

    if (expectation.expectsDashboardChat) {
      expect(navPath).toBe('/assistant');
      expect(plan.shouldSeedChat).toBe(true);
      expect(plan.pathname).toBe(CANONICAL_ROUTES.emergencyCopilot);
      expect(launch.chatSeed?.length).toBeGreaterThan(10);
    }

    if (expectation.kind === 'clinical-page') {
      expect(plan.mode).toBe('tool-page');
      expect(navPath).not.toBe('/assistant');
    }

    if (expectation.kind === 'fleet-page') {
      expect(plan.mode).toBe('tool-page');
      expect(plan.pathname).toBe(CANONICAL_ROUTES.emergencyTools);
      expect(plan.search).toContain('filter=operations');
    }

    if (expectation.allowsHubPath) {
      expect(launch.path).toBe(HUB);
    }
  });

  it.each(NLU_HUB_ONLY_PROFILE_TOOL_IDS)('%s hub NLU keeps dedicated registry id', (toolId) => {
    const launch = resolveCatalogLaunch(toolId);
    expect(launch.registryId).toBe(toolId);
    expect(launch.path).toBe(HUB);
    expect(launch.chatSeed?.length).toBeGreaterThan(20);
  });
});

describe('nluLaunchPaths — unsupported ids use explicit fallback', () => {
  it('unknown tool id returns guarded catalog fallback', () => {
    const launch = resolveCatalogLaunch('not-a-real-clinical-tool-xyz');
    expect(launch.path).toBe(CATALOG_UNKNOWN_TOOL_LAUNCH.path);
    expect(launch.chatSeed).toMatch(/not recognized|clinical tools catalog/i);
    const plan = getRegistryToolNavigation('not-a-real-clinical-tool-xyz');
    expect(plan.pathname).toBeTruthy();
    expect(plan.launch.chatSeed).toBeTruthy();
  });
});

describe('nluLaunchPaths — contract coverage', () => {
  it('NLU_LAUNCH_EXPECTATIONS covers every profile id', () => {
    expect(NLU_LAUNCH_EXPECTATIONS.map((e) => e.nluToolId).sort()).toEqual(
      [...NLU_PROFILE_TOOL_IDS].sort()
    );
  });

  it('getNluLaunchExpectation is stable for hub tools', () => {
    const exp = getNluLaunchExpectation('apache2-calculator');
    expect(exp.kind).toBe('tier-a-calculator');
    expect(exp.registryId).toBe('apache2-calculator');
  });
});
