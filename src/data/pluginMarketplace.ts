import {
  PLUGIN_LIFECYCLE_STATUS,
  PLUGIN_REGISTRY,
  PLUGIN_TYPES,
  validatePluginRegistry,
} from './pluginRegistry';
import { getCanonicalToolInventory } from './toolInventory';

export const PLUGIN_MARKETPLACE_STORAGE_KEY = 'caredroid.pluginMarketplace.v1';

export const PLUGIN_MARKETPLACE_ACTIONS = Object.freeze({
  INSTALL: 'install',
  UNINSTALL: 'uninstall',
  ENABLE: 'enable',
  DISABLE: 'disable',
});

export const PLUGIN_TYPE_LABELS = Object.freeze({
  [PLUGIN_TYPES.CALCULATOR]: 'Calculator',
  [PLUGIN_TYPES.PROTOCOL]: 'Protocol',
  [PLUGIN_TYPES.SIMULATION]: 'Simulation',
  [PLUGIN_TYPES.WORKFLOW]: 'Workflow',
  [PLUGIN_TYPES.DASHBOARD]: 'Dashboard',
  [PLUGIN_TYPES.AI_EXTENSION]: 'AI Extension',
});

const DEFAULT_INSTALLED_STATUSES = new Set([
  PLUGIN_LIFECYCLE_STATUS.ACTIVE,
  PLUGIN_LIFECYCLE_STATUS.BETA,
]);

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function parseStoredState(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function defaultControlFor(plugin) {
  const installed = DEFAULT_INSTALLED_STATUSES.has(plugin.lifecycle?.status);
  return {
    installed,
    enabled: installed && plugin.lifecycle?.status !== PLUGIN_LIFECYCLE_STATUS.DISABLED,
    updatedAt: plugin.lifecycle?.since || null,
  };
}

export function createDefaultPluginMarketplaceState(plugins = PLUGIN_REGISTRY) {
  return Object.fromEntries(plugins.map((plugin) => [plugin.id, defaultControlFor(plugin)]));
}

export function normalizePluginMarketplaceState(
  state: any = {},
  plugins = PLUGIN_REGISTRY,
  now = new Date().toISOString()
) {
  const defaults = createDefaultPluginMarketplaceState(plugins);
  return Object.fromEntries(
    plugins.map((plugin) => {
      const incoming = state[plugin.id] || {};
      const installed = Boolean(incoming.installed ?? defaults[plugin.id].installed);
      return [
        plugin.id,
        {
          installed,
          enabled: installed ? Boolean(incoming.enabled ?? defaults[plugin.id].enabled) : false,
          updatedAt: incoming.updatedAt || defaults[plugin.id].updatedAt || now,
        },
      ];
    })
  );
}

export function loadPluginMarketplaceState(plugins = PLUGIN_REGISTRY) {
  if (!storageAvailable()) return createDefaultPluginMarketplaceState(plugins);
  return normalizePluginMarketplaceState(
    parseStoredState(window.localStorage.getItem(PLUGIN_MARKETPLACE_STORAGE_KEY)),
    plugins
  );
}

export function savePluginMarketplaceState(state) {
  if (!storageAvailable()) return state;
  window.localStorage.setItem(PLUGIN_MARKETPLACE_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function applyPluginMarketplaceAction(
  state,
  pluginId,
  action,
  now = new Date().toISOString()
) {
  if (!Object.values(PLUGIN_MARKETPLACE_ACTIONS).includes(action)) {
    throw new Error(`Unsupported plugin marketplace action: ${action}`);
  }

  const current = state[pluginId] || { installed: false, enabled: false };
  const next = { ...current, updatedAt: now };

  if (action === PLUGIN_MARKETPLACE_ACTIONS.INSTALL) {
    next.installed = true;
    next.enabled = true;
  }

  if (action === PLUGIN_MARKETPLACE_ACTIONS.UNINSTALL) {
    next.installed = false;
    next.enabled = false;
  }

  if (action === PLUGIN_MARKETPLACE_ACTIONS.ENABLE) {
    next.installed = true;
    next.enabled = true;
  }

  if (action === PLUGIN_MARKETPLACE_ACTIONS.DISABLE) {
    next.installed = true;
    next.enabled = false;
  }

  return {
    ...state,
    [pluginId]: next,
  };
}

function validationForPlugin(plugin, inventoryById, registryValidation) {
  const registryResult = registryValidation.results.find((result) => result.pluginId === plugin.id);
  const inventoryRecord = inventoryById.get(plugin.id);
  const errors = [...(registryResult?.errors || [])];
  const warnings = [...(registryResult?.warnings || [])];

  if (!inventoryRecord) {
    errors.push('Plugin is not projected into the unified inventory.');
  } else if (inventoryRecord.sourceKind !== 'plugin') {
    errors.push('Unified inventory record is not marked as a plugin source.');
  }

  if (inventoryRecord && inventoryRecord.plugin?.type !== plugin.type) {
    errors.push('Unified inventory plugin type does not match marketplace registration.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    inventoryRecord,
  };
}

export function buildPluginMarketplace({
  plugins = PLUGIN_REGISTRY,
  inventoryRecords = getCanonicalToolInventory(),
  state = loadPluginMarketplaceState(plugins),
}: any = {}) {
  const normalizedState = normalizePluginMarketplaceState(state, plugins);
  const inventoryById = new Map(inventoryRecords.map((record) => [record.id, record]));
  const registryValidation = validatePluginRegistry(plugins);

  const items = plugins.map((plugin) => {
    const controls = normalizedState[plugin.id];
    const validation = validationForPlugin(plugin, inventoryById, registryValidation);
    const inventoryRecord = validation.inventoryRecord;

    return {
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
      typeLabel: PLUGIN_TYPE_LABELS[plugin.type] || plugin.type,
      owner: plugin.owner,
      version: plugin.version,
      lifecycleStatus: plugin.lifecycle?.status,
      installed: controls.installed,
      enabled: controls.enabled,
      updatedAt: controls.updatedAt,
      route: plugin.inventory?.route || inventoryRecord?.route || '/tools/catalog',
      description: plugin.inventory?.description || inventoryRecord?.safetyCopy || '',
      permissions: plugin.permissions?.permissions || [],
      permissionLogic: plugin.permissions?.logic || 'all',
      riskLevel: plugin.inventory?.riskLevel || inventoryRecord?.riskLevel || 'medium',
      tags: plugin.inventory?.tags || [],
      inventoryLinked: Boolean(validation.inventoryRecord),
      inventoryStatus: controls.enabled ? inventoryRecord?.lifecycleState || 'active' : 'hidden',
      validation,
    };
  });

  const installedCount = items.filter((item) => item.installed).length;
  const enabledCount = items.filter((item) => item.enabled).length;
  const invalidCount = items.filter((item) => !item.validation.valid).length;

  return {
    items,
    state: normalizedState,
    validation: {
      valid: invalidCount === 0 && registryValidation.valid,
      invalidCount,
      errors: items.flatMap((item) =>
        item.validation.errors.map((error) => `${item.name}: ${error}`)
      ),
      warnings: [
        ...registryValidation.warnings,
        ...items.flatMap((item) =>
          item.validation.warnings.map((warning) => `${item.name}: ${warning}`)
        ),
      ],
    },
    summary: {
      total: items.length,
      installed: installedCount,
      enabled: enabledCount,
      disabled: installedCount - enabledCount,
      available: items.length - installedCount,
      invalid: invalidCount,
      types: Object.values(PLUGIN_TYPES).map((type) => ({
        type,
        label: PLUGIN_TYPE_LABELS[type],
        count: items.filter((item) => item.type === type).length,
      })),
    },
  };
}
