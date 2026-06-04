import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { ProductCatalogApi } from '../../services/productCatalogApi';
import { PROFILE_ROLES } from '../../data/profileToolSegmentation';
import './OrganizationPages.css';

export function OrganizationDashboard() {
  const { organization, platformContext, entitledPackIds, refreshPlatformContext } = useUserIdentity();
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
          <Link to="/settings/organization/packs">
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
  const [roleProfiles, setRoleProfiles] = useState([]);
  const [selectedRoleProfile, setSelectedRoleProfile] = useState('');
  const [form, setForm] = useState({
    name: '',
    organizationType: 'hospital',
    country: '',
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
      });
    }
  }, [organization]);

  const createOrganization = async () => {
    setStatus('Creating…');
    try {
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await PlatformAssetsApi.createOrganization({
        name: form.name,
        slug: slug || `org-${Date.now()}`,
        organizationType: form.organizationType,
        country: form.country,
      });
      await refreshPlatformContext();
      setStatus('Organization created.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const saveOrganization = async () => {
    if (!organization?.id) return;
    setStatus('Saving…');
    try {
      await PlatformAssetsApi.updateOrganization(organization.id, form);
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
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="ems">EMS</option>
              <option value="university">University</option>
              <option value="research_institute">Research institute</option>
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
              <option value="hospital">Hospital</option>
              <option value="clinic">Clinic</option>
              <option value="ems">EMS</option>
              <option value="university">University</option>
              <option value="research_institute">Research institute</option>
            </select>
          </label>
          <Button onClick={saveOrganization}>Save organization</Button>
        </Card>
      )}

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
  const entitled = useMemo(() => new Set(platformContext?.entitledPackIds || []), [platformContext]);
  const [packs, setPacks] = useState([]);
  const [packProductMap, setPackProductMap] = useState({});
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    const rows = await PlatformAssetsApi.listPacks({
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
    setStatus(enabled ? 'Installing…' : 'Removing…');
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
        <h1>Solution pack marketplace</h1>
        <Link to="/settings/organization">← Settings</Link>
      </header>
      <div className="org-pack-grid">
        {packs.map((pack) => {
          const installed = entitled.has(pack.id);
          return (
            <Card key={pack.id} className="org-card org-pack-card">
              <h2>{pack.name}</h2>
              <p>{pack.description}</p>
              <p className="org-pack-meta">
                {pack.assetIds?.length || 0} assets · {pack.pricingTier}
              </p>
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
              <Button onClick={() => togglePack(pack.id, installed)}>
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

export function AssetPacksPage() {
  return <PackMarketplace />;
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

  return (
    <div className="org-page">
      <header className="org-page-header">
        <h1>Platform analytics</h1>
        <p className="org-page-subtitle">Adoption by pack, role, and organization (demo-scoped).</p>
      </header>
      {analytics ? (
        <div className="org-grid">
          <Card className="org-card">
            <h2>Audit events</h2>
            <p>{analytics.auditEventCount}</p>
          </Card>
          <Card className="org-card">
            <h2>AI sessions</h2>
            <p>{analytics.aiSessionCount}</p>
          </Card>
          <Card className="org-card">
            <h2>Enabled packs</h2>
            <p>{analytics.enabledPackCount}</p>
          </Card>
        </div>
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
