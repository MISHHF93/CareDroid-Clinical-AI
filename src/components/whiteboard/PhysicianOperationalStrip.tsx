import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectPhysicianOperationalStrip } from './physicianWorkflowModel';

export default function PhysicianOperationalStrip({
  patients = ([] as any[]),
  referrals = ([] as any[]),
  physicianStaffId = (null as any),
  settings = ({} as any),
  visibleSurfaces = (null as any),
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = (null as any),
  eyebrow = (null as any),
  className = '',
  emptyLabel = (null as any),
  emptyHint = (null as any),
}) {
  const metrics = useMemo(() => {
    const selected =
      metricsOverride ??
      selectPhysicianOperationalStrip({
        patients,
        referrals,
        physicianStaffId,
        settings,
        visibleSurfaces,
      });
    return normalizeOperationalStripMetrics(selected, { onMetricSelect });
  }, [metricsOverride, onMetricSelect, patients, physicianStaffId, referrals, settings, visibleSurfaces]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.physician as any}
      metrics={metrics}
      eyebrow={eyebrow}
      emptyLabel={emptyLabel}
      emptyHint={emptyHint}
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      className={className}
    />
  );
}
