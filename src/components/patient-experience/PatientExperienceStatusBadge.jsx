import React from 'react';
import { resolvePatientExperienceStatus } from '../../services/patientExperienceStatus';
import { resolvePatientWaitingRoomMessage } from '../../services/waitingRoomStatusMessaging';
import './PatientExperienceStatusBadge.css';

export default function PatientExperienceStatusBadge({
  patient,
  referrals = /** @type {any[]} */ ([]),
  compact = false,
  showStaffDetail = false,
  audience = undefined,
}) {
  if (!patient?.id) return null;

  const snapshot = resolvePatientExperienceStatus(patient, { referrals });
  const resolvedAudience = audience || (showStaffDetail ? 'staff' : 'patient');
  const messagingLabel = resolvePatientWaitingRoomMessage(
    patient,
    { referrals },
    resolvedAudience,
  );
  const displayLabel =
    messagingLabel || (compact ? snapshot.shortLabel : snapshot.label);

  return (
    <span
      className={[
        'patient-experience-badge',
        `patient-experience-badge--${snapshot.tone}`,
        compact ? 'patient-experience-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[
        displayLabel,
        showStaffDetail ? snapshot.staffDetail : null,
        showStaffDetail ? `Internal state: ${snapshot.internalState}` : 'Patient-safe waiting room status',
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      {displayLabel}
    </span>
  );
}
