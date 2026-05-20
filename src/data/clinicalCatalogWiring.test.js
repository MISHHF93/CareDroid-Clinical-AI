/**
 * clinicalCatalogWiring — navigation helpers and launch resolution edges.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCatalogLaunch,
  resolveNavigationPathForLaunch,
  resolveRegistryId,
  CATALOG_UNKNOWN_TOOL_LAUNCH,
  isCalculatorsHubPath,
} from './clinicalCatalogWiring';
import { ALL_REGISTRY_TOOL_IDS } from './clinicalToolIdContract';
import { getFrontendVisibleToolInventory } from './toolInventory';

describe('clinicalCatalogWiring helpers', () => {
  it('isCalculatorsHubPath recognizes hub route', () => {
    expect(isCalculatorsHubPath('/tools/calculators')).toBe(true);
    expect(isCalculatorsHubPath('/tools/calculators/')).toBe(true);
    expect(isCalculatorsHubPath('/dashboard')).toBe(false);
  });

  it('resolveNavigationPathForLaunch sends hub chat seeds to dashboard', () => {
    const nav = resolveNavigationPathForLaunch({
      path: '/tools/calculators',
      chatSeed: 'Calculate Wells PE',
    });
    expect(nav).toBe('/dashboard');
  });

  it('resolveRegistryId maps unknown ids to null', () => {
    expect(resolveRegistryId('not-a-real-tool-id-xyz')).toBeNull();
  });

  it('unknown catalog id returns safe dashboard launch', () => {
    const launch = resolveCatalogLaunch('totally-unknown-tool');
    expect(launch.path).toBe(CATALOG_UNKNOWN_TOOL_LAUNCH.path);
    expect(launch.chatSeed?.length).toBeGreaterThan(20);
    expect(launch.registryId).toBeNull();
  });

  it.each(ALL_REGISTRY_TOOL_IDS)('resolveCatalogLaunch(%s) returns path or chat seed', (registryId) => {
    const launch = resolveCatalogLaunch(registryId);
    expect(launch.path || launch.chatSeed).toBeTruthy();
    expect(launch.openLabel?.length).toBeGreaterThan(0);
  });

  it('every frontend-visible inventory record resolves to a structured launch fallback', () => {
    for (const record of getFrontendVisibleToolInventory()) {
      const launch = resolveCatalogLaunch(record.id);
      expect(launch, record.id).toEqual(
        expect.objectContaining({
          path: expect.anything(),
          openLabel: expect.any(String),
        })
      );
      expect(launch.path || launch.chatSeed || record.fallbackRoute, record.id).toBeTruthy();
      expect(launch.openLabel.length, record.id).toBeGreaterThan(0);
    }
  });
});
