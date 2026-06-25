import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { generateDifferentialAi } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'differential-ai',
  name: 'Differential Diagnosis Assistant',
  path: '/tools/differential-ai',
  color: '#8B5CF6',
  description: 'Ranked differential diagnosis decision support from symptoms, labs, history, and demographics',
  shortcut: 'Ctrl+Shift+X',
  category: 'Diagnostic',
};

export default function DifferentialAi({ embedded = false, onCloseEmbedded } = {}) {
  const [symptoms, setSymptoms] = useState('');
  const [labs, setLabs] = useState('');
  const [history, setHistory] = useState('');
  const [demographics, setDemographics] = useState({ age: '', sex: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!symptoms.trim()) {
      setError('Enter symptoms before generating a differential.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateDifferentialAi({
      symptoms,
      labs: labs.trim() || undefined,
      history: history.trim() || undefined,
      demographics: {
        ...(demographics.age ? { age: demographics.age } : {}),
        ...(demographics.sex ? { sex: demographics.sex } : {}),
      },
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to generate differential decision support.');
    }
    setLoading(false);
  };

  const clear = () => {
    setSymptoms('');
    setLabs('');
    setHistory('');
    setDemographics({ age: '', sex: '' });
    setResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <div className="simple-tool-result-panel" role="note">
          <h2>Safety Scope</h2>
          <p>
            Decision support only. Not diagnosis. This ranked list does not rule in or rule out disease and
            must be reviewed by a clinician before testing, treatment, disposition, or orders.
          </p>
        </div>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="differential-ai-inputs">
            <h2 id="differential-ai-inputs">Clinical Inputs</h2>

            <label className="simple-tool-label" htmlFor="differential-symptoms">
              Symptoms
            </label>
            <textarea
              id="differential-symptoms"
              className="diagnosis-field diagnosis-field--tall"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="e.g., Chest pressure, diaphoresis, nausea, dyspnea"
            />

            <label className="simple-tool-label" htmlFor="differential-labs">
              Labs and studies
            </label>
            <textarea
              id="differential-labs"
              className="diagnosis-field"
              value={labs}
              onChange={(event) => setLabs(event.target.value)}
              placeholder="e.g., Elevated troponin, ECG changes, leukocytosis"
            />

            <label className="simple-tool-label" htmlFor="differential-history">
              History
            </label>
            <textarea
              id="differential-history"
              className="diagnosis-field"
              value={history}
              onChange={(event) => setHistory(event.target.value)}
              placeholder="e.g., HTN, diabetes, prior DVT, smoking"
            />

            <div className="tool-form-row-2">
              <div>
                <label className="simple-tool-label" htmlFor="differential-age">
                  Age
                </label>
                <input
                  id="differential-age"
                  className="diagnosis-field"
                  value={demographics.age}
                  onChange={(event) => setDemographics((current) => ({ ...current, age: event.target.value }))}
                  placeholder="Years"
                />
              </div>
              <div>
                <label className="simple-tool-label" htmlFor="differential-sex">
                  Sex
                </label>
                <input
                  id="differential-sex"
                  className="diagnosis-field"
                  value={demographics.sex}
                  onChange={(event) => setDemographics((current) => ({ ...current, sex: event.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="tool-form-actions">
              <button
                type="button"
                className="diagnosis-primary-btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating differential...' : 'Generate ranked differential'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clear}>
                Clear
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="differential-ai-output">
            <h2 id="differential-ai-output">Ranked Differentials</h2>
            <ApiStateBanner error={error} onRetry={symptoms.trim() ? handleGenerate : undefined} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">Analyzing inputs and building ranked differential...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                {result.rankedDifferentials?.map((item) => (
                  <article key={item.condition} className="simple-tool-result-panel">
                    <h3>
                      #{item.rank} {item.condition}
                    </h3>
                    <p>
                      <strong>Likelihood:</strong> {item.likelihood}
                    </p>
                    <p>
                      <strong>Supporting evidence:</strong> {item.supportingEvidence.join('; ')}
                    </p>
                    <p>
                      <strong>Missing evidence:</strong> {item.missingEvidence.join('; ')}
                    </p>
                    <p>
                      <strong>Urgency flags:</strong> {item.urgencyFlags.join('; ')}
                    </p>
                  </article>
                ))}

                <section className="simple-tool-result-panel">
                  <h3>Suggested Calculators</h3>
                  {result.suggestedCalculators?.length ? (
                    <ul>
                      {result.suggestedCalculators.map((calculator) => (
                        <li key={calculator.id}>
                          <strong>{calculator.label}</strong> ({calculator.id}) - {calculator.rationale}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No calculators matched the current presentation.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Explainability</h3>
                  <ul>
                    {(result.explainability?.reasoningTrace || []).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p>
                    <strong>Inputs used:</strong> {(result.explainability?.evidenceInputsUsed || []).join(', ')}
                  </p>
                  <p>
                    <strong>Limitations:</strong> {(result.explainability?.limitations || []).join(' ')}
                  </p>
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
              <div className="tool-empty-state">
                Enter symptoms, labs, history, and demographics to generate a clinician-reviewed differential.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
