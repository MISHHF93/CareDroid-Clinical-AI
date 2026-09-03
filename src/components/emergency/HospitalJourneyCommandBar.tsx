import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useHospitalOperatingSystem from '../../hooks/useHospitalOperatingSystem';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { ED_JOURNEY_PHASES } from '../../config/edOperatingSurface.config';
import '../../styles/operational-command-bar-focus.css';
import './hospital-journey-command-bar.css';

function HospitalJourneyCommandBar() {
  const { pathname } = useLocation();
  const surfaces = usePractitionerSurfaceVisibility();
  const hospitalOs = useHospitalOperatingSystem({ syncBackend: false });

  if (
    !surfaces.emergencyRoutes.showJourneyRail ||
    !hospitalOs.isHospitalRoute ||
    !hospitalOs.phaseId
  ) {
    return null;
  }

  const activeIndex = ED_JOURNEY_PHASES.findIndex((phase) => phase.id === hospitalOs.phaseId);
  const metrics = hospitalOs.snapshot.metrics ?? { activePatients: 0, inboundEms: 0 };
  const phaseSummaries = new Map(
    (hospitalOs.snapshot?.phases ?? []).map((phase) => [phase.phaseId, phase]),
  );

  return (
    <nav className="hospital-journey-command-bar" aria-label="Hospital operating system journey">
      <div className="hospital-journey-command-bar__heading">
        <strong>Patient journey</strong>
        <span>
          {metrics.activePatients} active · {metrics.inboundEms} inbound EMS
        </span>
      </div>
      <ol className="hospital-journey-command-bar__track">
        {ED_JOURNEY_PHASES.map((phase, index) => {
          const summary = phaseSummaries.get(phase.id);
          const state =
            index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'upcoming';
          const isCurrentRoute = pathname.split('?')[0] === phase.route.split('?')[0];

          return (
            <li
              key={phase.id}
              className={`hospital-journey-command-bar__phase hospital-journey-command-bar__phase--${state}${
                isCurrentRoute ? ' hospital-journey-command-bar__phase--route' : ''
              }`}
            >
              <Link
                to={phase.route}
                className="hospital-journey-command-bar__link"
                {...(isCurrentRoute
                  ? { 'aria-current': 'page' as const }
                  : state === 'active'
                    ? { 'aria-current': 'step' as const }
                    : {})}
                title={`${phase.order}. ${phase.label}`}
                aria-label={
                  summary && (summary.activeCount > 0 || summary.stagesAttention > 0)
                    ? `${phase.label}, ${summary.activeCount} active${summary.stagesAttention > 0 ? ', attention required' : ''}`
                    : phase.label
                }
              >
                <span className="hospital-journey-command-bar__marker" aria-hidden="true">
                  {phase.order}
                </span>
                <span className="hospital-journey-command-bar__label">{phase.label}</span>
                {summary && (summary.activeCount > 0 || summary.stagesAttention > 0) ? (
                  <span className="hospital-journey-command-bar__counts" aria-hidden="true">
                    {summary.activeCount > 0 ? (
                      <span className="hospital-journey-command-bar__count">
                        {summary.activeCount}
                      </span>
                    ) : null}
                    {summary.stagesAttention > 0 ? (
                      <span className="hospital-journey-command-bar__attention">!</span>
                    ) : null}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default memo(HospitalJourneyCommandBar);
