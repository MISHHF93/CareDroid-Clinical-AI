import React, { useMemo } from 'react';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildEmsAttentionStripMetrics, summarizeEmsAwareness } from './emsAwarenessModel';
import './ChargeNurseOperationalStrip.css';

export default function EmsAttentionStrip({
  emsArrivals = [],
  now = Date.now(),
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => {
    const summary = summarizeEmsAwareness(emsArrivals, now);
    return buildEmsAttentionStripMetrics(summary);
  }, [emsArrivals, now]);

  if (!metrics.length) return null;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="EMS inbound"
      className="charge-nurse-operational-strip--ems"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
    />
  );
}
