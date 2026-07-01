import { useMemo, useRef, useState } from 'react';
import ApiStateBanner from '../../components/ApiStateBanner';
import { generateAmbientScribeDraft } from '../../services/clinicalIntelligenceApi';
import ToolPageLayout from './ToolPageLayout';

const TOOL_CONFIG = {
  id: 'ambient-scribe',
  name: 'Ambient Clinical Scribe',
  path: '/tools/ambient-scribe',
  color: '#5B7FA6',
  description:
    'Tier C documentation workflow for speech-to-text, SOAP notes, discharge summaries, and referral drafts',
  shortcut: 'Ctrl+Shift+S',
  category: 'Reference',
};

const NOTE_TYPES = [
  { value: 'soap', label: 'SOAP note' },
  { value: 'discharge-summary', label: 'Discharge summary' },
  { value: 'referral', label: 'Referral draft' },
];

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function sectionEntries(draft) {
  if (!draft?.sections || typeof draft.sections !== 'object') return [];
  return Object.entries(draft.sections).filter(([, value]) => String(value || '').trim());
}

export default function AmbientScribe({ embedded = false, onCloseEmbedded }: any = {}) {
  const [noteType, setNoteType] = useState('soap');
  const [transcriptText, setTranscriptText] = useState('');
  const [patientContext, setPatientContext] = useState({
    patientLabel: '',
    encounterType: '',
    clinicianInstructions: '',
  });
  const [draftResponse, setDraftResponse] = useState<any>(null);
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = useMemo(() => Boolean(getSpeechRecognition()), []);
  const draft = draftResponse?.draft;

  const updatePatientContext = (key, value) => {
    setPatientContext((current) => ({ ...current, [key]: value }));
  };

  const handleDictation = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech-to-text is not available in this browser. Paste or type a transcript instead.');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (text) {
        setTranscriptText((current) => `${current}${current ? ' ' : ''}${text}`.trim());
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setError('Speech-to-text stopped unexpectedly. You can continue by editing the transcript.');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    recognition.start();
  };

  const handleGenerate = async () => {
    if (!transcriptText.trim()) {
      setError('Add a transcript or dictate encounter details before generating a draft.');
      return;
    }

    setLoading(true);
    setError(null);
    setReviewed(false);
    setDraftResponse(null);

    const result = await generateAmbientScribeDraft({
      noteType,
      transcriptText,
      patientContext,
      safetyAcknowledged: true,
    });

    if (result.ok) {
      setDraftResponse(result.data);
    } else {
      setError(result.message || 'Unable to generate an ambient scribe draft.');
    }

    setLoading(false);
  };

  const clearWorkflow = () => {
    setTranscriptText('');
    setPatientContext({ patientLabel: '', encounterType: '', clinicianInstructions: '' });
    setDraftResponse(null);
    setReviewed(false);
    setError(null);
  };

  return (
    <ToolPageLayout tool={TOOL_CONFIG} embedded={embedded} onCloseEmbedded={onCloseEmbedded}>
      <div className="simple-tool-page-inner">
        <div className="simple-tool-result-panel" role="note" aria-label="Ambient scribe safety warnings">
          <h2>Safety Requirements</h2>
          <ul>
            <li>No auto-signing. Drafts remain unsigned until a clinician reviews and signs in the charting system.</li>
            <li>Human review is required before copying content into the medical record.</li>
            <li>No autonomous chart modification. CareDroid does not write back to the EHR from this workflow.</li>
          </ul>
        </div>

        <div className="diagnosis-tool-grid">
          <section className="diagnosis-panel" aria-labelledby="ambient-scribe-inputs">
            <h2 id="ambient-scribe-inputs">Encounter Input</h2>

            <label className="simple-tool-label" htmlFor="ambient-note-type">
              Draft type
            </label>
            <select
              id="ambient-note-type"
              className="diagnosis-field"
              value={noteType}
              onChange={(event) => setNoteType(event.target.value)}
            >
              {NOTE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <label className="simple-tool-label" htmlFor="ambient-patient-label">
              Patient or encounter label (optional)
            </label>
            <input
              id="ambient-patient-label"
              className="diagnosis-field"
              value={patientContext.patientLabel}
              onChange={(event) => updatePatientContext('patientLabel', event.target.value)}
              placeholder="e.g., Room 12 follow-up, no direct identifiers needed"
            />

            <label className="simple-tool-label" htmlFor="ambient-encounter-type">
              Encounter type (optional)
            </label>
            <input
              id="ambient-encounter-type"
              className="diagnosis-field"
              value={patientContext.encounterType}
              onChange={(event) => updatePatientContext('encounterType', event.target.value)}
              placeholder="e.g., clinic visit, ED discharge, referral consult"
            />

            <label className="simple-tool-label" htmlFor="ambient-transcript">
              Transcript or dictation
            </label>
            <textarea
              id="ambient-transcript"
              className="diagnosis-field diagnosis-field--tall"
              value={transcriptText}
              onChange={(event) => setTranscriptText(event.target.value)}
              placeholder="Paste transcript text or use browser dictation. Include only the clinical details needed for the draft."
            />

            <label className="simple-tool-label" htmlFor="ambient-instructions">
              Clinician instructions (optional)
            </label>
            <textarea
              id="ambient-instructions"
              className="diagnosis-field"
              value={patientContext.clinicianInstructions}
              onChange={(event) => updatePatientContext('clinicianInstructions', event.target.value)}
              placeholder="e.g., emphasize medication reconciliation, include return precautions"
            />

            <div className="tool-form-actions">
              <button
                type="button"
                className="diagnosis-primary-btn"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Generating draft...' : 'Generate draft for clinician review'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={handleDictation}>
                {listening ? 'Stop dictation' : speechSupported ? 'Start speech-to-text' : 'Speech-to-text unavailable'}
              </button>
              <button type="button" className="btn-diagnosis-secondary" onClick={clearWorkflow}>
                Clear
              </button>
            </div>
          </section>

          <section className="diagnosis-panel diagnosis-panel--scroll" aria-labelledby="ambient-scribe-draft">
            <h2 id="ambient-scribe-draft">Draft Output</h2>
            <ApiStateBanner error={error} onRetry={(transcriptText.trim() ? handleGenerate : undefined) as any} />

            {loading ? (
              <div className="tool-loading-state" aria-busy="true">
                <div className="simple-tool-spinner diagnosis-spinner" />
                <p className="tool-loading-state__message">
                  Generating a documentation draft with safety checks...
                </p>
              </div>
            ) : draft ? (
              <div className="diagnosis-results-body">
                <div className="simple-tool-result-panel">
                  <strong>Status:</strong> {draftResponse.status || 'review_required'}
                  <br />
                  <strong>Review required:</strong> {draftResponse.reviewRequired ? 'Yes' : 'No'}
                  <br />
                  <strong>Run ID:</strong> {draftResponse.runId}
                </div>

                {sectionEntries(draft).map(([name, value]) => (
                  <section key={name} className="simple-tool-result-panel">
                    <h3>{name}</h3>
                    <p>{value as any}</p>
                  </section>
                ))}

                <div className="simple-tool-result-panel">
                  <h3>Review Workflow</h3>
                  <p>
                    This draft is not signed and has not modified the chart. Review, edit, and verify all
                    facts before using it in documentation.
                  </p>
                  <label className="tool-inline-check">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(event) => setReviewed(event.target.checked)}
                    />
                    I reviewed this draft and understand it is not auto-signed.
                  </label>
                  <button
                    type="button"
                    className="diagnosis-primary-btn tool-review-actions"
                    disabled={!reviewed}
                  >
                    Ready for clinician copy-forward
                  </button>
                </div>
              </div>
            ) : (
              <div className="tool-empty-state">
                Add encounter text, choose a draft type, and generate a note. The output will require review.
              </div>
            )}
          </section>
        </div>
      </div>
    </ToolPageLayout>
  );
}
