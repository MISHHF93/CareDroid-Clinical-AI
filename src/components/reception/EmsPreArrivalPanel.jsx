import React, { useEffect, useMemo, useState } from 'react';
import { Ambulance, Clock3 } from 'lucide-react';
import {
  etaTone,
  formatEta,
  isInboundEmsArrival,
  minutesRemaining,
  unitLabel,
  vitalsStrip,
} from '../../utils/emsArrivalDisplay';
import './EmsPreArrivalPanel.css';

function severityClass(severity) {
  return String(severity || 'Moderate').toLowerCase();
}

export default function EmsPreArrivalPanel({
  arrivals = [],
  loading = false,
  canPrepareRegistration = false,
  canConvertArrival = false,
  onPrepareRegistration,
  onConvertArrival,
  onRefresh,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const inboundArrivals = useMemo(
    () =>
      arrivals
        .filter((arrival) => isInboundEmsArrival(arrival, now))
        .sort((left, right) => minutesRemaining(left, now) - minutesRemaining(right, now)),
    [arrivals, now],
  );

  return (
    <section className="ems-pre-arrival" aria-labelledby="ems-pre-arrival-title">
      <header className="ems-pre-arrival__header">
        <div>
          <p className="ems-pre-arrival__eyebrow">
            <Ambulance size={16} aria-hidden />
            Pre-arrival intelligence
          </p>
          <h2 id="ems-pre-arrival-title">Inbound ambulances</h2>
          <p className="ems-pre-arrival__description">
            Know what is coming before units reach the front door. Prepare registration and notify
            clinical teams from one reception view.
          </p>
        </div>
        {onRefresh ? (
          <button type="button" className="ems-pre-arrival__refresh" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh feed'}
          </button>
        ) : null}
      </header>

      {loading && !inboundArrivals.length ? (
        <p className="ems-pre-arrival__empty">Loading inbound EMS feed…</p>
      ) : null}

      {!loading && !inboundArrivals.length ? (
        <p className="ems-pre-arrival__empty">No inbound ambulances right now.</p>
      ) : null}

      <ul className="ems-pre-arrival__list">
        {inboundArrivals.map((arrival) => {
          const remaining = minutesRemaining(arrival, now);
          const tone = etaTone(remaining, arrival.status);
          const vitals = vitalsStrip(arrival.vitals);

          return (
            <li key={arrival.id} className={`ems-pre-arrival__card ems-pre-arrival__card--${tone}`}>
              <div className="ems-pre-arrival__card-top">
                <div>
                  <strong>{arrival.unitId}</strong>
                  <span>{unitLabel(arrival)}</span>
                </div>
                <time className="ems-pre-arrival__eta" dateTime={arrival.estimatedArrivalTime}>
                  <Clock3 size={14} aria-hidden />
                  {formatEta(remaining, arrival.status)}
                </time>
              </div>

              <div className="ems-pre-arrival__complaint">
                <strong>{arrival.chiefComplaint || arrival.prearrivalComplaint}</strong>
                <span className={`ems-pre-arrival__severity ems-pre-arrival__severity--${severityClass(arrival.severity)}`}>
                  {arrival.severity || 'Moderate'}
                </span>
              </div>

              {vitals.length ? (
                <div className="ems-pre-arrival__vitals" aria-label="Pre-arrival vitals">
                  {vitals.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}

              {arrival.notes ? <p className="ems-pre-arrival__notes">{arrival.notes}</p> : null}

              <div className="ems-pre-arrival__actions">
                {canPrepareRegistration ? (
                  <button
                    type="button"
                    className="ems-pre-arrival__action ems-pre-arrival__action--primary"
                    onClick={() => onPrepareRegistration?.(arrival)}
                  >
                    Prepare registration
                  </button>
                ) : null}
                {canConvertArrival && remaining <= 0 && !arrival.patientId ? (
                  <button
                    type="button"
                    className="ems-pre-arrival__action"
                    onClick={() => onConvertArrival?.(arrival)}
                  >
                    Unit arrived — register now
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
