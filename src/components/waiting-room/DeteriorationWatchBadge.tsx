import React from 'react';
import {
  resolveDeteriorationWatch,
  shouldSurfaceDeteriorationWatch,
} from '../../services/waitingRoomDeteriorationWatch';
import './DeteriorationWatchBadge.css';

export default function DeteriorationWatchBadge({
  patient,
  emsArrivals = ([] as any[]),
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
  const snap = snapshot!;

  return (
    <span
      className={[
        'deterioration-watch-badge',
        `deterioration-watch-badge--${snap.tone}`,
        compact ? 'deterioration-watch-badge--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={[snap.label, 'Advisory only — staff re-review required', snap.staffDetail]
        .filter(Boolean)
        .join(' · ')}
    >
      {compact ? `Watch ${snap.shortLabel}` : `${snap.label} (advisory)`}
    </span>
  );
}
