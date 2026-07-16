/**
 * Architect Mode Stage G — render accountable AI recommendations with evidence,
 * confidence, model/prompt version, safety status, and human-review requirement.
 */
import type { AccountableRecommendation } from '../../contracts/accountableAi';
import { isAccountableAssistSafe } from '../../contracts/accountableAi';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import './AccountableRecommendationCard.css';

export type AccountableRecommendationCardProps = {
  recommendation: AccountableRecommendation;
  compact?: boolean;
};

export function AccountableRecommendationCard({
  recommendation,
  compact = false,
}: AccountableRecommendationCardProps) {
  const safe = isAccountableAssistSafe(recommendation);
  const status = recommendation.safety.status;

  return (
    <article
      className={[
        'cd-accountable-rec',
        compact ? 'cd-accountable-rec--compact' : '',
        `cd-accountable-rec--${status}`,
      ]
        .filter(Boolean)
        .join(' ')}
      data-ai="true"
      data-testid="accountable-recommendation-card"
      aria-label="AI recommendation with evidence and safety status"
    >
      <header className="cd-accountable-rec__header">
        <span className="cd-ai-badge" aria-hidden="true" />
        <span
          className={`cd-accountable-rec__safety cd-accountable-rec__safety--${status}`}
          data-testid="accountable-safety-status"
        >
          {status === 'ok' && 'Assist'}
          {status === 'degraded' && 'Degraded'}
          {status === 'abstain' && 'Abstained'}
          {status === 'escalate' && 'Escalate'}
        </span>
        {recommendation.confidence !== null && recommendation.confidence !== undefined ? (
          <AIConfidenceBadge confidence={recommendation.confidence} />
        ) : (
          <span className="cd-accountable-rec__no-confidence">No confidence score</span>
        )}
      </header>

      <div className="cd-accountable-rec__content">{recommendation.content}</div>

      {recommendation.uncertainty ? (
        <p className="cd-accountable-rec__uncertainty">
          <strong>Uncertainty:</strong> {recommendation.uncertainty}
        </p>
      ) : null}

      {recommendation.evidence.length > 0 ? (
        <section className="cd-accountable-rec__evidence" aria-label="Evidence">
          <h4 className="cd-accountable-rec__section-title">Evidence</h4>
          <ul>
            {recommendation.evidence.map((item) => (
              <li key={item.sourceId}>
                <span className="cd-accountable-rec__cite">{item.citation}</span>
                {typeof item.score === 'number' ? (
                  <span className="cd-accountable-rec__score">
                    {' '}
                    ({Math.round(item.score * 100)}%)
                  </span>
                ) : null}
                {item.outdated ? (
                  <span className="cd-accountable-rec__outdated"> outdated source</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="cd-accountable-rec__no-evidence">No retrieval evidence attached.</p>
      )}

      <footer className="cd-accountable-rec__meta">
        <span>
          Model: {recommendation.model.provider}/{recommendation.model.name}
          {recommendation.model.version ? `@${recommendation.model.version}` : ''}
        </span>
        <span>Prompt: {recommendation.promptVersion}</span>
        {recommendation.provenance.corpusVersion !== undefined ? (
          <span>Corpus: {String(recommendation.provenance.corpusVersion)}</span>
        ) : null}
      </footer>

      {recommendation.humanReviewRequired || !safe ? (
        <p className="cd-accountable-rec__review" role="status">
          Human review required — do not treat as an autonomous clinical decision.
        </p>
      ) : (
        <p className="cd-accountable-rec__review cd-accountable-rec__review--assist" role="status">
          Decision support only — verify against sources before acting.
        </p>
      )}

      {recommendation.safety.reasons.length > 0 ? (
        <ul className="cd-accountable-rec__reasons" aria-label="Safety reasons">
          {recommendation.safety.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export default AccountableRecommendationCard;
