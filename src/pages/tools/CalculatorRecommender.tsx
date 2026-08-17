import { useState } from 'react';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import ApiStateBanner from '../../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../../services/clinicalChatService';
import {
  buildCalculatorRecommendationChatMessage,
  recommendCalculators,
} from '../../services/calculatorRecommendationService';
import ToolPageLayout from './ToolPageLayout';
import { AiTruthLabel } from '../../components/ai/AiTruthLabel';

const TOOL_CONFIG = {
  id: 'calculator-recommender-ai',
  name: 'Calculator Recommendation AI',
  path: '/tools/calculator-recommender',
  color: '#6B7BC4',
  description: 'Suggests CareDroid calculators from symptoms, chief complaint, and clinical keywords',
  shortcut: 'Ctrl+Shift+L',
  category: 'Calculator',
};

export default function CalculatorRecommender({ embedded = false, onCloseEmbedded }: any = {}) {
  const { profileNavigate } = useProfileNavigate();
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [clinicalKeywords, setClinicalKeywords] = useState('');
  const [result, setResult] = useState<any>(null);
  // recommendCalculators() (the "Suggest tools" button) is confirmed keyword-table
  // matching against a hardcoded rule list -- no model call. "Start chat workflow"
  // can ALSO populate `result` (see handleChatWorkflow below) via a real chat/AI
  // service call. Both write the same `result` state, so a single static label
  // would be wrong for whichever path didn't produce the current result -- track
  // which one actually did.
  const [resultSource, setResultSource] = useState<'deterministic' | 'chat' | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResult, setChatResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const input = { chiefComplaint, symptoms, clinicalKeywords };

  const handleRecommend = () => {
    if (![chiefComplaint, symptoms, clinicalKeywords].some((value) => value.trim())) {
      setError('Add a chief complaint, symptoms, or clinical keywords before recommending calculators.');
      return;
    }
    setError(null);
    setChatResult(null);
    setResult(recommendCalculators(input));
    setResultSource('deterministic');
  };

  const handleChatWorkflow = async () => {
    if (![chiefComplaint, symptoms, clinicalKeywords].some((value) => value.trim())) {
      setError('Add scenario details before starting the chat workflow.');
      return;
    }

    setChatLoading(true);
    setError(null);
    try {
      const response = await sendClinicalChatMessage({
        message: buildCalculatorRecommendationChatMessage(input),
        tool: 'calculator-recommender-ai',
        feature: 'calculator-recommender-ai',
      } as any);

      if (response.ok) {
        setChatResult(response.data);
        if (response.data?.toolResult?.result?.recommendations) {
          setResult({
            capabilityId: 'calculator-recommender-ai',
            status: 'matched',
            recommendations: response.data.toolResult.result.recommendations,
            matchedContexts: response.data.toolResult.result.matchedContexts || [],
            safety: response.data.toolResult.result.safety || { warnings: [] },
          });
          setResultSource('chat');
        }
      } else {
        setError(response.data?.message || 'Unable to start calculator recommendation chat workflow.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to start calculator recommendation chat workflow.');
    } finally {
      setChatLoading(false);
    }
  };

  const clear = () => {
    setChiefComplaint('');
    setSymptoms('');
    setClinicalKeywords('');
    setResult(null);
    setResultSource(null);
    setChatResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <div className="simple-tool-result-panel" role="note">
          <h2>Recommendation Scope</h2>
          <p>
            This workflow suggests existing CareDroid calculators only. It does not diagnose, rule out disease,
            or recommend treatment, disposition, orders, or medications.
          </p>
        </div>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="calculator-recommender-inputs">
            <h2 id="calculator-recommender-inputs">Clinical Scenario</h2>

            <label className="simple-tool-label" htmlFor="calculator-chief-complaint">
              Chief complaint
            </label>
            <input
              id="calculator-chief-complaint"
              className="diagnosis-field"
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
              placeholder="e.g., chest pain, dyspnea, fever, stroke symptoms"
            />

            <label className="simple-tool-label" htmlFor="calculator-symptoms">
              Symptoms
            </label>
            <textarea
              id="calculator-symptoms"
              className="diagnosis-field diagnosis-field--tall"
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              placeholder="e.g., substernal chest pressure, diaphoresis, elevated troponin, risk factors"
            />

            <label className="simple-tool-label" htmlFor="calculator-keywords">
              Clinical keywords
            </label>
            <input
              id="calculator-keywords"
              className="diagnosis-field"
              value={clinicalKeywords}
              onChange={(event) => setClinicalKeywords(event.target.value)}
              placeholder="e.g., ACS, PE, sepsis, cirrhosis, TIA"
            />

            <div className="tool-form-actions">
              <button type="button" className="diagnosis-primary-btn" onClick={handleRecommend}>
                Suggest tools
              </button>
              <button
                type="button"
                className="btn-diagnosis-secondary"
                onClick={handleChatWorkflow}
                disabled={chatLoading}
              >
                {chatLoading ? 'Starting chat...' : 'Start chat workflow'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clear}>
                Clear
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="calculator-recommendations">
            <h2 id="calculator-recommendations">Suggested Tools</h2>
            <ApiStateBanner error={error} onRetry={handleRecommend} />

            {chatLoading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">Building calculator recommendations...</p>
              </div>
            ) : result?.recommendations?.length ? (
              <div className="diagnosis-results-body">
                {resultSource === 'deterministic' ? (
                  <AiTruthLabel
                    state="Manual"
                    sourceContext="Keyword/rule matching against a fixed calculator list -- no model call."
                    reviewRequired
                    compact
                  />
                ) : null}
                {result.matchedContexts?.length ? (
                  <div className="simple-tool-result-panel">
                    <strong>Matched context:</strong>{' '}
                    {result.matchedContexts.map((context) => context.label).join(', ')}
                  </div>
                ) : null}

                {result.recommendations.map((tool) => (
                  <article key={tool.id} className="simple-tool-result-panel">
                    <h3>{tool.label}</h3>
                    <p>{tool.description}</p>
                    <button
                      type="button"
                      className="diagnosis-primary-btn"
                      onClick={() => profileNavigate(tool.navigationPath || tool.route || '/tools/calculators')}
                    >
                      Open {tool.label}
                    </button>
                  </article>
                ))}

                <div className="simple-tool-result-panel">
                  <h3>Safety</h3>
                  <ul>
                    {(result.safety?.warnings || []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : result ? (
              <div className="simple-tool-result-panel">
                No matching calculator found yet. Add more specific symptoms, chief complaint, or clinical keywords.
              </div>
            ) : (
              <div className="tool-empty-state">
                Try “chest pain with elevated troponin” to suggest HEART, TIMI, GRACE, and ASCVD tools.
              </div>
            )}

            {chatResult?.response ? (
              <div className="simple-tool-result-panel">
                <h3>Chat Workflow Response</h3>
                <p>{chatResult.response}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
