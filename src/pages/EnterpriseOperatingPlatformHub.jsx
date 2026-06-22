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
import { buildEnterpriseOperatingPlatformAssessment } from '../config/enterpriseOperatingPlatformModel';
import { TRACKMIND_PERMISSION_KEYS } from '../config/trackMindPermissionRegistry';
import useTrackMindRolePermissions from '../hooks/useTrackMindRolePermissions';
import './EnterpriseOperatingPlatformHub.css';

function statusClass(status) {
  return `eop-status eop-status--${String(status || 'watch')}`;
}

function ModuleDetail({ module }) {
  const { assessment, description, relatedRoutes, prompt } = module;
  return (
    <article className="eop-detail">
      <header>
        <span>Prompt {prompt}</span>
        <h2>{assessment.label}</h2>
        <p>{description}</p>
        <div className="eop-detail-scores">
          <strong>{assessment.score}</strong>
          <em className={statusClass(assessment.status)}>{assessment.status}</em>
          <span>
            KPIs {assessment.passedKpis}/{assessment.totalKpis}
          </span>
        </div>
      </header>

      <div className="eop-kpi-row">
        {assessment.kpis.map((kpi) => (
          <div key={kpi.id} className={`eop-kpi-chip ${kpi.passes ? 'pass' : 'fail'}`}>
            <span>{kpi.label}</span>
            <strong>
              {kpi.value}
              {kpi.unit}
            </strong>
          </div>
        ))}
      </div>

      <div className="eop-artifacts">
        <h3>Artifacts</h3>
        <pre>{JSON.stringify(assessment.artifacts, null, 2)}</pre>
      </div>

      <div className="eop-related">
        {relatedRoutes.map((route) => (
          <Link key={route} to={route}>
            {route}
          </Link>
        ))}
      </div>
    </article>
  );
}

const EXECUTIVE_ENTERPRISE_MODULE_IDS = new Set([
  'strategy_planning',
  'portfolio_management',
  'executive_governance',
]);

export default function EnterpriseOperatingPlatformHub() {
  const trackMind = useTrackMindRolePermissions();
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
      buildEnterpriseOperatingPlatformAssessment({
        context: {
          organization,
          emergencyOs: organization?.settings?.emergencyOs,
          simulationsCompleted: 9,
          workflowsCompleted: 17,
        },
        signals: {
          emergencyApiAuthenticated: true,
          orgScopedSettings: true,
          storeHydration: true,
          edRbacWired: true,
          provisioned: true,
        },
        organizationName,
      }),
    [organization, organizationName],
  );

  const visibleModules = useMemo(() => {
    const K = TRACKMIND_PERMISSION_KEYS;
    return assessment.modules.filter((module) => {
      if (EXECUTIVE_ENTERPRISE_MODULE_IDS.has(module.id)) {
        return trackMind.can(K.executiveDashboardView) || trackMind.can(K.enterpriseView);
      }
      if (module.id === 'governance_esg' || module.id === 'enterprise_governance') {
        return trackMind.can(K.complianceEvidenceAttach) || trackMind.can(K.enterpriseView);
      }
      return trackMind.can(K.enterpriseView);
    });
  }, [assessment.modules, trackMind]);

  const radarData = visibleModules.map((module) => ({
    domain: module.label.split(' ').slice(0, 2).join(' '),
    score: module.assessment.score,
    fullMark: 100,
  }));

  const selectedModule =
    visibleModules.find((module) => module.id === selectedModuleId) ||
    visibleModules[0];

  return (
    <div className="eop-hub">
      <header className="eop-hero">
        <div>
          <p className="eop-eyebrow">TrackMind enterprise operating platform</p>
          <h1>{organizationName}</h1>
          <p>
            Prompts 99–116 — benchmarking, franchise readiness, certification, risk, continuity,
            disaster recovery, assets, workforce, training, knowledge, playbooks, decision support,
            scenarios, strategy, portfolio, governance, ESG, and architecture.
          </p>
        </div>
        <div className="eop-hero-scores">
          <div className="eop-score-card">
            <span>Platform readiness</span>
            <strong>{assessment.overallScore}</strong>
            <em className={statusClass(assessment.overallStatus)}>{assessment.overallStatus}</em>
          </div>
          <div className="eop-score-card">
            <span>Modules ready</span>
            <strong>
              {assessment.summary.readyModules}/{assessment.summary.moduleCount}
            </strong>
          </div>
        </div>
      </header>

      <section className="eop-summary" aria-label="Platform summary">
        <article>
          <span>KPIs passed</span>
          <strong>
            {assessment.summary.kpisPassed}/{assessment.summary.kpisTotal}
          </strong>
        </article>
        <article>
          <span>Watch / at-risk</span>
          <strong>{assessment.summary.watchOrAtRisk}</strong>
        </article>
        <article>
          <span>Lowest module</span>
          <strong>{assessment.summary.lowestModule?.assessment.label}</strong>
        </article>
        <article>
          <span>Highest module</span>
          <strong>{assessment.summary.highestModule?.assessment.label}</strong>
        </article>
      </section>

      <section className="eop-layout">
        <div className="eop-radar-panel">
          <h2>Module radar</h2>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="var(--panel-border)" />
              <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Radar
                dataKey="score"
                stroke="var(--app-accent-interactive)"
                fill="var(--app-accent-interactive)"
                fillOpacity={0.25}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="eop-module-grid" aria-label="Enterprise platform modules">
          {visibleModules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`eop-module-card ${selectedModule?.id === module.id ? 'active' : ''}`}
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

      <section className="eop-links">
        <div>
          <h2>Related platforms</h2>
          <p>Drill into underlying maturity, success, and readiness surfaces.</p>
        </div>
        <div>
          <Link to="/trackmind-maturity">TrackMind maturity</Link>
          <Link to="/customer-success">Customer success</Link>
          <Link to="/enterprise-readiness">Enterprise readiness</Link>
          <Link to="/governance-registry">Governance registry</Link>
        </div>
      </section>
    </div>
  );
}
