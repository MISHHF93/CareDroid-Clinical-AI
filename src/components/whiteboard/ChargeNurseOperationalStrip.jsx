import React, { useMemo } from 'react';
import { selectChargeNurseOperationalStrip } from './chargeNurseWorkflowModel';
import './ChargeNurseOperationalStrip.css';

export default function ChargeNurseOperationalStrip({
  patients = [],
  centralSnapshot = null,
  activeEmsArrivals = 0,
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = null,
  eyebrow = 'Charge command',
  className = '',
}) {
  const metrics = useMemo(
    () =>
      metricsOverride ??
      selectChargeNurseOperationalStrip({
        patients,
        centralSnapshot,
        activeEmsArrivals,
      }),
    [activeEmsArrivals, centralSnapshot, metricsOverride, patients],
  );

  if (!metrics.length) return null;

  return (
    <nav
      className={['charge-nurse-operational-strip', className].filter(Boolean).join(' ')}
      aria-label={eyebrow}
    >
      <span className="charge-nurse-operational-strip__eyebrow">{eyebrow}</span>
      {metrics.map((metric) => (
        <button
          key={metric.id}
          type="button"
          className="charge-nurse-operational-strip__metric"
          data-tone={metric.tone}
          onClick={() => onMetricSelect?.(metric)}
          disabled={readOnly || !onMetricSelect}
          title={`${metric.label}: ${metric.value}. ${metric.hint}`}
        >
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </button>
      ))}
    </nav>
  );
}
