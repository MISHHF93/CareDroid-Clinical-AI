import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildCareDroidBusinessBrain } from '../../data/caredroidBusinessBrain';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildBusinessBrainDomainChart,
  buildBusinessBrainRecommendationChart,
  businessBrainScoreTone,
  recommendationPriorityTone,
} from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './BusinessBrain.css';

export function CareDroidBusinessBrainPage() {
  useRouteChromeRegistration({ title: 'Business Brain' });
  const brain = useMemo(() => buildCareDroidBusinessBrain(), []);
  const domainChart = useMemo(
    () => buildBusinessBrainDomainChart(brain.analytics),
    [brain.analytics],
  );
  const recommendationChart = useMemo(
    () => buildBusinessBrainRecommendationChart(brain.recommendations),
    [brain.recommendations],
  );

  return (
    <main className="business-brain-page" aria-label="Business brain">
      <header className="business-brain-page__header">
        <div className="business-brain-page__title-row">
          <GraphicIconBadge iconKey="chart-bar" accent="brand" size="md" />
          <div>
            <p className="business-brain-page-title-text" data-testid="cd-page-title-text">
              Business Brain
            </p>
            <p>
              Platform and business analytics fused into expansion, retirement, merge, onboarding,
              and training advisories.
            </p>
          </div>
        </div>
        <div className="business-brain-page__actions">
          <Link to={CANONICAL_ROUTES.productIntelligence}>Product intelligence</Link>
          <Link to={CANONICAL_ROUTES.expansionOpportunities}>Expansion opportunities</Link>
          <Link to={CANONICAL_ROUTES.departmentIntelligence}>Department intelligence</Link>
          <Link to={CANONICAL_ROUTES.workflowMining}>Workflow mining</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Business brain source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo advisory layer aggregating product intelligence, expansion signals, department outcomes, and workflow mining friction."
      />

      <div
        className="business-brain-page__metrics"
        role="group"
        aria-label="Business brain summary metrics"
      >
        <MetricCard
          label="Avg score"
          value={String(brain.summary.averageBusinessScore)}
          hint="Analytic domains"
          tone={businessBrainScoreTone(brain.summary.averageBusinessScore)}
        />
        <MetricCard
          label="Domains"
          value={String(brain.summary.analyticDomainCount)}
          hint="Tracked areas"
          tone="neutral"
        />
        <MetricCard
          label="Recommendations"
          value={String(brain.summary.recommendationCount)}
          hint="Advisory motions"
          tone="neutral"
        />
        <MetricCard
          label="High priority"
          value={String(brain.summary.highPriorityCount)}
          hint="Score ≥ 80"
          tone="good"
        />
      </div>

      <div className="business-brain-page__charts">
        <VisualizationPanel
          title="Analytic domains"
          description="SaaS, organization, workspace, asset, AI, automation, and simulation scores."
          badge="Domains"
        >
          <CategoryBarChart
            data={domainChart}
            title="Analytic domains"
            color="var(--app-chart-1)"
            emptyMessage="Domain chart appears when analytics are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel
          title="Recommendation scores"
          description="Ranked advisory motions with evidence-backed priority."
          badge="Advisory"
        >
          <CategoryBarChart
            data={recommendationChart}
            title="Recommendation scores"
            color="var(--app-chart-4)"
            emptyMessage="Recommendation chart appears when advisories are registered."
          />
        </VisualizationPanel>
      </div>

      {brain.analytics.map((domain) => (
        <section key={domain.id} className="business-brain-page__panel" aria-label={domain.label}>
          <div className="business-brain-page__panel-head">
            <div>
              <h2>{domain.label}</h2>
              <ul className="business-brain-page__metrics-list">
                {domain.metrics.map((metric) => (
                  <li key={metric}>{metric}</li>
                ))}
              </ul>
            </div>
            <span
              className={`business-brain-page__pill business-brain-page__pill--${businessBrainScoreTone(domain.score)}`}
            >
              {domain.score}
            </span>
          </div>
        </section>
      ))}

      <section className="business-brain-page__panel" aria-label="Business recommendations">
        <h2>Business recommendations</h2>
        <div className="business-brain-page__table" role="table">
          <div className="business-brain-page__table-head" role="row">
            <span role="columnheader">Recommendation</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Score</span>
            <span role="columnheader">Action</span>
          </div>
          {brain.recommendations.map((item) => (
            <div key={item.id} className="business-brain-page__table-row" role="row">
              <span role="cell">{item.title}</span>
              <span role="cell">{item.type.replace(/_/g, ' ')}</span>
              <span role="cell">
                <span
                  className={`business-brain-page__pill business-brain-page__pill--${recommendationPriorityTone(item.priority)}`}
                >
                  {item.score}
                </span>
              </span>
              <span role="cell">{item.action}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default CareDroidBusinessBrainPage;
