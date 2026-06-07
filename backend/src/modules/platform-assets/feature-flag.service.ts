import { Injectable } from '@nestjs/common';
import {
  FeatureFlagDefinition,
  FeatureFlagState,
  FEATURE_FLAG_REGISTRY,
  getFeatureFlagForAsset,
  normalizeFeatureFlagState,
} from '../../config/featureFlags.config';

export type FeatureFlagScope = 'tenant' | 'workspace' | 'role' | 'beta' | 'internal';

export interface FeatureFlagResolutionContext {
  workspaceId?: string | null;
  userRole?: string | null;
  includeInternal?: boolean;
}

export interface FeatureFlagUpdateInput {
  scope: FeatureFlagScope;
  flagId: string;
  state?: FeatureFlagState | string | null;
  workspaceId?: string | null;
  role?: string | null;
  reset?: boolean;
  updatedBy?: string | null;
}

type FeatureFlagSettings = {
  tenantFlags: Record<string, FeatureFlagState>;
  workspaceFlags: Record<string, Record<string, FeatureFlagState>>;
  roleFlags: Record<string, Record<string, FeatureFlagState>>;
  betaFlags: Record<string, FeatureFlagState>;
  internalFlags: Record<string, FeatureFlagState>;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

@Injectable()
export class FeatureFlagService {
  getRegistry(): FeatureFlagDefinition[] {
    return FEATURE_FLAG_REGISTRY;
  }

  getFeatureFlagForAsset(assetId: string): FeatureFlagDefinition | undefined {
    return getFeatureFlagForAsset(assetId);
  }

  resolveState(
    featureFlagId: string | undefined,
    organizationSettings?: Record<string, any> | null,
    context: FeatureFlagResolutionContext = {},
  ): FeatureFlagState {
    if (!featureFlagId) return FeatureFlagState.ENABLED;

    const flag = FEATURE_FLAG_REGISTRY.find((item) => item.id === featureFlagId);
    const settings = this.normalizeSettings(organizationSettings);
    const legacyOverrides = {
      ...this.recordOfStates(organizationSettings?.featureFlagOverrides),
      ...this.recordOfStates(organizationSettings?.rolloutFlags),
    };

    const workspaceKey = this.scopeKey(context.workspaceId);
    const roleKey = this.scopeKey(context.userRole);
    const scopedState =
      (context.includeInternal ? settings.internalFlags[featureFlagId] : undefined) ||
      (roleKey ? settings.roleFlags[roleKey]?.[featureFlagId] : undefined) ||
      (workspaceKey ? settings.workspaceFlags[workspaceKey]?.[featureFlagId] : undefined) ||
      settings.betaFlags[featureFlagId] ||
      settings.tenantFlags[featureFlagId] ||
      legacyOverrides[featureFlagId] ||
      flag?.defaultState;

    return normalizeFeatureFlagState(scopedState);
  }

  resolveAssetState(
    assetId: string,
    organizationSettings?: Record<string, any> | null,
    context: FeatureFlagResolutionContext = {},
  ): FeatureFlagState {
    const flag = this.getFeatureFlagForAsset(assetId);
    return this.resolveState(flag?.id, organizationSettings, context);
  }

  isLaunchableState(state: FeatureFlagState): boolean {
    return [
      FeatureFlagState.ENABLED,
      FeatureFlagState.BETA,
      FeatureFlagState.EXPERIMENTAL,
    ].includes(state);
  }

  buildManagementModel(params: {
    organizationId: string;
    organizationName?: string | null;
    settings?: Record<string, any> | null;
    workspaceDefaults?: Array<Record<string, any>>;
    roleProfiles?: Array<Record<string, any>>;
  }) {
    const settings = this.normalizeSettings(params.settings);
    const workspaces = (params.workspaceDefaults || []).map((workspace) => ({
      id: String(workspace.id || workspace.type || workspace.name),
      name: String(workspace.name || workspace.displayName || workspace.id || workspace.type),
      type: workspace.type || workspace.id || null,
    }));
    const roles = [
      ...new Set([
        'owner',
        'admin',
        'member',
        'viewer',
        ...(params.roleProfiles || []).map((profile) => String(profile.id || profile.label)),
      ]),
    ];

    const resolvedFlags = FEATURE_FLAG_REGISTRY.map((flag) => ({
      ...flag,
      state: this.resolveState(flag.id, params.settings),
      scopes: {
        tenant: settings.tenantFlags[flag.id] || null,
        beta: settings.betaFlags[flag.id] || null,
        internal: settings.internalFlags[flag.id] || null,
        workspaces: Object.fromEntries(
          Object.entries(settings.workspaceFlags)
            .map(([workspaceId, flags]) => [workspaceId, flags[flag.id] || null])
            .filter(([, state]) => Boolean(state)),
        ),
        roles: Object.fromEntries(
          Object.entries(settings.roleFlags)
            .map(([role, flags]) => [role, flags[flag.id] || null])
            .filter(([, state]) => Boolean(state)),
        ),
      },
    }));

    return {
      organizationId: params.organizationId,
      organizationName: params.organizationName || null,
      registry: FEATURE_FLAG_REGISTRY,
      flags: resolvedFlags,
      settings,
      supportedScopes: ['tenant', 'workspace', 'role', 'beta', 'internal'],
      workspaces,
      roles,
      updatedAt: settings.updatedAt || null,
      updatedBy: settings.updatedBy || null,
    };
  }

  applyUpdate(
    currentSettings: Record<string, any> | null | undefined,
    input: FeatureFlagUpdateInput,
  ): FeatureFlagSettings {
    const settings = this.normalizeSettings(currentSettings);
    const flagExists = FEATURE_FLAG_REGISTRY.some((flag) => flag.id === input.flagId);
    if (!flagExists) {
      throw new Error(`Unknown feature flag: ${input.flagId}`);
    }

    const state = normalizeFeatureFlagState(input.state || undefined);
    const shouldDelete = Boolean(input.reset);
    if (input.scope === 'tenant') {
      this.setOrDelete(settings.tenantFlags, input.flagId, state, shouldDelete);
    } else if (input.scope === 'beta') {
      this.setOrDelete(settings.betaFlags, input.flagId, state, shouldDelete);
    } else if (input.scope === 'internal') {
      this.setOrDelete(settings.internalFlags, input.flagId, state, shouldDelete);
    } else if (input.scope === 'workspace') {
      const key = this.requireScopeKey(input.workspaceId, 'workspaceId');
      settings.workspaceFlags[key] = settings.workspaceFlags[key] || {};
      this.setOrDelete(settings.workspaceFlags[key], input.flagId, state, shouldDelete);
      if (!Object.keys(settings.workspaceFlags[key]).length) delete settings.workspaceFlags[key];
    } else if (input.scope === 'role') {
      const key = this.requireScopeKey(input.role, 'role');
      settings.roleFlags[key] = settings.roleFlags[key] || {};
      this.setOrDelete(settings.roleFlags[key], input.flagId, state, shouldDelete);
      if (!Object.keys(settings.roleFlags[key]).length) delete settings.roleFlags[key];
    }

    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = input.updatedBy || null;
    return settings;
  }

  normalizeSettings(input?: Record<string, any> | null): FeatureFlagSettings {
    const raw =
      input?.featureFlagPlatform && typeof input.featureFlagPlatform === 'object'
        ? input.featureFlagPlatform
        : input?.featureFlags && this.hasStructuredFlagScopes(input.featureFlags)
          ? input.featureFlags
          : {};
    const legacyTenant = {
      ...this.recordOfStates(input?.featureFlagOverrides),
      ...(!this.hasStructuredFlagScopes(input?.featureFlags)
        ? this.recordOfStates(input?.featureFlags)
        : {}),
      ...this.recordOfStates(input?.rolloutFlags),
    };

    return {
      tenantFlags: { ...legacyTenant, ...this.recordOfStates(raw.tenantFlags) },
      workspaceFlags: this.nestedRecordOfStates(raw.workspaceFlags),
      roleFlags: this.nestedRecordOfStates(raw.roleFlags),
      betaFlags: this.recordOfStates(raw.betaFlags),
      internalFlags: this.recordOfStates(raw.internalFlags),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
    };
  }

  private hasStructuredFlagScopes(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return ['tenantFlags', 'workspaceFlags', 'roleFlags', 'betaFlags', 'internalFlags'].some(
      (key) => key in (value as Record<string, unknown>),
    );
  }

  private recordOfStates(value: unknown): Record<string, FeatureFlagState> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, state]) => [key, normalizeFeatureFlagState(String(state))])
        .filter(([key]) => Boolean(key)),
    );
  }

  private nestedRecordOfStates(value: unknown): Record<string, Record<string, FeatureFlagState>> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([scopeKey, flags]) => [this.scopeKey(scopeKey), this.recordOfStates(flags)])
        .filter(([scopeKey, flags]) => Boolean(scopeKey) && Boolean(Object.keys(flags).length)),
    );
  }

  private setOrDelete(
    target: Record<string, FeatureFlagState>,
    flagId: string,
    state: FeatureFlagState,
    shouldDelete: boolean,
  ) {
    if (shouldDelete) {
      delete target[flagId];
    } else {
      target[flagId] = state;
    }
  }

  private requireScopeKey(value: string | null | undefined, label: string) {
    const key = this.scopeKey(value);
    if (!key) throw new Error(`${label} is required for scoped feature flags.`);
    return key;
  }

  private scopeKey(value: string | null | undefined) {
    return typeof value === 'string' && value.trim().length ? value.trim() : null;
  }
}
