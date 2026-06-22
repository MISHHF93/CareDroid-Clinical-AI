import React, { useMemo } from 'react';
import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import { RECEPTION_COPY } from './receptionCopy';
import './ArrivalControlSummaryStrip.css';

export default function ArrivalControlSummaryStrip({
  patients = [],
  onMetricSelect,
  className = '',
}) {
  const summary = useMemo(() => buildArrivalControlSummary(patients), [patients]);
  const copy = RECEPTION_COPY.arrivalControl;

  const metrics = [
    {
      id: 'recent-arrivals',
      label: copy.recentArrivals,
      value: summary.recentArrivals,
      queueTab: null,
    },
    {
      id: 'awaiting-registration',
      label: copy.awaitingRegistration,
      value: summary.awaitingRegistration,
      queueTab: 'verification',
    },
    {
      id: 'triage-pending',
      label: copy.triagePending,
      value: summary.triagePending,
      queueTab: 'pretriage',
    },
    {
      id: 'rapid-review',
      label: copy.rapidReview,
      value: summary.rapidReview,
      queueTab: 'pretriage',
    },
    {
      id: 'waiting-room',
      label: copy.inWaitingRoom,
      value: summary.inWaitingRoom,
      queueTab: null,
    },
  ];

  return (
    <div
      className={`arrival-control-summary${className ? ` ${className}` : ''}`}
      aria-label={copy.stripLabel}
      role="group"
    >
      {metrics.map((metric) => (
        <button
          key={metric.id}
          type="button"
          className="arrival-control-summary__metric"
          disabled={!metric.queueTab || !onMetricSelect}
          onClick={() => metric.queueTab && onMetricSelect?.({ queueTab: metric.queueTab })}
        >
          <span className="arrival-control-summary__label">{metric.label}</span>
          <strong className="arrival-control-summary__value">{metric.value}</strong>
        </button>
      ))}
    </div>
  );
}
