import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { fetchAiExplainabilityTrace } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'ai-explainability',
  name: 'AI Explainability',
  path: '/tools/ai-explainability',
  color: '#2563EB',
  description: 'Display confidence, source, reasoning, tool chain, and execution logs',
  shortcut: 'Ctrl+Shift+E',
  category: 'Reference',
};

const INITIAL_FORM = {
  toolId: 'guideline-rag',
  clinicalQuestion: 'Why did the AI provide this recommendation and what sources were used?',
  limit: '25',
};

function LogList({ logs = [] }) {
  if (!logs.length) return <p>No execution logs returned.</p>;

  return (
    <ul>
      {logs.map((log) => (
        <li key={`${log.id}-${log.timestamp}`}>
          <strong>{log.capabilityId}</strong>: {log.status} from {log.resource}; integrity{' '}
          {log.integrityVerified ? 'verified' : 'unverified'}; hash {log.hashPreview}
        </li>
      ))}
    </ul>
  );
}

export default function AiExplainability({ embedded = false, onCloseEmbedded } = {}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadTrace = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const response = await fetchAiExplainabilityTrace({
      toolId: form.toolId.trim() || undefined,
      clinicalQuestion: form.clinicalQuestion.trim() || undefined,
      limit: form.limit.trim() || undefined,
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to load explainability trace.');
    }
    setLoading(false);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <section className="simple-tool-result-panel" role="note">
          <h2>Trace Scope</h2>
          <p>
            AI Explainability displays confidence, source, reasoning, tool chain, and sanitized execution
            logs. It does not expose raw prompts, transcripts, or patient chart text.
          </p>
        </section>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="ai-explainability-inputs">
            <h2 id="ai-explainability-inputs">Trace Filters</h2>

            <label className="simple-tool-label" htmlFor="explainability-tool-id">
              Tool ID
            </label>
            <input
              id="explainability-tool-id"
              className="diagnosis-field"
              value={form.toolId}
              onChange={(event) => updateField('toolId', event.target.value)}
              placeholder="guideline-rag, differential-ai, order-set-ai"
            />

            <label className="simple-tool-label" htmlFor="explainability-question">
              Clinical question
            </label>
            <textarea
              id="explainability-question"
              className="diagnosis-field"
              value={form.clinicalQuestion}
              onChange={(event) => updateField('clinicalQuestion', event.target.value)}
              placeholder="Question or recommendation being reviewed"
            />

            <label className="simple-tool-label" htmlFor="explainability-limit">
              Log limit
            </label>
            <input
              id="explainability-limit"
              className="diagnosis-field"
              value={form.limit}
              onChange={(event) => updateField('limit', event.target.value)}
              placeholder="25"
            />

            <button
              type="button"
              className="diagnosis-primary-btn"
              onClick={loadTrace}
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Loading trace...' : 'Load explainability trace'}
            </button>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="ai-explainability-output">
            <h2 id="ai-explainability-output">Explainability Trace</h2>
            <ApiStateBanner error={error} onRetry={loadTrace} />

            {loading ? (
              <div aria-busy="true" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p style={{ color: 'var(--app-fg-muted)' }}>Loading confidence and execution trace...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                <section className="simple-tool-result-panel">
                  <h3>Confidence</h3>
                  <p>
                    <strong>{result.confidence?.label}</strong> ({Math.round((result.confidence?.score || 0) * 100)}%)
                  </p>
                  <p>{result.confidence?.rationale}</p>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Source</h3>
                  <ul>
                    {(result.source || []).map((source) => (
                      <li key={`${source.label}-${source.detail}`}>
                        <strong>{source.label}</strong>: {source.detail}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Reasoning</h3>
                  <ul>
                    {(result.reasoning || []).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Tool Chain</h3>
                  <ul>
                    {(result.toolChain || []).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Execution Logs</h3>
                  <LogList logs={result.executionLogs} />
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Safety</h3>
                  <ul>
                    {(result.safety?.warnings || []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--app-fg-muted)' }}>
                Load a trace to review confidence, sources, reasoning, tool chain, and logs.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
