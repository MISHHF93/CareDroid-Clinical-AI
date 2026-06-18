import React, { useMemo } from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
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

  const clearCopy = EMPTY_STATE_COPY.strips.emsClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="EMS inbound"
      className="charge-nurse-operational-strip--ems"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
