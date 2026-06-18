import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildPlatformIntelligenceAssessment } from '../config/platformIntelligenceModel';
import './PlatformIntelligenceHub.css';

function statusClass(status) {
  return `pi-status pi-status--${String(status || 'watch')}`;
}

function ModuleDetail({ module }) {
  const { assessment, description, relatedRoutes, prompt } = module;
  return (
    <article className="pi-detail">
      <header>
        <span>Prompt {prompt}</span>
        <h2>{assessment.label}</h2>
        <p>{description}</p>
        <div className="pi-detail-scores">
          <strong>{assessment.score}</strong>
          <em className={statusClass(assessment.status)}>{assessment.status}</em>
          <span>
            KPIs {assessment.passedKpis}/{assessment.totalKpis}
          </span>
        </div>
      </header>
      <div className="pi-kpi-row">
        {assessment.kpis.map((kpi) => (
          <div key={kpi.id} className={`pi-kpi-chip ${kpi.passes ? 'pass' : 'fail'}`}>
            <span>{kpi.label}</span>
            <strong>
              {kpi.value}
              {kpi.unit}
            </strong>
          </div>
        ))}
      </div>
      <div className="pi-artifacts">
        <h3>Artifacts</h3>
        <pre>{JSON.stringify(assessment.artifacts, null, 2)}</pre>
      </div>
      <div className="pi-related">
        {relatedRoutes.map((route) => (
          <Link key={route} to={route}>
            {route}
          </Link>
        ))}
      </div>
    </article>
  );
}

export default function PlatformIntelligenceHub() {
  const { tenantContext } = useTenantContext();
  const { organization: identityOrganization, platformContext } = useUserIdentity();
  const organizationContext = useOrganizationContext();
  const organization =
    organizationContext?.organization || identityOrganization || platformContext?.organization || {};

  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const organizationName =
    organization?.name || tenantContext?.organizationName || 'Current organization';

  const assessment = useMemo(
    () =>
      buildPlatformIntelligenceAssessment({
        context: { organization },
        signals: {
          emergencyApiAuthenticated: true,
          orgScopedSettings: true,
          storeHydration: true,
          edRbacWired: true,
        },
        organizationName,
      }),
    [organization, organizationName],
  );

  const radarData = assessment.modules.map((module) => ({
    domain: module.label.split(' ').slice(0, 2).join(' '),
    score: module.assessment.score,
    fullMark: 100,
  }));

  const selectedModule =
    assessment.modules.find((module) => module.id === selectedModuleId) || assessment.modules[0];

  const convergence = assessment.modules.find((m) => m.id === 'platform_convergence');

  return (
    <div className="pi-hub">
      <header className="pi-hero">
        <div>
          <p className="pi-eyebrow">Platform intelligence</p>
          <h1>{organizationName}</h1>
          <p>
            Prompts 117–136 — artifact registry, relationships, metadata, catalogs, lineage, KPI
            intelligence, operational graph, cross-domain analytics, forecasting readiness, reporting,
            tenant/track health, executive cockpit, federation, SaaS ops, integration/API governance,
            observability, technical debt, and platform convergence.
          </p>
        </div>
        <div className="pi-hero-scores">
          <div className="pi-score-card">
            <span>Intelligence readiness</span>
            <strong>{assessment.overallScore}</strong>
            <em className={statusClass(assessment.overallStatus)}>{assessment.overallStatus}</em>
          </div>
          <div className="pi-score-card">
            <span>Modules ready</span>
            <strong>
              {assessment.summary.readyModules}/{assessment.summary.moduleCount}
            </strong>
          </div>
        </div>
      </header>

      <section className="pi-summary" aria-label="Platform intelligence summary">
        <article>
          <span>KPIs passed</span>
          <strong>
            {assessment.summary.kpisPassed}/{assessment.summary.kpisTotal}
          </strong>
        </article>
        <article>
          <span>Convergence actions</span>
          <strong>{assessment.summary.convergenceActions?.length ?? 0}</strong>
        </article>
        <article>
          <span>Artifact types</span>
          <strong>12</strong>
        </article>
        <article>
          <span>API routes cataloged</span>
          <strong>{assessment.modules.find((m) => m.id === 'api_governance')?.assessment.artifacts.routeInventory ?? '—'}</strong>
        </article>
      </section>

      {convergence ? (
        <section className="pi-convergence-banner">
          <h2>Platform convergence (P136)</h2>
          <ul>
            {(convergence.assessment.artifacts.correctiveActions || []).map((action) => (
              <li key={action.id}>
                <strong>{action.action}</strong>
                <span>
                  {action.priority} · {action.owner}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pi-layout">
        <div className="pi-radar-panel">
          <h2>Module radar</h2>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="var(--panel-border)" />
              <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Radar dataKey="score" stroke="var(--app-accent-interactive)" fill="var(--app-accent-interactive)" fillOpacity={0.25} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="pi-module-grid" aria-label="Platform intelligence modules">
          {assessment.modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`pi-module-card ${selectedModule?.id === module.id ? 'active' : ''}`}
              onClick={() => setSelectedModuleId(module.id)}
            >
              <span>P{module.prompt}</span>
              <strong>{module.label}</strong>
              <em className={statusClass(module.assessment.status)}>{module.assessment.score}</em>
            </button>
          ))}
        </div>
      </section>

      {selectedModule ? <ModuleDetail module={selectedModule} /> : null}

      <section className="pi-links">
        <div>
          <h2>Related platforms</h2>
          <p>Underlying intelligence and governance surfaces.</p>
        </div>
        <div>
          <Link to="/enterprise-platform">Enterprise platform (99–116)</Link>
          <Link to="/data-lineage">Data lineage explorer</Link>
          <Link to="/executive">Executive command center</Link>
          <Link to="/customer-success">Customer success</Link>
        </div>
      </section>
    </div>
  );
}
