import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_STATE_LABELS,
  FEATURE_FLAG_STATES,
  summarizeFeatureFlags,
} from '../config/featureFlags.config';
import { useTenantContext } from '../contexts/TenantContext';
import { Permission, useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { PlatformAssetsApi } from '../services/platformAssetsApi';
import './FeatureFlagCenter.css';

const FLAG_SCOPES = Object.freeze([
  { id: 'tenant', label: 'Tenant flags', description: 'Customer-wide rollout controls.' },
  { id: 'workspace', label: 'Workspace flags', description: 'Department or workspace rollout.' },
  { id: 'role', label: 'Role flags', description: 'Role-aware controls.' },
  { id: 'beta', label: 'Beta flags', description: 'Preview and beta program access.' },
  { id: 'internal', label: 'Internal flags', description: 'CareDroid-only operational flags.' },
]);

function groupFlags(flags) {
  const byCategory = new Map();
  flags.forEach((flag) => {
    const category = flag.category || 'Other';
    byCategory.set(category, [...(byCategory.get(category) || []), flag]);
  });
  return Array.from(byCategory.entries()).map(([category, groupedFlags]) => ({
    category,
    flags: groupedFlags,
  }));
}

function scopeState(flag, scope, scopeTarget) {
  if (!flag?.scopes) return null;
  if (scope === 'tenant') return flag.scopes.tenant;
  if (scope === 'beta') return flag.scopes.beta;
  if (scope === 'internal') return flag.scopes.internal;
  if (scope === 'workspace') return flag.scopes.workspaces?.[scopeTarget] || null;
  if (scope === 'role') return flag.scopes.roles?.[scopeTarget] || null;
  return null;
}

export default function FeatureFlagCenter() {
  const { hasPermission } = useUser();
  const { tenantContext } = useTenantContext();
  const { platformContext, refreshPlatformContext = async () => null } = useUserIdentity();
  const organizationId = tenantContext?.organizationId || platformContext?.organization?.id;
  const [model, setModel] = useState(null);
  const [scope, setScope] = useState('tenant');
  const [workspaceId, setWorkspaceId] = useState('');
  const [role, setRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canConfigure = hasPermission(Permission.CONFIGURE_SYSTEM);
  const flags = model?.flags?.length ? model.flags : FEATURE_FLAG_REGISTRY;
  const stateMap = useMemo(
    () => Object.fromEntries(flags.map((flag) => [flag.id, flag.state || flag.defaultState])),
    [flags]
  );
  const groupedFlags = useMemo(() => groupFlags(flags), [flags]);
  const summary = useMemo(() => summarizeFeatureFlags(stateMap), [stateMap]);
  const workspaces = model?.workspaces || [];
  const roles = model?.roles || [];
  const selectedWorkspaceId = workspaceId || workspaces[0]?.id || '';
  const selectedRole = role || roles[0] || '';

  const loadFlags = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);
    try {
      const data = await PlatformAssetsApi.getFeatureFlags(organizationId);
      setModel(data);
      setWorkspaceId((current) => current || data.workspaces?.[0]?.id || '');
      setRole((current) => current || data.roles?.[0] || '');
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Feature flags are unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const updateFlagState = async (flagId, state, reset = false) => {
    if (!organizationId || !canConfigure) return;
    const payload = {
      scope,
      flagId,
      state,
      reset,
      workspaceId: scope === 'workspace' ? selectedWorkspaceId : undefined,
      role: scope === 'role' ? selectedRole : undefined,
    };
    setMessage('');
    setError('');
    try {
      const data = await PlatformAssetsApi.updateFeatureFlag(organizationId, payload);
      setModel(data);
      await refreshPlatformContext();
      setMessage(reset ? 'Flag override reset.' : 'Feature flag updated.');
    } catch (saveError) {
      setError(saveError?.message || 'Feature flag update failed.');
    }
  };

  return (
    <div className="feature-flag-center">
      <header className="feature-flag-hero">
        <div>
          <p className="feature-flag-eyebrow">Governance rollout control</p>
          <h1>Feature Flag Center</h1>
          <p>
            Manage tenant, workspace, role, beta, and internal rollout flags without deployments.
            Entitlements and subscription checks still apply after a capability is exposed.
          </p>
        </div>
        <div className="feature-flag-tenant">
          <span>Organization</span>
          <strong>{model?.organizationName || tenantContext?.organizationName || 'Tenant required'}</strong>
        </div>
      </header>

      {(error || message || isLoading || !canConfigure) && (
        <section className="feature-flag-status" aria-live="polite">
          {isLoading && <p>Loading feature flags...</p>}
          {error && <p role="alert">{error}</p>}
          {message && <p>{message}</p>}
          {!canConfigure && <p>Read-only view. Configure System permission is required to update flags.</p>}
        </section>
      )}

      <section className="feature-flag-scope-panel" aria-label="Feature flag scopes">
        <div>
          <h2>Rollout Scope</h2>
          <p>Choose where the next flag update applies.</p>
        </div>
        <div className="feature-flag-scope-buttons">
          {FLAG_SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={scope === item.id ? 'active' : ''}
              onClick={() => setScope(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
        {scope === 'workspace' && (
          <label>
            Workspace
            <select value={selectedWorkspaceId} onChange={(event) => setWorkspaceId(event.target.value)}>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {scope === 'role' && (
          <label>
            Role
            <select value={selectedRole} onChange={(event) => setRole(event.target.value)}>
              {roles.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="feature-flag-summary" aria-label="Feature flag summary">
        <div>
          <span>Total flags</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Live rollout</span>
          <strong>{summary.liveRolloutCount}</strong>
        </div>
        <div>
          <span>Unavailable</span>
          <strong>{summary.unavailableCount}</strong>
        </div>
        {Object.entries(FEATURE_FLAG_STATE_LABELS).map(([state, label]) => (
          <div key={state}>
            <span>{label}</span>
            <strong>{summary.stateCounts[state]}</strong>
          </div>
        ))}
      </section>

      <section className="feature-flag-grid" aria-label="Feature flag categories">
        {groupedFlags.map(({ category, flags }) => (
          <article key={category} className="feature-flag-category">
            <header>
              <h2>{category}</h2>
              <span>{flags.length} flags</span>
            </header>

            <div className="feature-flag-list">
              {flags.map((flag) => (
                <div key={flag.id} className={`feature-flag-card feature-flag-card--${flag.state}`}>
                  <div className="feature-flag-card__main">
                    <div>
                      <h3>{flag.name}</h3>
                      <p>{flag.description}</p>
                    </div>
                    <span className={`feature-flag-state feature-flag-state--${flag.state}`}>
                      {FEATURE_FLAG_STATE_LABELS[flag.state]}
                    </span>
                  </div>
                  <dl className="feature-flag-meta">
                    <div>
                      <dt>Owner</dt>
                      <dd>{flag.owner}</dd>
                    </div>
                    <div>
                      <dt>Route</dt>
                      <dd>{flag.route}</dd>
                    </div>
                  </dl>
                  <p className="feature-flag-notes">{flag.rolloutNotes}</p>
                  <dl className="feature-flag-meta">
                    <div>
                      <dt>Current scope</dt>
                      <dd>
                        {scopeState(
                          flag,
                          scope,
                          scope === 'workspace' ? selectedWorkspaceId : selectedRole
                        ) || 'Default'}
                      </dd>
                    </div>
                    <div>
                      <dt>Assets</dt>
                      <dd>{flag.assetIds?.length || 0}</dd>
                    </div>
                  </dl>
                  <div className="feature-flag-actions" aria-label={`${flag.name} rollout controls`}>
                    {Object.values(FEATURE_FLAG_STATES).map((state) => (
                      <button
                        key={state}
                        type="button"
                        className={flag.state === state ? 'active' : ''}
                        onClick={() => updateFlagState(flag.id, state)}
                        aria-pressed={flag.state === state}
                        disabled={!canConfigure || !organizationId}
                      >
                        {FEATURE_FLAG_STATE_LABELS[state]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateFlagState(flag.id, flag.defaultState, true)}
                      disabled={!canConfigure || !organizationId}
                    >
                      Reset scope
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
