import { create } from 'zustand';
import {
  FEATURE_REGISTRY,
  FEATURE_REGISTRY_BY_ID,
  type Feature,
  type FeatureTier,
} from '../lib/features/featureRegistry';
import {
  fetchSettingsFeatureFlags,
  subscribeToSettingsFeatureChanges,
  updateSettingsFeatureFlag,
} from '../src/services/emergencySettingsApi';
import { syncEmergencyAuditEvent } from '../src/services/emergencyStaffingApi';

type FeatureFlags = Record<string, boolean>;
type FeatureOverrides = Record<string, boolean>;
type FeaturePersistenceMode = 'backend' | 'local';

interface FeatureStoreState {
  flags: FeatureFlags;
  overrides: FeatureOverrides;
  tier: FeatureTier;
  loading: boolean;
  lastSynced: Date | null;
  backendAvailable: boolean;
  persistenceMode: FeaturePersistenceMode;
  initializeFlags: () => Promise<void>;
  toggleFeature: (featureId: string, enabled: boolean, metadata?: { changedBy?: string }) => Promise<boolean>;
  setTier: (tier: FeatureTier) => void;
  isEnabled: (featureId: string) => boolean;
  getEnabledFeatures: () => Feature[];
  getDependencyWarning: (featureId: string) => string | null;
  syncFeatureFlag: (payload: unknown) => { featureId: string; enabled: boolean; changedBy?: string } | null;
}

const FEATURE_STORE_STORAGE_KEY = 'caredroid.emergency.featureStore.v1';
const TIER_RANK: Record<FeatureTier, number> = {
  core: 0,
  professional: 1,
  enterprise: 2,
};

const DEFAULT_TIER: FeatureTier = 'professional';
const isDevelopmentMode = () =>
  typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);

function isFeatureAvailableForTier(feature: Feature, tier: FeatureTier): boolean {
  return TIER_RANK[feature.tier] <= TIER_RANK[tier];
}

function defaultEnabledForFeature(feature: Feature, tier: FeatureTier): boolean {
  if (feature.tier === 'core') return true;
  if (!isFeatureAvailableForTier(feature, tier)) return false;
  if (feature.id === 'simulation_engine') return isDevelopmentMode();
  return feature.defaultEnabled;
}

function buildDefaultFlags(tier: FeatureTier): FeatureFlags {
  return Object.fromEntries(
    FEATURE_REGISTRY.map((feature) => [feature.id, defaultEnabledForFeature(feature, tier)]),
  );
}

function resolveEffectiveFlag(
  featureId: string,
  flags: FeatureFlags,
  overrides: FeatureOverrides,
  tier: FeatureTier,
  visited = new Set<string>(),
): boolean {
  const feature = FEATURE_REGISTRY_BY_ID[featureId];
  if (!feature || visited.has(featureId)) return false;
  if (!isFeatureAvailableForTier(feature, tier)) return false;

  visited.add(featureId);
  const dependenciesEnabled = feature.dependencies.every((dependencyId) =>
    resolveEffectiveFlag(dependencyId, flags, overrides, tier, new Set(visited)),
  );
  if (!dependenciesEnabled) return false;
  if (feature.tier === 'core') return true;

  const ownValue = Object.prototype.hasOwnProperty.call(overrides, featureId)
    ? overrides[featureId]
    : flags[featureId];
  if (!ownValue) return false;

  return true;
}

function dependentEnabledFeatures(
  featureId: string,
  flags: FeatureFlags,
  overrides: FeatureOverrides,
  tier: FeatureTier,
): Feature[] {
  return FEATURE_REGISTRY.filter((feature) =>
    feature.dependencies.includes(featureId) && resolveEffectiveFlag(feature.id, flags, overrides, tier),
  );
}

function normalizeTier(value: unknown, fallback: FeatureTier = DEFAULT_TIER): FeatureTier {
  return value === 'core' || value === 'professional' || value === 'enterprise'
    ? value
    : fallback;
}

function normalizeBackendFlags(payload: any): FeatureOverrides {
  if (payload?.flags && typeof payload.flags === 'object' && !Array.isArray(payload.flags)) {
    return Object.fromEntries(
      Object.entries(payload.flags)
        .filter(([featureId]) => FEATURE_REGISTRY_BY_ID[String(featureId)])
        .map(([featureId, enabled]) => [String(featureId), Boolean(enabled)]),
    );
  }

  const flags = Array.isArray(payload?.flags) ? payload.flags : [];
  return Object.fromEntries(
    flags
      .filter((flag: any) => FEATURE_REGISTRY_BY_ID[String(flag?.id || flag?.featureId || '')])
      .map((flag: any) => {
        const featureId = String(flag.id || flag.featureId);
        const state = String(flag?.state || '').toLowerCase();
        const enabled =
          typeof flag.enabled === 'boolean' ? flag.enabled : state !== 'disabled' && state !== 'false';
        return [featureId, enabled];
      }),
  );
}

