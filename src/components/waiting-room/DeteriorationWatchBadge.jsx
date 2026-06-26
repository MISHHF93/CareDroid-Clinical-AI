import React from 'react';
import {
  resolveDeteriorationWatch,
  shouldSurfaceDeteriorationWatch,
} from '../../services/waitingRoomDeteriorationWatch';
import './DeteriorationWatchBadge.css';

export default function DeteriorationWatchBadge({
  patient,
  emsArrivals = /** @type {any[]} */ ([]),
  vitalsStaleMinutes = undefined,
  now = undefined,
  compact = false,
}) {
  if (!patient?.id) return null;

  const snapshot = resolveDeteriorationWatch(patient, {
    emsArrivals,
    vitalsStaleMinutes,
    now,
  });
  if (!shouldSurfaceDeteriorationWatch(snapshot)) return null;

  return (
    <span
      className={[
        'deterioration-watch-badge',
        `deterioration-watch-badge--${snapshot.tone}`,
        compact ? 'deterioration-watch-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[snapshot.label, 'Advisory only — staff re-review required', snapshot.staffDetail]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact ? `Watch ${snapshot.shortLabel}` : `${snapshot.label} (advisory)`}
    </span>
  );
}
