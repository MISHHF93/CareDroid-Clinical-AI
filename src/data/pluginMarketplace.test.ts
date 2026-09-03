import { beforeEach, describe, expect, it } from 'vitest';
import {
  PLUGIN_MARKETPLACE_ACTIONS,
  PLUGIN_MARKETPLACE_STORAGE_KEY,
  applyPluginMarketplaceAction,
  buildPluginMarketplace,
  createDefaultPluginMarketplaceState,
  loadPluginMarketplaceState,
  savePluginMarketplaceState,
} from './pluginMarketplace';
import { PLUGIN_REGISTRY, PLUGIN_TYPES } from './pluginRegistry';
import { getCanonicalToolInventory } from './toolInventory';

describe('pluginMarketplace', () => {
  beforeEach(() => {
    localStorage.removeItem(PLUGIN_MARKETPLACE_STORAGE_KEY);
  });

  it('builds marketplace entries for all plugin types and links unified inventory records', () => {
    const marketplace = buildPluginMarketplace();
    const pluginTypes = new Set(marketplace.items.map((item) => item.type));

    expect(pluginTypes).toEqual(new Set(Object.values(PLUGIN_TYPES)));
    expect(marketplace.summary.total).toBe(PLUGIN_REGISTRY.length);
    expect(marketplace.validation.valid).toBe(true);
    expect(marketplace.items.every((item) => item.inventoryLinked)).toBe(true);

    const inventoryIds = new Set(getCanonicalToolInventory().map((record) => record.id));
    for (const plugin of PLUGIN_REGISTRY) {
      expect(inventoryIds.has(plugin.id), plugin.id).toBe(true);
    }
  });

  it('applies install, disable, enable, and uninstall actions', () => {
    const initial = createDefaultPluginMarketplaceState();
    const pluginId = 'plugin-fluid-resuscitation-calculator';

    const installed = applyPluginMarketplaceAction(
      initial,
      pluginId,
      PLUGIN_MARKETPLACE_ACTIONS.INSTALL,
      '2026-05-31T00:00:00.000Z',
    );
    expect(installed[pluginId]).toMatchObject({ installed: true, enabled: true });

    const disabled = applyPluginMarketplaceAction(
      installed,
      pluginId,
      PLUGIN_MARKETPLACE_ACTIONS.DISABLE,
    );
    expect(disabled[pluginId]).toMatchObject({ installed: true, enabled: false });

    const enabled = applyPluginMarketplaceAction(
      disabled,
      pluginId,
      PLUGIN_MARKETPLACE_ACTIONS.ENABLE,
    );
    expect(enabled[pluginId]).toMatchObject({ installed: true, enabled: true });

    const uninstalled = applyPluginMarketplaceAction(
      enabled,
      pluginId,
      PLUGIN_MARKETPLACE_ACTIONS.UNINSTALL,
    );
    expect(uninstalled[pluginId]).toMatchObject({ installed: false, enabled: false });
  });

  it('persists marketplace state in localStorage', () => {
    const state = applyPluginMarketplaceAction(
      createDefaultPluginMarketplaceState(),
      'plugin-fluid-resuscitation-calculator',
      PLUGIN_MARKETPLACE_ACTIONS.INSTALL,
    );

    savePluginMarketplaceState(state);
    expect(loadPluginMarketplaceState()['plugin-fluid-resuscitation-calculator']).toMatchObject({
      installed: true,
      enabled: true,
    });
  });
});
