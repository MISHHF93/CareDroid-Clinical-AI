import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHelpHub, type HelpHubTab } from '../../contexts/HelpHubContext';
import { useContextualHelp } from '../../hooks/useContextualHelp';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import {
  MANUAL_DEMO_JOURNEY,
  MANUAL_PATIENT_JOURNEY,
  MANUAL_TOPICS,
  getManualTopicById,
} from '../../config/userManual.config';
import { resolveDemoRoleLandingRoute } from '../../config/demoPersonaModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import HelpTopicView from './HelpTopicView';
import './HelpHub.css';

const TABS: { id: HelpHubTab; label: string }[] = [
  { id: 'page', label: 'This screen' },
  { id: 'role', label: 'My role' },
  { id: 'process', label: 'Full process' },
  { id: 'topics', label: 'All topics' },
  { id: 'shortcuts', label: 'Shortcuts' },
];

type HelpHubProps = {
  variant?: 'drawer' | 'page';
};

export default function HelpHub({ variant = 'drawer' }: HelpHubProps) {
  const navigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const { state, closeHelp, setTab, setTopicId } = useHelpHub();
  const help = useContextualHelp(state.topicId);

  const activeTopic =
    (state.topicId ? getManualTopicById(state.topicId) : null) || help.pageTopic;

  const handleJourneyGo = useCallback(
    (step: (typeof MANUAL_DEMO_JOURNEY)[number]) => {
      if (step.route) {
        navigate(step.route);
      } else if (step.emergencyRoleId) {
        emergencyRole.switchDemoRole(step.emergencyRoleId);
        navigate(resolveDemoRoleLandingRoute(step.emergencyRoleId));
      } else {
        navigate(CANONICAL_ROUTES.emergencyReception);
      }
      if (variant === 'drawer') {
        closeHelp();
      }
    },
    [closeHelp, emergencyRole, navigate, variant],
  );

  if (variant === 'drawer' && !state.open) {
    return null;
  }

  const panel = (
    <div
      className={['help-hub', variant === 'page' ? 'help-hub--page' : ''].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal={variant === 'drawer'}
      aria-labelledby="help-hub-title"
    >
      <header className="help-hub__header">
        <div className="help-hub__header-main">
          <p className="help-hub__eyebrow">CareDroid Guide</p>
          <h2 id="help-hub-title" className="help-hub__title">
            Process & procedures
          </h2>
          <p className="help-hub__subtitle">
            {help.roleLabel} · {activeTopic?.title || 'Department workflows'}
          </p>
        </div>
        {variant === 'drawer' ? (
          <button type="button" className="help-hub__close" onClick={closeHelp} aria-label="Close guide">
            ×
          </button>
        ) : null}
      </header>

      <div className="help-hub__tabs" role="tablist" aria-label="Guide sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="help-hub__tab"
            data-active={state.tab === tab.id ? 'true' : 'false'}
            aria-selected={state.tab === tab.id}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="help-hub__body">
        {state.tab === 'page' ? (
          <>
            <div className="help-hub__intro">
              <p>{help.intro.summary}</p>
              <ul>
                {help.intro.principles.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="help-hub__safety">{help.intro.safetyLine}</p>
            </div>
            {activeTopic ? (
              <HelpTopicView topic={activeTopic} onSelectTopic={setTopicId} />
            ) : (
              <p>No procedure mapped to this screen yet. Try <strong>All topics</strong> or <strong>My role</strong>.</p>
            )}
          </>
        ) : null}

        {state.tab === 'role' && help.rolePlaybook ? (
          <div className="help-hub__role-card">
            <h3>{help.rolePlaybook.label} playbook</h3>
            <p>
              <strong>Start here:</strong> {help.rolePlaybook.startHere}
            </p>
            <h4>Daily flow</h4>
            <ol>
              {help.rolePlaybook.dailyFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h4>You can</h4>
            <ul>
              {help.rolePlaybook.canDo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {help.rolePlaybook.cannotDo.length ? (
              <>
                <h4>You cannot</h4>
                <ul>
                  {help.rolePlaybook.cannotDo.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <h4>Your screens</h4>
            <ul>
              {help.roleTopics.map((topic) => (
                <li key={topic.id}>
                  <button type="button" className="help-topic__related-btn" onClick={() => setTopicId(topic.id)}>
                    {topic.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.tab === 'process' ? (
          <>
            <section className="help-hub__section">
              <h4>Patient journey (live ED)</h4>
              <ol className="help-topic__steps">
                {MANUAL_PATIENT_JOURNEY.map((step) => (
                  <li key={step.step}>
                    <strong>
                      {step.step}. {step.label}
                    </strong>
                    <span>
                      {' '}
                      — {step.where}: {step.outcome}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <h4>Demo walkthrough A–K</h4>
              {MANUAL_DEMO_JOURNEY.map((step) => (
                <div key={step.id} className="help-hub__journey-step">
                  <span className="help-hub__journey-letter">{step.letter}</span>
                  <div className="help-hub__journey-body">
                    <strong>{step.title}</strong>
                    <p>{step.summary}</p>
                  </div>
                  <button type="button" className="help-hub__go-btn" onClick={() => handleJourneyGo(step)}>
                    Go
                  </button>
                </div>
              ))}
            </section>
          </>
        ) : null}

        {state.tab === 'topics' ? (
          state.topicId && getManualTopicById(state.topicId) ? (
            <>
              <button type="button" className="help-topic__related-btn" onClick={() => setTopicId(null)}>
                ← All topics
              </button>
              <HelpTopicView topic={getManualTopicById(state.topicId)!} onSelectTopic={setTopicId} />
            </>
          ) : (
            <div className="help-hub__topic-list">
              {MANUAL_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className="help-hub__topic-btn"
                  onClick={() => setTopicId(topic.id)}
                >
                  <strong>{topic.title}</strong>
                  <span>{topic.purpose}</span>
                </button>
              ))}
            </div>
          )
        ) : null}

        {state.tab === 'shortcuts' ? (
          <table className="help-hub__shortcut-table">
            <thead>
              <tr>
                <th>Keys</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {help.shortcuts.map((row) => (
                <tr key={row.keys}>
                  <td>
                    <code>{row.keys}</code>
                  </td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <footer className="help-hub__footer">
        <p>
          Press <code>?</code> anywhere to reopen this guide. Practitioner reference:{' '}
          <code>docs/USER-MANUAL.md</code> · config: <code>src/config/userManual.config.ts</code>
        </p>
      </footer>
    </div>
  );

  if (variant === 'page') {
    return panel;
  }

  return (
    <>
      <button type="button" className="help-hub-backdrop" aria-label="Close guide" onClick={closeHelp} />
      {panel}
    </>
  );
}