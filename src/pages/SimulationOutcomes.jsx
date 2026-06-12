import { Link } from 'react-router-dom';
import StateSourceNotice from '../components/StateSourceNotice';
import {
  DEMO_SIMULATION_OUTCOMES,
  SIMULATION_OUTCOME_METRICS,
  getSimulationScenarioById,
} from '../data/medicalSimulationCatalog';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './SimulationLaboratoryViewer.css';

export default function SimulationOutcomes() {
  const outcomes = DEMO_SIMULATION_OUTCOMES;
  const recommended = outcomes.recommendedPractice.map(getSimulationScenarioById).filter(Boolean);

  return (
    <section className="ops-demo-page simulation-outcomes">
      <section className="ops-demo-hero" aria-labelledby="simulation-outcomes-title">
        <div className="ops-demo-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.barChart} size={34} />
        </div>
        <div>
          <p className="ops-demo-eyebrow">Demo outcomes dashboard - Local simulation state</p>
          <h1 id="simulation-outcomes-title">Simulation Outcomes</h1>
          <p>
            Track completion, competency coverage, weak areas, debrief quality, and recommended
            practice without using live learner or patient data.
          </p>
        </div>
        <Link className="ops-demo-primary-action" to="/simulation">
          Open scenario library
        </Link>
      </section>

      <StateSourceNotice
        title="Simulation outcomes source states"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Completion, competency, weak-area, and recommendation metrics are demo outcomes from local simulation state. Live learner analytics and institutional LMS writes are unsupported."
      />

      <section className="ops-demo-grid ops-demo-grid--four" aria-label="Simulation outcome metrics">
        <article className="ops-demo-metric">
          <span>Completion rate</span>
          <strong>{outcomes.summary.completionRate}%</strong>
          <small>Scenario completion trends</small>
        </article>
        <article className="ops-demo-metric">
          <span>Safety score</span>
          <strong>{outcomes.summary.safetyScore}</strong>
          <small>Critical action quality</small>
        </article>
        <article className="ops-demo-metric">
          <span>Diagnostic accuracy</span>
          <strong>{outcomes.summary.diagnosticAccuracy}%</strong>
          <small>Demo learner progress</small>
        </article>
        <article className="ops-demo-metric">
          <span>Kirkpatrick level</span>
          <strong>2</strong>
          <small>{outcomes.summary.kirkpatrickLevel}</small>
        </article>
      </section>

      <section className="ops-demo-layout">
        <div className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Learner progress</p>
              <h2>Completion and safety trends</h2>
            </div>
            <span className="ops-demo-badge">{outcomes.sourceStatus}</span>
          </div>
          <div className="ops-demo-trend-grid">
            {outcomes.trends.map((trend) => (
              <article key={trend.label} className="ops-demo-mini-card">
                <strong>{trend.label}</strong>
                <span>{trend.completions} completions</span>
                <div className="ops-demo-progress" aria-label={`${trend.label} safety score`}>
                  <span style={{ width: `${trend.safetyScore}%` }} />
                </div>
                <small>Safety score {trend.safetyScore}</small>
              </article>
            ))}
          </div>

          <h2>Competency coverage</h2>
          <div className="ops-demo-stack">
            {outcomes.competencyCoverage.map((item) => (
              <article key={item.competency} className="ops-demo-mini-card">
                <strong>{item.competency}</strong>
                <div className="ops-demo-progress" aria-label={`${item.competency} competency coverage`}>
                  <span style={{ width: `${item.coverage}%` }} />
                </div>
                <small>{item.coverage}% coverage</small>
              </article>
            ))}
          </div>
        </div>

        <aside className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Competency dashboard</p>
              <h2>Weak areas and practice plan</h2>
            </div>
          </div>
          <h3>Tracked metrics</h3>
          <div className="ops-demo-chip-list">
            {SIMULATION_OUTCOME_METRICS.map((metric) => <span key={metric}>{metric}</span>)}
          </div>
          <h3>Weak areas</h3>
          <ul className="ops-demo-list">
            {outcomes.weakAreas.map((area) => <li key={area}>{area}</li>)}
          </ul>
          <h3>Recommended practice</h3>
          <div className="ops-demo-stack">
            {recommended.map((scenario) => (
              <Link
                key={scenario.id}
                className="ops-demo-mini-card ops-demo-link-card"
                to={`/simulation/${scenario.id}`}
              >
                <strong>{scenario.title}</strong>
                <span>{scenario.category} - {scenario.difficulty}</span>
                <small>{scenario.type}</small>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </section>
  );
}
