import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import { buildNativeAiPatientSnapshot } from '../../services/nativeAiCore';
import { AiTruthLabel, fromNativeAiSourceState } from '../ai/AiTruthLabel';
import './SpecialistInferenceBadge.css';

type SpecialistInferenceBadgeProps = {
  patient: Patient;
  compact?: boolean;
  className?: string;
};

export default function SpecialistInferenceBadge({
  patient,
  compact = false,
  className = '',
}: SpecialistInferenceBadgeProps) {
  const snapshot = useMemo(() => buildNativeAiPatientSnapshot(patient), [patient]);
  const primary = snapshot.specialistInferences[0];

  if (!primary || primary.confidence < 0.5) return null;

  const truthLabel = fromNativeAiSourceState(primary.sourceState, {
    sourceContext: `Clinical specialist routing engine ${primary.modelId}@${primary.modelVersion}`,
    reviewRequired: primary.requiresHumanReview,
  });

  return (
    <span
      className={[
        'specialist-inference-badge',
        compact ? 'specialist-inference-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${primary.prediction}. ${primary.keyPredictors.join('; ')}. ${primary.sourceState} model.`}
      aria-label={`${primary.specialistLabel} prediction: ${primary.prediction} at ${Math.round(primary.confidence * 100)} percent confidence`}
    >
      <span className="specialist-inference-badge__label">{primary.specialistLabel}</span>
      <span className="specialist-inference-badge__value">{primary.prediction}</span>
      <span className="specialist-inference-badge__meta">
        {Math.round(primary.confidence * 100)}% · {primary.sourceState}
      </span>
      <AiTruthLabel {...truthLabel} compact />
    </span>
  );
}
