import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MetricCard } from '../../components/dashboard/DashboardVisualizations';
import { GraphicIconBadge } from '../../components/graphics/CdlGraphicKit';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  buildScenarioDebrief,
  getSimulationScenarioById,
} from '../../data/medicalSimulationCatalog';
import { recordSimulationRun } from '../../services/simulationScoringService';
import { DEMO_LIVE_STATES } from '../../utils/demoLiveState';
import './SimulationScenarioPlayer.css';

export default function SimulationScenarioPlayer() {
  const { scenarioId = 'sepsis-deterioration' } = useParams();
  const scenario = useMemo(
    () => getSimulationScenarioById(scenarioId) || getSimulationScenarioById('sepsis-deterioration'),
    [scenarioId],
  );
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [recordedRunId, setRecordedRunId] = useState<string | null>(null);
  const debrief = useMemo(
    () =>
      scenario && selectedActions.length
        ? buildScenarioDebrief(scenario, selectedActions)
        : null,
    [scenario, selectedActions],
  );

  function recordRun() {
    if (!scenario || !debrief) return;
    const run = recordSimulationRun(scenario, selectedActions, debrief);
    setRecordedRunId(run.runId);
  }

  function practiceAgain() {
    setSelectedActions([]);
    setRecordedRunId(null);
  }

  if (!scenario) {
    return (
      <main className="scenario-player-page">
        <h1>Simulation Scenario</h1>
        <p>Scenario not found in demo catalog.</p>
        <Link to={CANONICAL_ROUTES.simulation}>Back to simulation suite</Link>
      </main>
    );
  }

  function toggleAction(action: string) {
    setRecordedRunId(null);
    setSelectedActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );
  }

  return (
    <main className="scenario-player-page" aria-label={`${scenario.title} simulation scenario`}>
      <header className="scenario-player-page__header">
        <div className="scenario-player-page__title-row">
          <GraphicIconBadge iconKey="activity" accent="brand" size="md" />
          <div>
            <h1>{scenario.title}</h1>
            <p>{scenario.caseStem}</p>
          </div>
        </div>
        <div className="scenario-player-page__actions">
          <Link to={CANONICAL_ROUTES.simulation}>Simulation suite</Link>
          <Link to={CANONICAL_ROUTES.simulationOutcomes}>Outcomes</Link>
          <Link to={CANONICAL_ROUTES.laboratory}>Laboratory</Link>
        </div>
      </header>

      <StateSourceNotice
        title="Scenario source state"
        states={[DEMO_LIVE_STATES.DEMO, DEMO_LIVE_STATES.SIMULATED]}
        details={scenario.dataMode}
      />

      <div className="scenario-player-page__metrics" role="group" aria-label="Scenario summary metrics">
        <MetricCard label="Category" value={scenario.category} hint="Training domain" tone="neutral" />
        <MetricCard label="Difficulty" value={scenario.difficulty} hint="Scenario level" tone="neutral" />
        <MetricCard
          label="Duration"
          value={`${scenario.estimatedDurationMinutes}m`}
          hint="Estimated session"
          tone="neutral"
        />
        <MetricCard
          label="Actions selected"
          value={`${selectedActions.length}/${scenario.criticalActions.length}`}
          hint="Critical action checklist"
          tone={selectedActions.length === scenario.criticalActions.length ? 'good' : 'neutral'}
        />
      </div>

      <div className="scenario-player-page__layout">
        <section className="scenario-player-page__panel" aria-label="Patient vitals and labs">
          <h2>Vitals and labs</h2>
          <div className="scenario-player-page__vitals">
            {Object.entries(scenario.vitals as Record<string, string>).map(([key, value]) => (
              <span key={key}>
                {key}: {value}
              </span>
            ))}
          </div>
          <div className="scenario-player-page__labs">
            {scenario.labs.map((lab) => (
              <div key={lab.name} className="scenario-player-page__lab-row">
                <strong>{lab.name}</strong>
                <span>{lab.value}</span>
                <span className={lab.status === 'Critical' || lab.status === 'High' ? 'is-warning' : undefined}>
                  {lab.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="scenario-player-page__panel" aria-label="Critical action checklist">
          <h2>Critical actions</h2>
          <p>Select the actions you would take in the first response window.</p>
          <div className="scenario-player-page__checklist">
            {scenario.criticalActions.map((action) => {
              const selected = selectedActions.includes(action);
              return (
                <button
                  key={action}
                  type="button"
                  className={`scenario-player-page__check${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleAction(action)}
                  {...((selected) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
                >
                  {action}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="scenario-player-page__panel" aria-label="Decision prompts and integrations">
        <h2>Decision prompts</h2>
        <ul className="scenario-player-page__prompts">
          {scenario.decisionPrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
        <div className="scenario-player-page__integrations">
          {scenario.integrations.map((integration) => (
            <Link key={integration.label} to={integration.path}>
              {integration.label}
            </Link>
          ))}
        </div>
      </section>

      {debrief ? (
        <section className="scenario-player-page__panel scenario-player-page__debrief" aria-label="Scenario debrief">
          <h2>Demo debrief</h2>
          <p>{debrief.summary}</p>
          <div className="scenario-player-page__debrief-grid">
            <div>
              <strong>Safety score</strong>
              <span>{debrief.scores.safetyScore}</span>
            </div>
            <div>
              <strong>Missed actions</strong>
              <span>{debrief.missedCriticalActions.length}</span>
            </div>
            <div>
              <strong>AI tutor</strong>
              <span>{debrief.aiTutorFeedback}</span>
            </div>
          </div>
          {debrief.missedCriticalActions.length ? (
            <ul>
              {debrief.missedCriticalActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
          <div className="scenario-player-page__debrief-actions">
            {recordedRunId ? (
              <>
                <span className="scenario-player-page__recorded" data-testid="scenario-run-recorded">
                  Saved to your local practice history — stored only in this browser, never written to any
                  patient record or backend.
                </span>
                <button type="button" onClick={practiceAgain}>
                  Practice again
                </button>
              </>
            ) : (
              <button type="button" onClick={recordRun} data-testid="scenario-record-run">
                Save score to practice history
              </button>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}