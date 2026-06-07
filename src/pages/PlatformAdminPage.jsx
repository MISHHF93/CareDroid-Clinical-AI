import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildSaasOperatingSystemModel } from '../data/saasOperatingSystem';
import './PlatformAdminPage.css';

export default function PlatformAdminPage() {
  const { tenantContext } = useTenantContext();
  const identity = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const organization =
    organizationContext?.organization || identity?.organization || identity?.platformContext?.organization || {};

  const model = useMemo(
    () =>
      buildSaasOperatingSystemModel({
        tenantContext,
        platformContext: identity?.platformContext,
        organization,
        subscription: organizationContext?.subscription,
        products: identity?.platformContext?.assignedProducts,
        packs: identity?.platformContext?.entitledPacks,
        assets: identity?.platformContext?.entitledAssetIds,
        workspaces: identity?.workspaces,
        users: organizationContext?.users,
        integrations: organizationContext?.integrations,
      }),
    [identity, organization, organizationContext, tenantContext],
  );

  return (
    <div className="platform-admin-page">
      <header className="platform-admin-hero">
        <div>
          <p className="platform-admin-eyebrow">SaaS operating system</p>
          <h1>{model.organizationName}</h1>
          <p>
            A unified operating layer across organization, subscription, products, asset packs,
            assets, workspaces, users, AI agents, and automations.
          </p>
        </div>
        <div className="platform-admin-health-card">
          <span>Platform health</span>
          <strong>{model.healthScore}</strong>
          <em>{model.healthStatus}</em>
        </div>
      </header>

      <section className="platform-admin-chain" aria-label="SaaS operating system chain">
        {model.chain.map((concept, index) => (
          <div key={concept.id} className="platform-admin-chain-item">
            <Link to={concept.route}>
              <span>{index + 1}</span>
              <strong>{concept.label}</strong>
              <small>{concept.value}</small>
            </Link>
          </div>
        ))}
      </section>

      <section className="platform-admin-metrics" aria-label="Platform operating metrics">
        <article>
          <span>Products</span>
          <strong>{model.metrics.products}</strong>
        </article>
        <article>
          <span>Asset packs</span>
          <strong>{model.metrics.assetPacks}</strong>
        </article>
        <article>
          <span>Assets</span>
          <strong>{model.metrics.assets}</strong>
        </article>
        <article>
          <span>Workspaces</span>
          <strong>{model.metrics.workspaces}</strong>
        </article>
        <article>
          <span>AI agents</span>
          <strong>{model.metrics.aiAgents}</strong>
        </article>
        <article>
          <span>Automations</span>
          <strong>{model.metrics.automations}</strong>
        </article>
      </section>

      <section className="platform-admin-overviews" aria-label="Platform admin overviews">
        {model.overviews.map((overview) => (
          <article key={overview.id} className="platform-admin-overview-card">
            <div>
              <span>{overview.status}</span>
              <h2>{overview.title}</h2>
            </div>
            <strong>{overview.metric}</strong>
            <p>{overview.detail}</p>
            <Link to={overview.route}>Open owner surface</Link>
          </article>
        ))}
      </section>
    </div>
  );
}
