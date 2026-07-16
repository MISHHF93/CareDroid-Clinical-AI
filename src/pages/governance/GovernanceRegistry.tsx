import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildGovernanceRiskChart,
  buildLocalGovernanceRegistryFallback,
  governanceRiskTone,
  type GovernanceRegistrySnapshot,
} from '../../utils/platformSaasChartModel';
import './GovernanceRegistry.css';

export default function GovernanceRegistry() {
  const fallback = useMemo(() => buildLocalGovernanceRegistryFallback(), []);
  const [registry, setRegistry] = useState<GovernanceRegistrySnapshot>(fallback);
  const [sourceState, setSourceState] = useState<
    typeof DEMO_LIVE_STATES.DEMO | typeof DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
  >(DEMO_LIVE_STATES.DEMO);

  useEffect(() => {
    let cancelled = false;

    PlatformAssetsApi.getGovernanceRegistry()
      .then((payload) => {
        if (cancelled || !payload) return;
        setRegistry(payload as GovernanceRegistrySnapshot);
        setSourceState(DEMO_LIVE_STATES.DEMO);
      })
      .catch(() => {
        if (cancelled) return;
        setRegistry(fallback);
        setSourceState(DEMO_LIVE_STATES.BACKEND_UNAVAILABLE);
      });

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  const riskChart = useMemo(() => buildGovernanceRiskChart(registry), [registry]);

  return (
    <main className="governance-registry-page" aria-label="Platform governance registry">
      <header className="governance-registry-page__header">
        <div className="governance-registry-page__title-row">
          <GraphicIconBadge iconKey="shield-check" accent="brand" size="md" />
          <div>
            <h1>Platform Governance Registry</h1>
            <p>Stewardship metadata, risk classification, audit requirements, and review schedules.</p>
          </div>
        </div>
        <div className="governance-registry-page__actions">
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.plugins}>Plugin marketplace</Link>
          <Link to={CANONICAL_ROUTES.aiGovernance}>AI governance</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Governance registry source state"
        states={
          sourceState === DEMO_LIVE_STATES.BACKEND_UNAVAILABLE
            ? [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.BACKEND_UNAVAILABLE]
            : [DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LIVE]
        }
        details="Loads governed asset rows from platform assets API with local inventory fallback when backend is unavailable."
      />

      <div className="governance-registry-page__metrics" role="group" aria-label="Governance registry summary metrics">
        <MetricCard label="Total assets" value={String(registry.summary.totalAssets)} hint="Registry rows" tone="neutral" />
        <MetricCard
          label="Complete"
          value={String(registry.summary.complete)}
          hint={`${registry.summary.incomplete} incomplete`}
          tone={registry.summary.incomplete > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Audit required"
          value={String(registry.summary.auditRequired)}
          hint="Governed audit trail"
          tone="neutral"
        />
        <MetricCard
          label="Human review"
          value={String(registry.summary.humanReviewRequired)}
          hint="Clinical or high-risk assets"
          tone={registry.summary.humanReviewRequired > 0 ? 'warning' : 'good'}
        />
      </div>

      <div className="governance-registry-page__charts">
        <VisualizationPanel
          title="Risk level distribution"
          description="Assets grouped by clinical and operational risk classification."
          badge="Risk"
        >
          <CategoryBarChart
            data={riskChart}
            title="Risk level distribution"
            color="var(--app-chart-1)"
            emptyMessage="Risk chart appears when registry rows are loaded."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Required fields"
          description="Metadata fields required for complete stewardship records."
          badge="Fields"
        >
          <ul className="governance-registry-page__field-list">
            {registry.requiredFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </VisualizationPanel>
      </div>

      <section className="governance-registry-page__panel" aria-label="Governed assets">
        <h2>Governed assets</h2>
        <p>Owner, steward, approver, evidence source, and review cadence for platform capabilities.</p>
        <div className="governance-registry-page__table" role="table" aria-label="Governed assets table">
          <div className="governance-registry-page__table-head" role="row">
            <span role="columnheader">Asset</span>
            <span role="columnheader">Owner</span>
            <span role="columnheader">Steward</span>
            <span role="columnheader">Risk</span>
            <span role="columnheader">Review</span>
          </div>
          {registry.rows.map((row) => (
            <div key={row.assetId} className="governance-registry-page__table-row" role="row">
              <span role="cell">
                <strong>{row.title}</strong>
                <span className="governance-registry-page__sub">{row.assetId}</span>
              </span>
              <span role="cell">{row.owner}</span>
              <span role="cell">{row.steward}</span>
              <span
                role="cell"
                className={`governance-registry-page__pill governance-registry-page__pill--${governanceRiskTone(row.riskLevel)}`}
              >
                {row.riskLevel}
              </span>
              <span role="cell">{row.reviewSchedule}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}