import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import {
  ActionRow,
  DashboardGrid,
  CareDroidPage,
} from '../../components/ui/CareDroidPrimitives';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import {
  buildWorkspaceSetupFromRegistry,
  getCanonicalWorkspaceRegistry,
  saveLocalClientProfile,
} from '../../config/workspace.config';
import { buildOrganizationIntelligenceProfile } from '../../data/organizationIntelligenceProfile';
import {
  buildUserProfileAccessSummary,
  listUserProfileCatalogOptions,
} from '../../config/userProfileCatalog';
import {
  buildRoleIntelligenceProfile,
  getRoleIntelligencePackRecommendations,
} from '../../data/roleIntelligenceLayer';
import './OrganizationPages.css';

const splitList = (value) =>
  String(value || '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const prettyJson = (value, fallback) => JSON.stringify(value ?? fallback, null, 2);

const ASSET_LIFECYCLE_STATES = Object.freeze([
  { value: 'draft', label: 'Draft' },
  { value: 'beta', label: 'Beta' },
  { value: 'active', label: 'Active' },
  { value: 'deprecated', label: 'Deprecated' },
  { value: 'archived', label: 'Archived' },
]);

const LIFECYCLE_MANAGED_ASSET_TYPES = Object.freeze([
  'tool',
  'clinical-tool',
  'calculator',
  'simulation',
  'workflow',
  'ai_agent',
  'integration',
]);

function parseJsonField(value, fallback) {
  try {
    return JSON.parse(value || '');
  } catch {
    return fallback;
  }
}

export function OrganizationDashboard() {
  const { organization, platformContext, entitledPackIds, refreshPlatformContext } = useUserIdentity();
  const { branding, integrations, subscription, tenant } = useOrganizationContext();
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!organization?.id) return;
    PlatformAssetsApi.getOrganizationAnalytics(organization.id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [organization?.id]);

  const packs = platformContext?.entitledPacks || [];

  return (
    <CareDroidPage
      className="org-page"
      contentClassName="cd-page-stack cd-page-stack--compact org-page__content"
      title={organization?.name || 'Organization'}
      description={organization?.organizationType || 'Configure an organization to unlock pack-based workflows.'}
      actions={
        <ActionRow align="end" className="org-page-actions">
          <Link to="/settings/organization">
            <Button variant="secondary">Organization settings</Button>
          </Link>
          <Link to="/organization/settings">
            <Button variant="secondary">Tenant engine</Button>
          </Link>
          <Link to="/asset-packs">
            <Button variant="primary">Solution packs</Button>
          </Link>
        </ActionRow>
      }
    >

      <DashboardGrid className="org-grid">
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
      </DashboardGrid>

      <Button variant="ghost" onClick={() => refreshPlatformContext()}>
        Refresh platform context
      </Button>
    </CareDroidPage>
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
  const [roleProfiles, setRoleProfiles] = useState<any[]>([]);
  const [selectedRoleProfile, setSelectedRoleProfile] = useState('');
  const [form, setForm] = useState({
    name: '',
    organizationType: 'hospital',
    country: '',
    displayName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '',
    accentColor: '',
    theme: 'system',
    loginTitle: '',
    loginSubtitle: '',
    loginBackgroundImageUrl: '',
    dashboardTitle: '',
    dashboardSubtitle: '',
    dashboardLogoUrl: '',
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
      setForm((prev: any) => ({
        ...prev,
        name: organization.name || '',
        organizationType: organization.organizationType || 'hospital',
        country: organization.country || '',
        displayName: branding?.displayName || organization.name || '',
        primaryColor: branding?.primaryColor || '',
        accentColor: branding?.accentColor || '',
        subscriptionTier: subscription?.tier || 'free',
      }));
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
    } catch (error: any) {
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
    } catch (error: any) {
      setStatus(error.message);
    }
  };

  const saveRoleProfile = async () => {
    if (!selectedRoleProfile) return;
    try {
      await PlatformAssetsApi.setRoleProfile(selectedRoleProfile);
      await refreshPlatformContext();
      setStatus('Role profile updated.');
    } catch (error: any) {
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
              placeholder={MEDICAL_THEME.accent}
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
          {listUserProfileCatalogOptions().map((role) => (
            <option key={role.id} value={role.id}>
              {role.label} (catalog)
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
  const {
    organization,
    platformContext,
    refreshPlatformContext,
    account,
    preferences,
    activeWorkspace,
    workspaceState,
    roleProfile,
  } = useUserIdentity();
  const [packs, setPacks] = useState<any[]>([]);
  const [packProductMap, setPackProductMap] = useState<any>({});
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

  const roleIntelligenceProfile = useMemo(
    () =>
      buildRoleIntelligenceProfile({
        account,
        preferences,
        activeWorkspace,
        workspaceState,
        platformContext,
        roleProfile,
      }),
    [account, activeWorkspace, platformContext, preferences, roleProfile, workspaceState]
  );
  const recommendedPacks = useMemo(
    () =>
      getRoleIntelligencePackRecommendations({
        packs,
        profile: roleIntelligenceProfile,
        installedPackIds: platformContext?.entitledPackIds || [],
        limit: packs.length || 6,
      }),
    [packs, platformContext?.entitledPackIds, roleIntelligenceProfile]
  );
  const recommendedPackIds = useMemo(
    () => new Set(recommendedPacks.map((pack) => pack.id)),
    [recommendedPacks]
  );
  const orderedPacks = useMemo(() => {
    const byId = new Map(recommendedPacks.map((pack) => [pack.id, pack]));
    return [...packs]
      .map((pack) => byId.get(pack.id) || pack)
      .sort((a, b) => {
        const scoreDelta =
          (b.roleIntelligence?.score || 0) - (a.roleIntelligence?.score || 0);
        return scoreDelta || a.name.localeCompare(b.name);
      });
  }, [packs, recommendedPacks]);

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
    } catch (error: any) {
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
        </div>
      </header>
      {!organization?.id && (
        <Card className="org-card">
          <h2>Create an organization first</h2>
          <p>Pack enablement is organization-scoped so entitlement state can be audited.</p>
        </Card>
      )}
      <div className="org-pack-grid">
        {orderedPacks.map((pack) => {
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
              {recommendedPackIds.has(pack.id) && (
                <p className="org-pack-meta">
                  <strong>Recommended Pack:</strong>{' '}
                  {pack.roleIntelligence?.reason || `${roleIntelligenceProfile.roleLabel} role fit`}
                </p>
              )}
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
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!organization?.id) return;
    PlatformAssetsApi.getOrganizationAnalytics(organization.id)
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [organization?.id]);

  const packs = platformContext?.availablePacks || [];
  const dashboards = analytics?.dashboards || {};
  const dimensions = analytics?.dimensions || {};
  const formatDuration = (seconds = 0) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  const metricCards = [
    ['Enabled packs', dashboards.adoption?.enabledPackCount ?? analytics?.enabledPackCount ?? 0],
    ['Enabled assets', dashboards.adoption?.enabledAssetCount ?? 0],
    ['Adoption score', `${dashboards.adoption?.adoptionScore ?? 0}%`],
    ['Launches', dashboards.engagement?.launchCount ?? dashboards.engagement?.totalUsageEvents ?? 0],
    ['Avg duration', formatDuration(dashboards.engagement?.averageDurationSeconds ?? 0)],
    ['Repeat usage', dashboards.engagement?.repeatUsageCount ?? 0],
    ['Abandonments', dashboards.engagement?.abandonmentCount ?? 0],
    ['AI recs accepted', dashboards.engagement?.recommendationsAcceptedCount ?? 0],
    ['Workflow completions', dashboards.engagement?.workflowCompletionCount ?? 0],
  ];

  const renderMetricList = (title, rows = [] as any[], emptyText = 'No usage recorded yet.') => (
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
                {row.metadata?.decision && <small>{row.metadata.decision}</small>}
                {row.metadata?.mergeTargetLabel && (
                  <small>Merge into {row.metadata.mergeTargetLabel}</small>
                )}
                {row.metadata?.reason && <small>{row.metadata.reason}</small>}
              </span>
              <b>{row.metadata?.usefulnessScore ?? row.count ?? row.events ?? row.status ?? 'enabled'}</b>
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
          Asset utilization intelligence for data-driven promotion, improvement, hiding, and merge decisions.
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
              {renderMetricList('Asset intelligence', dimensions.assetIntelligence || [])}
              {renderMetricList('AI usage', dimensions.aiUsage || [])}
              {renderMetricList('Search queries', dimensions.searchQueries || [])}
              {renderMetricList('Simulation completion', dimensions.simulationCompletion || [])}
              {renderMetricList('Dashboard engagement', dimensions.dashboardEngagement || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Top assets</h2>
            <div className="org-grid">
              {renderMetricList('Most useful assets', dashboards.topAssets || analytics.topTools || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Underused assets</h2>
            <div className="org-grid">
              {renderMetricList('Low usefulness with activity', dashboards.underusedAssets || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Unused assets</h2>
            <div className="org-grid">
              {renderMetricList('No useful signal', dashboards.unusedAssets || [])}
            </div>
          </div>

          <div className="org-analytics-section">
            <h2>Merge candidates</h2>
            <div className="org-grid">
              {renderMetricList('Overlap with stronger assets', dashboards.mergeCandidates || [])}
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

function CustomerSuccessMetricCard({ label, metric, suffix = '' }) {
  return (
    <Card className="org-card org-analytics-metric">
      <h2>{label}</h2>
      <p>
        {metric?.value ?? 0}
        {suffix}
      </p>
    </Card>
  );
}

export function CustomerSuccessDashboard() {
  const { organization } = useUserIdentity();
  const [period, setPeriod] = useState('month');
  const [dashboard, setDashboard] = useState<any>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!organization?.id) return;
    setStatus('');
    PlatformAssetsApi.getCustomerSuccessDashboard(organization.id, period)
      .then(setDashboard)
      .catch((error) => {
        setDashboard(null);
        setStatus(error.message || 'Customer success unavailable.');
      });
  }, [organization?.id, period]);

  if (!organization?.id) {
    return (
      <div className="org-page">
        <header className="org-page-header">
          <h1>Customer Success</h1>
          <p className="org-page-subtitle">Link an organization to view customer health.</p>
        </header>
      </div>
    );
  }

  const metrics = dashboard?.metrics || {};
  const topAssets = metrics.assetUsage?.topAssets || [];
  const underusedProducts = metrics.underusedProducts || [];
  const signals = dashboard?.signals || [];

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Customer Success</h1>
        <p className="org-page-subtitle">
          Customer health, retention signals, adoption, active users, asset usage, AI usage,
          simulations, workflows, and underused products for {organization.name}.
        </p>
        <div className="org-page-actions">
          <label>
            Period
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <Link to="/platform-analytics">Platform analytics</Link>
        </div>
      </header>

      {!dashboard ? (
        <Card className="org-card">
          <p>{status || 'Loading customer success dashboard...'}</p>
        </Card>
      ) : (
        <>
          <div className="org-grid org-analytics-metrics">
            <Card className="org-card org-analytics-metric">
              <h2>Health score</h2>
              <p>{dashboard.health?.score || 0}</p>
              <span className={`org-status-pill org-status-pill--${dashboard.health?.status || 'available'}`}>
                {dashboard.health?.status || 'needs-data'}
              </span>
            </Card>
            <Card className="org-card org-analytics-metric">
              <h2>Retention risk</h2>
              <p>{dashboard.health?.retentionRisk || 'unknown'}</p>
            </Card>
            <CustomerSuccessMetricCard label="Adoption" metric={metrics.adoption} suffix="%" />
            <CustomerSuccessMetricCard label="Active users" metric={metrics.activeUsers} />
            <CustomerSuccessMetricCard label="Asset usage" metric={metrics.assetUsage} />
            <CustomerSuccessMetricCard label="AI usage" metric={metrics.aiUsage} />
            <CustomerSuccessMetricCard
              label="Simulations completed"
              metric={metrics.simulationsCompleted}
            />
            <CustomerSuccessMetricCard
              label="Workflows completed"
              metric={metrics.workflowsCompleted}
            />
          </div>

          <section className="org-analytics-section">
            <h2>Customer health signals</h2>
            <div className="org-grid">
              {signals.map((signal) => (
                <Card key={signal.id} className="org-card">
                  <span className={`org-status-pill org-status-pill--${signal.status}`}>
                    {signal.status}
                  </span>
                  <h2>{signal.label}</h2>
                  <p>{signal.message}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="org-analytics-section">
            <h2>Asset usage</h2>
            <div className="org-grid">
              <Card className="org-card">
                <h2>Top assets</h2>
                <ol className="org-analytics-list">
                  {topAssets.map((asset) => (
                    <li key={asset.id}>
                      <span>
                        <strong>{asset.label}</strong>
                        <small>{asset.assetType || 'asset'}</small>
                      </span>
                      <b>{asset.count}</b>
                    </li>
                  ))}
                  {!topAssets.length && <li>No asset usage yet.</li>}
                </ol>
              </Card>
            </div>
          </section>

          <section className="org-analytics-section">
            <h2>Underused products</h2>
            <div className="org-grid">
              {underusedProducts.map((product) => (
                <Card key={product.id} className="org-card">
                  <h2>{product.name}</h2>
                  <p className="org-pack-meta">
                    {product.enabledAssetCount} enabled assets · {product.usageCount} usage events
                  </p>
                  <div className="org-chip-list">
                    {(product.expectedOutcomes || []).slice(0, 4).map((outcome) => (
                      <span key={outcome} className="org-chip">
                        {outcome}
                      </span>
                    ))}
                  </div>
                  <Link to={`/products/${product.slug}`}>Review product</Link>
                </Card>
              ))}
              {!underusedProducts.length && (
                <Card className="org-card">
                  <p>No underused products detected for this period.</p>
                </Card>
              )}
            </div>
          </section>

          <Card className="org-card">
            <h2>Data sources</h2>
            <p>
              Usage events: {dashboard.sources?.usageEvents || 0} · Audit events:{' '}
              {dashboard.sources?.auditEvents || 0} · Entitlements:{' '}
              {dashboard.sources?.enabledEntitlements || 0} · Products:{' '}
              {dashboard.sources?.products || 0}
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function RecommendationList({ title, rows = [] as any[] }) {
  return (
    <Card className="org-card org-analytics-panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="org-analytics-list">
          {rows.slice(0, 6).map((row) => (
            <li key={row.id}>
              <span>
                <strong>{row.title}</strong>
                <small>{row.rationale}</small>
                {row.route && <Link to={row.route}>{row.action}</Link>}
              </span>
              <b>{row.priority}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="org-pack-meta">No recommendations in this category yet.</p>
      )}
    </Card>
  );
}

function IntelligenceUsageList({ title, rows = [] as any[], emptyText = 'No usage signal yet.' }) {
  return (
    <Card className="org-card org-analytics-panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ol className="org-analytics-list">
          {rows.slice(0, 8).map((row) => (
            <li key={row.id || row.label}>
              <span>
                <strong>{row.label}</strong>
                {row.metadata?.assetType && <small>{row.metadata.assetType}</small>}
                {row.route && <Link to={row.route}>Open</Link>}
              </span>
              <b>{row.count}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="org-pack-meta">{emptyText}</p>
      )}
    </Card>
  );
}

export function OrganizationIntelligenceProfile() {
  const userIdentity = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const workspaceContext = useWorkspace();
  const organization = organizationContext.organization || userIdentity.organization;
  const [analytics, setAnalytics] = useState<any>(null);
  const [customerSuccess, setCustomerSuccess] = useState<any>(null);
  const [tenantAdministration, setTenantAdministration] = useState<any>(null);
  const [marketplacePacks, setMarketplacePacks] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!organization?.id) return;
    let active = true;
    setStatus('Loading organization intelligence...');
    Promise.allSettled([
      PlatformAssetsApi.getOrganizationAnalytics(organization.id),
      PlatformAssetsApi.getCustomerSuccessDashboard(organization.id, 'month'),
      PlatformAssetsApi.getTenantAdministration(organization.id),
      PlatformAssetsApi.listMarketplacePacks({
        organizationId: organization.id,
        organizationType: organization.organizationType,
      }),
    ]).then(([analyticsResult, successResult, tenantResult, packsResult]) => {
      if (!active) return;
      setAnalytics(analyticsResult.status === 'fulfilled' ? analyticsResult.value : null);
      setCustomerSuccess(successResult.status === 'fulfilled' ? successResult.value : null);
      setTenantAdministration(tenantResult.status === 'fulfilled' ? tenantResult.value : null);
      setMarketplacePacks(packsResult.status === 'fulfilled' ? packsResult.value || [] : []);
      setStatus('');
    });
    return () => {
      active = false;
    };
  }, [organization?.id, organization?.organizationType]);

  const profile = useMemo(() => {
    const platformContext = {
      ...(userIdentity.platformContext || {}),
      availablePacks: marketplacePacks.length
        ? marketplacePacks
        : userIdentity.platformContext?.availablePacks || [],
    };
    return buildOrganizationIntelligenceProfile({
      organizationContext,
      userIdentity: {
        ...userIdentity,
        platformContext,
      },
      workspaceContext,
      analytics,
      customerSuccess,
      tenantAdministration,
    });
  }, [analytics, customerSuccess, marketplacePacks, organizationContext, tenantAdministration, userIdentity, workspaceContext]);

  const metrics = [
    ['Organization type', profile.organization.organizationType],
    ['Departments', profile.departments.length],
    ['Workspaces', profile.workspaces.length],
    ['Enabled packs', profile.adoption.enabledPackCount],
    ['Adoption', `${profile.adoption.score}%`],
    ['AI usage', profile.usage.totals.aiUsage],
    ['Asset usage', profile.usage.totals.assetUsage],
    ['Health', profile.adoption.healthScore],
  ];

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Organization Intelligence</h1>
        <p className="org-page-subtitle">
          Organization Intelligence Profile for {profile.organization.name}: behavior-aware
          recommendations across packs, assets, AI usage, adoption, workflows, simulations, and automation.
        </p>
        <div className="org-page-actions">
          <Link to="/platform-analytics">Platform analytics</Link>
          <Link to="/tenant-admin">Tenant administration</Link>
          <Link to="/asset-packs">Review packs</Link>
        </div>
      </header>

      {status && <Card className="org-card"><p>{status}</p></Card>}

      <section className="org-grid org-analytics-metrics" aria-label="Organization intelligence metrics">
        {metrics.map(([label, value]) => (
          <Card key={label} className="org-card org-analytics-metric">
            <h2>{label}</h2>
            <p>{value}</p>
          </Card>
        ))}
      </section>

      <section className="org-analytics-section">
        <h2>Organization Intelligence Profile</h2>
        <div className="org-grid">
          <Card className="org-card">
            <h2>Identity</h2>
            <p>{profile.organization.name}</p>
            <p className="org-pack-meta">
              Tenant: {profile.organization.tenantId} · Subscription: {profile.organization.subscriptionTier}
            </p>
            <span className={`org-status-pill org-status-pill--${profile.organization.healthStatus}`}>
              {profile.organization.healthStatus}
            </span>
          </Card>
          <Card className="org-card">
            <h2>Departments</h2>
            <div className="org-chip-list">
              {profile.departments.map((department) => (
                <span key={department.id} className="org-chip">
                  {department.name}
                </span>
              ))}
              {!profile.departments.length && <span className="org-chip">No departments synced</span>}
            </div>
          </Card>
          <Card className="org-card">
            <h2>Workspaces</h2>
            <p>{profile.activeWorkspace?.name || 'Organization-wide'} focus</p>
            <div className="org-chip-list">
              {profile.workspaces.slice(0, 6).map((workspace) => (
                <span key={workspace.id} className="org-chip">
                  {workspace.name}
                </span>
              ))}
            </div>
          </Card>
          <Card className="org-card">
            <h2>Packs</h2>
            <p>{profile.packs.filter((pack) => pack.enabled).length} enabled</p>
            <p className="org-pack-meta">{profile.packs.filter((pack) => !pack.enabled).length} missing candidates</p>
          </Card>
        </div>
      </section>

      <section className="org-analytics-section">
        <h2>Usage and adoption</h2>
        <div className="org-grid">
          <IntelligenceUsageList title="Asset usage" rows={profile.usage.assetUsage} />
          <IntelligenceUsageList title="AI usage" rows={profile.usage.aiUsage} />
          <IntelligenceUsageList title="Workspace usage" rows={profile.usage.workspaceUsage} />
          <IntelligenceUsageList title="Underused assets" rows={profile.usage.underusedAssets} />
        </div>
      </section>

      <section className="org-analytics-section">
        <h2>Adaptive recommendations</h2>
        <div className="org-grid">
          <RecommendationList title="Missing packs" rows={profile.recommendations.missingPacks} />
          <RecommendationList title="Underused assets" rows={profile.recommendations.underusedAssets} />
          <RecommendationList title="Workflow opportunities" rows={profile.recommendations.workflowOpportunities} />
          <RecommendationList title="Simulation opportunities" rows={profile.recommendations.simulationOpportunities} />
          <RecommendationList title="Automation opportunities" rows={profile.recommendations.automationOpportunities} />
          <RecommendationList title="AI assist opportunities" rows={profile.recommendations.aiAssistOpportunities} />
        </div>
      </section>

      <section className="org-analytics-section">
        <h2>Platform adaptation signals</h2>
        <div className="org-grid">
          {profile.adaptationSignals.map((signal) => (
            <Card key={signal.id} className="org-card">
              <h2>{signal.label}</h2>
              <p>{signal.value}</p>
              <p className="org-pack-meta">{signal.rationale}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AssetLifecycleAdmin() {
  const [assets, setAssets] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    PlatformAssetsApi.listAssets()
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lifecycleCounts = useMemo(() => {
    const counts = Object.fromEntries(ASSET_LIFECYCLE_STATES.map((state) => [state.value, 0]));
    assets.forEach((asset) => {
      const lifecycle = asset.lifecycle || asset.lifecycleStatus || 'active';
      counts[lifecycle] = (counts[lifecycle] || 0) + 1;
    });
    return counts;
  }, [assets]);

  const managedAssetCount = useMemo(
    () => assets.filter((asset) => LIFECYCLE_MANAGED_ASSET_TYPES.includes(asset.assetType)).length,
    [assets]
  );

  const setLifecycle = async (assetId, lifecycle) => {
    setStatus('Updating…');
    try {
      await PlatformAssetsApi.updateAssetLifecycle(assetId, lifecycle);
      load();
      setStatus(`Asset ${assetId} → ${lifecycle}`);
    } catch (error: any) {
      setStatus(error.message);
    }
  };

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Asset lifecycle</h1>
        <p className="org-page-subtitle">
          Manage draft, beta, active, deprecated, and archived states for tools, calculators,
          simulations, workflows, AI agents, and integrations.
        </p>
        <Link to="/settings/organization">← Settings</Link>
      </header>

      <div className="org-lifecycle-summary" aria-label="Asset lifecycle summary">
        {ASSET_LIFECYCLE_STATES.map((state) => (
          <Card key={state.value} className="org-card org-lifecycle-summary-card">
            <span className="org-pack-meta">{state.label}</span>
            <strong>{lifecycleCounts[state.value] || 0}</strong>
          </Card>
        ))}
        <Card className="org-card org-lifecycle-summary-card">
          <span className="org-pack-meta">Managed asset types</span>
          <strong>{managedAssetCount}</strong>
        </Card>
      </div>

      <table className="org-lifecycle-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Lifecycle</th>
            <th>Managed Scope</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>{asset.title}</td>
              <td>{asset.assetType}</td>
              <td>
                <span className={`org-status-pill org-status-pill--${asset.lifecycle || 'active'}`}>
                  {asset.lifecycle || asset.lifecycleStatus || 'active'}
                </span>
              </td>
              <td>
                {LIFECYCLE_MANAGED_ASSET_TYPES.includes(asset.assetType)
                  ? 'Lifecycle-managed'
                  : 'Catalog-managed'}
              </td>
              <td>
                {ASSET_LIFECYCLE_STATES.map((state) => (
                  <Button
                    key={state.value}
                    variant="ghost"
                    onClick={() => setLifecycle(asset.id, state.value)}
                  >
                    {state.label}
                  </Button>
                ))}
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
  const [graph, setGraph] = useState<any>(null);
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
  const [graph, setGraph] = useState<any>(null);
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

export function TenantAdministrationCenter() {
  const { organization, refreshPlatformContext } = useUserIdentity();
  const [admin, setAdmin] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    organizationType: 'hospital',
    country: '',
    displayName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '',
    accentColor: '',
    theme: 'system',
    loginTitle: '',
    loginSubtitle: '',
    loginBackgroundImageUrl: '',
    dashboardTitle: '',
    dashboardSubtitle: '',
    dashboardLogoUrl: '',
    subscriptionTier: 'free',
    departmentsText: '',
    integrationsText: '',
    integrationsRequestedText: '',
    workspacesJson: '[]',
    permissionsJson: '{}',
  });
  const [status, setStatus] = useState('');
  const [rolePreviewId, setRolePreviewId] = useState('hospital-administrator');
  const catalogRoleOptions = useMemo(() => listUserProfileCatalogOptions(), []);
  const rolePreviewSummary = useMemo(
    () => buildUserProfileAccessSummary(rolePreviewId),
    [rolePreviewId],
  );

  const load = useCallback(async () => {
    if (!organization?.id) return;
    const result = await PlatformAssetsApi.getTenantAdministration(organization.id);
    setAdmin(result);
    setForm({
      name: result.profile?.name || '',
      organizationType: result.profile?.organizationType || 'hospital',
      country: result.profile?.country || '',
      displayName: result.branding?.displayName || result.profile?.name || '',
      logoUrl: result.branding?.logoUrl || '',
      faviconUrl: result.branding?.faviconUrl || '',
      primaryColor: result.branding?.primaryColor || '',
      accentColor: result.branding?.accentColor || '',
      theme: result.branding?.theme || 'system',
      loginTitle: result.branding?.loginTitle || '',
      loginSubtitle: result.branding?.loginSubtitle || '',
      loginBackgroundImageUrl: result.branding?.loginBackgroundImageUrl || '',
      dashboardTitle: result.branding?.dashboardTitle || '',
      dashboardSubtitle: result.branding?.dashboardSubtitle || '',
      dashboardLogoUrl: result.branding?.dashboardLogoUrl || '',
      subscriptionTier: result.subscriptions?.current?.tier || 'free',
      departmentsText: (result.departments || []).join('\n'),
      integrationsText: (result.integrations || [])
        .filter((integration) => integration.status === 'enabled')
        .map((integration) => integration.slug)
        .join('\n'),
      integrationsRequestedText: (result.noCodeConfiguration?.integrationsRequested || []).join('\n'),
      workspacesJson: prettyJson(result.workspaces, []),
      permissionsJson: prettyJson(result.permissions?.overrides, {}),
    });
  }, [organization?.id]);

  useEffect(() => {
    load().catch((error) => setStatus(error.message || 'Tenant administration unavailable.'));
  }, [load]);

  const save = async () => {
    if (!organization?.id) {
      setStatus('Create an organization before editing tenant administration.');
      return;
    }
    setStatus('Saving tenant administration...');
    const payload = {
      name: form.name,
      organizationType: form.organizationType,
      country: form.country,
      branding: {
        displayName: form.displayName || form.name,
        logoUrl: form.logoUrl || undefined,
        faviconUrl: form.faviconUrl || undefined,
        primaryColor: form.primaryColor || undefined,
        accentColor: form.accentColor || undefined,
        theme: form.theme || 'system',
        loginTitle: form.loginTitle || undefined,
        loginSubtitle: form.loginSubtitle || undefined,
        loginBackgroundImageUrl: form.loginBackgroundImageUrl || undefined,
        dashboardTitle: form.dashboardTitle || undefined,
        dashboardSubtitle: form.dashboardSubtitle || undefined,
        dashboardLogoUrl: form.dashboardLogoUrl || undefined,
      },
      subscription: {
        tier: form.subscriptionTier,
        status: admin?.subscriptions?.current?.status || 'active',
        commercialPlanId: admin?.subscriptions?.current?.commercialPlanId || undefined,
      },
      departments: splitList(form.departmentsText),
      integrations: splitList(form.integrationsText),
      integrationsRequested: splitList(form.integrationsRequestedText),
      workspaceDefaults: parseJsonField(form.workspacesJson, admin?.workspaces || []),
      permissionsOverrides: parseJsonField(form.permissionsJson, admin?.permissions?.overrides || {}),
    };
    try {
      const result = await PlatformAssetsApi.updateTenantAdministration(organization.id, payload);
      setAdmin(result);
      const workspaceDefaults = payload.workspaceDefaults || [];
      saveLocalClientProfile({
        source: 'tenant-admin',
        organizationId: organization.id,
        organizationName: payload.name || organization.name,
        organizationType: payload.organizationType,
        subscriptionPlan: payload.subscription.tier,
        enabledWorkspaces: workspaceDefaults.map((workspace) => workspace.id || workspace.type).filter(Boolean),
        enabledAssetPacks: workspaceDefaults.flatMap((workspace) => workspace.enabledAssetPacks || []),
        defaultWorkspace: workspaceDefaults[0]?.id || workspaceDefaults[0]?.type || 'emergency',
        roles: (result.users || admin?.users || [])
          .map((user) => user.roleProfileId || user.membershipRole)
          .filter(Boolean),
        departments: payload.departments,
        integrations: payload.integrations,
        branding: payload.branding,
      });
      await refreshPlatformContext?.();
      setStatus('Tenant administration saved.');
    } catch (error: any) {
      setStatus(error.message || 'Tenant administration update failed.');
    }
  };

  if (!organization?.id) {
    return (
      <div className="org-page">
        <header className="org-page-header">
          <h1>Tenant Administration Center</h1>
          <p className="org-page-subtitle">Create an organization before managing tenant settings.</p>
        </header>
      </div>
    );
  }

  const users = admin?.users || [];
  const roleProfiles = admin?.roles?.roleProfiles || [];
  const permissionOverrides = admin?.permissions?.overrides || {};
  const integrations = admin?.integrations || [];
  const workspaceDefaults = parseJsonField(form.workspacesJson, admin?.workspaces || []);
  const enabledWorkspaceIds = new Set(workspaceDefaults.map((workspace) => workspace.id || workspace.type));
  const defaultWorkspaceId = workspaceDefaults[0]?.id || workspaceDefaults[0]?.type || '';
  const previewRole = roleProfiles[0]?.id || 'hospital-administrator';
  const updateWorkspaceDefaults = (updater) => {
    const next = typeof updater === 'function' ? updater(workspaceDefaults) : updater;
    setForm((f) => ({ ...f, workspacesJson: prettyJson(next, []) }));
  };
  const toggleWorkspaceEnabled = (workspace) => {
    updateWorkspaceDefaults((current) => {
      const workspaceId = workspace.workspaceId || workspace.id;
      if (current.some((item) => (item.id || item.type) === workspaceId)) {
        return current.filter((item) => (item.id || item.type) !== workspaceId);
      }
      return [...current, buildWorkspaceSetupFromRegistry(workspaceId)];
    });
  };
  const patchWorkspaceDefault = (workspaceId, patch) => {
    updateWorkspaceDefaults((current) =>
      current.map((workspace) =>
        (workspace.id || workspace.type) === workspaceId ? { ...workspace, ...patch } : workspace
      )
    );
  };
  const setDefaultWorkspace = (workspaceId) => {
    updateWorkspaceDefaults((current) => {
      const target = current.find((workspace) => (workspace.id || workspace.type) === workspaceId);
      if (!target) return current;
      return [target, ...current.filter((workspace) => (workspace.id || workspace.type) !== workspaceId)];
    });
  };

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Tenant Administration Center</h1>
        <p className="org-page-subtitle">
          Tenant-scoped administration for organization profile, departments, workspaces, users,
          roles, permissions, branding, integrations, and subscriptions without code changes.
        </p>
        <div className="org-page-actions">
          <Link to="/organization">Organization home</Link>
          <Link to="/billing">Billing</Link>
          <Link to={CANONICAL_ROUTES.customerSuccessDashboard}>Customer success dashboard</Link>
        </div>
      </header>

      <div className="org-grid org-analytics-metrics">
        <Card className="org-card org-analytics-metric">
          <h2>Departments</h2>
          <p>{admin?.departments?.length || 0}</p>
        </Card>
        <Card className="org-card org-analytics-metric">
          <h2>Workspaces</h2>
          <p>{admin?.workspaces?.length || 0}</p>
        </Card>
        <Card className="org-card org-analytics-metric">
          <h2>Users</h2>
          <p>{users.length}</p>
        </Card>
        <Card className="org-card org-analytics-metric">
          <h2>Integrations</h2>
          <p>{integrations.filter((integration) => integration.status === 'enabled').length}</p>
        </Card>
      </div>

      <div className="org-grid">
        <Card className="org-card">
          <h2>Organization profile</h2>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            Type
            <select
              value={form.organizationType}
              onChange={(e) => setForm((f) => ({ ...f, organizationType: e.target.value }))}
            >
              {(admin?.supportedOrganizationTypes?.length
                ? admin.supportedOrganizationTypes
                : ['hospital', 'clinic', 'ems', 'university', 'research_center']
              ).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </label>
          <p className="org-pack-meta">
            Tenant: {admin?.profile?.tenantId || organization.slug || 'current tenant'} ·{' '}
            {admin?.profile?.complianceMode || 'hipaa'}
          </p>
        </Card>

        <Card className="org-card">
          <h2>White label branding</h2>
          <label>
            Display name
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </label>
          <label>
            Logo URL
            <input
              value={form.logoUrl}
              placeholder="https://cdn.example.com/logo.svg"
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
            />
          </label>
          <label>
            Favicon URL
            <input
              value={form.faviconUrl}
              placeholder="https://cdn.example.com/favicon.ico"
              onChange={(e) => setForm((f) => ({ ...f, faviconUrl: e.target.value }))}
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
              placeholder={MEDICAL_THEME.accent}
              onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
            />
          </label>
          <label>
            Theme
            <select value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </Card>

        <Card className="org-card">
          <h2>Subscriptions</h2>
          <label>
            Tier
            <select
              value={form.subscriptionTier}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionTier: e.target.value }))}
            >
              {['free', 'starter', 'professional', 'enterprise', 'academic', 'government'].map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
          <p className="org-pack-meta">
            Status: {admin?.subscriptions?.current?.status || 'active'} · source:{' '}
            {admin?.subscriptions?.current?.source || 'tenant'}
          </p>
        </Card>
      </div>

      <div className="org-grid">
        <Card className="org-card org-admin-wide-card">
          <h2>Login screen</h2>
          <label>
            Login title
            <input
              value={form.loginTitle}
              placeholder="Welcome to your hospital AI portal"
              onChange={(e) => setForm((f) => ({ ...f, loginTitle: e.target.value }))}
            />
          </label>
          <label>
            Login subtitle
            <textarea
              value={form.loginSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, loginSubtitle: e.target.value }))}
              rows={3}
            />
          </label>
          <label>
            Login background image URL
            <input
              value={form.loginBackgroundImageUrl}
              placeholder="https://cdn.example.com/login-background.jpg"
              onChange={(e) =>
                setForm((f) => ({ ...f, loginBackgroundImageUrl: e.target.value }))
              }
            />
          </label>
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Dashboard branding</h2>
          <label>
            Dashboard title
            <input
              value={form.dashboardTitle}
              placeholder="Hospital Command Center"
              onChange={(e) => setForm((f) => ({ ...f, dashboardTitle: e.target.value }))}
            />
          </label>
          <label>
            Dashboard subtitle
            <textarea
              value={form.dashboardSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, dashboardSubtitle: e.target.value }))}
              rows={3}
            />
          </label>
          <label>
            Dashboard logo URL
            <input
              value={form.dashboardLogoUrl}
              placeholder="https://cdn.example.com/dashboard-logo.svg"
              onChange={(e) => setForm((f) => ({ ...f, dashboardLogoUrl: e.target.value }))}
            />
          </label>
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Departments</h2>
          <p className="org-pack-meta">One department ID per line. These drive tenant-scoped workspaces and configuration.</p>
          <textarea
            value={form.departmentsText}
            onChange={(e) => setForm((f) => ({ ...f, departmentsText: e.target.value }))}
            rows={6}
          />
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Role access preview</h2>
          <p className="org-pack-meta">
            Preview navigation routes, workspaces, and benefits before assigning a canonical SaaS role.
          </p>
          <label>
            Canonical role
            <select value={rolePreviewId} onChange={(event) => setRolePreviewId(event.target.value)}>
              {catalogRoleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <p>{rolePreviewSummary.profileBenefits}</p>
          <ul className="org-pack-meta">
            <li>{rolePreviewSummary.navigationRoutes.length} navigation routes</li>
            <li>{rolePreviewSummary.allowedWorkspaces.join(', ')}</li>
            <li>
              Emergency: {rolePreviewSummary.emergencyRole || 'none'} · TrackMind:{' '}
              {rolePreviewSummary.trackMindRole || 'none'}
            </li>
          </ul>
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Workspace configuration</h2>
          <p className="org-pack-meta">
            Enable tenant workspaces from the canonical registry, assign role and pack defaults, set
            the default workspace, and preview access as {previewRole}.
          </p>
          <div className="org-grid">
            {getCanonicalWorkspaceRegistry().map((workspace) => {
              const workspaceId = workspace.workspaceId || workspace.id;
              const enabled = enabledWorkspaceIds.has(workspaceId);
              const configured = workspaceDefaults.find((item) => (item.id || item.type) === workspaceId) || {};
              const roleText = (configured.allowedRoles || workspace.allowedRoles || []).join(', ');
              const packText = (configured.enabledAssetPacks || workspace.defaultAssetPacks || []).join(', ');
              const previewAllowed = !roleText || roleText.split(',').map((item) => item.trim()).includes(previewRole);
              return (
                <div key={workspaceId} className="org-integration-row">
                  <span>
                    <strong>{workspace.label}</strong>
                    <small>{workspace.description}</small>
                    <small>
                      {workspace.subscriptionTier} · {workspace.allowedOrganizationTypes.join(', ')}
                    </small>
                    {enabled && (
                      <>
                        <label>
                          Roles
                          <input
                            value={roleText}
                            onChange={(e) =>
                              patchWorkspaceDefault(workspaceId, {
                                allowedRoles: splitList(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          Asset packs
                          <input
                            value={packText}
                            onChange={(e) =>
                              patchWorkspaceDefault(workspaceId, {
                                enabledAssetPacks: splitList(e.target.value),
                              })
                            }
                          />
                        </label>
                      </>
                    )}
                  </span>
                  <span>
                    <Button variant={enabled ? 'secondary' : 'primary'} onClick={() => toggleWorkspaceEnabled(workspace)}>
                      {enabled ? 'Disable' : 'Enable'}
                    </Button>
                    {enabled && (
                      <Button variant="ghost" onClick={() => setDefaultWorkspace(workspaceId)}>
                        {defaultWorkspaceId === workspaceId ? 'Default' : 'Set default'}
                      </Button>
                    )}
                    <span className={`org-status-pill org-status-pill--${previewAllowed ? 'active' : 'disabled'}`}>
                      {previewAllowed ? 'Role visible' : 'Role hidden'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Workspaces</h2>
          <p className="org-pack-meta">Raw workspace defaults remain available as an escape hatch for advanced tenant configuration.</p>
          <textarea
            value={form.workspacesJson}
            onChange={(e) => setForm((f) => ({ ...f, workspacesJson: e.target.value }))}
            rows={8}
          />
        </Card>

        <Card className="org-card org-admin-wide-card">
          <h2>Permissions</h2>
          <p className="org-pack-meta">
            Overrides are stored in tenant settings. Catalog contains {admin?.permissions?.catalog?.length || 0} permissions.
          </p>
          <textarea
            value={form.permissionsJson}
            onChange={(e) => setForm((f) => ({ ...f, permissionsJson: e.target.value }))}
            rows={8}
          />
          <div className="org-chip-list">
            {Object.keys(permissionOverrides).map((role) => (
              <span key={role} className="org-chip">
                {role}
              </span>
            ))}
          </div>
        </Card>

        <Card className="org-card">
          <h2>Users</h2>
          <ul className="org-asset-list">
            {users.map((user) => (
              <li key={user.membershipId || user.userId}>
                <span>{user.displayName}</span>
                <small>
                  {user.membershipRole} · {user.roleProfileId || 'no role profile'}
                </small>
                {user.specialty && <small>{user.specialty}</small>}
              </li>
            ))}
            {!users.length && <li>No tenant users loaded yet.</li>}
          </ul>
        </Card>

        <Card className="org-card">
          <h2>Roles</h2>
          <div className="org-chip-list">
            {(admin?.roles?.membershipRoles || []).map((role) => (
              <span key={role} className="org-chip">
                {role}
              </span>
            ))}
          </div>
          <ul className="org-asset-list">
            {roleProfiles.slice(0, 8).map((role) => (
              <li key={role.id}>
                <span>{role.label}</span>
                <small>{(role.requiredPermissions || []).join(', ') || 'No explicit permissions'}</small>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="org-card">
          <h2>Integrations</h2>
          <label>
            Enabled slugs
            <textarea
              value={form.integrationsText}
              onChange={(e) => setForm((f) => ({ ...f, integrationsText: e.target.value }))}
              rows={4}
            />
          </label>
          <label>
            Requested slugs
            <textarea
              value={form.integrationsRequestedText}
              onChange={(e) => setForm((f) => ({ ...f, integrationsRequestedText: e.target.value }))}
              rows={4}
            />
          </label>
          <div className="org-integration-list">
            {integrations.slice(0, 6).map((integration) => (
              <div key={integration.slug} className="org-integration-row">
                <span>
                  <strong>{integration.name}</strong>
                  <small>{integration.slug}</small>
                </span>
                <span className={`org-status-pill org-status-pill--${integration.status}`}>
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="org-page-actions">
        <Button onClick={save}>Save tenant administration</Button>
        <Button variant="ghost" onClick={load}>
          Reload
        </Button>
      </div>
      {status && <p className="org-status">{status}</p>}
    </div>
  );
}
