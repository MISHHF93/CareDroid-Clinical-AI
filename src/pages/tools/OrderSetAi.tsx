import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { generateOrderSetAi } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'order-set-ai',
  name: 'Intelligent Order Set Assistant',
  path: '/tools/order-set-ai',
  color: '#38bdf8',
  description: 'Suggest evidence-linked order bundles and protocol pathways for clinician review',
  shortcut: 'Ctrl+Shift+V',
  category: 'Reference',
};

const INITIAL_FORM = {
  clinicalScenario:
    'Suspected sepsis with hypotension, fever, elevated lactate, and pneumonia source concern.',
  diagnosis: 'Sepsis / pneumonia',
  patientContext: 'CKD stage 3 and penicillin allergy.',
  constraints: 'Renal dosing, allergy review, local antimicrobial stewardship pathway.',
};

export default function OrderSetAi({ embedded = false, onCloseEmbedded }: any = {}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!form.clinicalScenario.trim()) {
      setError('Enter a clinical scenario before generating order set suggestions.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateOrderSetAi({
      clinicalScenario: form.clinicalScenario,
      diagnosis: form.diagnosis.trim() || undefined,
      patientContext: form.patientContext.trim() || undefined,
      constraints: form.constraints.trim() || undefined,
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to generate order set suggestions.');
    }
    setLoading(false);
  };

  const clear = () => {
    setForm({ clinicalScenario: '', diagnosis: '', patientContext: '', constraints: '' });
    setResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <section className="simple-tool-result-panel" role="note">
          <h2>Review Required</h2>
          <p>
            No autonomous order placement. Order Set AI suggests bundles and protocol pathways only;
            a licensed clinician must review, edit, enter, and sign any orders.
          </p>
        </section>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="order-set-inputs">
            <h2 id="order-set-inputs">Clinical Scenario</h2>

            <label className="simple-tool-label" htmlFor="order-set-scenario">
              Clinical scenario
            </label>
            <textarea
              id="order-set-scenario"
              className="diagnosis-field diagnosis-field--tall"
              value={form.clinicalScenario}
              onChange={(event) => updateField('clinicalScenario', event.target.value)}
              placeholder="e.g., Suspected sepsis with hypotension and elevated lactate"
            />

            <label className="simple-tool-label" htmlFor="order-set-diagnosis">
              Working diagnosis / pathway
            </label>
            <input
              id="order-set-diagnosis"
              className="diagnosis-field"
              value={form.diagnosis}
              onChange={(event) => updateField('diagnosis', event.target.value)}
              placeholder="Sepsis, ACS, stroke, COPD, admission review"
            />

            <label className="simple-tool-label" htmlFor="order-set-context">
              Patient context
            </label>
            <textarea
              id="order-set-context"
              className="diagnosis-field"
              value={form.patientContext}
              onChange={(event) => updateField('patientContext', event.target.value)}
              placeholder="Allergies, renal function, pregnancy status, anticoagulation, comorbidities"
            />

            <label className="simple-tool-label" htmlFor="order-set-constraints">
              Constraints
            </label>
            <textarea
              id="order-set-constraints"
              className="diagnosis-field"
              value={form.constraints}
              onChange={(event) => updateField('constraints', event.target.value)}
              placeholder="Local protocol, renal dosing, stewardship, formulary, contraindications"
            />

            <div className="tool-form-actions">
              <button
                type="button"
                className="diagnosis-primary-btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating suggestions...' : 'Suggest order bundles'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clear}>
                Clear
              </button>
            </div>
          </section>

          <section
            className="diagnosis-panel diagnosis-panel--scroll"
            aria-labelledby="order-set-output"
          >
            <h2 id="order-set-output">Suggested Bundles</h2>
            <ApiStateBanner error={error} onRetry={handleGenerate} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">
                  Matching protocols and bundle suggestions...
                </p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                {result.orderBundles?.map((bundle) => (
                  <article className="simple-tool-result-panel" key={bundle.id}>
                    <h3>{bundle.title}</h3>
                    <p>{bundle.intent}</p>
                    <h4>Suggested orders for review</h4>
                    <ul>
                      {bundle.suggestedOrders.map((order) => (
                        <li key={`${bundle.id}-${order.label}`}>
                          <strong>{order.category}</strong>: {order.label} - {order.rationale}
                        </li>
                      ))}
                    </ul>
                    <h4>Evidence links</h4>
                    <ul>
                      {bundle.evidenceLinks.map((link) => (
                        <li key={`${bundle.id}-${link.label}`}>
                          <strong>{link.label}</strong>: {link.basis}
                        </li>
                      ))}
                    </ul>
                    <h4>Review checklist</h4>
                    <ul>
                      {bundle.reviewChecklist.map((item) => (
                        <li key={`${bundle.id}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}

                <section className="simple-tool-result-panel">
                  <h3>Protocol Pathways</h3>
                  {result.protocolPathways?.length ? (
                    <ul>
                      {result.protocolPathways.map((pathway) => (
                        <li key={pathway.id}>
                          <strong>{pathway.name}</strong>: {pathway.trigger} Steps:{' '}
                          {pathway.steps.join(' ')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No specific protocol pathway matched the current scenario.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Explainability</h3>
                  <p>
                    <strong>Method:</strong> {result.explainability?.method}
                  </p>
                  <p>
                    <strong>Matched signals:</strong>{' '}
                    {(result.explainability?.matchedSignals || []).join(', ')}
                  </p>
                  <p>
                    <strong>Limitations:</strong>{' '}
                    {(result.explainability?.limitations || []).join(' ')}
                  </p>
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Safety</h3>
                  <p>
                    <strong>Review required:</strong> {result.safety?.reviewRequired ? 'Yes' : 'No'}
                  </p>
                  <p>
                    <strong>Autonomous order placement:</strong>{' '}
                    {result.safety?.autonomousOrderPlacement ? 'Allowed' : 'Blocked'}
                  </p>
                  <p>
                    <strong>Blocked actions:</strong>{' '}
                    {(result.safety?.blockedActions || []).join(', ')}
                  </p>
                  <ul>
                    {(result.safety?.warnings || []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <div className="tool-empty-state">
                Enter a clinical scenario to generate review-required order bundle suggestions.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
