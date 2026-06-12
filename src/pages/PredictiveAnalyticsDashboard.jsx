import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../components/ApiStateBanner';
import StateSourceNotice from '../components/StateSourceNotice';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  buildPredictiveAnalyticsAiPrompt,
  buildPredictiveAnalyticsSummary,
  DEMO_PREDICTIVE_ANALYTICS_MODELS,
  searchPredictiveModels,
} from '../data/predictiveAnalyticsDashboard';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';
import './PredictiveAnalyticsDashboard.css';

function getAssistantText(response) {
  return response?.data?.response || response?.data?.message || response?.message?.content || response?.message || '';
}

export default function PredictiveAnalyticsDashboard() {
  const [query, setQuery] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('deterioration-risk');
  const [assistantExplanation, setAssistantExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredModels = useMemo(() => searchPredictiveModels(query), [query]);
  const summary = useMemo(() => buildPredictiveAnalyticsSummary(), []);
  const selectedModel =
    DEMO_PREDICTIVE_ANALYTICS_MODELS.find((model) => model.id === selectedModelId) ||
    filteredModels[0] ||
    DEMO_PREDICTIVE_ANALYTICS_MODELS[0];

  const explainModel = async (model = selectedModel) => {
    setSelectedModelId(model.id);
    setLoading(true);
    setError('');
    setAssistantExplanation('');

    try {
      const response = await sendClinicalChatMessage({
        tool: 'predictive-analytics-dashboard',
        message: buildPredictiveAnalyticsAiPrompt(model),
      });
      if (!response?.ok) {
        throw new Error(response?.data?.message || response?.message || 'Unable to explain prediction.');
      }
      setAssistantExplanation(getAssistantText(response) || 'No predictive explanation returned.');
    } catch (err) {
      setError(err.message || 'Unable to explain prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="predictive-analytics-page">
      <section className="predictive-analytics-hero" aria-labelledby="predictive-analytics-title">
        <div>
          <p className="predictive-analytics-eyebrow">{summary.predictionLabel}</p>
          <h1 id="predictive-analytics-title">Predictive Analytics Dashboard</h1>
          <p>
            Demo predictive models for deterioration risk, readmission risk, sepsis risk, ICU
            transfer risk, device failure risk, and fleet maintenance risk. Predictions are decision
            support only and require clinical or operations review.
          </p>
        </div>
        <div className="predictive-analytics-hero__actions">
          <Link to="/clinical-decision-support">Clinical decision support</Link>
          <Link to="/protocols">Protocols</Link>
          <Link to="/medical-iot">Devices</Link>
          <Link to="/fleet/predictive-maintenance">Fleet maintenance</Link>
        </div>
      </section>

      <StateSourceNotice
        title="Predictive analytics source states"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.LOCAL_ONLY,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Risk scores and model cards are demo predictive examples. AI explanations require the chat backend; if that backend is unavailable, no local text is presented as a live model explanation. Automated prediction actions are unsupported."
      />

      <section className="predictive-analytics-panel" aria-label="Predictive analytics search">
        <div className="predictive-analytics-search">
          <input
            type="search"
            aria-label="Search predictive analytics"
            placeholder="Search sepsis, readmission, ICU, device, fleet..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className="predictive-analytics-ai-button" onClick={() => explainModel()} disabled={loading}>
            {loading ? 'Explaining...' : 'Explain selected prediction'}
          </button>
        </div>
      </section>

      <section className="predictive-analytics-summary-grid" aria-label="Predictive analytics summary">
        <article className="predictive-analytics-summary-card">
          <span>Model source</span>
          <strong>{summary.sourceStatus}</strong>
        </article>
        <article className="predictive-analytics-summary-card">
          <span>Demo models</span>
          <strong>{summary.modelCount}</strong>
        </article>
        <article className="predictive-analytics-summary-card">
          <span>High / critical predictions</span>
          <strong>{summary.highOrCriticalCount}</strong>
        </article>
        <article className="predictive-analytics-summary-card">
          <span>Highest risk</span>
          <strong>{summary.highestRisk.title}</strong>
        </article>
      </section>

      <section className="predictive-analytics-grid" aria-label="Predictive model cards">
        {filteredModels.map((model) => (
          <article key={model.id} className="predictive-analytics-card">
            <div className="predictive-analytics-card__header">
              <div>
                <p className="predictive-analytics-eyebrow">{model.domain}</p>
                <h2>{model.title}</h2>
                <span className={`predictive-analytics-band predictive-analytics-band--${model.band}`}>
                  {model.band} prediction
                </span>
              </div>
              <div
                className="predictive-analytics-score"
                style={{ '--score-angle': `${Math.round(model.score * 3.6)}deg` }}
                aria-label={`${model.title} score ${model.score} of 100`}
              >
                {model.score}
              </div>
            </div>

            <p>
              <strong>Clearly labeled prediction:</strong> {model.modelStatus}; {model.horizon}; confidence{' '}
              {Math.round(model.confidence * 100)}%.
            </p>

            <div>
              <strong>Signals</strong>
              <ul>
                {model.signals.map((signal) => <li key={signal}>{signal}</li>)}
              </ul>
            </div>
            <div>
              <strong>Review actions</strong>
              <ul>
                {model.recommendedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>
            <div className="predictive-analytics-card__actions">
              <Link to={model.linkedPath}>Open linked workflow</Link>
              <button type="button" className="predictive-analytics-ai-button" onClick={() => explainModel(model)}>
                Explain prediction
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="predictive-analytics-panel" aria-labelledby="predictive-ai-explanation">
        <h2 id="predictive-ai-explanation">AI prediction explanation</h2>
        <ApiStateBanner error={error} onRetry={() => explainModel()} />
        {loading && <p className="predictive-analytics-explanation">Loading prediction explanation...</p>}
        {assistantExplanation ? (
          <p className="predictive-analytics-explanation">{assistantExplanation}</p>
        ) : (
          <p className="predictive-analytics-explanation">
            Select a prediction and ask AI to explain the contributing signals, confidence, review
            actions, and demo-model limitations.
          </p>
        )}
      </section>
    </section>
  );
}
