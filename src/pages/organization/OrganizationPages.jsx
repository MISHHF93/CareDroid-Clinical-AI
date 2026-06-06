import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PROFILE_ROLES } from '../../data/profileToolSegmentation';
import './OrganizationPages.css';

export function OrganizationDashboard() {
  const { organization, platformContext, entitledPackIds, refreshPlatformContext } = useUserIdentity();
  const { branding, integrations, subscription, tenant } = useOrganizationContext();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!organization?.id) return;
    PlatformAssetsApi.getOrganizationAnalytics(organization.id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [organization?.id]);

  const packs = platformContext?.entitledPacks || [];

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>{organization?.name || 'Organization'}</h1>
        <p className="org-page-subtitle">
          {organization?.organizationType || 'Configure an organization to unlock pack-based workflows.'}
        </p>
        <div className="org-page-actions">
          <Link to="/settings/organization">
            <Button variant="secondary">Organization settings</Button>
          </Link>
          <Link to="/organization/settings">
            <Button variant="secondary">Tenant engine</Button>
          </Link>
          <Link to="/asset-packs">
            <Button variant="primary">Solution packs</Button>
          </Link>
          <Link to="/products">
            <Button variant="secondary">Product catalog</Button>
          </Link>
          <Link to="/outcomes">
            <Button variant="secondary">Outcomes</Button>
          </Link>
        </div>
      </header>

      <div className="org-grid">
        <Card className="org-card">
          <h2>Enabled packs</h2>
          <p>{entitledPackIds?.length || 0} active solution packs</p>
          <ul>
            {packs.map((pack) => (
              <li key={pack.id}>{pack.name}</li>
            ))}
          </ul>
        </Card>

        <Card className="org-card">
          <h2>Tenant</h2>
          <p>{tenant?.tenantId || organization?.slug || 'No tenant selected'}</p>
          <p className="org-pack-meta">
            {branding?.displayName || organization?.name || 'CareDroid'} · {tenant?.complianceMode || 'hipaa'}
          </p>
        </Card>

        <Card className="org-card">
          <h2>Subscription</h2>
          <p>{subscription?.tier || 'free'}</p>
          <p className="org-pack-meta">{subscription?.status || 'active'}</p>
        </Card>

        <Card className="org-card">
          <h2>Integrations</h2>
          <p>{integrations.filter((item) => item.status === 'enabled').length} enabled</p>
          <p className="org-pack-meta">
            {integrations.filter((item) => item.status === 'requested').length} requested
          </p>
        </Card>

        <Card className="org-card">
          <h2>Entitled assets</h2>
          <p>{platformContext?.entitledAssetIds?.length || 0} tools and surfaces available</p>
        </Card>

        <Card className="org-card">
          <h2>Default AI agent</h2>
          <p>{platformContext?.defaultAiAgentId || 'agent-clinical'}</p>
          <ul>
            {(platformContext?.aiAgents || []).map((agent) => (
              <li key={agent.id}>
                <Link to={`/assistant?agent=${agent.id}`}>{agent.title}</Link>
              </li>
            ))}
          </ul>
        </Card>

        {analytics && (
          <Card className="org-card">
            <h2>Usage snapshot</h2>
            <p>{analytics.auditEventCount} recent audit events</p>
            <p>{analytics.aiSessionCount} AI sessions</p>
          </Card>
        )}
      </div>

      <Button variant="ghost" onClick={() => refreshPlatformContext()}>
        Refresh platform context
      </Button>
    </div>
  );
}

