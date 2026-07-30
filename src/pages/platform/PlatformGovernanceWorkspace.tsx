import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildPlatformGovernanceSurfaceView,
  inferPlatformGovernanceSurface,
} from '../../data/platformGovernanceSurfaces';
import { getPlatformSystemCapabilityByPath } from '../../data/platformSystems';
import { fetchPlatformGovernanceSurface } from '../../services/platformGovernanceApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildGovernancePanelChart,
  governancePanelTone,
  governanceSourceTone,
} from '../../utils/platformGovernanceChartModel';
import './PlatformGovernanceWorkspace.css';

const GOVERNANCE_ACTIONS = [
  { label: 'AI governance', route: CANONICAL_ROUTES.aiGovernance },
  { label: 'LLM security', route: CANONICAL_ROUTES.security },
  { label: 'Regulatory', route: '/regulatory' },
  { label: 'Human review', route: CANONICAL_ROUTES.humanReview },
  { label: 'Governance registry', route: CANONICAL_ROUTES.governanceRegistry },
  { label: 'Audit trail', route: CANONICAL_ROUTES.audit },
];

export default function PlatformGovernanceWorkspace() {
  const location = useLocation();
  const capability = getPlatformSystemCapabilityByPath(location.pathname);
  const surface = inferPlatformGovernanceSurface(location.pathname);
  const [state, setState] = useState<any>({ loading: true, error: '', data: null, sourceStatus: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '', data: null, sourceStatus: 'loading' });
    fetchPlatformGovernanceSurface(surface, location.pathname).then((response) => {
      if (cancelled) return;
      setState({
        loading: false,
        error: response.ok ? '' : response.message,
        data: response.data,
        sourceStatus: response.sourceStatus,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, surface]);

  const view = useMemo(
    () =>
      buildPlatformGovernanceSurfaceView({
        surface,
        pathname: location.pathname,
        apiData: state.data,
        sourceStatus: state.sourceStatus,
      }),
    [surface, location.pathname, state.data, state.sourceStatus],
  );
  const panelChart = useMemo(() => buildGovernancePanelChart(view.panels), [view.panels]);

  return (
    <main className="governance-workspace-page" aria-label={view.copy.title}>
      <header className="governance-workspace-page__header">
        <div className="governance-workspace-page__title-row">
          <GraphicIconBadge iconKey={view.copy.iconKey || 'shield-check'} accent="brand" size="md" />
          <div>
            <p className="governance-workspace-page__eyebrow">
              {capability?.criticality || 'P0'} platform governance
            </p>
            <h1>{view.copy.title || capability?.name}</h1>
            <p>{view.copy.summary || capability?.summary}</p>
          </div>
        </div>
        <div className="governance-workspace-page__actions">
          {GOVERNANCE_ACTIONS.map((action) => (
            <Link key={action.route} to={action.route}>
              {action.label}
            </Link>
          ))}
        </div>
      </header>

      {state.error ? <p className="governance-workspace-page__error">{state.error}</p> : null}

      <StateSourceNotice
        title="Governance and security source states"
        states={[
          DEMO_LIVE_STATES.LIVE,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Governance, security, regulatory, review, privacy, audit, and observability routes show the current source status. Demo or synthetic panels are review artifacts only; unavailable or unsupported controls should not be treated as active production enforcement."
      />

      <div className="governance-workspace-page__metrics" role="group" aria-label="Governance summary metrics">
        {view.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            tone={metric.tone as 'good' | 'warning' | 'critical' | 'neutral'}
          />
        ))}
      </div>

      <div className="governance-workspace-page__charts">
        <VisualizationPanel
          title="Control panel scores"
          description="Operational governance and security controls scored for review."
          badge="Panels"
        >
          <CategoryBarChart
            data={panelChart}
            title="Control panel scores"
            color="var(--app-chart-1)"
            emptyMessage="Panel chart appears when governance controls are registered."
          />
        </VisualizationPanel>
      </div>

      <section className="governance-workspace-page__panel" aria-labelledby="platform-dashboard-panels-title">
        <h2 id="platform-dashboard-panels-title">Dashboard Panels</h2>
        <p>Governance and security controls are split into reviewable operational panels.</p>
        <div className="governance-workspace-page__cards">
          {view.controls.map((control) => (
              <article className="governance-workspace-page__card" key={control.id}>
                <span className="governance-workspace-page__card-meta">{control.label}</span>
                <strong>{control.summary}</strong>
                <span className={`governance-workspace-page__pill governance-workspace-page__pill--${governancePanelTone(control.score)}`}>
                  Score {control.score}
                </span>
                <span>{control.detail.slice(0, 220)}</span>
              </article>
            ))}
        </div>
      </section>

      <section className="governance-workspace-page__panel" aria-labelledby="platform-decision-title">
        <h2 id="platform-decision-title">Human Review Gate</h2>
        <p>Approval, rejection, escalation, export, and writeback remain disabled until durable review records are approved.</p>
        <div className="governance-workspace-page__cards">
          <article className="governance-workspace-page__card">
            <strong>Governance decisioning</strong>
            <span>Every AI run is evaluated for missing governance, consent, validation, classification, or audit controls, logged to the audit trail, and always marked as requiring human review. Today only ambient-scribe drafting routes a missing-control decision to the review queue; other integration points record the decision but do not yet block the underlying action on it.</span>
          </article>
          <article className="governance-workspace-page__card">
            <strong>No autonomous action</strong>
            <span>CareDroid does not sign notes, place orders, write to an EHR, export PHI, or contact patients automatically.</span>
          </article>
        </div>
      </section>

      <section className="governance-workspace-page__panel" aria-label="Governance controls">
        <h2>Control registry</h2>
        <div className="governance-workspace-page__table" role="table">
          <div className="governance-workspace-page__table-head" role="row">
            <span role="columnheader">Control</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Evidence</span>
          </div>
          {view.controls.map((control) => (
              <div key={control.id} className="governance-workspace-page__table-row" role="row">
                <span role="cell">{control.label}</span>
                <span role="cell">
                  <span className={`governance-workspace-page__pill governance-workspace-page__pill--${governancePanelTone(control.score)}`}>
                    {control.summary}
                  </span>
                </span>
                <span role="cell">{control.detail}</span>
              </div>
            ))}
        </div>
        <p>
          Source status:{' '}
          <span className={`governance-workspace-page__pill governance-workspace-page__pill--${governanceSourceTone(state.sourceStatus)}`}>
            {state.sourceStatus}
          </span>
        </p>
      </section>
    </main>
  );
}