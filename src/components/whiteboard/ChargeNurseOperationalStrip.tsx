import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectChargeNurseOperationalStrip } from './chargeNurseWorkflowModel';

export default function ChargeNurseOperationalStrip({
  patients = [] as any[],
  centralSnapshot = null as any,
  activeEmsArrivals = 0,
  referrals = [] as any[],
  emsArrivals = [] as any[],
  capacity = null as any,
  settings = {} as any,
  workflowLogs = [] as any[],
  alerts = [] as any[],
  visibleSurfaces = null as any,
  kpiMetricIds = null as any,
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = null as any,
  eyebrow = null as any,
  className = '',
  emptyLabel = null as any,
  emptyHint = null as any,
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
      screenMode={CARE_DROID_SCREEN_MODES.chargeNurse as any}
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
