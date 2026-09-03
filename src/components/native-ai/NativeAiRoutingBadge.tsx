import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import { buildNativeAiPatientSnapshot, formatRoutingLabel } from '../../services/nativeAiCore';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import './NativeAiRoutingBadge.css';

type NativeAiRoutingBadgeProps = {
  patient: Patient;
  compact?: boolean;
  className?: string;
};

export default function NativeAiRoutingBadge({
  patient,
  compact = false,
  className = '',
}: NativeAiRoutingBadgeProps) {
  const snapshot = useMemo(() => buildNativeAiPatientSnapshot(patient), [patient]);
  const truthLabel = fromNativeAiSourceState(snapshot.routing.sourceState, {
    sourceContext: `Panel-of-experts routing engine ${snapshot.routing.routerModelVersion}`,
    reviewRequired: true,
  });

  return (
    <span
      className={[
        'native-ai-routing-badge',
        compact ? 'native-ai-routing-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${snapshot.routing.disclaimer} Key signals: ${snapshot.routing.keySignals.join('; ')}`}
      aria-label={`Native AI routed to ${formatRoutingLabel(snapshot.routing)} with ${Math.round(snapshot.routing.confidence * 100)} percent confidence`}
    >
      <span className="native-ai-routing-badge__label">AI Route</span>
      <span className="native-ai-routing-badge__value">{formatRoutingLabel(snapshot.routing)}</span>
      <span className="native-ai-routing-badge__meta">
        {Math.round(snapshot.routing.confidence * 100)}% · {snapshot.sourceState}
      </span>
      <AiTruthLabel {...truthLabel} compact />
    </span>
  );
}
