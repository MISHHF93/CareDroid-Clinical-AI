import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildEnterpriseReadinessModel } from '../data/enterpriseReadiness';
import './EnterpriseReadinessPage.css';

function statusClass(status) {
  return `enterprise-readiness-status enterprise-readiness-status--${String(status)
    .toLowerCase()
    .replace(/\s+/g, '-')}`;
}

export default function EnterpriseReadinessPage() {
  const { tenantContext } = useTenantContext();
  const { organization: identityOrganization, platformContext } = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const organization =
    organizationContext?.organization || identityOrganization || platformContext?.organization || {};
  const integrations = organizationContext?.integrations || platformContext?.integrations || [];

  const model = useMemo(
    () =>
      buildEnterpriseReadinessModel({
        tenantContext,
        platformContext,
        organization,
        integrations,
      }),
    [integrations, organization, platformContext, tenantContext],
  );
  const readyCount = model.dimensions.filter((dimension) => dimension.status === 'Ready').length;
  const organizationName =
    organization?.name || tenantContext?.organizationName || 'Current organization';

  return (
    <div className="enterprise-readiness-page">
      <header className="enterprise-readiness-hero">
        <div>
          <p className="enterprise-readiness-eyebrow">Enterprise readiness</p>
          <h1>{organizationName}</h1>
          <p>
            Sales-ready metrics for SSO, RBAC, tenant isolation, audit, governance, integrations,
            and security. Scores are deterministic readiness indicators that make implementation
            conversations measurable.
          </p>
        </div>
        <div className="enterprise-readiness-score-card">
          <span>Readiness score</span>
          <strong>{model.readinessScore}</strong>
          <em>{model.status}</em>
        </div>
      </header>

      <section className="enterprise-readiness-summary" aria-label="Enterprise readiness summary">
        <article>
          <span>Ready dimensions</span>
          <strong>{readyCount}/{model.dimensions.length}</strong>
        </article>
        <article>
          <span>Weighted model</span>
          <strong>0-100</strong>
        </article>
        <article>
          <span>Primary audience</span>
          <strong>Sales engineering</strong>
        </article>
      </section>

      <section className="enterprise-readiness-grid" aria-label="Enterprise readiness dimensions">
        {model.dimensions.map((dimension) => (
          <article key={dimension.id} className="enterprise-readiness-card">
            <div className="enterprise-readiness-card-header">
              <div>
                <span>{dimension.weight}% weight</span>
                <h2>{dimension.label}</h2>
              </div>
              <strong>{dimension.score}</strong>
            </div>
            <span className={statusClass(dimension.status)}>{dimension.status}</span>
            <p>{dimension.evidence}</p>
            <div className="enterprise-readiness-next-step">
              <span>Next step</span>
              <p>{dimension.nextStep}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="enterprise-readiness-actions" aria-label="Enterprise readiness actions">
        <div>
          <h2>Attach Evidence For Sales Conversations</h2>
          <p>
            Use these linked surfaces to validate readiness details with implementation, compliance,
            and security stakeholders.
          </p>
        </div>
        <div>
          <Link to="/integration-readiness">Integration readiness</Link>
          <Link to="/settings">Identity and tenant controls</Link>
          <Link to="/governance-registry">Governance registry</Link>
          <Link to="/security">Security review</Link>
        </div>
      </section>
    </div>
  );
}
