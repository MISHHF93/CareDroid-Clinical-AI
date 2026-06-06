import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import { useOrganizationContext } from '../../contexts/OrganizationContext';
import { useTenantContext } from '../../contexts/TenantContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { fetchSuccessCenterDashboard } from '../../services/successCenterApi';
import './SuccessCenterPage.css';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function humanize(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusForScore(score) {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'At Risk';
  return 'Needs Attention';
}

function toneForStatus(status) {
  if (status === 'Healthy') return 'healthy';
  if (status === 'At Risk') return 'risk';
  return 'attention';
}

function metricValue(metric) {
  if (metric && typeof metric === 'object' && 'value' in metric) return Number(metric.value || 0);
  return Number(metric || 0);
}

function percentFromCount(count, target) {
  if (target <= 0) return count > 0 ? 100 : 0;
  return clampScore((count / target) * 100);
}

function workspaceAdoptionScore(workspaces, activeWorkspace) {
  const rows = asList(workspaces);
  if (!rows.length) return activeWorkspace?.id ? 100 : 0;
  const adopted = rows.filter((workspace) => {
    const enabledTools = workspace?.settings?.enabledToolIds || workspace?.enabledToolIds || [];
    return enabledTools.length > 0 || workspace.id === activeWorkspace?.id;
  }).length;
  return percentFromCount(adopted, rows.length);
}

function buildOnboardingSteps({
  organization,
  workspaces,
  products,
  packs,
  integrations,
  subscription,
  roleProfile,
}) {
  return [
    {
      id: 'organization-profile',
      label: 'Organization profile',
      complete: Boolean(organization?.id || organization?.name),
    },
    {
      id: 'workspaces',
      label: 'Workspaces configured',
      complete: asList(workspaces).length > 0,
    },
    {
      id: 'asset-packs',
      label: 'Asset packs enabled',
      complete: asList(packs).length > 0,
    },
    {
      id: 'products',
      label: 'Products assigned',
      complete: asList(products).length > 0,
    },
    {
      id: 'integrations',
      label: 'Integrations connected or requested',
      complete: asList(integrations).some((integration) =>
        ['enabled', 'requested'].includes(integration?.status)
      ),
    },
    {
      id: 'subscription',
      label: 'Subscription active',
      complete: Boolean(subscription?.status || subscription?.tier),
    },
    {
      id: 'role-profile',
      label: 'Role profile selected',
      complete: Boolean(roleProfile?.id || roleProfile?.label),
    },
  ];
}

function fallbackHealthScore({
  adoptionScore,
  workspaceScore,
  assetUsage,
  aiUsage,
  simulationsCompleted,
  workflowsCompleted,
  onboardingProgress,
}) {
  const usageScore = percentFromCount(assetUsage, 10);
  const aiScore = percentFromCount(aiUsage, 10);
  const simulationScore = simulationsCompleted > 0 ? 100 : 50;
  const workflowScore = workflowsCompleted > 0 ? 100 : 50;
  return clampScore(
    adoptionScore * 0.2 +
      workspaceScore * 0.15 +
      usageScore * 0.15 +
      aiScore * 0.15 +
      simulationScore * 0.1 +
      workflowScore * 0.1 +
      onboardingProgress * 0.15
  );
}

function MetricCard({ label, value, helper, suffix = '' }) {
  return (
    <Card className="success-center-metric-card">
      <span>{label}</span>
      <strong>
        {value}
        {suffix}
      </strong>
      {helper && <small>{helper}</small>}
    </Card>
  );
}

function ProgressBar({ value, label }) {
  const score = clampScore(value);
  return (
    <div className="success-center-progress" aria-label={label}>
      <span style={{ width: `${score}%` }} />
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`success-center-status success-center-status--${toneForStatus(status)}`}>{status}</span>;
}

export default function SuccessCenterPage() {
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

  const activeOrganization = identityOrganization || engineOrganization || null;
  const resolvedOrganizationId = tenantContext?.organizationId || activeOrganization?.id || '';
  const contextOrganizationId = activeOrganization?.id || '';
  const hasTenantMismatch = Boolean(
    tenantContext?.organizationId &&
      contextOrganizationId &&
      tenantContext.organizationId !== contextOrganizationId
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      if (hasTenantMismatch) {
        setDashboard(null);
        setError('Tenant context does not match the active organization. Success metrics were not loaded.');
        setIsLoading(false);
        return;
      }

      if (!resolvedOrganizationId) {
        setDashboard(null);
        setError('Select or create an organization before opening the success center.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const result = await fetchSuccessCenterDashboard(resolvedOrganizationId, period);
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

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [hasTenantMismatch, period, resolvedOrganizationId]);

  const assignedProducts = asList(platformContext?.assignedProducts);
  const entitledPacks = asList(platformContext?.entitledPacks);
  const effectiveIntegrations = asList(integrations);
  const effectiveSubscription = dashboard?.subscription || subscription || {};
  const metrics = dashboard?.metrics || {};
  const adoptionScore = clampScore(metrics.adoption?.value ?? platformContext?.entitledAssetIds?.length);
  const workspaceScore = workspaceAdoptionScore(workspaces, activeWorkspace);
  const assetUsage = metricValue(metrics.assetUsage);
  const aiUsage = metricValue(metrics.aiUsage);
  const simulationsCompleted = metricValue(metrics.simulationsCompleted);
  const workflowsCompleted = metricValue(metrics.workflowsCompleted);
  const onboardingSteps = useMemo(
    () =>
      buildOnboardingSteps({
        organization: activeOrganization,
        workspaces,
        products: assignedProducts,
        packs: entitledPacks,
        integrations: effectiveIntegrations,
        subscription: effectiveSubscription,
        roleProfile,
      }),
    [
      activeOrganization,
      assignedProducts,
      effectiveIntegrations,
      effectiveSubscription,
      entitledPacks,
      roleProfile,
      workspaces,
    ]
  );
  const onboardingProgress = percentFromCount(
    onboardingSteps.filter((step) => step.complete).length,
    onboardingSteps.length
  );
  const healthScore = clampScore(
    dashboard?.health?.score ??
      fallbackHealthScore({
        adoptionScore,
        workspaceScore,
        assetUsage,
        aiUsage,
        simulationsCompleted,
        workflowsCompleted,
        onboardingProgress,
      })
  );
  const status = statusForScore(healthScore);
  const topAssets = asList(metrics.assetUsage?.topAssets);
  const signals = asList(dashboard?.signals);

  if (isLoading) {
    return <div className="success-center-page">Loading success center...</div>;
  }

  return (
    <div className="success-center-page">
      <header className="success-center-hero">
        <div>
          <span className="success-center-eyebrow">Success Center</span>
          <h1>{activeOrganization?.name || tenantContext?.organizationName || 'Organization value'}</h1>
          <p>
            Measure CareDroid platform value across adoption, workspaces, assets, AI, simulations,
            workflows, and onboarding progress.
          </p>
          <div className="success-center-actions">
            <label>
              Period
              <select value={period} onChange={(event) => setPeriod(event.target.value)}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </label>
            <Link to="/customer-portal">Customer portal</Link>
            <Link to="/value-tracking">Value tracking</Link>
          </div>
        </div>
        <Card className="success-center-health-card">
          <span>Health Score</span>
          <strong>{healthScore}</strong>
          <StatusPill status={status} />
        </Card>
      </header>

      {error && <p className="success-center-error">{error}</p>}

      <section className="success-center-metrics" aria-label="Success center metrics">
        <MetricCard label="Adoption score" value={adoptionScore} suffix="%" helper="Enabled assets vs platform catalog" />
        <MetricCard label="Workspace adoption" value={workspaceScore} suffix="%" helper={`${asList(workspaces).length} workspaces tracked`} />
        <MetricCard label="Asset usage" value={assetUsage} helper="Usage and audit events this period" />
        <MetricCard label="AI usage" value={aiUsage} helper="AI calls and AI audit events" />
        <MetricCard label="Simulation completion" value={simulationsCompleted} helper="Completed simulation events" />
        <MetricCard label="Workflow completion" value={workflowsCompleted} helper="Completed workflow events" />
        <MetricCard label="Onboarding progress" value={onboardingProgress} suffix="%" helper="Tenant readiness checklist" />
      </section>

      <section className="success-center-grid">
        <Card className="success-center-card success-center-card--wide">
          <div className="success-center-section-header">
            <div>
              <h2>Onboarding progress</h2>
              <p>Organization setup signals that help teams reach measurable platform value.</p>
            </div>
            <strong>{onboardingProgress}%</strong>
          </div>
          <ProgressBar value={onboardingProgress} label="Onboarding progress" />
          <ul className="success-center-checklist">
            {onboardingSteps.map((step) => (
              <li key={step.id} className={step.complete ? 'complete' : ''}>
                <span>{step.complete ? 'Complete' : 'Open'}</span>
                <strong>{step.label}</strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="success-center-card">
          <div className="success-center-section-header">
            <div>
              <h2>Workspace adoption</h2>
              <p>Workspaces with active context or enabled tools.</p>
            </div>
          </div>
          <ul className="success-center-list">
            {asList(workspaces).map((workspace) => {
              const enabledTools = workspace?.settings?.enabledToolIds || workspace?.enabledToolIds || [];
              const adopted = enabledTools.length > 0 || workspace.id === activeWorkspace?.id;
              return (
                <li key={workspace.id || workspace.name}>
                  <span>
                    <strong>{workspace.name || humanize(workspace.id)}</strong>
                    <small>{enabledTools.length} enabled tools</small>
                  </span>
                  <StatusPill status={adopted ? 'Healthy' : 'Needs Attention'} />
                </li>
              );
            })}
            {!asList(workspaces).length && <li>No workspaces configured yet.</li>}
          </ul>
        </Card>

        <Card className="success-center-card">
          <div className="success-center-section-header">
            <div>
              <h2>Asset usage</h2>
              <p>Top assets proving day-to-day platform value.</p>
            </div>
          </div>
          <ul className="success-center-list">
            {topAssets.map((asset) => (
              <li key={asset.id}>
                <span>
                  <strong>{asset.label || humanize(asset.id)}</strong>
                  <small>{asset.assetType || 'asset'}</small>
                </span>
                <b>{asset.count}</b>
              </li>
            ))}
            {!topAssets.length && <li>No asset usage yet for this period.</li>}
          </ul>
        </Card>

        <Card className="success-center-card">
          <div className="success-center-section-header">
            <div>
              <h2>Health signals</h2>
              <p>Backend customer success signals translated into value follow-ups.</p>
            </div>
          </div>
          <ul className="success-center-list success-center-signal-list">
            {signals.map((signal) => (
              <li key={signal.id}>
                <span>
                  <strong>{signal.label}</strong>
                  <small>{signal.message}</small>
                </span>
                <span>{humanize(signal.status)}</span>
              </li>
            ))}
            {!signals.length && <li>No health signals available yet.</li>}
          </ul>
        </Card>

        <Card className="success-center-card">
          <div className="success-center-section-header">
            <div>
              <h2>Value summary</h2>
              <p>Core measures used for the generated health score.</p>
            </div>
          </div>
          <dl className="success-center-summary">
            <div>
              <dt>Enabled products</dt>
              <dd>{assignedProducts.length}</dd>
            </div>
            <div>
              <dt>Enabled asset packs</dt>
              <dd>{entitledPacks.length}</dd>
            </div>
            <div>
              <dt>Integrations</dt>
              <dd>{effectiveIntegrations.length}</dd>
            </div>
            <div>
              <dt>Data sources</dt>
              <dd>
                {dashboard?.sources?.usageEvents || 0} usage / {dashboard?.sources?.auditEvents || 0} audit
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
