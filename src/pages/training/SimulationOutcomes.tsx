import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CategoryBarChart,
  MetricCard,
  VisualizationPanel,
} from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEMO_SIMULATION_OUTCOMES, getSimulationScenarioById } from '../../data/medicalSimulationCatalog';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildCompetencyCoverageChart,
  buildOutcomesTrendChart,
  buildSafetyTrendChart,
} from '../../utils/simulationChartModel';
import './SimulationOutcomes.css';

export default function SimulationOutcomes() {
  const outcomes = DEMO_SIMULATION_OUTCOMES;
  const completionChart = useMemo(() => buildOutcomesTrendChart(), []);
  const safetyChart = useMemo(() => buildSafetyTrendChart(), []);
  const coverageChart = useMemo(() => buildCompetencyCoverageChart(), []);

  return (
    <main className="simulation-outcomes-page" aria-label="Simulation outcomes">
      <header className="simulation-outcomes-page__header">
        <div className="simulation-outcomes-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <h1>Simulation Outcomes</h1>
            <p>Completion trends, safety scores, competency coverage, and recommended practice scenarios.</p>
          </div>
        </div>
        <div className="simulation-outcomes-page__actions">
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to="/competencies">Competencies</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Outcomes source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details="Demo-local outcome metrics for training review — not an official competency record."
      />

      <div className="simulation-outcomes-page__metrics" role="group" aria-label="Simulation outcomes summary metrics">
        <MetricCard
          label="Completion rate"
          value={`${outcomes.summary.completionRate}%`}
          hint="Demo cohort completion"
          tone="good"
        />
        <MetricCard
          label="Safety score"
          value={String(outcomes.summary.safetyScore)}
          hint="Average scenario safety"
          tone="good"
        />
        <MetricCard
          label="Missed actions"
          value={String(outcomes.summary.missedCriticalActions)}
          hint="Across recent runs"
          tone={outcomes.summary.missedCriticalActions > 0 ? 'warning' : 'good'}
        />
        <MetricCard
          label="Kirkpatrick"
          value={outcomes.summary.kirkpatrickLevel.replace('Level ', 'L')}
          hint="Learning level reached"
          tone="neutral"
        />
      </div>

      <div className="simulation-outcomes-page__charts">
        <VisualizationPanel title="Weekly completions" description="Demo completion volume by training week." badge="Trend">
          <CategoryBarChart
            data={completionChart}
            title="Weekly completions"
            color="var(--app-chart-1)"
            emptyMessage="Completion trend appears when outcome history is available."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Safety trend" description="Average safety score movement across demo weeks." badge="Safety">
          <CategoryBarChart
            data={safetyChart}
            title="Safety trend"
            color="var(--app-chart-2)"
            emptyMessage="Safety trend appears when outcome history is available."
          />
        </VisualizationPanel>
      </div>

      <VisualizationPanel
        title="Competency coverage"
        description="How demo simulation practice maps to competency domains."
        badge="Coverage"
      >
        <CategoryBarChart
          data={coverageChart}
          title="Competency coverage"
          color="var(--app-chart-4)"
          emptyMessage="Coverage chart appears when competency mapping is available."
        />
      </VisualizationPanel>

      <div className="simulation-outcomes-page__panels">
        <section className="simulation-outcomes-page__panel" aria-label="Weak practice areas">
          <h2>Weak areas</h2>
          <ul>
            {outcomes.weakAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </section>
        <section className="simulation-outcomes-page__panel" aria-label="Recommended practice">
          <h2>Recommended practice</h2>
          <div className="simulation-outcomes-page__links">
            {outcomes.recommendedPractice.map((scenarioId) => {
              const scenario = getSimulationScenarioById(scenarioId);
              return (
                <Link key={scenarioId} to={`${CANONICAL_ROUTES.simulation}/${scenarioId}`}>
                  {scenario?.title || scenarioId}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}