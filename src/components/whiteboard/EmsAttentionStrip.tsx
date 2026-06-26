import React, { useMemo } from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildEmsAttentionStripMetrics, summarizeEmsAwareness } from './emsAwarenessModel';

export default function EmsAttentionStrip({
  emsArrivals = ([] as any[]),
  patients = ([] as any[]),
  staff = ([] as any[]),
  rooms = ([] as any[]),
  offloadTargetMinutes = 15,
  now = Date.now(),
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => {
    const summary = summarizeEmsAwareness(emsArrivals, now, {
      patients,
      staff,
      rooms,
      offloadTargetMinutes,
    });
    return buildEmsAttentionStripMetrics(summary);
  }, [emsArrivals, now, offloadTargetMinutes, patients, rooms, staff]);

  const clearCopy = EMPTY_STATE_COPY.strips.emsClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="EMS inbound"
      accent="ems"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
