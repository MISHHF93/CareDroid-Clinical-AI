import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ContextInsightCard from '../components/ContextInsightCard';
import StateSourceNotice from '../components/StateSourceNotice';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildRoleIntelligenceProfile } from '../data/roleIntelligenceLayer';
import {
  buildDemoSimulationRun,
  buildScenarioDebrief,
  getSimulationScenarioById,
  SIMULATION_SCENARIOS,
} from '../data/medicalSimulationCatalog';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { trackRoleSimulationCompleted } from '../services/roleIntelligenceTelemetry';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './SimulationLaboratoryViewer.css';

export default function SimulationScenarioPlayer() {
  const { scenarioId } = useParams();
  const { user } = useUser();
  const { account, preferences, activeWorkspace, workspaceState, platformContext, roleProfile } = useUserIdentity();
  const scenario = getSimulationScenarioById(scenarioId) || SIMULATION_SCENARIOS[0];
  const [run, setRun] = useState(() => buildDemoSimulationRun(scenario.id));
  const [decisionText, setDecisionText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [selectedActions, setSelectedActions] = useState([]);
  const debrief = useMemo(
    () => (run.status === 'completed' ? buildScenarioDebrief(scenario, selectedActions) : null),
    [run.status, scenario, selectedActions]
  );
  const roleIntelligenceProfile = useMemo(
    () =>
      buildRoleIntelligenceProfile({
        account,
        user,
        preferences,
        activeWorkspace,
        workspaceState,
        platformContext,
        roleProfile,
      }),
    [account, activeWorkspace, platformContext, preferences, roleProfile, user, workspaceState]
  );
  const progress = Math.round((selectedActions.length / scenario.criticalActions.length) * 100);

  const toggleAction = (action) => {
    setSelectedActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action]
    );
  };

  const submitDecision = () => {
    setRun((current) => ({
      ...current,
      status: 'decision-submitted',
      lastDecision: decisionText || 'No free-text decision entered; checklist state submitted.',
    }));
  };

  const completeScenario = () => {
    const completionDebrief = buildScenarioDebrief(scenario, selectedActions);
    trackRoleSimulationCompleted({
      profile: roleIntelligenceProfile,
      scenarioId: scenario.id,
      progress,
      safetyScore: completionDebrief.scores.safetyScore,
      selectedActionCount: selectedActions.length,
      criticalActionCount: scenario.criticalActions.length,
    });
    setRun((current) => ({
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }));
  };

  return (
    <section className="ops-demo-page simulation-player">
      <section className="ops-demo-hero" aria-labelledby="simulation-player-title">
        <div className="ops-demo-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.trophy} size={34} />
        </div>
        <div>
          <p className="ops-demo-eyebrow">{scenario.dataMode}</p>
          <h1 id="simulation-player-title">{scenario.title}</h1>
          <p>{scenario.caseStem}</p>
        </div>
        <Link className="ops-demo-primary-action" to="/simulation">
          Back to library
        </Link>
      </section>

      <StateSourceNotice
        title="Scenario player source states"
        states={[
          DEMO_LIVE_STATES.SIMULATED,
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Patient vitals, labs, timeline events, checklist state, demo tutor hints, and debriefs are simulated training content. Submitted decisions remain local and do not trigger real clinical workflows or external escalation."
      />

      <section className="ops-demo-insights" aria-label="Simulation context insights">
        <ContextInsightCard
          title="Recommended scenario"
          message={`${scenario.title} is selected for ${roleIntelligenceProfile.roleLabel || 'the current role'}.`}
          source="Role profile"
          status="demo"
          demo
          actionLabel="Back to library"
          actionRoute="/simulation"
        />
        <ContextInsightCard
          title={
            run.status === 'completed'
              ? 'Debrief ready'
              : `${scenario.criticalActions.length - selectedActions.length} incomplete action(s)`
          }
          message={
            run.status === 'completed'
              ? 'Review the local structured debrief before using results for training records.'
              : 'Complete critical actions or submit a decision before debrief.'
          }
          source="Local simulation run"
          status={run.status === 'completed' ? 'generated' : 'action-required'}
          actionLabel={run.status === 'completed' ? 'View outcomes' : 'Complete scenario'}
          actionRoute={run.status === 'completed' ? '/simulation/outcomes' : '/simulation'}
        />
        <ContextInsightCard
          title="Training source"
          message="Scenario decisions and hints remain local and do not trigger clinical workflows."
          source="Simulated content"
          status="demo"
          demo
          actionLabel="Open Assistant"
          actionRoute="/assistant"
        />
      </section>

      <section className="ops-demo-grid ops-demo-grid--four" aria-label="Scenario progress">
        <article className="ops-demo-metric">
          <span>Status</span>
          <strong>{run.status}</strong>
          <small>{run.sourceStatus}</small>
        </article>
        <article className="ops-demo-metric">
          <span>Timer</span>
          <strong>{scenario.estimatedDurationMinutes}:00</strong>
          <small>Demo target duration</small>
        </article>
        <article className="ops-demo-metric">
          <span>Critical actions</span>
          <strong>{selectedActions.length}/{scenario.criticalActions.length}</strong>
          <small>Checklist progress</small>
        </article>
        <article className="ops-demo-metric">
          <span>Progress</span>
          <strong>{progress}%</strong>
          <small>Local run tracker</small>
        </article>
      </section>

      <section className="ops-demo-layout ops-demo-layout--wide">
        <div className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Prebrief and case stem</p>
              <h2>Simulation player</h2>
            </div>
            <span className="ops-demo-badge">{scenario.type}</span>
          </div>
          <div className="ops-demo-card-grid">
            <article className="ops-demo-mini-card">
              <strong>Learning objectives</strong>
              <ul className="ops-demo-list">
                {scenario.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </article>
            <article className="ops-demo-mini-card">
              <strong>Available tools</strong>
              <div className="ops-demo-chip-list">
                {scenario.requiredTools.map((tool) => <span key={tool}>{tool}</span>)}
              </div>
            </article>
          </div>

          <div className="ops-demo-card-grid">
            <article className="ops-demo-mini-card">
              <strong>Patient vitals</strong>
              <div className="ops-demo-vitals-grid">
                {Object.entries(scenario.vitals).map(([key, value]) => (
                  <span key={key}><b>{key}</b>{value}</span>
                ))}
              </div>
            </article>
            <article className="ops-demo-mini-card">
              <strong>Labs</strong>
              <div className="ops-demo-stack">
                {scenario.labs.map((lab) => (
                  <span key={lab.name}>{lab.name}: {lab.value} ({lab.status})</span>
                ))}
              </div>
            </article>
          </div>

          <article className="ops-demo-mini-card">
            <strong>Timeline</strong>
            <ol className="ops-demo-list">
              {scenario.timeline.map((event) => <li key={event}>{event}</li>)}
            </ol>
          </article>

          <article className="ops-demo-mini-card">
            <strong>Decision prompts</strong>
            <ul className="ops-demo-list">
              {scenario.decisionPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
            </ul>
            <label className="ops-demo-field">
              Submit decision
              <textarea
                value={decisionText}
                onChange={(event) => setDecisionText(event.target.value)}
                placeholder="Document your next action, rationale, and escalation plan."
              />
            </label>
            <div className="ops-demo-actions">
              <button type="button" onClick={() => setShowHint((value) => !value)}>
                Demo tutor hint
              </button>
              <button type="button" onClick={submitDecision}>
                Submit decision
              </button>
              <button type="button" onClick={completeScenario}>
                Complete scenario
              </button>
            </div>
            {showHint && (
              <div className="ops-demo-debrief">
                <strong>Demo tutor hint</strong>
                <p>
                  Prioritize the most time-sensitive safety risk, verify objective data, and use
                  closed-loop communication before moving to secondary tasks.
                </p>
              </div>
            )}
          </article>
        </div>

        <aside className="ops-demo-panel">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Critical action checklist</p>
              <h2>Safety actions</h2>
            </div>
            <span className="ops-demo-badge">{progress}%</span>
          </div>
          <div className="ops-demo-progress" aria-label="Scenario progress tracker">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="ops-demo-stack">
            {scenario.criticalActions.map((action) => (
              <label key={action} className="ops-demo-check">
                <input
                  type="checkbox"
                  checked={selectedActions.includes(action)}
                  onChange={() => toggleAction(action)}
                />
                <span>{action}</span>
              </label>
            ))}
          </div>
          <h3>Connected modules</h3>
          <div className="ops-demo-stack">
            {scenario.integrations.map((integration) => (
              <Link key={integration.path} className="ops-demo-mini-card ops-demo-link-card" to={integration.path}>
                <strong>{integration.label}</strong>
                <small>{integration.toolId}</small>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      {debrief && (
        <section className="ops-demo-panel simulation-debrief" aria-label="Scenario debrief">
          <div className="ops-demo-panel__header">
            <div>
              <p className="ops-demo-eyebrow">Structured debrief</p>
              <h2>Debrief summary</h2>
            </div>
            <Link className="ops-demo-primary-action" to="/simulation/outcomes">
              View outcomes
            </Link>
          </div>
          <div className="ops-demo-grid ops-demo-grid--four">
            <article className="ops-demo-mini-card"><strong>What happened</strong><span>{debrief.summary}</span></article>
            <article className="ops-demo-mini-card"><strong>What went well</strong><span>{debrief.correctActions.join(', ') || 'No critical actions selected yet.'}</span></article>
            <article className="ops-demo-mini-card"><strong>What could improve</strong><span>{debrief.missedCriticalActions.join(', ') || 'No missed critical actions.'}</span></article>
            <article className="ops-demo-mini-card"><strong>What to do next</strong><span>{debrief.nextRecommendedScenarios.map((item) => item.title).join(', ')}</span></article>
          </div>
          <div className="ops-demo-card-grid">
            <article className="ops-demo-mini-card">
              <strong>Safety risks</strong>
              <ul className="ops-demo-list">{debrief.safetyRisks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
            </article>
            <article className="ops-demo-mini-card">
              <strong>Demo tutor feedback</strong>
              <span>{debrief.aiTutorFeedback}</span>
              <small>Time to critical action: {debrief.timeToCriticalActionSeconds}s</small>
            </article>
          </div>
        </section>
      )}
    </section>
  );
}
