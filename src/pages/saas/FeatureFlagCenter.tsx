import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { FEATURE_FLAG_STATE_LABELS } from '../../config/featureFlags.config';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildFeatureFlagCategoryChart,
  buildFeatureFlagCenterView,
  buildFeatureFlagStateChart,
  cycleFeatureFlagState,
  featureFlagStateTone,
  loadFeatureFlagCenterOverrides,
  saveFeatureFlagCenterOverrides,
} from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './FeatureFlagCenter.css';

export default function FeatureFlagCenter() {
  useRouteChromeRegistration({ title: 'Feature Flag Center' });
  const [overrides, setOverrides] = useState(() => loadFeatureFlagCenterOverrides());
  const view = useMemo(() => buildFeatureFlagCenterView(overrides), [overrides]);
  const categoryChart = useMemo(() => buildFeatureFlagCategoryChart(view.summary.categoryCounts), [view.summary]);
  const stateChart = useMemo(() => buildFeatureFlagStateChart(view.summary.stateCounts), [view.summary]);

  const toggleFlag = (flagId: string, currentState: string) => {
    const nextState = cycleFeatureFlagState(currentState);
    const nextOverrides = { ...overrides, [flagId]: nextState };
    saveFeatureFlagCenterOverrides(nextOverrides);
    setOverrides(nextOverrides);
  };

  return (
    <main className="feature-flag-page" aria-label="Feature flag center">
      <header className="feature-flag-page__header">
        <div className="feature-flag-page__title-row">
          <GraphicIconBadge iconKey="settings" accent="brand" size="md" />
          <div>
            <p className="feature-flag-page-title-text" data-testid="cd-page-title-text">Feature Flag Center</p>
            <p>Rollout registry for AI, tools, simulation, fleet, IoT, and governance capability packs.</p>
          </div>
        </div>
        <div className="feature-flag-page__actions">
          <Link to={CANONICAL_ROUTES.plugins}>Plugin marketplace</Link>
          <Link to={CANONICAL_ROUTES.dependencyMap}>Wiring map</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Feature flag source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Canonical rollout registry with browser-local overrides for demo tenant simulation. Production org flags sync via organization settings API."
      />

      <div className="feature-flag-page__metrics" role="group" aria-label="Feature flag summary metrics">
        <MetricCard label="Total flags" value={String(view.summary.total)} hint="Registry entries" tone="neutral" />
        <MetricCard label="Live rollout" value={String(view.summary.liveRolloutCount)} hint="Enabled, beta, experimental" tone="good" />
        <MetricCard label="Unavailable" value={String(view.summary.unavailableCount)} hint="Disabled, locked, admin-only" tone="warning" />
        <MetricCard label="Categories" value={String(Object.keys(view.summary.categoryCounts).length)} hint="Rollout domains" tone="neutral" />
      </div>

      <div className="feature-flag-page__charts">
        <VisualizationPanel title="Category mix" description="Feature flags grouped by rollout domain." badge="Categories">
          <CategoryBarChart
            data={categoryChart}
            title="Category mix"
            color="var(--app-chart-1)"
            emptyMessage="Category chart appears when flags are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="State mix" description="Enabled, beta, experimental, admin-only, and locked states." badge="States">
          <CategoryBarChart
            data={stateChart.filter((row) => row.value > 0)}
            title="State mix"
            color="var(--app-chart-4)"
            emptyMessage="State chart appears when flags are registered."
          />
        </VisualizationPanel>
      </div>

      {view.categories.map((group) => (
        <section key={group.category} className="feature-flag-page__panel" aria-label={`${group.category} flags`}>
          <h2>{group.category}</h2>
          <div className="feature-flag-page__table" role="table" aria-label={`${group.category} feature flags`}>
            <div className="feature-flag-page__table-head" role="row">
              <span role="columnheader">Flag</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">Assets</span>
              <span role="columnheader">State</span>
              <span role="columnheader">Actions</span>
            </div>
            {group.flags.map((flag) => (
              <div key={flag.id} className="feature-flag-page__table-row" role="row">
                <span role="cell">
                  <strong>{flag.name}</strong>
                  <span className="feature-flag-page__sub">{flag.description}</span>
                </span>
                <span role="cell">{flag.owner}</span>
                <span role="cell">{flag.assetIds.length}</span>
                <span role="cell">
                  <span className={`feature-flag-page__pill feature-flag-page__pill--${featureFlagStateTone(flag.state)}`}>
                    {FEATURE_FLAG_STATE_LABELS[flag.state] || flag.state}
                  </span>
                </span>
                <span role="cell" className="feature-flag-page__actions-cell">
                  <button type="button" onClick={() => toggleFlag(flag.id, flag.state)}>
                    Cycle state
                  </button>
                  <Link to={flag.route}>Open</Link>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}