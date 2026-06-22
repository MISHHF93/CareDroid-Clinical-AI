import React, { useMemo } from 'react';
import { buildEmsOffloadTrackerSummary } from '../../services/emsOffloadTracker';
import './EmsOffloadTrackerPanel.css';

function PhaseBadge({ phase }) {
  const labels = {
    inbound: 'Inbound',
    'on-scene': 'On scene',
    handoff: 'Handoff',
    complete: 'Complete',
  };
  return <span>{labels[phase] || phase}</span>;
}

export default function EmsOffloadTrackerPanel({
  emsArrivals = [],
  patients = [],
  staff = [],
  rooms = [],
  offloadTargetMinutes = 15,
  compact = false,
  title = 'EMS Offload Tracker',
  subtitle = 'Dispatch ETA, arrival, triage handoff, offload delay, bay, and owner.',
  onSelectPatient,
  onSelectArrival,
  className = '',
}) {
  const summary = useMemo(
    () =>
      buildEmsOffloadTrackerSummary(emsArrivals, {
        patients,
        staff,
        rooms,
        offloadTargetMinutes,
      }),
    [emsArrivals, offloadTargetMinutes, patients, rooms, staff],
  );

  if (!summary.rows.length) {
    return (
      <section className={['ems-offload-tracker', className].filter(Boolean).join(' ')}>
        <header className="ems-offload-tracker__header">
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </header>
        <p className="ems-offload-tracker__empty">No active EMS offload cases.</p>
      </section>
    );
  }

  return (
    <section
      className={['ems-offload-tracker', compact ? 'ems-offload-tracker--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="ems-offload-tracker-title"
    >
      <header className="ems-offload-tracker__header">
        <div>
          <h3 id="ems-offload-tracker-title">{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="ems-offload-tracker__summary" aria-label="EMS offload summary">
          <span data-tone={summary.delayedCount ? 'critical' : 'watch'}>
            {summary.awaitingOffloadCount} awaiting offload
          </span>
          {summary.averageOffloadMinutes ? (
            <span data-tone={summary.averageOffloadMinutes >= offloadTargetMinutes ? 'critical' : 'watch'}>
              Avg {summary.averageOffloadMinutes}m
            </span>
          ) : null}
          {summary.inboundCount ? <span>{summary.inboundCount} inbound</span> : null}
        </div>
      </header>

      <div className="ems-offload-tracker__table-wrap">
        <table className="ems-offload-tracker__table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>ETA</th>
              <th>Arrived</th>
              <th>Handoff start</th>
              <th>Complete</th>
              <th>Offload</th>
              <th>Bay</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.arrivalId} data-tone={row.tone}>
                <td className="ems-offload-tracker__unit">
                  <strong>
                    {onSelectArrival ? (
                      <button
                        type="button"
                        className="ems-offload-tracker__action"
                        onClick={() => onSelectArrival(row.arrivalId, row.patientId)}
                      >
                        {row.unitLabel}
                      </button>
                    ) : (
                      row.unitLabel
                    )}
                  </strong>
                  <small>
                    <PhaseBadge phase={row.phase} /> · {row.complaint}
                  </small>
                </td>
                <td>{row.dispatchEtaLabel || '—'}</td>
                <td>{row.ambulanceArrivalLabel}</td>
                <td>{row.triageHandoffStartLabel}</td>
                <td>{row.handoffCompleteLabel}</td>
                <td>{row.offloadDelayLabel}</td>
                <td>{row.assignedReceivingArea || '—'}</td>
                <td>
                  {row.handoffOwner ? (
                    row.patientId && onSelectPatient ? (
                      <button
                        type="button"
                        className="ems-offload-tracker__action"
                        onClick={() => onSelectPatient(row.patientId)}
                      >
                        {row.handoffOwner}
                      </button>
                    ) : (
                      row.handoffOwner
                    )
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
