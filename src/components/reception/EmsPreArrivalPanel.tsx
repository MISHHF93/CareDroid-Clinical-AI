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
import { RECEPTION_COPY } from './receptionCopy';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import { ERROR_RECOVERY_COPY } from '../../config/errorRecoveryModel';
import OperationalEmptyState, { OperationalEmptyAction } from '../ui/OperationalEmptyState';
import './EmsPreArrivalPanel.css';

function severityClass(severity) {
  return String(severity || 'Moderate').toLowerCase();
}

export default function EmsPreArrivalPanel({
  arrivals = [] as any[],
  loading = false,
  canPrepareRegistration = false,
  canConvertArrival = false,
  onPrepareRegistration,
  onConvertArrival,
  onRefresh,
  feedError = '',
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

  const copy = RECEPTION_COPY.ems;

  return (
    <section className="ems-pre-arrival" aria-labelledby="ems-pre-arrival-title">
      <header className="ems-pre-arrival__header">
        <div>
          <p className="ems-pre-arrival__eyebrow">
            <Ambulance size={16} aria-hidden />
            {copy.eyebrow}
          </p>
          <h2 id="ems-pre-arrival-title">{copy.title}</h2>
          <p className="ems-pre-arrival__description">{copy.description}</p>
        </div>
        {onRefresh ? (
          <button type="button" className="ems-pre-arrival__refresh" onClick={onRefresh} disabled={loading}>
            {loading ? copy.refreshing : copy.refresh}
          </button>
        ) : null}
      </header>

      {feedError && !loading ? (
        <OperationalEmptyState
          size="inline"
          icon="!"
          title="Could not refresh EMS feed"
          guidance={`${feedError}. ${ERROR_RECOVERY_COPY.syncStale}`}
          status={inboundArrivals.length ? `Showing ${inboundArrivals.length} cached unit(s).` : 'No cached inbound units.'}
          actions={
            onRefresh ? (
              <OperationalEmptyAction onClick={onRefresh}>Retry EMS refresh</OperationalEmptyAction>
            ) : null
          }
          className="ems-pre-arrival__empty"
        />
      ) : null}

      {loading && !inboundArrivals.length ? (
        <OperationalEmptyState
          size="inline"
          icon="↻"
          title={copy.loading}
          guidance="Syncing inbound EMS units from the active feed."
          status="EMS pre-arrival feed loading"
          statusTone="neutral"
          className="ems-pre-arrival__empty"
        />
      ) : null}

      {!loading && !inboundArrivals.length ? (
        <OperationalEmptyState
          size="inline"
          icon="✓"
          title={copy.empty}
          guidance={EMPTY_STATE_COPY.reception.emsPreArrival.guidance}
          status="No inbound units on the feed."
          nextSteps={EMPTY_STATE_COPY.reception.emsPreArrival.nextSteps}
          helpTopicId="ems"
          actions={
            onRefresh ? (
              <OperationalEmptyAction secondary onClick={onRefresh}>
                {copy.refresh}
              </OperationalEmptyAction>
            ) : null
          }
          className="ems-pre-arrival__empty"
        />
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
                    {copy.prepareChart}
                  </button>
                ) : null}
                {canConvertArrival && remaining <= 0 && !arrival.patientId ? (
                  <button
                    type="button"
                    className="ems-pre-arrival__action"
                    onClick={() => onConvertArrival?.(arrival)}
                  >
                    {copy.registerNow}
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
