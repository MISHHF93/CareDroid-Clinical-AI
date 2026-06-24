import { useState } from 'react';
import { Link } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  DEMO_JOURNEY_STEPS,
  DEMO_PERSONA,
  getDemoPersonaHeadline,
  resolveDemoRoleLandingRoute,
} from '../../config/demoPersonaModel';
import ProfileRoleSwitcher from './ProfileRoleSwitcher';
import './DemoPersonaPanel.css';

const DISMISS_KEY = 'caredroid_demo_persona_dismissed';

export default function DemoPersonaPanel() {
  const showProfileSwitcher = useProfileSwitcherVisibility();
  const { switchDemoRole } = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    if (showProfileSwitcher) return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });
  const [journeyOpen, setJourneyOpen] = useState(false);

  if (!showProfileSwitcher || dismissed) return null;

  const handleRoleSwitch = (emergencyRoleId: string) => {
    switchDemoRole(emergencyRoleId);
    profileNavigate(resolveDemoRoleLandingRoute(emergencyRoleId));
  };

  const runJourneyStep = (step: (typeof DEMO_JOURNEY_STEPS)[number]) => {
    if (step.emergencyRoleId) {
      handleRoleSwitch(step.emergencyRoleId);
      return;
    }
    if (step.route) {
      profileNavigate(step.route);
    }
  };

  return (
    <section className="demo-persona-panel" aria-label="Demo persona">
      <div className="demo-persona-panel__bar">
        <div className="demo-persona-panel__identity">
          <p className="demo-persona-panel__eyebrow">Workflow profile — switch role before you enter</p>
          <p className="demo-persona-panel__title">{getDemoPersonaHeadline()}</p>
          <p className="demo-persona-panel__subtitle">{DEMO_PERSONA.tagline}</p>
        </div>
        <div className="demo-persona-panel__actions">
          <Link className="demo-persona-panel__link" to={CANONICAL_ROUTES.platformStart}>
            Entry hub
          </Link>
          <button
            type="button"
            className="demo-persona-panel__button demo-persona-panel__button--ghost"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, '1');
              setDismissed(true);
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

      <div className="demo-persona-panel__roles">
        <span className="demo-persona-panel__roles-label">Switch profile</span>
        <ProfileRoleSwitcher variant="chips" />
      </div>

      <div className="demo-persona-panel__journey">
        <button
          type="button"
          className="demo-persona-panel__journey-toggle"
          aria-expanded={journeyOpen}
          onClick={() => setJourneyOpen((value) => !value)}
        >
          <span>A–Z demo journey with CareDroid</span>
          <span aria-hidden>{journeyOpen ? '▾' : '▸'}</span>
        </button>

        {journeyOpen ? (
          <ol className="demo-persona-panel__journey-list">
            {DEMO_JOURNEY_STEPS.map((step) => (
              <li key={step.id} className="demo-persona-panel__journey-step">
                <span className="demo-persona-panel__journey-letter">{step.letter}</span>
                <div className="demo-persona-panel__journey-copy">
                  <strong>{step.title}</strong>
                  <span>{step.summary}</span>
                </div>
                {step.emergencyRoleId || step.route ? (
                  <button
                    type="button"
                    className="demo-persona-panel__journey-go"
                    onClick={() => runJourneyStep(step)}
                  >
                    Go
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}