import { Link } from 'react-router-dom';
import { ED_JOURNEY_PHASES, type EdJourneyPhaseId } from '../../config/edOperatingSurface.config';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import './ed-journey-rail.css';

type EdJourneyProgressRailProps = Readonly<{
  activePhaseId: EdJourneyPhaseId | null;
  ownerRole?: string;
  priorityLabel?: string;
  className?: string;
}>;

export default function EdJourneyProgressRail({
  activePhaseId,
  ownerRole,
  priorityLabel,
  className = '',
}: EdJourneyProgressRailProps) {
  const surfaces = usePractitionerSurfaceVisibility();
  if (!surfaces.emergencyRoutes.showSituationBrief || !activePhaseId) {
    return null;
  }

  const activeIndex = ED_JOURNEY_PHASES.findIndex((phase) => phase.id === activePhaseId);

  return (
    <nav
      className={['ed-journey-rail', className].filter(Boolean).join(' ')}
      aria-label="Emergency department patient journey"
    >
      <div className="ed-journey-rail__meta">
        {ownerRole ? (
          <span className="ed-journey-rail__owner">
            Owner: <strong>{ownerRole}</strong>
          </span>
        ) : null}
        {priorityLabel ? (
          <span className={`ed-journey-rail__priority ed-journey-rail__priority--${priorityLabel.toLowerCase()}`}>
            {priorityLabel}
          </span>
        ) : null}
      </div>
      <ol className="ed-journey-rail__track">
        {ED_JOURNEY_PHASES.map((phase, index) => {
          const state =
            index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'upcoming';
          return (
            <li
              key={phase.id}
              className={`ed-journey-rail__phase ed-journey-rail__phase--${state}`}
            >
              <Link
                to={phase.route}
                className="ed-journey-rail__link"
                aria-current={state === 'active' ? 'step' : undefined}
                title={`${phase.order}. ${phase.label}`}
              >
                <span className="ed-journey-rail__marker" aria-hidden="true">
                  {phase.order}
                </span>
                <span className="ed-journey-rail__label">{phase.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}