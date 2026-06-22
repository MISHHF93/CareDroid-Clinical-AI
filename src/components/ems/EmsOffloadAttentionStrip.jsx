import React, { useMemo } from 'react';
import { buildEmsOffloadAttentionSnapshot } from '../../services/emsOffloadTracker';
import './EmsOffloadAttentionStrip.css';

function PhaseLabel({ phase }) {
  const labels = {
    inbound: 'Inbound',
    'on-scene': 'On scene',
    handoff: 'Handoff',
    complete: 'Complete',
  };
  return labels[phase] || phase;
}

export default function EmsOffloadAttentionStrip({
  emsArrivals = [],
  patients = [],
  staff = [],
  rooms = [],
  offloadTargetMinutes = 15,
  onSelectPatient,
  onSelectArrival,
  onOpenTracker,
  className = '',
}) {
  const snapshot = useMemo(
    () =>
      buildEmsOffloadAttentionSnapshot(emsArrivals, {
        patients,
        staff,
        rooms,
        offloadTargetMinutes,
      }),
    [emsArrivals, offloadTargetMinutes, patients, rooms, staff],
  );

  if (!snapshot.rows.length) return null;

  return (
    <section
      className={['ems-offload-attention-strip', className].filter(Boolean).join(' ')}
      aria-label="EMS offload tracker"
    >
      <header className="ems-offload-attention-strip__header">
        <div>
          <p className="ems-offload-attention-strip__eyebrow">EMS offload</p>
          <h3>Offload status</h3>
          <p className="ems-offload-attention-strip__subtitle">
            Dispatch ETA, arrival, triage handoff, delay, receiving bay, and handoff owner.
          </p>
        </div>
        <div className="ems-offload-attention-strip__counts">
          <span data-tone={snapshot.delayedCount ? 'critical' : 'watch'}>
            <strong>{snapshot.awaitingOffloadCount}</strong>
            <small>Awaiting</small>
          </span>
          {snapshot.averageOffloadMinutes ? (
            <span data-tone={snapshot.averageOffloadMinutes >= offloadTargetMinutes ? 'critical' : 'watch'}>
              <strong>{snapshot.averageOffloadMinutes}m</strong>
              <small>Avg offload</small>
            </span>
          ) : null}
          {snapshot.inboundCount ? (
            <span>
              <strong>{snapshot.inboundCount}</strong>
              <small>Inbound</small>
            </span>
          ) : null}
        </div>
        {onOpenTracker ? (
          <button type="button" className="ems-offload-attention-strip__open" onClick={onOpenTracker}>
            Open tracker
          </button>
        ) : null}
      </header>

      <ul className="ems-offload-attention-strip__list">
        {snapshot.previewRows.map((row) => (
          <li key={row.arrivalId}>
            <button
              type="button"
              className="ems-offload-attention-strip__item"
              data-tone={row.tone}
              onClick={() => {
                if (row.patientId && onSelectPatient) {
                  onSelectPatient(row.patientId);
                  return;
                }
                onSelectArrival?.(row.arrivalId, row.patientId);
              }}
              disabled={!onSelectPatient && !onSelectArrival}
            >
              <span className="ems-offload-attention-strip__primary">
                <strong>{row.unitLabel}</strong>
                <small>
                  <PhaseLabel phase={row.phase} /> · {row.complaint}
                </small>
              </span>
              <span className="ems-offload-attention-strip__metrics">
                <span>{row.dispatchEtaLabel || row.ambulanceArrivalLabel}</span>
                <span>{row.offloadDelayLabel}</span>
                <span>{row.assignedReceivingArea || 'Bay pending'}</span>
                <span>{row.handoffOwner || 'Owner pending'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
