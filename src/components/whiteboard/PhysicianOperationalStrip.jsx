import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectPhysicianOperationalStrip } from './physicianWorkflowModel';

export default function PhysicianOperationalStrip({
  patients = [],
  referrals = [],
  physicianStaffId = null,
  settings = {},
  visibleSurfaces = null,
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = null,
  eyebrow = null,
  className = '',
  emptyLabel = null,
  emptyHint = null,
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
      screenMode={CARE_DROID_SCREEN_MODES.physician}
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
