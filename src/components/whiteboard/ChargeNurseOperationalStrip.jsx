import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectChargeNurseOperationalStrip } from './chargeNurseWorkflowModel';

export default function ChargeNurseOperationalStrip({
  patients = /** @type {any[]} */ ([]),
  centralSnapshot = /** @type {any} */ (null),
  activeEmsArrivals = 0,
  referrals = /** @type {any[]} */ ([]),
  emsArrivals = /** @type {any[]} */ ([]),
  capacity = /** @type {any} */ (null),
  settings = {},
  workflowLogs = /** @type {any[]} */ ([]),
  alerts = /** @type {any[]} */ ([]),
  visibleSurfaces = /** @type {any} */ (null),
  kpiMetricIds = /** @type {any} */ (null),
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = /** @type {any} */ (null),
  eyebrow = /** @type {any} */ (null),
  className = '',
  emptyLabel = /** @type {any} */ (null),
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
        capacity,
        settings,
        workflowLogs,
        alerts,
        visibleSurfaces,
        kpiMetricIds,
      });
    return normalizeOperationalStripMetrics(selected, { onMetricSelect });
  }, [
    activeEmsArrivals,
    alerts,
    centralSnapshot,
    capacity,
    emsArrivals,
    metricsOverride,
    onMetricSelect,
    patients,
    referrals,
    settings,
    visibleSurfaces,
    kpiMetricIds,
    workflowLogs,
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
