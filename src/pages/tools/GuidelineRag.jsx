import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { queryGuidelineEvidence } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'guideline-rag',
  name: 'Guideline Retrieval + Evidence Engine',
  path: '/tools/guideline-rag',
  color: '#4A7C9E',
  description: 'Retrieve guideline evidence, summarize cited recommendations, and show source attribution',
  shortcut: 'Ctrl+Shift+G',
  category: 'Reference',
};

export default function GuidelineRag({ embedded = false, onCloseEmbedded } = {}) {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Enter a guideline or evidence question before searching.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await queryGuidelineEvidence({
      query,
      specialty: specialty.trim() || undefined,
      topK: 5,
      minScore: 0.6,
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to retrieve guideline evidence.');
    }
    setLoading(false);
  };

  const clear = () => {
    setQuery('');
    setSpecialty('');
    setResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <div className="simple-tool-result-panel" role="note">
          <h2>Evidence Guardrails</h2>
          <p>
            Summaries are generated only from retrieved guideline passages. If the evidence base does not
            support an answer, the engine should say so instead of filling gaps with unsupported medical claims.
          </p>
        </div>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="guideline-rag-inputs">
            <h2 id="guideline-rag-inputs">Evidence Query</h2>

            <label className="simple-tool-label" htmlFor="guideline-rag-query">
              Guideline question
            </label>
            <textarea
              id="guideline-rag-query"
              className="diagnosis-field diagnosis-field--tall"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g., What do guidelines say about sepsis bundle timing?"
            />

            <label className="simple-tool-label" htmlFor="guideline-rag-specialty">
              Specialty filter (optional)
            </label>
            <input
              id="guideline-rag-specialty"
              className="diagnosis-field"
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              placeholder="e.g., emergency medicine, cardiology, infectious disease"
            />

            <div className="tool-form-actions">
              <button
                type="button"
                className="diagnosis-primary-btn"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? 'Retrieving evidence...' : 'Retrieve evidence'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clear}>
                Clear
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="guideline-rag-output">
            <h2 id="guideline-rag-output">Evidence Summary</h2>
            <ApiStateBanner error={error} onRetry={query.trim() ? handleSearch : undefined} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">Retrieving guideline passages and citations...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                <div className="simple-tool-result-panel">
                  <strong>Status:</strong> {result.status}
                  <br />
                  <strong>Confidence:</strong> {Math.round((result.confidence || 0) * 100)}%
                  <br />
                  <strong>Run ID:</strong> {result.runId}
                </div>

                <section className="simple-tool-result-panel">
                  <h3>Recommendations Summary</h3>
                  {result.summary?.recommendations?.length ? (
                    <ul>
                      {result.summary.recommendations.map((item) => (
                        <li key={item.id}>
                          {item.text}{' '}
                          <strong>{(item.citationIds || []).map((id) => `[${id}]`).join(' ')}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{result.summary?.unsupportedClaimNotice || 'No supported recommendation summary found.'}</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Citations</h3>
                  {result.citations?.length ? (
                    <ol>
                      {result.citations.map((citation) => (
                        <li key={citation.id}>
                          <strong>{citation.title}</strong>
                          {citation.organization ? ` — ${citation.organization}` : ''}
                          {citation.date ? ` (${citation.date})` : ''}
                          {citation.url ? (
                            <>
                              {' '}
                              <a href={citation.url} target="_blank" rel="noreferrer">
                                Source
                              </a>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>No citations were retrieved.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Source Attribution</h3>
                  <ul>
                    {(result.sources || []).map((source) => (
                      <li key={source.chunkId}>
                        {source.title} · chunk {source.chunkIndex ?? 'n/a'} · score{' '}
                        {Math.round((source.score || 0) * 100)}%
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Explainability</h3>
                  <p>{result.explainability?.retrievalMethod}</p>
                  <ul>
                    {(result.explainability?.limitations || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <div className="tool-empty-state">
                Enter a guideline question to retrieve cited evidence and explain how the summary was assembled.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
