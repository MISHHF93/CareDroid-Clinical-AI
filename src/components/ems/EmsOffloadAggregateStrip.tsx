import React, { useMemo } from 'react';
import {
  buildEmsOffloadVisibilitySnapshot,
  hasEmsOffloadVisibilityActivity,
} from '../../services/emsOffloadVisibilityModel';
import './EmsOffloadAggregateStrip.css';

export default function EmsOffloadAggregateStrip({
  emsArrivals = ([] as any[]),
  patients = ([] as any[]),
  staff = ([] as any[]),
  rooms = ([] as any[]),
  offloadTargetMinutes = 15,
  onOpenTracker,
  className = '',
  alwaysShowWhenActive = true,
  now = undefined as number | undefined,
}) {
  // HEAL-183: without `now`, offloadDelaysCount/offloadDurationLabel only recompute when
  // emsArrivals/patients/etc. change -- an inbound unit can cross the offload-delay threshold
  // purely from time passing and this strip would never notice until an unrelated mutation
  // forced a re-render.
  const snapshot = useMemo(
    () =>
      buildEmsOffloadVisibilitySnapshot(emsArrivals, {
        patients,
        staff,
        rooms,
        offloadTargetMinutes,
        now: now ? new Date(now) : undefined,
      }),
    [emsArrivals, now, offloadTargetMinutes, patients, rooms, staff],
  );

  if (!alwaysShowWhenActive && !snapshot.offloadDelaysCount) {
    return null;
  }
  if (alwaysShowWhenActive && !hasEmsOffloadVisibilityActivity(snapshot)) {
    return null;
  }

  return (
    <section
      className={['ems-offload-aggregate-strip', className].filter(Boolean).join(' ')}
      aria-label="EMS offload aggregate summary"
    >
      <header className="ems-offload-aggregate-strip__header">
        <div>
          <p className="ems-offload-aggregate-strip__eyebrow">EMS offload</p>
          <h3>Aggregate offload status</h3>
          <p className="ems-offload-aggregate-strip__subtitle">
            Department-wide ambulance inbound, delays, duration, and handoff queue — no patient
            identifiers on this summary.
          </p>
        </div>
        {onOpenTracker ? (
          <button type="button" className="ems-offload-aggregate-strip__open" onClick={onOpenTracker}>
            Open tracker
          </button>
        ) : null}
      </header>
      <div className="ems-offload-aggregate-strip__counts">
        <div className="ems-offload-aggregate-strip__count" data-tone="info">
          <strong>{snapshot.inboundCount}</strong>
          <span>EMS inbound</span>
        </div>
        <div
          className="ems-offload-aggregate-strip__count"
          data-tone={snapshot.offloadDelaysCount ? 'critical' : 'neutral'}
        >
          <strong>{snapshot.offloadDelaysCount}</strong>
          <span>Offload delays</span>
        </div>
        <div
          className="ems-offload-aggregate-strip__count"
          data-tone={snapshot.longestOffloadMinutes >= offloadTargetMinutes ? 'warning' : 'watch'}
        >
          <strong>{snapshot.offloadDurationLabel}</strong>
          <span>Offload duration</span>
        </div>
        <div
          className="ems-offload-aggregate-strip__count"
          data-tone={snapshot.handoffPendingCount ? 'watch' : 'neutral'}
        >
          <strong>{snapshot.handoffPendingCount}</strong>
          <span>Handoff pending</span>
        </div>
      </div>
    </section>
  );
}
