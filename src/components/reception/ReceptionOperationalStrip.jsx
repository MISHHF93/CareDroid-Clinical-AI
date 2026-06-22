import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectReceptionOperationalStripMetrics } from './receptionQueueModel';

function metricTone(metric) {
  if (metric.id === 'ems-inbound' && metric.value > 0) return 'info';
  if (metric.id === 'queue-size' && metric.value >= 8) return 'warning';
  if (metric.id === 'awaiting-triage' && metric.value >= 6) return 'warning';
  if (metric.id === 'awaiting-verification' && metric.value >= 5) return 'warning';
  if (metric.id === 'data-quality-risks' && metric.value > 0) return 'warning';
  if (metric.id === 'queue-overdue' && metric.value > 0) return 'warning';
  if (metric.id === 'triage-breached' && metric.value > 0) return 'critical';
  if (metric.id === 'triage-breach-risk' && metric.value > 0) return 'warning';
  if (metric.id === 'offload-delays' && metric.value > 0) return 'warning';
  if (metric.id === 'door-to-triage' && String(metric.value).includes('h')) return 'warning';
  return 'neutral';
}

export default function ReceptionOperationalStrip({
  patients = [],
  emsInbound = 0,
  emsArrivals = [],
  onMetricSelect,
  shiftSummaryPath = null,
  stripMetricIds = null,
  showShiftLink = true,
  settings = null,
}) {
  const metrics = useMemo(() => {
    const selected = selectReceptionOperationalStripMetrics(patients, emsInbound, {
      metricIds: stripMetricIds,
      settings,
      emsArrivals,
    });
    return normalizeOperationalStripMetrics(
      selected.map((metric) => ({ ...metric, tone: metricTone(metric) })),
      { onMetricSelect },
    );
  }, [patients, emsInbound, emsArrivals, stripMetricIds, settings, onMetricSelect]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.reception}
      metrics={metrics}
      onMetricSelect={onMetricSelect}
      shiftSummaryPath={shiftSummaryPath}
      showShiftLink={showShiftLink}
    />
  );
}