function normalizeSyncPayload(payload: any) {
  const row = payload?.new || payload?.record || payload?.data || payload || {};
  const featureId = String(row.featureId || row.feature_id || row.flagId || row.flag_id || '').trim();
  if (!FEATURE_REGISTRY_BY_ID[featureId]) return null;
  const enabled =
    typeof row.enabled === 'boolean'
      ? row.enabled
      : String(row.state || row.enabled || '').toLowerCase() === 'enabled';
  return {
    featureId,
    enabled,
    changedBy:
      row.changedByName ||
      row.changed_by_name ||
      row.staffName ||
      row.staff_name ||
      row.changedBy ||
      row.changed_by ||
      undefined,
    tier: normalizeTier(row.tier, DEFAULT_TIER),
  };
}

function readLocalSnapshot(): Partial<
  Pick<FeatureStoreState, 'flags' | 'overrides' | 'tier' | 'lastSynced'>
> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(FEATURE_STORE_STORAGE_KEY) || '{}');
    return {
      flags: parsed.flags && typeof parsed.flags === 'object' ? parsed.flags : undefined,
      overrides:
        parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : undefined,
      tier: parsed.tier && parsed.tier in TIER_RANK ? parsed.tier : undefined,
      lastSynced: parsed.lastSynced ? new Date(parsed.lastSynced) : null,
    };
  } catch (_error) {
    return {};
  }
}

function writeLocalSnapshot(state: Pick<FeatureStoreState, 'flags' | 'overrides' | 'tier' | 'lastSynced'>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    FEATURE_STORE_STORAGE_KEY,
    JSON.stringify({
      flags: state.flags,
      overrides: state.overrides,
      tier: state.tier,
      lastSynced: state.lastSynced?.toISOString() || null,
    }),
  );
}

function persistFeatureOverride(featureId: string, enabled: boolean, changedBy?: string) {
  return updateSettingsFeatureFlag({
    featureId,
    enabled,
    changedBy: changedBy || 'current-user',
    timestamp: new Date().toISOString(),
  });
}

function auditFeatureToggle(featureId: string, enabled: boolean, metadata: Record<string, unknown> = {}) {
  void syncEmergencyAuditEvent({
    action: 'feature_toggle',
    resourceType: 'feature',
    resourceId: featureId,
    timestamp: new Date().toISOString(),
    metadata: {
      enabled,
      ...metadata,
    },
  });
}

const initialLocalState = readLocalSnapshot();
const initialTier = initialLocalState.tier || DEFAULT_TIER;
const initialFlags = {
  ...buildDefaultFlags(initialTier),
  ...(initialLocalState.flags || {}),
};

