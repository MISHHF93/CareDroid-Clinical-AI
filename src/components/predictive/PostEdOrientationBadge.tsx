import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import { DEFAULT_NATIVE_AI_THRESHOLDS } from '../../config/nativeAiThresholds.config';
import { predictPostEdOrientation } from '../../services/nativeAiCore';
import './PostEdOrientationBadge.css';

const ORIENTATION_LABELS = {
  admit: 'Admit',
  edou: 'EDOU',
  discharge: 'Discharge',
} as const;

type PostEdOrientationBadgeProps = {
  patient: Patient;
  compact?: boolean;
  className?: string;
};

export default function PostEdOrientationBadge({
  patient,
  compact = false,
  className = '',
}: PostEdOrientationBadgeProps) {
  const prediction = useMemo(() => predictPostEdOrientation(patient), [patient]);
  const topProbability = prediction.probabilities[prediction.orientation];

  if (topProbability < DEFAULT_NATIVE_AI_THRESHOLDS.orientationDisplayPercent) return null;

  return (
    <span
      className={[
        'post-ed-orientation-badge',
        `post-ed-orientation-badge--${prediction.orientation}`,
        compact ? 'post-ed-orientation-badge--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${prediction.keyPredictors.join(' · ')}. ${prediction.sourceState} model ${prediction.modelVersion}.`}
      aria-label={`Predicted post-ED orientation ${ORIENTATION_LABELS[prediction.orientation]} at ${topProbability} percent`}
    >
      Orient: {ORIENTATION_LABELS[prediction.orientation]} {topProbability}%
    </span>
  );
}