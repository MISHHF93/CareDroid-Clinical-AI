import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  buildDocumentationAssistantPrompt,
  buildDocumentationExport,
  buildLocalDocumentationDraft,
  DEFAULT_DOCUMENTATION_CONTEXT,
  DOCUMENTATION_AI_ACTIONS,
  DOCUMENTATION_NOTE_TYPES,
  getDocumentationNoteType,
} from '../data/clinicalDocumentationAssistant';
import './ClinicalDocumentationAssistant.css';

function getAssistantResponseText(response) {
  return (
    response?.data?.response ||
    response?.data?.message ||
    response?.message?.content ||
    response?.message ||
    response?.response ||
    ''
  );
}

function downloadTextFile({ filename, content }) {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.URL?.createObjectURL) {
    return false;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export default function ClinicalDocumentationAssistant() {
  const [noteTypeId, setNoteTypeId] = useState('soap');
  const [actionId, setActionId] = useState('draft-note');
  const [form, setForm] = useState(DEFAULT_DOCUMENTATION_CONTEXT);
  const [draftText, setDraftText] = useState('');
  const [exportPreview, setExportPreview] = useState<any>(null);
  const [exportStatus, setExportStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedNoteType = useMemo(() => getDocumentationNoteType(noteTypeId), [noteTypeId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAiAction = async (nextActionId = actionId) => {
    if (!form.encounterDetails.trim() && !form.patientContext.trim()) {
      setError('Add encounter details or patient context before generating documentation.');
      return;
    }

    setActionId(nextActionId);
    setLoading(true);
    setError('');
    setExportStatus('');
    setExportPreview(null);

    const payload = {
      noteTypeId,
      actionId: nextActionId,
      ...form,
    };

    try {
      const response = await sendClinicalChatMessage({
        tool: 'clinical-documentation-assistant',
        message: buildDocumentationAssistantPrompt(payload),
      } as any);

      if (!response?.ok) {
        throw new Error(response?.data?.message || (response as any)?.message || 'Unable to generate documentation.');
      }

      setDraftText(getAssistantResponseText(response) || buildLocalDocumentationDraft(payload));
    } catch (err: any) {
      setError(err.message || 'Unable to generate documentation.');
      setDraftText(buildLocalDocumentationDraft(payload));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = buildDocumentationExport({
      noteTypeId,
      actionId,
      encounterTitle: form.encounterTitle,
      draftText,
    });
    const downloaded = downloadTextFile(exportData);
    setExportPreview(exportData);
    setExportStatus(
      downloaded
        ? `Exported ${exportData.filename}. Review before chart upload.`
        : `Export ready: ${exportData.filename}. Review before chart upload.`
    );
  };

  const clear = () => {
    setForm({ encounterTitle: '', patientContext: '', encounterDetails: '', clinicianInstructions: '' } as any);
    setDraftText('');
    setExportPreview(null);
    setExportStatus('');
    setError('');
  };

  return (
    <section className="documentation-assistant-page">
      <section className="documentation-assistant-hero" aria-labelledby="documentation-title">
        <div>
          <p className="documentation-assistant-eyebrow">Draft only - clinician review required</p>
          <h1 id="documentation-title">Clinical Documentation Assistant</h1>
          <p>
            Draft SOAP notes, H&P notes, progress notes, discharge summaries, consultation notes,
            procedure notes, encounter summaries, and patient instructions with explicit export support.
          </p>
        </div>
        <div className="documentation-assistant-hero__actions">
          <Link to="/tools/ambient-scribe">Ambient scribe</Link>
          <Link to="/protocols">Protocols</Link>
          <Link to="/clinical-decision-support">Clinical decision support</Link>
        </div>
      </section>

      <section className="documentation-assistant-layout">
        <div className="documentation-assistant-panel" aria-labelledby="documentation-inputs-title">
          <div>
            <p className="documentation-assistant-eyebrow">Note type</p>
            <h2 id="documentation-inputs-title">Documentation inputs</h2>
          </div>

          <div className="documentation-assistant-chip-grid" aria-label="Documentation note types">
            {DOCUMENTATION_NOTE_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={type.id === noteTypeId ? 'is-active' : ''}
                onClick={() => setNoteTypeId(type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>

          <article className="documentation-assistant-card">
            <strong>{selectedNoteType.exportTitle} sections</strong>
            <ul className="documentation-assistant-section-list">
              {selectedNoteType.sections.map((section) => <li key={section}>{section}</li>)}
            </ul>
          </article>

          <div className="documentation-assistant-field">
            <label htmlFor="documentation-title-input">Encounter title</label>
            <input
              id="documentation-title-input"
              value={form.encounterTitle}
              onChange={(event) => updateField('encounterTitle', event.target.value)}
              placeholder="e.g., ED pneumonia follow-up"
            />
          </div>

          <div className="documentation-assistant-field">
            <label htmlFor="documentation-patient-context">Patient context</label>
            <textarea
              id="documentation-patient-context"
              value={form.patientContext}
              onChange={(event) => updateField('patientContext', event.target.value)}
              placeholder="Age band, setting, relevant history, medications, allergies, risk context"
            />
          </div>

          <div className="documentation-assistant-field">
            <label htmlFor="documentation-encounter-details">Encounter details</label>
            <textarea
              id="documentation-encounter-details"
              className="documentation-assistant-field--tall"
              value={form.encounterDetails}
              onChange={(event) => updateField('encounterDetails', event.target.value)}
              placeholder="HPI, exam, data, clinical course, procedures, counseling, and follow-up plan"
            />
          </div>

          <div className="documentation-assistant-field">
            <label htmlFor="documentation-instructions">Clinician instructions</label>
            <textarea
              id="documentation-instructions"
              value={form.clinicianInstructions}
              onChange={(event) => updateField('clinicianInstructions', event.target.value)}
              placeholder="Tone, required sections, local policy reminders, patient instruction focus"
            />
          </div>

          <div className="documentation-assistant-actions" aria-label="AI documentation actions">
            {DOCUMENTATION_AI_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAiAction(action.id)}
                disabled={loading}
              >
                {loading && action.id === actionId ? 'Generating...' : action.label}
              </button>
            ))}
            <button type="button" onClick={clear}>
              Clear
            </button>
          </div>
        </div>

        <div className="documentation-assistant-panel" aria-labelledby="documentation-output-title">
          <div>
            <p className="documentation-assistant-eyebrow">AI output</p>
            <h2 id="documentation-output-title">Draft and export</h2>
          </div>
          <ApiStateBanner error={error as any} onRetry={(() => handleAiAction(actionId)) as any} />

          {loading ? (
            <article className="documentation-assistant-card documentation-assistant-output" aria-busy="true">
              Generating documentation draft...
            </article>
          ) : draftText ? (
            <article className="documentation-assistant-card documentation-assistant-output">
              {draftText}
            </article>
          ) : (
            <article className="documentation-assistant-card documentation-assistant-output">
              Select a note type and AI action to draft documentation, summarize the encounter, or
              generate patient instructions.
            </article>
          )}

          <div className="documentation-assistant-actions">
            <button type="button" onClick={handleExport} disabled={!draftText}>
              Export draft
            </button>
          </div>

          {exportStatus && <p className="documentation-assistant-export-status">{exportStatus}</p>}

          {exportPreview && (
            <article className="documentation-assistant-card">
              <strong>Export preview</strong>
              <p>{exportPreview.filename}</p>
              <pre className="documentation-assistant-output">{exportPreview.content}</pre>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
