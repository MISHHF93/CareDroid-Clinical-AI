import { Link } from 'react-router-dom';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  DEMO_JOURNEY_STEPS,
  DEMO_PERSONA,
  getDemoPersonaHeadline,
  resolveDemoRoleLandingRoute,
} from '../../config/demoPersonaModel';
import ProfileRoleSwitcher from './ProfileRoleSwitcher';
import './DemoPersonaPanel.css';

type DemoPersonaDrawerProps = {
  onClose?: () => void;
};

export default function DemoPersonaDrawer({ onClose }: DemoPersonaDrawerProps) {
  const { switchDemoRole } = useEmergencyRolePermissions();
  const { profileNavigate } = useProfileNavigate();

  const handleRoleSwitch = (emergencyRoleId: string) => {
    switchDemoRole(emergencyRoleId);
    profileNavigate(resolveDemoRoleLandingRoute(emergencyRoleId));
  };

  const runJourneyStep = (step: (typeof DEMO_JOURNEY_STEPS)[number]) => {
    if (step.emergencyRoleId) {
      handleRoleSwitch(step.emergencyRoleId);
      onClose?.();
      return;
    }
    if (step.route) {
      profileNavigate(step.route);
      onClose?.();
    }
  };

  return (
    <section className="demo-persona-panel demo-persona-panel--drawer" aria-label="Demo persona">
      <div className="demo-persona-panel__bar demo-persona-panel__bar--compact">
        <div className="demo-persona-panel__identity">
          <p className="demo-persona-panel__title">{getDemoPersonaHeadline()}</p>
          <p className="demo-persona-panel__subtitle">{DEMO_PERSONA.tagline}</p>
        </div>
        <div className="demo-persona-panel__actions">
          <Link className="demo-persona-panel__link" to={CANONICAL_ROUTES.platformStart}>
            Entry hub
          </Link>
          {onClose ? (
            <button type="button" className="demo-persona-panel__button demo-persona-panel__button--ghost" onClick={onClose}>
              Close
            </button>
          ) : null}
        </div>
      </div>

      <div className="demo-persona-panel__roles">
        <span className="demo-persona-panel__roles-label">Switch profile</span>
        <ProfileRoleSwitcher variant="chips" onSwitch={() => onClose?.()} />
      </div>

      <details className="demo-persona-panel__journey">
        <summary className="demo-persona-panel__journey-toggle">Demo journey</summary>
        <ol className="demo-persona-panel__journey-list">
          {DEMO_JOURNEY_STEPS.map((step) => (
            <li key={step.id} className="demo-persona-panel__journey-step">
              <span className="demo-persona-panel__journey-letter">{step.letter}</span>
              <div className="demo-persona-panel__journey-copy">
                <strong>{step.title}</strong>
                <span>{step.summary}</span>
              </div>
              {step.emergencyRoleId || step.route ? (
                <button type="button" className="demo-persona-panel__journey-go" onClick={() => runJourneyStep(step)}>
                  Go
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}