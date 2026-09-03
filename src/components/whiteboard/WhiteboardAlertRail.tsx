import { useMemo } from 'react';
import OperationalStrip from '../emergency/OperationalStrip';
import {
  capWhiteboardAlertMetrics,
  MAX_WHITEBOARD_ALERT_METRICS,
  type WhiteboardAlertMetric,
} from './whiteboardAlertRailModel';
import './WhiteboardAlertRail.css';

type WhiteboardAlertRailProps = {
  metrics: WhiteboardAlertMetric[];
  ariaLabel?: string;
  maxMetrics?: number;
  readOnly?: boolean;
  className?: string;
  onSelectPatient?: (patientId: string) => void;
};

export default function WhiteboardAlertRail({
  metrics,
  ariaLabel = 'Whiteboard operational alerts',
  maxMetrics = MAX_WHITEBOARD_ALERT_METRICS,
  readOnly = false,
  className = '',
  onSelectPatient,
}: WhiteboardAlertRailProps) {
  const stripMetrics = useMemo(() => {
    const capped = capWhiteboardAlertMetrics(metrics, maxMetrics);
    return capped.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
      tone: metric.tone,
      hint: metric.hint,
      interactive: metric.id !== 'alert-overflow' && Boolean(onSelectPatient),
      patientId: metric.patientId,
    }));
  }, [maxMetrics, metrics, onSelectPatient]);

  if (!stripMetrics.length) return null;

  return (
    <div className={['whiteboard-alert-rail', className].filter(Boolean).join(' ')}>
      <OperationalStrip
        metrics={stripMetrics}
        layout={'compact' as any}
        ariaLabel={ariaLabel as any}
        eyebrow={null}
        readOnly={readOnly as any}
        className="whiteboard-alert-rail__strip"
        onMetricSelect={
          ((metric) => {
            if (readOnly || !onSelectPatient) return;
            const patientId = (metric as { patientId?: string }).patientId;
            if (patientId) onSelectPatient(patientId);
          }) as any
        }
      />
    </div>
  );
}
