import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { buildWorkflowMiningReport } from '../../data/workflowMiningEngine';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import { buildWorkflowJourneyChart, buildWorkflowSignalChart } from '../../utils/platformSaasChartModel';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import './WorkflowMiningEngine.css';

export function WorkflowMiningEnginePage() {
  useRouteChromeRegistration({ title: 'Workflow Mining' });
  const report = useMemo(() => buildWorkflowMiningReport(), []);
  const signalChart = useMemo(() => buildWorkflowSignalChart(report.signalCounts), [report.signalCounts]);
  const journeyChart = useMemo(() => buildWorkflowJourneyChart(report.mostCommonUserJourneys), [report.mostCommonUserJourneys]);

  return (
    <main className="workflow-mining-page" aria-label="Workflow mining">
      <header className="workflow-mining-page__header">
        <div className="workflow-mining-page__title-row">
          <GraphicIconBadge iconKey="journey" accent="brand" size="md" />
          <div>
            <p className="workflow-mining-page-title-text" data-testid="cd-page-title-text">Workflow Mining</p>
            <p>Journey frequency, friction signals, dead ends, unnecessary clicks, and automation recommendations.</p>
          </div>
        </div>
        <div className="workflow-mining-page__actions">
          <Link to={CANONICAL_ROUTES.workflows}>Workflow builder</Link>
          <Link to={CANONICAL_ROUTES.workspaceDependencyGraph}>Workspace graph</Link>
          <Link to={CANONICAL_ROUTES.platformAnalytics}>Platform analytics</Link>
          <Link to={CANONICAL_ROUTES.operations}>Operations hub</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Workflow mining source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo journey mining from privacy-safe navigation signals — page transitions, AI launches, workflow launches, tool usage, and search behavior."
      />

      <div className="workflow-mining-page__metrics" role="group" aria-label="Workflow mining summary metrics">
        <MetricCard label="Journeys" value={String(report.summary.journeyCount)} hint="Ranked user paths" tone="neutral" />
        <MetricCard label="Events" value={String(report.summary.eventCount)} hint="Mining signals" tone="neutral" />
        <MetricCard label="Friction" value={String(report.summary.frictionCount)} hint="Bottleneck signals" tone="warning" />
        <MetricCard label="Dead ends" value={String(report.summary.deadEndCount)} hint="Incomplete paths" tone="warning" />
      </div>

      <div className="workflow-mining-page__charts">
        <VisualizationPanel title="Signal mix" description="Page transitions, AI launches, workflows, tools, and search behavior." badge="Signals">
          <CategoryBarChart
            data={signalChart}
            title="Signal mix"
            color="var(--app-chart-1)"
            emptyMessage="Signal chart appears when mining events are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Journey frequency" description="Most common user journeys ranked by occurrence." badge="Journeys">
          <CategoryBarChart
            data={journeyChart}
            title="Journey frequency"
            color="var(--app-chart-4)"
            emptyMessage="Journey chart appears when mining journeys are registered."
          />
        </VisualizationPanel>
      </div>

      {report.mostCommonUserJourneys.map((journey) => (
        <section key={journey.id} className="workflow-mining-page__panel" aria-label={journey.title}>
          <div className="workflow-mining-page__panel-head">
            <div>
              <h2>{journey.title}</h2>
              <p>{journey.frequency} occurrences · {journey.completionRate}% completion</p>
            </div>
          </div>
          <ol className="workflow-mining-page__steps">
            {journey.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="workflow-mining-page__signals">
            <div>
              <h3>Friction</h3>
              <ul>
                {journey.frictionSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Recommendations</h3>
              <ul>
                {journey.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

export default WorkflowMiningEnginePage;