import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectEmsOperationalStrip } from './emsWorkflowModel';

export default function EmsOperationalStrip({
  emsArrivals = [] as any[],
  patients = [] as any[],
  staff = [] as any[],
  rooms = [] as any[],
  offloadTargetMinutes = 15,
  visibleSurfaces = null,
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = null,
  eyebrow = null,
  className = '',
  emptyLabel = null,
  emptyHint = null,
  accent = 'default',
}) {
  const metrics = useMemo(() => {
    const selected =
      metricsOverride ??
      selectEmsOperationalStrip({
        emsArrivals,
        patients,
        staff,
        rooms,
        offloadTargetMinutes,
        visibleSurfaces,
      });
    return normalizeOperationalStripMetrics(selected, { onMetricSelect });
  }, [
    emsArrivals,
    metricsOverride,
    offloadTargetMinutes,
    onMetricSelect,
    patients,
    rooms,
    staff,
    visibleSurfaces,
  ]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.ems as any}
      metrics={metrics}
      eyebrow={eyebrow}
      emptyLabel={emptyLabel}
      emptyHint={emptyHint}
      accent={accent}
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      className={className}
    />
  );
}
