import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import { AIRecommendationCard } from './AIRecommendationCard';
import './AIComponents.css';

type AIInsightPanelProps = {
  title?: string;
  subtitle?: string;
  responses: CareDroidAIResponse[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

export function AIInsightPanel({
  title = 'AI insights',
  subtitle = 'Decision support for the care team',
  responses,
  isLoading = false,
  error = null,
  emptyMessage = 'No AI insights are available yet.',
}: AIInsightPanelProps) {
  return (
    <section className="cd-ai-panel" aria-label={title}>
      <header className="cd-ai-panel__header">
        <div>
          <p>CareDroid AI</p>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <strong>{responses.length}</strong>
      </header>

      {isLoading ? <p className="cd-ai-panel__state" role="status">Generating AI insight...</p> : null}
      {error ? <p className="cd-ai-panel__state cd-ai-panel__state--error" role="alert">{error}</p> : null}

      {!isLoading && !error && responses.length === 0 ? (
        <p className="cd-ai-panel__state">{emptyMessage}</p>
      ) : null}

      <div className="cd-ai-panel__list">
        {responses.map((response, index) => (
          <AIRecommendationCard
            key={`${response.intent}-${response.generatedAt}-${index}`}
            response={response}
            compact
          />
        ))}
      </div>
    </section>
  );
}
