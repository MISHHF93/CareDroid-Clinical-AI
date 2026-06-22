import React from 'react';
import {
  arrivalModeLabel,
  buildArrivalControlSnapshot,
  registrationStatusLabel,
} from '../../services/arrivalControlLayer';
import HighRiskComplaintFlagBadge from './HighRiskComplaintFlagBadge';
import './ArrivalControlBadge.css';

export default function ArrivalControlBadge({ patient, compact = false }) {
  const control = buildArrivalControlSnapshot(patient);
  const safetyLabels = control.quickSafetyFlags.map((flag) =>
    String(flag).replace(/([A-Z])/g, ' $1').trim(),
  );

  return (
    <span className={`arrival-control-badge${compact ? ' arrival-control-badge--compact' : ''}`}>
      <span className="arrival-control-badge__mode">{arrivalModeLabel(control.arrivalMode)}</span>
      <span className="arrival-control-badge__status">
        {registrationStatusLabel(control.registrationStatus)}
      </span>
      {control.queueDestination === 'rapid-review' ? (
        <span className="arrival-control-badge__triage">Rapid review</span>
      ) : control.triagePending ? (
        <span className="arrival-control-badge__triage">Triage pending</span>
      ) : null}
      <HighRiskComplaintFlagBadge patient={patient} compact={compact} />
      {!compact && safetyLabels.length ? (
        <span className="arrival-control-badge__safety">{safetyLabels.join(' · ')}</span>
      ) : null}
    </span>
  );
}
