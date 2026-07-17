import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  DEMO_SIMULATION_OUTCOMES,
  SIMULATION_SCENARIOS,
  getSimulationScenarioById,
} from '../../data/medicalSimulationCatalog';
import {
  clearSimulationRunHistory,
  computeCompetencyCoverage,
  computeRecommendedPractice,
  computeSimulationOutcomesSummary,
  computeWeakAreas,
  computeWeeklyTrend,
  listSimulationRuns,
} from '../../services/simulationScoringService';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildCompetencyCoverageChart,
  buildOutcomesTrendChart,
  buildSafetyTrendChart,
} from '../../utils/simulationChartModel';
import './SimulationOutcomes.css';

export default function SimulationOutcomes() {
  const [runsTick, setRunsTick] = useState(0);
  const runs = useMemo(() => listSimulationRuns(), [runsTick]);
  const hasRealRuns = runs.length > 0;

  const summary = useMemo(
    () =>
      hasRealRuns
        ? computeSimulationOutcomesSummary(runs, SIMULATION_SCENARIOS.length)
        : null,
    [hasRealRuns, runs],
  );
  const trend = useMemo(() => (hasRealRuns ? computeWeeklyTrend(runs) : null), [hasRealRuns, runs]);
  const coverage = useMemo(
    () => (hasRealRuns ? computeCompetencyCoverage(runs) : null),
    [hasRealRuns, runs],
  );
  const weakAreas = useMemo(() => (hasRealRuns ? computeWeakAreas(runs) : null), [hasRealRuns, runs]);
  const recommendedPractice = useMemo(
    () => (hasRealRuns ? computeRecommendedPractice(SIMULATION_SCENARIOS, runs) : null),
    [hasRealRuns, runs],
  );

  const outcomes = DEMO_SIMULATION_OUTCOMES;
  const completionChart = useMemo(
    () => (trend ? buildOutcomesTrendChart(trend) : buildOutcomesTrendChart()),
    [trend],
  );
  const safetyChart = useMemo(
    () => (trend ? buildSafetyTrendChart(trend) : buildSafetyTrendChart()),
    [trend],
  );
  const coverageChart = useMemo(
    () => (coverage ? buildCompetencyCoverageChart(coverage) : buildCompetencyCoverageChart()),
    [coverage],
  );

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
          {hasRealRuns ? (
            <button
              type="button"
              data-testid="clear-practice-history"
              onClick={() => {
                clearSimulationRunHistory();
                setRunsTick((n) => n + 1);
              }}
            >
              Clear practice history
            </button>
          ) : null}
        </div>
      </header>

      <StateSourceNotice
        title="Outcomes source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED, DEMO_LIVE_STATES.LOCAL_ONLY]}
        details={
          hasRealRuns
            ? `Your own recorded practice runs (${summary?.totalRuns}), stored only in this browser — not an official competency record.`
            : 'Demo-local outcome metrics for training review — not an official competency record. Complete a scenario to replace these with your own practice data.'
        }
      />

      <div className="simulation-outcomes-page__metrics" role="group" aria-label="Simulation outcomes summary metrics">
        <MetricCard
          label="Completion rate"
          value={`${hasRealRuns ? summary!.completionRate : outcomes.summary.completionRate}%`}
          hint={hasRealRuns ? 'Catalog scenarios you have practiced' : 'Demo cohort completion'}
          tone="good"
        />
        <MetricCard
          label="Safety score"
          value={String(hasRealRuns ? summary!.averageSafetyScore : outcomes.summary.safetyScore)}
          hint="Average scenario safety"
          tone="good"
        />
        <MetricCard
          label="Missed actions"
          value={String(hasRealRuns ? summary!.missedCriticalActions : outcomes.summary.missedCriticalActions)}
          hint="Across recent runs"
          tone={
            (hasRealRuns ? summary!.missedCriticalActions : outcomes.summary.missedCriticalActions) > 0
              ? 'warning'
              : 'good'
          }
        />
        {hasRealRuns ? (
          <MetricCard
            label="Practice runs"
            value={String(summary!.totalRuns)}
            hint="Recorded in this browser"
            tone="neutral"
          />
        ) : (
          <MetricCard
            label="Kirkpatrick"
            value={outcomes.summary.kirkpatrickLevel.replace('Level ', 'L')}
            hint="Learning level reached"
            tone="neutral"
          />
        )}
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
          {(hasRealRuns ? weakAreas! : outcomes.weakAreas).length ? (
            <ul>
              {(hasRealRuns ? weakAreas! : outcomes.weakAreas).map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          ) : (
            <p>No missed critical actions recorded yet.</p>
          )}
        </section>
        <section className="simulation-outcomes-page__panel" aria-label="Recommended practice">
          <h2>Recommended practice</h2>
          <div className="simulation-outcomes-page__links">
            {(hasRealRuns ? recommendedPractice! : outcomes.recommendedPractice).map((scenarioId) => {
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