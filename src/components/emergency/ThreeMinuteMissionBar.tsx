import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Timer } from 'lucide-react';
import useThreeMinuteMission from '../../hooks/useThreeMinuteMission';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useUser } from '../../contexts/UserContext';
import ThreeMinuteTimer from './ThreeMinuteTimer';
import { THREE_MINUTE_MISSION_PRINCIPLE } from '../../config/threeMinuteMissionModel';
import { resolveOperationalActorId } from './operationalCommandBarUtils';
import '../../styles/operational-command-bar-focus.css';
import './three-minute-mission-bar.css';

function ThreeMinuteMissionBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { user } = useUser();
  const missionState = useThreeMinuteMission({ realtime: true });
  const selectPatient = useEmergencyStore((state) => state.selectPatient);

  if (!surfaces.emergencyRoutes.showThreeMinuteMissionBar) {
    return null;
  }

  const { snapshot, topMission } = missionState;
  if (!snapshot.activeMissions.length) {
    return null;
  }

  const tone =
    snapshot.breachCount > 0 ? 'breach' : snapshot.unacknowledgedCount > 0 ? 'active' : 'stable';

  return (
    <section
      className={`three-minute-mission-bar three-minute-mission-bar--${tone}`}
      aria-label="Three-minute mission active workflows"
    >
      <div className="three-minute-mission-bar__identity">
        <Timer size={16} aria-hidden="true" />
        <strong>3-Minute Mission</strong>
        <span>{snapshot.unacknowledgedCount} active</span>
        {snapshot.breachCount > 0 ? (
          <span className="three-minute-mission-bar__breach">{snapshot.breachCount} breach</span>
        ) : null}
      </div>

      <p className="three-minute-mission-bar__principle">{THREE_MINUTE_MISSION_PRINCIPLE}</p>

      <ol className="three-minute-mission-bar__missions">
        {snapshot.activeMissions.slice(0, 3).map((mission) => (
          <li key={mission.missionId} className={`three-minute-mission-bar__mission three-minute-mission-bar__mission--${mission.phase}`}>
            <div className="three-minute-mission-bar__mission-main">
              <span className="three-minute-mission-bar__subject">{mission.subjectLabel}</span>
              <span className="three-minute-mission-bar__trigger">{mission.trigger.replace(/_/g, ' ')}</span>
              <ThreeMinuteTimer startTime={mission.startedAt} compact />
              <span className="three-minute-mission-bar__owner">Owner: {mission.ownerRole}</span>
            </div>
            <div className="three-minute-mission-bar__actions">
              {mission.patientId ? (
                <button
                  type="button"
                  className="three-minute-mission-bar__btn"
                  aria-label={`Open patient ${mission.subjectLabel}`}
                  onClick={() => selectPatient(mission.patientId!)}
                >
                  Open patient
                </button>
              ) : null}
              <Link
                to={mission.route}
                className="three-minute-mission-bar__btn three-minute-mission-bar__btn--link"
                aria-label={`Open workflow for ${mission.subjectLabel}`}
              >
                Workflow
              </Link>
              <button
                type="button"
                className="three-minute-mission-bar__btn three-minute-mission-bar__btn--primary"
                aria-label={`Acknowledge mission for ${mission.subjectLabel}`}
                onClick={() =>
                  missionState.acknowledgeMission(mission.missionId, resolveOperationalActorId(user))
                }
              >
                Acknowledge
              </button>
            </div>
          </li>
        ))}
      </ol>

      {topMission ? (
        <p className="three-minute-mission-bar__ai-note" role="note">
          AI Chief support available — advisory only; licensed staff retain clinical responsibility.
        </p>
      ) : null}
    </section>
  );
}

export default memo(ThreeMinuteMissionBar);