import { useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { generateTimelineAi } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';
import './TimelineAi.css';

const TOOL_CONFIG = {
  id: 'timeline-ai',
  name: 'Patient Timeline AI',
  path: '/tools/timeline-ai',
  color: '#2563EB',
  description: 'Summarize encounters, identify trends, and highlight abnormal progression',
  shortcut: 'Ctrl+Shift+J',
  category: 'Diagnostic',
};

function emptyEncounter(index = 1) {
  return {
    date: '',
    encounterType: index === 1 ? 'ED visit' : 'Follow-up',
    title: '',
    details: '',
    labs: '',
    vitals: '',
  };
}

export default function TimelineAi({ embedded = false, onCloseEmbedded } = {}) {
  const [patientContext, setPatientContext] = useState('');
  const [focus, setFocus] = useState('');
  const [encounters, setEncounters] = useState([
    {
      date: '2026-05-01',
      encounterType: 'ED visit',
      title: 'Initial dyspnea visit',
      details: 'Presented with dyspnea and edema. Discharged with outpatient follow-up.',
      labs: 'BNP 650, creatinine 1.2',
      vitals: 'SpO2 95%, BP 128/76',
    },
    emptyEncounter(2),
  ]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateEncounter = (index, key, value) => {
    setEncounters((current) =>
      current.map((encounter, encounterIndex) =>
        encounterIndex === index ? { ...encounter, [key]: value } : encounter
      )
    );
  };

  const addEncounter = () => {
    setEncounters((current) => [...current, emptyEncounter(current.length + 1)]);
  };

  const removeEncounter = (index) => {
    setEncounters((current) => current.filter((_, encounterIndex) => encounterIndex !== index));
  };

  const handleGenerate = async () => {
    const cleanEncounters = encounters
      .map((encounter) => ({
        ...encounter,
        date: encounter.date.trim() || undefined,
        encounterType: encounter.encounterType.trim() || undefined,
        title: encounter.title.trim() || undefined,
        details: encounter.details.trim(),
        labs: encounter.labs.trim() || undefined,
        vitals: encounter.vitals.trim() || undefined,
      }))
      .filter((encounter) => encounter.details);

    if (!cleanEncounters.length) {
      setError('Add at least one encounter with clinical details.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const response = await generateTimelineAi({
      patientContext: patientContext.trim() || undefined,
      focus: focus.trim() || undefined,
      encounters: cleanEncounters,
    });

    if (response.ok) {
      setResult(response.data);
    } else {
      setError(response.message || 'Unable to generate patient timeline.');
    }
    setLoading(false);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner timeline-ai-shell">
        <section className="simple-tool-result-panel" role="note">
          <h2>Clinical Timeline Scope</h2>
          <p>
            Timeline AI summarizes submitted encounter text, highlights potential trends, and flags abnormal
            progression for clinician review. It does not modify the chart or replace source record review.
          </p>
        </section>

        <div className="timeline-ai-workspace">
          <section className="diagnosis-panel" aria-labelledby="timeline-input-heading">
            <h2 id="timeline-input-heading">Encounter Inputs</h2>

            <label className="simple-tool-label" htmlFor="timeline-context">
              Patient context
            </label>
            <textarea
              id="timeline-context"
              className="diagnosis-field"
              value={patientContext}
              onChange={(event) => setPatientContext(event.target.value)}
              placeholder="e.g., CHF, CKD, recent medication changes"
            />

            <label className="simple-tool-label" htmlFor="timeline-focus">
              Review focus
            </label>
            <input
              id="timeline-focus"
              className="diagnosis-field"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              placeholder="e.g., respiratory decline and renal trend"
            />

            {encounters.map((encounter, index) => (
              <article className="timeline-ai-encounter-card" key={`encounter-input-${index + 1}`}>
                <div className="timeline-ai-row">
                  <div>
                    <label className="simple-tool-label" htmlFor={`timeline-date-${index}`}>
                      Date
                    </label>
                    <input
                      id={`timeline-date-${index}`}
                      className="diagnosis-field"
                      value={encounter.date}
                      onChange={(event) => updateEncounter(index, 'date', event.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div>
                    <label className="simple-tool-label" htmlFor={`timeline-type-${index}`}>
                      Encounter type
                    </label>
                    <input
                      id={`timeline-type-${index}`}
                      className="diagnosis-field"
                      value={encounter.encounterType}
                      onChange={(event) => updateEncounter(index, 'encounterType', event.target.value)}
                      placeholder="ED, clinic, admission"
                    />
                  </div>
                </div>

                <label className="simple-tool-label" htmlFor={`timeline-title-${index}`}>
                  Title
                </label>
                <input
                  id={`timeline-title-${index}`}
                  className="diagnosis-field"
                  value={encounter.title}
                  onChange={(event) => updateEncounter(index, 'title', event.target.value)}
                  placeholder="Short encounter title"
                />

                <label className="simple-tool-label" htmlFor={`timeline-details-${index}`}>
                  Encounter details
                </label>
                <textarea
                  id={`timeline-details-${index}`}
                  className="diagnosis-field"
                  value={encounter.details}
                  onChange={(event) => updateEncounter(index, 'details', event.target.value)}
                  placeholder="Symptoms, assessment, interventions, disposition"
                />

                <div className="timeline-ai-row">
                  <div>
                    <label className="simple-tool-label" htmlFor={`timeline-labs-${index}`}>
                      Labs/studies
                    </label>
                    <textarea
                      id={`timeline-labs-${index}`}
                      className="diagnosis-field"
                      value={encounter.labs}
                      onChange={(event) => updateEncounter(index, 'labs', event.target.value)}
                      placeholder="Creatinine, BNP, WBC, imaging"
                    />
                  </div>
                  <div>
                    <label className="simple-tool-label" htmlFor={`timeline-vitals-${index}`}>
                      Vitals
                    </label>
                    <textarea
                      id={`timeline-vitals-${index}`}
                      className="diagnosis-field"
                      value={encounter.vitals}
                      onChange={(event) => updateEncounter(index, 'vitals', event.target.value)}
                      placeholder="BP, HR, SpO2, temperature"
                    />
                  </div>
                </div>

                {encounters.length > 1 ? (
                  <button type="button" className="btn-diagnosis-secondary" onClick={() => removeEncounter(index)}>
                    Remove encounter
                  </button>
                ) : null}
              </article>
            ))}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-diagnosis-secondary" onClick={addEncounter}>
                Add encounter
              </button>
              <button type="button" className="diagnosis-primary-btn" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Building timeline...' : 'Generate timeline'}
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="timeline-output-heading">
            <h2 id="timeline-output-heading">Timeline Review</h2>
            <ApiStateBanner error={error} onRetry={handleGenerate} />

            {loading ? (
              <div aria-busy="true" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p style={{ color: 'var(--app-fg-muted)' }}>Summarizing encounters and detecting trends...</p>
              </div>
            ) : result ? (
              <div className="diagnosis-results-body">
                <section className="timeline-ai-list" aria-label="Responsive patient timeline">
                  {result.timeline?.map((event) => (
                    <article className="timeline-ai-event" key={event.id}>
                      <div className="timeline-ai-marker">
                        <span className="timeline-ai-dot" aria-hidden="true" />
                        <span>{event.dateLabel}</span>
                      </div>
                      <div className="simple-tool-result-panel">
                        <h3>{event.title}</h3>
                        <p>
                          <strong>{event.encounterType}</strong> - {event.summary}
                        </p>
                        <ul className="timeline-ai-findings">
                          {event.keyFindings.map((finding) => (
                            <li key={finding}>{finding}</li>
                          ))}
                        </ul>
                        {event.abnormalSignals.length ? (
                          <div className="timeline-ai-pill-list">
                            {event.abnormalSignals.map((signal) => (
                              <span className="timeline-ai-pill" key={signal}>
                                {signal}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Trends</h3>
                  {result.trends?.length ? (
                    <ul>
                      {result.trends.map((trend) => (
                        <li key={trend.id}>
                          <strong>{trend.label}</strong>: {trend.direction} ({trend.evidence.join('; ')})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No trend signals detected from submitted encounters.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel timeline-ai-alert">
                  <h3>Abnormal Progression</h3>
                  {result.abnormalProgression?.length ? (
                    <ul>
                      {result.abnormalProgression.map((flag) => (
                        <li key={flag.id}>
                          <strong>{flag.severity}</strong>: {flag.signal} - {flag.rationale}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No abnormal progression flags detected.</p>
                  )}
                </section>

                <section className="simple-tool-result-panel">
                  <h3>Explainability and Safety</h3>
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
                </section>
              </div>
            ) : (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--app-fg-muted)' }}>
                Add encounters to render a responsive patient timeline with trends and abnormal progression.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
