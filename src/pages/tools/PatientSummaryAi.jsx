import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { generatePatientSummaryAi } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'patient-summary-ai',
  name: 'Patient Summary AI',
  path: '/tools/patient-summary-ai',
  color: '#0F766E',
  description: 'Summarize active problems, medications, recent labs, alerts, and risk factors',
  shortcut: 'Ctrl+Shift+Z',
  category: 'Diagnostic',
};

const INITIAL_FORM = {
  patientContext: '72-year-old admitted for CHF exacerbation with CKD and diabetes.',
  problems: 'CHF exacerbation; CKD stage 3; diabetes; hypertension',
  medications: 'Furosemide; lisinopril; metformin; insulin glargine',
  labs: 'Creatinine 1.8 from 1.2; K 5.5; A1c 8.4',
  alerts: 'Hyperkalemia alert; fall risk; renal dose adjustment',
  riskFactors: 'Age; CKD; diabetes; prior MI; smoking history',
  notes: '',
};

function SummarySection({ title, emptyText, children }) {
  return (
    <section className="simple-tool-result-panel">
      <h3>{title}</h3>
      {children || <p>{emptyText}</p>}
    </section>
  );
}

export default function PatientSummaryAi({ embedded = false, onCloseEmbedded } = {}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGenerate = async () => {
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() || undefined])
    );

    if (!Object.values(payload).some(Boolean)) {
      setError('Add patient context, problems, medications, labs, alerts, risk factors, or notes first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generatePatientSummaryAi(payload);
    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to generate patient summary.');
    }
    setLoading(false);
  };

  const clear = () => {
    setForm({
      patientContext: '',
      problems: '',
      medications: '',
      labs: '',
      alerts: '',
      riskFactors: '',
      notes: '',
    });
    setResult(null);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <section className="simple-tool-result-panel" role="note">
          <h2>Summary Scope</h2>
          <p>
            Patient Summary AI extracts a review-ready snapshot from submitted chart context. It does not
            reconcile the chart autonomously, update the EHR, or replace clinician source-record review.
          </p>
        </section>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="patient-summary-inputs">
            <h2 id="patient-summary-inputs">Chart Context</h2>

            <label className="simple-tool-label" htmlFor="summary-context">
              Patient context
            </label>
            <textarea
              id="summary-context"
              className="diagnosis-field"
              value={form.patientContext}
              onChange={(event) => updateField('patientContext', event.target.value)}
              placeholder="Age, encounter context, high-level chart frame"
            />

            <label className="simple-tool-label" htmlFor="summary-problems">
              Problems
            </label>
            <textarea
              id="summary-problems"
              className="diagnosis-field"
              value={form.problems}
              onChange={(event) => updateField('problems', event.target.value)}
              placeholder="Active and chronic problems"
            />

            <label className="simple-tool-label" htmlFor="summary-medications">
              Medications
            </label>
            <textarea
              id="summary-medications"
              className="diagnosis-field"
              value={form.medications}
              onChange={(event) => updateField('medications', event.target.value)}
              placeholder="Current medications, recent changes, reconciliation context"
            />

            <label className="simple-tool-label" htmlFor="summary-labs">
              Recent labs
            </label>
            <textarea
              id="summary-labs"
              className="diagnosis-field"
              value={form.labs}
              onChange={(event) => updateField('labs', event.target.value)}
              placeholder="Recent lab values and trends"
            />

            <label className="simple-tool-label" htmlFor="summary-alerts">
              Alerts
            </label>
            <textarea
              id="summary-alerts"
              className="diagnosis-field"
              value={form.alerts}
              onChange={(event) => updateField('alerts', event.target.value)}
              placeholder="Allergies, clinical alerts, fall risk, safety flags"
            />

            <label className="simple-tool-label" htmlFor="summary-risk-factors">
              Risk factors
            </label>
            <textarea
              id="summary-risk-factors"
              className="diagnosis-field"
              value={form.riskFactors}
              onChange={(event) => updateField('riskFactors', event.target.value)}
              placeholder="Age, social history, comorbidities, prior events"
            />

            <label className="simple-tool-label" htmlFor="summary-notes">
              Notes
            </label>
            <textarea
              id="summary-notes"
              className="diagnosis-field"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Optional recent note or handoff text"
            />

            <div className="tool-form-actions">
              <button type="button" className="diagnosis-primary-btn" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating summary...' : 'Generate patient summary'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clear}>
                Clear
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="patient-summary-output">
            <h2 id="patient-summary-output">Patient Summary</h2>
            <ApiStateBanner error={error} onRetry={handleGenerate} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">Extracting patient summary sections...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                <SummarySection title="Active Problems" emptyText="No active problems extracted.">
                  {result.activeProblems?.length ? (
                    <ul>
                      {result.activeProblems.map((problem) => (
                        <li key={problem.label}>
                          <strong>{problem.label}</strong> ({problem.priority}) - {problem.evidence.join(' ')}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SummarySection>

                <SummarySection title="Medications" emptyText="No medications extracted.">
                  {result.medications?.length ? (
                    <ul>
                      {result.medications.map((medication) => (
                        <li key={medication.name}>
                          <strong>{medication.name}</strong>: {medication.context}{' '}
                          {medication.reviewFlags.join(' ')}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SummarySection>

                <SummarySection title="Recent Labs" emptyText="No recent labs extracted.">
                  {result.recentLabs?.length ? (
                    <ul>
                      {result.recentLabs.map((lab) => (
                        <li key={`${lab.label}-${lab.value}`}>
                          <strong>{lab.label}</strong> {lab.value} ({lab.interpretation})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SummarySection>

                <SummarySection title="Alerts" emptyText="All clear">
                  {result.alerts?.length ? (
                    <ul>
                      {result.alerts.map((alert) => (
                        <li key={`${alert.severity}-${alert.message}`}>
                          <strong>{alert.severity}</strong>: {alert.message} - {alert.rationale}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SummarySection>

                <SummarySection title="Risk Factors" emptyText="No risk factors extracted.">
                  {result.riskFactors?.length ? (
                    <ul>
                      {result.riskFactors.map((riskFactor) => (
                        <li key={riskFactor.label}>
                          <strong>{riskFactor.label}</strong>: {riskFactor.rationale}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SummarySection>

                <SummarySection title="Explainability and Safety" emptyText="No explainability returned.">
                  <p>
                    <strong>Method:</strong> {result.explainability?.method}
                  </p>
                  <p>
                    <strong>Inputs used:</strong> {(result.explainability?.inputsUsed || []).join(', ')}
                  </p>
                  <ul>
                    {(result.safety?.warnings || []).map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </SummarySection>
              </div>
            ) : (
              <div className="tool-empty-state">
                Add chart context to generate active problems, medications, labs, alerts, and risk factors.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
