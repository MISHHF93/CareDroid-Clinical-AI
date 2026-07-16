import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildCustomerExpansionOpportunities } from '../../data/customerExpansionEngine';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildExpansionScoreChart, expansionBandTone } from '../../utils/platformSaasChartModel';
import './CommercialIntelligence.css';

export function CustomerExpansionOpportunitiesPage() {
  const expansion = useMemo(() => buildCustomerExpansionOpportunities(), []);
  const scoreChart = useMemo(() => buildExpansionScoreChart(expansion.segments), [expansion.segments]);

  return (
    <main className="commercial-page" aria-label="Expansion opportunities">
      <header className="commercial-page__header">
        <div className="commercial-page__title-row">
          <GraphicIconBadge iconKey="send" accent="brand" size="md" />
          <div>
            <h1>Expansion Opportunities</h1>
            <p>Upsell, cross-sell, and evaluation motions with evidence-backed pack recommendations.</p>
          </div>
        </div>
        <div className="commercial-page__actions">
          <Link to={CANONICAL_ROUTES.productIntelligence}>Product intelligence</Link>
          <Link to={CANONICAL_ROUTES.maturityAssessment}>Maturity assessment</Link>
          <Link to={CANONICAL_ROUTES.organizationIntelligence}>Organization intelligence</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Expansion opportunities source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo customer expansion model segmented by hospital, university, and operations adoption patterns."
      />

      <div className="commercial-page__metrics" role="group" aria-label="Expansion summary metrics">
        <MetricCard label="Segments" value={String(expansion.summary.customerSegmentCount)} hint="Customer profiles" tone="neutral" />
        <MetricCard label="Opportunities" value={String(expansion.summary.opportunityCount)} hint="Pack recommendations" tone="neutral" />
        <MetricCard label="High confidence" value={String(expansion.summary.highConfidenceCount)} hint="Score ≥ 85" tone="good" />
        <MetricCard label="Unique packs" value={String(expansion.summary.recommendedPackCount)} hint="Recommended adds" tone="neutral" />
      </div>

      <div className="commercial-page__charts">
        <VisualizationPanel title="Opportunity scores" description="Recommended pack expansion scores by segment." badge="Scores">
          <CategoryBarChart data={scoreChart} title="Opportunity scores" color="var(--app-chart-1)" emptyMessage="Score chart appears when opportunities are registered." />
        </VisualizationPanel>
      </div>

      {expansion.segments.map((segment) => (
        <section key={segment.id} className="commercial-page__panel" aria-label={segment.segment}>
          <h2>{segment.segment}</h2>
          <p>{segment.summary}</p>
          <div className="commercial-page__table" role="table">
            <div className="commercial-page__table-head" role="row">
              <span role="columnheader">Pack</span>
              <span role="columnheader">Motion</span>
              <span role="columnheader">Score</span>
              <span role="columnheader">Outcome</span>
            </div>
            {segment.opportunities.map((opportunity) => (
              <div key={opportunity.id} className="commercial-page__table-row" role="row">
                <span role="cell">{opportunity.recommendedPack}</span>
                <span role="cell">{opportunity.motion}</span>
                <span role="cell">
                  <span className={`commercial-page__pill commercial-page__pill--${expansionBandTone(opportunity.band.id)}`}>
                    {opportunity.score}
                  </span>
                </span>
                <span role="cell">{opportunity.expectedOutcome}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default CustomerExpansionOpportunitiesPage;