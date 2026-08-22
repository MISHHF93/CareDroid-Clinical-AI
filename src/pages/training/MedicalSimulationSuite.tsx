import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard, VisualizationPanel } from '../../components/dashboard/DashboardVisualizations';
import { CategoryBarChart } from '../../components/dashboard/DashboardCharts';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import {
  getRecommendedSimulationScenarios,
  SIMULATION_SCENARIOS,
} from '../../data/medicalSimulationCatalog';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import {
  buildScenarioCategoryChart,
  buildScenarioDifficultyChart,
  SIMULATION_CATEGORY_COUNT,
} from '../../utils/simulationChartModel';
import './MedicalSimulationSuite.css';

export default function MedicalSimulationSuite() {
  useRouteChromeRegistration({ title: 'Medical Simulation Suite' });
  const [query, setQuery] = useState('');
  const recommended = useMemo(() => getRecommendedSimulationScenarios({ role: 'medical student' }), []);
  const categoryChart = useMemo(() => buildScenarioCategoryChart(), []);
  const difficultyChart = useMemo(() => buildScenarioDifficultyChart(), []);

  const filteredScenarios = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SIMULATION_SCENARIOS;
    return SIMULATION_SCENARIOS.filter(
      (scenario) =>
        scenario.title.toLowerCase().includes(normalized) ||
        scenario.category.toLowerCase().includes(normalized) ||
        scenario.specialty.toLowerCase().includes(normalized),
    );
  }, [query]);

  const avgDuration = Math.round(
    SIMULATION_SCENARIOS.reduce((sum, scenario) => sum + scenario.estimatedDurationMinutes, 0) /
      SIMULATION_SCENARIOS.length,
  );

  return (
    <main className="simulation-suite-page" aria-label="Medical simulation suite">
      <header className="simulation-suite-page__header">
        <div className="simulation-suite-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <p className="simulation-suite-page__title-text" data-testid="cd-page-title-text">Medical Simulation Suite</p>
            <p>Virtual patient cases, timed drills, team simulations, and AI-tutor-guided training scenarios.</p>
          </div>
        </div>
        <div className="simulation-suite-page__actions">
          <Link to={CANONICAL_ROUTES.simulationOutcomes}>Outcomes</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
          <Link to={CANONICAL_ROUTES.medical3dViewer}>3D viewer</Link>
          <Link to={CANONICAL_ROUTES.dashboard}>Command dashboard</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Simulation source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details="Demo training scenarios with no live patient side effects. Verify institutional competency records separately."
      />

      <div className="simulation-suite-page__metrics" role="group" aria-label="Simulation suite summary metrics">
        <MetricCard label="Scenarios" value={String(SIMULATION_SCENARIOS.length)} hint="Demo-ready catalog" tone="neutral" />
        <MetricCard label="Categories" value={String(SIMULATION_CATEGORY_COUNT)} hint="Training domains" tone="neutral" />
        <MetricCard label="Recommended" value={String(recommended.length)} hint="Role-scoped picks" tone="good" />
        <MetricCard label="Avg duration" value={`${avgDuration}m`} hint="Estimated session length" tone="neutral" />
      </div>

      <div className="simulation-suite-page__charts">
        <VisualizationPanel title="Scenario categories" description="Training catalog grouped by clinical domain." badge="Catalog">
          <CategoryBarChart
            data={categoryChart.slice(0, 8)}
            title="Scenario categories"
            color="var(--app-chart-1)"
            emptyMessage="Category chart appears when scenarios are registered."
          />
        </VisualizationPanel>
        <VisualizationPanel title="Difficulty mix" description="Beginner, intermediate, and advanced scenario distribution." badge="Levels">
          <CategoryBarChart
            data={difficultyChart}
            title="Difficulty mix"
            color="var(--app-chart-4)"
            emptyMessage="Difficulty chart appears when scenarios are registered."
          />
        </VisualizationPanel>
      </div>

      <input
        type="search"
        className="simulation-suite-page__search"
        placeholder="Search scenarios by title, category, or specialty…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search simulation scenarios"
      />

      <h2 className="simulation-suite-page__section-title">Recommended for training observers</h2>
      <div className="simulation-suite-page__grid">
        {recommended.map((scenario) => (
          <Link
            key={`rec-${scenario.id}`}
            to={`${CANONICAL_ROUTES.simulation}/${scenario.id}`}
            className="simulation-suite-page__card"
          >
            <strong>{scenario.title}</strong>
            <span>{scenario.category} · {scenario.difficulty}</span>
            <span>{scenario.estimatedDurationMinutes} min · {scenario.type.replace(/-/g, ' ')}</span>
          </Link>
        ))}
      </div>

      <h2 className="simulation-suite-page__section-title">All scenarios</h2>
      <div className="simulation-suite-page__grid">
        {filteredScenarios.length ? (
          filteredScenarios.map((scenario) => (
            <Link
              key={scenario.id}
              to={`${CANONICAL_ROUTES.simulation}/${scenario.id}`}
              className="simulation-suite-page__card"
            >
              <strong>{scenario.title}</strong>
              <span>{scenario.specialty}</span>
              <span>{scenario.category} · {scenario.difficulty} · {scenario.estimatedDurationMinutes} min</span>
            </Link>
          ))
        ) : (
          <p className="simulation-suite-page__empty">No scenarios match the current search.</p>
        )}
      </div>
    </main>
  );
}