import React, { useMemo } from 'react';
import {
  ambulanceHandoffChecklistCompletionPercent,
  formatAmbulanceHandoffDestination,
  resolveAmbulanceHandoffChecklist,
} from '../../services/ambulanceHandoffChecklist';
import './AmbulanceHandoffChecklistBadge.css';

export default function AmbulanceHandoffChecklistBadge({
  arrival,
  patient = null,
  rooms = [] as any[],
  compact = false,
  className = '',
}) {
  const checklist = useMemo(
    () => (arrival ? resolveAmbulanceHandoffChecklist(arrival, { patient, rooms }) : null),
    [arrival, patient, rooms],
  );

  if (!checklist) return null;

  const completion = ambulanceHandoffChecklistCompletionPercent(checklist);
  const tone = checklist.handoffAccepted
    ? 'complete'
    : completion >= 80
      ? 'watch'
      : completion >= 40
        ? 'progress'
        : 'pending';

  return (
    <span
      className={[
        'amb-handoff-badge',
        compact ? 'amb-handoff-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-tone={tone}
      title={`Handoff ${completion}% · ${formatAmbulanceHandoffDestination(checklist)}`}
    >
      {checklist.handoffAccepted ? 'Handoff accepted' : `Handoff ${completion}%`}
      {!compact ? (
        <small>{formatAmbulanceHandoffDestination(checklist)}</small>
      ) : null}
    </span>
  );
}
