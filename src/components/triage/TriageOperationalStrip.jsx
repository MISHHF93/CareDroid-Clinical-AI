import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectTriageOperationalStripMetrics } from './triageWorkflowModel';

function metricTone(metric) {
  if (metric.id === 'triage-pending' && metric.value >= 4) return 'critical';
  if (metric.id === 'triage-pending' && metric.value >= 2) return 'warning';
  if (metric.id === 'longest-untriaged-wait' && String(metric.value).includes('h')) return 'warning';
  if (metric.id === 'rapid-review-flags' && metric.value > 0) return 'warning';
  if (metric.id === 'ems-handoffs-pending' && metric.value > 0) return 'info';
  return 'neutral';
}

export default function TriageOperationalStrip({
  patients = [],
  emsArrivals = [],
  onMetricSelect,
  stripMetricIds = null,
  settings = null,
}) {
  const metrics = useMemo(() => {
    const selected = selectTriageOperationalStripMetrics(patients, emsArrivals, {
      metricIds: stripMetricIds,
      settings,
    });
    return normalizeOperationalStripMetrics(
      selected.map((metric) => ({ ...metric, tone: metricTone(metric) })),
      { onMetricSelect },
    );
  }, [patients, emsArrivals, stripMetricIds, settings, onMetricSelect]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.triage}
      metrics={metrics}
      onMetricSelect={onMetricSelect}
    />
  );
}