export function OrganizationSettings() {
  const { organization, refreshPlatformContext } = useUserIdentity();
  const {
    branding,
    integrations,
    subscription,
    supportedOrganizationTypes,
    refreshOrganizationEngine,
    saveOrganizationSettings,
  } = useOrganizationContext();
  const [roleProfiles, setRoleProfiles] = useState([]);
  const [selectedRoleProfile, setSelectedRoleProfile] = useState('');
  const [form, setForm] = useState({
    name: '',
    organizationType: 'hospital',
    country: '',
    displayName: '',
    primaryColor: '',
    accentColor: '',
    subscriptionTier: 'free',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    PlatformAssetsApi.listPacks()
      .then(() => {})
      .catch(() => {});
    PlatformAssetsApi.getContext()
      .then((ctx) => {
        if (ctx.roleProfile?.id) setSelectedRoleProfile(ctx.roleProfile.id);
      })
      .catch(() => {});
    PlatformAssetsApi.listRoleProfiles()
      .then(setRoleProfiles)
      .catch(() => setRoleProfiles([]));
  }, []);

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '',
        organizationType: organization.organizationType || 'hospital',
        country: organization.country || '',
        displayName: branding?.displayName || organization.name || '',
        primaryColor: branding?.primaryColor || '',
        accentColor: branding?.accentColor || '',
        subscriptionTier: subscription?.tier || 'free',
      });
    }
  }, [branding, organization, subscription]);

  const createOrganization = async () => {
    setStatus('Creating…');
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await PlatformAssetsApi.createOrganization({
        name: form.name,
        slug: slug || `org-${Date.now()}`,
        organizationType: form.organizationType,
        country: form.country,
        branding: {
          displayName: form.displayName || form.name,
          primaryColor: form.primaryColor || undefined,
          accentColor: form.accentColor || undefined,
        },
        settings: {
          subscription: { tier: form.subscriptionTier, status: 'active' },
        },
      });
      await refreshPlatformContext();
      await refreshOrganizationEngine();
      setStatus('Organization created.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const saveOrganization = async () => {
    if (!organization?.id) return;
    setStatus('Saving…');
    try {
      const result = await saveOrganizationSettings({
        name: form.name,
        organizationType: form.organizationType,
        country: form.country,
        branding: {
          displayName: form.displayName || form.name,
          primaryColor: form.primaryColor || undefined,
          accentColor: form.accentColor || undefined,
        },
        subscription: { tier: form.subscriptionTier, status: 'active' },
      });
      if (!result.ok) throw new Error(result.message);
      await refreshPlatformContext();
      setStatus('Saved.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const saveRoleProfile = async () => {
    if (!selectedRoleProfile) return;
    try {
      await PlatformAssetsApi.setRoleProfile(selectedRoleProfile);
      await refreshPlatformContext();
      setStatus('Role profile updated.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Organization settings</h1>
        <Link to="/organization">← Organization home</Link>
      </header>

      {!organization ? (
        <Card className="org-card">
          <h2>Create organization</h2>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Type
            <select
              value={form.organizationType}
              onChange={(e) => setForm((f) => ({ ...f, organizationType: e.target.value }))}
            >
              {(supportedOrganizationTypes.length
                ? supportedOrganizationTypes
                : ['hospital', 'clinic', 'ems', 'university', 'research_center']
              ).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={createOrganization}>Create organization</Button>
        </Card>
      ) : (
        <Card className="org-card">
          <h2>{organization.name}</h2>
          <label>
            Display name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            Organization type
            <select
              value={form.organizationType}
              onChange={(e) => setForm((f) => ({ ...f, organizationType: e.target.value }))}
            >
              {(supportedOrganizationTypes.length
                ? supportedOrganizationTypes
                : ['hospital', 'clinic', 'ems', 'university', 'research_center']
              ).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Branded display name
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label>
            Primary color
            <input
              value={form.primaryColor}
              placeholder="#0f766e"
              onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
            />
          </label>
          <label>
            Accent color
            <input
              value={form.accentColor}
              placeholder="#2563eb"
              onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
            />
          </label>
          <label>
            Subscription tier
            <select
              value={form.subscriptionTier}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionTier: e.target.value }))}
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
              <option value="enterprise">Enterprise</option>
              <option value="academic">Academic</option>
              <option value="government">Government</option>
            </select>
          </label>
          <Button onClick={saveOrganization}>Save organization</Button>
        </Card>
      )}

      <Card className="org-card">
        <h2>Integrations</h2>
        <p className="org-pack-meta">Organization-aware integration state from the tenant engine.</p>
        <div className="org-integration-list">
          {integrations.slice(0, 8).map((integration) => (
            <div key={integration.slug} className="org-integration-row">
              <span>
                <strong>{integration.name}</strong>
                <small>{integration.category}</small>
              </span>
              <span className={`org-status-pill org-status-pill--${integration.status}`}>
                {integration.status}
              </span>
            </div>
          ))}
          {!integrations.length && <p>No integration offerings loaded yet.</p>}
        </div>
      </Card>

      <Card className="org-card">
        <h2>Role profile</h2>
        <select value={selectedRoleProfile} onChange={(e) => setSelectedRoleProfile(e.target.value)}>
          <option value="">Select role profile</option>
          {roleProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
          {PROFILE_ROLES.map((role) => (
            <option key={role} value={`${role.replace(/\s+/g, '-')}`}>
              {role} (legacy label)
            </option>
          ))}
        </select>
        <Button onClick={saveRoleProfile}>Save role profile</Button>
      </Card>

      {status && <p className="org-status">{status}</p>}
    </div>
  );
}

export function PackMarketplace() {
  const { organization, platformContext, refreshPlatformContext } = useUserIdentity();
  const [packs, setPacks] = useState([]);
  const [packProductMap, setPackProductMap] = useState({});
  const [status, setStatus] = useState('');
  const [expandedPackId, setExpandedPackId] = useState('');

  const load = useCallback(async () => {
    const rows = await PlatformAssetsApi.listMarketplacePacks({
      organizationId: organization?.id,
      organizationType: organization?.organizationType,
    });
    setPacks(rows);
    try {
      const map = await ProductCatalogApi.getPackProductMap();
      setPackProductMap(map || {});
    } catch {
      setPackProductMap({});
    }
  }, [organization?.organizationType]);

  useEffect(() => {
    load().catch(() => setPacks([]));
  }, [load]);

  const togglePack = async (packId, enabled) => {
    if (!organization?.id) {
      setStatus('Create an organization first.');
      return;
    }
    setStatus(enabled ? 'Disabling…' : 'Enabling…');
    try {
      if (enabled) {
        await PlatformAssetsApi.removePack(organization.id, packId);
      } else {
        await PlatformAssetsApi.installPack(organization.id, packId);
      }
      await refreshPlatformContext();
      await load();
      setStatus('Pack updated.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Asset Pack Marketplace</h1>
        <p className="org-page-subtitle">
          Enable clinical, operations, training, governance, and research packs for the active
          organization. Each pack maps assets, dependencies, modules, and target roles.
        </p>
        <div className="org-page-actions">
          <Link to="/settings/organization">← Organization settings</Link>
          <Link to="/products">Product catalog</Link>
        </div>
      </header>
      {!organization?.id && (
        <Card className="org-card">
          <h2>Create an organization first</h2>
          <p>Pack enablement is organization-scoped so entitlement state can be audited.</p>
        </Card>
      )}
      <div className="org-pack-grid">
        {packs.map((pack) => {
          const installed =
            Boolean(pack.enabled) || Boolean(platformContext?.entitledPackIds?.includes(pack.id));
          const expanded = expandedPackId === pack.id;
          return (
            <Card key={pack.id} className="org-card org-pack-card">
              <div className="org-pack-card-header">
                <div>
                  <h2>{pack.name}</h2>
                  <p className="org-pack-meta">
                    {pack.includedAssetCount || pack.assetIds?.length || 0} assets · {pack.pricingTier} tier
                  </p>
                </div>
                <span className={`org-status-pill org-status-pill--${installed ? 'enabled' : 'available'}`}>
                  {installed ? 'enabled' : 'disabled'}
                </span>
              </div>
              <p>{pack.description}</p>
              <div className="org-pack-section">
                <strong>Dependencies</strong>
                {pack.dependencies?.length ? (
                  <div className="org-chip-list">
                    {pack.dependencies.map((dependency) => (
                      <span
                        key={dependency.id}
                        className={`org-chip ${dependency.enabled ? 'org-chip--enabled' : 'org-chip--missing'}`}
                      >
                        {dependency.name} {dependency.enabled ? 'enabled' : 'missing'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="org-pack-meta">No pack dependencies.</p>
                )}
              </div>
              <div className="org-pack-section">
                <strong>Role mapping</strong>
                <div className="org-chip-list">
                  {(pack.roleMapping?.length
                    ? pack.roleMapping.map((role) => role.label)
                    : pack.targetRoles || []
                  )
                    .slice(0, 6)
                    .map((role) => (
                      <span key={role} className="org-chip">
                        {role}
                      </span>
                    ))}
                  {!pack.roleMapping?.length && !pack.targetRoles?.length && (
                    <span className="org-pack-meta">General availability</span>
                  )}
                </div>
              </div>
              <div className="org-pack-section">
                <strong>Included assets</strong>
                <ul className="org-asset-list">
                  {(pack.includedAssets || []).slice(0, expanded ? 99 : 5).map((asset) => (
                    <li key={asset.id}>
                      <span>{asset.title || asset.id}</span>
                      <small>{asset.type || asset.category || 'asset'} {asset.route ? `· ${asset.route}` : ''}</small>
                    </li>
                  ))}
                </ul>
                {(pack.includedAssets || []).length > 5 && (
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedPackId(expanded ? '' : pack.id)}
                  >
                    {expanded ? 'Show fewer assets' : `Show all ${pack.includedAssets.length} assets`}
                  </Button>
                )}
              </div>
              {!!pack.defaultModules?.length && (
                <p className="org-pack-meta">
                  <strong>Modules:</strong> {pack.defaultModules.join(', ')}
                </p>
              )}
              {!!pack.organizationTypes?.length && (
                <p className="org-pack-meta">
                  <strong>Organization types:</strong> {pack.organizationTypes.join(', ')}
                </p>
              )}
              {(packProductMap[pack.id] || []).length > 0 && (
                <p className="org-pack-meta">
                  Part of{' '}
                  {(packProductMap[pack.id] || []).map((product, idx) => (
                    <span key={product.slug}>
                      {idx > 0 ? ', ' : ''}
                      <Link to={`/products/${product.slug}`}>{product.name}</Link>
                    </span>
                  ))}
                </p>
              )}
              {!!pack.warnings?.length && (
                <div className="org-warning-list">
                  {pack.warnings.map((warning) => (
                    <p key={`${pack.id}-${warning.type}`} className="org-pack-warning">
                      {warning.message}
                    </p>
                  ))}
                </div>
              )}
              <Button disabled={!organization?.id} onClick={() => togglePack(pack.id, installed)}>
                {installed ? 'Disable pack' : 'Enable pack'}
              </Button>
            </Card>
          );
        })}
      </div>
      {status && <p className="org-status">{status}</p>}
    </div>
  );
}

export function PlatformAnalyticsPage() {
  const { organization, platformContext } = useUserIdentity();
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!organization?.id) return;
    PlatformAssetsApi.getOrganizationAnalytics(organization.id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [organization?.id]);

  const packs = platformContext?.availablePacks || [];
  const dashboards = analytics?.dashboards || {};
  const dimensions = analytics?.dimensions || {};

  const metricCards = [
    ['Enabled packs', dashboards.adoption?.enabledPackCount ?? analytics?.enabledPackCount ?? 0],
    ['Enabled assets', dashboards.adoption?.enabledAssetCount ?? 0],
    ['Adoption score', `${dashboards.adoption?.adoptionScore ?? 0}%`],
    ['Usage events', dashboards.engagement?.totalUsageEvents ?? 0],
    ['AI usage', dashboards.engagement?.aiUsageCount ?? analytics?.aiSessionCount ?? 0],
    ['Search queries', dashboards.engagement?.searchQueryCount ?? 0],
    ['Simulation completions', dashboards.engagement?.simulationCompletionCount ?? 0],
    ['Dashboard engagement', dashboards.engagement?.dashboardEngagementCount ?? 0],
  ];

  const renderMetricList = (title, rows = [], emptyText = 'No usage recorded yet.') => (
    <Card className="org-card org-analytics-panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="org-analytics-list">
          {rows.slice(0, 8).map((row) => (
            <li key={row.id || row.packId || row.resource || row.label}>
              <span>
                <strong>{row.label || row.packName || row.resource || row.id || row.packId}</strong>
                {row.metadata?.assetType && <small>{row.metadata.assetType}</small>}
                {row.metadata?.status && <small>{row.metadata.status}</small>}
              </span>
              <b>{row.count ?? row.events ?? row.status ?? 'enabled'}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="org-pack-meta">{emptyText}</p>
      )}
    </Card>
  );

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Platform analytics</h1>
        <p className="org-page-subtitle">
          Adoption, engagement, underused assets, and top assets across the active organization.
        </p>
      </header>
      {analytics ? (
        <>
          <div className="org-grid org-analytics-metrics">
            {metricCards.map(([label, value]) => (
              <Card key={label} className="org-card org-analytics-metric">
                <h2>{label}</h2>
                <p>{value}</p>
              </Card>
            ))}
          </div>

          <div className="org-analytics-section">
            <h2>Adoption</h2>
            <div className="org-grid">
              {renderMetricList('Pack usage', dimensions.packUsage || analytics.packAdoption || [])}
              {renderMetricList('Role usage', dimensions.roleUsage || [])}
              {renderMetricList('Workspace usage', dimensions.workspaceUsage || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Engagement</h2>
            <div className="org-grid">
              {renderMetricList('Asset usage', dimensions.assetUsage || [])}
              {renderMetricList('AI usage', dimensions.aiUsage || [])}
              {renderMetricList('Search queries', dimensions.searchQueries || [])}
              {renderMetricList('Simulation completion', dimensions.simulationCompletion || [])}
              {renderMetricList('Dashboard engagement', dimensions.dashboardEngagement || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Underused assets</h2>
            <div className="org-grid">
              {renderMetricList('Lowest engagement', dashboards.underusedAssets || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Top assets</h2>
            <div className="org-grid">
              {renderMetricList('Most used assets', dashboards.topAssets || analytics.topTools || [])}
            </div>
          </div>
        </>
      ) : (
        <Card className="org-card">
          <p>Link an organization to view analytics.</p>
        </Card>
      )}
      <Card className="org-card">
        <h2>Pack catalog ({packs.length})</h2>
        <ul>
          {packs.map((pack) => (
            <li key={pack.id}>
              {pack.name} — {pack.assetIds?.length || 0} assets
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function AssetLifecycleAdmin() {
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    PlatformAssetsApi.listAssets()
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setLifecycle = async (assetId, lifecycle) => {
    setStatus('Updating…');
    try {
      await PlatformAssetsApi.updateAssetLifecycle(assetId, lifecycle);
      load();
      setStatus(`Asset ${assetId} → ${lifecycle}`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Asset lifecycle</h1>
        <Link to="/settings/organization">← Settings</Link>
      </header>
      <table className="org-lifecycle-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Lifecycle</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.title}</td>
              <td>{asset.assetType}</td>
              <td>{asset.lifecycle}</td>
              <td>
                <Button variant="ghost" onClick={() => setLifecycle(asset.id, 'active')}>
                  Active
                </Button>
                <Button variant="ghost" onClick={() => setLifecycle(asset.id, 'deprecated')}>
                  Deprecate
                </Button>
                <Button variant="ghost" onClick={() => setLifecycle(asset.id, 'admin_only')}>
                  Admin only
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {status && <p className="org-status">{status}</p>}
    </div>
  );
}

export function DepartmentsPage() {
  const { organization } = useUserIdentity();
  const [graph, setGraph] = useState(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('emergency');
  const [error, setError] = useState('');

  useEffect(() => {
    PlatformAssetsApi.listDepartments({ organizationId: organization?.id })
      .then((data) => {
        setGraph(data);
        if (!data.departments?.some((department) => department.id === selectedDepartmentId)) {
          setSelectedDepartmentId(data.departments?.[0]?.id || 'emergency');
        }
      })
      .catch((e) => setError(e.message));
  }, [organization?.id, selectedDepartmentId]);

  const departments = graph?.departments || [];
  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) || departments[0];

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Departments</h1>
        <p className="org-page-subtitle">
          Department-to-asset mapping across packs, assets, roles, permissions, and users.
        </p>
      </header>

      {error && <p className="org-status">{error}</p>}

      <div className="org-department-grid">
        {departments.map((department) => (
          <button
            key={department.id}
            type="button"
            className={`org-department-card ${department.id === selectedDepartment?.id ? 'selected' : ''}`}
            onClick={() => setSelectedDepartmentId(department.id)}
          >
            <strong>{department.name}</strong>
            <span>{department.packCount} packs</span>
            <span>{department.assetCount} assets</span>
            <span>{department.userCount} users</span>
          </button>
        ))}
      </div>

      {selectedDepartment && (
        <div className="org-department-detail">
          <Card className="org-card">
            <h2>{selectedDepartment.name}</h2>
            <p className="org-pack-meta">
              {selectedDepartment.packCount} packs · {selectedDepartment.assetCount} assets ·{' '}
              {selectedDepartment.userCount} users
            </p>
          </Card>

          <Card className="org-card">
            <h2>Asset packs</h2>
            {selectedDepartment.packs?.length ? (
              <ul className="org-asset-list">
                {selectedDepartment.packs.map((pack) => (
                  <li key={pack.id}>
                    <span>{pack.name}</span>
                    <small>
                      {pack.assetIds?.length || 0} department assets
                      {pack.enabled ? ' · enabled' : ''}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No packs mapped yet.</p>
            )}
          </Card>

          <Card className="org-card">
            <h2>Assets</h2>
            {selectedDepartment.assets?.length ? (
              <ul className="org-asset-list">
                {selectedDepartment.assets.map((asset) => (
                  <li key={asset.id}>
                    <span>
                      {asset.route ? <Link to={asset.route}>{asset.title || asset.id}</Link> : asset.title || asset.id}
                    </span>
                    <small>
                      {asset.assetType} · primary: {asset.primaryDepartment}
                      {asset.secondaryDepartments?.length
                        ? ` · secondary: ${asset.secondaryDepartments.join(', ')}`
                        : ''}
                    </small>
                    <small>Roles: {(asset.recommendedRoles || []).join(', ') || 'none'}</small>
                    <small>Permissions: {(asset.requiredPermissions || []).join(', ') || 'none'}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No assets mapped yet.</p>
            )}
          </Card>

          <Card className="org-card">
            <h2>Users</h2>
            {selectedDepartment.users?.length ? (
              <ul className="org-asset-list">
                {selectedDepartment.users.map((user) => (
                  <li key={user.userId}>
                    <span>{user.displayName}</span>
                    <small>
                      {user.role}
                      {user.roleProfileId ? ` · ${user.roleProfileId}` : ''}
                      {user.specialty ? ` · ${user.specialty}` : ''}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No users matched for this department.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export function ServiceLinesPage() {
  const { organization } = useUserIdentity();
  const [graph, setGraph] = useState(null);
  const [selectedServiceLineId, setSelectedServiceLineId] = useState('emergency-medicine');
  const [error, setError] = useState('');

  useEffect(() => {
    PlatformAssetsApi.listServiceLines({ organizationId: organization?.id })
      .then((data) => {
        setGraph(data);
        if (!data.serviceLines?.some((serviceLine) => serviceLine.id === selectedServiceLineId)) {
          setSelectedServiceLineId(data.serviceLines?.[0]?.id || 'emergency-medicine');
        }
      })
      .catch((e) => setError(e.message));
  }, [organization?.id, selectedServiceLineId]);

  const serviceLines = graph?.serviceLines || [];
  const selectedServiceLine =
    serviceLines.find((serviceLine) => serviceLine.id === selectedServiceLineId) || serviceLines[0];

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Service Lines</h1>
        <p className="org-page-subtitle">
          Service Line to Department to Asset Pack to Asset architecture for clinical and operational rollouts.
        </p>
      </header>

      {error && <p className="org-status">{error}</p>}

      <div className="org-department-grid">
        {serviceLines.map((serviceLine) => (
          <button
            key={serviceLine.id}
            type="button"
            className={`org-department-card ${serviceLine.id === selectedServiceLine?.id ? 'selected' : ''}`}
            onClick={() => setSelectedServiceLineId(serviceLine.id)}
          >
            <strong>{serviceLine.name}</strong>
            <span>{serviceLine.departmentCount} departments</span>
            <span>{serviceLine.packCount} packs</span>
            <span>{serviceLine.assetCount} assets</span>
          </button>
        ))}
      </div>

      {selectedServiceLine && (
        <div className="org-department-detail">
          <Card className="org-card">
            <h2>{selectedServiceLine.name}</h2>
            <p className="org-pack-meta">
              {selectedServiceLine.departmentCount} departments · {selectedServiceLine.packCount} packs ·{' '}
              {selectedServiceLine.assetCount} assets
            </p>
          </Card>

          <Card className="org-card">
            <h2>Departments</h2>
            {selectedServiceLine.departments?.length ? (
              <ul className="org-asset-list">
                {selectedServiceLine.departments.map((department) => (
                  <li key={department.id}>
                    <span>{department.name}</span>
                    <small>
                      {department.packCount} packs · {department.assetCount} assets
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No departments mapped yet.</p>
            )}
          </Card>

          <Card className="org-card">
            <h2>Asset packs</h2>
            {selectedServiceLine.packs?.length ? (
              <ul className="org-asset-list">
                {selectedServiceLine.packs.map((pack) => (
                  <li key={pack.id}>
                    <span>{pack.name}</span>
                    <small>
                      {pack.assetIds?.length || 0} service-line assets
                      {pack.enabled ? ' · enabled' : ''}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No packs mapped yet.</p>
            )}
          </Card>

          <Card className="org-card">
            <h2>Assets</h2>
            {selectedServiceLine.assets?.length ? (
              <ul className="org-asset-list">
                {selectedServiceLine.assets.map((asset) => (
                  <li key={asset.id}>
                    <span>
                      {asset.route ? <Link to={asset.route}>{asset.title || asset.id}</Link> : asset.title || asset.id}
                    </span>
                    <small>
                      {asset.assetType} · departments: {(asset.departmentIds || []).join(', ') || asset.primaryDepartment}
                    </small>
                    <small>Packs: {(asset.packIds || []).join(', ') || 'none'}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="org-pack-meta">No assets mapped yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
