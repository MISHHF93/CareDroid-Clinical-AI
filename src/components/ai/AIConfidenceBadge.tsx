import './AIComponents.css';

type AIConfidenceBadgeProps = {
  confidence: number;
  label?: string;
};

export function normalizeConfidence(confidence: number): number {
  const percent = confidence <= 1 ? confidence * 100 : confidence;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

export function confidenceTone(percent: number): 'high' | 'medium' | 'low' {
  if (percent >= 80) return 'high';
  if (percent >= 60) return 'medium';
  return 'low';
}

export function AIConfidenceBadge({ confidence, label = 'confidence' }: AIConfidenceBadgeProps) {
  const percent = normalizeConfidence(confidence);
  const tone = confidenceTone(percent);

  return (
    <span
      className={`cd-ai-confidence cd-ai-confidence--${tone}`}
      aria-label={`${percent}% ${label}`}
    >
      {percent}% {label}
    </span>
  );
}
