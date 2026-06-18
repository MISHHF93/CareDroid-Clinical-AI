import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { selectReceptionOperationalStripMetrics } from './receptionQueueModel';
import './ReceptionOperationalStrip.css';

function metricTone(metric) {
  if (metric.id === 'ems-inbound' && metric.value > 0) return 'info';
  if (metric.id === 'queue-size' && metric.value >= 8) return 'warning';
  if (metric.id === 'awaiting-triage' && metric.value >= 6) return 'warning';
  if (metric.id === 'awaiting-verification' && metric.value >= 5) return 'warning';
  if (metric.id === 'data-quality-risks' && metric.value > 0) return 'warning';
  if (metric.id === 'queue-overdue' && metric.value > 0) return 'warning';
  if (metric.id === 'longest-wait' && String(metric.value).includes('h')) return 'warning';
  return 'neutral';
}

export default function ReceptionOperationalStrip({
  patients = [],
  emsInbound = 0,
  onMetricSelect,
  shiftSummaryPath = null,
}) {
  const metrics = useMemo(
    () => selectReceptionOperationalStripMetrics(patients, emsInbound),
    [patients, emsInbound],
  );

  return (
    <nav className="reception-operational-strip" aria-label="Reception operational metrics">
      {metrics.map((metric) => {
        const interactive = Boolean(metric.queueTab && onMetricSelect);
        return (
          <button
            key={metric.id}
            type="button"
            className="reception-operational-strip__metric"
            data-tone={metricTone(metric)}
            onClick={() => interactive && onMetricSelect(metric)}
            disabled={!interactive}
            title={[metric.label, metric.hint].filter(Boolean).join(' · ')}
          >
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </button>
        );
      })}
      {shiftSummaryPath ? (
        <Link
          to={shiftSummaryPath}
          className="reception-operational-strip__metric reception-operational-strip__metric--link"
          title="Open shift summary"
        >
          <strong>Shift</strong>
          <span>Today&apos;s handoff</span>
        </Link>
      ) : null}
    </nav>
  );
}
