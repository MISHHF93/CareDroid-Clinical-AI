import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import {
  SIMULATION_CATEGORIES,
  SIMULATION_SCENARIOS,
  SIMULATION_SCENARIO_TYPES,
  getRecommendedSimulationScenarios,
} from '../data/medicalSimulationCatalog';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './SimulationLaboratoryViewer.css';

export default function MedicalSimulationSuite() {
  const { user } = useUser();
  const profile = useMemo(() => buildUserToolProfile({ user }), [user]);
  const recommendedScenarios = useMemo(() => getRecommendedSimulationScenarios(profile), [profile]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const filteredScenarios = useMemo(
    () =>
      SIMULATION_SCENARIOS.filter(
        (scenario) => categoryFilter === 'All' || scenario.category === categoryFilter
      ),
    [categoryFilter]
  );

  return (
    <main className="ops-demo-page simulation-suite">
      <section className="ops-demo-hero" aria-labelledby="simulation-title">
        <div className="ops-demo-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.training} size={34} />
        </div>
        <div>
          <p className="ops-demo-eyebrow">Demo training simulation - Not live patient data</p>
          <h1 id="simulation-title">Medical Simulation Suite</h1>
          <p>
            Structured simulation, competency, and debriefing workspace for virtual patient cases,
            timed drills, team scenarios, procedural checklists, and AI tutor-guided practice.
          </p>
        </div>
        <div className="ops-demo-actions">
          <Link className="ops-demo-primary-action" to="/simulation/outcomes">
            View outcomes
          </Link>
          <Link className="ops-demo-primary-action" to="/assistant">
            Ask AI Tutor
          </Link>
        </div>
      </section>

      <section className="ops-demo-grid ops-demo-grid--four" aria-label="Simulation status">
        <article className="ops-demo-metric">
          <span>Scenario library</span>
          <strong>{SIMULATION_SCENARIOS.length}</strong>
          <small>Demo cases across roles</small>
        </article>
        <article className="ops-demo-metric">
          <span>Categories</span>
          <strong>{SIMULATION_CATEGORIES.length}</strong>
          <small>Specialty and competency areas</small>
        </article>
        <article className="ops-demo-metric">
          <span>Scenario types</span>
          <strong>{SIMULATION_SCENARIO_TYPES.length}</strong>
          <small>Branching, timed, team, OSCE</small>
        </article>
        <article className="ops-demo-metric">
          <span>Profile recommendations</span>
          <strong>{recommendedScenarios.length}</strong>
          <small>{profile.role} role view</small>
        </article>
      </section>

      <section className="ops-demo-layout ops-demo-layout--wide">
        <div className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Scenario library</p>
              <h2>Launch structured simulation cases</h2>
            </div>
            <span className="ops-demo-badge">Demo cases</span>
          </div>
          <div className="ops-demo-chip-list" aria-label="Simulation categories">
            {['All', ...SIMULATION_CATEGORIES].map((category) => (
              <button
                key={category}
                type="button"
                className={category === categoryFilter ? 'is-active' : ''}
                onClick={() => setCategoryFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="ops-demo-card-grid ops-demo-card-grid--library">
            {filteredScenarios.map((scenario) => (
              <article key={scenario.id} className="ops-demo-select-card simulation-scenario-card">
                <div className="ops-demo-panel__header">
                  <strong>{scenario.title}</strong>
                  <span className="ops-demo-badge ops-demo-badge--warning">Demo/live: Demo</span>
                </div>
                <span>{scenario.id}</span>
                <p>{scenario.caseStem}</p>
                <div className="ops-demo-chip-list">
                  <span>{scenario.specialty}</span>
                  <span>{scenario.difficulty}</span>
                  <span>{scenario.estimatedDurationMinutes} min</span>
                  <span>{scenario.type}</span>
                </div>
                <small>Target roles: {scenario.targetRoles.join(', ')}</small>
                <ul className="ops-demo-list">
                  {scenario.learningObjectives.slice(0, 3).map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
                <div className="ops-demo-actions">
                  <Link className="ops-demo-primary-action" to={`/simulation/${scenario.id}`}>
                    Launch scenario
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Role-based view</p>
              <h2>Recommended for {profile.role}</h2>
            </div>
            <span className="ops-demo-badge">Profile segmentation</span>
          </div>
          <div className="ops-demo-stack">
            {recommendedScenarios.map((scenario) => (
              <Link
                key={scenario.id}
                className="ops-demo-mini-card ops-demo-link-card"
                to={`/simulation/${scenario.id}`}
              >
                <strong>{scenario.title}</strong>
                <span>{scenario.category} - {scenario.difficulty}</span>
                <small>{scenario.estimatedDurationMinutes} min - {scenario.type}</small>
              </Link>
            ))}
          </div>
          <h3>Scenario taxonomy</h3>
          <div className="ops-demo-chip-list">
            {SIMULATION_SCENARIO_TYPES.map((type) => <span key={type}>{type}</span>)}
          </div>
          <div className="ops-demo-debrief">
            <strong>AI tutor capabilities</strong>
            <p>
              The assistant can recommend scenarios, provide hints, explain missed actions, suggest
              calculators/tools, and generate debrief summaries from demo scenario state.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