export const useFeatureStore = create<FeatureStoreState>((set, get) => ({
  flags: initialFlags,
  overrides: initialLocalState.overrides || {},
  tier: initialTier,
  loading: false,
  lastSynced: initialLocalState.lastSynced || null,
  backendAvailable: false,
  persistenceMode: 'local',

  initializeFlags: async () => {
    const tier = get().tier || DEFAULT_TIER;
    const defaults = buildDefaultFlags(tier);
    set({ loading: true, flags: { ...defaults, ...get().flags } });

    try {
      const result = await fetchSettingsFeatureFlags();
      if (!result?.ok) {
        throw new Error(result?.message || 'Feature settings endpoint unavailable.');
      }

      const backendTier = normalizeTier(result.data?.tier, tier);
      const backendDefaults = buildDefaultFlags(backendTier);
      const backendOverrides = normalizeBackendFlags(result.data);
      const nextState = {
        flags: { ...backendDefaults, ...backendOverrides },
        overrides: backendOverrides,
        tier: backendTier,
        loading: false,
        lastSynced: new Date(),
        backendAvailable: true,
        persistenceMode: 'backend' as FeaturePersistenceMode,
      };
      set(nextState);
      writeLocalSnapshot(nextState);
    } catch (_error) {
      const localTier = get().tier || DEFAULT_TIER;
      const localDefaults = buildDefaultFlags(localTier);
      const nextState = {
        flags: { ...localDefaults, ...get().flags },
        overrides: get().overrides,
        tier: localTier,
        loading: false,
        lastSynced: get().lastSynced,
        backendAvailable: false,
        persistenceMode: 'local' as FeaturePersistenceMode,
      };
      set(nextState);
      writeLocalSnapshot(nextState);
    }
  },

  toggleFeature: async (featureId, enabled, metadata = {}) => {
    const feature = FEATURE_REGISTRY_BY_ID[featureId];
    if (!feature) return false;
    if (feature.tier === 'core' && !enabled) return false;
    if (enabled && !isFeatureAvailableForTier(feature, get().tier)) return false;

    const state = get();
    if (enabled) {
      const unmetDependency = feature.dependencies.find((dependencyId) => !state.isEnabled(dependencyId));
      if (unmetDependency) return false;
    }

    const nextFlags = { ...state.flags, [featureId]: enabled };
    const nextOverrides = { ...state.overrides, [featureId]: enabled };
    const nextState = {
      flags: nextFlags,
      overrides: nextOverrides,
      tier: state.tier,
      loading: false,
      lastSynced: state.lastSynced,
      backendAvailable: state.backendAvailable,
      persistenceMode: state.persistenceMode,
    };
    set(nextState);
    writeLocalSnapshot(nextState);

    const result =
      state.persistenceMode === 'local'
        ? { ok: true, localFallback: true }
        : await persistFeatureOverride(featureId, enabled, metadata.changedBy).catch((error: unknown) => ({
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          }));
    if (!result?.ok) {
      set({
        flags: state.flags,
        overrides: state.overrides,
        tier: state.tier,
        loading: false,
        lastSynced: state.lastSynced,
        backendAvailable: state.backendAvailable,
        persistenceMode: state.persistenceMode,
      });
      writeLocalSnapshot(state);
      throw new Error(result?.message || 'Unable to persist feature toggle.');
    }

    if (result?.ok) {
      const syncedState = { ...get(), lastSynced: new Date() };
      set({ lastSynced: syncedState.lastSynced });
      writeLocalSnapshot(syncedState);
    }

    if (state.persistenceMode === 'local') {
      auditFeatureToggle(featureId, enabled, {
        tier: state.tier,
        backendPersisted: false,
        warning: !enabled ? get().getDependencyWarning(featureId) : null,
      });
    }
    return true;
  },

  setTier: (tier) => {
    const nextState = {
      flags: buildDefaultFlags(tier),
      overrides: {},
      tier,
      loading: false,
      lastSynced: get().lastSynced,
      backendAvailable: get().backendAvailable,
      persistenceMode: get().persistenceMode,
    };
    set(nextState);
    writeLocalSnapshot(nextState);
  },

  isEnabled: (featureId) => {
    const state = get();
    return resolveEffectiveFlag(featureId, state.flags, state.overrides, state.tier);
  },

  getEnabledFeatures: () => FEATURE_REGISTRY.filter((feature) => get().isEnabled(feature.id)),

  getDependencyWarning: (featureId) => {
    const state = get();
    const dependents = dependentEnabledFeatures(featureId, state.flags, state.overrides, state.tier);
    if (!dependents.length) return null;
    const labels = dependents.map((feature) => feature.label).slice(0, 4).join(', ');
    const suffix = dependents.length > 4 ? ` and ${dependents.length - 4} more` : '';
    return `Disabling this feature will also disable dependent features: ${labels}${suffix}.`;
  },

  syncFeatureFlag: (payload) => {
    const change = normalizeSyncPayload(payload);
    if (!change) return null;
    const state = get();
    const nextState = {
      flags: { ...state.flags, [change.featureId]: change.enabled },
      overrides: { ...state.overrides, [change.featureId]: change.enabled },
      tier: state.tier,
      loading: false,
      lastSynced: new Date(),
      backendAvailable: true,
      persistenceMode: 'backend' as FeaturePersistenceMode,
    };
    set(nextState);
    writeLocalSnapshot(nextState);
    return {
      featureId: change.featureId,
      enabled: change.enabled,
      changedBy: change.changedBy,
    };
  },
}));

export function subscribeToFeatureFlagSync(
  onExternalToggle?: (change: { featureId: string; enabled: boolean; changedBy?: string }) => void,
) {
  return subscribeToSettingsFeatureChanges((payload: unknown) => {
    const change = useFeatureStore.getState().syncFeatureFlag(payload);
    if (change && typeof onExternalToggle === 'function') {
      onExternalToggle(change);
    }
  });
}

export default useFeatureStore;
