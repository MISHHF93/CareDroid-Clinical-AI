import { useState } from 'react';
import './AiRecommendationCard.css';

export interface AiRecommendation {
  /** The primary clinical recommendation text */
  recommendation: string;
  /** Confidence as a value between 0 and 1 */
  confidence: number;
  /** Human-readable reasoning / evidence summary */
  reasoning: string;
  /** Concrete suggested next action for the clinician */
  nextStep: string;
  /** Optional source or model identifier */
  source?: string;
}

interface AiRecommendationCardProps {
  recommendation: AiRecommendation;
  /** Called when the clinician records an override; if undefined the override button is hidden */
  onOverride?: (overridden: boolean) => void;
  /** Additional CSS class */
  className?: string;
}

function confidenceTier(value: number): 'high' | 'medium' | 'low' {
  if (value >= 0.8) return 'high';
  if (value >= 0.55) return 'medium';
  return 'low';
}

function confidenceLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function confidenceColor(tier: 'high' | 'medium' | 'low'): string {
  if (tier === 'high') return 'var(--status-stable, #22c55e)';
  if (tier === 'medium') return 'var(--status-warning, #f59e0b)';
  return 'var(--status-critical, #ef4444)';
}

/**
 * Displays a single AI clinical recommendation with full explainability context:
 * recommendation, confidence, reasoning, suggested next step, and clinician override.
 *
 * Designed to make AI workflow assistance feel trustworthy and auditable.
 * Does NOT imply that the AI replaces clinical judgment.
 */
export function AiRecommendationCard({
  recommendation,
  onOverride,
  className,
}: AiRecommendationCardProps) {
  const [overridden, setOverridden] = useState(false);

  const tier = confidenceTier(recommendation.confidence);
  const pct = Math.round(recommendation.confidence * 100);
  const color = confidenceColor(tier);

  const handleOverride = () => {
    const next = !overridden;
    setOverridden(next);
    onOverride?.(next);
  };

  return (
    <article
      className={[
        'ai-rec-card',
        overridden ? 'ai-rec-card--overridden' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="AI clinical recommendation"
    >
      {/* Header */}
      <div className="ai-rec-card__header">
        <div className="ai-rec-card__header-left">
          <span className="ai-rec-card__ai-badge" aria-label="AI generated recommendation">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            AI Assist
          </span>
          {recommendation.source && (
            <span className="ai-rec-card__source">{recommendation.source}</span>
          )}
        </div>

        <div className="ai-rec-card__confidence" aria-label={`Confidence: ${pct}%`}>
          <span className={`ai-rec-card__confidence-label ai-rec-card__confidence-label--${tier}`}>
            {confidenceLabel(recommendation.confidence)}
          </span>
          <div className="ai-rec-card__confidence-bar" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="AI confidence">
            <div
              className="ai-rec-card__confidence-fill"
              style={{ width: `${pct}%`, '--confidence-color': color } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="ai-rec-card__body">
        {/* Recommendation */}
        <div className="ai-rec-card__recommendation">
          <p className="ai-rec-card__section-label">Recommendation</p>
          <p className="ai-rec-card__recommendation-text">{recommendation.recommendation}</p>
        </div>

        <hr className="ai-rec-card__divider" />

        {/* Reasoning */}
        <div className="ai-rec-card__reasoning">
          <p className="ai-rec-card__section-label">Reasoning</p>
          <p className="ai-rec-card__reasoning-text">{recommendation.reasoning}</p>
        </div>

        {/* Suggested next step */}
        <div className="ai-rec-card__next-step" role="note" aria-label="Suggested next step">
          <svg className="ai-rec-card__next-step-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <p className="ai-rec-card__next-step-text">{recommendation.nextStep}</p>
        </div>
      </div>

      {/* Footer — override */}
      <div className="ai-rec-card__footer">
        <p className="ai-rec-card__disclaimer">
          AI decision support only. Clinical judgment required. Not a diagnosis.
        </p>
        {onOverride !== undefined && (
          <button
            type="button"
            className={[
              'ai-rec-card__override-btn',
              overridden ? 'ai-rec-card__override-btn--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={handleOverride}
            aria-pressed={overridden}
            aria-label={overridden ? 'Undo clinician override' : 'Override AI recommendation'}
          >
            {overridden ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Overridden
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Override
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default AiRecommendationCard;
