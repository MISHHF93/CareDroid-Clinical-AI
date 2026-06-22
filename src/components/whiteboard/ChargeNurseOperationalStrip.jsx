import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectChargeNurseOperationalStrip } from './chargeNurseWorkflowModel';

export default function ChargeNurseOperationalStrip({
  patients = [],
  centralSnapshot = null,
  activeEmsArrivals = 0,
  referrals = [],
  emsArrivals = [],
  settings = {},
  visibleSurfaces = null,
  kpiMetricIds = null,
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
      selectChargeNurseOperationalStrip({
        patients,
        centralSnapshot,
        activeEmsArrivals,
        referrals,
        emsArrivals,
        settings,
        visibleSurfaces,
        kpiMetricIds,
      });
    return normalizeOperationalStripMetrics(selected, { onMetricSelect });
  }, [
    activeEmsArrivals,
    centralSnapshot,
    emsArrivals,
    metricsOverride,
    onMetricSelect,
    patients,
    referrals,
    settings,
    visibleSurfaces,
    kpiMetricIds,
  ]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.chargeNurse}
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
