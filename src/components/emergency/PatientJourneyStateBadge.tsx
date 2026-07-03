import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEmergencyStore } from '../../store/emergencyStore';
import { resolvePatientHospitalJourney } from '../../services/hospitalOperatingSystemService';
import type { Patient } from '../../types/emergency';
import './patient-journey-state-badge.css';

type PatientJourneyStateBadgeProps = Readonly<{
  patient: Patient;
  compact?: boolean;
  linkToRoute?: boolean;
  className?: string;
}>;

export default function PatientJourneyStateBadge({
  patient,
  compact = false,
  linkToRoute = true,
  className = '',
}: PatientJourneyStateBadgeProps) {
  const referrals = useEmergencyStore((state) => state.referrals);
  const position = useMemo(
    () => resolvePatientHospitalJourney(patient, referrals),
    [patient, referrals],
  );

  const content = (
    <>
      <span className="patient-journey-badge__phase">{position.phaseLabel}</span>
      {!compact ? (
        <span className="patient-journey-badge__stage">{position.stageLabel}</span>
      ) : null}
    </>
  );

  const classNames = [
    'patient-journey-badge',
    compact ? 'patient-journey-badge--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (linkToRoute) {
    return (
      <Link
        to={position.route}
        className={classNames}
        title={`${position.phaseLabel} · ${position.stageLabel}`}
        aria-label={`Journey stage: ${position.stageLabel} in ${position.phaseLabel}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={classNames}
      title={`${position.phaseLabel} · ${position.stageLabel}`}
      aria-label={`Journey stage: ${position.stageLabel} in ${position.phaseLabel}`}
    >
      {content}
    </span>
  );
}