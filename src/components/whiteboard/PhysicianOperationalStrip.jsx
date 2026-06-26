import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectPhysicianOperationalStrip } from './physicianWorkflowModel';

export default function PhysicianOperationalStrip({
  patients = /** @type {any[]} */ ([]),
  referrals = /** @type {any[]} */ ([]),
  physicianStaffId = /** @type {any} */ (null),
  settings = /** @type {any} */ ({}),
  visibleSurfaces = /** @type {any} */ (null),
  onMetricSelect,
  readOnly = false,
  metrics: metricsOverride = /** @type {any} */ (null),
  eyebrow = /** @type {any} */ (null),
  className = '',
  emptyLabel = /** @type {any} */ (null),
  emptyHint = /** @type {any} */ (null),
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
