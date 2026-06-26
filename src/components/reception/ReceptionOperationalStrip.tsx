import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { normalizeOperationalStripMetrics } from '../../config/emergencyOperationalPresentationModel';
import OperationalStrip from '../emergency/OperationalStrip';
import { selectReceptionOperationalStripMetrics } from './receptionQueueModel';

function metricTone(metric) {
  if (metric.id === 'crowd-level') return metric.tone || 'neutral';
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
  patients = [] as any[],
  emsInbound = 0,
  emsArrivals = [] as any[],
  capacity = null,
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
      capacity,
    });
    return normalizeOperationalStripMetrics(
      selected.map((metric) => ({ ...metric, tone: metricTone(metric) })) as any,
      { onMetricSelect },
    );
  }, [patients, emsInbound, emsArrivals, capacity, stripMetricIds, settings, onMetricSelect]);

  return (
    <OperationalStrip
      screenMode={CARE_DROID_SCREEN_MODES.reception as any}
      metrics={metrics}
      onMetricSelect={onMetricSelect}
      shiftSummaryPath={shiftSummaryPath}
      showShiftLink={showShiftLink}
    />
  );
}
