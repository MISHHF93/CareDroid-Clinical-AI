import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildCustomerSuccessPlatformAssessment } from '../config/customerSuccessPlatformModel';
import { fetchSuccessCenterDashboard } from '../services/successCenterApi';
import './CustomerSuccessPlatformPage.css';

function statusClass(status) {
  return `cs-platform-status cs-platform-status--${String(status || 'watch').replace(/\s+/g, '-')}`;
}

function KpiCard({ kpi }) {
  return (
    <article className={`cs-platform-kpi ${kpi.passes ? 'cs-platform-kpi--pass' : 'cs-platform-kpi--fail'}`}>
      <span>{kpi.label}</span>
      <strong>
        {kpi.value}
        {kpi.unit}
      </strong>
      <small>
        Target {kpi.maxTarget ? '≤' : '≥'} {kpi.target}
        {kpi.unit}
      </small>
      <em>{kpi.passes ? 'On track' : 'Needs attention'}</em>
    </article>
  );
}

export default function CustomerSuccessPlatformPage() {
  const { tenantContext } = useTenantContext();
  const {
    organization: identityOrganization,
    platformContext,
    workspaces,
    activeWorkspace,
    roleProfile,
  } = useUserIdentity();
  const {
    organization: engineOrganization,
    integrations,
    subscription,
  } = useOrganizationContext();

  const [period, setPeriod] = useState('month');
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const organization = identityOrganization || engineOrganization || null;
  const organizationId = tenantContext?.organizationId || organization?.id || '';
  const organizationName =
    organization?.name || tenantContext?.organizationName || 'Current organization';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!organizationId) {
        setDashboard(null);
        setError('Select or create an organization to view customer success metrics.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await fetchSuccessCenterDashboard(organizationId, period);
      if (cancelled) return;

      if (!result.ok) {
        setDashboard(null);
        setError(result.message);
      } else {
        setDashboard(result.data);
        setError('');
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [organizationId, period]);

  const assessment = useMemo(
    () =>
      buildCustomerSuccessPlatformAssessment({
        dashboard: dashboard || {},
        context: {
          organization,
          workspaces,
          activeWorkspace,
          roleProfile,
          products: platformContext?.assignedProducts || [],
          packs: platformContext?.entitledPacks || [],
          integrations: integrations || [],
          subscription: dashboard?.subscription || subscription || {},
          provisioned: true,
        },
        organizationName,
      }),
    [
      dashboard,
      organization,
      workspaces,
      activeWorkspace,
      roleProfile,
      platformContext,
      integrations,
      subscription,
      organizationName,
    ],
  );

  const { onboarding, adoption, feature_utilization: utilization, health_score: health, support_tracking: support, renewal_readiness: renewal } =
    assessment.capabilities;

  const kpiChartData = assessment.kpiEvaluation.kpis.map((kpi) => ({
    name: kpi.label.split(' ').slice(0, 2).join(' '),
    value: kpi.value,
    target: kpi.target,
  }));

  if (isLoading) {
    return <div className="cs-platform-page">Loading customer success platform...</div>;
  }

  return (
    <div className="cs-platform-page">
      <header className="cs-platform-hero">
        <div>
          <p className="cs-platform-eyebrow">Customer success platform</p>
          <h1>{organizationName}</h1>
          <p>
            Onboarding progress, adoption metrics, feature utilization, customer health scores,
            support tracking, and renewal readiness in one operating view.
          </p>
          <div className="cs-platform-actions">
            <label>
              Period
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <Link to="/success-center">Success center</Link>
            <Link to="/value-tracking">Value tracking</Link>
            <Link to="/customer-portal">Customer portal</Link>
          </div>
        </div>
        <div className="cs-platform-score-stack">
          <div className="cs-platform-score-card">
            <span>Health score</span>
            <strong>{health.score}</strong>
            <em className={statusClass(health.status)}>{health.status}</em>
          </div>
          <div className="cs-platform-score-card">
            <span>Renewal readiness</span>
            <strong>{renewal.score}</strong>
            <em className={statusClass(renewal.status)}>{renewal.status}</em>
          </div>
        </div>
      </header>

      {error ? <p className="cs-platform-error">{error}</p> : null}

      <section className="cs-platform-summary" aria-label="Customer success summary">
        <article>
          <span>Onboarding</span>
          <strong>{onboarding.percent}%</strong>
        </article>
        <article>
          <span>Adoption</span>
          <strong>{adoption.adoptionScore}%</strong>
        </article>
        <article>
          <span>Feature utilization</span>
          <strong>{utilization.utilizationRate}%</strong>
        </article>
        <article>
          <span>Open support</span>
          <strong>{support.openCount}</strong>
        </article>
        <article>
          <span>KPIs passed</span>
          <strong>
            {assessment.kpiEvaluation.passedCount}/{assessment.kpiEvaluation.totalCount}
          </strong>
        </article>
      </section>

      <section className="cs-platform-kpi-grid" aria-label="Customer success KPIs">
        {assessment.kpiEvaluation.kpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </section>

      <section className="cs-platform-layout">
        <div className="cs-platform-panel cs-platform-panel--wide">
          <div className="cs-platform-panel-header">
            <h2>KPI performance</h2>
            <p>Current values against customer success targets</p>
          </div>
          <div className="cs-platform-chart" aria-label="Customer success KPI chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={kpiChartData}>
                <CartesianGrid stroke="var(--panel-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-background)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="var(--app-accent-interactive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="target" fill="color-mix(in srgb, var(--text-secondary) 35%, transparent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cs-platform-panel">
          <div className="cs-platform-panel-header">
            <h2>Renewal readiness</h2>
            <p>{renewal.recommendation}</p>
          </div>
          <ul className="cs-platform-factor-list">
            {renewal.factors.map((factor) => (
              <li key={factor.id} className={factor.passes ? 'pass' : 'fail'}>
                <span>{factor.label}</span>
                <strong>{factor.score}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cs-platform-grid">
        <article className="cs-platform-panel">
          <div className="cs-platform-panel-header">
            <h2>Onboarding progress</h2>
            <p>{onboarding.percent}% complete across commercial and clinical setup</p>
          </div>
          <div className="cs-platform-progress" aria-hidden="true">
            <span style={{ width: `${onboarding.percent}%` }} />
          </div>
          <h3>Commercial setup</h3>
          <ul className="cs-platform-checklist">
            {onboarding.commercial.steps.map((step) => (
              <li key={step.id} className={step.complete ? 'complete' : ''}>
                <span>{step.complete ? 'Done' : 'Open'}</span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ul>
          <h3>Clinical operating setup</h3>
          <ul className="cs-platform-checklist">
            {onboarding.clinical.steps.map((step) => (
              <li key={step.id} className={step.complete ? 'complete' : ''}>
                <span>{step.status}</span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="cs-platform-panel">
          <div className="cs-platform-panel-header">
            <h2>Adoption metrics</h2>
            <p>Entitlements, users, and engagement this period</p>
          </div>
          <dl className="cs-platform-metrics">
            <div><dt>Adoption score</dt><dd>{adoption.adoptionScore}%</dd></div>
            <div><dt>Active users</dt><dd>{adoption.activeUsers}</dd></div>
            <div><dt>Enabled assets</dt><dd>{adoption.enabledAssetCount}/{adoption.totalAssetCount}</dd></div>
            <div><dt>Workspace adoption</dt><dd>{adoption.workspaceAdoptionRate}%</dd></div>
            <div><dt>Asset usage</dt><dd>{adoption.assetUsage}</dd></div>
            <div><dt>AI usage</dt><dd>{adoption.aiUsage}</dd></div>
            <div><dt>Simulations</dt><dd>{adoption.simulationsCompleted}</dd></div>
            <div><dt>Workflows</dt><dd>{adoption.workflowsCompleted}</dd></div>
          </dl>
        </article>

        <article className="cs-platform-panel">
          <div className="cs-platform-panel-header">
            <h2>Feature utilization</h2>
            <p>{utilization.utilizedCount}/{utilization.totalFeatures} high-value features active</p>
          </div>
          <ul className="cs-platform-feature-list">
            {utilization.features.map((feature) => (
              <li key={feature.id} className={feature.utilized ? 'utilized' : ''}>
                <span>
                  <strong>{feature.label}</strong>
                  <small>{feature.category}</small>
                </span>
                <em>{feature.utilized ? `${feature.usageCount} hits` : 'Not observed'}</em>
              </li>
            ))}
          </ul>
        </article>

        <article className="cs-platform-panel">
          <div className="cs-platform-panel-header">
            <h2>Customer health</h2>
            <p>Retention risk: {health.retentionRisk}</p>
          </div>
          <dl className="cs-platform-metrics">
            <div><dt>Adoption component</dt><dd>{health.components.adoption}</dd></div>
            <div><dt>Engagement component</dt><dd>{health.components.engagement}</dd></div>
            <div><dt>Onboarding component</dt><dd>{health.components.onboarding}</dd></div>
            <div><dt>Utilization component</dt><dd>{health.components.featureUtilization}</dd></div>
          </dl>
          <ul className="cs-platform-signal-list">
            {health.signals.map((signal) => (
              <li key={signal.id}>
                <span>{signal.label}</span>
                <em className={statusClass(signal.status)}>{signal.status}</em>
              </li>
            ))}
            {!health.signals.length ? <li>No backend health signals for this period.</li> : null}
          </ul>
        </article>

        <article className="cs-platform-panel cs-platform-panel--wide">
          <div className="cs-platform-panel-header">
            <h2>Support tracking</h2>
            <p>{support.openCount} open · {support.escalatedCount} escalated</p>
          </div>
          <ul className="cs-platform-support-list">
            {support.openItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.subject}</strong>
                  <small>{item.summary}</small>
                  <span>{item.owner} · {item.type}</span>
                </div>
                <em className={statusClass(item.priority)}>{item.priority}</em>
              </li>
            ))}
            {!support.openItems.length ? <li>No open support items — account is clear.</li> : null}
          </ul>
        </article>
      </section>

      <section className="cs-platform-links">
        <div>
          <h2>Related surfaces</h2>
          <p>Validate evidence behind customer success scores.</p>
        </div>
        <div>
          <Link to="/trackmind-maturity">TrackMind maturity</Link>
          <Link to="/enterprise-readiness">Enterprise readiness</Link>
          <Link to="/platform-analytics">Platform analytics</Link>
          <Link to="/billing">Billing</Link>
        </div>
      </section>
    </div>
  );
}
